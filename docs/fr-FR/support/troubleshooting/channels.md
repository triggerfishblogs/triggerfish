# Dépannage : canaux

## Problèmes généraux des canaux

### Le canal apparaît connecté mais aucun message n'arrive

1. **Vérifiez l'ID du propriétaire.** Si `ownerId` n'est pas défini ou est incorrect, vos messages peuvent être routés comme des messages externes (non propriétaire) avec des permissions restreintes.
2. **Vérifiez la classification.** Si la classification du canal est inférieure au taint de session, les réponses sont bloquées par la règle du no-write-down.
3. **Vérifiez les logs du daemon.** Lancez `triggerfish logs --level WARN` et cherchez les erreurs de distribution.

### Les messages ne sont pas envoyés

Le routeur journalise les échecs de distribution. Vérifiez `triggerfish logs` pour :

```
Channel send failed
```

Cela signifie que le routeur a tenté la distribution mais l'adaptateur de canal a retourné une erreur. L'erreur spécifique sera journalisée à côté.

### Comportement de tentative

Le routeur de canal utilise un backoff exponentiel pour les envois échoués. Si un message échoue, il est réessayé avec des délais croissants. Après épuisement de toutes les tentatives, le message est abandonné et l'erreur est journalisée.

---

## Telegram

### Le bot ne répond pas

1. **Vérifiez le token.** Allez sur @BotFather sur Telegram, vérifiez que votre token est valide et correspond à ce qui est stocké dans le trousseau de clés.
2. **Envoyez un message direct au bot.** Les messages de groupe nécessitent que le bot ait les permissions de messages de groupe.
3. **Vérifiez les erreurs de polling.** Telegram utilise le long polling. Si la connexion tombe, l'adaptateur se reconnecte automatiquement, mais des problèmes réseau persistants empêcheront la réception des messages.

### Les messages sont divisés en plusieurs parties

Telegram a une limite de 4 096 caractères par message. Les réponses longues sont automatiquement découpées. C'est un comportement normal.

### Les commandes du bot ne s'affichent pas dans le menu

L'adaptateur enregistre les commandes slash au démarrage. Si l'enregistrement échoue, un avertissement est journalisé mais l'exécution continue. Ce n'est pas fatal. Le bot fonctionne toujours ; le menu de commandes n'affichera simplement pas les suggestions d'autocomplétion.

### Impossible de supprimer les anciens messages

Telegram ne permet pas aux bots de supprimer les messages de plus de 48 heures. Les tentatives de suppression d'anciens messages échouent silencieusement. C'est une limitation de l'API Telegram.

---

## Slack

### Le bot ne se connecte pas

Slack nécessite trois identifiants :

| Identifiant      | Format      | Où le trouver |
|-------------------|-------------|---------------|
| Bot Token         | `xoxb-...`  | Page OAuth & Permissions dans les paramètres de l'application Slack |
| App Token         | `xapp-...`  | Basic Information > App-Level Tokens |
| Signing Secret    | Chaîne hex  | Basic Information > App Credentials |

Si l'un des trois est manquant ou invalide, la connexion échoue. L'erreur la plus courante est d'oublier l'App Token, qui est séparé du Bot Token.

### Problèmes de Socket Mode

Triggerfish utilise le Socket Mode de Slack, pas les souscriptions d'événements HTTP. Dans les paramètres de votre application Slack :

1. Allez dans « Socket Mode » et assurez-vous qu'il est activé
2. Créez un token au niveau de l'application avec le scope `connections:write`
3. Ce token est l'`appToken` (`xapp-...`)

Si le Socket Mode n'est pas activé, le bot token seul ne suffit pas pour la messagerie en temps réel.

### Les messages sont tronqués

Slack a une limite de 40 000 caractères. Contrairement à Telegram et Discord, Triggerfish tronque les messages Slack plutôt que de les diviser. Si vous atteignez régulièrement cette limite, envisagez de demander à votre agent de produire une sortie plus concise.

### Fuites de ressources du SDK dans les tests

