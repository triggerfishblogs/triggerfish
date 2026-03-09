# Integración con GitHub

Triggerfish se integra con GitHub a través de dos enfoques complementarios:

## Configuración rápida: Herramientas REST API

La forma más rápida de conectar GitHub. Da al agente 14 herramientas integradas
para repositorios, PRs, issues, Actions y búsqueda de código -- todo con
propagación de contaminación con reconocimiento de clasificación.

```bash
triggerfish connect github
```

Esto le guía en la creación de un Fine-Grained Personal Access Token, lo valida
y lo almacena en el llavero del SO. Eso es todo -- su agente ahora puede usar
todas las herramientas `github_*`.

Consulte la [documentación de Skills](/es-ES/integrations/skills) para más
información sobre cómo funcionan los skills, o ejecute
`triggerfish skills list` para ver todas las herramientas disponibles.

## Avanzado: `gh` CLI + Webhooks

Para el bucle de retroalimentación de desarrollo completo (el agente crea ramas,
abre PRs, responde a revisiones de código), Triggerfish también soporta el CLI
`gh` vía exec y entrega de revisiones por webhook. Esto utiliza tres piezas
componibles:

1. **`gh` CLI vía exec** -- realizar todas las acciones de GitHub (crear PRs,
   leer revisiones, comentar, fusionar)
2. **Entrega de revisiones** -- dos modos: **eventos de webhook** (instantáneo,
   requiere endpoint público) o **polling basado en triggers** vía
   `gh pr view` (funciona detrás de firewalls)
3. **Skill git-branch-management** -- enseña al agente el flujo de trabajo
   completo de ramas/PR/revisión

Juntos, crean un bucle de retroalimentación de desarrollo completo: el agente
crea ramas, hace commits, abre PRs y responde a la retroalimentación del
revisor -- sin código personalizado de la API de GitHub.

### Prerrequisitos

#### gh CLI

El GitHub CLI (`gh`) debe estar instalado y autenticado en el entorno donde
Triggerfish se ejecuta.

```bash
# Instalar gh (Fedora/RHEL)
sudo dnf install gh

# Instalar gh (macOS)
brew install gh

# Instalar gh (Debian/Ubuntu)
sudo apt install gh

# Autenticarse
gh auth login
```

Verificar la autenticación:

```bash
gh auth status
```

El agente usa `gh` vía `exec.run("gh ...")` -- no se necesita configuración
separada de token de GitHub más allá del login de `gh`.

### Git

Git debe estar instalado y configurado con nombre de usuario y correo
electrónico:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### Acceso al repositorio

El espacio de trabajo del agente debe ser un repositorio git (o contener uno)
con acceso de push al remoto.

## Entrega de revisiones

Hay dos formas para que el agente se entere de nuevas revisiones de PR. Elija
una o use ambas a la vez.

### Opción A: Polling basado en triggers

No se requiere conectividad entrante. El agente consulta GitHub periódicamente
usando `gh pr view`. Funciona detrás de cualquier firewall, NAT o VPN.

Añada un cron job a `triggerfish.yaml`:

```yaml
scheduler:
  cron:
    jobs:
      - id: pr-review-check
        schedule: "*/15 * * * *"
        task: >
          Check all open PR tracking files in scratch/pr-tracking/.
          For each open PR, query GitHub for new reviews or state changes
          using gh pr view. Address any review feedback, handle merges
          and closures.
        classification: INTERNAL
```

O añada "check open PRs for review feedback" al TRIGGER.md del agente para
ejecución durante el ciclo regular de despertar de triggers.

### Opción B: Configuración de webhooks

Los webhooks entregan eventos de revisión instantáneamente. Esto requiere que el
gateway de Triggerfish sea accesible desde los servidores de GitHub (p. ej., a
través de Tailscale Funnel, proxy inverso o túnel).

### Paso 1: Generar un secreto de webhook

```bash
openssl rand -hex 32
```

Almacénelo como variable de entorno:

```bash
export GITHUB_WEBHOOK_SECRET="<secreto-generado>"
```

