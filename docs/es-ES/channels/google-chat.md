# Google Chat

<ComingSoon />

Conecte su agente Triggerfish a Google Chat para que los equipos que utilizan
Google Workspace puedan interactuar con él directamente desde su interfaz de
chat. El adaptador utilizará la API de Google Chat con credenciales de cuenta de
servicio u OAuth.

## Funciones previstas

- Soporte de mensajes directos y espacios (salas)
- Verificación de propietario a través del directorio de Google Workspace
- Indicadores de escritura
- Fragmentación de mensajes para respuestas largas
- Aplicación de clasificación consistente con otros canales

## Configuración (prevista)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

Consulte [Google Workspace](/es-ES/integrations/google-workspace) para la
integración de Google existente que cubre Gmail, Calendar, Tasks, Drive y
Sheets.
