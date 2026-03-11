# Solución de problemas: seguridad y clasificación

## Bloqueos de write-down

### "Write-down blocked"

Este es el error de seguridad más común. Significa que los datos están intentando fluir de un nivel de clasificación más alto a uno más bajo.

**Ejemplo:** Tu sesión accedió a datos CONFIDENTIAL (leyó un archivo clasificado, consultó una base de datos clasificada). El taint de sesión ahora es CONFIDENTIAL. Luego intentaste enviar la respuesta a un canal WebChat PUBLIC. El motor de políticas bloquea esto porque los datos CONFIDENTIAL no pueden fluir a destinos PUBLIC.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**Cómo resolver:**
1. **Inicia una nueva sesión.** Una sesión nueva comienza con taint PUBLIC. Usa una conversación nueva.
2. **Usa un canal de clasificación más alta.** Envía la respuesta a través de un canal clasificado como CONFIDENTIAL o superior.
3. **Entiende qué causó el taint.** Revisa los logs en busca de entradas "Taint escalation" para ver qué llamada a herramienta elevó la clasificación de la sesión.

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

Espera, esto parece al revés. El taint de sesión es más alto que la clasificación de la herramienta. Esto significa que la sesión está demasiado contaminada para usar una herramienta de menor clasificación. La preocupación es que llamar a la herramienta podría filtrar contexto clasificado a un sistema menos seguro.

### "Workspace write-down blocked"

Los workspaces de agentes tienen clasificación por directorio. Escribir en un directorio de menor clasificación desde una sesión con mayor taint está bloqueado:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Escalamiento de taint

### "Taint escalation"

Esto es informativo, no un error. Significa que el nivel de clasificación de la sesión acaba de aumentar porque el agente accedió a datos clasificados.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

El taint solo sube, nunca baja. Una vez que una sesión está contaminada a CONFIDENTIAL, se mantiene así por el resto de la sesión.

### "Resource-based taint escalation firing"

Una llamada a herramienta accedió a un recurso con una clasificación más alta que el taint actual de la sesión. El taint de sesión se escala automáticamente para coincidir.

### "Non-owner taint applied"

Los usuarios no propietarios pueden tener sus sesiones contaminadas basándose en la clasificación del canal o los permisos del usuario. Esto es separado del taint basado en recursos.

---

## SSRF (Server-Side Request Forgery)

### "SSRF blocked: hostname resolves to private IP"

Todas las solicitudes HTTP salientes (web_fetch, navegación del navegador, conexiones SSE de MCP) pasan por protección SSRF. Si el hostname destino resuelve a una dirección IP privada, la solicitud se bloquea.

**Rangos bloqueados:**
- `127.0.0.0/8` (loopback)
- `10.0.0.0/8` (privado)
- `172.16.0.0/12` (privado)
- `192.168.0.0/16` (privado)
- `169.254.0.0/16` (link-local)
- `0.0.0.0/8` (no especificado)
- `::1` (loopback IPv6)
- `fc00::/7` (IPv6 ULA)
- `fe80::/10` (IPv6 link-local)

Esta protección está hardcodeada y no se puede deshabilitar ni configurar. Previene que el agente de IA sea engañado para acceder a servicios internos.

**IPv4 mapeado en IPv6:** Direcciones como `::ffff:127.0.0.1` se detectan y bloquean.

### "SSRF check blocked outbound request"

Igual que arriba, pero registrado desde la herramienta web_fetch en lugar del módulo SSRF.

### Fallos de resolución DNS

```
DNS resolution failed for hostname
No DNS records found for hostname
```

No se pudo resolver el hostname. Verifica:
- La URL está escrita correctamente
- Tu servidor DNS es accesible
- El dominio realmente existe

---

## Motor de políticas

### "Hook evaluation failed, defaulting to BLOCK"

Un hook de política lanzó una excepción durante la evaluación. Cuando esto pasa, la acción por defecto es BLOCK (denegar). Este es el valor por defecto seguro.

Revisa los logs para la excepción completa. Probablemente indica un bug en una regla de política personalizada.

### "Policy rule blocked action"

Una regla de política denegó explícitamente la acción. La entrada del log incluye qué regla se activó y por qué. Revisa la sección `policy.rules` de tu configuración para ver qué reglas están definidas.

### "Tool floor violation"

Se llamó a una herramienta que requiere un nivel de clasificación mínimo, pero la sesión está por debajo de ese nivel.

**Ejemplo:** La herramienta healthcheck requiere como mínimo clasificación INTERNAL (porque revela internos del sistema). Si una sesión PUBLIC intenta usarla, la llamada se bloquea.

---

## Seguridad de plugins y skills

### "Plugin network access blocked"

Los plugins se ejecutan en un sandbox con acceso de red restringido. Solo pueden acceder a URLs en su dominio de endpoint declarado.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

El plugin intentó acceder a una URL que no está en sus endpoints declarados, o la URL resolvió a una IP privada.

### "Skill activation blocked by classification ceiling"

Los skills declaran un `classification_ceiling` en el frontmatter de su SKILL.md. Si el techo está por debajo del nivel de taint de la sesión, el skill no se puede activar:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

Esto previene que un skill de menor clasificación sea expuesto a datos de mayor clasificación.

### "Skill content integrity check failed"

Después de la instalación, Triggerfish calcula el hash del contenido del skill. Si el hash cambia (el skill fue modificado después de la instalación), la verificación de integridad falla:

```
Skill content hash mismatch detected
```

