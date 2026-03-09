# Entorno de ejecución del agente

El entorno de ejecución del agente es la capacidad de autodesarrollo de
Triggerfish -- un espacio de trabajo de código de primera clase donde el agente
puede escribir código, ejecutarlo, observar la salida y los errores, corregir
problemas e iterar hasta que algo funcione. Esto es lo que permite al agente
construir integraciones, probar ideas y crear nuevas herramientas por su cuenta.

## No es el sandbox de plugins

El entorno de ejecución es fundamentalmente diferente del
[sandbox de plugins](./plugins). Entender la distinción es importante:

- El **sandbox de plugins** protege al sistema **DE** código de terceros no
  confiable
- El **entorno de ejecución** habilita al agente **PARA** escribir, ejecutar y
  depurar su propio código

El sandbox de plugins es defensivo. El entorno de ejecución es productivo.
Sirven a propósitos opuestos y tienen diferentes perfiles de seguridad.

| Aspecto              | Sandbox de plugins                     | Entorno de ejecución del agente        |
| -------------------- | -------------------------------------- | -------------------------------------- |
| **Propósito**        | Proteger el sistema DE código no fiable| Habilitar al agente PARA construir     |
| **Sistema de ficheros** | Ninguno (completamente aislado)     | Solo directorio del espacio de trabajo |
| **Red**              | Solo endpoints declarados              | Listas de permitidos/denegados por política |
| **Instalación de paquetes** | No permitida                    | Permitida (npm, pip, deno add)         |
| **Tiempo de ejecución** | Timeout estricto                    | Timeout generoso (configurable)        |
| **Iteración**        | Ejecución única                        | Bucles ilimitados de escritura/ejecución/corrección |
| **Persistencia**     | Efímero                                | El espacio de trabajo persiste entre sesiones |

## El bucle de retroalimentación

El diferenciador principal de calidad. Este es el mismo patrón que hace
efectivas herramientas como Claude Code -- un ciclo ajustado de
escritura/ejecución/corrección donde el agente ve exactamente lo que vería un
desarrollador humano.

### Paso 1: Escribir

El agente crea o modifica ficheros en su espacio de trabajo usando `write_file`.
El espacio de trabajo es un directorio real del sistema de ficheros limitado al
agente actual.

### Paso 2: Ejecutar

El agente ejecuta el código mediante `run_command`, recibiendo la salida
completa de stdout, stderr y el código de salida. No se oculta ni resume ninguna
salida. El agente ve exactamente lo que usted vería en un terminal.

### Paso 3: Observar

El agente lee la salida completa. Si ocurrieron errores, ve la traza de pila
completa, los mensajes de error y la salida de diagnóstico. Si las pruebas
fallaron, ve cuáles y por qué.

### Paso 4: Corregir

El agente edita el código basándose en lo que observó, usando `write_file` o
`edit_file` para actualizar ficheros específicos.

### Paso 5: Repetir

El agente ejecuta de nuevo. Este bucle continúa hasta que el código funciona --
pasando pruebas, produciendo salida correcta o alcanzando el objetivo indicado.

### Paso 6: Persistir

Una vez que funciona, el agente puede guardar su trabajo como un
[skill](./skills) (SKILL.md + ficheros de soporte), registrarlo como una
integración, conectarlo a un cron job o hacerlo disponible como herramienta.

::: tip El paso de persistir es lo que hace del entorno de ejecución más que un
bloc de notas. El código que funciona no desaparece -- el agente puede
empaquetarlo en un skill reutilizable que se ejecuta por horario, responde a
triggers o se invoca bajo demanda. :::

## Herramientas disponibles

| Herramienta      | Descripción                                              | Salida                                        |
| ---------------- | -------------------------------------------------------- | --------------------------------------------- |
| `write_file`     | Escribir o sobrescribir un fichero en el espacio de trabajo | Ruta del fichero, bytes escritos             |
| `read_file`      | Leer contenido de un fichero del espacio de trabajo       | Contenido del fichero como cadena            |
| `edit_file`      | Aplicar ediciones dirigidas a un fichero                  | Contenido del fichero actualizado            |
| `run_command`    | Ejecutar un comando de shell en el espacio de trabajo     | stdout, stderr, código de salida, duración   |
| `list_directory` | Listar ficheros en el espacio de trabajo (recursivo opcional) | Lista de ficheros con tamaños             |
| `search_files`   | Buscar en contenido de ficheros (similar a grep)          | Líneas coincidentes con referencias fichero:línea |

## Estructura del espacio de trabajo

Cada agente obtiene un directorio de espacio de trabajo aislado que persiste
entre sesiones:

