# Solución de problemas: Seguridad y clasificación

## Bloqueos de write-down

### "Write-down blocked"

Este es el error de seguridad más común. Significa que los datos están intentando fluir de un nivel de clasificación superior a uno inferior.

**Ejemplo:** Su sesión accedió a datos CONFIDENTIAL (leyó un fichero clasificado, consultó una base de datos clasificada). El taint de la sesión es ahora CONFIDENTIAL. Luego intentó enviar la respuesta a un canal WebChat PUBLIC. El motor de políticas lo bloquea porque los datos CONFIDENTIAL no pueden fluir a destinos PUBLIC.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**Cómo resolver:**
1. **Inicie una nueva sesión.** Una sesión nueva comienza con taint PUBLIC. Utilice una conversación nueva.
2. **Utilice un canal con clasificación superior.** Envíe la respuesta a través de un canal clasificado como CONFIDENTIAL o superior.
3. **Comprenda qué causó el taint.** Compruebe los registros para las entradas "Taint escalation" y vea qué llamada a herramienta elevó la clasificación de la sesión.

### "Session taint cannot flow to channel"

Igual que write-down, pero específicamente sobre la clasificación del canal:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### "Integration write-down blocked"

Las llamadas a herramientas de integraciones clasificadas también aplican write-down:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

Espere, esto parece al revés. El taint de la sesión es superior a la clasificación de la herramienta. Esto significa que la sesión está demasiado contaminada para usar una herramienta de clasificación inferior. La preocupación es que llamar a la herramienta podría filtrar contexto clasificado a un sistema menos seguro.

### "Workspace write-down blocked"

Los espacios de trabajo del agente tienen clasificación por directorio. Escribir en un directorio de clasificación inferior desde una sesión con taint superior está bloqueado:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Escalada de taint

### "Taint escalation"

Esto es informativo, no un error. Significa que el nivel de clasificación de la sesión acaba de aumentar porque el agente accedió a datos clasificados.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

El taint solo sube, nunca baja. Una vez que una sesión tiene taint CONFIDENTIAL, permanece así durante el resto de la sesión.

### "Resource-based taint escalation firing"

Una llamada a herramienta accedió a un recurso con una clasificación superior al taint actual de la sesión. El taint de la sesión se escala automáticamente para coincidir.

### "Non-owner taint applied"

Los usuarios no propietarios pueden tener sus sesiones contaminadas según la clasificación del canal o los permisos del usuario. Esto es independiente del taint basado en recursos.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

Todas las peticiones HTTP salientes (web_fetch, navegación del navegador, conexiones MCP SSE) pasan por la protección SSRF. Si el nombre de host de destino se resuelve a una dirección IP privada, la petición se bloquea.

**Rangos bloqueados:**
- `127.0.0.0/8` (loopback)
- `10.0.0.0/8` (privado)
- `172.16.0.0/12` (privado)
- `192.168.0.0/16` (privado)
- `169.254.0.0/16` (link-local)
- `0.0.0.0/8` (no especificado)
- `::1` (loopback IPv6)
- `fc00::/7` (ULA IPv6)
- `fe80::/10` (link-local IPv6)

Esta protección está codificada y no puede desactivarse ni configurarse. Previene que el agente de IA sea engañado para acceder a servicios internos.

**IPv4 mapeada a IPv6:** Las direcciones como `::ffff:127.0.0.1` se detectan y bloquean.

### "SSRF check blocked outbound request"

Igual que el anterior, pero registrado desde la herramienta web_fetch en lugar del módulo SSRF.

### Fallos de resolución DNS

```
DNS resolution failed for hostname
No DNS records found for hostname
```

El nombre de host no pudo resolverse. Compruebe:
- La URL está escrita correctamente
- Su servidor DNS es accesible
- El dominio realmente existe

---

## Motor de políticas

### "Hook evaluation failed, defaulting to BLOCK"

Un hook de política lanzó una excepción durante la evaluación. Cuando esto ocurre, la acción por defecto es BLOCK (denegar). Este es el comportamiento seguro por defecto.

Compruebe los registros para ver la excepción completa. Probablemente indica un error en una regla de política personalizada.

### "Policy rule blocked action"

Una regla de política denegó explícitamente la acción. La entrada de registro incluye qué regla se activó y por qué. Compruebe la sección `policy.rules` de su configuración para ver qué reglas están definidas.

### "Tool floor violation"

Se llamó a una herramienta que requiere un nivel mínimo de clasificación, pero la sesión está por debajo de ese nivel.

**Ejemplo:** La herramienta healthcheck requiere como mínimo clasificación INTERNAL (porque revela internos del sistema). Si una sesión PUBLIC intenta usarla, la llamada se bloquea.

---

## Seguridad de plugins y skills

### "Plugin network access blocked"

Los plugins se ejecutan en un sandbox con acceso de red restringido. Solo pueden acceder a URLs en su dominio de endpoint declarado.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

El plugin intentó acceder a una URL que no está en sus endpoints declarados, o la URL se resolvió a una IP privada.

### "Skill activation blocked by classification ceiling"

Las skills declaran un `classification_ceiling` en el frontmatter de su SKILL.md. Si el techo está por debajo del nivel de taint de la sesión, la skill no puede activarse:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

Esto evita que una skill de clasificación inferior sea expuesta a datos de clasificación superior.

### "Skill content integrity check failed"

Tras la instalación, Triggerfish genera un hash del contenido de la skill. Si el hash cambia (la skill fue modificada tras la instalación), la comprobación de integridad falla:

