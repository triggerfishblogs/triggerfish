# Preguntas frecuentes

## Instalación

### ¿Cuáles son los requisitos del sistema?

Triggerfish funciona en macOS (Intel y Apple Silicon), Linux (x64 y arm64) y Windows (x64). El instalador binario se encarga de todo. Si compila desde el código fuente, necesita Deno 2.x.

Para despliegues con Docker, cualquier sistema que ejecute Docker o Podman es válido. La imagen del contenedor está basada en distroless Debian 12.

### ¿Dónde almacena Triggerfish sus datos?

Todo se encuentra en `~/.triggerfish/` por defecto:

```
~/.triggerfish/
  triggerfish.yaml          # Configuración
  SPINE.md                  # Identidad del agente
  TRIGGER.md                # Definición de comportamiento proactivo
  logs/                     # Ficheros de registro (rotados a 1 MB, 10 copias)
  data/triggerfish.db       # Base de datos SQLite (sesiones, memoria, estado)
  skills/                   # Skills instaladas
  backups/                  # Copias de seguridad con marca temporal
```

Los despliegues con Docker utilizan `/data` en su lugar. Puede modificar el directorio base con la variable de entorno `TRIGGERFISH_DATA_DIR`.

### ¿Puedo mover el directorio de datos?

Sí. Establezca la variable de entorno `TRIGGERFISH_DATA_DIR` con la ruta deseada antes de iniciar el daemon. Si utiliza systemd o launchd, deberá actualizar la definición del servicio (consulte [Notas de plataforma](/es-ES/support/guides/platform-notes)).

### El instalador indica que no puede escribir en `/usr/local/bin`

El instalador intenta primero `/usr/local/bin`. Si requiere acceso root, recurre a `~/.local/bin`. Si desea la ubicación del sistema, ejecute de nuevo con `sudo`:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### ¿Cómo desinstalo Triggerfish?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

Esto detiene el daemon, elimina la definición del servicio (unidad systemd o plist de launchd), borra el binario y elimina todo el directorio `~/.triggerfish/` incluyendo todos los datos.

---

## Configuración

### ¿Cómo cambio el proveedor LLM?

Edite `triggerfish.yaml` o utilice el CLI:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

El daemon se reinicia automáticamente tras los cambios de configuración.

### ¿Dónde se guardan las API keys?

Las API keys se almacenan en el llavero de su sistema operativo (Keychain de macOS, Secret Service de Linux o un fichero cifrado en Windows/Docker). Nunca coloque API keys sin cifrar en `triggerfish.yaml`. Utilice la sintaxis de referencia `secret:`:

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

### ¿Qué significa `secret:` en mi configuración?

Los valores con el prefijo `secret:` son referencias a su llavero del sistema operativo. Al iniciarse, Triggerfish resuelve cada referencia y la sustituye por el valor real del secreto en memoria. El secreto sin cifrar nunca aparece en `triggerfish.yaml` en disco. Consulte [Secretos y credenciales](/es-ES/support/troubleshooting/secrets) para detalles del backend por plataforma.

### ¿Qué es SPINE.md?

`SPINE.md` es el fichero de identidad de su agente. Define el nombre, misión, personalidad y directrices de comportamiento del agente. Considérelo como la base del prompt del sistema. El asistente de configuración (`triggerfish dive`) genera uno por usted, pero puede editarlo libremente.

### ¿Qué es TRIGGER.md?

`TRIGGER.md` define el comportamiento proactivo de su agente: qué debe comprobar, monitorizar y ejecutar durante los disparos programados de triggers. Sin un `TRIGGER.md`, los triggers se seguirán ejecutando pero el agente no tendrá instrucciones sobre qué hacer.

### ¿Cómo añado un nuevo canal?

```bash
triggerfish config add-channel telegram
```

Esto inicia un diálogo interactivo que le guía a través de los campos obligatorios (token del bot, ID del propietario, nivel de clasificación). También puede editar `triggerfish.yaml` directamente en la sección `channels:`.

### He cambiado mi configuración pero no ha ocurrido nada

El daemon debe reiniciarse para aplicar los cambios. Si utilizó `triggerfish config set`, se ofrece reiniciar automáticamente. Si editó el fichero YAML manualmente, reinicie con:

```bash
triggerfish stop && triggerfish start
```

---

## Canales

