# Discord

Connectez votre agent Triggerfish a Discord pour qu'il puisse repondre dans les
canaux du serveur et les messages directs. L'adaptateur utilise
[discord.js](https://discord.js.org/) pour se connecter au Gateway Discord.

## Classification par defaut

Discord est par defaut en classification `PUBLIC`. Les serveurs Discord incluent
souvent un melange de membres de confiance et de visiteurs publics, donc `PUBLIC`
est le defaut securise. Vous pouvez augmenter ce niveau si votre serveur est prive
et de confiance.

## Configuration

### Etape 1 : Creer une application Discord

1. Rendez-vous sur le
   [portail developpeur Discord](https://discord.com/developers/applications)
2. Cliquez sur **New Application**
3. Nommez votre application (ex. : "Triggerfish")
4. Cliquez sur **Create**

### Etape 2 : Creer un utilisateur bot

1. Dans votre application, naviguez vers **Bot** dans la barre laterale
2. Cliquez sur **Add Bot** (si pas deja cree)
3. Sous le nom d'utilisateur du bot, cliquez sur **Reset Token** pour generer un
   nouveau token
4. Copiez le **token de bot**

::: warning Gardez votre token secret Votre token de bot donne le controle total
de votre bot. Ne le commitez jamais dans un depot de code source et ne le partagez
pas publiquement. :::

### Etape 3 : Configurer les intents privilegies

Toujours sur la page **Bot**, activez ces intents privilegies du gateway :

- **Message Content Intent** -- Requis pour lire le contenu des messages
- **Server Members Intent** -- Optionnel, pour la recherche de membres

### Etape 4 : Obtenir votre ID utilisateur Discord

1. Ouvrez Discord
2. Allez dans **Parametres** > **Avance** et activez le **Mode developpeur**
3. Cliquez sur votre nom d'utilisateur n'importe ou dans Discord
4. Cliquez sur **Copier l'ID utilisateur**

C'est l'identifiant snowflake que Triggerfish utilise pour verifier l'identite
du proprietaire.

### Etape 5 : Generer un lien d'invitation

1. Dans le portail developpeur, naviguez vers **OAuth2** > **URL Generator**
2. Sous **Scopes**, selectionnez `bot`
3. Sous **Bot Permissions**, selectionnez :
   - Send Messages
   - Read Message History
   - View Channels
4. Copiez l'URL generee et ouvrez-la dans votre navigateur
5. Selectionnez le serveur ou ajouter le bot et cliquez sur **Authorize**

### Etape 6 : Configurer Triggerfish

Ajoutez le canal Discord a votre `triggerfish.yaml` :

```yaml
channels:
  discord:
    # botToken stocke dans le trousseau de cles du systeme
    ownerId: "123456789012345678"
```

| Option           | Type   | Requis      | Description                                                             |
| ---------------- | ------ | ----------- | ----------------------------------------------------------------------- |
| `botToken`       | string | Oui         | Token du bot Discord                                                    |
| `ownerId`        | string | Recommande  | Votre ID utilisateur Discord (snowflake) pour la verification du proprietaire |
| `classification` | string | Non         | Niveau de classification (defaut : `PUBLIC`)                            |

### Etape 7 : Demarrer Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envoyez un message dans un canal ou le bot est present, ou envoyez-lui un DM
directement, pour confirmer la connexion.

## Identite du proprietaire

Triggerfish determine le statut de proprietaire en comparant l'ID utilisateur
Discord de l'expediteur avec le `ownerId` configure. Cette verification se fait
dans le code avant que le LLM ne voie le message :

- **Correspondance** -- Le message est une commande du proprietaire
- **Pas de correspondance** -- Le message est une entree externe avec taint
  `PUBLIC`

Si aucun `ownerId` n'est configure, tous les messages sont traites comme
provenant du proprietaire.

::: danger Definissez toujours l'ID proprietaire Si votre bot est dans un serveur
avec d'autres membres, configurez toujours `ownerId`. Sans cela, n'importe quel
membre du serveur peut envoyer des commandes a votre agent. :::

## Decoupage des messages

Discord a une limite de message de 2 000 caracteres. Lorsque l'agent genere une
reponse plus longue, Triggerfish la decoupe automatiquement en plusieurs messages.
Le decoupage se fait sur les retours a la ligne ou les espaces pour preserver la
lisibilite.

## Comportement du bot

L'adaptateur Discord :

- **Ignore ses propres messages** -- Le bot ne repondra pas aux messages qu'il
  envoie
- **Ecoute dans tous les canaux accessibles** -- Canaux de guilde, DM de groupe
  et messages directs
- **Necessite le Message Content Intent** -- Sans cela, le bot recoit des
  evenements de message vides

## Indicateurs de saisie

Triggerfish envoie des indicateurs de saisie a Discord lorsque l'agent traite une
requete. Discord n'expose pas les evenements de saisie des utilisateurs aux bots
de maniere fiable, donc c'est en envoi seul.

## Discussion de groupe

Le bot peut participer dans les canaux du serveur. Configurez le comportement de
groupe :

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Comportement     | Description                                       |
| ---------------- | ------------------------------------------------- |
| `mentioned-only` | Repondre uniquement lorsque le bot est @mentionne |
| `always`         | Repondre a tous les messages du canal             |

## Modification de la classification

```yaml
channels:
  discord:
    # botToken stocke dans le trousseau de cles du systeme
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Niveaux valides : `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
