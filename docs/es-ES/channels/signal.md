# Signal

Conecte su agente Triggerfish a Signal para que las personas puedan enviarle
mensajes desde la aplicación Signal. El adaptador se comunica con un daemon
[signal-cli](https://github.com/AsamK/signal-cli) a través de JSON-RPC,
utilizando su número de teléfono vinculado de Signal.

## Cómo Signal es diferente

El adaptador de Signal **es** su número de teléfono. A diferencia de Telegram o
Slack donde existe una cuenta de bot separada, los mensajes de Signal provienen
de otras personas a su número. Esto significa:

- Todos los mensajes entrantes tienen `isOwner: false` -- siempre son de otra
  persona
- El adaptador responde como su número de teléfono
- No hay comprobación de propietario por mensaje como en otros canales

Esto hace de Signal la opción ideal para recibir mensajes de contactos que
envían mensajes a su número, con el agente respondiendo en su nombre.

## Clasificación por defecto

Signal tiene por defecto la clasificación `PUBLIC`. Dado que todos los mensajes
entrantes provienen de contactos externos, `PUBLIC` es el valor seguro por
defecto.

## Configuración

### Paso 1: Instalar signal-cli

signal-cli es un cliente de línea de comandos de terceros para Signal.
Triggerfish se comunica con él a través de un socket TCP o Unix.

**Linux (compilación nativa -- no necesita Java):**

Descargue la última compilación nativa desde la página de
[versiones de signal-cli](https://github.com/AsamK/signal-cli/releases), o deje
que Triggerfish la descargue durante la configuración.

**macOS / otras plataformas (compilación JVM):**

Requiere Java 21+. Triggerfish puede descargar un JRE portable automáticamente
si Java no está instalado.

También puede ejecutar la configuración guiada:

```bash
triggerfish config add-channel signal
```

Esto comprueba signal-cli, ofrece descargarlo si falta y le guía a través del
proceso de vinculación.

### Paso 2: Vincular su dispositivo

signal-cli debe vincularse a su cuenta de Signal existente (como vincular una
aplicación de escritorio):

```bash
signal-cli link -n "Triggerfish"
```

Esto imprime una URI `tsdevice:`. Escanee el código QR con su aplicación móvil
de Signal (Ajustes > Dispositivos vinculados > Vincular nuevo dispositivo).

### Paso 3: Iniciar el daemon

signal-cli se ejecuta como un daemon en segundo plano al que Triggerfish se
conecta:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

Sustituya `+14155552671` por su número de teléfono en formato E.164.

### Paso 4: Configurar Triggerfish

Añada Signal a su `triggerfish.yaml`:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Opción             | Tipo    | Obligatorio | Descripción                                                                            |
| ------------------ | ------- | ----------- | -------------------------------------------------------------------------------------- |
| `endpoint`         | string  | Sí          | Dirección del daemon signal-cli (`tcp://host:puerto` o `unix:///ruta/al/socket`)       |
| `account`          | string  | Sí          | Su número de teléfono de Signal (formato E.164)                                        |
| `classification`   | string  | No          | Techo de clasificación (por defecto: `PUBLIC`)                                         |
| `defaultGroupMode` | string  | No          | Gestión de mensajes de grupo: `always`, `mentioned-only`, `owner-only` (por defecto: `always`) |
| `groups`           | object  | No          | Anulaciones de configuración por grupo                                                 |
| `ownerPhone`       | string  | No          | Reservado para uso futuro                                                              |
| `pairing`          | boolean | No          | Activar modo de emparejamiento durante la configuración                                |

### Paso 5: Iniciar Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envíe un mensaje a su número de teléfono desde otro usuario de Signal para
confirmar la conexión.

## Mensajes de grupo

Signal soporta chats de grupo. Puede controlar cómo responde el agente a los
mensajes de grupo:

| Modo             | Comportamiento                                                       |
| ---------------- | -------------------------------------------------------------------- |
| `always`         | Responder a todos los mensajes de grupo (por defecto)                |
| `mentioned-only` | Solo responder cuando se le menciona por número de teléfono o @      |
| `owner-only`     | Nunca responder en grupos                                            |

Configure globalmente o por grupo:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "su-id-de-grupo":
        mode: always
        classification: INTERNAL
```

Los ID de grupo son identificadores codificados en base64. Use
`triggerfish signal list-groups` o consulte la documentación de signal-cli para
encontrarlos.

## Fragmentación de mensajes

Signal tiene un límite de 4.000 caracteres por mensaje. Las respuestas más
largas se dividen automáticamente en varios mensajes, cortando por saltos de
línea o espacios para legibilidad.

## Indicadores de escritura

El adaptador envía indicadores de escritura mientras el agente procesa una
solicitud. El estado de escritura se borra cuando se envía la respuesta.

## Herramientas extendidas

El adaptador de Signal expone herramientas adicionales:

- `sendTyping` / `stopTyping` -- Control manual de indicadores de escritura
- `listGroups` -- Listar todos los grupos de Signal de los que la cuenta es
  miembro
- `listContacts` -- Listar todos los contactos de Signal

## Cambiar la clasificación

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Reinicie el daemon después de cambiar: `triggerfish stop && triggerfish start`

## Funciones de fiabilidad

El adaptador de Signal incluye varios mecanismos de fiabilidad:

### Reconexión automática

Si la conexión con signal-cli se interrumpe (interrupción de red, reinicio del
daemon), el adaptador se reconecta automáticamente con retroceso exponencial.
No se necesita intervención manual.

### Comprobación de estado

Al iniciar, Triggerfish comprueba si un daemon signal-cli existente está sano
mediante una sonda ping JSON-RPC. Si el daemon no responde, se finaliza y
reinicia automáticamente.

### Seguimiento de versión

Triggerfish registra la versión conocida como correcta de signal-cli
(actualmente 0.13.0) y avisa al inicio si su versión instalada es anterior. La
versión de signal-cli se registra en cada conexión exitosa.

### Soporte de sockets Unix

Además de endpoints TCP, el adaptador soporta sockets de dominio Unix:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Solución de problemas

**El daemon signal-cli no es accesible:**

- Verifique que el daemon está ejecutándose: compruebe el proceso o intente
  `nc -z 127.0.0.1 7583`
- signal-cli solo escucha IPv4 -- use `127.0.0.1`, no `localhost`
- El puerto TCP por defecto es 7583
- Triggerfish reiniciará automáticamente el daemon si detecta un proceso no sano

**Los mensajes no llegan:**

- Confirme que el dispositivo está vinculado: compruebe la aplicación móvil de
  Signal en Dispositivos vinculados
- signal-cli debe haber recibido al menos una sincronización después de vincular
- Revise los registros en busca de errores de conexión:
  `triggerfish logs --tail`

**Errores de Java (solo compilación JVM):**

- La compilación JVM de signal-cli requiere Java 21+
- Ejecute `java -version` para comprobar
- Triggerfish puede descargar un JRE portable durante la configuración si es
  necesario

**Bucles de reconexión:**

- Si ve intentos repetidos de reconexión en los registros, el daemon signal-cli
  puede estar fallando
- Compruebe la salida stderr de signal-cli en busca de errores
- Intente reiniciar con un daemon limpio: detenga Triggerfish, finalice
  signal-cli, reinicie ambos
