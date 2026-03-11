# Dépannage : intégrations

## Google Workspace

### Token OAuth expiré ou révoqué

Les tokens de rafraîchissement Google OAuth peuvent être révoqués (par l'utilisateur, par Google, ou par inactivité). Quand cela arrive :

```
Google OAuth token exchange failed
```

Ou vous verrez des erreurs 401 sur les appels à l'API Google.

**Correctif :** Réauthentifiez-vous :

```bash
triggerfish connect google
```

Cela ouvre un navigateur pour le flux de consentement OAuth. Après avoir accordé l'accès, les nouveaux tokens sont stockés dans le trousseau de clés.

### « No refresh token »

Le flux OAuth a retourné un token d'accès mais pas de token de rafraîchissement. Cela arrive quand :

- Vous avez déjà autorisé l'application auparavant (Google n'envoie le token de rafraîchissement qu'à la première autorisation)
- L'écran de consentement OAuth n'a pas demandé l'accès hors ligne

**Correctif :** Révoquez l'accès de l'application dans les [paramètres du compte Google](https://myaccount.google.com/permissions), puis relancez `triggerfish connect google`. Cette fois, Google enverra un nouveau token de rafraîchissement.

### Prévention du rafraîchissement concurrent

Si plusieurs requêtes déclenchent un rafraîchissement de token en même temps, Triggerfish les sérialise pour n'envoyer qu'une seule requête de rafraîchissement. Si vous voyez des timeouts pendant le rafraîchissement du token, c'est peut-être que le premier rafraîchissement prend trop de temps.

---

## GitHub

### « GitHub token not found in keychain »

L'intégration GitHub stocke le Personal Access Token dans le trousseau de clés du système d'exploitation sous la clé `github-pat`.

**Correctif :**

```bash
triggerfish connect github
# ou manuellement :
triggerfish config set-secret github-pat ghp_...
```

### Format du token

GitHub supporte deux formats de tokens :
- PAT classiques : `ghp_...`
- PAT à granularité fine : `github_pat_...`

Les deux fonctionnent. L'assistant de configuration vérifie le token en appelant l'API GitHub. Si la vérification échoue :

```
GitHub token verification failed
GitHub API request failed
```

Vérifiez que le token a les scopes requis. Pour une fonctionnalité complète, vous avez besoin de : `repo`, `read:org`, `read:user`.

### Échecs de clonage

L'outil de clonage GitHub a une logique de réessai automatique :

1. Première tentative : clone avec le `--branch` spécifié
2. Si la branche n'existe pas : réessaie sans `--branch` (utilise la branche par défaut)

Si les deux tentatives échouent :

```
Clone failed on retry
Clone failed
```

Vérifiez :
- Le token a le scope `repo`
- Le dépôt existe et le token y a accès
- La connectivité réseau vers github.com

### Limitation de débit

La limite de débit de l'API GitHub est de 5 000 requêtes/heure pour les requêtes authentifiées. Le nombre restant et l'heure de réinitialisation sont extraits des en-têtes de réponse et inclus dans les messages d'erreur :

```
Rate limit: X remaining, resets at HH:MM:SS
```

Il n'y a pas de backoff automatique. Attendez que la fenêtre de limitation se réinitialise.

---

## Notion

### « Notion enabled but token not found in keychain »

L'intégration Notion nécessite un token d'intégration interne stocké dans le trousseau de clés.

**Correctif :**

```bash
triggerfish connect notion
```

Cela demande le token et le stocke dans le trousseau de clés après vérification avec l'API Notion.

### Format du token

Notion utilise deux formats de tokens :
- Tokens d'intégration interne : `ntn_...`
- Tokens hérités : `secret_...`

Les deux sont acceptés. L'assistant de connexion valide le format avant le stockage.

### Limitation de débit (429)

L'API de Notion est limitée à environ 3 requêtes par seconde. Triggerfish a une limitation de débit intégrée (configurable) et une logique de réessai :

- Débit par défaut : 3 requêtes/seconde
- Tentatives : jusqu'à 3 fois sur 429
- Backoff : exponentiel avec jitter, commençant à 1 seconde
- Respecte l'en-tête `Retry-After` de la réponse de Notion

Si vous atteignez toujours les limites de débit :

```
Notion API rate limited, retrying
```

Réduisez les opérations concurrentes ou baissez la limite de débit dans la configuration.

### 404 Not Found

```
Notion: 404 Not Found
```

La ressource existe mais n'est pas partagée avec votre intégration. Dans Notion :

1. Ouvrez la page ou la base de données
2. Cliquez sur le menu « ... » > « Connexions »
3. Ajoutez votre intégration Triggerfish

### « client_secret removed » (changement majeur)

Dans une mise à jour de sécurité, le champ `client_secret` a été supprimé de la configuration Notion. Si vous avez ce champ dans votre `triggerfish.yaml`, supprimez-le. Notion utilise maintenant uniquement le token OAuth stocké dans le trousseau de clés.

### Erreurs réseau

```
Notion API network request failed
Notion API network error: <message>
```

L'API est inaccessible. Vérifiez votre connexion réseau. Si vous êtes derrière un proxy d'entreprise, l'API de Notion (`api.notion.com`) doit être accessible.

---

## CalDAV (calendrier)

### Échec de résolution des identifiants

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

L'intégration CalDAV nécessite un nom d'utilisateur et un mot de passe :

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "votre-nom-utilisateur"
  credential_ref: "secret:caldav:password"
```

Stockez le mot de passe :

```bash
triggerfish config set-secret caldav:password <votre-mot-de-passe>
```

### Échecs de découverte

CalDAV utilise un processus de découverte en plusieurs étapes :
1. Trouver l'URL du principal (PROPFIND sur le point de terminaison well-known)
2. Trouver le calendar-home-set
3. Lister les calendriers disponibles

Si une étape échoue :

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

Causes courantes :
- Mauvaise URL du serveur (certains serveurs nécessitent `/dav/principals/` ou `/remote.php/dav/`)
- Identifiants rejetés (mauvais nom d'utilisateur/mot de passe)
- Le serveur ne supporte pas CalDAV (certains serveurs annoncent WebDAV mais pas CalDAV)

### Incompatibilité d'ETag lors de la mise à jour/suppression

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV utilise les ETags pour le contrôle de concurrence optimiste. Si un autre client (téléphone, web) a modifié l'événement entre votre lecture et votre mise à jour, l'ETag ne correspondra pas.

**Correctif :** L'agent devrait récupérer l'événement à nouveau pour obtenir l'ETag actuel, puis réessayer l'opération. Cela est géré automatiquement dans la plupart des cas.

### « CalDAV credentials not available, executor deferred »

L'exécuteur CalDAV démarre en état différé si les identifiants ne peuvent pas être résolus au démarrage. Ce n'est pas fatal ; l'exécuteur signalera des erreurs si vous essayez d'utiliser les outils CalDAV.

---

## Serveurs MCP (Model Context Protocol)

### Serveur introuvable

```
MCP server '<nom>' not found
```

L'appel d'outil référence un serveur MCP qui n'est pas configuré. Vérifiez votre section `mcp_servers` dans `triggerfish.yaml`.

### Binaire du serveur pas dans le PATH

Les serveurs MCP sont lancés comme sous-processus. Si le binaire n'est pas trouvé :

```
MCP server '<nom>': <erreur de validation>
```

Problèmes courants :
- La commande (par ex. `npx`, `python`, `node`) n'est pas dans le PATH du daemon
- **Problème de PATH systemd/launchd :** Le daemon capture votre PATH au moment de l'installation. Si vous avez installé l'outil de serveur MCP après avoir installé le daemon, réinstallez le daemon pour mettre à jour le PATH :

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Plantages du serveur

Si un processus de serveur MCP plante, la boucle de lecture se termine et le serveur devient indisponible. Il n'y a pas de reconnexion automatique.

**Correctif :** Redémarrez le daemon pour relancer tous les serveurs MCP.

### Transport SSE bloqué

Les serveurs MCP utilisant le transport SSE (Server-Sent Events) sont soumis aux vérifications SSRF :

```
MCP SSE connection blocked by SSRF policy
```

Les URLs SSE pointant vers des adresses IP privées sont bloquées. C'est par conception. Utilisez le transport stdio pour les serveurs MCP locaux à la place.

### Erreurs d'appels d'outils

```
tools/list failed: <message>
tools/call failed: <message>
```

Le serveur MCP a répondu avec une erreur. C'est l'erreur du serveur, pas celle de Triggerfish. Vérifiez les propres logs du serveur MCP pour les détails.

---

## Obsidian

### « Vault path does not exist »

```
Vault path does not exist: /chemin/vers/vault
```

Le chemin du vault configuré dans `plugins.obsidian.vault_path` n'existe pas. Assurez-vous que le chemin est correct et accessible.

### Traversée de chemin bloquée

```
Path traversal rejected: <chemin>
Path escapes vault boundary: <chemin>
```

Un chemin de note a tenté de sortir du répertoire du vault (par ex. en utilisant `../`). C'est une vérification de sécurité. Toutes les opérations sur les notes sont confinées au répertoire du vault.

### Dossiers exclus

```
Path is excluded: <chemin>
```

La note est dans un dossier listé dans `exclude_folders`. Pour y accéder, supprimez le dossier de la liste d'exclusion.

### Application de la classification

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Le vault ou un dossier spécifique a un niveau de classification qui entre en conflit avec le taint de session. Voir [Dépannage de la sécurité](/fr-FR/support/troubleshooting/security) pour les détails sur les règles de write-down.
