# Telegram

Conecten su agente de Triggerfish a Telegram para poder interactuar con él desde
cualquier dispositivo donde usen Telegram. El adaptador utiliza el framework
[grammY](https://grammy.dev/) para comunicarse con la API de Bot de Telegram.

## Configuración

### Paso 1: Crear un Bot

1. Abran Telegram y busquen [@BotFather](https://t.me/BotFather)
2. Envíen `/newbot`
3. Elijan un nombre para mostrar de su bot (ej., "My Triggerfish")
4. Elijan un nombre de usuario para su bot (debe terminar en `bot`, ej.,
   `my_triggerfish_bot`)
5. BotFather responderá con su **token de bot** -- cópienlo

::: warning Mantengan su Token en Secreto Su token de bot otorga control total
de su bot. Nunca lo incluyan en el control de versiones ni lo compartan
públicamente. Triggerfish lo almacena en el llavero de su sistema operativo. :::

### Paso 2: Obtener su ID de Usuario de Telegram

Triggerfish necesita su ID numérico de usuario para verificar que los mensajes
provienen de ustedes. Los nombres de usuario de Telegram pueden cambiarse y no
son confiables para la identidad -- el ID numérico es permanente y asignado por
los servidores de Telegram, por lo que no puede ser falsificado.

1. Busquen [@getmyid_bot](https://t.me/getmyid_bot) en Telegram
2. Envíenle cualquier mensaje
3. Responderá con su ID de usuario (un número como `8019881968`)

### Paso 3: Agregar el Canal

Ejecuten la configuración interactiva:

```bash
triggerfish config add-channel telegram
```

Esto solicita su token de bot, ID de usuario y nivel de clasificación, luego
escribe la configuración en `triggerfish.yaml` y ofrece reiniciar el daemon.

También pueden agregarlo manualmente:

```yaml
channels:
  telegram:
    # botToken almacenado en el llavero del SO
    ownerId: 8019881968
    classification: INTERNAL
```

| Opción           | Tipo   | Requerido | Descripción                                         |
| ---------------- | ------ | --------- | --------------------------------------------------- |
| `botToken`       | string | Sí        | Token de API del bot desde @BotFather               |
| `ownerId`        | number | Sí        | Su ID numérico de usuario de Telegram               |
| `classification` | string | No        | Techo de clasificación (predeterminado: `INTERNAL`) |

### Paso 4: Comenzar a Chatear

Después de que el daemon se reinicie, abran su bot en Telegram y envíen
`/start`. El bot los saludará para confirmar que la conexión está activa.
Entonces pueden chatear con su agente directamente.

## Comportamiento de Clasificación

La configuración de `classification` es un **techo** -- controla la sensibilidad
máxima de los datos que pueden fluir a través de este canal para conversaciones
del **propietario**. No se aplica uniformemente a todos los usuarios.

**Cómo funciona por mensaje:**

- **Ustedes le escriben al bot** (su ID de usuario coincide con `ownerId`): La
  sesión usa el techo del canal. Con el predeterminado `INTERNAL`, su agente
  puede compartir datos de nivel interno con ustedes.
- **Alguien más le escribe al bot**: Su sesión se marca automáticamente como
  `PUBLIC` sin importar la clasificación del canal. La regla de no escritura
  descendente evita que cualquier dato interno llegue a su sesión.

Esto significa que un solo bot de Telegram maneja de forma segura tanto
conversaciones del propietario como de no propietarios. La verificación de
identidad ocurre en código antes de que el LLM vea el mensaje -- el LLM no puede
influir en ella.

| Clasificación del Canal  | Mensajes del Propietario | Mensajes de No Propietarios |
| ------------------------ | :----------------------: | :-------------------------: |
| `PUBLIC`                 |          PUBLIC          |           PUBLIC            |
| `INTERNAL` (predeterminado) |    Hasta INTERNAL     |           PUBLIC            |
| `CONFIDENTIAL`           |   Hasta CONFIDENTIAL     |           PUBLIC            |
| `RESTRICTED`             |    Hasta RESTRICTED      |           PUBLIC            |

Consulten [Sistema de Clasificación](/es-419/architecture/classification) para
el modelo completo y
[Sesiones y Taint](/es-419/architecture/taint-and-sessions) para saber cómo
funciona la escalación de taint.

## Identidad del Propietario

Triggerfish determina el estado de propietario comparando el ID numérico de
usuario de Telegram del remitente con el `ownerId` configurado. Esta
verificación ocurre en código **antes** de que el LLM vea el mensaje:

- **Coincide** -- El mensaje se etiqueta como propietario y puede acceder a
  datos hasta el techo de clasificación del canal
- **No coincide** -- El mensaje se etiqueta con taint `PUBLIC`, y la regla de
  no escritura descendente evita que cualquier dato clasificado fluya a esa
  sesión

::: danger Siempre Configuren su Owner ID Sin `ownerId`, Triggerfish trata a
**todos** los remitentes como el propietario. Cualquiera que encuentre su bot
puede acceder a sus datos hasta el nivel de clasificación del canal. Este campo
es obligatorio durante la configuración por esta razón. :::

## División de Mensajes

Telegram tiene un límite de mensaje de 4,096 caracteres. Cuando su agente genera
una respuesta más larga, Triggerfish la divide automáticamente en múltiples
mensajes. El divisor separa por saltos de línea o espacios para facilitar la
lectura -- evita cortar palabras u oraciones a la mitad.

## Tipos de Mensaje Soportados

El adaptador de Telegram actualmente maneja:

- **Mensajes de texto** -- Soporte completo de envío y recepción
- **Respuestas largas** -- Se dividen automáticamente para ajustarse a los
  límites de Telegram

## Indicadores de Escritura

Cuando su agente está procesando una solicitud, el bot muestra "escribiendo..."
en el chat de Telegram. El indicador se ejecuta mientras el LLM genera una
respuesta y se borra cuando se envía la respuesta.

## Cambiar la Clasificación

Para subir o bajar el techo de clasificación:

```bash
triggerfish config add-channel telegram
# Seleccionen sobrescribir la configuración existente cuando se les solicite
```

O editen `triggerfish.yaml` directamente:

```yaml
channels:
  telegram:
    # botToken almacenado en el llavero del SO
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Reinicien el daemon después de cambiar: `triggerfish stop && triggerfish start`
