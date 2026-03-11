# Gestión de secretos

Triggerfish nunca almacena credenciales en archivos de configuración. Todos los
secretos — claves API, tokens OAuth, credenciales de integraciones — se almacenan
en almacenamiento seguro nativo de la plataforma: el llavero del SO para nivel
personal, o un servicio de vault para nivel empresarial. Los plugins y agentes
interactúan con las credenciales a través del SDK, que aplica controles de acceso
estrictos.

## Backends de almacenamiento

| Nivel             | Backend              | Detalles                                                                                      |
| ----------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| **Personal**      | Llavero del SO       | macOS Keychain, Linux Secret Service (vía D-Bus), Windows Credential Manager                  |
| **Empresarial**   | Integración con vault | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault u otros servicios de vault empresarial |

En ambos casos, los secretos se cifran en reposo por el backend de
almacenamiento. Triggerfish no implementa su propio cifrado para secretos — lo
delega a sistemas de almacenamiento de secretos construidos para ese propósito y
auditados.

En plataformas sin llavero nativo (Windows sin Credential Manager, contenedores
Docker), Triggerfish recurre a un archivo JSON cifrado en
`~/.triggerfish/secrets.json`. Las entradas se cifran con AES-256-GCM usando una
clave de 256 bits vinculada a la máquina almacenada en
`~/.triggerfish/secrets.key` (permisos: `0600`). Cada entrada usa un IV aleatorio
de 12 bytes nuevo en cada escritura. Los archivos de secretos en texto plano
heredados se migran automáticamente al formato cifrado en la primera carga.

::: tip El nivel personal requiere cero configuración para secretos. Cuando
conecta una integración durante la configuración (`triggerfish dive`), las
credenciales se almacenan automáticamente en el llavero de su SO. No necesita
instalar ni configurar nada más allá de lo que su sistema operativo ya
proporciona. :::

## Referencias de secretos en la configuración

Triggerfish soporta referencias `secret:` en `triggerfish.yaml`. En lugar de
almacenar credenciales como texto plano, las referencia por nombre y se resuelven
desde el llavero del SO al iniciar.

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"
    openai:
      apiKey: "secret:provider:openai:apiKey"

channels:
  telegram:
    botToken: "secret:channel:telegram:botToken"
```

El resolutor realiza un recorrido en profundidad del archivo de configuración.
Cualquier valor de cadena que comience con `secret:` se sustituye con la entrada
correspondiente del llavero. Si un secreto referenciado no se encuentra, el
inicio falla inmediatamente con un mensaje de error claro.

### Migrar secretos existentes

Si tiene credenciales en texto plano en su archivo de configuración de una
versión anterior, el comando de migración las mueve al llavero automáticamente:

```bash
triggerfish config migrate-secrets
```

Este comando:

1. Escanea `triggerfish.yaml` en busca de valores de credenciales en texto plano
2. Almacena cada uno en el llavero del SO
3. Reemplaza el valor en texto plano con una referencia `secret:`
4. Crea un respaldo del archivo original

::: warning Después de la migración, verifique que su agente inicie correctamente
antes de eliminar el archivo de respaldo. La migración no es reversible sin el
respaldo. :::

## Arquitectura de credenciales delegadas

Un principio de seguridad central en Triggerfish es que las consultas de datos se
ejecutan con las credenciales **del usuario**, no con credenciales del sistema.
Esto asegura que el agente hereda el modelo de permisos del sistema fuente — un
usuario solo puede acceder a datos a los que podría acceder directamente.

<img src="/diagrams/delegated-credentials.svg" alt="Arquitectura de credenciales delegadas: el usuario otorga consentimiento OAuth, el agente consulta con el token del usuario, el sistema fuente aplica los permisos" style="max-width: 100%;" />

Esta arquitectura significa:

- **Sin permisos excesivos** — el agente no puede acceder a datos a los que el
  usuario no puede acceder directamente
- **Sin cuentas de servicio del sistema** — no hay una credencial todopoderosa
  que pueda ser comprometida
- **Aplicación del sistema fuente** — el sistema fuente (Salesforce, Jira,
  GitHub, etc.) aplica sus propios permisos en cada consulta

::: warning SEGURIDAD Las plataformas tradicionales de agentes de IA a menudo
usan una única cuenta de servicio del sistema para acceder a integraciones en
nombre de todos los usuarios. Esto significa que el agente tiene acceso a todos
los datos de la integración, y depende del LLM decidir qué mostrar a cada
usuario. Triggerfish elimina este riesgo por completo: las consultas se ejecutan
con el token OAuth delegado del propio usuario. :::

## Aplicación del SDK de plugins

Los plugins interactúan con las credenciales exclusivamente a través del SDK de
Triggerfish. El SDK proporciona métodos con permisos y bloquea cualquier intento
de acceder a credenciales a nivel de sistema.

### Permitido: acceso a credenciales del usuario

```python
def get_user_opportunities(sdk, params):
    # El SDK obtiene el token delegado del usuario del almacenamiento seguro
    # Si el usuario no ha conectado Salesforce, devuelve un error descriptivo
    user_token = sdk.get_user_credential("salesforce")

    # La consulta se ejecuta con los permisos del usuario
    # El sistema fuente aplica el control de acceso
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### Bloqueado: acceso a credenciales del sistema

