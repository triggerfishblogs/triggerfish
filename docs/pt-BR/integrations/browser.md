# Automatización de Navegador

Triggerfish proporciona control profundo del navegador a través de una instancia
de Chromium administrada dedicada usando CDP (Chrome DevTools Protocol). El
agente puede navegar por la web, interactuar con páginas, llenar formularios,
capturar capturas de pantalla y automatizar flujos de trabajo web -- todo bajo
aplicación de políticas.

## Arquitectura

La automatización del navegador está construida sobre `puppeteer-core`,
conectándose a una instancia de Chromium administrada vía CDP. Cada acción del
navegador pasa por la capa de políticas antes de llegar al navegador.

Triggerfish auto-detecta navegadores basados en Chromium incluyendo **Google
Chrome**, **Chromium** y **Brave**. La detección cubre rutas de instalación
estándar en Linux, macOS, Windows y entornos Flatpak.

::: info La herramienta `browser_navigate` requiere URLs `http://` o `https://`.
Los esquemas internos del navegador (como `chrome://`, `brave://`, `about:`) no
están soportados y devolverán un error con orientación para usar una URL web en
su lugar. :::

<img src="/diagrams/browser-automation-flow.svg" alt="Flujo de automatización del navegador: Agente → Herramienta de Navegador → Capa de Políticas → CDP → Chromium Administrado" style="max-width: 100%;" />

El perfil del navegador está aislado por agente. La instancia de Chromium
administrada no comparte cookies, sesiones ni almacenamiento local con su
navegador personal. El autocompletado de credenciales está deshabilitado por
defecto.

## Acciones Disponibles

| Acción     | Descripción                                              | Ejemplo de Uso                                          |
| ---------- | -------------------------------------------------------- | ------------------------------------------------------- |
| `navigate` | Ir a una URL (sujeto a política de dominio)              | Abrir una página web para investigación                 |
| `snapshot` | Capturar una captura de pantalla de la página            | Documentar un estado de UI, extraer información visual  |
| `click`    | Hacer clic en un elemento de la página                   | Enviar un formulario, activar un botón                  |
| `type`     | Escribir texto en un campo de entrada                    | Llenar un cuadro de búsqueda, completar un formulario   |
| `select`   | Seleccionar una opción de un menú desplegable            | Elegir de un menú                                       |
| `upload`   | Subir un archivo a un formulario                         | Adjuntar un documento                                   |
| `evaluate` | Ejecutar JavaScript en el contexto de la página (aislado) | Extraer datos, manipular el DOM                        |
| `wait`     | Esperar un elemento o condición                          | Asegurar que la página haya cargado antes de interactuar |

## Aplicación de Política de Dominio

Cada URL a la que el agente navega se verifica contra una lista de dominios
permitidos y denegados antes de que el navegador actúe.

### Configuración

```yaml
browser:
  domain_policy:
    allow:
      - "*.example.com"
      - "github.com"
      - "docs.google.com"
      - "*.notion.so"
    deny:
      - "*.malware-site.com"
    classification:
      "*.internal.company.com": INTERNAL
      "github.com": INTERNAL
      "*.google.com": INTERNAL
```

### Cómo Funciona la Política de Dominio

1. El agente llama a `browser.navigate("https://github.com/org/repo")`
2. El hook `PRE_TOOL_CALL` se dispara con la URL como contexto
3. El motor de políticas verifica el dominio contra las listas de permitir/
   denegar
4. Si está denegado o no en la lista de permitidos, la navegación se **bloquea**
5. Si está permitido, se busca la clasificación del dominio
6. El taint de sesión escala para coincidir con la clasificación del dominio
7. La navegación procede

::: warning SEGURIDAD Si un dominio no está en la lista de permitidos, la
navegación se bloquea por defecto. El LLM no puede anular la política de
dominio. Esto evita que el agente visite sitios web arbitrarios que podrían
exponer datos sensibles o activar acciones no deseadas. :::

## Capturas de Pantalla y Clasificación

