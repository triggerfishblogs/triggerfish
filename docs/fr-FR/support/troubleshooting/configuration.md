# Dépannage : configuration

## Erreurs d'analyse YAML

### « Configuration parse failed »

Le fichier YAML a une erreur de syntaxe. Causes courantes :

- **Incohérence d'indentation.** YAML est sensible aux espaces blancs. Utilisez des espaces, pas des tabulations. Chaque niveau d'imbrication doit être exactement 2 espaces.
- **Caractères spéciaux non quotés.** Les valeurs contenant `:`, `#`, `{`, `}`, `[`, `]` ou `&` doivent être entre guillemets.
- **Deux-points manquant après la clé.** Chaque clé nécessite un `: ` (deux-points suivi d'un espace).

Validez votre YAML :

```bash
triggerfish config validate
```

Ou utilisez un validateur YAML en ligne pour trouver la ligne exacte.

### « Configuration file did not parse to an object »

Le fichier YAML a été analysé avec succès mais le résultat n'est pas un mapping YAML (objet). Cela arrive si votre fichier ne contient qu'une valeur scalaire, une liste, ou est vide.

Votre `triggerfish.yaml` doit avoir un mapping au niveau supérieur. Au minimum :

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### « Configuration file not found »

Triggerfish cherche la configuration à ces chemins, dans l'ordre :

1. Variable d'environnement `$TRIGGERFISH_CONFIG` (si définie)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (si `TRIGGERFISH_DATA_DIR` est défini)
3. `/data/triggerfish.yaml` (environnements Docker)
4. `~/.triggerfish/triggerfish.yaml` (par défaut)

Lancez l'assistant de configuration pour en créer un :

```bash
triggerfish dive
```

---

## Erreurs de validation

### « Configuration validation failed »

Cela signifie que le YAML a été analysé mais a échoué à la validation structurelle. Messages spécifiques :

**« models is required »** ou **« models.primary is required »**

La section `models` est obligatoire. Vous avez besoin au minimum d'un fournisseur et d'un modèle principal :

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**« primary.provider must be non-empty »** ou **« primary.model must be non-empty »**

Le champ `primary` doit avoir à la fois `provider` et `model` définis comme des chaînes non vides.

**« Invalid classification level »** dans `classification_models`

Les niveaux valides sont : `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. Ils sont sensibles à la casse. Vérifiez les clés de votre `classification_models`.

---

## Erreurs de référence de secrets

### Secret non résolu au démarrage

Si votre configuration contient `secret:une-clé` et que cette clé n'existe pas dans le trousseau de clés, le daemon quitte avec une erreur comme :

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Correctif :**

```bash
# Listez les secrets existants
triggerfish config get-secret --list

# Stockez le secret manquant
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Backend de secrets non disponible

Sur Linux, le stockage de secrets utilise `secret-tool` (libsecret / GNOME Keyring). Si l'interface D-Bus du Secret Service n'est pas disponible (serveurs sans interface graphique, conteneurs minimaux), vous verrez des erreurs lors du stockage ou de la récupération des secrets.

**Solution de contournement pour Linux sans interface graphique :**

1. Installez `gnome-keyring` et `libsecret` :
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Démarrez le daemon du trousseau de clés :
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. Ou utilisez le fallback de fichier chiffré en définissant :
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Note : le fallback mémoire signifie que les secrets sont perdus au redémarrage. Il n'est adapté qu'aux tests.

---

## Problèmes de valeurs de configuration

### Coercition booléenne

Lors de l'utilisation de `triggerfish config set`, les valeurs de chaîne `"true"` et `"false"` sont automatiquement converties en booléens YAML. Si vous avez réellement besoin de la chaîne littérale `"true"`, modifiez le fichier YAML directement.

De même, les chaînes qui ressemblent à des entiers (`"8080"`) sont converties en nombres.

### Syntaxe de chemin pointé

Les commandes `config set` et `config get` utilisent des chemins pointés pour naviguer dans le YAML imbriqué :

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Si un segment de chemin contient un point, il n'y a pas de syntaxe d'échappement. Modifiez le fichier YAML directement.

### Masquage des secrets dans `config get`

Quand vous lancez `triggerfish config get` sur une clé contenant « key », « secret » ou « token », la sortie est masquée : `****...****` avec seulement les 4 premiers et derniers caractères visibles. C'est intentionnel. Utilisez `triggerfish config get-secret <clé>` pour récupérer la valeur réelle.

---

## Sauvegardes de configuration

Triggerfish crée une sauvegarde horodatée dans `~/.triggerfish/backups/` avant chaque opération `config set`, `config add-channel` ou `config add-plugin`. Jusqu'à 10 sauvegardes sont conservées.

Pour restaurer une sauvegarde :

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Vérification des fournisseurs

L'assistant de configuration vérifie les clés API en appelant le point de terminaison de listage de modèles de chaque fournisseur (ce qui ne consomme pas de tokens). Les points de terminaison de vérification sont :

| Fournisseur  | Point de terminaison |
|--------------|----------------------|
| Anthropic    | `https://api.anthropic.com/v1/models` |
| OpenAI       | `https://api.openai.com/v1/models` |
| Google       | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks    | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter   | `https://openrouter.ai/api/v1/models` |
| ZenMux       | `https://zenmux.ai/api/v1/models` |
| Z.AI         | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama       | `http://localhost:11434/v1/models` |
| LM Studio    | `http://localhost:1234/v1/models` |

Si la vérification échoue, vérifiez :
- La clé API est correcte et n'est pas expirée
- Le point de terminaison est accessible depuis votre réseau
- Pour les fournisseurs locaux (Ollama, LM Studio), le serveur est réellement en cours d'exécution

### Modèle introuvable

Si la vérification réussit mais que le modèle n'est pas trouvé, l'assistant vous avertit. Cela signifie généralement :

- **Erreur de frappe dans le nom du modèle.** Vérifiez la documentation du fournisseur pour les identifiants de modèle exacts.
- **Modèle Ollama non téléchargé.** Lancez d'abord `ollama pull <modèle>`.
- **Le fournisseur ne liste pas le modèle.** Certains fournisseurs (Fireworks) utilisent des formats de nommage différents. L'assistant normalise les patterns courants, mais les identifiants de modèle inhabituels peuvent ne pas correspondre.
