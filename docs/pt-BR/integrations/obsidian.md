# Obsidian

Conecten su agente de Triggerfish a una o más bóvedas de
[Obsidian](https://obsidian.md/) para que pueda leer, crear y buscar sus notas.
La integración accede a las bóvedas directamente en el sistema de archivos -- no
se requiere la app de Obsidian ni ningún plugin.

## Qué Hace

La integración con Obsidian le da a su agente estas herramientas:

| Herramienta       | Descripción                                    |
| ----------------- | ---------------------------------------------- |
| `obsidian_read`   | Leer el contenido y frontmatter de una nota    |
| `obsidian_write`  | Crear o actualizar una nota                    |
| `obsidian_list`   | Listar notas en una carpeta                    |
| `obsidian_search` | Buscar contenido de notas                      |
| `obsidian_daily`  | Leer o crear la nota diaria de hoy             |
| `obsidian_links`  | Resolver wikilinks y encontrar backlinks       |
| `obsidian_delete` | Eliminar una nota                              |

## Configuración

### Paso 1: Conectar su Bóveda

```bash
triggerfish connect obsidian
```

Esto solicita la ruta de su bóveda y escribe la configuración. También pueden
configurarlo manualmente.

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

| Opción                  | Tipo     | Requerido | Descripción                                                    |
| ----------------------- | -------- | --------- | -------------------------------------------------------------- |
| `vaultPath`             | string   | Sí        | Ruta absoluta a la raíz de la bóveda de Obsidian               |
| `defaultClassification` | string   | No        | Clasificación predeterminada para notas (predeterminado: `INTERNAL`) |
| `excludeFolders`        | string[] | No        | Carpetas a ignorar (predeterminado: `.obsidian`, `.trash`)     |
| `folderClassifications` | object   | No        | Mapear rutas de carpetas a niveles de clasificación            |

### Múltiples Bóvedas

Pueden conectar múltiples bóvedas con diferentes niveles de clasificación:

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

## Clasificación Basada en Carpetas

Las notas heredan la clasificación de su carpeta. La carpeta más específica que
coincida gana:

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

El control de clasificación aplica: el agente solo puede leer notas cuyo nivel
de clasificación fluya al taint de sesión actual. Una sesión con taint `PUBLIC`
no puede acceder a notas `CONFIDENTIAL`.

## Seguridad

### Confinamiento de Ruta

Todas las operaciones de archivo están confinadas a la raíz de la bóveda. El
adaptador usa `Deno.realPath` para resolver enlaces simbólicos y prevenir
ataques de travesía de ruta. Cualquier intento de leer `../../etc/passwd` o
similar se bloquea antes de tocar el sistema de archivos.

### Verificación de Bóveda

El adaptador verifica que exista un directorio `.obsidian/` en la raíz de la
bóveda antes de aceptar la ruta. Esto asegura que estén apuntando a una bóveda
real de Obsidian, no a un directorio arbitrario.

### Aplicación de Clasificación

- Las notas llevan clasificación de su mapeo de carpeta
- Leer una nota `CONFIDENTIAL` escala el taint de sesión a `CONFIDENTIAL`
- La regla de no escritura descendente previene escribir contenido clasificado
  en carpetas de clasificación inferior
- Todas las operaciones de notas pasan por los hooks de política estándar

## Wikilinks

El adaptador entiende la sintaxis `[[wikilink]]` de Obsidian. La herramienta
`obsidian_links` resuelve wikilinks a rutas de archivo reales y encuentra todas
las notas que enlazan de vuelta a una nota dada (backlinks).

## Notas Diarias

La herramienta `obsidian_daily` lee o crea la nota diaria de hoy usando la
convención de carpeta de notas diarias de su bóveda. Si la nota no existe, crea
una con una plantilla predeterminada.

## Frontmatter

Las notas con frontmatter YAML se analizan automáticamente. Los campos de
frontmatter están disponibles como metadatos al leer notas. El adaptador
preserva el frontmatter al escribir o actualizar notas.
