# Automatización del navegador

Triggerfish proporciona control profundo del navegador a través de una instancia
de Chromium gestionada usando CDP (Chrome DevTools Protocol). El agente puede
navegar por la web, interactuar con páginas, rellenar formularios, capturar
capturas de pantalla y automatizar flujos de trabajo web -- todo bajo la
aplicación de políticas.

## Arquitectura

La automatización del navegador se basa en `puppeteer-core`, conectándose a una
instancia de Chromium gestionada vía CDP. Cada acción del navegador pasa por la
capa de políticas antes de llegar al navegador.

Triggerfish detecta automáticamente navegadores basados en Chromium incluyendo
**Google Chrome**, **Chromium** y **Brave**. La detección cubre las rutas de
instalación estándar en Linux, macOS, Windows y entornos Flatpak.

::: info La herramienta `browser_navigate` requiere URLs `http://` o `https://`.
Los esquemas internos del navegador (como `chrome://`, `brave://`, `about:`) no
están soportados y devolverán un error con indicaciones para usar una URL web.
:::

<img src="/diagrams/browser-automation-flow.svg" alt="Flujo de automatización del navegador: Agente -> Herramienta de navegador -> Capa de políticas -> CDP -> Chromium gestionado" style="max-width: 100%;" />

El perfil del navegador está aislado por agente. La instancia de Chromium
gestionada no comparte cookies, sesiones ni almacenamiento local con su
navegador personal. El autocompletado de credenciales está desactivado por
defecto.

## Acciones disponibles

| Acción     | Descripción                                              | Ejemplo de uso                                            |
| ---------- | -------------------------------------------------------- | --------------------------------------------------------- |
| `navigate` | Ir a una URL (sujeto a política de dominio)              | Abrir una página web para investigación                   |
| `snapshot` | Capturar una captura de pantalla de la página             | Documentar un estado de la interfaz, extraer información visual |
| `click`    | Hacer clic en un elemento de la página                    | Enviar un formulario, activar un botón                    |
| `type`     | Escribir texto en un campo de entrada                     | Rellenar un cuadro de búsqueda, completar un formulario   |
| `select`   | Seleccionar una opción de un desplegable                  | Elegir de un menú                                         |
| `upload`   | Subir un fichero a un formulario                          | Adjuntar un documento                                     |
| `evaluate` | Ejecutar JavaScript en el contexto de la página (sandbox) | Extraer datos, manipular el DOM                           |
| `wait`     | Esperar a un elemento o condición                         | Asegurar que la página ha cargado antes de interactuar    |

## Aplicación de política de dominios

Cada URL a la que el agente navega se comprueba contra una lista de dominios
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

### Cómo funciona la política de dominios

1. El agente llama a `browser.navigate("https://github.com/org/repo")`
2. Se activa el hook `PRE_TOOL_CALL` con la URL como contexto
3. El motor de políticas comprueba el dominio contra las listas de
   permitidos/denegados
4. Si está denegado o no está en la lista de permitidos, la navegación se
   **bloquea**
5. Si está permitido, se consulta la clasificación del dominio
6. La contaminación de sesión escala para coincidir con la clasificación del
   dominio
7. La navegación procede

::: warning SEGURIDAD Si un dominio no está en la lista de permitidos, la
navegación se bloquea por defecto. El LLM no puede anular la política de
dominios. Esto evita que el agente visite sitios web arbitrarios que puedan
exponer datos sensibles o desencadenar acciones no deseadas. :::

## Capturas de pantalla y clasificación

Las capturas de pantalla capturadas mediante `browser.snapshot` heredan el nivel
de contaminación actual de la sesión. Si la sesión está contaminada como
`CONFIDENTIAL`, todas las capturas de esa sesión se clasifican como
`CONFIDENTIAL`.

Esto importa para la política de salida. Una captura clasificada como
`CONFIDENTIAL` no puede enviarse a un canal `PUBLIC`. El hook `PRE_OUTPUT`
aplica esto en la frontera.

## Contenido extraído y linaje

Cuando el agente extrae contenido de una página web (mediante `evaluate`,
leyendo texto o analizando elementos), los datos extraídos:

- Se clasifican según el nivel de clasificación asignado al dominio
- Crean un registro de linaje rastreando la URL de origen, el momento de
  extracción y la clasificación
- Contribuyen a la contaminación de sesión (la contaminación escala para
  coincidir con la clasificación del contenido)

Este seguimiento de linaje significa que siempre puede rastrear de dónde
vinieron los datos, incluso si fueron extraídos de una página web hace semanas.

## Controles de seguridad

### Aislamiento del navegador por agente

Cada agente obtiene su propio perfil de navegador. Esto significa:

- Sin cookies compartidas entre agentes
- Sin almacenamiento local ni de sesión compartido
- Sin acceso a las cookies o sesiones del navegador del anfitrión
- Autocompletado de credenciales desactivado por defecto
- Las extensiones del navegador no se cargan

### Integración con hooks de política

Todas las acciones del navegador pasan por los hooks de política estándar:

| Hook                 | Cuándo se activa                              | Qué comprueba                                                        |
| -------------------- | --------------------------------------------- | -------------------------------------------------------------------- |
| `PRE_TOOL_CALL`      | Antes de cada acción del navegador             | Lista de dominios, política de URL, permisos de acción              |
| `POST_TOOL_RESPONSE` | Después de que el navegador devuelve datos      | Clasificar respuesta, actualizar contaminación, crear linaje         |
| `PRE_OUTPUT`         | Cuando el contenido del navegador sale del sistema | Comprobación de clasificación contra el destino                   |

### Límites de recursos

- Timeout de navegación evita que el navegador se quede colgado indefinidamente
- Límites de tamaño de carga de página evitan consumo excesivo de memoria
- Se aplican límites de pestañas simultáneas por agente

## Controles empresariales

Los despliegues empresariales tienen controles adicionales de automatización del
navegador:

| Control                               | Descripción                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| Clasificación a nivel de dominio      | Los dominios de intranet se clasifican automáticamente como `INTERNAL`                |
| Lista de dominios bloqueados          | Lista gestionada por admin de dominios prohibidos                                     |
| Política de retención de capturas     | Cuánto tiempo se almacenan las capturas capturadas                                     |
| Registro de auditoría de sesiones     | Registro completo de todas las acciones del navegador para cumplimiento               |
| Desactivar automatización             | El admin puede desactivar la herramienta del navegador completamente para agentes o roles específicos |

## Ejemplo: Flujo de trabajo de investigación web

Un flujo de trabajo típico del agente usando automatización del navegador:

```
1. Usuario: "Investiga los precios de la competencia en example-competitor.com"

2. Agente: browser.navigate("https://example-competitor.com/pricing")
          -> PRE_TOOL_CALL: dominio "example-competitor.com" comprobado contra lista de permitidos
          -> Permitido, clasificado como PUBLIC
          -> La navegación procede

3. Agente: browser.snapshot()
          -> Captura de pantalla capturada, clasificada al nivel de contaminación de la sesión (PUBLIC)

4. Agente: browser.evaluate("document.querySelector('.pricing-table').innerText")
          -> Texto extraído, clasificado como PUBLIC
          -> Registro de linaje creado: source=example-competitor.com/pricing

5. Agente: Resume la información de precios y la devuelve al usuario
          -> PRE_OUTPUT: datos PUBLIC al canal del usuario -- PERMITIDO
```

Cada paso se registra, clasifica y es auditable.
