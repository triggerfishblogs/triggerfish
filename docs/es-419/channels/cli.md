# Canal CLI

La interfaz de línea de comandos es el canal predeterminado en Triggerfish.
Siempre está disponible, no requiere configuración externa y es la forma
principal de interactuar con su agente durante el desarrollo y uso local.

## Clasificación

El canal CLI tiene clasificación `INTERNAL` por defecto. El usuario de la
terminal **siempre** es tratado como el propietario -- no hay flujo de
emparejamiento o autenticación porque están ejecutando el proceso directamente
en su máquina.

::: info ¿Por qué INTERNAL? El CLI es una interfaz directa y local. Solo
alguien con acceso a su terminal puede usarlo. Esto hace que `INTERNAL` sea el
valor predeterminado apropiado -- su agente puede compartir datos internos
libremente en este contexto. :::

## Características

### Entrada de Terminal en Modo Raw

El CLI utiliza el modo raw de terminal con análisis completo de secuencias de
escape ANSI. Esto les da una experiencia de edición enriquecida directamente en
su terminal:

- **Edición de línea** -- Naveguen con las teclas de flecha, Inicio/Fin, borren
  palabras con Ctrl+W
- **Historial de entrada** -- Presionen Arriba/Abajo para recorrer entradas
  anteriores
- **Sugerencias** -- Autocompletado con Tab para comandos comunes
- **Entrada multilínea** -- Escriban indicaciones más largas de forma natural

### Vista Compacta de Herramientas

Cuando el agente llama herramientas, el CLI muestra un resumen compacto de una
línea por defecto:

```
tool_name arg  result
```

Alternen entre la vista compacta y expandida de herramientas con **Ctrl+O**.

### Interrumpir Operaciones en Curso

Presionen **ESC** para interrumpir la operación actual. Esto envía una señal de
cancelación a través del orquestador al proveedor de LLM, deteniendo la
generación inmediatamente. No necesitan esperar a que termine una respuesta
larga.

### Visualización de Taint

Pueden mostrar opcionalmente el nivel de taint de la sesión actual en la salida
habilitando `showTaint` en la configuración del canal CLI. Esto antepone el
nivel de clasificación a cada respuesta:

```
[CONFIDENTIAL] Aquí están sus números del pipeline del Q4...
```

### Barra de Progreso de Longitud de Contexto

El CLI muestra una barra de uso de la ventana de contexto en tiempo real en la
línea separadora en la parte inferior de la terminal:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- La barra se llena a medida que se consumen tokens de contexto
- Un marcador azul aparece en el umbral del 70% (donde se activa la compactación
  automática)
- La barra se vuelve roja al acercarse al límite
- Después de la compactación (`/compact` o automática), la barra se reinicia

### Estado del Servidor MCP

El separador también muestra el estado de conexión del servidor MCP:

| Visualización      | Significado                                   |
| ------------------ | --------------------------------------------- |
| `MCP 3/3` (verde)  | Todos los servidores configurados conectados  |
| `MCP 2/3` (amarillo) | Algunos servidores aún conectando o fallaron |
| `MCP 0/3` (rojo)   | Ningún servidor conectado                     |

Los servidores MCP se conectan de forma diferida en segundo plano después del
inicio. El estado se actualiza en tiempo real a medida que los servidores se
conectan.

## Historial de Entrada

Su historial de entrada se conserva entre sesiones en:

```
~/.triggerfish/data/input_history.json
```

El historial se carga al inicio y se guarda después de cada entrada. Pueden
borrarlo eliminando el archivo.

## Entrada Sin TTY / Canalizada

Cuando stdin no es un TTY (por ejemplo, al canalizar entrada desde otro
proceso), el CLI cambia automáticamente a **modo con buffer de línea**. En
este modo:

- Las funciones de terminal raw (teclas de flecha, navegación del historial)
  están deshabilitadas
- La entrada se lee línea por línea desde stdin
- La salida se escribe en stdout sin formato ANSI

Esto les permite programar interacciones con su agente:

```bash
echo "What is the weather today?" | triggerfish run
```

## Configuración

El canal CLI requiere configuración mínima. Se crea automáticamente cuando
ejecutan `triggerfish run` o usan el REPL interactivo.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Opción        | Tipo    | Predeterminado | Descripción                                     |
| ------------- | ------- | -------------- | ----------------------------------------------- |
| `interactive` | boolean | `true`         | Habilitar modo REPL interactivo                 |
| `showTaint`   | boolean | `false`        | Mostrar nivel de taint de sesión en la salida   |

::: tip Sin Configuración Necesaria El canal CLI funciona de inmediato. No
necesitan configurar nada para empezar a usar Triggerfish desde su terminal. :::

## Atajos de Teclado

| Atajo        | Acción                                                        |
| ------------ | ------------------------------------------------------------- |
| Enter        | Enviar mensaje                                                |
| Arriba/Abajo | Navegar historial de entrada                                  |
| Ctrl+V       | Pegar imagen del portapapeles (enviada como contenido multimodal) |
| Ctrl+O       | Alternar vista compacta/expandida de herramientas             |
| ESC          | Interrumpir operación actual                                  |
| Ctrl+C       | Salir del CLI                                                 |
| Ctrl+W       | Borrar palabra anterior                                       |
| Inicio/Fin   | Saltar al inicio/fin de la línea                              |