Le SDK Slack provoque des fuites d'opérations asynchrones à l'import. C'est un problème amont connu. Les tests utilisant l'adaptateur Slack nécessitent `sanitizeResources: false` et `sanitizeOps: false`. Cela n'affecte pas l'utilisation en production.

---

## Discord

### Le bot ne peut pas lire les messages dans les serveurs

Discord nécessite l'intent privilégié **Message Content**. Sans lui, le bot reçoit les événements de message mais le contenu du message est vide.

**Correctif :** Dans le [Portail développeur Discord](https://discord.com/developers/applications) :
1. Sélectionnez votre application
2. Allez dans les paramètres « Bot »
3. Activez « Message Content Intent » sous Privileged Gateway Intents
4. Sauvegardez les modifications

### Intents de bot requis

L'adaptateur nécessite ces intents activés :

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privilégié)

### Les messages sont découpés

Discord a une limite de 2 000 caractères. Les messages longs sont automatiquement divisés en plusieurs messages.

### L'indicateur de frappe échoue

L'adaptateur envoie des indicateurs de frappe avant les réponses. Si le bot n'a pas la permission d'envoyer des messages dans un canal, l'indicateur de frappe échoue silencieusement (journalisé au niveau DEBUG). C'est uniquement cosmétique.

### Fuites de ressources du SDK

Comme Slack, le SDK discord.js provoque des fuites d'opérations asynchrones à l'import. Les tests nécessitent `sanitizeOps: false`. Cela n'affecte pas la production.

---

## WhatsApp

### Aucun message reçu

WhatsApp utilise un modèle de webhook. Le bot écoute les requêtes HTTP POST entrantes des serveurs de Meta. Pour que les messages arrivent :

1. **Enregistrez l'URL du webhook** dans le [tableau de bord Meta Business](https://developers.facebook.com/)
2. **Configurez le token de vérification.** L'adaptateur exécute une poignée de main de vérification quand Meta se connecte pour la première fois
3. **Démarrez le listener de webhook.** L'adaptateur écoute sur le port 8443 par défaut. Assurez-vous que ce port est accessible depuis Internet (utilisez un reverse proxy ou un tunnel)

### Avertissement « ownerPhone not configured »

Si `ownerPhone` n'est pas défini dans la configuration du canal WhatsApp, tous les expéditeurs sont traités comme le propriétaire. Cela signifie que chaque utilisateur obtient un accès complet à tous les outils. C'est un problème de sécurité.

**Correctif :** Définissez le numéro de téléphone du propriétaire dans votre configuration :

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Token d'accès expiré

Les tokens d'accès de l'API WhatsApp Cloud peuvent expirer. Si les envois commencent à échouer avec des erreurs 401, régénérez le token dans le tableau de bord Meta et mettez-le à jour :

```bash
triggerfish config set-secret whatsapp:accessToken <nouveau-token>
```

---

## Signal

### signal-cli introuvable

Le canal Signal nécessite `signal-cli`, une application Java tierce. Triggerfish essaie de l'auto-installer pendant la configuration, mais cela peut échouer si :

- Java (JRE 21+) n'est pas disponible et l'auto-installation de JRE 25 a échoué
- Le téléchargement a été bloqué par des restrictions réseau
- Le répertoire cible n'est pas inscriptible

**Installation manuelle :**

```bash
# Installez signal-cli manuellement
# Voir https://github.com/AsamK/signal-cli pour les instructions
```

### Le daemon signal-cli n'est pas accessible

Après avoir démarré signal-cli, Triggerfish attend jusqu'à 60 secondes qu'il devienne accessible. Si cela expire :

```
signal-cli daemon (tcp) not reachable within 60s
```

Vérifiez :
1. signal-cli est-il réellement en cours d'exécution ? Vérifiez avec `ps aux | grep signal-cli`
2. Écoute-t-il sur le point de terminaison attendu (socket TCP ou socket Unix) ?
3. Le compte Signal a-t-il besoin d'être lié ? Lancez `triggerfish config add-channel signal` pour relancer le processus de liaison.

