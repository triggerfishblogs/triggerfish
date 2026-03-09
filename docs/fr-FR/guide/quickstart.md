# Démarrage rapide

Ce guide vous accompagne durant vos 5 premières minutes avec Triggerfish -- du
lancement de l'assistant de configuration jusqu'à un agent IA fonctionnel avec
lequel vous pouvez discuter.

## Lancer l'assistant de configuration

Si vous avez utilisé l'installateur en une commande, l'assistant a déjà été
exécuté lors de l'installation. Pour le relancer ou repartir de zéro :

```bash
triggerfish dive
```

L'assistant vous guide à travers huit étapes :

### Étape 1 : Choisir votre fournisseur LLM

```
Step 1/8: Choose your LLM provider
  > Triggerfish Gateway — no API keys needed
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Local (Ollama)
    OpenRouter
```

Sélectionnez un fournisseur et entrez vos identifiants. Triggerfish prend en
charge plusieurs fournisseurs avec basculement automatique. **Triggerfish
Gateway** est l'option la plus simple — abonnez-vous à un
[forfait Pro ou Power](/fr-FR/pricing), et votre agent se connecte à une
infrastructure LLM et de recherche gérée sans aucune clé API à configurer.

### Étape 2 : Nommer votre agent

```
Step 2/8: Name your agent and set its personality
  Agent name: Reef
  Mission (one sentence): Help me stay organized and informed
  Tone: > Professional  Casual  Terse  Custom
```

Cela génère votre fichier `SPINE.md` -- la base du prompt système de votre
agent. Vous pouvez le modifier à tout moment dans `~/.triggerfish/SPINE.md`.

### Étape 3 : Connecter un canal

```
Step 3/8: Connect your first channel
  > CLI (already available)
    WebChat
    Telegram (enter bot token)
    Skip for now
```

Choisissez une plateforme de messagerie ou ignorez cette étape pour commencer
avec le CLI uniquement. Vous pourrez ajouter des canaux plus tard dans votre
`triggerfish.yaml`.

### Étape 4 : Plugins optionnels

```
Step 4/8: Install optional plugins
  > Obsidian
    Skip
```

Connectez des intégrations optionnelles comme Obsidian pour la prise de notes.

### Étape 5 : Connecter Google Workspace (optionnel)

Connectez votre compte Google pour Gmail, Calendrier, Tâches, Drive et Sheets
via OAuth2. Vous pouvez ignorer cette étape et vous connecter plus tard avec
`triggerfish connect google`.

### Étape 6 : Connecter GitHub (optionnel)

Connectez GitHub en collant un Personal Access Token. Donne à l'agent des
outils pour les dépôts, les PR, les issues et Actions. Vous pouvez ignorer
cette étape et vous connecter plus tard avec `triggerfish connect github`.

### Étape 7 : Configurer la recherche web

Choisissez un moteur de recherche (Brave Search ou SearXNG auto-hébergé) que
votre agent pourra utiliser, ou ignorez pour le moment.

### Étape 8 : Démarrer le daemon

```
Step 8/8: Install as daemon?
  > Yes (start on login, runs in background)
    No (manual start only)
```

Choisissez Oui pour que votre agent fonctionne dès que votre machine est
allumée.

## Commencer à discuter

Après la fin de l'assistant, vous pouvez commencer à discuter immédiatement via
le CLI :

```bash
triggerfish chat
```

Ou, si vous avez connecté un canal de messagerie, envoyez un message à votre
agent depuis celui-ci.

### Exemple de conversation

```
You: What can you help me with?

Reef: I can help you with a wide range of tasks. Here are some things
I'm set up for:

  - Answer questions and have conversations
  - Manage your calendar and schedule
  - Summarize emails and messages
  - Write and edit documents
  - Run code in a sandboxed environment
  - Search the web for information
  - Automate recurring tasks with cron jobs

What would you like to start with?

You: Set up a morning briefing every day at 7am

Reef: I've created a cron job for your morning briefing:

  Schedule: Every day at 7:00 AM
  Task: Prepare briefing with calendar events, unread emails,
        and weather forecast
  Delivery: CLI (add a channel in config to get it on Telegram/Slack)

You'll receive your first briefing tomorrow morning. You can manage
cron jobs anytime with /cron list.
```

## Vérifier votre configuration

Lancez la vérification de santé pour vous assurer que tout fonctionne :

```bash
triggerfish patrol
```

```
Triggerfish Health Check

  Gateway running (PID 12345, uptime 2m)
  LLM provider connected (Anthropic, Claude Sonnet 4.5)
  1 channel active (CLI)
  Policy engine loaded (4 rules)
  3 skills installed (3 bundled)

Overall: HEALTHY
```

## Que faire ensuite

- **Personnaliser votre agent** -- modifiez `~/.triggerfish/SPINE.md` pour
  affiner la personnalité et les capacités de votre agent. Voir
  [SPINE et Triggers](./spine-and-triggers).
- **Ajouter plus de canaux** -- connectez Telegram, Slack, Discord ou WhatsApp
  dans votre `triggerfish.yaml`. Voir [Configuration](./configuration).
- **Connecter des intégrations** -- `triggerfish connect google` pour Google
  Workspace, `triggerfish connect github` pour GitHub.
- **Configurer le comportement proactif** -- créez un
  `~/.triggerfish/TRIGGER.md` pour indiquer à votre agent ce qu'il doit
  surveiller. Voir [SPINE et Triggers](./spine-and-triggers).
- **Explorer les commandes** -- découvrez toutes les commandes CLI et de chat
  disponibles. Voir [Commandes CLI](./commands).
