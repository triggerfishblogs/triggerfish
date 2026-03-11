# Analisis de Imagenes y Vision

Triggerfish soporta entrada de imagenes en todas las interfaces. Puede pegar
imagenes desde su portapapeles en el CLI o navegador, y el agente puede analizar
archivos de imagen en disco. Cuando su modelo principal no soporta vision, un
modelo de vision separado puede describir imagenes automaticamente antes de que
lleguen al modelo principal.

## Entrada de Imagenes

### CLI: Pegado del Portapapeles (Ctrl+V)

Presione **Ctrl+V** en el chat CLI para pegar una imagen de su portapapeles del
sistema. La imagen se lee del portapapeles del SO, se codifica en base64 y se
envia al agente como un bloque de contenido multimodal junto con su mensaje de
texto.

La lectura del portapapeles soporta:

- **Linux** -- `xclip` o `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- Acceso al portapapeles via PowerShell

### Tidepool: Pegado en el Navegador

En la interfaz web de Tidepool, pegue imagenes directamente en el campo de
entrada del chat usando la funcionalidad nativa de pegado de su navegador
(Ctrl+V / Cmd+V). La imagen se lee como URL de datos y se envia como un bloque
de contenido codificado en base64.

### Herramienta `image_analyze`

El agente puede analizar archivos de imagen en disco usando la herramienta
`image_analyze`.

| Parametro | Tipo   | Requerido | Descripcion                                                                          |
| --------- | ------ | --------- | ------------------------------------------------------------------------------------ |
| `path`    | string | si        | Ruta absoluta al archivo de imagen                                                   |
| `prompt`  | string | no        | Pregunta o prompt sobre la imagen (predeterminado: "Describe this image in detail")  |

**Formatos soportados:** PNG, JPEG, GIF, WebP, BMP, SVG

La herramienta lee el archivo, lo codifica en base64 y lo envia a un proveedor
LLM capaz de vision para analisis.

## Fallback de Modelo de Vision

Cuando su modelo principal no soporta vision (ej., Z.AI `glm-5`), puede
configurar un modelo de vision separado para describir imagenes automaticamente
antes de que lleguen al modelo principal.

### Como Funciona

1. Usted pega una imagen (Ctrl+V) o envia contenido multimodal
2. El orquestador detecta bloques de contenido de imagen en el mensaje
3. El modelo de vision describe cada imagen (ve un spinner "Analizando
   imagen...")
4. Los bloques de imagen se reemplazan con descripciones de texto:
   `[The user shared an image. A vision model described it as follows: ...]`
5. El modelo principal recibe un mensaje de solo texto con las descripciones
6. Un hint en el system prompt le dice al modelo principal que trate las
   descripciones como si pudiera ver las imagenes

Esto es completamente transparente -- usted pega una imagen y obtiene una
respuesta, sin importar si el modelo principal soporta vision.

### Configuracion

Agregue un campo `vision` a su configuracion de modelos:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Modelo principal sin vision
  vision: glm-4.5v # Modelo de vision para descripcion de imagenes
  providers:
    zai:
      model: glm-5
```

El modelo `vision` reutiliza credenciales de la entrada del keychain del
proveedor principal. En este ejemplo, el proveedor principal es `zai`, asi que
`glm-4.5v` usa la misma API key almacenada en el keychain del SO para el
proveedor `zai`.

| Clave           | Tipo   | Descripcion                                                       |
| --------------- | ------ | ----------------------------------------------------------------- |
| `models.vision` | string | Nombre opcional del modelo de vision para descripcion automatica de imagenes |

### Cuando se Activa el Fallback de Vision

- Solo cuando `models.vision` esta configurado
- Solo cuando el mensaje contiene bloques de contenido de imagen
- Mensajes de solo texto y bloques de contenido de solo texto omiten el fallback
  completamente
- Si el proveedor de vision falla, el error se maneja de forma elegante y el
  agente continua

### Eventos

El orquestador emite dos eventos durante el procesamiento de vision:

| Evento            | Descripcion                                             |
| ----------------- | ------------------------------------------------------- |
| `vision_start`    | Comienza la descripcion de imagen (incluye `imageCount`) |
| `vision_complete` | Todas las imagenes descritas                            |

Estos eventos impulsan el spinner "Analizando imagen..." en las interfaces CLI
y Tidepool.

::: tip Si su modelo principal ya soporta vision (ej., Anthropic Claude, OpenAI
GPT-4o, Google Gemini), no necesita configurar `models.vision`. Las imagenes se
enviaran directamente al modelo principal como contenido multimodal. :::
