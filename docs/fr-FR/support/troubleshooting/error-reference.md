# Référence des erreurs

Un index consultable des messages d'erreur. Utilisez la recherche de votre navigateur (Ctrl+F / Cmd+F) pour chercher le texte exact de l'erreur que vous voyez dans vos logs.

## Démarrage et daemon

| Erreur | Cause | Correctif |
|--------|-------|-----------|
| `Fatal startup error` | Exception non gérée pendant le démarrage du gateway | Vérifiez la trace de pile complète dans les logs |
| `Daemon start failed` | Le gestionnaire de service n'a pas pu démarrer le daemon | Vérifiez `triggerfish logs` ou le journal système |
| `Daemon stop failed` | Le gestionnaire de service n'a pas pu arrêter le daemon | Tuez le processus manuellement |
| `Failed to load configuration` | Fichier de configuration illisible ou malformé | Lancez `triggerfish config validate` |
| `No LLM provider configured. Check triggerfish.yaml.` | Section `models` manquante ou aucun fournisseur défini | Configurez au moins un fournisseur |
| `Configuration file not found` | `triggerfish.yaml` n'existe pas au chemin attendu | Lancez `triggerfish dive` ou créez manuellement |
| `Configuration parse failed` | Erreur de syntaxe YAML | Corrigez la syntaxe YAML (vérifiez indentation, deux-points, guillemets) |
| `Configuration file did not parse to an object` | YAML analysé mais le résultat n'est pas un mapping | Assurez-vous que le niveau supérieur est un mapping YAML, pas une liste ou un scalaire |
| `Configuration validation failed` | Champs requis manquants ou valeurs invalides | Vérifiez le message de validation spécifique |
| `Triggerfish is already running` | Fichier de log verrouillé par une autre instance | Arrêtez d'abord l'instance en cours |
| `Linger enable failed` | `loginctl enable-linger` n'a pas réussi | Lancez `sudo loginctl enable-linger $USER` |

## Gestion des secrets

| Erreur | Cause | Correctif |
|--------|-------|-----------|
| `Secret store failed` | Impossible d'initialiser le backend de secrets | Vérifiez la disponibilité du trousseau de clés/libsecret |
| `Secret not found` | La clé de secret référencée n'existe pas | Stockez-la : `triggerfish config set-secret <clé> <valeur>` |
| `Machine key file permissions too open` | Le fichier de clé a des permissions plus larges que 0600 | `chmod 600 ~/.triggerfish/secrets.key` |
| `Machine key file corrupt` | Le fichier de clé est illisible ou tronqué | Supprimez et restockez tous les secrets |
| `Machine key chmod failed` | Impossible de définir les permissions sur le fichier de clé | Vérifiez que le système de fichiers supporte chmod |
| `Secret file permissions too open` | Le fichier de secrets a des permissions trop permissives | `chmod 600 ~/.triggerfish/secrets.json` |
| `Secret file chmod failed` | Impossible de définir les permissions sur le fichier de secrets | Vérifiez le type de système de fichiers |
| `Secret backend selection failed` | OS non supporté ou aucun trousseau de clés disponible | Utilisez Docker ou activez le fallback mémoire |
| `Migrating legacy plaintext secrets to encrypted format` | Ancien format de fichier de secrets détecté (INFO, pas une erreur) | Aucune action nécessaire ; la migration est automatique |

## Fournisseurs de LLM

| Erreur | Cause | Correctif |
|--------|-------|-----------|
| `Primary provider not found in registry` | Le nom du fournisseur dans `models.primary.provider` n'est pas dans `models.providers` | Corrigez le nom du fournisseur |
| `Classification model provider not configured` | `classification_models` référence un fournisseur inconnu | Ajoutez le fournisseur à `models.providers` |
| `All providers exhausted` | Tous les fournisseurs de la chaîne de failover ont échoué | Vérifiez toutes les clés API et le statut des fournisseurs |
| `Provider request failed with retryable error, retrying` | Erreur transitoire, tentative en cours | Attendez ; c'est une récupération automatique |
| `Provider stream connection failed, retrying` | La connexion de streaming a été interrompue | Attendez ; c'est une récupération automatique |
| `Local LLM request failed (status): text` | Ollama/LM Studio a retourné une erreur | Vérifiez que le serveur local est en cours d'exécution et que le modèle est chargé |
| `No response body for streaming` | Le fournisseur a retourné une réponse de streaming vide | Réessayez ; peut être un problème transitoire du fournisseur |
| `Unknown provider name in createProviderByName` | Le code référence un type de fournisseur qui n'existe pas | Vérifiez l'orthographe du nom du fournisseur |

## Canaux

