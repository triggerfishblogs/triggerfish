# Slack

Connectez votre agent Triggerfish a Slack pour que votre agent puisse participer
aux conversations de l'espace de travail. L'adaptateur utilise le framework
[Bolt](https://slack.dev/bolt-js/) avec Socket Mode, ce qui signifie qu'aucune
URL publique ni point de terminaison webhook n'est necessaire.

## Classification par defaut

Slack est par defaut en classification `PUBLIC`. Cela reflete la realite selon
laquelle les espaces de travail Slack incluent souvent des invites externes, des
utilisateurs Slack Connect et des canaux partages. Vous pouvez augmenter ce
niveau a `INTERNAL` ou plus si votre espace de travail est strictement interne.

## Configuration

### Etape 1 : Creer une application Slack

1. Rendez-vous sur [api.slack.com/apps](https://api.slack.com/apps)
2. Cliquez sur **Create New App**
3. Choisissez **From scratch**
4. Nommez votre application (ex. : "Triggerfish") et selectionnez votre espace de
   travail
5. Cliquez sur **Create App**

### Etape 2 : Configurer les scopes du token bot

Naviguez vers **OAuth & Permissions** dans la barre laterale et ajoutez les
**Bot Token Scopes** suivants :

| Scope              | Objectif                                      |
| ------------------ | --------------------------------------------- |
| `chat:write`       | Envoyer des messages                          |
| `channels:history` | Lire les messages dans les canaux publics      |
| `groups:history`   | Lire les messages dans les canaux prives       |
| `im:history`       | Lire les messages directs                      |
| `mpim:history`     | Lire les messages directs de groupe            |
| `channels:read`    | Lister les canaux publics                      |
| `groups:read`      | Lister les canaux prives                       |
| `im:read`          | Lister les conversations en messages directs   |
| `users:read`       | Consulter les informations des utilisateurs    |

### Etape 3 : Activer Socket Mode

1. Naviguez vers **Socket Mode** dans la barre laterale
2. Basculez **Enable Socket Mode** sur active
3. Vous serez invite a creer un **App-Level Token** -- nommez-le (ex. :
   "triggerfish-socket") et ajoutez le scope `connections:write`
4. Copiez le **App Token** genere (commence par `xapp-`)

### Etape 4 : Activer les evenements

1. Naviguez vers **Event Subscriptions** dans la barre laterale
2. Basculez **Enable Events** sur active
3. Sous **Subscribe to bot events**, ajoutez :
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Etape 5 : Obtenir vos identifiants

Vous avez besoin de trois valeurs :

- **Bot Token** -- Allez dans **OAuth & Permissions**, cliquez sur **Install to
  Workspace**, puis copiez le **Bot User OAuth Token** (commence par `xoxb-`)
- **App Token** -- Le token que vous avez cree a l'etape 3 (commence par `xapp-`)
- **Signing Secret** -- Allez dans **Basic Information**, descendez jusqu'a
  **App Credentials** et copiez le **Signing Secret**

### Etape 6 : Obtenir votre ID utilisateur Slack

Pour configurer l'identite du proprietaire :

1. Ouvrez Slack
2. Cliquez sur votre photo de profil en haut a droite
3. Cliquez sur **Profile**
4. Cliquez sur le menu trois points et selectionnez **Copy member ID**

### Etape 7 : Configurer Triggerfish

Ajoutez le canal Slack a votre `triggerfish.yaml` :

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret stockes dans le trousseau de cles du systeme
    ownerId: "U01234ABC"
```

Les secrets (token bot, token app, signing secret) sont saisis lors de
`triggerfish config add-channel slack` et stockes dans le trousseau de cles du
systeme.

| Option           | Type   | Requis      | Description                                                |
| ---------------- | ------ | ----------- | ---------------------------------------------------------- |
| `ownerId`        | string | Recommande  | Votre ID membre Slack pour la verification du proprietaire |
| `classification` | string | Non         | Niveau de classification (defaut : `PUBLIC`)               |

::: warning Stockez les secrets en securite Ne commitez jamais les tokens ou
secrets dans un depot de code source. Utilisez des variables d'environnement ou
le trousseau de cles de votre systeme. Consultez
[Gestion des secrets](/fr-FR/security/secrets) pour plus de details. :::

### Etape 8 : Inviter le bot

Avant que le bot puisse lire ou envoyer des messages dans un canal, vous devez
l'inviter :

1. Ouvrez le canal Slack ou vous souhaitez que le bot soit present
2. Tapez `/invite @Triggerfish` (ou le nom que vous avez donne a votre application)

Le bot peut egalement recevoir des messages directs sans etre invite dans un canal.

### Etape 9 : Demarrer Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envoyez un message dans un canal ou le bot est present, ou envoyez-lui un DM
directement, pour confirmer la connexion.

## Identite du proprietaire

Triggerfish utilise le flux OAuth de Slack pour la verification du proprietaire.
Lorsqu'un message arrive, l'adaptateur compare l'ID utilisateur Slack de
l'expediteur avec le `ownerId` configure :

- **Correspondance** -- Commande du proprietaire
- **Pas de correspondance** -- Entree externe avec taint `PUBLIC`

### Appartenance a l'espace de travail

Pour la classification des destinataires, l'appartenance a l'espace de travail
Slack determine si une personne est `INTERNAL` ou `EXTERNAL` :

- Les membres reguliers de l'espace de travail sont `INTERNAL`
- Les utilisateurs Slack Connect externes sont `EXTERNAL`
- Les utilisateurs invites sont `EXTERNAL`

## Limites de message

Slack prend en charge les messages jusqu'a 40 000 caracteres. Les messages
depassant cette limite sont tronques. Pour la plupart des reponses de l'agent,
cette limite n'est jamais atteinte.

## Indicateurs de saisie

Triggerfish envoie des indicateurs de saisie a Slack lorsque l'agent traite une
requete. Slack n'expose pas les evenements de saisie entrants aux bots, donc
c'est en envoi seul.

## Discussion de groupe

Le bot peut participer dans les canaux de groupe. Configurez le comportement de
groupe dans votre `triggerfish.yaml` :

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| Comportement     | Description                                       |
| ---------------- | ------------------------------------------------- |
| `mentioned-only` | Repondre uniquement lorsque le bot est @mentionne |
| `always`         | Repondre a tous les messages du canal             |

## Modification de la classification

```yaml
channels:
  slack:
    classification: INTERNAL
```

Niveaux valides : `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
