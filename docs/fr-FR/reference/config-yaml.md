# Schema de configuration

Triggerfish est configure via `triggerfish.yaml`, situe dans
`~/.triggerfish/triggerfish.yaml` apres l'execution de `triggerfish dive`. Cette page
documente chaque section de configuration.

::: info References de secrets Toute valeur de chaine dans ce fichier peut utiliser le prefixe
`secret:` pour referencer un identifiant stocke dans le trousseau du systeme. Par exemple,
`apiKey: "secret:provider:anthropic:apiKey"` resout la valeur depuis le
trousseau au demarrage. Consultez
[Gestion des secrets](/fr-FR/security/secrets#secret-references-in-configuration) pour
les details. :::

## Exemple annote complet

```yaml
# =============================================================================
# triggerfish.yaml -- Reference complete de configuration
# =============================================================================

# ---------------------------------------------------------------------------
# Models : configuration du fournisseur LLM et basculement
# ---------------------------------------------------------------------------
models:
  # Le modele principal utilise pour les completions de l'agent
  primary:
    provider: anthropic
    model: claude-sonnet-4-5

  # Optionnel : modele de vision separe pour la description d'images
  # Lorsque le modele principal ne prend pas en charge la vision, les images sont automatiquement
  # decrites par ce modele avant d'atteindre le modele principal.
  # vision: glm-4.5v

  # Reponses en streaming (par defaut : true)
  # streaming: true

  # Configuration specifique au fournisseur
  # Les cles API sont referencees via la syntaxe secret: et resolues depuis le trousseau du systeme.
  # Executez `triggerfish dive` ou `triggerfish config migrate-secrets` pour configurer.
  providers:
    anthropic:
      model: claude-sonnet-4-5
      # apiKey: "secret:provider:anthropic:apiKey"

    openai:
      model: gpt-4o

    google:
      model: gemini-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434"

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234"

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Chaine de basculement ordonnee -- essayee dans l'ordre lorsque le modele principal echoue
  failover:
    - claude-haiku-4-5 # Premier repli
    - gpt-4o # Deuxieme repli
    - ollama/llama3 # Repli local (pas d'internet requis)

  # Comportement de basculement
  failover_config:
    max_retries: 3 # Tentatives par fournisseur avant de passer au suivant
    retry_delay_ms: 1000 # Delai entre les tentatives
    conditions: # Ce qui declenche le basculement
      - rate_limited # Le fournisseur a retourne 429
      - server_error # Le fournisseur a retourne 5xx
      - timeout # La requete a depasse le delai

# ---------------------------------------------------------------------------
# Logging : sortie de log structuree
# ---------------------------------------------------------------------------
logging:
  level: normal # quiet | normal | verbose | debug

# ---------------------------------------------------------------------------
# Channels : connexions aux plateformes de messagerie
# ---------------------------------------------------------------------------
# Les secrets (tokens de bot, cles API, mots de passe) sont stockes dans le trousseau du systeme.
# Executez `triggerfish config add-channel <nom>` pour les saisir de maniere securisee.
# Seule la configuration non secrete apparait ici.
channels:
  telegram:
    ownerId: 123456789 # Votre identifiant numerique Telegram
    classification: INTERNAL # Par defaut : INTERNAL

  signal:
    endpoint: "tcp://127.0.0.1:7583" # Endpoint du daemon signal-cli
    account: "+14155552671" # Votre numero de telephone Signal (E.164)
    classification: PUBLIC # Par defaut : PUBLIC
    defaultGroupMode: mentioned-only # always | mentioned-only | owner-only
    groups:
      "group-id-here":
        mode: always
        classification: INTERNAL

  slack:
    classification: PUBLIC # Par defaut : PUBLIC

  discord:
    ownerId: "your-discord-user-id" # Votre identifiant utilisateur Discord
    classification: PUBLIC # Par defaut : PUBLIC

  whatsapp:
    phoneNumberId: "your-phone-number-id" # Depuis le tableau de bord Meta Business
    classification: PUBLIC # Par defaut : PUBLIC

  webchat:
    port: 8765 # Port WebSocket pour le client web
    classification: PUBLIC # Par defaut : PUBLIC (visiteurs)

  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL # Par defaut : CONFIDENTIAL

# ---------------------------------------------------------------------------
# Classification : modele de sensibilite des donnees
# ---------------------------------------------------------------------------
classification:
  mode: personal # "personal" ou "enterprise" (a venir)
# Niveaux : RESTRICTED > CONFIDENTIAL > INTERNAL > PUBLIC

# ---------------------------------------------------------------------------
# Policy : regles d'application personnalisees (mecanisme d'echappement enterprise)
# ---------------------------------------------------------------------------
policy:
  rules:
    - id: block-external-pii
      hook: PRE_OUTPUT
      priority: 100
      conditions:
        - type: recipient_is
          value: EXTERNAL
        - type: content_matches
          pattern: "\\b\\d{3}-\\d{2}-\\d{4}\\b" # Motif SSN
      action: REDACT
      message: "PII redacted for external recipient"

    - id: rate-limit-browser
      hook: PRE_TOOL_CALL
      priority: 50
      conditions:
        - type: tool_name
          value: browser
        - type: rate_exceeds
          value: 10/minute
      action: BLOCK
      message: "Browser tool rate limit exceeded"

# ---------------------------------------------------------------------------
# MCP Servers : serveurs d'outils externes
# ---------------------------------------------------------------------------
mcp_servers:
  filesystem:
    command: "deno"
    args: ["run", "--allow-read", "--allow-write", "mcp-filesystem-server.ts"]
    classification: INTERNAL

  github:
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Scheduler : taches cron et triggers
# ---------------------------------------------------------------------------
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7h tous les jours
        task: "Prepare morning briefing with calendar, unread emails, and weather"
        channel: telegram
        classification: INTERNAL

      - id: pipeline-check
        schedule: "0 */4 * * *" # Toutes les 4 heures
        task: "Check Salesforce pipeline for changes and notify if significant"
        channel: slack
        classification: CONFIDENTIAL

      - id: pr-review-check
        schedule: "*/15 * * * *" # Toutes les 15 minutes
        task: "Check open PR tracking files and query GitHub for new reviews"
        classification: INTERNAL

  trigger:
    interval: 30m # Verifier toutes les 30 minutes
    classification: INTERNAL # Plafond de taint maximum pour les triggers
    quiet_hours: "22:00-07:00" # Supprimer pendant ces heures

# ---------------------------------------------------------------------------
# Notifications : preferences de livraison
# ---------------------------------------------------------------------------
notifications:
  preferred_channel: telegram # Canal de livraison par defaut
  quiet_hours: "22:00-07:00" # Supprimer les priorites normales/basses
  batch_interval: 15m # Regrouper les notifications de faible priorite

# ---------------------------------------------------------------------------
# Agents : routage multi-agent (optionnel)
# ---------------------------------------------------------------------------
agents:
  default: personal # Agent de repli
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp, telegram]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: INTERNAL

    - id: work
      name: "Work Assistant"
      channels: [slack, email]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

# ---------------------------------------------------------------------------
# Voice : configuration vocale (optionnel)
# ---------------------------------------------------------------------------
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Taille du modele Whisper
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice-id"
  wake_word: "triggerfish"
  push_to_talk:
    shortcut: "Ctrl+Space"

# ---------------------------------------------------------------------------
# Webhooks : endpoints d'evenements entrants (optionnel)
# ---------------------------------------------------------------------------
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # Le secret du webhook est stocke dans le trousseau du systeme
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "pull_request_review"
          task: "A PR review was submitted. Read tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read tracking file, address comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address feedback."
        - event: "pull_request.closed"
          task: "PR closed or merged. Clean up branches and archive tracking file."
        - event: "issues.opened"
          task: "Triage new issue"

# ---------------------------------------------------------------------------
# GitHub : parametres d'integration GitHub (optionnel)
# ---------------------------------------------------------------------------
github:
  auto_merge: false # Par defaut : false. Mettre a true pour fusionner automatiquement les PR approuvees.

# ---------------------------------------------------------------------------
# Groups : comportement des chats de groupe (optionnel)
# ---------------------------------------------------------------------------
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"

# ---------------------------------------------------------------------------
# Remote : acces distant (optionnel)
# ---------------------------------------------------------------------------
# ---------------------------------------------------------------------------
# Web : configuration de recherche et recuperation
# ---------------------------------------------------------------------------
web:
  search:
    provider: brave # Backend de recherche (brave est la valeur par defaut)
# La cle API est stockee dans le trousseau du systeme

# ---------------------------------------------------------------------------
# Remote : acces distant (optionnel)
# ---------------------------------------------------------------------------
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
  auth:
# Le token d'authentification est stocke dans le trousseau du systeme
```

## Reference par section

### `models`

| Cle                              | Type     | Description                                                                                               |
| -------------------------------- | -------- | --------------------------------------------------------------------------------------------------------- |
| `primary`                        | object   | Reference du modele principal avec les champs `provider` et `model`                                       |
| `primary.provider`               | string   | Nom du fournisseur (`anthropic`, `openai`, `google`, `ollama`, `lmstudio`, `openrouter`, `zenmux`, `zai`) |
| `primary.model`                  | string   | Identifiant du modele utilise pour les completions de l'agent                                             |
| `vision`                         | string   | Modele de vision optionnel pour la description automatique d'images (voir [Image et Vision](/fr-FR/features/image-vision)) |
| `streaming`                      | boolean  | Activer les reponses en streaming (par defaut : `true`)                                                   |
| `providers`                      | object   | Configuration specifique au fournisseur (voir ci-dessous)                                                 |
| `failover`                       | string[] | Liste ordonnee des modeles de repli                                                                       |
| `failover_config.max_retries`    | number   | Tentatives par fournisseur avant basculement                                                              |
| `failover_config.retry_delay_ms` | number   | Delai entre les tentatives en millisecondes                                                               |
| `failover_config.conditions`     | string[] | Conditions qui declenchent le basculement                                                                 |

### `channels`

Chaque cle de canal est le type de canal. Tous les types de canaux prennent en charge un
champ `classification` pour remplacer le niveau de classification par defaut.

::: info Tous les secrets (tokens, cles API, mots de passe) sont stockes dans le trousseau
du systeme, pas dans ce fichier. Executez `triggerfish config add-channel <nom>` pour saisir
les identifiants de maniere securisee. :::

### `classification`

| Cle    | Type                           | Description                                                                              |
| ------ | ------------------------------ | ---------------------------------------------------------------------------------------- |
| `mode` | `"personal"` ou `"enterprise"` | Mode de deploiement (a venir -- actuellement les deux utilisent les memes niveaux de classification) |

### `policy`

Regles personnalisees evaluees lors de l'execution des hooks. Chaque regle specifie un type de hook,
une priorite, des conditions et une action. Les nombres de priorite plus eleves sont evalues en premier.

### `mcp_servers`

Serveurs d'outils MCP externes. Chaque serveur specifie une commande pour le lancer,
des variables d'environnement optionnelles, un niveau de classification et des permissions
par outil.

### `scheduler`

Definitions de taches cron et timing des triggers. Consultez
[Cron et Triggers](/fr-FR/features/cron-and-triggers) pour les details.

### `notifications`

Preferences de livraison des notifications. Consultez [Notifications](/fr-FR/features/notifications)
pour les details.

### `web`

| Cle                   | Type   | Description                                                           |
| --------------------- | ------ | --------------------------------------------------------------------- |
| `web.search.provider` | string | Backend de recherche pour l'outil `web_search` (actuellement : `brave`) |

Consultez [Recherche et recuperation web](/fr-FR/features/web-search) pour les details.

### `logging`

| Cle     | Type   | Defaut     | Description                                                                                         |
| ------- | ------ | ---------- | --------------------------------------------------------------------------------------------------- |
| `level` | string | `"normal"` | Verbosete des logs : `quiet` (erreurs uniquement), `normal` (info), `verbose` (debug), `debug` (trace) |

Consultez [Journalisation structuree](/fr-FR/features/logging) pour les details sur la sortie des logs et la
rotation des fichiers.

### `github`

| Cle          | Type    | Defaut  | Description                                                                                                                                                                            |
| ------------ | ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `auto_merge` | boolean | `false` | Lorsque `true`, l'agent fusionne automatiquement les PR apres avoir recu une revue approbatrice. Lorsque `false` (defaut), l'agent notifie le proprietaire et attend une instruction de fusion explicite. |

Consultez le guide [Integration GitHub](/fr-FR/integrations/github) pour les instructions de configuration completes.