| Erreur | Cause | Correctif |
|--------|-------|-----------|
| `Channel send failed` | Le routeur n'a pas pu distribuer un message | Vérifiez les erreurs spécifiques au canal dans les logs |
| `WebSocket connection failed` | Le chat CLI ne peut pas joindre le gateway | Vérifiez que le daemon est en cours d'exécution |
| `Message parse failed` | JSON malformé reçu du canal | Vérifiez que le client envoie du JSON valide |
| `WebSocket upgrade rejected` | Connexion rejetée par le gateway | Vérifiez le token d'authentification et les en-têtes d'origine |
| `Chat WebSocket message rejected: exceeds size limit` | Le corps du message dépasse 1 Mo | Envoyez des messages plus petits |
| `Discord channel configured but botToken is missing` | La configuration Discord existe mais le token est vide | Définissez le token du bot |
| `WhatsApp send failed (status): error` | L'API Meta a rejeté la requête d'envoi | Vérifiez la validité du token d'accès |
| `Signal connect failed` | Impossible de joindre le daemon signal-cli | Vérifiez que signal-cli est en cours d'exécution |
| `Signal ping failed after retries` | signal-cli est en cours d'exécution mais ne répond pas | Redémarrez signal-cli |
| `signal-cli daemon not reachable within 60s` | signal-cli n'a pas démarré à temps | Vérifiez l'installation de Java et la configuration de signal-cli |
| `IMAP LOGIN failed` | Mauvais identifiants IMAP | Vérifiez le nom d'utilisateur et le mot de passe |
| `IMAP connection not established` | Impossible de joindre le serveur IMAP | Vérifiez le nom d'hôte du serveur et le port 993 |
| `Google Chat PubSub poll failed` | Impossible de récupérer depuis la souscription Pub/Sub | Vérifiez les identifiants Google Cloud |
| `Clipboard image rejected: exceeds size limit` | L'image collée est trop volumineuse pour le tampon d'entrée | Utilisez une image plus petite |

## Intégrations

