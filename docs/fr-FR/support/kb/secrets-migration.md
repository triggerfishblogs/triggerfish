# BC : Migration des secrets

Cet article couvre la migration des secrets du stockage en clair vers le format chiffré, et des valeurs en ligne dans la configuration vers les références au trousseau de clés.

## Contexte

Les premières versions de Triggerfish stockaient les secrets en JSON en clair. La version actuelle utilise le chiffrement AES-256-GCM pour les stockages de secrets basés sur fichier (Windows, Docker) et les trousseaux de clés natifs du système d'exploitation (macOS Keychain, Linux Secret Service).

## Migration automatique (clair vers chiffré)

Quand Triggerfish ouvre un fichier de secrets et détecte l'ancien format en clair (un objet JSON plat sans champ `v`), il migre automatiquement :

1. **Détection.** Le fichier est vérifié pour la présence de la structure `{v: 1, entries: {...}}`. S'il s'agit d'un simple `Record<string, string>`, c'est le format hérité.

2. **Migration.** Chaque valeur en clair est chiffrée avec AES-256-GCM en utilisant une clé machine dérivée via PBKDF2. Un IV unique est généré pour chaque valeur.

3. **Écriture atomique.** Les données chiffrées sont d'abord écrites dans un fichier temporaire, puis renommées atomiquement pour remplacer l'original. Cela empêche la perte de données si le processus est interrompu.

4. **Journalisation.** Deux entrées de log sont créées :
   - `WARN: Migrating legacy plaintext secrets to encrypted format`
   - `WARN: Secret rotation recommended after migration from plaintext storage`

5. **Gestion inter-périphériques.** Si le renommage atomique échoue (par ex. le fichier temporaire et le fichier de secrets sont sur des systèmes de fichiers différents), la migration se rabat sur copie-puis-suppression.

### Ce que vous devez faire

Rien. La migration est entièrement automatique et se produit au premier accès. Cependant, après la migration :

- **Renouvelez vos secrets.** Les versions en clair peuvent avoir été sauvegardées, mises en cache ou journalisées. Générez de nouvelles clés API et mettez-les à jour :
  ```bash
  triggerfish config set-secret provider:anthropic:apiKey <nouvelle-clé>
  ```

- **Supprimez les anciennes sauvegardes.** Si vous avez des sauvegardes de l'ancien fichier de secrets en clair, supprimez-les de manière sécurisée.

## Migration manuelle (configuration en ligne vers trousseau de clés)

Si votre `triggerfish.yaml` contient des valeurs de secrets brutes au lieu de références `secret:` :

```yaml
# Avant (non sécurisé)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "sk-ant-api03-clé-réelle-ici"
channels:
  telegram:
    botToken: "7890123456:AAH..."
```

Lancez la commande de migration :

```bash
triggerfish config migrate-secrets
```

Cette commande :

1. Analyse la configuration pour les champs de secrets connus (clés API, tokens de bot, mots de passe)
2. Stocke chaque valeur dans le trousseau de clés du système d'exploitation sous son nom de clé standard
3. Remplace la valeur en ligne par une référence `secret:`

```yaml
# Après (sécurisé)
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
channels:
  telegram:
    botToken: "secret:telegram:botToken"
```

### Champs de secrets connus

La commande de migration connaît ces champs :

| Chemin de configuration                  | Clé du trousseau de clés           |
|------------------------------------------|------------------------------------|
| `models.providers.<nom>.apiKey`          | `provider:<nom>:apiKey`            |
| `channels.telegram.botToken`            | `telegram:botToken`                |
| `channels.slack.botToken`               | `slack:botToken`                   |
| `channels.slack.appToken`               | `slack:appToken`                   |
| `channels.slack.signingSecret`          | `slack:signingSecret`              |
| `channels.discord.botToken`             | `discord:botToken`                 |
| `channels.whatsapp.accessToken`         | `whatsapp:accessToken`             |
| `channels.whatsapp.webhookVerifyToken`  | `whatsapp:webhookVerifyToken`      |
| `channels.email.smtpPassword`           | `email:smtpPassword`               |
| `channels.email.imapPassword`           | `email:imapPassword`               |
| `web.search.api_key`                    | `web:search:apiKey`                |

## Clé machine

Le stockage de fichier chiffré dérive sa clé de chiffrement d'une clé machine stockée dans `secrets.key`. Cette clé est générée automatiquement à la première utilisation.

### Permissions du fichier de clé

Sur les systèmes Unix, le fichier de clé doit avoir les permissions `0600` (lecture/écriture propriétaire uniquement). Triggerfish vérifie cela au démarrage et journalise un avertissement si les permissions sont trop ouvertes :

```
Machine key file permissions too open
```

Correctif :

```bash
chmod 600 ~/.triggerfish/secrets.key
```

### Perte du fichier de clé

Si le fichier de clé machine est supprimé ou corrompu, tous les secrets chiffrés avec cette clé deviennent irrécupérables. Vous devrez restocker chaque secret :

```bash
triggerfish config set-secret provider:anthropic:apiKey <clé>
triggerfish config set-secret telegram:botToken <token>
# ... etc
```

Sauvegardez votre fichier `secrets.key` dans un emplacement sécurisé.

### Chemin de clé personnalisé

Remplacez l'emplacement du fichier de clé avec :

```bash
export TRIGGERFISH_KEY_PATH=/chemin/personnalisé/secrets.key
```

Cela est principalement utile pour les déploiements Docker avec des agencements de volumes non standard.