### ¿Por qué mi bot no responde a los mensajes?

Comience comprobando:

1. **¿Está el daemon en ejecución?** Ejecute `triggerfish status`
2. **¿Está el canal conectado?** Compruebe los registros: `triggerfish logs`
3. **¿Es válido el token del bot?** La mayoría de los canales fallan silenciosamente con tokens no válidos
4. **¿Es correcto el ID del propietario?** Si no se le reconoce como propietario, el bot puede restringir las respuestas

Consulte la guía de [Solución de problemas de canales](/es-ES/support/troubleshooting/channels) para listas de comprobación específicas de cada canal.

### ¿Qué es el ID del propietario y por qué es importante?

El ID del propietario indica a Triggerfish qué usuario en un canal determinado es usted (el operador). Los usuarios que no son propietarios obtienen acceso restringido a herramientas y pueden estar sujetos a límites de clasificación. Si deja el ID del propietario en blanco, el comportamiento varía según el canal. Algunos canales (como WhatsApp) tratarán a todos como propietario, lo cual supone un riesgo de seguridad.

### ¿Puedo utilizar varios canales simultáneamente?

Sí. Configure tantos canales como desee en `triggerfish.yaml`. Cada canal mantiene sus propias sesiones y nivel de clasificación. El router gestiona la entrega de mensajes a través de todos los canales conectados.

### ¿Cuáles son los límites de tamaño de los mensajes?

| Canal | Límite | Comportamiento |
|-------|--------|----------------|
| Telegram | 4.096 caracteres | Fragmentado automáticamente |
| Discord | 2.000 caracteres | Fragmentado automáticamente |
| Slack | 40.000 caracteres | Truncado (no fragmentado) |
| WhatsApp | 4.096 caracteres | Truncado |
| Email | Sin límite estricto | Mensaje completo enviado |
| WebChat | Sin límite estricto | Mensaje completo enviado |

### ¿Por qué se cortan los mensajes de Slack?

Slack tiene un límite de 40.000 caracteres. A diferencia de Telegram y Discord, Triggerfish trunca los mensajes de Slack en lugar de dividirlos en varios mensajes. Las respuestas muy largas (como salidas de código extensas) pueden perder contenido al final.

---

## Seguridad y clasificación

### ¿Cuáles son los niveles de clasificación?

Cuatro niveles, de menor a mayor sensibilidad:

1. **PUBLIC** - Sin restricciones en el flujo de datos
2. **INTERNAL** - Datos operacionales estándar
3. **CONFIDENTIAL** - Datos sensibles (credenciales, información personal, registros financieros)
4. **RESTRICTED** - Máxima sensibilidad (datos regulados, críticos para cumplimiento normativo)

Los datos solo pueden fluir de niveles inferiores a niveles iguales o superiores. Los datos CONFIDENTIAL nunca pueden llegar a un canal PUBLIC. Esta es la regla de "no write-down" y no puede anularse.

### ¿Qué significa "session taint"?

Cada sesión comienza en PUBLIC. Cuando el agente accede a datos clasificados (lee un fichero CONFIDENTIAL, consulta una base de datos RESTRICTED), el taint de la sesión se escala para coincidir. El taint solo sube, nunca baja. Una sesión con taint CONFIDENTIAL no puede enviar su salida a un canal PUBLIC.

### ¿Por qué recibo errores de "write-down blocked"?

Su sesión ha sido contaminada (tainted) a un nivel de clasificación superior al del destino. Por ejemplo, si accedió a datos CONFIDENTIAL y luego intentó enviar los resultados a un canal WebChat PUBLIC, el motor de políticas lo bloquea.

Esto funciona según lo previsto. Para resolverlo:
- Inicie una sesión nueva (nueva conversación)
- Utilice un canal clasificado al nivel del taint de su sesión o superior

### ¿Puedo desactivar la aplicación de clasificación?

No. El sistema de clasificación es un invariante de seguridad fundamental. Se ejecuta como código determinista por debajo de la capa del LLM y no puede eludirse, desactivarse ni ser influenciado por el agente. Esto es por diseño.

---

## Proveedores LLM

### ¿Qué proveedores están soportados?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI y modelos locales a través de Ollama o LM Studio.

### ¿Cómo funciona el failover?

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