```python
def get_all_opportunities(sdk, params):
    # Esto lanzará PermissionError -- BLOQUEADO por el SDK
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` siempre está bloqueado. No hay
configuración para habilitarlo, sin anulación de administrador y sin válvula de
escape. Esta es una regla de seguridad fija, igual que la regla de no
write-down. :::

## Herramientas de secretos invocables por el LLM

El agente puede ayudarlo a gestionar secretos a través de tres herramientas.
Crucialmente, el LLM nunca ve los valores reales de los secretos — la entrada y
el almacenamiento ocurren fuera de banda.

### `secret_save`

Le solicita ingresar un valor de secreto de forma segura:

- **CLI**: La terminal cambia a modo de entrada oculta (los caracteres no se muestran)
- **Tidepool**: Aparece una ventana emergente de entrada segura en la interfaz web

El LLM solicita que se guarde un secreto, pero el valor real lo ingresa usted a
través del prompt seguro. El valor se almacena directamente en el llavero —
nunca pasa por el contexto del LLM.

### `secret_list`

Lista los nombres de todos los secretos almacenados. Nunca expone valores.

### `secret_delete`

Elimina un secreto por nombre del llavero.

### Sustitución de argumentos de herramientas

<div v-pre>

Cuando el agente usa una herramienta que necesita un secreto (por ejemplo,
establecer una clave API en una variable de entorno de un servidor MCP), usa la
sintaxis <span v-pre>`{{secret:name}}`</span> en los argumentos de herramientas:

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:my-api-token}}" }
```

El runtime resuelve las referencias <span v-pre>`{{secret:name}}`</span> **por debajo de la capa del
LLM** antes de que la herramienta se ejecute. El valor resuelto nunca aparece en
el historial de conversación ni en los registros.

</div>

::: warning SEGURIDAD La sustitución <code v-pre>{{secret:name}}</code> se
aplica por código, no por el LLM. Incluso si el LLM intentara registrar o
devolver el valor resuelto, la capa de políticas capturaría el intento en el hook
`PRE_OUTPUT`. :::

### Métodos de permisos del SDK

| Método                                  | Comportamiento                                                                                                                                                      |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | Devuelve el token OAuth delegado del usuario para la integración especificada. Si el usuario no ha conectado la integración, devuelve un error con instrucciones.   |
| `sdk.query_as_user(integration, query)` | Ejecuta una consulta contra la integración usando las credenciales delegadas del usuario. El sistema fuente aplica sus propios permisos.                            |
| `sdk.get_system_credential(name)`       | **Siempre bloqueado.** Lanza `PermissionError`. Se registra como evento de seguridad.                                                                               |
| `sdk.has_user_connection(integration)`  | Devuelve `true` si el usuario ha conectado la integración especificada, `false` en caso contrario. No expone datos de credenciales.                                 |

## Acceso a datos con permisos

La arquitectura de credenciales delegadas trabaja de la mano con el sistema de
clasificación. Incluso si un usuario tiene permiso para acceder a datos en el
sistema fuente, las reglas de clasificación de Triggerfish gobiernan hacia dónde
pueden fluir esos datos después de ser recuperados.

<img src="/diagrams/secret-resolution-flow.svg" alt="Flujo de resolución de secretos: las referencias del archivo de configuración se resuelven desde el llavero del SO por debajo de la capa del LLM" style="max-width: 100%;" />

**Ejemplo:**

```
Usuario: "Resume la oportunidad de Acme y envíasela a mi esposa"

