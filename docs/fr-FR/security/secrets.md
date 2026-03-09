# Gestion des secrets

Triggerfish ne stocke jamais les identifiants dans les fichiers de configuration. Tous les secrets -- clés API, tokens OAuth, identifiants d'intégration -- sont stockés dans un stockage sécurisé natif de la plateforme : le trousseau de clés du système d'exploitation pour le tier personnel, ou un service de vault pour le tier entreprise. Les plugins et agents interagissent avec les identifiants via le SDK, qui applique des contrôles d'accès stricts.

## Backends de stockage

| Tier           | Backend                | Détails                                                                                    |
| -------------- | ---------------------- | ------------------------------------------------------------------------------------------ |
| **Personnel**  | Trousseau de clés OS   | macOS Keychain, Linux Secret Service (via D-Bus), Windows Credential Manager               |
| **Entreprise** | Intégration vault      | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, ou autres services de vault entreprise |

Dans les deux cas, les secrets sont chiffrés au repos par le backend de stockage. Triggerfish n'implémente pas son propre chiffrement pour les secrets -- il délègue à des systèmes de stockage de secrets conçus et audités à cet effet.

Sur les plateformes sans trousseau de clés natif (Windows sans Credential Manager, conteneurs Docker), Triggerfish utilise un fichier JSON chiffré à `~/.triggerfish/secrets.json`. Les entrées sont chiffrées avec AES-256-GCM en utilisant une clé 256 bits liée à la machine, stockée à `~/.triggerfish/secrets.key` (permissions : `0600`). Chaque entrée utilise un IV aléatoire de 12 octets à chaque écriture. Les fichiers de secrets en clair hérités sont automatiquement migrés vers le format chiffré au premier chargement.

::: tip Le tier personnel ne nécessite aucune configuration pour les secrets. Quand vous connectez une intégration pendant la configuration (`triggerfish dive`), les identifiants sont automatiquement stockés dans le trousseau de clés de votre système d'exploitation. Vous n'avez rien à installer ni configurer au-delà de ce que votre système d'exploitation fournit déjà. :::

## Références de secrets dans la configuration

Triggerfish supporte les références `secret:` dans `triggerfish.yaml`. Au lieu de stocker les identifiants en clair, vous les référencez par nom et ils sont résolus depuis le trousseau de clés du système d'exploitation au démarrage.

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"
    openai:
      apiKey: "secret:provider:openai:apiKey"

channels:
  telegram:
    botToken: "secret:channel:telegram:botToken"
```

Le résolveur effectue un parcours en profondeur du fichier de configuration. Toute valeur de chaîne commençant par `secret:` est substituée par l'entrée correspondante du trousseau de clés. Si un secret référencé n'est pas trouvé, le démarrage échoue immédiatement avec un message d'erreur clair.

### Migration des secrets existants

Si vous avez des identifiants en clair dans votre fichier de configuration provenant d'une version antérieure, la commande de migration les déplace vers le trousseau de clés automatiquement :

```bash
triggerfish config migrate-secrets
```

Cette commande :

1. Analyse `triggerfish.yaml` pour trouver les valeurs d'identifiants en clair
2. Stocke chacune dans le trousseau de clés du système d'exploitation
3. Remplace la valeur en clair par une référence `secret:`
4. Crée une sauvegarde du fichier original

::: warning Après la migration, vérifiez que votre agent démarre correctement avant de supprimer le fichier de sauvegarde. La migration n'est pas réversible sans la sauvegarde. :::

## Architecture d'identifiants délégués

Un principe de sécurité fondamental dans Triggerfish est que les requêtes de données s'exécutent avec les identifiants de **l'utilisateur**, pas les identifiants système. Cela garantit que l'agent hérite du modèle de permissions du système source -- un utilisateur ne peut accéder qu'aux données auxquelles il pourrait accéder directement.

<img src="/diagrams/delegated-credentials.svg" alt="Architecture d'identifiants délégués : l'utilisateur accorde son consentement OAuth, l'agent interroge avec le token de l'utilisateur, le système source applique les permissions" style="max-width: 100%;" />

Cette architecture signifie :

- **Pas de sur-permission** -- l'agent ne peut pas accéder à des données auxquelles l'utilisateur ne peut pas accéder directement
- **Pas de comptes de service système** -- il n'y a pas d'identifiant tout-puissant qui pourrait être compromis
- **Application par le système source** -- le système source (Salesforce, Jira, GitHub, etc.) applique ses propres permissions à chaque requête

::: warning SÉCURITÉ Les plateformes d'agent IA traditionnelles utilisent souvent un seul compte de service système pour accéder aux intégrations au nom de tous les utilisateurs. Cela signifie que l'agent a accès à toutes les données de l'intégration, et s'appuie sur le LLM pour décider quoi montrer à chaque utilisateur. Triggerfish élimine entièrement ce risque : les requêtes s'exécutent avec le propre token OAuth délégué de l'utilisateur. :::

## Application par le SDK de plugin

Les plugins interagissent avec les identifiants exclusivement via le SDK Triggerfish. Le SDK fournit des méthodes tenant compte des permissions et bloque toute tentative d'accès aux identifiants au niveau système.

### Autorisé : accès aux identifiants utilisateur

```python
def get_user_opportunities(sdk, params):
    # Le SDK récupère le token délégué de l'utilisateur depuis le stockage sécurisé
    # Si l'utilisateur n'a pas connecté Salesforce, retourne une erreur utile
    user_token = sdk.get_user_credential("salesforce")

    # La requête s'exécute avec les permissions de l'utilisateur
    # Le système source applique le contrôle d'accès
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### Bloqué : accès aux identifiants système

