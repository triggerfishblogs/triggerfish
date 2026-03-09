# Preguntas Frecuentes

## Instalacion

### Cuales son los requisitos del sistema?

Triggerfish se ejecuta en macOS (Intel y Apple Silicon), Linux (x64 y arm64) y Windows (x64). El instalador binario se encarga de todo. Si compila desde el codigo fuente, necesita Deno 2.x.

Para despliegues en Docker, cualquier sistema que ejecute Docker o Podman funciona. La imagen del contenedor esta basada en distroless Debian 12.

### Donde almacena sus datos Triggerfish?

Todo se encuentra en `~/.triggerfish/` por defecto:

```
~/.triggerfish/
  triggerfish.yaml          # Configuracion
  SPINE.md                  # Identidad del agente
  TRIGGER.md                # Definicion de comportamiento proactivo
  logs/                     # Archivos de log (rotacion a 1 MB, 10 respaldos)
  data/triggerfish.db       # Base de datos SQLite (sesiones, memoria, estado)
  skills/                   # Skills instalados
  backups/                  # Respaldos de configuracion con marca de tiempo
```

Los despliegues en Docker usan `/data` en su lugar. Puede anular el directorio base con la variable de entorno `TRIGGERFISH_DATA_DIR`.

### Puedo mover el directorio de datos?

Si. Establezca la variable de entorno `TRIGGERFISH_DATA_DIR` a la ruta deseada antes de iniciar el daemon. Si usa systemd o launchd, necesitara actualizar la definicion del servicio (vea [Notas de Plataforma](/pt-BR/support/guides/platform-notes)).

### El instalador dice que no puede escribir en `/usr/local/bin`

El instalador intenta `/usr/local/bin` primero. Si eso requiere acceso root, cambia a `~/.local/bin`. Si quiere la ubicacion global del sistema, vuelva a ejecutar con `sudo`:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Como desinstalo Triggerfish?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

Esto detiene el daemon, elimina la definicion del servicio (unidad systemd o plist de launchd), borra el binario y elimina todo el directorio `~/.triggerfish/` incluyendo todos los datos.

---

## Configuracion

### Como cambio el proveedor LLM?

Edite `triggerfish.yaml` o use el CLI:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

El daemon se reinicia automaticamente despues de cambios en la configuracion.

### Donde van las API keys?

Las API keys se almacenan en el keychain de su SO (macOS Keychain, Linux Secret Service, o un archivo cifrado en Windows/Docker). Nunca ponga API keys crudas en `triggerfish.yaml`. Use la sintaxis de referencia `secret:`:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

Almacene la clave real:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Que significa `secret:` en mi configuracion?

Los valores con prefijo `secret:` son referencias a su keychain del SO. Al iniciar, Triggerfish resuelve cada referencia y la reemplaza con el valor real del secreto en memoria. El secreto crudo nunca aparece en `triggerfish.yaml` en disco. Vea [Secretos y Credenciales](/pt-BR/support/troubleshooting/secrets) para detalles de backend por plataforma.

### Que es SPINE.md?

`SPINE.md` es el archivo de identidad de su agente. Define el nombre, mision, personalidad y directrices de comportamiento del agente. Piense en el como la base del system prompt. El asistente de configuracion (`triggerfish dive`) genera uno por usted, pero puede editarlo libremente.

### Que es TRIGGER.md?

`TRIGGER.md` define el comportamiento proactivo de su agente: que debe verificar, monitorear y actuar durante los despertares programados de triggers. Sin un `TRIGGER.md`, los triggers se activaran pero el agente no tendra instrucciones sobre que hacer.

### Como agrego un nuevo canal?

```bash
triggerfish config add-channel telegram
```

Esto inicia un prompt interactivo que lo guia a traves de los campos requeridos (token de bot, ID de propietario, nivel de clasificacion). Tambien puede editar `triggerfish.yaml` directamente en la seccion `channels:`.

### Cambie mi configuracion pero no paso nada

El daemon debe reiniciarse para tomar los cambios. Si uso `triggerfish config set`, ofrece reiniciar automaticamente. Si edito el archivo YAML manualmente, reinicie con:

```bash
triggerfish stop && triggerfish start
```

