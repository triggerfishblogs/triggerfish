# Dépannage : secrets et identifiants

## Backends de trousseau de clés par plateforme

| Plateforme | Backend                    | Détails |
|------------|----------------------------|---------|
| macOS      | Keychain (natif)           | Utilise le CLI `security` pour accéder à Keychain Access |
| Linux      | Secret Service (D-Bus)     | Utilise le CLI `secret-tool` (libsecret / GNOME Keyring) |
| Windows    | Stockage de fichier chiffré| `~/.triggerfish/secrets.json` + `~/.triggerfish/secrets.key` |
| Docker     | Stockage de fichier chiffré| `/data/secrets.json` + `/data/secrets.key` |

Le backend est sélectionné automatiquement au démarrage. Vous ne pouvez pas changer quel backend est utilisé pour votre plateforme.

---

## Problèmes macOS

### Invites d'accès au trousseau de clés

macOS peut vous demander d'autoriser `triggerfish` à accéder au trousseau de clés. Cliquez sur « Toujours autoriser » pour éviter les invites répétées. Si vous avez accidentellement cliqué sur « Refuser », ouvrez Keychain Access, trouvez l'entrée et supprimez-la. Le prochain accès demandera à nouveau.

### Trousseau de clés verrouillé

Si le trousseau de clés macOS est verrouillé (par ex. après la mise en veille), les opérations sur les secrets échoueront. Déverrouillez-le :

```bash
security unlock-keychain ~/Library/Keychains/login.keychain-db
```

Ou déverrouillez simplement votre Mac (le trousseau de clés se déverrouille à la connexion).

---

## Problèmes Linux

### « secret-tool » introuvable

Le backend du trousseau de clés Linux utilise `secret-tool`, qui fait partie du package `libsecret-tools`.

```bash
# Debian/Ubuntu
sudo apt install libsecret-tools

# Fedora
sudo dnf install libsecret

# Arch
sudo pacman -S libsecret
```

### Aucun daemon Secret Service en cours d'exécution

Sur les serveurs sans interface graphique ou les environnements de bureau minimaux, il peut ne pas y avoir de daemon Secret Service. Symptômes :

- Les commandes `secret-tool` se bloquent ou échouent
- Messages d'erreur concernant la connexion D-Bus

**Options :**

1. **Installez et démarrez GNOME Keyring :**
   ```bash
   sudo apt install gnome-keyring
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

2. **Utilisez le fallback de fichier chiffré :**
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Attention : le fallback mémoire ne persiste pas les secrets entre les redémarrages. Il n'est adapté qu'aux tests.

3. **Pour les serveurs, envisagez Docker.** Le déploiement Docker utilise un stockage de fichier chiffré qui ne nécessite pas de daemon de trousseau de clés.

### KDE / KWallet

Si vous utilisez KDE avec KWallet au lieu de GNOME Keyring, `secret-tool` devrait toujours fonctionner via l'API D-Bus Secret Service que KWallet implémente. Si ce n'est pas le cas, installez `gnome-keyring` à côté de KWallet.

---

## Stockage de fichier chiffré Windows / Docker

### Comment cela fonctionne

Le stockage de fichier chiffré utilise le chiffrement AES-256-GCM :

1. Une clé machine est dérivée en utilisant PBKDF2 et stockée dans `secrets.key`
2. Chaque valeur de secret est individuellement chiffrée avec un IV unique
3. Les données chiffrées sont stockées dans `secrets.json` dans un format versionné (`{v: 1, entries: {...}}`)

### « Machine key file permissions too open »

Sur les systèmes basés sur Unix (Linux dans Docker), le fichier de clé doit avoir les permissions `0600` (lecture/écriture propriétaire uniquement). Si les permissions sont trop permissives :

```
Machine key file permissions too open
```

**Correctif :**

```bash
chmod 600 ~/.triggerfish/secrets.key
# ou dans Docker
docker exec triggerfish chmod 600 /data/secrets.key
```

### « Machine key file corrupt »

Le fichier de clé existe mais ne peut pas être analysé. Il a peut-être été tronqué ou écrasé.

**Correctif :** Supprimez le fichier de clé et régénérez :

```bash
rm ~/.triggerfish/secrets.key
```

Au prochain démarrage, une nouvelle clé est générée. Cependant, tous les secrets existants chiffrés avec l'ancienne clé seront illisibles. Vous devrez restocker tous les secrets :

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
# Répétez pour tous les secrets
```