Si el proveedor principal falla, Triggerfish prueba cada alternativa en orden. La sección `failover_config` controla el número de reintentos, el retardo y qué condiciones de error activan el failover.

### Mi proveedor devuelve errores 401 / 403

Su API key no es válida o ha caducado. Almacénela de nuevo:

```bash
triggerfish config set-secret provider:<nombre>:apiKey <su-clave>
```

Luego reinicie el daemon. Consulte [Solución de problemas de proveedores LLM](/es-ES/support/troubleshooting/providers) para orientación específica de cada proveedor.

### ¿Puedo utilizar diferentes modelos para diferentes niveles de clasificación?

Sí. Utilice la configuración `classification_models`:

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

Las sesiones con taint de un nivel específico utilizarán el modelo correspondiente. Los niveles sin anulación explícita recurren al modelo principal.

---

## Docker

### ¿Cómo ejecuto Triggerfish en Docker?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

Esto descarga el script envolvente de Docker y el fichero compose, descarga la imagen y ejecuta el asistente de configuración.

### ¿Dónde se almacenan los datos en Docker?

Todos los datos persistentes residen en un volumen con nombre de Docker (`triggerfish-data`) montado en `/data` dentro del contenedor. Esto incluye configuración, secretos, la base de datos SQLite, registros, skills y espacios de trabajo del agente.

### ¿Cómo funcionan los secretos en Docker?

Los contenedores Docker no pueden acceder al llavero del sistema operativo anfitrión. Triggerfish utiliza en su lugar un almacén de ficheros cifrados: `secrets.json` (valores cifrados) y `secrets.key` (clave de cifrado AES-256), ambos almacenados en el volumen `/data`. Trate el volumen como sensible.

### El contenedor no encuentra mi fichero de configuración

Asegúrese de haberlo montado correctamente:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Si el contenedor se inicia sin un fichero de configuración, mostrará un mensaje de ayuda y se detendrá.

### ¿Cómo actualizo la imagen Docker?

```bash
triggerfish update    # Si utiliza el script envolvente
# o
docker compose pull && docker compose up -d
```

---

## Skills y The Reef

### ¿Qué es una skill?

Una skill es una carpeta que contiene un fichero `SKILL.md` que proporciona al agente nuevas capacidades, contexto o directrices de comportamiento. Las skills pueden incluir definiciones de herramientas, código, plantillas e instrucciones.

### ¿Qué es The Reef?

The Reef es el mercado de skills de Triggerfish. Puede descubrir, instalar y publicar skills a través de él:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### ¿Por qué fue bloqueada mi skill por el escáner de seguridad?

Cada skill se analiza antes de su instalación. El escáner comprueba patrones sospechosos, permisos excesivos e infracciones del techo de clasificación. Si el techo de una skill está por debajo del taint actual de su sesión, la activación se bloquea para evitar un write-down.

### ¿Qué es un techo de clasificación en una skill?

Las skills declaran un nivel máximo de clasificación en el que pueden operar. Una skill con `classification_ceiling: INTERNAL` no puede activarse en una sesión con taint CONFIDENTIAL o superior. Esto evita que las skills accedan a datos por encima de su autorización.

---

## Triggers y programación

### ¿Qué son los triggers?

Los triggers son activaciones periódicas del agente para comportamiento proactivo. Usted define qué debe comprobar el agente en `TRIGGER.md`, y Triggerfish lo activa según un horario. El agente revisa sus instrucciones, ejecuta acciones (comprobar un calendario, monitorizar un servicio, enviar un recordatorio) y vuelve a dormir.

### ¿En qué se diferencian los triggers de los trabajos cron?

Los trabajos cron ejecutan una tarea fija según un horario. Los triggers activan al agente con su contexto completo (memoria, herramientas, acceso a canales) y le permiten decidir qué hacer basándose en las instrucciones de `TRIGGER.md`. Cron es mecánico; los triggers son agénticos.

### ¿Qué son las horas de silencio?

La configuración `quiet_hours` en `scheduler.trigger` evita que los triggers se disparen durante las horas especificadas:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### ¿Cómo funcionan los webhooks?

Los servicios externos pueden enviar peticiones POST al endpoint de webhook de Triggerfish para desencadenar acciones del agente. Cada origen de webhook requiere firma HMAC para la autenticación e incluye detección de repeticiones.

---

## Equipos de agentes

