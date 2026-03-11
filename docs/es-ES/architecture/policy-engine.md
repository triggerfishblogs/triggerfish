# Motor de políticas y hooks

El motor de políticas es la capa de aplicación que se sitúa entre el LLM y el
mundo exterior. Intercepta cada acción en puntos críticos del flujo de datos y
toma decisiones deterministas de ALLOW (permitir), BLOCK (bloquear) o REDACT
(redactar). El LLM no puede eludir, modificar ni influir en estas decisiones.

## Principio fundamental: aplicación por debajo del LLM

<img src="/diagrams/policy-enforcement-layers.svg" alt="Capas de aplicación de políticas: el LLM se sitúa por encima de la capa de políticas, que se sitúa por encima de la capa de ejecución" style="max-width: 100%;" />

::: warning SEGURIDAD El LLM se sitúa por encima de la capa de políticas. Puede
ser inyectado con prompts, forzado a eludir restricciones o manipulado, y no
importa. La capa de políticas es código puro que se ejecuta por debajo del LLM,
examinando solicitudes de acción estructuradas y tomando decisiones binarias
basadas en reglas de clasificación. No hay camino desde la salida del LLM hasta
la elusión de hooks. :::

## Tipos de hooks

Ocho hooks de aplicación interceptan acciones en cada punto crítico del flujo de
datos.

### Arquitectura de hooks

<img src="/diagrams/hook-chain-flow.svg" alt="Flujo de cadena de hooks: PRE_CONTEXT_INJECTION → Contexto del LLM → PRE_TOOL_CALL → Ejecución de herramienta → POST_TOOL_RESPONSE → Respuesta del LLM → PRE_OUTPUT → Canal de salida" style="max-width: 100%;" />

### Todos los tipos de hooks

| Hook                    | Disparador                       | Acciones clave                                                                 | Modo de fallo            |
| ----------------------- | -------------------------------- | ------------------------------------------------------------------------------ | ------------------------ |
| `PRE_CONTEXT_INJECTION` | Entrada externa entra al contexto | Clasificar entrada, asignar taint, crear linaje, escanear inyección           | Rechazar entrada         |
| `PRE_TOOL_CALL`         | LLM solicita ejecución de herramienta | Verificación de permisos, límite de tasa, validación de parámetros         | Bloquear llamada         |
| `POST_TOOL_RESPONSE`    | Herramienta devuelve datos       | Clasificar respuesta, actualizar taint de sesión, crear/actualizar linaje      | Redactar o bloquear      |
| `PRE_OUTPUT`            | Respuesta a punto de salir       | Verificación final de clasificación contra destino, escaneo de PII            | Bloquear salida          |
| `SECRET_ACCESS`         | Plugin solicita una credencial   | Registrar acceso, verificar permiso contra alcance declarado                   | Denegar credencial       |
| `SESSION_RESET`         | Usuario solicita reinicio de taint | Archivar linaje, borrar contexto, verificar confirmación                     | Requerir confirmación    |
| `AGENT_INVOCATION`      | Agente llama a otro agente       | Verificar cadena de delegación, aplicar techo de taint                         | Bloquear invocación      |
| `MCP_TOOL_CALL`         | Herramienta de servidor MCP invocada | Verificación de política del Gateway (estado del servidor, permisos, esquema) | Bloquear llamada MCP     |

## Interfaz de hook