Las capturas de pantalla tomadas vía `browser.snapshot` heredan el nivel de taint
actual de la sesión. Si la sesión tiene taint `CONFIDENTIAL`, todas las capturas
de esa sesión se clasifican como `CONFIDENTIAL`.

Esto importa para la política de salida. Una captura de pantalla clasificada como
`CONFIDENTIAL` no puede enviarse a un canal `PUBLIC`. El hook `PRE_OUTPUT` aplica
esto en el límite.

## Contenido Extraído y Linaje

Cuando el agente extrae contenido de una página web (vía `evaluate`, leyendo
texto o analizando elementos), los datos extraídos:

- Se clasifican según el nivel de clasificación asignado al dominio
- Crean un registro de linaje rastreando la URL fuente, hora de extracción y
  clasificación
- Contribuyen al taint de sesión (el taint escala para coincidir con la
  clasificación del contenido)

Este rastreo de linaje significa que siempre pueden rastrear de dónde
vinieron los datos, incluso si se extrajeron de una página web hace semanas.

## Controles de Seguridad

### Aislamiento de Navegador por Agente

Cada agente obtiene su propio perfil de navegador. Esto significa:

- Sin cookies compartidas entre agentes
- Sin almacenamiento local ni almacenamiento de sesión compartido
- Sin acceso a cookies o sesiones del navegador del host
- Autocompletado de credenciales deshabilitado por defecto
- Las extensiones del navegador no se cargan

### Integración de Hooks de Política

Todas las acciones del navegador pasan por los hooks de política estándar:

| Hook                 | Cuándo se Dispara                          | Qué Verifica                                                  |
| -------------------- | ------------------------------------------ | ------------------------------------------------------------- |
| `PRE_TOOL_CALL`      | Antes de cada acción del navegador         | Lista de dominios, política de URL, permisos de acción        |
| `POST_TOOL_RESPONSE` | Después de que el navegador devuelve datos | Clasificar respuesta, actualizar taint de sesión, crear linaje |
| `PRE_OUTPUT`         | Cuando contenido del navegador sale del sistema | Verificación de clasificación contra destino               |

### Límites de Recursos

- El timeout de navegación evita que el navegador se cuelgue indefinidamente
- Los límites de tamaño de carga de página evitan consumo excesivo de memoria
- Se aplican límites de pestañas concurrentes por agente

## Controles Empresariales

Los despliegues empresariales tienen controles adicionales de automatización del
navegador:

| Control                            | Descripción                                                                  |
| ---------------------------------- | ---------------------------------------------------------------------------- |
| Clasificación a nivel de dominio   | Los dominios de intranet se clasifican automáticamente como `INTERNAL`       |
| Lista de dominios bloqueados       | Lista administrada de dominios prohibidos                                    |
| Política de retención de capturas  | Cuánto tiempo se almacenan las capturas capturadas                           |
| Registro de auditoría de sesión    | Registro completo de todas las acciones del navegador para cumplimiento      |
| Deshabilitar automatización        | El admin puede deshabilitar la herramienta de navegador para agentes o roles |

## Ejemplo: Flujo de Trabajo de Investigación Web

Un flujo de trabajo típico del agente usando automatización del navegador:

```
1. Usuario:  "Investiga los precios de la competencia en example-competitor.com"

2. Agente:   browser.navigate("https://example-competitor.com/pricing")
             -> PRE_TOOL_CALL: dominio "example-competitor.com" verificado contra lista
             -> Permitido, clasificado como PUBLIC
             -> Navegación procede

3. Agente:   browser.snapshot()
             -> Captura tomada, clasificada al nivel de taint de sesión (PUBLIC)

4. Agente:   browser.evaluate("document.querySelector('.pricing-table').innerText")
             -> Texto extraído, clasificado como PUBLIC
             -> Registro de linaje creado: source=example-competitor.com/pricing

5. Agente:   Resume la información de precios y la devuelve al usuario
             -> PRE_OUTPUT: datos PUBLIC al canal del usuario -- PERMITIDO
```

Cada paso se registra, clasifica y es auditable.
