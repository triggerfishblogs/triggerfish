# Almacenamiento

Todos los datos con estado en Triggerfish fluyen a través de una abstracción
unificada `StorageProvider`. Ningún módulo crea su propio mecanismo de
almacenamiento — cada componente que necesita persistencia recibe un
`StorageProvider` como dependencia. Este diseño hace que los backends sean
intercambiables sin modificar la lógica de negocio y mantiene todos los tests
rápidos y determinísticos.

## Interfaz de StorageProvider

```typescript
interface StorageProvider {
  /** Obtener un valor por clave. Devuelve null si no se encuentra. */
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

::: info `StorageValue` es un string. Todos los datos estructurados (sesiones,
registros de linaje, configuración) se serializan a JSON antes del
almacenamiento y se deserializan al leer. Esto mantiene la interfaz simple y
agnóstica del backend. :::

## Implementaciones

| Backend                 | Caso de uso                        | Persistencia                                       | Configuración                      |
| ----------------------- | ---------------------------------- | -------------------------------------------------- | ---------------------------------- |
| `MemoryStorageProvider` | Testing, sesiones efímeras         | Ninguna (se pierde al reiniciar)                   | Sin configuración necesaria        |
| `SqliteStorageProvider` | Predeterminado para nivel personal | SQLite WAL en `~/.triggerfish/data/triggerfish.db`  | Cero configuración                 |
| Backends empresariales  | Nivel empresarial                  | Gestionado por el cliente                          | Postgres, S3 u otros backends      |

### MemoryStorageProvider

Se usa en todos los tests por velocidad y determinismo. Los datos existen solo en
memoria y se pierden al terminar el proceso. Cada suite de tests crea un
`MemoryStorageProvider` nuevo, asegurando que los tests estén aislados y sean
reproducibles.

### SqliteStorageProvider

El predeterminado para despliegues de nivel personal. Usa SQLite en modo WAL
(Write-Ahead Logging) para acceso concurrente de lectura y seguridad ante
fallos. La base de datos se encuentra en:

```
~/.triggerfish/data/triggerfish.db
```

SQLite no requiere configuración, ni proceso de servidor, ni red. Un único
archivo almacena todo el estado de Triggerfish. El paquete `@db/sqlite` de Deno
proporciona el enlace, que requiere el permiso `--allow-ffi`.

::: tip El modo WAL de SQLite permite que múltiples lectores accedan a la base de
datos concurrentemente con un único escritor. Esto es importante para el
Gateway, que puede leer el estado de sesión mientras el agente está escribiendo
resultados de herramientas. :::

### Backends empresariales

Los despliegues empresariales pueden conectar backends de almacenamiento externos
(Postgres, S3, etc.) sin cambios de código. Cualquier implementación de la
interfaz `StorageProvider` funciona. El backend se configura en
`triggerfish.yaml`.

## Claves con espacio de nombres

Todas las claves en el sistema de almacenamiento tienen un espacio de nombres con
un prefijo que identifica el tipo de dato. Esto previene colisiones y permite
consultar, retener y purgar datos por categoría.

| Espacio de nombres | Patrón de clave                              | Descripción                                           |
| ------------------ | -------------------------------------------- | ----------------------------------------------------- |
| `sessions:`        | `sessions:sess_abc123`                       | Estado de sesión (historial de conversación, metadatos) |
| `taint:`           | `taint:sess_abc123`                          | Nivel de taint de sesión                              |
| `lineage:`         | `lineage:lin_789xyz`                         | Registros de linaje de datos (rastreo de procedencia) |
| `audit:`           | `audit:2025-01-29T10:23:45Z:hook_pre_output` | Entradas del registro de auditoría                    |
| `cron:`            | `cron:job_daily_report`                      | Estado e historial de ejecución de trabajos cron      |
| `notifications:`   | `notifications:notif_456`                    | Cola de notificaciones                                |
| `exec:`            | `exec:run_789`                               | Historial del entorno de ejecución del agente         |
| `skills:`          | `skills:skill_weather`                       | Metadatos de skills instalados                        |
| `config:`          | `config:v3`                                  | Instantáneas de configuración                         |

## Políticas de retención

Cada espacio de nombres tiene una política de retención predeterminada. Los
despliegues empresariales pueden personalizarlas.

| Espacio de nombres | Retención predeterminada       | Justificación                                           |
| ------------------ | ------------------------------ | ------------------------------------------------------- |
| `sessions:`        | 30 días                        | El historial de conversación caduca                     |
| `taint:`           | Coincide con retención de sesión | El taint no tiene sentido sin su sesión               |
| `lineage:`         | 90 días                        | Orientado al cumplimiento, pista de auditoría           |
| `audit:`           | 1 año                          | Orientado al cumplimiento, legal y regulatorio          |
| `cron:`            | 30 días                        | Historial de ejecución para depuración                  |
| `notifications:`   | Hasta entrega + 7 días         | Las notificaciones no entregadas deben persistir        |
| `exec:`            | 30 días                        | Artefactos de ejecución para depuración                 |
| `skills:`          | Permanente                     | Los metadatos de skills instalados no deben expirar     |
| `config:`          | 10 versiones                   | Historial rotativo de configuración para reversiones    |

## Principios de diseño

### Todos los módulos usan StorageProvider

Ningún módulo en Triggerfish crea su propio mecanismo de almacenamiento. Gestión
de sesiones, seguimiento de taint, registro de linaje, registro de auditoría,
estado de cron, colas de notificaciones, historial de ejecución y configuración —
todo fluye a través de `StorageProvider`.

Esto significa:

- Intercambiar backends requiere cambiar un único punto de inyección de dependencias
- Los tests usan `MemoryStorageProvider` por velocidad — sin configuración de SQLite, sin sistema de archivos
- Hay exactamente un lugar para implementar cifrado en reposo, respaldo o
  replicación

### Serialización

Todos los datos estructurados se serializan a cadenas JSON antes del
almacenamiento. La capa de serialización/deserialización maneja:

- Objetos `Date` (serializados como cadenas ISO 8601 vía `toISOString()`,
  deserializados vía `new Date()`)
- Tipos branded (serializados como su valor string subyacente)
- Objetos y arreglos anidados

```typescript
// Almacenando una sesión
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// Obteniendo una sesión
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Restaurar Date
}
```

### Inmutabilidad

Las operaciones de sesión son inmutables. Leer una sesión, modificarla y
escribirla de vuelta siempre produce un nuevo objeto. Las funciones nunca mutan
el objeto almacenado en su lugar. Esto se alinea con el principio general de
Triggerfish de que las funciones devuelven nuevos objetos y nunca mutan.

## Estructura de directorios

```
~/.triggerfish/
  config/          # Configuración del agente, SPINE.md, TRIGGER.md
  data/            # triggerfish.db (SQLite)
  workspace/       # Entorno de ejecución del agente
    <agent-id>/    # Espacio de trabajo por agente (persiste)
    background/    # Espacios de trabajo de sesiones en segundo plano
  skills/          # Skills instalados
  logs/            # Registros de auditoría
  secrets/         # Almacén de credenciales cifradas
```

::: warning SEGURIDAD El directorio `secrets/` contiene credenciales cifradas
gestionadas por la integración con el llavero del SO. Nunca almacene secretos en
archivos de configuración ni en el `StorageProvider`. Use el llavero del SO
(nivel personal) o la integración con vault (nivel empresarial). :::
