# Entorno de Ejecución del Agente

El Entorno de Ejecución del Agente es la capacidad de autodesarrollo de
Triggerfish -- un espacio de trabajo de código de primera clase donde el agente
puede escribir código, ejecutarlo, observar la salida y los errores, corregir
problemas e iterar hasta que algo funcione. Esto es lo que permite al agente
construir integraciones, probar ideas y crear nuevas herramientas por su cuenta.

## No es el Sandbox de Plugin

El entorno de ejecución es fundamentalmente diferente del
[Sandbox de Plugin](./plugins). Entender la distinción es importante:

- El **Sandbox de Plugin** protege al sistema **DE** código de terceros no
  confiable
- El **Entorno de Ejecución** empodera al agente **PARA** escribir, ejecutar y
  depurar su propio código

El sandbox de plugin es defensivo. El entorno de ejecución es productivo. Sirven
propósitos opuestos y tienen perfiles de seguridad diferentes.

| Aspecto             | Sandbox de Plugin                     | Entorno de Ejecución del Agente          |
| ------------------- | ------------------------------------- | ---------------------------------------- |
| **Propósito**       | Proteger sistema DE código no confiable | Empoderar al agente PARA construir cosas |
| **Sistema de archivos** | Ninguno (totalmente aislado)      | Solo directorio del workspace            |
| **Red**             | Solo endpoints declarados             | Listas de permitir/denegar por política  |
| **Instalación de paquetes** | No permitido                  | Permitido (npm, pip, deno add)           |
| **Tiempo de ejecución** | Timeout estricto                  | Timeout generoso (configurable)          |
| **Iteración**       | Ejecución única                       | Ciclos ilimitados de escribir/ejecutar/corregir |
| **Persistencia**    | Efímero                               | El workspace persiste entre sesiones     |

## El Ciclo de Retroalimentación

El diferenciador principal de calidad. Este es el mismo patrón que hace
efectivas a herramientas como Claude Code -- un ciclo ajustado de
escribir/ejecutar/corregir donde el agente ve exactamente lo que vería un
desarrollador humano.

### Paso 1: Escribir

El agente crea o modifica archivos en su workspace usando `write_file`. El
workspace es un directorio real del sistema de archivos limitado al agente
actual.

### Paso 2: Ejecutar

El agente ejecuta el código vía `run_command`, recibiendo el stdout, stderr y
código de salida completos. Ninguna salida se oculta ni se resume. El agente ve
exactamente lo que ustedes verían en una terminal.

### Paso 3: Observar

El agente lee la salida completa. Si ocurrieron errores, ve la traza completa
del stack, los mensajes de error y la salida de diagnóstico. Si las pruebas
fallaron, ve cuáles pruebas fallaron y por qué.

### Paso 4: Corregir

El agente edita el código basándose en lo que observó, usando `write_file` o
`edit_file` para actualizar archivos específicos.

### Paso 5: Repetir

El agente ejecuta de nuevo. Este ciclo continúa hasta que el código funcione --
pasando pruebas, produciendo la salida correcta o logrando el objetivo
establecido.

### Paso 6: Persistir

Una vez que funciona, el agente puede guardar su trabajo como un
[skill](./skills) (SKILL.md + archivos de soporte), registrarlo como una
integración, conectarlo a un cron job o hacerlo disponible como herramienta.

::: tip El paso de persistir es lo que hace al entorno de ejecución más que un
bloc de notas. El código funcional no desaparece sin más -- el agente puede
empaquetarlo en un skill reutilizable que se ejecuta según un horario, responde
a triggers o se invoca bajo demanda. :::

## Herramientas Disponibles

| Herramienta      | Descripción                                              | Salida                                          |
| ---------------- | -------------------------------------------------------- | ----------------------------------------------- |
| `write_file`     | Escribir o sobrescribir un archivo en el workspace       | Ruta del archivo, bytes escritos                |
| `read_file`      | Leer contenidos de archivo del workspace                 | Contenidos del archivo como string              |
| `edit_file`      | Aplicar ediciones dirigidas a un archivo                 | Contenidos actualizados del archivo             |
| `run_command`    | Ejecutar un comando shell en el workspace                | stdout, stderr, código de salida, duración      |
| `list_directory` | Listar archivos en el workspace (recursivo opcional)     | Listado de archivos con tamaños                 |
| `search_files`   | Buscar contenidos de archivos (tipo grep)                | Líneas coincidentes con referencias archivo:línea |

## Estructura del Workspace

Cada agente obtiene un directorio de workspace aislado que persiste entre
sesiones:

```
~/.triggerfish/workspace/
  <agent-id>/                     # Workspace por agente
    scratch/                      # Archivos de trabajo temporales
    integrations/                 # Código de integración en desarrollo
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Skills en desarrollo
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Log de ejecución para auditoría
  background/
    <session-id>/                 # Workspace temporal para tareas en segundo plano
```

Los workspaces están aislados entre agentes. Un agente no puede acceder al
workspace de otro agente. Las tareas en segundo plano (cron jobs, triggers)
obtienen su propio workspace temporal limitado a la sesión.

## Flujo de Desarrollo de Integraciones

Cuando le piden al agente que construya una nueva integración (por ejemplo,
"conéctate a mi Notion y sincroniza las tareas"), el agente sigue un flujo de
trabajo de desarrollo natural:

1. **Explorar** -- Usa `run_command` para probar endpoints de API, verificar
   autenticación, entender las formas de respuesta
2. **Estructurar** -- Escribe código de integración usando `write_file`, crea
   un archivo de pruebas junto a él
3. **Probar** -- Ejecuta pruebas con `run_command`, ve los fallos, itera
4. **Instalar dependencias** -- Usa `run_command` para agregar paquetes
   requeridos (npm, pip, deno add)
5. **Iterar** -- Ciclo de escribir, ejecutar, corregir hasta que las pruebas
   pasen y la integración funcione de extremo a extremo
6. **Persistir** -- Guarda como skill (escribe SKILL.md con metadatos) o lo
   conecta a un cron job
7. **Aprobación** -- El skill autoría del agente entra en estado
   `PENDING_APPROVAL`; ustedes revisan y aprueban

## Soporte de Lenguajes y Runtimes

El entorno de ejecución se ejecuta en el sistema host (no en WASM), con acceso
a múltiples runtimes:

| Runtime | Disponible Vía                         | Caso de Uso                                 |
| ------- | -------------------------------------- | ------------------------------------------- |
| Deno    | Ejecución directa                     | TypeScript/JavaScript (primera clase)       |
| Node.js | `run_command node`                     | Acceso al ecosistema npm                    |
| Python  | `run_command python`                   | Ciencia de datos, ML, scripting             |
| Shell   | `run_command sh` / `run_command bash`  | Automatización del sistema, scripts de unión |

El agente puede detectar runtimes disponibles y elegir el mejor para la tarea.
La instalación de paquetes funciona vía la cadena de herramientas estándar de
cada runtime.

## Límites de Seguridad

El entorno de ejecución es más permisivo que el sandbox de plugin, pero sigue
controlado por política en cada paso.

### Integración con Políticas

- Cada llamada a `run_command` dispara el hook `PRE_TOOL_CALL` con el comando
  como contexto
- La lista de permitir/denegar de comandos se verifica antes de la ejecución
- La salida se captura y pasa por el hook `POST_TOOL_RESPONSE`
- Los endpoints de red accedidos durante la ejecución se rastrean vía linaje
- Si el código accede a datos clasificados (por ejemplo, lee de una API CRM),
  el taint de sesión escala
- El historial de ejecución se registra en `.exec_history` para auditoría

### Límites Estrictos

Estos límites nunca se cruzan, sin importar la configuración:

- No puede escribir fuera del directorio del workspace
- No puede ejecutar comandos en la lista de denegación (`rm -rf /`, `sudo`, etc.)
- No puede acceder a workspaces de otros agentes
- Todas las llamadas de red gobernadas por hooks de política
- Toda la salida clasificada y contribuye al taint de sesión
- Límites de recursos aplicados: espacio en disco, tiempo de CPU por ejecución,
  memoria

::: warning SEGURIDAD Cada comando que el agente ejecuta pasa por el hook
`PRE_TOOL_CALL`. El motor de políticas lo verifica contra la lista de
permitir/denegar de comandos antes de que comience la ejecución. Los comandos
peligrosos se bloquean determinísticamente -- el LLM no puede influir en esta
decisión. :::

### Controles Empresariales

Los administradores empresariales tienen controles adicionales sobre el entorno
de ejecución:

- **Deshabilitar exec completamente** para agentes o roles específicos
- **Restringir runtimes disponibles** (por ejemplo, permitir solo Deno, bloquear
  Python y shell)
- **Establecer límites de recursos** por agente (cuota de disco, tiempo de CPU,
  techo de memoria)
- **Requerir aprobación** para todas las operaciones de exec por encima de un
  umbral de clasificación
- **Lista de denegación de comandos personalizada** más allá de la lista
  predeterminada de comandos peligrosos
