# Integración con GitHub

Triggerfish se integra con GitHub a través de dos enfoques complementarios:

## Configuración Rápida: Herramientas de API REST

La forma más rápida de conectar GitHub. Le da al agente 14 herramientas
integradas para repos, PRs, issues, Actions y búsqueda de código -- todas con
propagación de taint consciente de la clasificación.

```bash
triggerfish connect github
```

Esto los guía a través de la creación de un Personal Access Token de grano fino,
lo valida y lo almacena en el llavero del SO. Eso es todo -- su agente ahora
puede usar todas las herramientas `github_*`.

Consulten la [documentación de Skills](/pt-BR/integrations/skills) para más
información sobre cómo funcionan los skills, o ejecuten
`triggerfish skills list` para ver todas las herramientas disponibles.

## Avanzado: `gh` CLI + Webhooks

Para el ciclo de retroalimentación de desarrollo completo (el agente crea ramas,
abre PRs, responde a revisiones de código), Triggerfish también soporta el CLI
`gh` vía exec y entrega de revisiones impulsada por webhooks. Esto usa tres
piezas componibles:

1. **`gh` CLI vía exec** -- realizar todas las acciones de GitHub (crear PRs,
   leer revisiones, comentar, fusionar)
2. **Entrega de revisiones** -- dos modos: **eventos de webhook** (instantáneo,
   requiere endpoint público) o **polling basado en triggers** vía `gh pr view`
   (funciona detrás de firewalls)
3. **Skill git-branch-management** -- enseña al agente el flujo de trabajo
   completo de ramas/PR/revisión

Juntos, crean un ciclo de retroalimentación de desarrollo completo: el agente
crea ramas, hace commit de código, abre PRs y responde a retroalimentación de
revisores -- sin código personalizado de API de GitHub.

### Prerrequisitos

#### gh CLI

El CLI de GitHub (`gh`) debe estar instalado y autenticado en el entorno donde
se ejecuta Triggerfish.

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

Verifiquen la autenticación:

```bash
gh auth status
```

El agente usa `gh` vía `exec.run("gh ...")` -- no se necesita configuración
separada de token de GitHub más allá del login de `gh`.

### Git

Git debe estar instalado y configurado con un nombre de usuario y correo:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### Acceso al Repositorio

El workspace del agente debe ser un repositorio git (o contener uno) con acceso
push al remoto.

## Entrega de Revisiones

Hay dos formas para que el agente se entere de nuevas revisiones de PR. Elijan
una o usen ambas juntas.

### Opción A: Polling Basado en Triggers

No requiere conectividad entrante. El agente consulta GitHub según un horario
usando `gh pr view`. Funciona detrás de cualquier firewall, NAT o VPN.

Agreguen un cron job a `triggerfish.yaml`:

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

O agreguen "check open PRs for review feedback" al TRIGGER.md del agente para
ejecución durante el ciclo regular de activación por trigger.

### Opción B: Configuración de Webhooks

Los webhooks entregan eventos de revisión instantáneamente. Esto requiere que el
gateway de Triggerfish sea alcanzable desde los servidores de GitHub (ej. vía
Tailscale Funnel, proxy reverso o túnel).

### Paso 1: Generar un secreto de webhook

```bash
openssl rand -hex 32
```

Almacénenlo como variable de entorno:

```bash
export GITHUB_WEBHOOK_SECRET="<secreto-generado>"
```

Agréguenlo a su perfil de shell o gestor de secretos para que persista entre
reinicios.

### Paso 2: Configurar Triggerfish

Agreguen el endpoint de webhook a `triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # secret almacenado en el llavero del SO
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

El gateway de Triggerfish debe ser alcanzable desde los servidores de GitHub.
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

Esto expone `https://<su-máquina>.ts.net/webhook/github` a internet.

**Proxy reverso (nginx, Caddy):**

Redirijan `/webhook/github` al puerto local de su gateway.

**ngrok (desarrollo/pruebas):**

```bash
ngrok http 8080
```

Usen la URL generada como destino del webhook.

### Paso 4: Configurar el webhook de GitHub

En su repositorio de GitHub (u organización):

1. Vayan a **Settings** > **Webhooks** > **Add webhook**
2. Establezcan la **Payload URL** a su endpoint expuesto:
   ```
   https://<su-host>/webhook/github
   ```
3. Establezcan **Content type** a `application/json`
4. Establezcan **Secret** al mismo valor que `GITHUB_WEBHOOK_SECRET`
5. En **Which events would you like to trigger this webhook?**, seleccionen
   **Let me select individual events** y marquen:
   - **Pull requests** (cubre `pull_request.opened`, `pull_request.closed`)
   - **Pull request reviews** (cubre `pull_request_review`)
   - **Pull request review comments** (cubre `pull_request_review_comment`)
   - **Issue comments** (cubre `issue_comment` en PRs e issues)
6. Hagan clic en **Add webhook**

GitHub enviará un evento ping para verificar la conexión. Revisen los logs de
Triggerfish para confirmar la recepción:

```bash
triggerfish logs --tail
```