```
~/.triggerfish/workspace/
  <agent-id>/                     # Espacio de trabajo por agente
    scratch/                      # Ficheros de trabajo temporales
    integrations/                 # Código de integración en desarrollo
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Skills en proceso de creación
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Registro de ejecución para auditoría
  background/
    <session-id>/                 # Espacio de trabajo temporal para tareas en segundo plano
```

Los espacios de trabajo están aislados entre agentes. Un agente no puede acceder
al espacio de trabajo de otro agente. Las tareas en segundo plano (cron jobs,
triggers) obtienen su propio espacio de trabajo temporal limitado a la sesión.

## Flujo de desarrollo de integraciones

Cuando pide al agente que construya una nueva integración (por ejemplo,
"conéctate a mi Notion y sincroniza las tareas"), el agente sigue un flujo de
trabajo de desarrollo natural:

1. **Explorar** -- Usa `run_command` para probar endpoints de API, comprobar
   autenticación, entender las formas de respuesta
2. **Estructurar** -- Escribe código de integración usando `write_file`, crea un
   fichero de pruebas junto a él
3. **Probar** -- Ejecuta pruebas con `run_command`, ve los fallos, itera
4. **Instalar dependencias** -- Usa `run_command` para añadir paquetes
   necesarios (npm, pip, deno add)
5. **Iterar** -- Bucle de escritura, ejecución, corrección hasta que las pruebas
   pasen y la integración funcione de extremo a extremo
6. **Persistir** -- Guarda como skill (escribe SKILL.md con metadatos) o lo
   conecta a un cron job
7. **Aprobación** -- El skill autocreado entra en estado `PENDING_APPROVAL`;
   usted lo revisa y aprueba

## Soporte de lenguajes y entornos de ejecución

El entorno de ejecución se ejecuta en el sistema anfitrión (no en WASM), con
acceso a múltiples entornos de ejecución:

| Entorno | Disponible mediante                    | Caso de uso                                  |
| ------- | -------------------------------------- | -------------------------------------------- |
| Deno    | Ejecución directa                      | TypeScript/JavaScript (primera clase)        |
| Node.js | `run_command node`                     | Acceso al ecosistema npm                     |
| Python  | `run_command python`                   | Ciencia de datos, ML, scripting              |
| Shell   | `run_command sh` / `run_command bash`  | Automatización de sistemas, scripts de unión |

El agente puede detectar los entornos de ejecución disponibles y elegir el mejor
para la tarea. La instalación de paquetes funciona mediante la cadena de
herramientas estándar de cada entorno.

## Fronteras de seguridad

El entorno de ejecución es más permisivo que el sandbox de plugins, pero sigue
controlado por políticas en cada paso.

### Integración de políticas

- Cada llamada `run_command` activa el hook `PRE_TOOL_CALL` con el comando como
  contexto
- La lista de permitidos/denegados de comandos se comprueba antes de la ejecución
- La salida se captura y pasa por el hook `POST_TOOL_RESPONSE`
- Los endpoints de red accedidos durante la ejecución se rastrean mediante linaje
- Si el código accede a datos clasificados (por ejemplo, lee de una API CRM), la
  contaminación de sesión escala
- El historial de ejecución se registra en `.exec_history` para auditoría

### Fronteras estrictas

Estas fronteras nunca se cruzan, independientemente de la configuración:

- No puede escribir fuera del directorio del espacio de trabajo
- No puede ejecutar comandos en la lista de denegación (`rm -rf /`, `sudo`, etc.)
- No puede acceder a los espacios de trabajo de otros agentes
- Todas las llamadas de red gobernadas por hooks de política
- Toda la salida clasificada y contribuye a la contaminación de la sesión
- Límites de recursos aplicados: espacio en disco, tiempo de CPU por ejecución,
  memoria

::: warning SEGURIDAD Cada comando que el agente ejecuta pasa por el hook
`PRE_TOOL_CALL`. El motor de políticas lo comprueba contra la lista de
permitidos/denegados de comandos antes de que la ejecución comience. Los
comandos peligrosos se bloquean de forma determinista -- el LLM no puede influir
en esta decisión. :::

### Controles empresariales

Los administradores empresariales tienen controles adicionales sobre el entorno
de ejecución:

- **Desactivar exec completamente** para agentes o roles específicos
- **Restringir entornos de ejecución disponibles** (por ejemplo, permitir solo
  Deno, bloquear Python y shell)
- **Establecer límites de recursos** por agente (cuota de disco, tiempo de CPU,
  límite de memoria)
- **Requerir aprobación** para todas las operaciones exec por encima de un
  umbral de clasificación
- **Lista de denegación de comandos personalizada** más allá de la lista por
  defecto de comandos peligrosos
