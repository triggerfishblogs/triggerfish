# Canal CLI

La interfaz de línea de comandos es el canal por defecto en Triggerfish. Siempre
está disponible, no requiere configuración externa y es la forma principal de
interactuar con su agente durante el desarrollo y el uso local.

## Clasificación

El canal CLI tiene por defecto la clasificación `INTERNAL`. El usuario del
terminal **siempre** se trata como propietario -- no hay flujo de
emparejamiento ni autenticación porque usted ejecuta el proceso directamente
en su ordenador.

::: info ¿Por qué INTERNAL? El CLI es una interfaz directa y local. Solo
alguien con acceso a su terminal puede usarlo. Esto hace de `INTERNAL` el valor
por defecto apropiado -- su agente puede compartir datos internos libremente en
este contexto. :::

## Funcionalidades

### Entrada de terminal en modo crudo

El CLI utiliza el modo crudo del terminal con análisis completo de secuencias de
escape ANSI. Esto le proporciona una experiencia de edición enriquecida
directamente en su terminal:

- **Edición de línea** -- Navegue con las teclas de flecha, Inicio/Fin, elimine
  palabras con Ctrl+W
- **Historial de entrada** -- Pulse Arriba/Abajo para recorrer entradas
  anteriores
- **Sugerencias** -- Autocompletado con Tab para comandos comunes
- **Entrada multilínea** -- Introduzca indicaciones más largas de forma natural

### Visualización compacta de herramientas

Cuando el agente ejecuta herramientas, el CLI muestra un resumen compacto de una
línea por defecto:

```
tool_name arg  result
```

Alterne entre la salida compacta y expandida de herramientas con **Ctrl+O**.

### Interrumpir operaciones en curso

Pulse **ESC** para interrumpir la operación actual. Esto envía una señal de
cancelación a través del orquestador al proveedor LLM, deteniendo la generación
inmediatamente. No necesita esperar a que finalice una respuesta larga.

### Visualización de contaminación

Puede mostrar opcionalmente el nivel de contaminación (taint) de la sesión
actual en la salida activando `showTaint` en la configuración del canal CLI.
Esto antepone el nivel de clasificación a cada respuesta:

```
[CONFIDENTIAL] Aquí tiene las cifras del pipeline del T4...
```

### Barra de progreso de longitud de contexto

El CLI muestra una barra de uso de la ventana de contexto en tiempo real en la
línea separadora de la parte inferior del terminal:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- La barra se llena a medida que se consumen tokens de contexto
- Un marcador azul aparece en el umbral del 70% (donde se activa la compactación
  automática)
- La barra se vuelve roja al acercarse al límite
- Después de la compactación (`/compact` o automática), la barra se reinicia

### Estado de servidores MCP

El separador también muestra el estado de conexión de los servidores MCP:

| Visualización          | Significado                                     |
| ---------------------- | ----------------------------------------------- |
| `MCP 3/3` (verde)     | Todos los servidores configurados conectados    |
| `MCP 2/3` (amarillo)  | Algunos servidores aún conectando o con errores |
| `MCP 0/3` (rojo)      | Ningún servidor conectado                       |

Los servidores MCP se conectan de forma diferida en segundo plano tras el
inicio. El estado se actualiza en tiempo real a medida que los servidores se
ponen en línea.

## Historial de entrada

Su historial de entrada se conserva entre sesiones en:

```
~/.triggerfish/data/input_history.json
```

El historial se carga al inicio y se guarda después de cada entrada. Puede
borrarlo eliminando el fichero.

## No-TTY / Entrada por tubería

Cuando stdin no es un TTY (por ejemplo, al canalizar entrada desde otro
proceso), el CLI cambia automáticamente al **modo de lectura por líneas**. En
este modo:

- Las funciones del terminal en modo crudo (teclas de flecha, navegación por
  historial) están desactivadas
- La entrada se lee línea por línea desde stdin
- La salida se escribe a stdout sin formato ANSI

Esto le permite programar interacciones con su agente:

```bash
echo "What is the weather today?" | triggerfish run
```

## Configuración

El canal CLI requiere una configuración mínima. Se crea automáticamente al
ejecutar `triggerfish run` o usar el REPL interactivo.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Opción        | Tipo    | Por defecto | Descripción                                        |
| ------------- | ------- | ----------- | -------------------------------------------------- |
| `interactive` | boolean | `true`      | Activar el modo REPL interactivo                   |
| `showTaint`   | boolean | `false`     | Mostrar el nivel de contaminación en la salida     |

::: tip Sin configuración necesaria El canal CLI funciona directamente. No
necesita configurar nada para empezar a usar Triggerfish desde su terminal. :::

## Atajos de teclado

| Atajo          | Acción                                                           |
| -------------- | ---------------------------------------------------------------- |
| Enter          | Enviar mensaje                                                   |
| Arriba / Abajo | Navegar por el historial de entrada                              |
| Ctrl+V         | Pegar imagen del portapapeles (enviada como contenido multimodal)|
| Ctrl+O         | Alternar visualización compacta/expandida de herramientas        |
| ESC            | Interrumpir la operación actual                                  |
| Ctrl+C         | Salir del CLI                                                    |
| Ctrl+W         | Eliminar la palabra anterior                                     |
| Inicio / Fin   | Ir al inicio/fin de la línea                                     |