---

## Canales

### Por que mi bot no responde a los mensajes?

Comience verificando:

1. **El daemon esta ejecutandose?** Ejecute `triggerfish status`
2. **El canal esta conectado?** Revise los logs: `triggerfish logs`
3. **El token del bot es valido?** La mayoria de los canales fallan silenciosamente con tokens invalidos
4. **El ID de propietario es correcto?** Si no es reconocido como propietario, el bot puede restringir respuestas

Vea la guia de [Solucion de Problemas de Canales](/pt-BR/support/troubleshooting/channels) para listas de verificacion especificas por canal.

### Que es el ID de propietario y por que importa?

El ID de propietario le dice a Triggerfish cual usuario en un canal dado es usted (el operador). Los usuarios no propietarios obtienen acceso restringido a herramientas y pueden estar sujetos a limites de clasificacion. Si deja el ID de propietario en blanco, el comportamiento varia por canal. Algunos canales (como WhatsApp) trataran a todos como propietario, lo cual es un riesgo de seguridad.

### Puedo usar multiples canales al mismo tiempo?

Si. Configure tantos canales como quiera en `triggerfish.yaml`. Cada canal mantiene sus propias sesiones y nivel de clasificacion. El router maneja la entrega de mensajes a traves de todos los canales conectados.

### Cuales son los limites de tamano de mensaje?

| Canal | Limite | Comportamiento |
|-------|--------|----------------|
| Telegram | 4,096 caracteres | Dividido automaticamente |
| Discord | 2,000 caracteres | Dividido automaticamente |
| Slack | 40,000 caracteres | Truncado (no dividido) |
| WhatsApp | 4,096 caracteres | Truncado |
| Email | Sin limite duro | Mensaje completo enviado |
| WebChat | Sin limite duro | Mensaje completo enviado |

### Por que los mensajes de Slack se cortan?

Slack tiene un limite de 40,000 caracteres. A diferencia de Telegram y Discord, Triggerfish trunca los mensajes de Slack en lugar de dividirlos en multiples mensajes. Las respuestas muy largas (como salidas grandes de codigo) pueden perder contenido al final.

---

## Seguridad y Clasificacion

### Cuales son los niveles de clasificacion?

Cuatro niveles, de menor a mayor sensibilidad:

1. **PUBLIC** - Sin restricciones en el flujo de datos
2. **INTERNAL** - Datos operacionales estandar
3. **CONFIDENTIAL** - Datos sensibles (credenciales, informacion personal, registros financieros)
4. **RESTRICTED** - Mayor sensibilidad (datos regulados, criticos para cumplimiento)

Los datos solo pueden fluir de niveles inferiores a niveles iguales o superiores. Los datos CONFIDENTIAL nunca pueden llegar a un canal PUBLIC. Esta es la regla de "no write-down" y no puede anularse.

### Que significa "session taint"?

Cada sesion comienza en PUBLIC. Cuando el agente accede a datos clasificados (lee un archivo CONFIDENTIAL, consulta una base de datos RESTRICTED), el taint de la sesion escala para coincidir. El taint solo sube, nunca baja. Una sesion con taint CONFIDENTIAL no puede enviar su salida a un canal PUBLIC.

### Por que recibo errores de "write-down blocked"?

Su sesion ha sido marcada a un nivel de clasificacion mayor que el destino. Por ejemplo, si accedio a datos CONFIDENTIAL e intento enviar resultados a un canal WebChat PUBLIC, el motor de politicas lo bloquea.

Esto esta funcionando como se espera. Para resolverlo, puede:
- Iniciar una sesion nueva (nueva conversacion)
- Usar un canal clasificado al nivel o por encima del taint de su sesion

### Puedo deshabilitar el cumplimiento de clasificacion?

No. El sistema de clasificacion es un invariante de seguridad central. Se ejecuta como codigo deterministico debajo de la capa del LLM y no puede ser evadido, deshabilitado ni influenciado por el agente. Esto es por diseno.

---

## Proveedores LLM

### Que proveedores estan soportados?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI y modelos locales via Ollama o LM Studio.

### Como funciona el failover?

