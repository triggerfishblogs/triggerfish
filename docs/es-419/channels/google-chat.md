# Google Chat

<ComingSoon />

Conecten su agente de Triggerfish a Google Chat para que los equipos que usan
Google Workspace puedan interactuar con él directamente desde su interfaz de
chat. El adaptador utilizará la API de Google Chat con credenciales de cuenta de
servicio u OAuth.

## Características Planificadas

- Soporte de mensajes directos y espacios (salas)
- Verificación de propietario vía directorio de Google Workspace
- Indicadores de escritura
- División de mensajes para respuestas largas
- Aplicación de clasificación consistente con otros canales

## Configuración (Planificada)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

Consulten [Google Workspace](/es-419/integrations/google-workspace) para la
integración existente de Google que cubre Gmail, Calendar, Tasks, Drive y Sheets.