```python
def get_all_opportunities(sdk, params):
    # Ceci lèvera une PermissionError -- BLOQUÉ par le SDK
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` est toujours bloqué. Il n'y a pas de configuration pour l'activer, pas de contournement administrateur, et pas d'échappatoire. C'est une règle de sécurité fixe, au même titre que la règle du no-write-down. :::

## Outils de secrets appelables par le LLM

L'agent peut vous aider à gérer les secrets via trois outils. De manière critique, le LLM ne voit jamais les valeurs réelles des secrets -- la saisie et le stockage se font hors bande.

### `secret_save`

Vous invite à saisir une valeur de secret de manière sécurisée :

- **CLI** : le terminal passe en mode de saisie masquée (les caractères ne sont pas affichés)
- **Tidepool** : une fenêtre de saisie sécurisée apparaît dans l'interface web

Le LLM demande qu'un secret soit sauvegardé, mais la valeur réelle est saisie par vous via l'invite sécurisée. La valeur est stockée directement dans le trousseau de clés -- elle ne passe jamais par le contexte du LLM.

### `secret_list`

Liste les noms de tous les secrets stockés. N'expose jamais les valeurs.

### `secret_delete`

Supprime un secret par nom du trousseau de clés.

### Substitution d'arguments d'outils

<div v-pre>

Quand l'agent utilise un outil qui a besoin d'un secret (par exemple, définir une clé API dans une variable d'environnement de serveur MCP), il utilise la syntaxe <span v-pre>`{{secret:name}}`</span> dans les arguments de l'outil :

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:my-api-token}}" }
```

Le runtime résout les références <span v-pre>`{{secret:name}}`</span> **sous la couche LLM** avant que l'outil ne s'exécute. La valeur résolue n'apparaît jamais dans l'historique de conversation ni dans les logs.

</div>

::: warning SÉCURITÉ La substitution <code v-pre>{{secret:name}}</code> est appliquée par le code, pas par le LLM. Même si le LLM tentait de journaliser ou de retourner la valeur résolue, la couche de politique intercepterait la tentative dans le hook `PRE_OUTPUT`. :::

### Méthodes de permission du SDK

| Méthode                                 | Comportement                                                                                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | Retourne le token OAuth délégué de l'utilisateur pour l'intégration spécifiée. Si l'utilisateur n'a pas connecté l'intégration, retourne une erreur avec des instructions. |
| `sdk.query_as_user(integration, query)` | Exécute une requête contre l'intégration en utilisant les identifiants délégués de l'utilisateur. Le système source applique ses propres permissions.             |
| `sdk.get_system_credential(name)`       | **Toujours bloqué.** Lève une `PermissionError`. Journalisé comme événement de sécurité.                                                                        |
| `sdk.has_user_connection(integration)`  | Retourne `true` si l'utilisateur a connecté l'intégration spécifiée, `false` sinon. N'expose aucune donnée d'identifiant.                                      |

## Accès aux données tenant compte des permissions

L'architecture d'identifiants délégués fonctionne de concert avec le système de classification. Même si un utilisateur a la permission d'accéder aux données dans le système source, les règles de classification de Triggerfish gouvernent où ces données peuvent circuler après leur récupération.

<img src="/diagrams/secret-resolution-flow.svg" alt="Flux de résolution des secrets : les références du fichier de configuration sont résolues depuis le trousseau de clés du système d'exploitation sous la couche LLM" style="max-width: 100%;" />

**Exemple :**

```
Utilisateur : « Résume le deal Acme et envoie à ma femme »

