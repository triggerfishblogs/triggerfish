# Dépannage : fournisseurs de LLM

## Erreurs courantes des fournisseurs

### 401 Unauthorized / 403 Forbidden

Votre clé API est invalide, expirée ou n'a pas de permissions suffisantes.

**Correctif :**

```bash
# Restockez la clé API
triggerfish config set-secret provider:<nom>:apiKey <votre-clé>

# Redémarrez le daemon
triggerfish stop && triggerfish start
```

Notes spécifiques aux fournisseurs :

| Fournisseur | Format de la clé | Où l'obtenir |
|-------------|-----------------|--------------|
| Anthropic   | `sk-ant-...`    | [console.anthropic.com](https://console.anthropic.com/) |
| OpenAI      | `sk-...`        | [platform.openai.com](https://platform.openai.com/) |
| Google      | `AIza...`       | [aistudio.google.com](https://aistudio.google.com/) |
| Fireworks   | `fw_...`        | [fireworks.ai](https://fireworks.ai/) |
| OpenRouter  | `sk-or-...`     | [openrouter.ai](https://openrouter.ai/) |

### 429 Rate Limited

Vous avez dépassé la limite de débit du fournisseur. Triggerfish ne réessaie pas automatiquement sur 429 pour la plupart des fournisseurs (sauf Notion, qui a un backoff intégré).

**Correctif :** Attendez et réessayez. Si vous atteignez régulièrement les limites de débit, envisagez :
- La mise à niveau de votre plan API pour des limites plus élevées
- L'ajout d'un fournisseur de failover pour que les requêtes passent quand le fournisseur principal est limité
- La réduction de la fréquence des triggers si les tâches planifiées en sont la cause

### 500 / 502 / 503 Erreur serveur

Les serveurs du fournisseur rencontrent des problèmes. Ceux-ci sont généralement transitoires.

Si vous avez une chaîne de failover configurée, Triggerfish essaie automatiquement le fournisseur suivant. Sans failover, l'erreur est propagée à l'utilisateur.

### « No response body for streaming »

Le fournisseur a accepté la requête mais a retourné un corps de réponse vide pour un appel en streaming. Cela peut arriver quand :

- L'infrastructure du fournisseur est surchargée
- Un proxy ou pare-feu supprime le corps de la réponse
- Le modèle est temporairement indisponible

Cela affecte : OpenRouter, Local (Ollama/LM Studio), ZenMux, Z.AI, Fireworks.

---

## Problèmes spécifiques aux fournisseurs

### Anthropic

**Conversion du format d'outils.** Triggerfish convertit entre le format d'outils interne et le format d'outils natif d'Anthropic. Si vous voyez des erreurs liées aux outils, vérifiez que vos définitions d'outils ont un JSON Schema valide.

**Gestion du prompt système.** Anthropic nécessite le prompt système comme champ séparé, pas comme message. Cette conversion est automatique, mais si vous voyez des messages « system » apparaître dans la conversation, quelque chose ne va pas avec le formatage des messages.

### OpenAI

**Pénalité de fréquence.** Triggerfish applique une pénalité de fréquence de 0.3 à toutes les requêtes OpenAI pour décourager la sortie répétitive. C'est codé en dur et ne peut pas être modifié via la configuration.

**Support des images.** OpenAI supporte les images encodées en base64 dans le contenu des messages. Si la vision ne fonctionne pas, assurez-vous d'avoir un modèle compatible avec la vision configuré (par ex. `gpt-4o`, pas `gpt-4o-mini`).

### Google Gemini

**Clé dans la chaîne de requête.** Contrairement aux autres fournisseurs, Google utilise la clé API comme paramètre de requête, pas comme en-tête. C'est géré automatiquement, mais cela signifie que la clé peut apparaître dans les logs de proxy/accès si vous routez via un proxy d'entreprise.

### Ollama / LM Studio (local)

**Le serveur doit être en cours d'exécution.** Les fournisseurs locaux nécessitent que le serveur de modèle soit en cours d'exécution avant le démarrage de Triggerfish. Si Ollama ou LM Studio n'est pas en cours d'exécution :

```
Local LLM request failed (connection refused)
```

**Démarrez le serveur :**

```bash
# Ollama
ollama serve

# LM Studio
# Ouvrez LM Studio et démarrez le serveur local
```

**Modèle non chargé.** Avec Ollama, le modèle doit d'abord être téléchargé :

```bash
ollama pull llama3.3:70b
```

**Remplacement du point de terminaison.** Si votre serveur local n'est pas sur le port par défaut :

```yaml
models:
  providers:
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"   # Par défaut Ollama
      # endpoint: "http://localhost:1234"  # Par défaut LM Studio
```

### Fireworks

**API native.** Triggerfish utilise l'API native de Fireworks, pas leur point de terminaison compatible OpenAI. Les identifiants de modèle peuvent différer de ce que vous voyez dans la documentation compatible OpenAI.

**Formats d'identifiants de modèle.** Fireworks accepte plusieurs patterns d'identifiants de modèle. L'assistant normalise les formats courants, mais si la vérification échoue, vérifiez la [bibliothèque de modèles Fireworks](https://fireworks.ai/models) pour l'identifiant exact.

### OpenRouter

**Routage de modèle.** OpenRouter route les requêtes vers divers fournisseurs. Les erreurs du fournisseur sous-jacent sont encapsulées dans le format d'erreur d'OpenRouter. Le message d'erreur réel est extrait et affiché.

**Format d'erreur API.** OpenRouter retourne les erreurs sous forme d'objets JSON. Si le message d'erreur semble générique, l'erreur brute est journalisée au niveau DEBUG.

### ZenMux / Z.AI

**Support du streaming.** Les deux fournisseurs supportent le streaming. Si le streaming échoue :

```
ZenMux stream failed (status): error text
```

Vérifiez que votre clé API a les permissions de streaming (certains tiers API restreignent l'accès au streaming).

---

## Failover

### Comment fonctionne le failover

Quand le fournisseur principal échoue, Triggerfish essaie chaque modèle de la liste `failover` dans l'ordre :

```yaml
models:
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Si un fournisseur de failover réussit, la réponse est journalisée avec le fournisseur utilisé. Si tous les fournisseurs échouent, la dernière erreur est retournée à l'utilisateur.

### « All providers exhausted »

Tous les fournisseurs de la chaîne ont échoué. Vérifiez :

1. Toutes les clés API sont-elles valides ? Testez chaque fournisseur individuellement.
2. Tous les fournisseurs subissent-ils des pannes ? Vérifiez leurs pages de statut.
3. Votre réseau bloque-t-il le HTTPS sortant vers l'un des points de terminaison des fournisseurs ?

### Configuration du failover

```yaml
models:
  failover_config:
    max_retries: 3          # Tentatives par fournisseur avant de passer au suivant
    retry_delay_ms: 1000    # Délai de base entre les tentatives
    conditions:             # Quelles erreurs déclenchent le failover
      - timeout
      - server_error
      - rate_limited
```

### « Primary provider not found in registry »

Le nom du fournisseur dans `models.primary.provider` ne correspond à aucun fournisseur configuré dans `models.providers`. Vérifiez les erreurs de frappe.

### « Classification model provider not configured »

Vous avez défini un remplacement `classification_models` qui référence un fournisseur absent de `models.providers` :

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local        # Ce fournisseur doit exister dans models.providers
      model: llama3.3:70b
  providers:
    # "local" doit être défini ici
    local:
      model: llama3.3:70b
      endpoint: "http://localhost:11434"
```

---

## Comportement de réessai

Triggerfish réessaie les requêtes aux fournisseurs sur les erreurs transitoires (timeouts réseau, réponses 5xx). La logique de réessai :

1. Attend avec un backoff exponentiel entre les tentatives
2. Journalise chaque tentative de réessai au niveau WARN
3. Après épuisement des tentatives pour un fournisseur, passe au suivant dans la chaîne de failover
4. Les connexions de streaming ont une logique de réessai séparée pour l'établissement de connexion vs. les échecs en cours de flux

Vous pouvez voir les tentatives de réessai dans les logs :

```
Provider request failed with retryable error, retrying
Provider stream connection failed, retrying
```
