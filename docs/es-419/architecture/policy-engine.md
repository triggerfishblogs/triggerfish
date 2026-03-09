# Motor de políticas y hooks

El motor de políticas es la capa de aplicación que se sitúa entre el LLM y el
mundo exterior. Intercepta cada acción en puntos críticos del flujo de datos
y toma decisiones determinísticas de ALLOW, BLOCK o REDACT. El LLM no puede
eludir, modificar ni influir en estas decisiones.

## Principio central: aplicación por debajo del LLM

<img src="/diagrams/policy-enforcement-layers.svg" alt="Capas de aplicación de políticas: el LLM está por encima de la capa de políticas, que está por encima de la capa de ejecución" style="max-width: 100%;" />

::: warning SEGURIDAD El LLM se sitúa por encima de la capa de políticas. Puede
ser víctima de prompt injection, jailbreak o manipulación — y no importa. La
capa de políticas es código puro que se ejecuta por debajo del LLM, examinando
solicitudes de acciones estructuradas y tomando decisiones binarias basadas en
reglas de clasificación. No hay ruta desde la salida del LLM hasta la elusión
de hooks. :::

## Tipos de hooks

Ocho hooks de aplicación interceptan acciones en cada punto crítico del flujo de
datos.

### Arquitectura de hooks

<img src="/diagrams/hook-chain-flow.svg" alt="Flujo de la cadena de hooks: PRE_CONTEXT_INJECTION → Contexto del LLM → PRE_TOOL_CALL → Ejecución de herramienta → POST_TOOL_RESPONSE → Respuesta del LLM → PRE_OUTPUT → Canal de salida" style="max-width: 100%;" />

### Todos los tipos de hooks

| Hook                    | Disparador                          | Acciones clave                                                                | Modo de fallo           |
| ----------------------- | ----------------------------------- | ----------------------------------------------------------------------------- | ----------------------- |
| `PRE_CONTEXT_INJECTION` | Entrada externa ingresa al contexto | Clasificar entrada, asignar taint, crear linaje, escanear inyecciones         | Rechazar entrada        |
| `PRE_TOOL_CALL`         | LLM solicita ejecución de herramienta | Verificación de permisos, límite de tasa, validación de parámetros          | Bloquear llamada        |
| `POST_TOOL_RESPONSE`    | Herramienta devuelve datos          | Clasificar respuesta, actualizar taint de sesión, crear/actualizar linaje     | Redactar o bloquear     |
| `PRE_OUTPUT`            | Respuesta a punto de salir del sistema | Verificación final de clasificación contra destino, escaneo de PII          | Bloquear salida         |
| `SECRET_ACCESS`         | Plugin solicita una credencial      | Registrar acceso, verificar permiso contra alcance declarado                  | Denegar credencial      |
| `SESSION_RESET`         | Usuario solicita reinicio de taint  | Archivar linaje, limpiar contexto, verificar confirmación                     | Requerir confirmación   |
| `AGENT_INVOCATION`      | Agente llama a otro agente          | Verificar cadena de delegación, aplicar tope de taint                         | Bloquear invocación     |
| `MCP_TOOL_CALL`         | Herramienta de servidor MCP invocada | Verificación de política del Gateway (estado del servidor, permisos de herramienta, esquema) | Bloquear llamada MCP |

## Interfaz de hooks