### ¿Qué son los equipos de agentes?

Los equipos de agentes son grupos persistentes de agentes que colaboran y trabajan juntos en tareas complejas. Cada miembro del equipo es una sesión de agente independiente con su propio rol, contexto de conversación y herramientas. Un miembro se designa como líder y coordina el trabajo. Consulte [Equipos de agentes](/es-ES/features/agent-teams) para la documentación completa.

### ¿En qué se diferencian los equipos de los subagentes?

Los subagentes son del tipo disparar y olvidar: se delega una única tarea y se espera el resultado. Los equipos son persistentes: los miembros se comunican entre sí mediante `sessions_send`, el líder coordina el trabajo y el equipo funciona de forma autónoma hasta que se disuelve o se agota el tiempo. Utilice subagentes para delegación específica; utilice equipos para colaboración compleja con múltiples roles.

### ¿Requieren los equipos de agentes un plan de pago?

Los equipos de agentes requieren el plan **Power** (149 $/mes) cuando se utiliza Triggerfish Gateway. Los usuarios de código abierto que ejecutan sus propias API keys tienen acceso completo: cada miembro del equipo consume inferencia de su proveedor LLM configurado.

### ¿Por qué mi líder de equipo falla inmediatamente?

La causa más común es un proveedor LLM mal configurado. Cada miembro del equipo genera su propia sesión de agente que necesita una conexión LLM funcional. Compruebe `triggerfish logs` para errores de proveedor alrededor del momento de creación del equipo. Consulte [Solución de problemas de equipos de agentes](/es-ES/support/troubleshooting/security#agent-teams) para más detalles.

### ¿Pueden los miembros del equipo utilizar diferentes modelos?

Sí. Cada definición de miembro acepta un campo opcional `model`. Si se omite, el miembro hereda el modelo del agente que lo creó. Esto le permite asignar modelos costosos a roles complejos y modelos más económicos a los sencillos.

### ¿Cuánto tiempo puede funcionar un equipo?

Por defecto, los equipos tienen una vida útil de 1 hora (`max_lifetime_seconds: 3600`). Al alcanzar el límite, el líder recibe un aviso de 60 segundos para producir la salida final, y luego el equipo se disuelve automáticamente. Puede configurar una vida útil más larga en el momento de la creación.

### ¿Qué ocurre si un miembro del equipo falla?

El monitor de ciclo de vida detecta los fallos de miembros en 30 segundos. Los miembros fallidos se marcan como `failed` y se notifica al líder para que continúe con los miembros restantes o disuelva el equipo. Si el propio líder falla, el equipo se pone en pausa y se notifica a la sesión que lo creó.

---

## Varios

### ¿Es Triggerfish de código abierto?

Sí, con licencia Apache 2.0. El código fuente completo, incluyendo todos los componentes críticos de seguridad, está disponible para auditoría en [GitHub](https://github.com/greghavens/triggerfish).

### ¿Triggerfish se comunica con servidores externos?

No. Triggerfish no realiza conexiones salientes excepto a los servicios que usted configura explícitamente (proveedores LLM, APIs de canales, integraciones). No hay telemetría, analíticas ni comprobación de actualizaciones a menos que ejecute `triggerfish update`.

### ¿Puedo ejecutar múltiples agentes?

Sí. La sección `agents` de la configuración define múltiples agentes, cada uno con su propio nombre, modelo, vinculaciones de canal, conjuntos de herramientas y techos de clasificación. El sistema de enrutamiento dirige los mensajes al agente apropiado.

### ¿Qué es el gateway?

El gateway es el plano de control WebSocket interno de Triggerfish. Gestiona sesiones, encamina mensajes entre canales y el agente, despacha herramientas y aplica políticas. La interfaz de chat del CLI se conecta al gateway para comunicarse con su agente.

### ¿Qué puertos utiliza Triggerfish?

| Puerto | Finalidad | Enlace |
|--------|-----------|--------|
| 18789 | Gateway WebSocket | solo localhost |
| 18790 | Tidepool A2UI | solo localhost |
| 8765 | WebChat (si está habilitado) | configurable |
| 8443 | Webhook de WhatsApp (si está habilitado) | configurable |

Todos los puertos por defecto se enlazan a localhost. Ninguno se expone a la red a menos que lo configure explícitamente o utilice un proxy inverso.