Paso 1: Verificación de permisos
  --> Se usa el token de Salesforce del usuario
  --> Salesforce devuelve la oportunidad de Acme (el usuario tiene acceso)

Paso 2: Clasificación
  --> Datos de Salesforce clasificados como CONFIDENTIAL
  --> Taint de sesión escala a CONFIDENTIAL

Paso 3: Verificación de salida
  --> Esposa = destinatario EXTERNAL
  --> CONFIDENTIAL --> EXTERNAL: BLOQUEADO

Resultado: Datos recuperados (el usuario tiene permiso), pero no se pueden enviar
           (las reglas de clasificación previenen la filtración)
```

El usuario tiene acceso legítimo a la oportunidad de Acme en Salesforce.
Triggerfish respeta eso y recupera los datos. Pero el sistema de clasificación
previene que esos datos fluyan a un destinatario externo. El permiso para acceder
a datos es independiente del permiso para compartirlos.

## Registro de acceso a secretos

Cada acceso a credenciales se registra a través del hook de aplicación
`SECRET_ACCESS`:

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "details": {
    "method": "get_user_credential",
    "integration": "salesforce",
    "user_id": "user_456",
    "credential_type": "oauth_delegated"
  }
}
```

Los intentos bloqueados también se registran:

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "System credential access is prohibited",
    "plugin_id": "plugin_789"
  }
}
```

::: info Los intentos bloqueados de acceso a credenciales se registran con un
nivel de alerta elevado. En despliegues empresariales, estos eventos pueden
activar notificaciones al equipo de seguridad. :::

## Integración con vault empresarial

Los despliegues empresariales pueden conectar Triggerfish a un servicio de vault
centralizado para la gestión de credenciales:

| Servicio de vault     | Integración                                    |
| --------------------- | ---------------------------------------------- |
| HashiCorp Vault       | Integración nativa con API                     |
| AWS Secrets Manager   | Integración con AWS SDK                        |
| Azure Key Vault       | Integración con Azure SDK                      |
| Vault personalizado   | Interfaz conectable `SecretProvider`           |

La integración con vault empresarial proporciona:

- **Rotación centralizada** — las credenciales se rotan en el vault y
  Triggerfish las recoge automáticamente
- **Políticas de acceso** — las políticas a nivel de vault controlan qué agentes
  y usuarios pueden acceder a qué credenciales
- **Consolidación de auditoría** — los registros de acceso a credenciales de
  Triggerfish y del vault pueden correlacionarse

## Lo que nunca se almacena en archivos de configuración

Lo siguiente nunca aparece como valores en texto plano en `triggerfish.yaml` ni
en ningún otro archivo de configuración. Se almacenan en el llavero del SO y se
referencian vía la sintaxis `secret:`, o se gestionan a través de la herramienta
`secret_save`:

- Claves API para proveedores de LLM
- Tokens OAuth para integraciones
- Credenciales de bases de datos
- Secretos de webhooks
- Claves de cifrado
- Códigos de enlace (efímeros, solo en memoria)

::: danger Si encuentra credenciales en texto plano en un archivo de
configuración de Triggerfish (valores que NO son referencias `secret:`), algo ha
salido mal. Ejecute `triggerfish config migrate-secrets` para moverlas al
llavero. Las credenciales encontradas en texto plano deben rotarse
inmediatamente. :::

## Páginas relacionadas

- [Diseño con seguridad primero](/es-419/security/) — descripción general de la arquitectura de seguridad
- [Regla de no write-down](/es-419/security/no-write-down) — cómo los controles de clasificación
  complementan el aislamiento de credenciales
- [Identidad y autenticación](/es-419/security/identity) — cómo la identidad del usuario alimenta el
  acceso delegado a credenciales
- [Auditoría y cumplimiento](/es-419/security/audit-logging) — cómo se registran los eventos de acceso
  a credenciales
