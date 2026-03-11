# SPINE et Triggers

Triggerfish utilise deux fichiers markdown pour définir le comportement de votre
agent : **SPINE.md** contrôle l'identité de votre agent, et **TRIGGER.md**
contrôle ce que votre agent fait de manière proactive. Les deux sont en markdown
libre -- vous les rédigez en français courant.

## SPINE.md -- Identité de l'agent

`SPINE.md` est la base du prompt système de votre agent. Il définit le nom de
l'agent, sa personnalité, sa mission, ses domaines de connaissance et ses
limites. Triggerfish charge ce fichier à chaque traitement de message, donc les
modifications prennent effet immédiatement.

### Emplacement du fichier

```
~/.triggerfish/SPINE.md
```

Pour les configurations multi-agents, chaque agent a son propre SPINE.md :

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### Pour commencer

L'assistant de configuration (`triggerfish dive`) génère un SPINE.md de
démarrage basé sur vos réponses. Vous pouvez le modifier librement à tout moment
-- c'est simplement du markdown.

### Rédiger un SPINE.md efficace

Un bon SPINE.md est spécifique. Plus vous êtes concret·e sur le rôle de votre
agent, mieux il performe. Voici une structure recommandée :

```markdown
# Identity

You are Reef, a personal AI assistant for Sarah.

# Mission

Help Sarah stay organized, informed, and productive. Prioritize calendar
management, email triage, and task tracking.

# Communication Style

- Be concise and direct. No filler.
- Use bullet points for lists of 3+ items.
- When uncertain, say so rather than guessing.
- Match the formality of the channel: casual on WhatsApp, professional on Slack.

# Domain Knowledge

- Sarah is a product manager at Acme Corp.
- Key tools: Linear for tasks, Google Calendar, Gmail, Slack.
- VIP contacts: @boss (David Chen), @skip (Maria Lopez).
- Current priorities: Q2 roadmap, mobile app launch.

# Boundaries

- Never send messages to external contacts without explicit approval.
- Never make financial transactions.
- Always confirm before deleting or modifying calendar events.
- When discussing work topics on personal channels, remind Sarah about
  classification boundaries.

# Response Preferences

- Default to short responses (2-3 sentences).
- Use longer responses only when the question requires detail.
- For code, include brief comments explaining key decisions.
```

### Bonnes pratiques

::: tip **Soyez précis·e sur la personnalité.** Au lieu de « sois utile »,
écrivez « sois concis, direct et utilise des listes à puces pour la clarté. »
:::

::: tip **Incluez du contexte sur le ou la propriétaire.** L'agent performe
mieux quand il connaît votre rôle, vos outils et vos priorités. :::

::: tip **Définissez des limites explicites.** Définissez ce que l'agent ne doit
jamais faire. Cela complète (mais ne remplace pas) l'application déterministe du
moteur de politiques. :::

::: warning Les instructions de SPINE.md guident le comportement du LLM mais ne
sont pas des contrôles de sécurité. Pour des restrictions applicables, utilisez
le moteur de politiques dans `triggerfish.yaml`. Le moteur de politiques est
déterministe et ne peut pas être contourné -- les instructions de SPINE.md
peuvent l'être. :::

## TRIGGER.md -- Comportement proactif

`TRIGGER.md` définit ce que votre agent doit vérifier, surveiller et sur quoi
agir lors des réveils périodiques. Contrairement aux tâches cron (qui exécutent
des tâches fixes selon un calendrier), les triggers donnent à l'agent la
discrétion d'évaluer les conditions et de décider si une action est nécessaire.

### Emplacement du fichier

```
~/.triggerfish/TRIGGER.md
```

Pour les configurations multi-agents :

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Comment fonctionnent les triggers

1. La boucle de trigger réveille l'agent à un intervalle configuré (défini dans
   `triggerfish.yaml`)
2. Triggerfish charge votre TRIGGER.md et le présente à l'agent
3. L'agent évalue chaque élément et agit si nécessaire
4. Toutes les actions de trigger passent par les hooks de politique normaux
5. La session de trigger s'exécute avec un plafond de classification (également
   configuré dans le YAML)
