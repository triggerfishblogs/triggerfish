# Signal

Conecten su agente de Triggerfish a Signal para que las personas puedan enviarle
mensajes desde la app de Signal. El adaptador se comunica con un daemon de
[signal-cli](https://github.com/AsamK/signal-cli) mediante JSON-RPC, usando su
número de teléfono vinculado de Signal.

## Cómo Signal es Diferente

El adaptador de Signal **es** su número de teléfono. A diferencia de Telegram o
Slack donde existe una cuenta de bot separada, los mensajes de Signal provienen
de otras personas hacia su número. Esto significa:

- Todos los mensajes entrantes tienen `isOwner: false` -- siempre son de otra
  persona
- El adaptador responde como su número de teléfono
- No hay verificación de propietario por mensaje como en otros canales

Esto hace que Signal sea ideal para recibir mensajes de contactos que escriben a
su número, con el agente respondiendo en su nombre.

## Clasificación Predeterminada

Signal tiene clasificación `PUBLIC` por defecto. Como todos los mensajes
entrantes provienen de contactos externos, `PUBLIC` es el valor predeterminado
seguro.

## Configuración

### Paso 1: Instalar signal-cli

signal-cli es un cliente de línea de comandos de terceros para Signal.
Triggerfish se comunica con él a través de un socket TCP o Unix.

**Linux (compilación nativa -- no necesita Java):**

Descarguen la última compilación nativa desde la página de
[releases de signal-cli](https://github.com/AsamK/signal-cli/releases), o dejen
que Triggerfish lo descargue durante la configuración.

**macOS / otras plataformas (compilación JVM):**

Requiere Java 21+. Triggerfish puede descargar un JRE portátil automáticamente
si Java no está instalado.

También pueden ejecutar la configuración guiada:

```bash
triggerfish config add-channel signal
```

Esto verifica signal-cli, ofrece descargarlo si falta y los guía a través de la
vinculación.

### Paso 2: Vincular su Dispositivo

signal-cli debe vincularse a su cuenta de Signal existente (como vincular una
app de escritorio):

```bash
signal-cli link -n "Triggerfish"
```

Esto imprime un URI `tsdevice:`. Escaneen el código QR con su app móvil de
Signal (Configuración > Dispositivos Vinculados > Vincular Nuevo Dispositivo).

### Paso 3: Iniciar el Daemon

signal-cli se ejecuta como un daemon en segundo plano al que Triggerfish se
conecta:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

Reemplacen `+14155552671` con su número de teléfono en formato E.164.

### Paso 4: Configurar Triggerfish

Agreguen Signal a su `triggerfish.yaml`:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Opción             | Tipo    | Requerido | Descripción                                                                                      |
| ------------------ | ------- | --------- | ------------------------------------------------------------------------------------------------ |
| `endpoint`         | string  | Sí        | Dirección del daemon signal-cli (`tcp://host:puerto` o `unix:///ruta/al/socket`)                 |
| `account`          | string  | Sí        | Su número de teléfono de Signal (formato E.164)                                                  |
| `classification`   | string  | No        | Techo de clasificación (predeterminado: `PUBLIC`)                                                |
| `defaultGroupMode` | string  | No        | Manejo de mensajes grupales: `always`, `mentioned-only`, `owner-only` (predeterminado: `always`) |
| `groups`           | object  | No        | Configuraciones por grupo                                                                        |
| `ownerPhone`       | string  | No        | Reservado para uso futuro                                                                        |
| `pairing`          | boolean | No        | Habilitar modo de emparejamiento durante la configuración                                        |

### Paso 5: Iniciar Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envíen un mensaje a su número de teléfono desde otro usuario de Signal para
confirmar la conexión.

## Mensajes Grupales

Signal soporta chats grupales. Pueden controlar cómo el agente responde a
mensajes grupales:

| Modo             | Comportamiento                                              |
| ---------------- | ----------------------------------------------------------- |
| `always`         | Responder a todos los mensajes grupales (predeterminado)    |
| `mentioned-only` | Solo responder cuando se menciona por número o @mención     |
| `owner-only`     | Nunca responder en grupos                                   |

Configuren globalmente o por grupo:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "su-group-id":
        mode: always
        classification: INTERNAL
```

Los IDs de grupo son identificadores codificados en base64. Usen
`triggerfish signal list-groups` o consulten la documentación de signal-cli para
encontrarlos.

## División de Mensajes

Signal tiene un límite de mensaje de 4,000 caracteres. Las respuestas más largas
se dividen automáticamente en múltiples mensajes, separando por saltos de línea
o espacios para facilitar la lectura.

## Indicadores de Escritura

El adaptador envía indicadores de escritura mientras el agente está procesando
una solicitud. El estado de escritura se borra cuando se envía la respuesta.

## Herramientas Extendidas

El adaptador de Signal expone herramientas adicionales:

- `sendTyping` / `stopTyping` -- Control manual de indicadores de escritura
- `listGroups` -- Listar todos los grupos de Signal de los que la cuenta es
  miembro
- `listContacts` -- Listar todos los contactos de Signal

## Cambiar la Clasificación

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Reinicien el daemon después de cambiar: `triggerfish stop && triggerfish start`

## Características de Confiabilidad

El adaptador de Signal incluye varios mecanismos de confiabilidad:

### Reconexión Automática

Si la conexión con signal-cli se cae (interrupción de red, reinicio del daemon),
el adaptador se reconecta automáticamente con retroceso exponencial. No se
necesita intervención manual.

### Verificación de Salud

Al iniciar, Triggerfish verifica si un daemon signal-cli existente está saludable
usando una prueba de ping JSON-RPC. Si el daemon no responde, se detiene y
reinicia automáticamente.

### Seguimiento de Versión

Triggerfish rastrea la versión conocida como buena de signal-cli (actualmente
0.13.0) y advierte al inicio si su versión instalada es más antigua. La versión
de signal-cli se registra en cada conexión exitosa.

### Soporte de Socket Unix

Además de endpoints TCP, el adaptador soporta sockets de dominio Unix:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Solución de Problemas

**Daemon signal-cli no accesible:**

- Verifiquen que el daemon esté ejecutándose: busquen el proceso o intenten
  `nc -z 127.0.0.1 7583`
- signal-cli se enlaza solo a IPv4 -- usen `127.0.0.1`, no `localhost`
- El puerto TCP predeterminado es 7583
- Triggerfish reiniciará automáticamente el daemon si detecta un proceso no
  saludable

**Los mensajes no llegan:**

- Confirmen que el dispositivo está vinculado: revisen la app móvil de Signal en
  Dispositivos Vinculados
- signal-cli debe haber recibido al menos una sincronización después de vincular
- Revisen los logs en busca de errores de conexión: `triggerfish logs --tail`

**Errores de Java (solo compilación JVM):**

- La compilación JVM de signal-cli requiere Java 21+
- Ejecuten `java -version` para verificar
- Triggerfish puede descargar un JRE portátil durante la configuración si es
  necesario

**Bucles de reconexión:**

- Si ven intentos de reconexión repetidos en los logs, el daemon signal-cli
  puede estar fallando
- Revisen la salida stderr propia de signal-cli en busca de errores
- Intenten reiniciar con un daemon limpio: detengan Triggerfish, detengan
  signal-cli, reinicien ambos