Esto podría indicar manipulación. Reinstala el skill desde una fuente confiable.

### "Skill install rejected by scanner"

El escáner de seguridad encontró contenido sospechoso en el skill. El escáner busca patrones que podrían indicar comportamiento malicioso. Las advertencias específicas se incluyen en el mensaje de error.

---

## Seguridad de sesiones

### "Session not found"

```
Session not found: <session-id>
```

La sesión solicitada no existe en el gestor de sesiones. Puede haber sido limpiada, o el ID de sesión es inválido.

### "Session status access denied: taint exceeds caller"

Intentaste ver el estado de una sesión, pero esa sesión tiene un nivel de taint más alto que tu sesión actual. Esto previene que sesiones de menor clasificación conozcan operaciones de mayor clasificación.

### "Session history access denied"

El mismo concepto que arriba, pero para ver el historial de conversación.

---

## Equipos de agentes

### "Team message delivery denied: team status is ..."

El equipo no está en estado `running`. Esto pasa cuando:

- El equipo fue **disuelto** (manualmente o por el monitor de ciclo de vida)
- El equipo fue **pausado** porque la sesión líder falló
- El equipo **expiró** después de exceder su límite de vida

Verifica el estado actual del equipo con `team_status`. Si el equipo está pausado por fallo del líder, puedes disolverlo con `team_disband` y crear uno nuevo.

### "Team member not found" / "Team member ... is not active"

El miembro destino no existe (nombre de rol incorrecto) o ha sido terminado. Los miembros se terminan cuando:

- Exceden el timeout de inactividad (2x `idle_timeout_seconds`)
- El equipo es disuelto
- Su sesión falla y el monitor de ciclo de vida lo detecta

Usa `team_status` para ver todos los miembros y su estado actual.

### "Team disband denied: only the lead or creating session can disband"

Solo dos sesiones pueden disolver un equipo:

1. La sesión que originalmente llamó a `team_create`
2. La sesión del miembro líder

Si recibes este error desde dentro del equipo, el miembro que llama no es el líder. Si lo recibes desde fuera del equipo, no eres la sesión que lo creó.

### El líder del equipo falla inmediatamente después de la creación

La sesión del agente líder no pudo completar su primer turno. Causas comunes:

1. **Error del proveedor de LLM:** El proveedor devolvió un error (límite de tasa, fallo de autenticación, modelo no encontrado). Revisa `triggerfish logs` para errores del proveedor.
2. **Techo de clasificación demasiado bajo:** Si el líder necesita herramientas clasificadas por encima de su techo, la sesión puede fallar en su primera llamada a herramienta.
3. **Herramientas faltantes:** El líder puede necesitar herramientas específicas para descomponer el trabajo. Asegúrate de que los perfiles de herramientas estén configurados correctamente.

### Los miembros del equipo están inactivos y nunca producen salida

Los miembros esperan a que el líder les envíe trabajo vía `sessions_send`. Si el líder no descompone la tarea:

- El modelo del líder puede no entender la coordinación de equipos. Prueba un modelo más capaz para el rol de líder.
- La descripción de `task` puede ser demasiado vaga para que el líder la descomponga en sub-tareas.
- Revisa `team_status` para ver si el líder está `active` y tiene actividad reciente.

### "Write-down blocked" entre miembros del equipo

Los miembros del equipo siguen las mismas reglas de clasificación que todas las sesiones. Si un miembro ha sido contaminado a `CONFIDENTIAL` e intenta enviar datos a un miembro en `PUBLIC`, la verificación de write-down lo bloquea. Este es el comportamiento esperado -- los datos clasificados no pueden fluir a sesiones de menor clasificación, incluso dentro de un equipo.

---

## Delegación y multi-agente

### "Delegation certificate signature invalid"

La delegación de agentes usa certificados criptográficos. Si la verificación de firma falla, la delegación es rechazada. Esto previene cadenas de delegación falsificadas.

### "Delegation certificate expired"

El certificado de delegación tiene un tiempo de vida. Si ha expirado, el agente delegado ya no puede actuar en nombre del delegante.

### "Delegation chain linkage broken"

En delegaciones multi-salto (A delega a B, B delega a C), cada enlace en la cadena debe ser válido. Si algún enlace está roto, toda la cadena es rechazada.

---

## Webhooks

### "Webhook HMAC verification failed"

Los webhooks entrantes requieren firmas HMAC para autenticación. Si la firma falta, está malformada o no coincide:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Verifica que:
- La fuente del webhook está enviando el header de firma HMAC correcto
- El secret compartido en tu config coincide con el secret de la fuente
- El formato de firma coincide (HMAC-SHA256 codificado en hexadecimal)

### "Webhook replay detected"

Triggerfish incluye protección contra replay. Si un payload de webhook se recibe por segunda vez (misma firma), es rechazado.

### "Webhook rate limit exceeded"

```
Webhook rate limit exceeded: source=<sourceId>
```

Demasiadas solicitudes de webhook de la misma fuente en un período corto. Esto protege contra inundaciones de webhooks. Espera e intenta de nuevo.

---

## Integridad de auditoría

### "previousHash mismatch"

El log de auditoría usa encadenamiento de hash. Cada entrada incluye el hash de la entrada anterior. Si la cadena se rompe, significa que el log de auditoría fue manipulado o corrompido.

### "HMAC mismatch"

La firma HMAC de la entrada de auditoría no coincide. La entrada puede haber sido modificada después de su creación.