| Erreur | Cause | Correctif |
|--------|-------|-----------|
| `Google OAuth token exchange failed` | L'échange de code OAuth a retourné une erreur | Réauthentifiez : `triggerfish connect google` |
| `GitHub token verification failed` | Le PAT est invalide ou expiré | Restockez : `triggerfish connect github` |
| `GitHub API request failed` | L'API GitHub a retourné une erreur | Vérifiez les scopes du token et les limites de débit |
| `Clone failed` | git clone a échoué | Vérifiez le token, l'accès au dépôt et le réseau |
| `Notion enabled but token not found in keychain` | Le token d'intégration Notion n'est pas stocké | Lancez `triggerfish connect notion` |
| `Notion API rate limited` | Dépassement de 3 req/sec | Attendez la tentative automatique (jusqu'à 3 essais) |
| `Notion API network request failed` | Impossible de joindre api.notion.com | Vérifiez la connectivité réseau |
| `CalDAV credential resolution failed` | Nom d'utilisateur ou mot de passe CalDAV manquant | Définissez les identifiants dans la configuration et le trousseau de clés |
| `CalDAV principal discovery failed` | Impossible de trouver l'URL du principal CalDAV | Vérifiez le format de l'URL du serveur |
| `MCP server 'name' not found` | Le serveur MCP référencé n'est pas dans la configuration | Ajoutez-le à `mcp_servers` dans la configuration |
| `MCP SSE connection blocked by SSRF policy` | L'URL SSE MCP pointe vers une IP privée | Utilisez le transport stdio à la place |
| `Vault path does not exist` | Le chemin du vault Obsidian est incorrect | Corrigez `plugins.obsidian.vault_path` |
| `Path traversal rejected` | Le chemin de la note a tenté de sortir du répertoire du vault | Utilisez des chemins à l'intérieur du vault |

## Sécurité et politique

| Erreur | Cause | Correctif |
|--------|-------|-----------|
| `Write-down blocked` | Données circulant d'une classification élevée vers une basse | Utilisez un canal/outil au bon niveau de classification |
| `SSRF blocked: hostname resolves to private IP` | La requête sortante cible le réseau interne | Ne peut être désactivé ; utilisez une URL publique |
| `Hook evaluation failed, defaulting to BLOCK` | Le hook de politique a levé une exception | Vérifiez les règles de politique personnalisées |
| `Policy rule blocked action` | Une règle de politique a refusé l'action | Vérifiez `policy.rules` dans la configuration |
| `Tool floor violation` | L'outil nécessite une classification supérieure à celle de la session | Élevez la session ou utilisez un outil différent |
| `Plugin network access blocked` | Le plugin a essayé d'accéder à une URL non autorisée | Le plugin doit déclarer les points de terminaison dans son manifeste |
| `Plugin SSRF blocked` | L'URL du plugin résout vers une IP privée | Le plugin ne peut pas accéder aux réseaux privés |
| `Skill activation blocked by classification ceiling` | Le taint de session dépasse le plafond du skill | Impossible d'utiliser ce skill au niveau de taint actuel |
| `Skill content integrity check failed` | Les fichiers du skill ont été modifiés après l'installation | Réinstallez le skill |
| `Skill install rejected by scanner` | Le scanner de sécurité a trouvé du contenu suspect | Examinez les avertissements de l'analyse |
| `Delegation certificate signature invalid` | La chaîne de délégation a une signature invalide | Réémettez la délégation |
| `Delegation certificate expired` | La délégation a expiré | Réémettez avec un TTL plus long |
| `Webhook HMAC verification failed` | La signature du webhook ne correspond pas | Vérifiez la configuration du secret partagé |
| `Webhook replay detected` | Payload de webhook en double reçu | Pas une erreur si attendu ; sinon, investiguez |
| `Webhook rate limit exceeded` | Trop d'appels webhook depuis une source | Réduisez la fréquence des webhooks |

## Navigateur

| Erreur | Cause | Correctif |
|--------|-------|-----------|
| `Browser launch failed` | Impossible de démarrer Chrome/Chromium | Installez un navigateur basé sur Chromium |
| `Direct Chrome process launch failed` | Le binaire Chrome n'a pas pu s'exécuter | Vérifiez les permissions du binaire et les dépendances |
| `Flatpak Chrome launch failed` | Le wrapper Chrome Flatpak a échoué | Vérifiez l'installation Flatpak |
| `CDP endpoint not ready after Xms` | Chrome n'a pas ouvert le port de debug à temps | Le système peut être à court de ressources |
| `Navigation blocked by domain policy` | L'URL cible un domaine bloqué ou une IP privée | Utilisez une URL publique |
| `Navigation failed` | Erreur de chargement de page ou timeout | Vérifiez l'URL et le réseau |
| `Click/Type/Select failed on "selector"` | Le sélecteur CSS n'a correspondu à aucun élément | Vérifiez le sélecteur par rapport au DOM de la page |
| `Snapshot failed` | Impossible de capturer l'état de la page | La page peut être blanche ou JavaScript a rencontré une erreur |

## Exécution et sandbox

| Erreur | Cause | Correctif |
|--------|-------|-----------|
| `Working directory path escapes workspace jail` | Tentative de traversée de chemin dans l'environnement d'exécution | Utilisez des chemins à l'intérieur de l'espace de travail |
| `Working directory does not exist` | Le répertoire de travail spécifié n'a pas été trouvé | Créez d'abord le répertoire |
| `Workspace access denied for PUBLIC session` | Les sessions PUBLIC ne peuvent pas utiliser les espaces de travail | L'espace de travail nécessite une classification INTERNAL+ |
| `Workspace path traversal attempt blocked` | Le chemin a tenté de sortir de la frontière de l'espace de travail | Utilisez des chemins relatifs à l'intérieur de l'espace de travail |
| `Workspace agentId rejected: empty after sanitization` | L'ID de l'agent ne contient que des caractères invalides | Vérifiez la configuration de l'agent |
| `Sandbox worker unhandled error` | Le worker du sandbox de plugin a planté | Vérifiez le code du plugin pour les erreurs |
| `Sandbox has been shut down` | Opération tentée sur un sandbox détruit | Redémarrez le daemon |

## Planificateur

| Erreur | Cause | Correctif |
|--------|-------|-----------|
| `Trigger callback failed` | Le gestionnaire de trigger a levé une exception | Vérifiez TRIGGER.md pour les problèmes |
| `Trigger store persist failed` | Impossible de sauvegarder les résultats du trigger | Vérifiez la connectivité du stockage |
| `Notification delivery failed` | Impossible d'envoyer la notification du trigger | Vérifiez la connectivité du canal |
| `Cron expression parse error` | Expression cron invalide | Corrigez l'expression dans `scheduler.cron.jobs` |

## Mise à jour automatique

| Erreur | Cause | Correctif |
|--------|-------|-----------|
| `Triggerfish self-update failed` | Le processus de mise à jour a rencontré une erreur | Vérifiez l'erreur spécifique dans les logs |
| `Binary replacement failed` | Impossible de remplacer l'ancien binaire par le nouveau | Vérifiez les permissions de fichier ; arrêtez d'abord le daemon |
| `Checksum file download failed` | Impossible de télécharger SHA256SUMS.txt | Vérifiez la connectivité réseau |
| `Asset not found in SHA256SUMS.txt` | La release n'a pas de checksum pour votre plateforme | Créez une issue GitHub |
| `Checksum verification exception` | Le hash du binaire téléchargé ne correspond pas | Réessayez ; le téléchargement a pu être corrompu |
