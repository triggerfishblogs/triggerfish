# Telegram

Conecte su agente Triggerfish a Telegram para poder interactuar con él desde
cualquier dispositivo donde use Telegram. El adaptador utiliza el framework
[grammY](https://grammy.dev/) para comunicarse con la Bot API de Telegram.

## Configuración

### Paso 1: Crear un bot

1. Abra Telegram y busque [@BotFather](https://t.me/BotFather)
2. Envíe `/newbot`
3. Elija un nombre para mostrar (p. ej., "My Triggerfish")
4. Elija un nombre de usuario para su bot (debe terminar en `bot`, p. ej.,
   `my_triggerfish_bot`)
5. BotFather responderá con su **token de bot** -- cópielo

::: warning Mantenga su token en secreto Su token de bot otorga control total
sobre su bot. Nunca lo incluya en el control de versiones ni lo comparta
públicamente. Triggerfish lo almacena en el llavero de su sistema operativo. :::

### Paso 2: Obtener su ID de usuario de Telegram

Triggerfish necesita su ID numérico de usuario para verificar que los mensajes
provienen de usted. Los nombres de usuario de Telegram se pueden cambiar y no
son fiables para la identidad -- el ID numérico es permanente y asignado por los
servidores de Telegram, por lo que no puede ser falsificado.

1. Busque [@getmyid_bot](https://t.me/getmyid_bot) en Telegram
2. Envíele cualquier mensaje
3. Le responderá con su ID de usuario (un número como `8019881968`)

### Paso 3: Añadir el canal

Ejecute la configuración interactiva:

```bash
triggerfish config add-channel telegram
```

Esto le solicita su token de bot, ID de usuario y nivel de clasificación, luego
escribe la configuración en `triggerfish.yaml` y ofrece reiniciar el daemon.

También puede añadirlo manualmente:

```yaml
channels:
  telegram:
    # botToken almacenado en el llavero del SO
    ownerId: 8019881968
    classification: INTERNAL
```

| Opción           | Tipo   | Obligatorio | Descripción                                       |
| ---------------- | ------ | ----------- | ------------------------------------------------- |
| `botToken`       | string | Sí          | Token de la Bot API de @BotFather                 |
| `ownerId`        | number | Sí          | Su ID numérico de usuario de Telegram             |
| `classification` | string | No          | Techo de clasificación (por defecto: `INTERNAL`)  |

### Paso 4: Empezar a chatear

Después de reiniciar el daemon, abra su bot en Telegram y envíe `/start`. El bot
le saludará para confirmar que la conexión está activa. Puede entonces chatear
con su agente directamente.

## Comportamiento de clasificación

La configuración de `classification` es un **techo** -- controla la sensibilidad
máxima de los datos que pueden fluir por este canal para las conversaciones del
**propietario**. No se aplica de forma uniforme a todos los usuarios.

**Cómo funciona por mensaje:**

- **Usted envía un mensaje al bot** (su ID de usuario coincide con `ownerId`):
  La sesión utiliza el techo del canal. Con el valor por defecto `INTERNAL`, su
  agente puede compartir datos de nivel interno con usted.
- **Otra persona envía un mensaje al bot**: Su sesión se contamina
  automáticamente con `PUBLIC` independientemente de la clasificación del canal.
  La regla de no escritura descendente impide que cualquier dato interno llegue a
  su sesión.

Esto significa que un solo bot de Telegram gestiona de forma segura tanto las
conversaciones del propietario como las de otros usuarios. La comprobación de
identidad ocurre en código antes de que el LLM vea el mensaje -- el LLM no puede
influir en ella.

| Clasificación del canal |  Mensajes del propietario   | Mensajes de otros usuarios |
| ----------------------- | :-------------------------: | :------------------------: |
| `PUBLIC`                |           PUBLIC            |           PUBLIC           |
| `INTERNAL` (por defecto)|     Hasta INTERNAL         |           PUBLIC           |
| `CONFIDENTIAL`          |     Hasta CONFIDENTIAL     |           PUBLIC           |
| `RESTRICTED`            |     Hasta RESTRICTED       |           PUBLIC           |

Consulte [Sistema de clasificación](/es-ES/architecture/classification) para el
modelo completo y
[Sesiones y contaminación](/es-ES/architecture/taint-and-sessions) para cómo
funciona la escalada de contaminación.

## Identidad del propietario

Triggerfish determina el estado de propietario comparando el ID numérico de
usuario de Telegram del remitente con el `ownerId` configurado. Esta
comprobación ocurre en código **antes** de que el LLM vea el mensaje:

- **Coincidencia** -- El mensaje se etiqueta como del propietario y puede
  acceder a datos hasta el techo de clasificación del canal
- **Sin coincidencia** -- El mensaje se etiqueta con contaminación `PUBLIC`, y la
  regla de no escritura descendente impide que cualquier dato clasificado fluya a
  esa sesión

::: danger Establezca siempre su ID de propietario Sin `ownerId`, Triggerfish
trata a **todos** los remitentes como propietarios. Cualquiera que encuentre su
bot puede acceder a sus datos hasta el nivel de clasificación del canal. Este
campo es obligatorio durante la configuración por este motivo. :::

## Fragmentación de mensajes

Telegram tiene un límite de 4.096 caracteres por mensaje. Cuando su agente
genera una respuesta más larga, Triggerfish la divide automáticamente en varios
mensajes. El fragmentador divide por saltos de línea o espacios para
legibilidad -- evita cortar palabras u oraciones por la mitad.

## Tipos de mensaje soportados

El adaptador de Telegram actualmente gestiona:

- **Mensajes de texto** -- Soporte completo de envío y recepción
- **Respuestas largas** -- Fragmentadas automáticamente para ajustarse a los
  límites de Telegram

## Indicadores de escritura

Cuando su agente está procesando una solicitud, el bot muestra "escribiendo..."
en el chat de Telegram. El indicador se mantiene mientras el LLM genera una
respuesta y desaparece cuando se envía la respuesta.

## Cambiar la clasificación

Para subir o bajar el techo de clasificación:

```bash
triggerfish config add-channel telegram
# Seleccione sobrescribir la configuración existente cuando se le solicite
```

O edite `triggerfish.yaml` directamente:

```yaml
channels:
  telegram:
    # botToken almacenado en el llavero del SO
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Niveles válidos: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Reinicie el daemon después de cambiar: `triggerfish stop && triggerfish start`
