# Email

Connectez votre agent Triggerfish a l'email pour qu'il puisse recevoir des
messages via IMAP et envoyer des reponses via un service de relais SMTP.
L'adaptateur prend en charge des services comme SendGrid, Mailgun et Amazon SES
pour les emails sortants, et interroge n'importe quel serveur IMAP pour les
messages entrants.

## Classification par defaut

Email est par defaut en classification `CONFIDENTIAL`. Les emails contiennent
souvent du contenu sensible (contrats, notifications de compte, correspondance
personnelle), donc `CONFIDENTIAL` est le defaut securise.

## Configuration

### Etape 1 : Choisir un relais SMTP

Triggerfish envoie les emails sortants via une API de relais SMTP basee sur HTTP.
Les services pris en charge incluent :

| Service    | Point de terminaison API                                         |
| ---------- | ---------------------------------------------------------------- |
| SendGrid   | `https://api.sendgrid.com/v3/mail/send`                          |
| Mailgun    | `https://api.mailgun.net/v3/VOTRE_DOMAINE/messages`              |
| Amazon SES | `https://email.us-east-1.amazonaws.com/v2/email/outbound-emails` |

Inscrivez-vous a l'un de ces services et obtenez une cle API.

### Etape 2 : Configurer IMAP pour la reception

Vous avez besoin d'identifiants IMAP pour recevoir les emails. La plupart des
fournisseurs de messagerie prennent en charge IMAP :

| Fournisseur | Hote IMAP               | Port |
| ----------- | ----------------------- | ---- |
| Gmail       | `imap.gmail.com`        | 993  |
| Outlook     | `outlook.office365.com` | 993  |
| Fastmail    | `imap.fastmail.com`     | 993  |
| Personnalise | Votre serveur de messagerie | 993 |

::: info Mots de passe d'application Gmail Si vous utilisez Gmail avec
l'authentification a deux facteurs, vous devrez generer un
[mot de passe d'application](https://myaccount.google.com/apppasswords) pour
l'acces IMAP. Votre mot de passe Gmail habituel ne fonctionnera pas. :::

### Etape 3 : Configurer Triggerfish

Ajoutez le canal Email a votre `triggerfish.yaml` :

```yaml
channels:
  email:
    smtpApiUrl: "https://api.sendgrid.com/v3/mail/send"
    imapHost: "imap.gmail.com"
    imapPort: 993
    imapUser: "vous@gmail.com"
    fromAddress: "triggerfish@votredomaine.com"
    ownerEmail: "vous@gmail.com"
```

Les secrets (cle API SMTP, mot de passe IMAP) sont saisis lors de
`triggerfish config add-channel email` et stockes dans le trousseau de cles du
systeme.

| Option           | Type   | Requis      | Description                                                       |
| ---------------- | ------ | ----------- | ----------------------------------------------------------------- |
| `smtpApiUrl`     | string | Oui         | URL du point de terminaison de l'API de relais SMTP               |
| `imapHost`       | string | Oui         | Nom d'hote du serveur IMAP                                        |
| `imapPort`       | number | Non         | Port du serveur IMAP (defaut : `993`)                             |
| `imapUser`       | string | Oui         | Nom d'utilisateur IMAP (generalement votre adresse email)         |
| `fromAddress`    | string | Oui         | Adresse d'expedition pour les emails sortants                     |
| `pollInterval`   | number | Non         | Frequence de verification des nouveaux emails, en ms (defaut : `30000`) |
| `classification` | string | Non         | Niveau de classification (defaut : `CONFIDENTIAL`)                |
| `ownerEmail`     | string | Recommande  | Votre adresse email pour la verification du proprietaire          |

::: warning Identifiants La cle API SMTP et le mot de passe IMAP sont stockes
dans le trousseau de cles du systeme (Linux : GNOME Keyring, macOS : Trousseau
d'acces). Ils n'apparaissent jamais dans `triggerfish.yaml`. :::

### Etape 4 : Demarrer Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envoyez un email a l'adresse configuree pour confirmer la connexion.

## Identite du proprietaire

Triggerfish determine le statut de proprietaire en comparant l'adresse email de
l'expediteur avec le `ownerEmail` configure :

- **Correspondance** -- Le message est une commande du proprietaire
- **Pas de correspondance** -- Le message est une entree externe avec taint
  `PUBLIC`

Si aucun `ownerEmail` n'est configure, tous les messages sont traites comme
provenant du proprietaire.

## Classification basee sur le domaine

Pour un controle plus granulaire, le canal email prend en charge la classification
des destinataires basee sur le domaine. C'est particulierement utile en
environnement d'entreprise :

- Les emails provenant de `@votreentreprise.com` peuvent etre classifies comme
  `INTERNAL`
- Les emails de domaines inconnus sont par defaut `EXTERNAL`
- L'administrateur peut configurer une liste de domaines internes

```yaml
channels:
  email:
    # ... autre configuration
    internalDomains:
      - "votreentreprise.com"
      - "filiale.com"
```

Cela signifie que le moteur de politiques applique des regles differentes selon
la provenance d'un email :

| Domaine de l'expediteur         | Classification |
| ------------------------------- | :------------: |
| Domaine interne configure       |   `INTERNAL`   |
| Domaine inconnu                 |   `EXTERNAL`   |

## Fonctionnement

### Messages entrants

L'adaptateur interroge le serveur IMAP a l'intervalle configure (defaut : toutes
les 30 secondes) pour les nouveaux messages non lus. Lorsqu'un nouvel email
arrive :

1. L'adresse de l'expediteur est extraite
2. Le statut de proprietaire est verifie avec `ownerEmail`
3. Le corps de l'email est transmis au gestionnaire de messages
4. Chaque fil de discussion email est associe a un ID de session base sur
   l'adresse de l'expediteur (`email-expediteur@example.com`)

### Messages sortants

Lorsque l'agent repond, l'adaptateur envoie la reponse via l'API HTTP de relais
SMTP configuree. La reponse inclut :

- **De** -- L'adresse `fromAddress` configuree
- **A** -- L'adresse email de l'expediteur original
- **Objet** -- "Triggerfish" (defaut)
- **Corps** -- La reponse de l'agent en texte brut

## Intervalle d'interrogation

L'intervalle d'interrogation par defaut est de 30 secondes. Vous pouvez l'ajuster
selon vos besoins :

```yaml
channels:
  email:
    # ... autre configuration
    pollInterval: 10000 # Verifier toutes les 10 secondes
```

::: tip Equilibrez reactivite et ressources Un intervalle d'interrogation plus
court signifie une reponse plus rapide aux emails entrants, mais des connexions
IMAP plus frequentes. Pour la plupart des cas d'utilisation personnels, 30
secondes est un bon equilibre. :::

## Modification de la classification

```yaml
channels:
  email:
    # ... autre configuration
    classification: CONFIDENTIAL
```

Niveaux valides : `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
