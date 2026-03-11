# Apercu multicanal

Triggerfish se connecte a vos plateformes de messagerie existantes. Vous
communiquez avec votre agent la ou vous communiquez deja -- terminal, Telegram,
Slack, Discord, WhatsApp, un widget web ou par email. Chaque canal possede son
propre niveau de classification, ses verifications d'identite du proprietaire et
son application des politiques.

## Fonctionnement des canaux

Chaque adaptateur de canal implemente la meme interface : `connect`, `disconnect`,
`send`, `onMessage` et `status`. Le **routeur de canaux** se situe au-dessus de
tous les adaptateurs et gere la distribution des messages, les verifications de
classification et la logique de nouvelle tentative.

<img src="/diagrams/channel-router.svg" alt="Routeur de canaux : tous les adaptateurs de canaux passent par une porte de classification centrale vers le Gateway Server" style="max-width: 100%;" />

Lorsqu'un message arrive sur un canal quelconque, le routeur :

1. Identifie l'expediteur ou l'expeditrice (proprietaire ou externe) a l'aide de
   **verifications d'identite au niveau du code** -- et non par interpretation LLM
2. Etiquette le message avec le niveau de classification du canal
3. Le transmet au moteur de politiques pour application
4. Achemine la reponse de l'agent via le meme canal

## Classification des canaux

Chaque canal possede un niveau de classification par defaut qui determine quelles
donnees peuvent y transiter. Le moteur de politiques applique la **regle de non
ecriture descendante** : les donnees a un niveau de classification donne ne
peuvent jamais transiter vers un canal de classification inferieure.

| Canal                                   | Classification par defaut | Detection du proprietaire                      |
| --------------------------------------- | :-----------------------: | ---------------------------------------------- |
| [CLI](/fr-FR/channels/cli)              |        `INTERNAL`         | Toujours proprietaire (utilisateur du terminal) |
| [Telegram](/fr-FR/channels/telegram)    |        `INTERNAL`         | Correspondance de l'ID utilisateur Telegram     |
| [Signal](/fr-FR/channels/signal)        |         `PUBLIC`          | Jamais proprietaire (l'adaptateur EST votre telephone) |
| [Slack](/fr-FR/channels/slack)          |         `PUBLIC`          | ID utilisateur Slack via OAuth                  |
| [Discord](/fr-FR/channels/discord)      |         `PUBLIC`          | Correspondance de l'ID utilisateur Discord      |
| [WhatsApp](/fr-FR/channels/whatsapp)    |         `PUBLIC`          | Correspondance du numero de telephone           |
| [WebChat](/fr-FR/channels/webchat)      |         `PUBLIC`          | Jamais proprietaire (visiteurs)                 |
| [Email](/fr-FR/channels/email)          |      `CONFIDENTIAL`       | Correspondance de l'adresse email               |

::: tip Entierement configurable Toutes les classifications sont configurables
dans votre `triggerfish.yaml`. Vous pouvez definir n'importe quel canal a
n'importe quel niveau de classification selon vos exigences de securite.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Classification effective

La classification effective pour tout message est le **minimum** entre la
classification du canal et la classification du destinataire :

| Niveau du canal | Niveau du destinataire | Niveau effectif |
| --------------- | ---------------------- | --------------- |
| INTERNAL        | INTERNAL               | INTERNAL        |
| INTERNAL        | EXTERNAL               | PUBLIC          |
| CONFIDENTIAL    | INTERNAL               | INTERNAL        |
| CONFIDENTIAL    | EXTERNAL               | PUBLIC          |

Cela signifie que meme si un canal est classifie `CONFIDENTIAL`, les messages
destines a des destinataires externes sur ce canal sont traites comme `PUBLIC`.

## Etats des canaux

Les canaux passent par des etats definis :

- **UNTRUSTED** -- Les canaux nouveaux ou inconnus commencent ici. Aucune donnee
  ne transite. Le canal est completement isole tant que vous ne le classifiez pas.
- **CLASSIFIED** -- Le canal possede un niveau de classification attribue et est
  actif. Les messages transitent selon les regles de politique.
- **BLOCKED** -- Le canal a ete explicitement desactive. Aucun message n'est
  traite.

::: warning Canaux UNTRUSTED Un canal `UNTRUSTED` ne peut recevoir aucune donnee
de l'agent et ne peut envoyer de donnees dans le contexte de l'agent. Il s'agit
d'une frontiere de securite stricte, pas d'une suggestion. :::

## Routeur de canaux

Le routeur de canaux gere tous les adaptateurs enregistres et fournit :

- **Enregistrement d'adaptateurs** -- Enregistrer et desenregistrer les
  adaptateurs de canaux par identifiant de canal
- **Distribution des messages** -- Acheminer les messages sortants vers
  l'adaptateur approprie
- **Nouvelle tentative avec backoff exponentiel** -- Les envois echoues sont
  reessayes jusqu'a 3 fois avec des delais croissants (1s, 2s, 4s)
- **Operations groupees** -- `connectAll()` et `disconnectAll()` pour la gestion
  du cycle de vie

```yaml
# Le comportement de nouvelle tentative du routeur est configurable
router:
  maxRetries: 3
  baseDelay: 1000 # millisecondes
```

## Ripple : indicateurs de saisie et presence

Triggerfish relaie les indicateurs de saisie et l'etat de presence entre les
canaux qui les prennent en charge. C'est ce qu'on appelle **Ripple**.

| Canal    | Indicateurs de saisie | Accuses de lecture |
| -------- | :-------------------: | :----------------: |
| Telegram |  Envoi et reception   |        Oui         |
| Signal   |  Envoi et reception   |         --         |
| Slack    |     Envoi seul        |         --         |
| Discord  |     Envoi seul        |         --         |
| WhatsApp |  Envoi et reception   |        Oui         |
| WebChat  |  Envoi et reception   |        Oui         |

Etats de presence de l'agent : `idle`, `online`, `away`, `busy`, `processing`,
`speaking`, `error`.

## Decoupage des messages

Les plateformes ont des limites de longueur de message. Triggerfish decoupe
automatiquement les longues reponses pour respecter les contraintes de chaque
plateforme, en coupant sur les retours a la ligne ou les espaces pour la
lisibilite :

| Canal    | Longueur maximale du message |
| -------- | :--------------------------: |
| Telegram |     4 096 caracteres         |
| Signal   |     4 000 caracteres         |
| Discord  |     2 000 caracteres         |
| Slack    |    40 000 caracteres         |
| WhatsApp |     4 096 caracteres         |
| WebChat  |         Illimite             |

## Etapes suivantes

Configurez les canaux que vous utilisez :

- [CLI](/fr-FR/channels/cli) -- Toujours disponible, aucune configuration necessaire
- [Telegram](/fr-FR/channels/telegram) -- Creez un bot via @BotFather
- [Signal](/fr-FR/channels/signal) -- Liez via le daemon signal-cli
- [Slack](/fr-FR/channels/slack) -- Creez une application Slack avec Socket Mode
- [Discord](/fr-FR/channels/discord) -- Creez une application bot Discord
- [WhatsApp](/fr-FR/channels/whatsapp) -- Connectez via l'API WhatsApp Business Cloud
- [WebChat](/fr-FR/channels/webchat) -- Integrez un widget de chat sur votre site
- [Email](/fr-FR/channels/email) -- Connectez via IMAP et relais SMTP