### « Secret file permissions too open »

Comme pour le fichier de clé, le fichier de secrets devrait avoir des permissions restrictives :

```bash
chmod 600 ~/.triggerfish/secrets.json
```

### « Secret file chmod failed »

Le système n'a pas pu définir les permissions du fichier. Cela peut arriver sur des systèmes de fichiers qui ne supportent pas les permissions Unix (certains montages réseau, volumes FAT/exFAT). Vérifiez que le système de fichiers supporte les changements de permissions.

---

## Migration des secrets hérités

### Migration automatique

Si Triggerfish détecte un fichier de secrets en clair (ancien format sans chiffrement), il migre automatiquement vers le format chiffré au premier chargement :

```
Migrating legacy plaintext secrets to encrypted format
Secret rotation recommended after migration from plaintext storage
```

La migration :
1. Lit le fichier JSON en clair
2. Chiffre chaque valeur avec AES-256-GCM
3. Écrit dans un fichier temporaire, puis renomme atomiquement
4. Journalise un avertissement recommandant le renouvellement des secrets

### Migration manuelle

Si vous avez des secrets dans votre fichier `triggerfish.yaml` (sans utiliser de références `secret:`), migrez-les vers le trousseau de clés :

```bash
triggerfish config migrate-secrets
```

Cela analyse votre configuration pour les champs de secrets connus (clés API, tokens de bot, etc.), les stocke dans le trousseau de clés et remplace les valeurs dans le fichier de configuration par des références `secret:`.

### Problèmes de déplacement inter-périphériques

Si la migration implique le déplacement de fichiers entre des frontières de systèmes de fichiers (points de montage différents, NFS), le renommage atomique peut échouer. La migration se rabat sur copie-puis-suppression, qui est toujours sûr mais a brièvement les deux fichiers sur le disque.

---

## Résolution des secrets

### Comment fonctionnent les références `secret:`

Les valeurs de configuration préfixées par `secret:` sont résolues au démarrage :

```yaml
# Dans triggerfish.yaml
apiKey: "secret:provider:anthropic:apiKey"

# Au démarrage, résolu en :
apiKey: "sk-ant-api03-valeur-réelle-de-la-clé..."
```

La valeur résolue ne vit qu'en mémoire. Le fichier de configuration sur le disque contient toujours la référence `secret:`.

### « Secret not found »

```
Secret not found: <clé>
```

La clé référencée n'existe pas dans le trousseau de clés.

**Correctif :**

```bash
triggerfish config set-secret <clé> <valeur>
```

### Lister les secrets

```bash
# Lister toutes les clés de secrets stockées (les valeurs ne sont pas affichées)
triggerfish config get-secret --list
```

### Supprimer des secrets

```bash
triggerfish config set-secret <clé> ""
# ou via l'agent :
# L'agent peut demander la suppression de secrets via l'outil de secrets
```

---

## Remplacement de variable d'environnement

Le chemin du fichier de clé peut être remplacé avec `TRIGGERFISH_KEY_PATH` :

```bash
export TRIGGERFISH_KEY_PATH=/chemin/personnalisé/secrets.key
```

Cela est principalement utile pour les déploiements Docker avec des agencements de volumes personnalisés.

---

## Noms de clés de secrets courants

Voici les clés standard du trousseau de clés utilisées par Triggerfish :

| Clé | Usage |
|-----|-------|
| `provider:<nom>:apiKey` | Clé API du fournisseur de LLM |
| `telegram:botToken` | Token du bot Telegram |
| `slack:botToken` | Token du bot Slack |
| `slack:appToken` | Token au niveau de l'application Slack |
| `slack:signingSecret` | Secret de signature Slack |
| `discord:botToken` | Token du bot Discord |
| `whatsapp:accessToken` | Token d'accès WhatsApp Cloud API |
| `whatsapp:webhookVerifyToken` | Token de vérification webhook WhatsApp |
| `email:smtpPassword` | Mot de passe du relais SMTP |
| `email:imapPassword` | Mot de passe du serveur IMAP |
| `web:search:apiKey` | Clé API Brave Search |
| `github-pat` | Personal Access Token GitHub |
| `notion:token` | Token d'intégration Notion |
| `caldav:password` | Mot de passe du serveur CalDAV |
| `google:clientId` | ID client Google OAuth |
| `google:clientSecret` | Secret client Google OAuth |
| `google:refreshToken` | Token de rafraîchissement Google OAuth |
