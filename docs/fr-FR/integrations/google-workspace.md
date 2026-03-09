# Google Workspace

Connectez votre compte Google pour donner a votre agent l'acces a Gmail,
Calendar, Tasks, Drive et Sheets.

## Prerequis

- Un compte Google
- Un projet Google Cloud avec des identifiants OAuth

## Configuration

### Etape 1 : Creer un projet Google Cloud

1. Rendez-vous sur la [console Google Cloud](https://console.cloud.google.com/)
2. Cliquez sur le menu deroulant du projet en haut et selectionnez **New Project**
3. Nommez-le "Triggerfish" (ou ce que vous preferez) et cliquez sur **Create**

### Etape 2 : Activer les API

Activez chacune de ces API dans votre projet :

- [API Gmail](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [API Google Calendar](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [API Google Tasks](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [API Google Drive](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [API Google Sheets](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

Cliquez sur **Enable** sur chaque page. Cela ne doit etre fait qu'une seule fois
par projet.

### Etape 3 : Configurer l'ecran de consentement OAuth

Avant de pouvoir creer des identifiants, Google exige un ecran de consentement
OAuth. C'est l'ecran que les utilisateurs voient lorsqu'ils accordent l'acces.

1. Rendez-vous sur l'
   [ecran de consentement OAuth](https://console.cloud.google.com/apis/credentials/consent)
2. Type d'utilisateur : selectionnez **External** (ou **Internal** si vous etes
   dans une organisation Google Workspace et souhaitez uniquement les utilisateurs
   de l'organisation)
3. Cliquez sur **Create**
4. Remplissez les champs requis :
   - **Nom de l'application** : "Triggerfish" (ou ce que vous voulez)
   - **Adresse email d'assistance** : votre adresse email
   - **Adresse email de contact du developpeur** : votre adresse email
5. Cliquez sur **Save and Continue**
6. Sur l'ecran **Scopes**, cliquez sur **Add or Remove Scopes** et ajoutez :
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. Cliquez sur **Update**, puis **Save and Continue**
8. Allez sur la page **Audience** (dans la barre laterale gauche sous "OAuth
   consent screen") -- c'est la que vous trouverez la section **Test users**
9. Cliquez sur **+ Add Users** et ajoutez votre propre adresse email Google
10. Cliquez sur **Save and Continue**, puis **Back to Dashboard**

::: warning Tant que votre application est en statut "Testing", seuls les
utilisateurs de test que vous avez ajoutes peuvent autoriser. C'est suffisant
pour un usage personnel. Publier l'application supprime la restriction des
utilisateurs de test mais necessite la verification par Google. :::

### Etape 4 : Creer des identifiants OAuth

1. Rendez-vous sur [Credentials](https://console.cloud.google.com/apis/credentials)
2. Cliquez sur **+ CREATE CREDENTIALS** en haut
3. Selectionnez **OAuth client ID**
4. Type d'application : **Desktop app**
5. Nom : "Triggerfish" (ou ce que vous voulez)
6. Cliquez sur **Create**
7. Copiez le **Client ID** et le **Client Secret**

### Etape 5 : Connexion

```bash
triggerfish connect google
```

Vous serez invite a saisir :

1. Votre **Client ID**
2. Votre **Client Secret**

Une fenetre de navigateur s'ouvrira pour que vous accordiez l'acces. Apres
autorisation, les tokens sont stockes en securite dans le trousseau de cles de
votre systeme (Trousseau macOS ou libsecret Linux). Aucun identifiant n'est
stocke dans les fichiers de configuration ou les variables d'environnement.

### Deconnexion

```bash
triggerfish disconnect google
```

Supprime tous les tokens Google de votre trousseau de cles. Vous pouvez vous
reconnecter a tout moment en executant `connect` a nouveau.

## Outils disponibles

Une fois connecte, votre agent a acces a 14 outils :

| Outil             | Description                                                         |
| ----------------- | ------------------------------------------------------------------- |
| `gmail_search`    | Rechercher des emails par requete (supporte la syntaxe de recherche Gmail) |
| `gmail_read`      | Lire un email specifique par ID                                     |
| `gmail_send`      | Composer et envoyer un email                                        |
| `gmail_label`     | Ajouter ou retirer des labels sur un message                        |
| `calendar_list`   | Lister les evenements de calendrier a venir                         |
| `calendar_create` | Creer un nouvel evenement de calendrier                             |
| `calendar_update` | Mettre a jour un evenement existant                                 |
| `tasks_list`      | Lister les taches depuis Google Tasks                               |
| `tasks_create`    | Creer une nouvelle tache                                            |
| `tasks_complete`  | Marquer une tache comme terminee                                    |
| `drive_search`    | Rechercher des fichiers dans Google Drive                           |
| `drive_read`      | Lire le contenu d'un fichier (exporte les Google Docs en texte)     |
| `sheets_read`     | Lire une plage depuis une feuille de calcul                         |
| `sheets_write`    | Ecrire des valeurs dans une plage de feuille de calcul              |

## Exemples d'interactions

Demandez a votre agent des choses comme :

- "Qu'est-ce qui est prevu dans mon calendrier aujourd'hui ?"
- "Recherche mes emails pour les messages de alice@example.com"
- "Envoie un email a bob@example.com avec le sujet 'Notes de reunion'"
- "Trouve la feuille de calcul du budget Q4 dans Drive"
- "Ajoute 'Faire les courses' a ma liste de taches"
- "Lis les cellules A1:D10 de la feuille de calcul Ventes"

## Scopes OAuth

Triggerfish demande ces scopes lors de l'autorisation :

| Scope            | Niveau d'acces                                     |
| ---------------- | -------------------------------------------------- |
| `gmail.modify`   | Lire, envoyer et gerer les emails et labels        |
| `calendar`       | Acces complet en lecture/ecriture a Google Calendar |
| `tasks`          | Acces complet en lecture/ecriture a Google Tasks    |
| `drive.readonly` | Acces en lecture seule aux fichiers Google Drive    |
| `spreadsheets`   | Acces en lecture et ecriture a Google Sheets        |

::: tip L'acces a Drive est en lecture seule. Triggerfish peut rechercher et lire
vos fichiers mais ne peut pas les creer, modifier ou supprimer. Sheets a un acces
en ecriture separe pour les mises a jour de cellules de feuille de calcul. :::

## Securite

- Toutes les donnees Google Workspace sont classifiees au moins **INTERNAL**
- Le contenu des emails, les details de calendrier et le contenu des documents
  sont generalement **CONFIDENTIAL**
- Les tokens sont stockes dans le trousseau de cles du systeme (Trousseau macOS /
  libsecret Linux)
- Les identifiants client sont stockes a cote des tokens dans le trousseau de
  cles, jamais dans les variables d'environnement ou fichiers de configuration
- La [regle de non ecriture descendante](/fr-FR/security/no-write-down)
  s'applique : les donnees Google CONFIDENTIAL ne peuvent pas transiter vers les
  canaux PUBLIC
- Tous les appels d'outils sont journalises dans la piste d'audit avec le
  contexte complet de classification

## Depannage

### "No Google tokens found"

Executez `triggerfish connect google` pour vous authentifier.

### "Google refresh token revoked or expired"

Votre refresh token a ete invalide (ex. : vous avez revoque l'acces dans les
parametres de votre compte Google). Executez `triggerfish connect google` pour
vous reconnecter.

### "Access blocked: has not completed the Google verification process"

Cela signifie que votre compte Google n'est pas liste comme utilisateur de test
pour l'application. Tant que l'application est en statut "Testing" (le defaut),
seuls les comptes explicitement ajoutes comme utilisateurs de test peuvent
autoriser.

1. Rendez-vous sur l'
   [ecran de consentement OAuth](https://console.cloud.google.com/apis/credentials/consent)
2. Allez sur la page **Audience** (dans la barre laterale gauche)
3. Dans la section **Test users**, cliquez sur **+ Add Users** et ajoutez votre
   adresse email Google
4. Sauvegardez et reessayez `triggerfish connect google`

### "Token exchange failed"

Verifiez votre Client ID et Client Secret. Assurez-vous que :

- Le type de client OAuth est "Desktop app"
- Toutes les API requises sont activees dans votre projet Google Cloud
- Votre compte Google est liste comme utilisateur de test (si l'application est
  en mode test)

### API non activees

Si vous voyez des erreurs 403 pour des services specifiques, assurez-vous que
l'API correspondante est activee dans votre
[bibliotheque d'API Google Cloud Console](https://console.cloud.google.com/apis/library).