```
Skill content hash mismatch detected
```

Esto podría indicar manipulación. Reinstale la skill desde una fuente de confianza.

### "Skill install rejected by scanner"

El escáner de seguridad encontró contenido sospechoso en la skill. El escáner comprueba patrones que podrían indicar comportamiento malicioso. Las advertencias específicas se incluyen en el mensaje de error.

---

## Seguridad de sesiones

### "Session not found"

```
Session not found: <session-id>
```

La sesión solicitada no existe en el gestor de sesiones. Puede haber sido limpiada o el ID de sesión no es válido.

### "Session status access denied: taint exceeds caller"

Intentó ver el estado de una sesión, pero esa sesión tiene un nivel de taint superior al de su sesión actual. Esto evita que sesiones de clasificación inferior conozcan operaciones de clasificación superior.

### "Session history access denied"

Mismo concepto que el anterior, pero para ver el historial de conversación.

---

## Equipos de agentes

### "Team message delivery denied: team status is ..."

El equipo no está en estado `running`. Esto ocurre cuando:

- El equipo fue **disuelto** (manualmente o por el monitor de ciclo de vida)
- El equipo fue **pausado** porque la sesión del líder falló
- El equipo **agotó el tiempo** tras superar su límite de vida útil

Compruebe el estado actual del equipo con `team_status`. Si el equipo está pausado por fallo del líder, puede disolverlo con `team_disband` y crear uno nuevo.

### "Team member not found" / "Team member ... is not active"

El miembro objetivo no existe (nombre de rol incorrecto) o ha sido terminado. Los miembros se terminan cuando:

- Superan el tiempo de inactividad (2x `idle_timeout_seconds`)
- El equipo se disuelve
- Su sesión se bloquea y el monitor de ciclo de vida lo detecta

Utilice `team_status` para ver todos los miembros y su estado actual.

### "Team disband denied: only the lead or creating session can disband"

Solo dos sesiones pueden disolver un equipo:

1. La sesión que llamó originalmente a `team_create`
2. La sesión del miembro líder

Si recibe este error desde dentro del equipo, el miembro que llama no es el líder. Si lo recibe desde fuera del equipo, no es la sesión que lo creó.

### El líder del equipo falla inmediatamente tras la creación

La sesión del agente del líder no pudo completar su primer turno. Causas comunes:

1. **Error del proveedor LLM:** El proveedor devolvió un error (límite de tasa, fallo de autenticación, modelo no encontrado). Compruebe `triggerfish logs` para errores de proveedor.
2. **Techo de clasificación demasiado bajo:** Si el líder necesita herramientas clasificadas por encima de su techo, la sesión puede fallar en su primera llamada a herramienta.
3. **Herramientas ausentes:** El líder puede necesitar herramientas específicas para descomponer el trabajo. Asegúrese de que los perfiles de herramientas están configurados correctamente.

### Los miembros del equipo están inactivos y nunca producen salida

Los miembros esperan a que el líder les envíe trabajo mediante `sessions_send`. Si el líder no descompone la tarea:

- El modelo del líder puede no entender la coordinación de equipo. Pruebe un modelo más capaz para el rol de líder.
- La descripción de `task` puede ser demasiado vaga para que el líder la descomponga en subtareas.
- Compruebe `team_status` para ver si el líder está `active` y tiene actividad reciente.

### "Write-down blocked" entre miembros del equipo

Los miembros del equipo siguen las mismas reglas de clasificación que todas las sesiones. Si un miembro ha sido contaminado a `CONFIDENTIAL` e intenta enviar datos a un miembro en `PUBLIC`, la comprobación de write-down lo bloquea. Este es el comportamiento esperado: los datos clasificados no pueden fluir a sesiones de clasificación inferior, incluso dentro de un equipo.

---

## Delegación y multi-agente

### "Delegation certificate signature invalid"

La delegación de agentes utiliza certificados criptográficos. Si la comprobación de firma falla, la delegación se rechaza. Esto previene cadenas de delegación falsificadas.

### "Delegation certificate expired"

El certificado de delegación tiene un tiempo de vida. Si ha caducado, el agente delegado ya no puede actuar en nombre del delegador.

### "Delegation chain linkage broken"

En delegaciones de múltiples saltos (A delega a B, B delega a C), cada enlace de la cadena debe ser válido. Si algún enlace está roto, toda la cadena se rechaza.

---

## Webhooks

### "Webhook HMAC verification failed"

Los webhooks entrantes requieren firmas HMAC para la autenticación. Si la firma falta, está malformada o no coincide:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Compruebe que:
- El origen del webhook está enviando la cabecera de firma HMAC correcta
- El secreto compartido en su configuración coincide con el secreto del origen
- El formato de firma coincide (HMAC-SHA256 codificado en hexadecimal)

### "Webhook replay detected"

Triggerfish incluye protección contra repeticiones. Si una carga útil de webhook se recibe por segunda vez (misma firma), se rechaza.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

Demasiadas peticiones de webhook del mismo origen en un período corto. Esto protege contra inundaciones de webhooks. Espere e inténtelo de nuevo.

---

## Integridad de la auditoría

### "previousHash mismatch"

El registro de auditoría utiliza encadenamiento de hashes. Cada entrada incluye el hash de la entrada anterior. Si la cadena está rota, significa que el registro de auditoría fue manipulado o está corrupto.

### "HMAC mismatch"

La firma HMAC de la entrada de auditoría no coincide. La entrada puede haber sido modificada después de su creación.