Cada hook recibe un contexto y devuelve un resultado. El manejador es una
función síncrona y pura.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // La carga útil específica del hook varía según el tipo
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` es síncrono y devuelve `HookResult` directamente, no una
Promise. Esto es intencionado. Los hooks deben completarse antes de que la
acción proceda, y hacerlos síncronos elimina cualquier posibilidad de elusión
asíncrona. Si un hook excede el tiempo, la acción se rechaza. :::

## Garantías de los hooks

Cada ejecución de hook tiene cuatro invariantes:

| Garantía            | Significado                                                                                                                                          |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Determinista**    | La misma entrada siempre produce la misma decisión. Sin aleatoriedad. Sin llamadas al LLM dentro de hooks. Sin llamadas a API externas que afecten decisiones. |
| **Síncrono**        | Los hooks se completan antes de que la acción proceda. No es posible la elusión asíncrona. Tiempo excedido equivale a rechazo.                         |
| **Registrado**      | Cada ejecución de hook se graba: parámetros de entrada, decisión tomada, marca temporal y reglas de política evaluadas.                                |
| **Infalsificable**  | La salida del LLM no puede contener instrucciones de elusión de hook. La capa de hooks no tiene lógica de "analizar salida del LLM en busca de comandos". |

## Jerarquía de reglas de políticas

Las reglas de políticas se organizan en tres niveles. Los niveles superiores no
pueden anular los inferiores.

### Reglas fijas (siempre aplicadas, NO configurables)

Estas reglas están codificadas y no pueden ser desactivadas por ningún
administrador, usuario ni configuración:

- **Sin escritura descendente**: el flujo de clasificación es unidireccional. Los
  datos no pueden fluir a un nivel inferior.
- **Canales UNTRUSTED**: sin datos de entrada ni salida. Punto.
- **Taint de sesión**: una vez elevado, permanece elevado durante la vida de la
  sesión.
- **Registro de auditoría**: todas las acciones registradas. Sin excepciones. Sin
  forma de desactivar.

### Reglas configurables (ajustables por el administrador)

Los administradores pueden ajustar estas a través de la interfaz o archivos de
configuración:

- Clasificaciones predeterminadas de integración (p. ej., Salesforce predeterminado
  a `CONFIDENTIAL`)
- Clasificaciones de canales
- Listas de permitir/denegar acciones por integración
- Listas de dominios permitidos para comunicaciones externas
- Límites de tasa por herramienta, por usuario o por sesión

### Cláusula de escape declarativa (empresa)

Los despliegues empresariales pueden definir reglas de políticas personalizadas
en YAML estructurado para escenarios avanzados:

```yaml
# Bloquear cualquier consulta de Salesforce que contenga patrones de NSS
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[NSS REDACTADO]"
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
# Restricción basada en horario: sin envíos externos fuera de horas
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "Comunicaciones externas restringidas fuera del horario laboral"
```

::: tip Las reglas YAML personalizadas deben pasar validación antes de la
activación. Las reglas inválidas se rechazan en el momento de la configuración,
no en tiempo de ejecución. Esto evita que una configuración errónea cree brechas
de seguridad. :::

## Experiencia de usuario ante denegación

Cuando el motor de políticas bloquea una acción, el usuario ve una explicación
clara, no un error genérico.

**Predeterminado (específico):**

```
No puedo enviar datos confidenciales a un canal público.

  -> Reiniciar sesión y enviar mensaje
  -> Cancelar
```

**Educativo (opcional):**

```
No puedo enviar datos confidenciales a un canal público.

Por qué: esta sesión accedió a Salesforce (CONFIDENTIAL).
WhatsApp personal está clasificado como PUBLIC.
Los datos solo pueden fluir a clasificación igual o superior.

Opciones:
  -> Reiniciar sesión y enviar mensaje
  -> Solicitar al administrador que reclasifique el canal WhatsApp
  -> Más información: [enlace a docs]
```

El modo educativo es opcional y ayuda a los usuarios a entender _por qué_ se
bloqueó una acción, incluyendo qué fuente de datos causó la escalada de taint y
cuál es la discrepancia de clasificación. Ambos modos ofrecen los siguientes
pasos accionables en lugar de errores sin salida.

## Cómo se encadenan los hooks

En un ciclo típico de solicitud/respuesta, múltiples hooks se activan en
secuencia. Cada hook tiene visibilidad completa de las decisiones tomadas por
hooks anteriores en la cadena.

```
El usuario envía: "Revisa mi pipeline de Salesforce y envía un mensaje a mi esposa"

1. PRE_CONTEXT_INJECTION
   - Entrada del propietario, clasificada como PUBLIC
   - Taint de sesión: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - ¿Herramienta permitida? SÍ
   - ¿El usuario tiene conexión Salesforce? SÍ
   - ¿Límite de tasa? OK
   - Decisión: ALLOW

3. POST_TOOL_RESPONSE (resultados de salesforce)
   - Datos clasificados: CONFIDENTIAL
   - Taint de sesión escala: PUBLIC -> CONFIDENTIAL
   - Registro de linaje creado

4. PRE_TOOL_CALL (whatsapp.send_message)
   - ¿Herramienta permitida? SÍ
   - Decisión: ALLOW (verificación a nivel de herramienta pasa)

5. PRE_OUTPUT (mensaje a la esposa vía WhatsApp)
   - Taint de sesión: CONFIDENTIAL
   - Clasificación efectiva del destino: PUBLIC (destinatario externo)
   - CONFIDENTIAL -> PUBLIC: BLOQUEADO
   - Decisión: BLOCK
   - Razón: "classification_violation"

6. El agente presenta la opción de reinicio al usuario
```
