# Fournisseurs LLM et basculement

Triggerfish prend en charge plusieurs fournisseurs LLM avec basculement automatique, selection de
modele par agent et changement de modele au niveau de la session. Pas de verrouillage a un seul fournisseur.

## Fournisseurs pris en charge

| Fournisseur | Auth    | Modeles                      | Notes                               |
| ----------- | ------- | ---------------------------- | ----------------------------------- |
| Anthropic   | Cle API | Claude Opus, Sonnet, Haiku   | API Anthropic standard              |
| OpenAI      | Cle API | GPT-4o, o1, o3               | API OpenAI standard                 |
| Google      | Cle API | Gemini Pro, Flash            | API Google AI Studio                |
| Local       | Aucune  | Llama, Mistral, etc.         | Compatible Ollama, format OpenAI    |
| OpenRouter  | Cle API | Tout modele sur OpenRouter   | Acces unifie a de nombreux fournisseurs |
| Z.AI        | Cle API | GLM-4.7, GLM-4.5, GLM-5     | Plan Z.AI Coding, compatible OpenAI |

## Interface LlmProvider

Tous les fournisseurs implementent la meme interface :

```typescript
interface LlmProvider {
  /** Generate a completion from a message history. */
  complete(
    messages: Message[],
    options?: CompletionOptions,
  ): Promise<CompletionResult>;

  /** Stream a completion token-by-token. */
  stream(
    messages: Message[],
    options?: CompletionOptions,
  ): AsyncIterable<StreamChunk>;

  /** Whether this provider supports tool/function calling. */
  supportsTools: boolean;

  /** The model identifier (e.g., "claude-sonnet-4-5", "gpt-4o"). */
  modelId: string;
}
```

Cela signifie que vous pouvez changer de fournisseur sans modifier aucune logique applicative. La
boucle de l'agent et toute l'orchestration des outils fonctionnent de maniere identique quel que soit le
fournisseur actif.

## Configuration

### Configuration de base

Configurez votre modele principal et les identifiants des fournisseurs dans `triggerfish.yaml` :

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-5
  providers:
    anthropic:
      model: claude-sonnet-4-5
    openai:
      model: gpt-4o
    google:
      model: gemini-pro
    ollama:
      model: llama3
      baseUrl: "http://localhost:11434/v1" # Port par defaut d'Ollama
    openrouter:
      model: anthropic/claude-sonnet-4-5
    zai:
      model: glm-4.7
```

### Chaine de basculement

La FailoverChain fournit un repli automatique lorsqu'un fournisseur est indisponible.
Configurez une liste ordonnee de modeles de repli :

```yaml
models:
  primary:
    provider: anthropic
    model: claude-opus-4-5
  failover:
    - claude-sonnet-4-5 # Premier repli
    - gpt-4o # Deuxieme repli
    - ollama/llama3 # Repli local (pas d'internet requis)

  failover_config:
    max_retries: 3
    retry_delay_ms: 1000
    conditions:
      - rate_limited
      - server_error
      - timeout
```

Lorsque le modele principal echoue en raison d'une condition configuree (limitation de debit,
erreur serveur ou delai d'attente), Triggerfish essaie automatiquement le fournisseur suivant dans
la chaine. Cela se produit de maniere transparente -- la conversation continue sans
interruption.

### Conditions de basculement

| Condition      | Description                                            |
| -------------- | ------------------------------------------------------ |
| `rate_limited` | Le fournisseur retourne une reponse 429 de limite de debit |
| `server_error` | Le fournisseur retourne une erreur serveur 5xx         |
| `timeout`      | La requete depasse le delai d'attente configure        |

## Selection de modele par agent

Dans une [configuration multi-agent](./multi-agent), chaque agent peut utiliser un modele different
optimise pour son role :

```yaml
agents:
  list:
    - id: research
      model: claude-opus-4-5 # Meilleur raisonnement pour la recherche
    - id: quick-tasks
      model: claude-haiku-4-5 # Rapide et economique pour les taches simples
    - id: coding
      model: claude-sonnet-4-5 # Bon equilibre pour le code
```

## Changement de modele au niveau de la session

L'agent peut changer de modele en cours de session pour optimiser les couts. Utilisez un modele rapide
pour les requetes simples et escaladez vers un modele plus puissant pour le raisonnement complexe.
Ceci est disponible via l'outil `session_status`.

## Limitation de debit

Triggerfish inclut un limiteur de debit a fenetre glissante integre qui empeche
d'atteindre les limites API des fournisseurs. Le limiteur enveloppe tout fournisseur de maniere transparente -- il
suit les tokens par minute (TPM) et les requetes par minute (RPM) dans une fenetre glissante
et retarde les appels lorsque les limites sont approchees.

La limitation de debit fonctionne conjointement avec le basculement : si la limite de debit d'un fournisseur est epuisee
et que le limiteur ne peut pas attendre dans le delai imparti, la chaine de basculement s'active et
essaie le fournisseur suivant.

Consultez [Limitation de debit](/fr-FR/features/rate-limiting) pour tous les details incluant les limites
de tiers OpenAI.

::: info Les cles API ne sont jamais stockees dans les fichiers de configuration. Utilisez le trousseau de votre systeme
via `triggerfish config set-secret`. Consultez le [Modele de securite](/fr-FR/security/) pour
les details sur la gestion des secrets. :::