### Échec de liaison de l'appareil

Signal nécessite la liaison de l'appareil à votre compte Signal via un QR code. Si le processus de liaison échoue :

1. Assurez-vous que Signal est installé sur votre téléphone
2. Ouvrez Signal > Paramètres > Appareils liés > Lier un nouvel appareil
3. Scannez le QR code affiché par l'assistant de configuration
4. Si le QR code a expiré, relancez le processus de liaison

### Incompatibilité de version signal-cli

Triggerfish se fixe sur une version éprouvée de signal-cli. Si vous avez installé une version différente, vous pouvez voir un avertissement :

```
Signal CLI version older than known-good
```

Ce n'est pas fatal mais peut causer des problèmes de compatibilité.

---

## Email

### Échec de connexion IMAP

L'adaptateur email se connecte à votre serveur IMAP pour le courrier entrant. Problèmes courants :

- **Mauvais identifiants.** Vérifiez le nom d'utilisateur et le mot de passe IMAP.
- **Port 993 bloqué.** L'adaptateur utilise IMAP sur TLS (port 993). Certains réseaux bloquent cela.
- **Mot de passe d'application requis.** Gmail et d'autres fournisseurs nécessitent des mots de passe d'application quand l'authentification à deux facteurs est activée.

Messages d'erreur que vous pourriez voir :
- `IMAP LOGIN failed` - mauvais nom d'utilisateur ou mot de passe
- `IMAP connection not established` - impossible de joindre le serveur
- `IMAP connection closed unexpectedly` - le serveur a coupé la connexion

### Échecs d'envoi SMTP

L'adaptateur email envoie via un relais API SMTP (pas du SMTP direct). Si les envois échouent avec des erreurs HTTP :

- 401/403 : la clé API est invalide
- 429 : limitation de débit
- 5xx : le service de relais est en panne

### Le polling IMAP s'arrête

L'adaptateur interroge les nouveaux emails toutes les 30 secondes. Si le polling échoue, l'erreur est journalisée mais il n'y a pas de reconnexion automatique. Redémarrez le daemon pour rétablir la connexion IMAP.

C'est une limitation connue. Voir [Problèmes connus](/fr-FR/support/kb/known-issues).

---

## WebChat

### Refus de mise à niveau WebSocket

L'adaptateur WebChat valide les connexions entrantes :

- **En-têtes trop volumineux (431).** La taille combinée des en-têtes dépasse 8 192 octets. Cela peut arriver avec des cookies trop volumineux ou des en-têtes personnalisés.
- **Rejet CORS.** Si `allowedOrigins` est configuré, l'en-tête Origin doit correspondre. La valeur par défaut est `["*"]` (tout autoriser).
- **Trames malformées.** Le JSON invalide dans les trames WebSocket est journalisé au niveau WARN et la trame est abandonnée.

### Classification

WebChat a par défaut la classification PUBLIC. Les visiteurs ne sont jamais traités comme le propriétaire. Si vous avez besoin d'une classification plus élevée pour WebChat, définissez-la explicitement :

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### Échecs de polling PubSub

Google Chat utilise Pub/Sub pour la distribution des messages. Si le polling échoue :

```
Google Chat PubSub poll failed
```

Vérifiez :
- Les identifiants Google Cloud sont valides (vérifiez le `credentials_ref` dans la configuration)
- La souscription Pub/Sub existe et n'a pas été supprimée
- Le compte de service a le rôle `pubsub.subscriber`

### Messages de groupe refusés

Si le mode groupe n'est pas configuré, les messages de groupe peuvent être silencieusement abandonnés :

```
Google Chat group message denied by group mode
```

Configurez `defaultGroupMode` dans la configuration du canal Google Chat.

### ownerEmail non configuré

Sans `ownerEmail`, tous les utilisateurs sont traités comme non propriétaires :

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Définissez-le dans votre configuration pour obtenir un accès complet aux outils.
