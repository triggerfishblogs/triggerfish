# Configuration

Triggerfish est configuré via un seul fichier YAML situé dans
`~/.triggerfish/triggerfish.yaml`. L'assistant de configuration
(`triggerfish dive`) crée ce fichier pour vous, mais vous pouvez le modifier
manuellement à tout moment.

## Emplacement du fichier de configuration

```
~/.triggerfish/triggerfish.yaml
```

Vous pouvez définir des valeurs individuelles depuis la ligne de commande en
utilisant des chemins à points :

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
```

Les valeurs booléennes et entières sont automatiquement converties. Les secrets
sont masqués dans la sortie.

Validez votre configuration avec :

```bash
triggerfish config validate
```

## Modèles

La section `models` configure vos fournisseurs LLM et le comportement de
basculement.

```yaml
models:
  # Quel fournisseur et modèle utiliser par défaut
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929

  # Optionnel : modèle de vision pour la description automatique d'images
  # lorsque le modèle principal ne prend pas en charge la vision
  # vision: gemini-2.0-flash

  # Réponses en streaming (par défaut : true)
  # streaming: true

  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929

    openai:
      model: gpt-4o

    google:
      model: gemini-2.5-pro

    ollama:
      model: llama3
      endpoint: "http://localhost:11434" # Ollama par défaut

    lmstudio:
      model: lmstudio-community/Meta-Llama-3.1-8B-Instruct-GGUF
      endpoint: "http://localhost:1234" # LM Studio par défaut

    openrouter:
      model: anthropic/claude-sonnet-4-5

    zenmux:
      model: openai/gpt-5

    zai:
      model: glm-4.7

  # Chaîne de basculement : si le principal échoue, essayer ceux-ci dans l'ordre
  failover:
    - openai
    - google
```

Les clés API sont stockées dans le trousseau de clés du système d'exploitation,
pas dans ce fichier. L'assistant de configuration (`triggerfish dive`) demande
votre clé API et la stocke de manière sécurisée. Ollama et LM Studio sont
locaux et ne nécessitent aucune authentification.

## Canaux

La section `channels` définit à quelles plateformes de messagerie votre agent se
connecte et le niveau de classification pour chacune.

```yaml
channels:
  cli:
    enabled: true
    classification: INTERNAL

  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL

  signal:
    enabled: true
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
    defaultGroupMode: mentioned-only

  slack:
    enabled: true
    classification: PUBLIC

  discord:
    enabled: true
    ownerId: "your-discord-user-id"
    classification: PUBLIC

  whatsapp:
    enabled: true
    phoneNumberId: "your-phone-number-id"
    classification: PUBLIC

  webchat:
    enabled: true
    classification: PUBLIC
    port: 18790

  email:
    enabled: true
    imapHost: "imap.gmail.com"
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapUser: "you@gmail.com"
    fromAddress: "bot@example.com"
    ownerEmail: "you@gmail.com"
    classification: CONFIDENTIAL
```

Les tokens, mots de passe et clés API de chaque canal sont stockés dans le
trousseau de clés du système d'exploitation. Exécutez
`triggerfish config add-channel <name>` pour entrer les identifiants de manière
interactive -- ils sont enregistrés dans le trousseau, jamais dans ce fichier.

### Clés de configuration des canaux

Configuration non secrète dans `triggerfish.yaml` :

| Canal    | Clés de configuration                                          | Clés optionnelles                                                       |
| -------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| CLI      | `enabled`                                                      | `classification`                                                        |
| Telegram | `enabled`, `ownerId`                                           | `classification`                                                        |
| Signal   | `enabled`, `endpoint`, `account`                               | `classification`, `defaultGroupMode`, `groups`, `ownerPhone`, `pairing` |
| Slack    | `enabled`                                                      | `classification`, `ownerId`                                             |
| Discord  | `enabled`, `ownerId`                                           | `classification`                                                        |
| WhatsApp | `enabled`, `phoneNumberId`                                     | `classification`, `ownerPhone`, `webhookPort`                           |
| WebChat  | `enabled`                                                      | `classification`, `port`, `allowedOrigins`                              |
| Email    | `enabled`, `smtpApiUrl`, `imapHost`, `imapUser`, `fromAddress` | `classification`, `ownerEmail`, `imapPort`, `pollInterval`              |

Les secrets (tokens de bot, clés API, mots de passe, secrets de signature) sont
entrés lors de la configuration du canal et stockés dans le trousseau de clés du
système d'exploitation.

### Niveaux de classification par défaut

| Canal    | Par défaut     |
| -------- | -------------- |
| CLI      | `INTERNAL`     |
| Telegram | `INTERNAL`     |
| Signal   | `PUBLIC`       |
| Slack    | `PUBLIC`       |
| Discord  | `PUBLIC`       |
| WhatsApp | `PUBLIC`       |
| WebChat  | `PUBLIC`       |
| Email    | `CONFIDENTIAL` |

Tous les paramètres par défaut sont configurables. Définissez n'importe quel
canal à n'importe quel niveau de classification.

## Serveurs MCP

Connectez des serveurs MCP externes pour donner à votre agent l'accès à des
outils supplémentaires. Voir
[MCP Gateway](/integrations/mcp-gateway) pour le modèle de sécurité complet.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL
```

Chaque serveur doit avoir un niveau de `classification` ou il sera rejeté (refus
par défaut). Utilisez `command` + `args` pour les serveurs locaux (lancés comme
sous-processus) ou `url` pour les serveurs distants (HTTP SSE). Les valeurs
d'environnement préfixées par `keychain:` sont résolues depuis le trousseau de
clés du système d'exploitation.

Pour vous aider à choisir les niveaux de classification, consultez le
[Guide de classification](./classification-guide).