Añádalo a su perfil de shell o gestor de secretos para que persista entre
reinicios.

### Paso 2: Configurar Triggerfish

Añada el endpoint de webhook a `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secreto almacenado en el llavero del SO
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: >
            A PR review was submitted. Read the PR tracking file from
            scratch/pr-tracking/ to recover context. Check out the branch,
            read the review, address any requested changes, commit, push,
            and comment on the PR with a summary of changes made.
        - event: "pull_request_review_comment"
          task: >
            An inline review comment was posted on a PR. Read the PR
            tracking file, check out the branch, address the specific
            comment, commit, push.
        - event: "issue_comment"
          task: >
            A comment was posted on a PR or issue. Check if this is a
            tracked PR by looking up tracking files in scratch/pr-tracking/.
            If tracked, check out the branch and address the feedback.
        - event: "pull_request.closed"
          task: >
            A PR was closed or merged. Read the tracking file. If merged,
            clean up: delete local branch, archive tracking file to
            completed/. Notify the owner of the merge. If closed without
            merge, archive and notify.
```

### Paso 3: Exponer el endpoint de webhook

El gateway de Triggerfish debe ser accesible desde los servidores de GitHub.
Opciones:

**Tailscale Funnel (recomendado para uso personal):**

```yaml
# En triggerfish.yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

Esto expone `https://<su-maquina>.ts.net/webhook/github` a internet.

**Proxy inverso (nginx, Caddy):**

Redirija `/webhook/github` al puerto local de su gateway.

**ngrok (desarrollo/pruebas):**

```bash
ngrok http 8080
```

Use la URL generada como destino del webhook.

### Paso 4: Configurar el webhook de GitHub

En su repositorio (u organización) de GitHub:

1. Vaya a **Settings** > **Webhooks** > **Add webhook**
2. Establezca la **Payload URL** a su endpoint expuesto:
   ```
   https://<su-host>/webhook/github
   ```
3. Establezca **Content type** a `application/json`
4. Establezca **Secret** al mismo valor que `GITHUB_WEBHOOK_SECRET`
5. En **Which events would you like to trigger this webhook?**, seleccione
   **Let me select individual events** y marque:
   - **Pull requests** (cubre `pull_request.opened`, `pull_request.closed`)
   - **Pull request reviews** (cubre `pull_request_review`)
   - **Pull request review comments** (cubre `pull_request_review_comment`)
   - **Issue comments** (cubre `issue_comment` en PRs e issues)
6. Haga clic en **Add webhook**

GitHub enviará un evento ping para verificar la conexión. Compruebe los
registros de Triggerfish para confirmar la recepción:

```bash
triggerfish logs --tail
```

## Cómo funciona el bucle de retroalimentación

### Con webhooks (instantáneo)

<img src="/diagrams/github-webhook-review.svg" alt="Bucle de revisión por webhook de GitHub: el agente abre PR, espera, recibe webhook en la revisión, lee fichero de seguimiento, aborda retroalimentación, hace commit y push" style="max-width: 100%;" />

### Con polling basado en triggers (detrás de firewall)

<img src="/diagrams/github-trigger-review.svg" alt="Revisión basada en triggers de GitHub: el agente abre PR, escribe fichero de seguimiento, espera despertar de trigger, consulta revisiones, aborda retroalimentación" style="max-width: 100%;" />

Ambas rutas usan los mismos ficheros de seguimiento. El agente recupera contexto
leyendo el fichero de seguimiento del PR desde
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`.

## Ficheros de seguimiento de PR

El agente escribe un fichero de seguimiento para cada PR que crea:

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<nombre-rama>.json
```

Esquema:

```json
{
  "branch": "triggerfish/agent-1/fix-auth-timeout",
  "prNumber": 42,
  "prUrl": "https://github.com/owner/repo/pull/42",
  "task": "Fix authentication timeout when token expires during long requests",
  "repository": "owner/repo",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "lastCheckedAt": "2025-01-15T10:30:00Z",
  "lastReviewId": "",
  "status": "open",
  "commits": [
    "feat: add token refresh before expiry",
    "test: add timeout edge case coverage"
  ]
}
```

