# Almacenamiento

Todos los datos con estado en Triggerfish fluyen a través de una abstracción
unificada `StorageProvider`. Ningún módulo crea su propio mecanismo de
almacenamiento: cada componente que necesita persistencia toma un
`StorageProvider` como dependencia. Este diseño hace que los backends sean
intercambiables sin tocar la lógica de negocio y mantiene todas las pruebas
rápidas y deterministas.

## Interfaz StorageProvider

```typescript
interface StorageProvider {
  /** Recuperar un valor por clave. Devuelve null si no se encuentra. */
  get(key: string): Promise<StorageValue | null>;

  /** Almacenar un valor en una clave. Sobrescribe cualquier valor existente. */
  set(key: string, value: StorageValue): Promise<void>;

  /** Eliminar una clave. No hace nada si la clave no existe. */
  delete(key: string): Promise<void>;

  /** Listar todas las claves que coincidan con un prefijo opcional. */
  list(prefix?: string): Promise<string[]>;

  /** Eliminar todas las claves. Usar con precaución. */
  clear(): Promise<void>;
}
```

::: info `StorageValue` es una cadena de texto. Todos los datos estructurados
(sesiones, registros de linaje, configuración) se serializan a JSON antes de
almacenarse y se deserializan al leer. Esto mantiene la interfaz simple e
independiente del backend. :::

## Implementaciones

| Backend                 | Caso de uso                  | Persistencia                                       | Configuración                    |
| ----------------------- | ---------------------------- | -------------------------------------------------- | -------------------------------- |
| `MemoryStorageProvider` | Pruebas, sesiones efímeras   | Ninguna (se pierde al reiniciar)                   | No necesita configuración        |
| `SqliteStorageProvider` | Predeterminado para nivel personal | SQLite WAL en `~/.triggerfish/data/triggerfish.db` | Sin configuración necesaria      |
| Backends empresariales  | Nivel empresarial            | Gestionado por el cliente                          | Postgres, S3 u otros backends    |

### MemoryStorageProvider

Utilizado en todas las pruebas por su velocidad y determinismo. Los datos
existen solo en memoria y se pierden cuando el proceso termina. Cada suite de
pruebas crea un `MemoryStorageProvider` nuevo, asegurando que las pruebas están
aisladas y son reproducibles.

### SqliteStorageProvider

El predeterminado para despliegues de nivel personal. Utiliza SQLite en modo WAL
(Write-Ahead Logging) para acceso de lectura concurrente y seguridad ante
fallos. La base de datos se encuentra en:

```
~/.triggerfish/data/triggerfish.db
```

SQLite no requiere configuración, ni proceso de servidor, ni red. Un único
archivo almacena todo el estado de Triggerfish. El paquete `@db/sqlite` de Deno
proporciona el enlace, que requiere el permiso `--allow-ffi`.

::: tip El modo WAL de SQLite permite que múltiples lectores accedan a la base
de datos de forma concurrente con un único escritor. Esto es importante para el
Gateway, que puede leer el estado de la sesión mientras el agente está
escribiendo resultados de herramientas. :::

### Backends empresariales

Los despliegues empresariales pueden conectar backends de almacenamiento
externos (Postgres, S3, etc.) sin cambios en el código. Cualquier
implementación de la interfaz `StorageProvider` funciona. El backend se
configura en `triggerfish.yaml`.

## Claves con espacio de nombres

Todas las claves en el sistema de almacenamiento tienen un espacio de nombres con
un prefijo que identifica el tipo de datos. Esto previene colisiones y permite
consultar, retener y purgar datos por categoría.