Cada hook recibe un contexto y devuelve un resultado. El manejador es una
función síncrona y pura.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // El payload específico del hook varía según el tipo
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` es síncrono y devuelve `HookResult` directamente — no una
Promise. Esto es por diseño. Los hooks deben completarse antes de que la acción
proceda, y hacerlos síncronos elimina toda posibilidad de elusión asíncrona. Si
un hook se agota, la acción se rechaza. :::

## Garantías de los hooks

Cada ejecución de hook lleva cuatro invariantes:

| Garantía           | Qué significa                                                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Determinístico** | La misma entrada siempre produce la misma decisión. Sin aleatoriedad. Sin llamadas al LLM dentro de los hooks. Sin llamadas a APIs externas que afecten las decisiones. |
| **Síncrono**       | Los hooks se completan antes de que la acción proceda. No es posible la elusión asíncrona. Timeout equivale a rechazo.                     |
| **Registrado**     | Cada ejecución de hook se registra: parámetros de entrada, decisión tomada, marca de tiempo y reglas de políticas evaluadas.               |
| **Infalsificable** | La salida del LLM no puede contener instrucciones de elusión de hooks. La capa de hooks no tiene lógica de "parsear salida del LLM en busca de comandos". |

## Jerarquía de reglas de políticas

Las reglas de políticas se organizan en tres niveles. Los niveles superiores no
pueden anular los niveles inferiores.

### Reglas fijas (siempre aplicadas, NO configurables)

Estas reglas están codificadas de forma permanente y no pueden ser deshabilitadas
por ningún administrador, usuario o configuración:

- **No write-down**: El flujo de clasificación es unidireccional. Los datos no pueden fluir a
  un nivel inferior.
- **Canales UNTRUSTED**: Sin datos de entrada ni de salida. Punto.
- **Taint de sesión**: Una vez elevado, permanece elevado durante toda la vida de la sesión.
- **Registro de auditoría**: Todas las acciones se registran. Sin excepciones. Sin forma de deshabilitarlo.

### Reglas configurables (ajustables por administrador)

Los administradores pueden ajustar estas a través de la interfaz o archivos de
configuración:

- Clasificaciones predeterminadas de integraciones (p. ej., Salesforce tiene como predeterminado
  `CONFIDENTIAL`)
- Clasificaciones de canales
- Listas de permitir/denegar acciones por integración
- Listas de dominios permitidos para comunicaciones externas
- Límites de tasa por herramienta, por usuario o por sesión

### Válvula de escape declarativa (empresarial)

Los despliegues empresariales pueden definir reglas de políticas personalizadas en YAML
estructurado para escenarios avanzados:

```yaml
# Bloquear cualquier consulta de Salesforce que contenga patrones de SSN
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN REDACTED]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# Requerir aprobación para transacciones de alto valor
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# Restricción por horario: no enviar a externos fuera de horario
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "Comunicaciones externas restringidas fuera del horario laboral"
```

::: tip Las reglas YAML personalizadas deben pasar validación antes de activarse.
Las reglas inválidas se rechazan en el momento de la configuración, no en tiempo
de ejecución. Esto evita que errores de configuración creen brechas de
seguridad. :::

## Experiencia del usuario ante denegación

Cuando el motor de políticas bloquea una acción, el usuario ve una explicación
clara — no un error genérico.

**Predeterminado (específico):**

```
No puedo enviar datos confidenciales a un canal público.

  -> Reiniciar sesión y enviar mensaje
  -> Cancelar
```

**Opcional (educativo):**

```
No puedo enviar datos confidenciales a un canal público.

Por qué: Esta sesión accedió a Salesforce (CONFIDENTIAL).
WhatsApp personal está clasificado como PUBLIC.
Los datos solo pueden fluir a clasificación igual o superior.

Opciones:
  -> Reiniciar sesión y enviar mensaje
  -> Pedir a su administrador que reclasifique el canal de WhatsApp
  -> Más información: [enlace a la documentación]
```

El modo educativo es opcional y ayuda a los usuarios a entender _por qué_ se
bloqueó una acción, incluyendo qué fuente de datos causó la escalación de taint
y cuál es la incompatibilidad de clasificación. Ambos modos ofrecen pasos
accionables en lugar de errores sin salida.

## Cómo se encadenan los hooks

En un ciclo típico de solicitud/respuesta, múltiples hooks se ejecutan en
secuencia. Cada hook tiene visibilidad completa de las decisiones tomadas por
hooks anteriores en la cadena.

```
El usuario envía: "Revisa mi pipeline de Salesforce y envía un mensaje a mi esposa"

1. PRE_CONTEXT_INJECTION
   - Entrada del propietario, clasificada como PUBLIC
   - Taint de sesión: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - ¿Herramienta permitida? SÍ
   - ¿El usuario tiene conexión a Salesforce? SÍ
   - ¿Límite de tasa? OK
   - Decisión: ALLOW

3. POST_TOOL_RESPONSE (resultados de Salesforce)
   - Datos clasificados: CONFIDENTIAL
   - Taint de sesión escala: PUBLIC -> CONFIDENTIAL
   - Registro de linaje creado

4. PRE_TOOL_CALL (whatsapp.send_message)
   - ¿Herramienta permitida? SÍ
   - Decisión: ALLOW (la verificación a nivel de herramienta pasa)

5. PRE_OUTPUT (mensaje a la esposa vía WhatsApp)
   - Taint de sesión: CONFIDENTIAL
   - Clasificación efectiva del destino: PUBLIC (destinatario externo)
   - CONFIDENTIAL -> PUBLIC: BLOQUEADO
   - Decisión: BLOCK
   - Razón: "classification_violation"

6. El agente presenta la opción de reinicio al usuario
```