Configure una lista `failover` en `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Si el proveedor principal falla, Triggerfish intenta cada respaldo en orden. La seccion `failover_config` controla conteos de reintentos, retraso y que condiciones de error disparan el failover.

### Mi proveedor retorna errores 401 / 403

Su API key es invalida o ha expirado. Vuelva a almacenarla:

```bash
triggerfish config set-secret provider:<nombre>:apiKey <su-clave>
```

Luego reinicie el daemon. Vea [Solucion de Problemas de Proveedores LLM](/pt-BR/support/troubleshooting/providers) para orientacion especifica por proveedor.

### Puedo usar diferentes modelos para diferentes niveles de clasificacion?

Si. Use la configuracion `classification_models`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

Las sesiones con taint a un nivel especifico usaran el modelo correspondiente. Los niveles sin overrides explicitos usan el modelo principal.

---

## Docker

### Como ejecuto Triggerfish en Docker?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

Esto descarga el script wrapper de Docker y el archivo compose, descarga la imagen e inicia el asistente de configuracion.

### Donde se almacenan los datos en Docker?

Todos los datos persistentes viven en un volumen nombrado de Docker (`triggerfish-data`) montado en `/data` dentro del contenedor. Esto incluye configuracion, secretos, la base de datos SQLite, logs, skills y workspaces de agentes.

### Como funcionan los secretos en Docker?

Los contenedores Docker no pueden acceder al keychain del SO del host. Triggerfish usa un almacen de archivos cifrados en su lugar: `secrets.json` (valores cifrados) y `secrets.key` (clave de cifrado AES-256), ambos almacenados en el volumen `/data`. Trate el volumen como sensible.

### El contenedor no puede encontrar mi archivo de configuracion

Asegurese de montarlo correctamente:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Si el contenedor inicia sin un archivo de configuracion, imprimira un mensaje de ayuda y terminara.

### Como actualizo la imagen de Docker?

```bash
triggerfish update    # Si usa el script wrapper
# o
docker compose pull && docker compose up -d
```

---

## Skills y The Reef

### Que es un skill?

Un skill es una carpeta que contiene un archivo `SKILL.md` que le da al agente nuevas capacidades, contexto o directrices de comportamiento. Los skills pueden incluir definiciones de herramientas, codigo, plantillas e instrucciones.

### Que es The Reef?

The Reef es el marketplace de skills de Triggerfish. Puede descubrir, instalar y publicar skills a traves de el:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### Por que mi skill fue bloqueado por el escaner de seguridad?

Cada skill se escanea antes de la instalacion. El escaner verifica patrones sospechosos, permisos excesivos y violaciones del techo de clasificacion. Si el techo de un skill esta por debajo del taint actual de su sesion, la activacion se bloquea para prevenir write-down.

### Que es un techo de clasificacion en un skill?

Los skills declaran un nivel maximo de clasificacion al que pueden operar. Un skill con `classification_ceiling: INTERNAL` no puede activarse en una sesion con taint CONFIDENTIAL o superior. Esto previene que los skills accedan a datos por encima de su autorizacion.

---

## Triggers y Programacion

### Que son los triggers?

Los triggers son despertares periodicos del agente para comportamiento proactivo. Usted define lo que el agente debe verificar en `TRIGGER.md`, y Triggerfish lo despierta en un horario. El agente revisa sus instrucciones, toma accion (verificar un calendario, monitorear un servicio, enviar un recordatorio) y vuelve a dormir.

### Como se diferencian los triggers de los cron jobs?

Los cron jobs ejecutan una tarea fija en un horario. Los triggers despiertan al agente con su contexto completo (memoria, herramientas, acceso a canales) y lo dejan decidir que hacer basado en las instrucciones de `TRIGGER.md`. Cron es mecanico; los triggers son agentivos.

### Que son las horas de silencio?

La configuracion `quiet_hours` en `scheduler.trigger` previene que los triggers se activen durante horas especificadas:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Como funcionan los webhooks?

Los servicios externos pueden enviar POST al endpoint de webhook de Triggerfish para disparar acciones del agente. Cada fuente de webhook requiere firma HMAC para autenticacion e incluye deteccion de replay.

---

## Equipos de Agentes

### Que son los equipos de agentes?

Los equipos de agentes son grupos persistentes de agentes colaboradores que trabajan juntos en tareas complejas. Cada miembro del equipo es una sesion de agente separada con su propio rol, contexto de conversacion y herramientas. Un miembro se designa como lider y coordina el trabajo. Vea [Equipos de Agentes](/pt-BR/features/agent-teams) para documentacion completa.

### Como se diferencian los equipos de los sub-agentes?

Los sub-agentes son fire-and-forget: usted delega una sola tarea y espera el resultado. Los equipos son persistentes -- los miembros se comunican entre si via `sessions_send`, el lider coordina el trabajo y el equipo se ejecuta de forma autonoma hasta que se disuelve o expira. Use sub-agentes para delegacion enfocada; use equipos para colaboracion compleja de multiples roles.

### Los equipos de agentes requieren un plan de pago?

Los equipos de agentes requieren el plan **Power** ($149/mes) cuando se usa Triggerfish Gateway. Los usuarios de codigo abierto que ejecutan sus propias API keys tienen acceso completo -- cada miembro del equipo consume inferencia de su proveedor LLM configurado.

### Por que mi lider de equipo fallo inmediatamente?

La causa mas comun es un proveedor LLM mal configurado. Cada miembro del equipo genera su propia sesion de agente que necesita una conexion LLM funcional. Revise `triggerfish logs` para errores del proveedor alrededor del momento de la creacion del equipo. Vea [Solucion de Problemas de Equipos de Agentes](/pt-BR/support/troubleshooting/security#agent-teams) para mas detalles.

### Pueden los miembros del equipo usar diferentes modelos?

Si. Cada definicion de miembro acepta un campo `model` opcional. Si se omite, el miembro hereda el modelo del agente creador. Esto le permite asignar modelos costosos a roles complejos y modelos mas economicos a los simples.

### Cuanto tiempo puede ejecutarse un equipo?

Por defecto, los equipos tienen un tiempo de vida de 1 hora (`max_lifetime_seconds: 3600`). Cuando se alcanza el limite, el lider recibe una advertencia de 60 segundos para producir salida final, luego el equipo se disuelve automaticamente. Puede configurar un tiempo de vida mas largo al momento de la creacion.

### Que pasa si un miembro del equipo falla?

El monitor de ciclo de vida detecta fallos de miembros dentro de 30 segundos. Los miembros fallidos se marcan como `failed` y se notifica al lider para continuar con los miembros restantes o disolver. Si el lider mismo falla, el equipo se pausa y se notifica a la sesion creadora.

---

## Miscelaneo

### Triggerfish es de codigo abierto?

Si, con licencia Apache 2.0. El codigo fuente completo, incluyendo todos los componentes criticos de seguridad, esta disponible para auditoria en [GitHub](https://github.com/greghavens/triggerfish).

### Triggerfish se comunica con servidores externos?

No. Triggerfish no hace conexiones salientes excepto a los servicios que usted configura explicitamente (proveedores LLM, APIs de canales, integraciones). No hay telemetria, analitica ni verificacion de actualizaciones a menos que ejecute `triggerfish update`.

### Puedo ejecutar multiples agentes?

Si. La seccion de configuracion `agents` define multiples agentes, cada uno con su propio nombre, modelo, vinculos de canal, conjuntos de herramientas y techos de clasificacion. El sistema de enrutamiento dirige los mensajes al agente apropiado.

### Que es el gateway?

El gateway es el plano de control WebSocket interno de Triggerfish. Administra sesiones, enruta mensajes entre canales y el agente, despacha herramientas y aplica politicas. La interfaz de chat CLI se conecta al gateway para comunicarse con su agente.

### Que puertos usa Triggerfish?

| Puerto | Proposito | Enlace |
|--------|-----------|--------|
| 18789 | Gateway WebSocket | solo localhost |
| 18790 | Tidepool A2UI | solo localhost |
| 8765 | WebChat (si esta habilitado) | configurable |
| 8443 | Webhook de WhatsApp (si esta habilitado) | configurable |

Todos los puertos predeterminados se enlazan a localhost. Ninguno se expone a la red a menos que lo configure explicitamente o use un proxy reverso.