Después de la fusión, los ficheros de seguimiento se archivan en `completed/`.

## Política de fusión

Por defecto, el agente **no** fusiona automáticamente los PRs aprobados. Cuando
una revisión se aprueba, el agente notifica al propietario y espera una
instrucción explícita de fusión.

Para activar la fusión automática, añada a `triggerfish.yaml`:

```yaml
github:
  auto_merge: true
```

Cuando está activada, el agente ejecutará
`gh pr merge --squash --delete-branch` después de recibir una revisión
aprobatoria.

::: warning La fusión automática está desactivada por defecto por seguridad.
Solo actívela si confía en los cambios del agente y tiene reglas de protección
de ramas (revisores requeridos, comprobaciones CI) configuradas en GitHub. :::

## Opcional: Servidor MCP de GitHub

Para un acceso más rico a la API de GitHub más allá de lo que el CLI `gh` y las
herramientas integradas proporcionan, también puede configurar el servidor MCP
de GitHub:

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # El token de GitHub se lee del llavero del SO
    classification: CONFIDENTIAL
```

Esto no es necesario para la mayoría de los flujos de trabajo -- las
herramientas integradas `github_*` (configuradas vía `triggerfish connect github`)
y el CLI `gh` cubren todas las operaciones comunes. El servidor MCP es útil para
consultas avanzadas no cubiertas por las herramientas integradas.

## Consideraciones de seguridad

| Control                   | Detalle                                                                                                     |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Verificación HMAC**     | Todos los webhooks de GitHub se verifican con HMAC-SHA256 antes del procesamiento (modo webhook)             |
| **Clasificación**         | Los datos de GitHub se clasifican como `INTERNAL` por defecto -- el código y los datos de PR no se filtran a canales públicos |
| **Aislamiento de sesión** | Cada evento de webhook o despertar de trigger genera una sesión aislada nueva                                |
| **No escritura descendente** | Las respuestas del agente a eventos de PR clasificados como INTERNAL no pueden enviarse a canales PUBLIC  |
| **Gestión de credenciales** | El CLI `gh` gestiona su propio token de autenticación; no se almacenan tokens de GitHub en triggerfish.yaml |
| **Nomenclatura de ramas** | El prefijo `triggerfish/` hace las ramas del agente fácilmente identificables y filtrables                  |

::: tip Si su repositorio contiene código sensible (propietario, crítico para
la seguridad), considere establecer la clasificación del webhook a
`CONFIDENTIAL` en lugar de `INTERNAL`. :::

## Solución de problemas

### El webhook no recibe eventos

1. Compruebe que la URL del webhook sea accesible desde internet (use `curl`
   desde una máquina externa)
2. En GitHub, vaya a **Settings** > **Webhooks** y compruebe la pestaña
   **Recent Deliveries** en busca de errores
3. Verifique que el secreto coincide entre GitHub y `GITHUB_WEBHOOK_SECRET`
4. Compruebe los registros de Triggerfish: `triggerfish logs --tail`

### Las revisiones de PR no se detectan (modo polling)

1. Compruebe que el cron job `pr-review-check` está configurado en
   `triggerfish.yaml`
2. Verifique que el daemon está ejecutándose: `triggerfish status`
3. Compruebe que existen ficheros de seguimiento en
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`
4. Pruebe manualmente: `gh pr view <número> --json reviews`
5. Compruebe los registros de Triggerfish: `triggerfish logs --tail`

### gh CLI no autenticado

```bash
gh auth status
# Si no está autenticado:
gh auth login
```

### El agente no puede hacer push al remoto

Verifique el remoto git y las credenciales:

```bash
git remote -v
gh auth status
```

Asegúrese de que la cuenta de GitHub autenticada tiene acceso de push al
repositorio.

### Fichero de seguimiento no encontrado durante la revisión

El agente busca ficheros de seguimiento en
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`. Si el fichero falta,
el PR puede haber sido creado fuera de Triggerfish o el espacio de trabajo fue
limpiado. El agente debería notificar al propietario y omitir el manejo
automatizado.
