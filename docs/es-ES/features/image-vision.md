# Análisis de imagen y visión

Triggerfish admite la entrada de imágenes en todas las interfaces. Puede pegar
imágenes del portapapeles en el CLI o navegador, y el agente puede analizar
archivos de imagen en disco. Cuando su modelo principal no admite visión, un
modelo de visión separado puede describir imágenes automáticamente antes de que
lleguen al modelo principal.

## Entrada de imagen

### CLI: pegado del portapapeles (Ctrl+V)

Pulse **Ctrl+V** en el chat del CLI para pegar una imagen del portapapeles del
sistema. La imagen se lee del portapapeles del SO, se codifica en base64 y se
envía al agente como un bloque de contenido multimodal junto con su mensaje de
texto.

La lectura del portapapeles admite:

- **Linux** -- `xclip` o `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- acceso al portapapeles vía PowerShell

### Tidepool: pegado en navegador

En la interfaz web Tidepool, pegue imágenes directamente en la entrada del chat
usando la funcionalidad nativa de pegado de su navegador (Ctrl+V / Cmd+V). La
imagen se lee como URL de datos y se envía como un bloque de contenido
codificado en base64.

### Herramienta `image_analyze`

El agente puede analizar archivos de imagen en disco usando la herramienta
`image_analyze`.

| Parámetro | Tipo   | Obligatorio | Descripción                                                                          |
| --------- | ------ | ----------- | ------------------------------------------------------------------------------------ |
| `path`    | string | sí          | Ruta absoluta al archivo de imagen                                                   |
| `prompt`  | string | no          | Pregunta o indicación sobre la imagen (predeterminado: "Describe this image in detail") |

**Formatos admitidos:** PNG, JPEG, GIF, WebP, BMP, SVG

La herramienta lee el archivo, lo codifica en base64 y lo envía a un proveedor
LLM con capacidad de visión para su análisis.

## Respaldo de modelo de visión

Cuando su modelo principal no admite visión (p. ej., Z.AI `glm-5`), puede
configurar un modelo de visión separado para describir imágenes automáticamente
antes de que lleguen al modelo principal.

### Cómo funciona

1. Usted pega una imagen (Ctrl+V) o envía contenido multimodal
2. El orquestador detecta bloques de contenido de imagen en el mensaje
3. El modelo de visión describe cada imagen (se muestra un indicador "Analizando
   imagen...")
4. Los bloques de imagen se reemplazan con descripciones de texto:
   `[The user shared an image. A vision model described it as follows: ...]`
5. El modelo principal recibe un mensaje de solo texto con las descripciones
6. Una indicación en el prompt del sistema le dice al modelo principal que trate
   las descripciones como si pudiera ver las imágenes

Esto es completamente transparente: usted pega una imagen y obtiene una
respuesta, independientemente de si el modelo principal admite visión.

### Configuración

Añada un campo `vision` a la configuración de modelos:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Modelo principal sin visión
  vision: glm-4.5v # Modelo de visión para descripción de imágenes
  providers:
    zai:
      model: glm-5
```

El modelo `vision` reutiliza las credenciales de la entrada del llavero del
proveedor principal. En este ejemplo, el proveedor principal es `zai`, por lo
que `glm-4.5v` usa la misma clave API almacenada en el llavero del SO para el
proveedor `zai`.

| Clave           | Tipo   | Descripción                                                     |
| --------------- | ------ | --------------------------------------------------------------- |
| `models.vision` | string | Nombre opcional del modelo de visión para descripción automática |

### Cuándo se activa el respaldo de visión

- Solo cuando `models.vision` está configurado
- Solo cuando el mensaje contiene bloques de contenido de imagen
- Los mensajes de solo texto y bloques de contenido de solo texto omiten el
  respaldo completamente
- Si el proveedor de visión falla, el error se gestiona con elegancia y el
  agente continúa

### Eventos

El orquestador emite dos eventos durante el procesamiento de visión:

| Evento            | Descripción                                               |
| ----------------- | --------------------------------------------------------- |
| `vision_start`    | La descripción de imagen comienza (incluye `imageCount`)  |
| `vision_complete` | Todas las imágenes descritas                              |

Estos eventos activan el indicador "Analizando imagen..." en las interfaces CLI
y Tidepool.

::: tip Si su modelo principal ya admite visión (p. ej., Anthropic Claude,
OpenAI GPT-4o, Google Gemini), no necesita configurar `models.vision`. Las
imágenes se enviarán directamente al modelo principal como contenido
multimodal. :::
