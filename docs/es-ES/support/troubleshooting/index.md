# Solución de problemas

Comience aquí cuando algo no funcione. Siga los pasos en orden.

## Primeros pasos

### 1. Compruebe si el daemon está en ejecución

```bash
triggerfish status
```

Si el daemon no está en ejecución, inícielo:

```bash
triggerfish start
```

### 2. Compruebe los registros

```bash
triggerfish logs
```

Esto muestra el fichero de registro en tiempo real. Utilice un filtro de nivel para reducir el ruido:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Ejecute diagnósticos

```bash
triggerfish patrol
```

Patrol comprueba si el gateway es accesible, si el proveedor LLM responde, si los canales están conectados, si las reglas de política están cargadas y si las skills están descubiertas. Cualquier comprobación marcada como `CRITICAL` o `WARNING` le indica dónde centrar la atención.

### 4. Valide su configuración

```bash
triggerfish config validate
```

Esto analiza `triggerfish.yaml`, comprueba los campos obligatorios, valida los niveles de clasificación y resuelve las referencias de secretos.

## Solución de problemas por área

Si los primeros pasos anteriores no le han señalado el problema, seleccione el área que coincida con sus síntomas:

- [Instalación](/es-ES/support/troubleshooting/installation) - fallos del script de instalación, problemas al compilar desde el código fuente, problemas de plataforma
- [Daemon](/es-ES/support/troubleshooting/daemon) - el servicio no se inicia, conflictos de puertos, errores de "ya en ejecución"
- [Configuración](/es-ES/support/troubleshooting/configuration) - errores de análisis YAML, campos ausentes, fallos de resolución de secretos
- [Canales](/es-ES/support/troubleshooting/channels) - el bot no responde, fallos de autenticación, problemas de entrega de mensajes
- [Proveedores LLM](/es-ES/support/troubleshooting/providers) - errores de API, modelo no encontrado, fallos de streaming
- [Integraciones](/es-ES/support/troubleshooting/integrations) - OAuth de Google, PAT de GitHub, API de Notion, CalDAV, servidores MCP
- [Automatización del navegador](/es-ES/support/troubleshooting/browser) - Chrome no encontrado, fallos de inicio, navegación bloqueada
- [Seguridad y clasificación](/es-ES/support/troubleshooting/security) - bloqueos de write-down, problemas de taint, SSRF, denegaciones de política
- [Secretos y credenciales](/es-ES/support/troubleshooting/secrets) - errores de llavero, almacén de ficheros cifrados, problemas de permisos

## ¿Sigue atascado?

Si ninguna de las guías anteriores ha resuelto su problema:

1. Recopile un [paquete de registros](/es-ES/support/guides/collecting-logs)
2. Lea la [guía para reportar issues](/es-ES/support/guides/filing-issues)
3. Abra un issue en [GitHub](https://github.com/greghavens/triggerfish/issues/new)