## Classification

La section `classification` contrôle comment Triggerfish classifie et protège les
données.

```yaml
classification:
  mode: personal # "personal" ou "enterprise" (bientôt disponible)
```

**Niveaux de classification :**

| Niveau         | Description       | Exemples                                                       |
| -------------- | ----------------- | -------------------------------------------------------------- |
| `RESTRICTED`   | Le plus sensible  | Documents M&A, PII, comptes bancaires, dossiers médicaux       |
| `CONFIDENTIAL` | Sensible          | Données CRM, financières, contrats, documents fiscaux          |
| `INTERNAL`     | Interne seulement | Wikis internes, notes personnelles, contacts                   |
| `PUBLIC`       | Visible par tous  | Matériel marketing, informations publiques, contenu web général|

Pour des conseils détaillés sur le choix du bon niveau pour vos intégrations,
canaux et serveurs MCP, consultez le
[Guide de classification](./classification-guide).

## Politique

La section `policy` configure des règles d'application personnalisées au-delà
des protections intégrées.

```yaml
policy:
  # Action par défaut quand aucune règle ne correspond
  default_action: ALLOW

  # Règles personnalisées
  rules:
    # Bloquer les réponses d'outils contenant des motifs de numéro de sécurité sociale
    - hook: POST_TOOL_RESPONSE
      conditions:
        - tool_name: "salesforce.*"
        - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
      action: REDACT
      redaction_pattern: "[SSN REDACTED]"
      log_level: ALERT

    # Limiter le débit des appels API externes
    - hook: PRE_TOOL_CALL
      conditions:
        - tool_category: external_api
      rate_limit: 100/hour
      action: BLOCK
```

::: info Les règles de sécurité fondamentales -- pas de write-down, escalade du
taint de session, journalisation d'audit -- sont toujours appliquées et ne
peuvent pas être désactivées. Les règles de politique personnalisées ajoutent
des contrôles supplémentaires par-dessus ces protections fixes. :::

## Recherche et récupération web

La section `web` configure la recherche web et la récupération de contenu, y
compris les contrôles de sécurité des domaines.

```yaml
web:
  search:
    provider: brave # Backend de recherche (brave est actuellement supporté)
    max_results: 10
    safe_search: moderate # off, moderate, strict
  fetch:
    rate_limit: 10 # Requêtes par minute
    max_content_length: 50000
    timeout: 30000
    default_mode: readability # readability ou raw
  domains:
    denylist:
      - "*.malware-site.com"
    allowlist: [] # Vide = autoriser tout (moins la denylist)
    classifications:
      - pattern: "*.internal.corp"
        classification: CONFIDENTIAL
```

Configurez la recherche depuis la ligne de commande :

```bash
triggerfish config set web.search.provider brave
```

La clé API Brave est entrée lors de `triggerfish dive` et stockée dans le
trousseau de clés du système d'exploitation.

::: tip Obtenez une clé API Brave Search sur
[brave.com/search/api](https://brave.com/search/api/). Le niveau gratuit
inclut 2 000 requêtes/mois. :::

## Tâches cron

Planifiez des tâches récurrentes pour votre agent :

```yaml
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *" # 7h du matin quotidiennement
      task: "Prepare morning briefing with calendar, unread emails, and weather"
      channel: telegram # Où livrer les résultats
      classification: INTERNAL # Plafond max de taint pour cette tâche

    - id: pipeline-check
      schedule: "0 */4 * * *" # Toutes les 4 heures
      task: "Check Salesforce pipeline for changes"
      channel: slack
      classification: CONFIDENTIAL
```

Chaque tâche cron s'exécute dans sa propre session isolée avec un plafond de
classification. Toutes les actions cron passent par les hooks de politique
normaux.

## Timing des triggers

Configurez la fréquence des vérifications proactives de votre agent :

```yaml
trigger:
  interval: 30m # Vérifier toutes les 30 minutes
  classification: INTERNAL # Plafond max de taint pour les sessions trigger
  quiet_hours: "22:00-07:00" # Ne pas déclencher pendant les heures calmes
```

Le système de triggers lit votre fichier `~/.triggerfish/TRIGGER.md` pour
décider quoi vérifier à chaque réveil. Voir
[SPINE et Triggers](./spine-and-triggers) pour les détails sur la rédaction de
votre TRIGGER.md.

## Webhooks

Acceptez des événements entrants de services externes :

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"
```

## Exemple complet

Voici un exemple de configuration complet avec commentaires :

```yaml
# ~/.triggerfish/triggerfish.yaml

# --- Fournisseurs LLM ---
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5-20250929
  providers:
    anthropic:
      model: claude-sonnet-4-5-20250929
    openai:
      model: gpt-4o
  failover:
    - openai

# --- Canaux ---
channels:
  cli:
    enabled: true
    classification: INTERNAL
  telegram:
    enabled: true
    ownerId: 123456789
    classification: INTERNAL
  signal:
    enabled: false
  slack:
    enabled: false

# --- Classification ---
classification:
  mode: personal

# --- Politique ---
policy:
  default_action: ALLOW

# --- Cron ---
cron:
  jobs:
    - id: morning-briefing
      schedule: "0 7 * * *"
      task: "Prepare morning briefing"
      channel: telegram
      classification: INTERNAL

# --- Triggers ---
trigger:
  interval: 30m
  classification: INTERNAL
  quiet_hours: "22:00-07:00"
```

## Prochaines étapes

- Définissez l'identité de votre agent dans [SPINE.md](./spine-and-triggers)
- Configurez la surveillance proactive avec [TRIGGER.md](./spine-and-triggers)
- Découvrez toutes les commandes CLI dans la
  [Référence des commandes](./commands)
