# Solucion de Problemas

Comience aqui cuando algo no esta funcionando. Siga los pasos en orden.

## Primeros Pasos

### 1. Verifique si el daemon esta ejecutandose

```bash
triggerfish status
```

Si el daemon no esta ejecutandose, inicielo:

```bash
triggerfish start
```

### 2. Revise los logs

```bash
triggerfish logs
```

Esto muestra el archivo de log en tiempo real. Use un filtro de nivel para reducir el ruido:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Ejecute diagnosticos

```bash
triggerfish patrol
```

Patrol verifica si el gateway es alcanzable, si el proveedor LLM responde, si los canales estan conectados, si las reglas de politica estan cargadas y si los skills fueron descubiertos. Cualquier verificacion marcada como `CRITICAL` o `WARNING` le indica donde enfocarse.

### 4. Valide su configuracion

```bash
triggerfish config validate
```

Esto analiza `triggerfish.yaml`, verifica campos requeridos, valida niveles de clasificacion y resuelve referencias de secretos.

## Solucion de Problemas por Area

Si los primeros pasos anteriores no lo dirigieron al problema, elija el area que coincida con sus sintomas:

- [Instalacion](/es-419/support/troubleshooting/installation) - fallos del script de instalacion, problemas al compilar desde fuente, problemas de plataforma
- [Daemon](/es-419/support/troubleshooting/daemon) - el servicio no inicia, conflictos de puertos, errores de "ya esta ejecutandose"
- [Configuracion](/es-419/support/troubleshooting/configuration) - errores de YAML, campos faltantes, fallos de resolucion de secretos
- [Canales](/es-419/support/troubleshooting/channels) - bot no responde, fallos de autenticacion, problemas de entrega de mensajes
- [Proveedores LLM](/es-419/support/troubleshooting/providers) - errores de API, modelo no encontrado, fallos de streaming
- [Integraciones](/es-419/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, servidores MCP
- [Automatizacion de Navegador](/es-419/support/troubleshooting/browser) - Chrome no encontrado, fallos de inicio, navegacion bloqueada
- [Seguridad y Clasificacion](/es-419/support/troubleshooting/security) - bloqueos de write-down, problemas de taint, SSRF, denegaciones de politica
- [Secretos y Credenciales](/es-419/support/troubleshooting/secrets) - errores de keychain, almacen de archivos cifrados, problemas de permisos

## Aun Atascado?

Si ninguna de las guias anteriores resolvio su problema:

1. Recopile un [paquete de logs](/es-419/support/guides/collecting-logs)
2. Lea la [guia para reportar issues](/es-419/support/guides/filing-issues)
3. Abra un issue en [GitHub](https://github.com/greghavens/triggerfish/issues/new)