Étape 1 : Vérification des permissions
  --> Token Salesforce de l'utilisateur utilisé
  --> Salesforce retourne l'opportunité Acme (l'utilisateur a accès)

Étape 2 : Classification
  --> Données Salesforce classifiées CONFIDENTIAL
  --> Le taint de session s'élève à CONFIDENTIAL

Étape 3 : Vérification de la sortie
  --> Femme = destinataire EXTERNAL
  --> CONFIDENTIAL --> EXTERNAL : BLOQUÉ

Résultat : Données récupérées (l'utilisateur a la permission), mais ne peuvent
           pas être envoyées (les règles de classification empêchent la fuite)
```

L'utilisateur a un accès légitime au deal Acme dans Salesforce. Triggerfish respecte cela et récupère les données. Mais le système de classification empêche ces données de circuler vers un destinataire externe. La permission d'accéder aux données est distincte de la permission de les partager.

## Journalisation de l'accès aux secrets

Chaque accès aux identifiants est journalisé via le hook d'application `SECRET_ACCESS` :

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "details": {
    "method": "get_user_credential",
    "integration": "salesforce",
    "user_id": "user_456",
    "credential_type": "oauth_delegated"
  }
}
```

Les tentatives bloquées sont également journalisées :

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "System credential access is prohibited",
    "plugin_id": "plugin_789"
  }
}
```

::: info Les tentatives d'accès bloquées aux identifiants sont journalisées à un niveau d'alerte élevé. Dans les déploiements entreprise, ces événements peuvent déclencher des notifications à l'équipe de sécurité. :::

## Intégration vault entreprise

Les déploiements entreprise peuvent connecter Triggerfish à un service de vault centralisé pour la gestion des identifiants :

| Service de vault      | Intégration                                |
| --------------------- | ------------------------------------------ |
| HashiCorp Vault       | Intégration API native                     |
| AWS Secrets Manager   | Intégration SDK AWS                        |
| Azure Key Vault       | Intégration SDK Azure                      |
| Vault personnalisé    | Interface pluggable `SecretProvider`       |

L'intégration vault entreprise fournit :

- **Rotation centralisée** -- les identifiants sont renouvelés dans le vault et automatiquement récupérés par Triggerfish
- **Politiques d'accès** -- les politiques au niveau du vault contrôlent quels agents et utilisateurs peuvent accéder à quels identifiants
- **Consolidation de l'audit** -- les logs d'accès aux identifiants de Triggerfish et du vault peuvent être corrélés

## Ce qui n'est jamais stocké dans les fichiers de configuration

Les éléments suivants n'apparaissent jamais en tant que valeurs en clair dans `triggerfish.yaml` ou tout autre fichier de configuration. Ils sont soit stockés dans le trousseau de clés du système d'exploitation et référencés via la syntaxe `secret:`, soit gérés via l'outil `secret_save` :

- Clés API pour les fournisseurs de LLM
- Tokens OAuth pour les intégrations
- Identifiants de base de données
- Secrets de webhook
- Clés de chiffrement
- Codes d'appairage (éphémères, en mémoire uniquement)

::: danger Si vous trouvez des identifiants en clair dans un fichier de configuration Triggerfish (des valeurs qui ne sont PAS des références `secret:`), quelque chose s'est mal passé. Exécutez `triggerfish config migrate-secrets` pour les déplacer vers le trousseau de clés. Les identifiants trouvés en clair doivent être renouvelés immédiatement. :::

## Pages connexes

- [Conception axée sécurité](./) -- vue d'ensemble de l'architecture de sécurité
- [Règle du No Write-Down](./no-write-down) -- comment les contrôles de classification complètent l'isolation des identifiants
- [Identité et authentification](./identity) -- comment l'identité de l'utilisateur alimente l'accès aux identifiants délégués
- [Audit et conformité](./audit-logging) -- comment les événements d'accès aux identifiants sont enregistrés
