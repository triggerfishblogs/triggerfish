# Obsidian

Conecte su agente de Triggerfish a una o más bóvedas (vaults) de [Obsidian](https://obsidian.md/) para que pueda leer, crear y buscar en sus notas. La integración accede a las bóvedas directamente en el sistema de archivos -- no se requiere la app de Obsidian ni ningún plugin.

## Qué hace

La integración con Obsidian proporciona a su agente estas herramientas:

| Herramienta       | Descripción                                 |
| ----------------- | ------------------------------------------- |
| `obsidian_read`   | Leer el contenido y frontmatter de una nota |
| `obsidian_write`  | Crear o actualizar una nota                 |
| `obsidian_list`   | Listar notas en una carpeta                 |
| `obsidian_search` | Buscar en el contenido de las notas         |
| `obsidian_daily`  | Leer o crear la nota diaria de hoy          |
| `obsidian_links`  | Resolver wikilinks y encontrar backlinks    |
| `obsidian_delete` | Eliminar una nota                           |

## Configuración

### Paso 1: Conectar su bóveda

```bash
triggerfish connect obsidian
```

Esto le pide la ruta de su bóveda y escribe la configuración. También puede configurarlo manualmente.

### Paso 2: Configurar en triggerfish.yaml

```yaml
obsidian:
  vaults:
    main:
      vaultPath: ~/Obsidian/MainVault
      defaultClassification: INTERNAL
      excludeFolders:
        - .obsidian
        - .trash
      folderClassifications:
        "Private/Health": CONFIDENTIAL
        "Private/Finance": RESTRICTED
        "Work": INTERNAL
        "Public": PUBLIC
```

| Opción                  | Tipo     | Obligatorio | Descripción                                                      |
| ----------------------- | -------- | ----------- | ---------------------------------------------------------------- |
| `vaultPath`             | string   | Sí          | Ruta absoluta a la raíz de la bóveda de Obsidian                 |
| `defaultClassification` | string   | No          | Clasificación predeterminada para las notas (predeterminado: `INTERNAL`) |
| `excludeFolders`        | string[] | No          | Carpetas a ignorar (predeterminado: `.obsidian`, `.trash`)       |
| `folderClassifications` | object   | No          | Mapeo de rutas de carpetas a niveles de clasificación            |

### Múltiples bóvedas

Puede conectar múltiples bóvedas con diferentes niveles de clasificación:

```yaml
obsidian:
  vaults:
    personal:
      vaultPath: ~/Obsidian/Personal
      defaultClassification: CONFIDENTIAL
    work:
      vaultPath: ~/Obsidian/Work
      defaultClassification: INTERNAL
    public:
      vaultPath: ~/Obsidian/PublicNotes
      defaultClassification: PUBLIC
```

## Clasificación basada en carpetas

Las notas heredan la clasificación de su carpeta. La carpeta coincidente más específica tiene prioridad:

```yaml
folderClassifications:
  "Private": CONFIDENTIAL
  "Private/Health": RESTRICTED
  "Work": INTERNAL
```

Con esta configuración:

- `Private/todo.md` es `CONFIDENTIAL`
- `Private/Health/records.md` es `RESTRICTED`
- `Work/project.md` es `INTERNAL`
- `notes.md` (raíz de la bóveda) usa `defaultClassification`

El control de clasificación se aplica: el agente solo puede leer notas cuyo nivel de clasificación fluya al taint de sesión actual. Una sesión con taint `PUBLIC` no puede acceder a notas `CONFIDENTIAL`.

## Seguridad

### Confinamiento de ruta

Todas las operaciones de archivos están confinadas a la raíz de la bóveda. El adaptador usa `Deno.realPath` para resolver enlaces simbólicos y prevenir ataques de travesía de ruta. Cualquier intento de leer `../../etc/passwd` o similar se bloquea antes de que se toque el sistema de archivos.

### Verificación de bóveda

El adaptador verifica que existe un directorio `.obsidian/` en la raíz de la bóveda antes de aceptar la ruta. Esto asegura que está apuntando a una bóveda real de Obsidian, no a un directorio arbitrario.

### Aplicación de clasificación

- Las notas llevan la clasificación del mapeo de su carpeta
- Leer una nota `CONFIDENTIAL` escala el taint de sesión a `CONFIDENTIAL`
- La regla de escritura descendente previene escribir contenido clasificado en carpetas de clasificación inferior
- Todas las operaciones con notas pasan por los hooks de políticas estándar

## Wikilinks

El adaptador entiende la sintaxis `[[wikilink]]` de Obsidian. La herramienta `obsidian_links` resuelve wikilinks a rutas de archivo reales y encuentra todas las notas que enlazan a una nota dada (backlinks).

## Notas diarias

La herramienta `obsidian_daily` lee o crea la nota diaria de hoy usando la convención de carpeta de notas diarias de su bóveda. Si la nota no existe, crea una con una plantilla predeterminada.

## Frontmatter

Las notas con frontmatter YAML se analizan automáticamente. Los campos del frontmatter están disponibles como metadatos al leer notas. El adaptador preserva el frontmatter al escribir o actualizar notas.
