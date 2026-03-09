# WhatsApp

Connectez votre agent Triggerfish a WhatsApp pour pouvoir interagir avec lui
depuis votre telephone. L'adaptateur utilise l'**API WhatsApp Business Cloud**
(l'API HTTP officielle hebergee par Meta), recevant les messages via webhook et
envoyant via REST.

## Classification par defaut

WhatsApp est par defaut en classification `PUBLIC`. Les contacts WhatsApp peuvent
inclure n'importe quelle personne possedant votre numero de telephone, donc
`PUBLIC` est le defaut securise.

## Configuration

### Etape 1 : Creer un compte Meta Business

1. Rendez-vous sur le portail [Meta for Developers](https://developers.facebook.com/)
2. Creez un compte developpeur si vous n'en avez pas
3. Creez une nouvelle application et selectionnez **Business** comme type
   d'application
4. Dans le tableau de bord de votre application, ajoutez le produit **WhatsApp**

### Etape 2 : Obtenir vos identifiants

Depuis la section WhatsApp de votre tableau de bord d'application, collectez ces
valeurs :

- **Access Token** -- Un token d'acces permanent (ou generez-en un temporaire
  pour les tests)
- **Phone Number ID** -- L'identifiant du numero de telephone enregistre aupres
  de WhatsApp Business
- **Verify Token** -- Une chaine que vous choisissez, utilisee pour verifier
  l'enregistrement du webhook

### Etape 3 : Configurer les webhooks

1. Dans les parametres du produit WhatsApp, naviguez vers **Webhooks**
2. Definissez l'URL de rappel vers l'adresse publique de votre serveur (ex. :
   `https://votre-serveur.com:8443/webhook`)
3. Definissez le **Verify Token** a la meme valeur que celle utilisee dans votre
   configuration Triggerfish
4. Abonnez-vous au champ webhook `messages`

::: info URL publique requise Les webhooks WhatsApp necessitent un point de
terminaison HTTPS accessible publiquement. Si vous executez Triggerfish en local,
vous aurez besoin d'un service de tunnel (ex. : ngrok, Cloudflare Tunnel) ou d'un
serveur avec une IP publique. :::

### Etape 4 : Configurer Triggerfish

Ajoutez le canal WhatsApp a votre `triggerfish.yaml` :

```yaml
channels:
  whatsapp:
    # accessToken stocke dans le trousseau de cles du systeme
    phoneNumberId: "your-phone-number-id"
    # verifyToken stocke dans le trousseau de cles du systeme
    ownerPhone: "15551234567"
```

| Option           | Type   | Requis      | Description                                                                    |
| ---------------- | ------ | ----------- | ------------------------------------------------------------------------------ |
| `accessToken`    | string | Oui         | Token d'acces de l'API WhatsApp Business                                       |
| `phoneNumberId`  | string | Oui         | Phone Number ID du tableau de bord Meta Business                               |
| `verifyToken`    | string | Oui         | Token de verification du webhook (vous le choisissez)                          |
| `webhookPort`    | number | Non         | Port d'ecoute des webhooks (defaut : `8443`)                                   |
| `ownerPhone`     | string | Recommande  | Votre numero de telephone pour la verification du proprietaire (ex. : `"15551234567"`) |
| `classification` | string | Non         | Niveau de classification (defaut : `PUBLIC`)                                   |

::: warning Stockez les secrets en securite Ne commitez jamais les tokens d'acces
dans un depot de code source. Utilisez des variables d'environnement ou le
trousseau de cles de votre systeme. :::

### Etape 5 : Demarrer Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envoyez un message depuis votre telephone au numero WhatsApp Business pour
confirmer la connexion.

## Identite du proprietaire

Triggerfish determine le statut de proprietaire en comparant le numero de
telephone de l'expediteur avec le `ownerPhone` configure. Cette verification se
fait dans le code avant que le LLM ne voie le message :

- **Correspondance** -- Le message est une commande du proprietaire
- **Pas de correspondance** -- Le message est une entree externe avec taint
  `PUBLIC`

Si aucun `ownerPhone` n'est configure, tous les messages sont traites comme
provenant du proprietaire.

::: tip Definissez toujours le telephone du proprietaire Si d'autres personnes
sont susceptibles d'envoyer des messages a votre numero WhatsApp Business,
configurez toujours `ownerPhone` pour empecher l'execution non autorisee de
commandes. :::

## Fonctionnement du webhook

L'adaptateur demarre un serveur HTTP sur le port configure (defaut `8443`) qui
gere deux types de requetes :

1. **GET /webhook** -- Meta envoie ceci pour verifier votre point de terminaison
   webhook. Triggerfish repond avec le token de defi si le token de verification
   correspond.
2. **POST /webhook** -- Meta envoie les messages entrants ici. Triggerfish analyse
   la charge utile du webhook de l'API Cloud, extrait les messages texte et les
   transmet au gestionnaire de messages.

## Limites de message

WhatsApp prend en charge les messages jusqu'a 4 096 caracteres. Les messages
depassant cette limite sont decoupes en plusieurs messages avant l'envoi.

## Indicateurs de saisie

Triggerfish envoie et recoit des indicateurs de saisie sur WhatsApp. Lorsque votre
agent traite une requete, le chat affiche un indicateur de saisie. Les accuses de
lecture sont egalement pris en charge.

## Modification de la classification

```yaml
channels:
  whatsapp:
    # accessToken stocke dans le trousseau de cles du systeme
    phoneNumberId: "your-phone-number-id"
    # verifyToken stocke dans le trousseau de cles du systeme
    classification: INTERNAL
```

Niveaux valides : `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