## Cómo Funciona el Ciclo de Retroalimentación

### Con webhooks (instantáneo)

<img src="/diagrams/github-webhook-review.svg" alt="Ciclo de revisión por webhook de GitHub: el agente abre PR, espera, recibe webhook de revisión, lee archivo de seguimiento, aborda retroalimentación, hace commit y push" style="max-width: 100%;" />

### Con polling basado en triggers (detrás de firewall)

<img src="/diagrams/github-trigger-review.svg" alt="Revisión basada en triggers de GitHub: el agente abre PR, escribe archivo de seguimiento, espera activación por trigger, consulta revisiones, aborda retroalimentación" style="max-width: 100%;" />

Ambas rutas usan los mismos archivos de seguimiento. El agente recupera
contexto leyendo el archivo de seguimiento de PR desde
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`.

## Archivos de Seguimiento de PR

El agente escribe un archivo de seguimiento para cada PR que crea:

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

Después de la fusión, los archivos de seguimiento se archivan en `completed/`.

## Política de Fusión

Por defecto, el agente **no** fusiona automáticamente PRs aprobados. Cuando una
revisión es aprobada, el agente notifica al propietario y espera una instrucción
explícita de fusión.

Para habilitar la fusión automática, agreguen a `triggerfish.yaml`:

```yaml
github:
  auto_merge: true
```

Cuando está habilitado, el agente ejecutará
`gh pr merge --squash --delete-branch` después de recibir una revisión de
aprobación.

::: warning La fusión automática está deshabilitada por defecto por seguridad.
Solo habilítenla si confían en los cambios del agente y tienen reglas de
protección de rama (revisores requeridos, verificaciones CI) configuradas en
GitHub. :::

## Opcional: Servidor MCP de GitHub

Para acceso más rico a la API de GitHub más allá de lo que el CLI `gh` y las
herramientas integradas proporcionan, también pueden configurar el servidor MCP
de GitHub:

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # El token de GitHub se lee del llavero del SO
    classification: CONFIDENTIAL
```

Esto no es requerido para la mayoría de los flujos de trabajo -- las herramientas
integradas `github_*` (configuradas vía `triggerfish connect github`) y el CLI
`gh` cubren todas las operaciones comunes. El servidor MCP es útil para
consultas avanzadas no cubiertas por las herramientas integradas.

## Consideraciones de Seguridad

| Control                   | Detalle                                                                                                   |
| ------------------------- | --------------------------------------------------------------------------------------------------------- |
| **Verificación HMAC**     | Todos los webhooks de GitHub se verifican con HMAC-SHA256 antes del procesamiento (modo webhook)          |
| **Clasificación**         | Los datos de GitHub se clasifican como `INTERNAL` por defecto -- código y datos de PR no se filtran a canales públicos |
| **Aislamiento de sesión** | Cada evento de webhook o activación por trigger genera una sesión fresca aislada                          |
| **No Escritura Descendente** | Las respuestas del agente a eventos de PR clasificados INTERNAL no pueden enviarse a canales PUBLIC    |
| **Manejo de credenciales** | El CLI `gh` gestiona su propio token de auth; no se almacenan tokens de GitHub en triggerfish.yaml       |
| **Nomenclatura de ramas** | El prefijo `triggerfish/` hace que las ramas del agente sean fácilmente identificables y filtrables      |

::: tip Si su repositorio contiene código sensible (propietario,
crítico para seguridad), consideren establecer la clasificación del webhook a
`CONFIDENTIAL` en lugar de `INTERNAL`. :::

## Solución de Problemas

### El webhook no recibe eventos

1. Verifiquen que la URL del webhook sea alcanzable desde internet (usen `curl`
   desde una máquina externa)
2. En GitHub, vayan a **Settings** > **Webhooks** y revisen la pestaña **Recent
   Deliveries** para errores
3. Verifiquen que el secreto coincida entre GitHub y `GITHUB_WEBHOOK_SECRET`
4. Revisen los logs de Triggerfish: `triggerfish logs --tail`

### Las revisiones de PR no se detectan (modo polling)

1. Verifiquen que el cron job `pr-review-check` esté configurado en
   `triggerfish.yaml`
2. Verifiquen que el daemon esté ejecutándose: `triggerfish status`
3. Verifiquen que existan archivos de seguimiento en
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`
4. Prueben manualmente: `gh pr view <número> --json reviews`
5. Revisen los logs de Triggerfish: `triggerfish logs --tail`

### El CLI gh no está autenticado

```bash
gh auth status
# Si no está autenticado:
gh auth login
```

### El agente no puede hacer push al remoto

Verifiquen el remoto git y credenciales:

```bash
git remote -v
gh auth status
```

Asegúrense de que la cuenta de GitHub autenticada tenga acceso push al
repositorio.

### Archivo de seguimiento no encontrado durante revisión

El agente busca archivos de seguimiento en
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`. Si el archivo no
existe, el PR puede haber sido creado fuera de Triggerfish, o el workspace fue
limpiado. El agente debe notificar al propietario y omitir el manejo
automatizado.