6. Les heures calmes sont respectées -- aucun trigger ne se déclenche pendant
   ces périodes

### Configuration des triggers dans le YAML

Définissez le timing et les contraintes dans votre `triggerfish.yaml` :

```yaml
trigger:
  interval: 30m # Vérifier toutes les 30 minutes
  classification: INTERNAL # Plafond max de taint pour les sessions trigger
  quiet_hours: "22:00-07:00" # Pas de réveils pendant ces heures
```

### Rédiger TRIGGER.md

Organisez vos triggers par priorité. Soyez précis·e sur ce qui compte comme
actionnable et ce que l'agent doit faire à ce sujet.

```markdown
# Priority Checks

- Unread messages across all channels older than 1 hour -- summarize and notify
  on primary channel.
- Calendar conflicts in the next 24 hours -- flag and suggest resolution.
- Overdue tasks in Linear -- list them with days overdue.

# Monitoring

- GitHub: PRs awaiting my review -- notify if older than 4 hours.
- Email: anything from VIP contacts (David Chen, Maria Lopez) -- flag for
  immediate notification regardless of quiet hours.
- Slack: mentions in #incidents channel -- summarize and escalate if unresolved.

# Proactive

- If morning (7-9am), prepare daily briefing with calendar, weather, and top 3
  priorities.
- If Friday afternoon, draft weekly summary of completed tasks and open items.
- If inbox count exceeds 50 unread, offer to batch-triage.
```

### Exemple : TRIGGER.md minimal

Si vous souhaitez un point de départ simple :

```markdown
# Check on each wakeup

- Any unread messages older than 1 hour
- Calendar events in the next 4 hours
- Anything urgent in email
```

### Exemple : TRIGGER.md orienté développement

```markdown
# High Priority

- CI failures on main branch -- investigate and notify.
- PRs awaiting my review older than 2 hours.
- Sentry errors with "critical" severity in the last hour.

# Monitoring

- Dependabot PRs -- auto-approve patch updates, flag minor/major.
- Build times trending above 10 minutes -- report weekly.
- Open issues assigned to me with no updates in 3 days.

# Daily

- Morning: summarize overnight CI runs and deploy status.
- End of day: list PRs I opened that are still pending review.
```

### Triggers et le moteur de politiques

Toutes les actions de trigger sont soumises à la même application des politiques
que les conversations interactives :

- Chaque réveil de trigger crée une session isolée avec son propre suivi de
  taint
- Le plafond de classification dans votre configuration YAML limite les données
  auxquelles le trigger peut accéder
- La règle de non write-down s'applique -- si un trigger accède à des données
  confidentielles, il ne peut pas envoyer les résultats vers un canal public
- Toutes les actions de trigger sont journalisées dans la piste d'audit

::: info Si TRIGGER.md est absent, les réveils de trigger se produisent
toujours à l'intervalle configuré. L'agent utilise ses connaissances générales
et SPINE.md pour décider ce qui nécessite attention. Pour de meilleurs
résultats, rédigez un TRIGGER.md. :::

## SPINE.md vs TRIGGER.md

| Aspect    | SPINE.md                             | TRIGGER.md                           |
| --------- | ------------------------------------ | ------------------------------------ |
| Objectif  | Définir qui est l'agent              | Définir ce que l'agent surveille     |
| Chargé    | À chaque message                     | À chaque réveil de trigger           |
| Portée    | Toutes les conversations             | Sessions de trigger uniquement       |
| Affecte   | Personnalité, connaissances, limites | Vérifications et actions proactives  |
| Requis    | Oui (généré par l'assistant dive)    | Non (mais recommandé)                |

## Prochaines étapes

- Configurez le timing des triggers et les tâches cron dans votre
  [triggerfish.yaml](./configuration)
- Découvrez toutes les commandes CLI disponibles dans la
  [Référence des commandes](./commands)