| Espacio de nombres | Patrón de clave                              | Descripción                                        |
| ------------------ | -------------------------------------------- | -------------------------------------------------- |
| `sessions:`        | `sessions:sess_abc123`                       | Estado de sesión (historial de conversación, metadatos) |
| `taint:`           | `taint:sess_abc123`                          | Nivel de taint de sesión                           |
| `lineage:`         | `lineage:lin_789xyz`                         | Registros de linaje de datos (seguimiento de procedencia) |
| `audit:`           | `audit:2025-01-29T10:23:45Z:hook_pre_output` | Entradas de registro de auditoría                  |
| `cron:`            | `cron:job_daily_report`                      | Estado de trabajos cron e historial de ejecución   |
| `notifications:`   | `notifications:notif_456`                    | Cola de notificaciones                             |
| `exec:`            | `exec:run_789`                               | Historial del entorno de ejecución del agente      |
| `skills:`          | `skills:skill_weather`                       | Metadatos de skills instaladas                     |
| `config:`          | `config:v3`                                  | Instantáneas de configuración                      |

## Políticas de retención

Cada espacio de nombres tiene una política de retención predeterminada. Los
despliegues empresariales pueden personalizarlas.

| Espacio de nombres | Retención predeterminada      | Justificación                                     |
| ------------------ | ----------------------------- | ------------------------------------------------- |
| `sessions:`        | 30 días                       | El historial de conversación caduca               |
| `taint:`           | Coincide con la de sesión     | El taint no tiene sentido sin su sesión            |
| `lineage:`         | 90 días                       | Impulsado por cumplimiento, pista de auditoría     |
| `audit:`           | 1 año                         | Impulsado por cumplimiento, legal y regulatorio    |
| `cron:`            | 30 días                       | Historial de ejecución para depuración             |
| `notifications:`   | Hasta entrega + 7 días        | Las notificaciones no entregadas deben persistir   |
| `exec:`            | 30 días                       | Artefactos de ejecución para depuración            |
| `skills:`          | Permanente                    | Los metadatos de skills instaladas no deben caducar |
| `config:`          | 10 versiones                  | Historial de configuración rotativo para reversión  |

## Principios de diseño

### Todos los módulos usan StorageProvider

Ningún módulo en Triggerfish crea su propio mecanismo de almacenamiento. Gestión
de sesiones, seguimiento de taint, registro de linaje, registro de auditoría,
estado cron, colas de notificaciones, historial de ejecución y configuración:
todo fluye a través de `StorageProvider`.

Esto significa:

- Intercambiar backends requiere cambiar un único punto de inyección de
  dependencias
- Las pruebas usan `MemoryStorageProvider` para velocidad: sin configuración de
  SQLite, sin sistema de archivos
- Hay exactamente un lugar para implementar cifrado en reposo, copias de
  seguridad o replicación

### Serialización

Todos los datos estructurados se serializan a cadenas JSON antes del
almacenamiento. La capa de serialización/deserialización gestiona:

- Objetos `Date` (serializados como cadenas ISO 8601 vía `toISOString()`,
  deserializados vía `new Date()`)
- Tipos branded (serializados como su valor de cadena subyacente)
- Objetos anidados y arrays

```typescript
// Almacenar una sesión
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// Recuperar una sesión
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Restaurar Date
}
```

### Inmutabilidad

Las operaciones de sesión son inmutables. Leer una sesión, modificarla y
escribirla de vuelta siempre produce un nuevo objeto. Las funciones nunca mutan
el objeto almacenado en su lugar. Esto se alinea con el principio más amplio de
Triggerfish de que las funciones devuelven nuevos objetos y nunca mutan.

## Estructura de directorios

```
~/.triggerfish/
  config/          # Configuración del agente, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Entorno de ejecución del agente
    <agent-id>/    # Workspace por agente (persiste)
    background/    # Workspaces de sesiones en segundo plano
  skills/          # Skills instaladas
  logs/            # Registros de auditoría
  secrets/         # Almacén de credenciales cifradas
```

::: warning SEGURIDAD El directorio `secrets/` contiene credenciales cifradas
gestionadas por la integración con el llavero del SO. Nunca almacene secretos en
archivos de configuración ni en el `StorageProvider`. Utilice el llavero del SO
(nivel personal) o la integración con vault (nivel empresarial). :::
