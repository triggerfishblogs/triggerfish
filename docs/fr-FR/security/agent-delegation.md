# Délégation d'agent

Alors que les agents IA interagissent de plus en plus entre eux -- un agent en appelant un autre pour accomplir des sous-tâches -- une nouvelle classe de risques de sécurité émerge. Une chaîne d'agents pourrait être utilisée pour blanchir des données via un agent moins restreint, contournant les contrôles de classification. Triggerfish empêche cela avec l'identité cryptographique des agents, les plafonds de classification et l'héritage obligatoire du taint.

## Certificats d'agent

Chaque agent dans Triggerfish possède un certificat qui définit son identité, ses capacités et ses permissions de délégation. Ce certificat est signé par le propriétaire de l'agent et ne peut être modifié ni par l'agent lui-même ni par d'autres agents.

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Sales Assistant",
  "created_at": "2025-01-15T00:00:00Z",
  "expires_at": "2026-01-15T00:00:00Z",

  "owner": {
    "type": "user",
    "id": "user_456",
    "org_id": "org_789"
  },

  "capabilities": {
    "integrations": ["salesforce", "slack", "email"],
    "actions": ["read", "write", "send_message"],
    "max_classification": "CONFIDENTIAL"
  },

  "delegation": {
    "can_invoke_agents": true,
    "can_be_invoked_by": ["agent_def456", "agent_ghi789"],
    "max_delegation_depth": 3
  },

  "signature": "ed25519:xyz..."
}
```

Champs clés du certificat :

| Champ                  | Objectif                                                                                                                                                                                |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_classification`   | Le **plafond de classification** -- le plus haut niveau de taint auquel cet agent peut opérer. Un agent avec un plafond INTERNAL ne peut pas être invoqué par une session marquée CONFIDENTIAL. |
| `can_invoke_agents`    | Si cet agent est autorisé à appeler d'autres agents.                                                                                                                                     |
| `can_be_invoked_by`    | Liste explicite des agents autorisés à invoquer celui-ci.                                                                                                                                |
| `max_delegation_depth` | Profondeur maximale de la chaîne d'invocation d'agents. Empêche la récursion non bornée.                                                                                                |
| `signature`            | Signature Ed25519 du propriétaire. Empêche la falsification du certificat.                                                                                                               |

## Flux d'invocation

Lorsqu'un agent en appelle un autre, la couche de politique vérifie la délégation avant que l'agent appelé ne s'exécute. La vérification est déterministe et s'exécute dans le code -- l'agent appelant ne peut pas influencer la décision.

<img src="/diagrams/agent-delegation-sequence.svg" alt="Séquence de délégation d'agent : l'Agent A invoque l'Agent B, la couche de politique vérifie le taint vs le plafond et bloque quand le taint dépasse le plafond" style="max-width: 100%;" />

Dans cet exemple, l'Agent A a un taint de session CONFIDENTIAL (il a accédé à des données Salesforce plus tôt). L'Agent B a un plafond de classification INTERNAL. Parce que CONFIDENTIAL est supérieur à INTERNAL, l'invocation est bloquée. Les données marquées de l'Agent A ne peuvent pas circuler vers un agent avec un plafond de classification inférieur.

::: warning SÉCURITÉ La couche de politique vérifie le **taint de session actuel** de l'appelant, pas son plafond. Même si l'Agent A a un plafond CONFIDENTIAL, ce qui compte est le niveau de taint réel de la session au moment de l'invocation. Si l'Agent A n'a accédé à aucune donnée classifiée (taint PUBLIC), il peut invoquer l'Agent B (plafond INTERNAL) sans problème. :::

## Suivi de la chaîne de délégation

Lorsque des agents invoquent d'autres agents, la chaîne complète est suivie avec des horodatages et des niveaux de taint à chaque étape :

```json
{
  "invocation_id": "inv_123",
  "chain": [
    {
      "agent_id": "agent_abc",
      "agent_name": "Sales Assistant",
      "invoked_at": "2025-01-29T10:00:00Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Summarize Q4 pipeline"
    },
    {
      "agent_id": "agent_def",
      "agent_name": "Data Analyst",
      "invoked_at": "2025-01-29T10:00:01Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Calculate win rates"
    }
  ],
  "max_depth_allowed": 3,
  "current_depth": 2
}
```

Cette chaîne est enregistrée dans le journal d'audit et peut être interrogée pour l'analyse de conformité et d'investigation. Vous pouvez tracer exactement quels agents étaient impliqués, quels étaient leurs niveaux de taint et quelles tâches ils ont exécutées.

## Invariants de sécurité

Quatre invariants gouvernent la délégation d'agents. Tous sont appliqués par le code dans la couche de politique et ne peuvent être outrepassés par aucun agent dans la chaîne.

| Invariant                             | Application                                                                                                                                        |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Le taint ne fait qu'augmenter**     | Chaque appelé hérite de `max(propre taint, taint de l'appelant)`. Un appelé ne peut jamais avoir un taint inférieur à son appelant.               |
| **Plafond respecté**                  | Un agent ne peut pas être invoqué si le taint de l'appelant dépasse le `max_classification` de l'appelé.                                          |
| **Limites de profondeur appliquées**  | La chaîne se termine à `max_delegation_depth`. Si la limite est 3, une invocation de quatrième niveau est bloquée.                                |
| **Invocation circulaire bloquée**     | Un agent ne peut pas apparaître deux fois dans la même chaîne. Si l'Agent A appelle l'Agent B qui essaie d'appeler l'Agent A, la seconde invocation est bloquée. |

### Héritage du taint en détail

Lorsque l'Agent A (taint : CONFIDENTIAL) invoque avec succès l'Agent B (plafond : CONFIDENTIAL), l'Agent B démarre avec un taint CONFIDENTIAL -- hérité de l'Agent A. Si l'Agent B accède ensuite à des données RESTRICTED, son taint s'élève à RESTRICTED. Ce taint élevé est renvoyé à l'Agent A lorsque l'invocation se termine.

<img src="/diagrams/taint-inheritance.svg" alt="Héritage du taint : l'Agent A (INTERNAL) invoque l'Agent B, B hérite du taint, accède à Salesforce (CONFIDENTIAL), retourne le taint élevé à A" style="max-width: 100%;" />

Le taint circule dans les deux sens -- de l'appelant à l'appelé au moment de l'invocation, et de l'appelé vers l'appelant à la complétion. Il ne peut que s'élever.

## Prévention du blanchiment de données

Un vecteur d'attaque clé dans les systèmes multi-agents est le **blanchiment de données** -- utiliser une chaîne d'agents pour déplacer des données classifiées vers une destination de classification inférieure en les routant via des agents intermédiaires.

### L'attaque

```
Objectif de l'attaquant : Exfiltrer des données CONFIDENTIAL via un canal PUBLIC

Flux tenté :
1. L'Agent A accède à Salesforce (taint --> CONFIDENTIAL)
2. L'Agent A invoque l'Agent B (qui a un canal PUBLIC)
3. L'Agent B envoie les données vers le canal PUBLIC
```

### Pourquoi cela échoue

Triggerfish bloque cette attaque à plusieurs points :

**Point de blocage 1 : Vérification de l'invocation.** Si l'Agent B a un plafond en dessous de CONFIDENTIAL, l'invocation est bloquée directement. Le taint de l'Agent A (CONFIDENTIAL) dépasse le plafond de l'Agent B.

**Point de blocage 2 : Héritage du taint.** Même si l'Agent B a un plafond CONFIDENTIAL et que l'invocation réussit, l'Agent B hérite du taint CONFIDENTIAL de l'Agent A. Quand l'Agent B essaie de sortir vers un canal PUBLIC, le hook `PRE_OUTPUT` bloque le write-down.

**Point de blocage 3 : Pas de réinitialisation du taint en délégation.** Les agents dans une chaîne de délégation ne peuvent pas réinitialiser leur taint. La réinitialisation du taint n'est disponible que pour l'utilisateur final, et elle efface tout l'historique de conversation. Il n'existe aucun mécanisme permettant à un agent de « laver » son niveau de taint pendant une chaîne.

::: danger Les données ne peuvent pas échapper à leur classification via la délégation d'agent. La combinaison des vérifications de plafond, de l'héritage obligatoire du taint et de l'interdiction de réinitialisation du taint dans les chaînes rend le blanchiment de données via les chaînes d'agents impossible dans le modèle de sécurité de Triggerfish. :::

## Exemples de scénarios

### Scénario 1 : Délégation réussie

```
Agent A (plafond : CONFIDENTIAL, taint actuel : INTERNAL)
  appelle Agent B (plafond : CONFIDENTIAL)

Vérification de politique :
  - A peut invoquer B ? OUI (B est dans la liste de délégation de A)
  - Taint de A (INTERNAL) <= plafond de B (CONFIDENTIAL) ? OUI
  - Limite de profondeur OK ? OUI (profondeur 1 sur max 3)
  - Circulaire ? NON

Résultat : AUTORISÉ
Agent B démarre avec taint : INTERNAL (hérité de A)
```

### Scénario 2 : Bloqué par le plafond

```
Agent A (plafond : RESTRICTED, taint actuel : CONFIDENTIAL)
  appelle Agent B (plafond : INTERNAL)

Vérification de politique :
  - Taint de A (CONFIDENTIAL) <= plafond de B (INTERNAL) ? NON

Résultat : BLOQUÉ
Raison : Plafond de l'Agent B (INTERNAL) inférieur au taint de session (CONFIDENTIAL)
```

### Scénario 3 : Bloqué par la limite de profondeur

```
Agent A appelle Agent B (profondeur 1)
  Agent B appelle Agent C (profondeur 2)
    Agent C appelle Agent D (profondeur 3)
      Agent D appelle Agent E (profondeur 4)

Vérification de politique pour Agent E :
  - Profondeur 4 > max_delegation_depth (3)

Résultat : BLOQUÉ
Raison : Profondeur maximale de délégation dépassée
```

### Scénario 4 : Bloqué par référence circulaire

```
Agent A appelle Agent B (profondeur 1)
  Agent B appelle Agent C (profondeur 2)
    Agent C appelle Agent A (profondeur 3)

Vérification de politique pour la seconde invocation d'Agent A :
  - Agent A apparaît déjà dans la chaîne

Résultat : BLOQUÉ
Raison : Invocation circulaire d'agent détectée
```

## Pages connexes

- [Conception axée sécurité](./) -- vue d'ensemble de l'architecture de sécurité
- [Règle du No Write-Down](./no-write-down) -- la règle de flux de classification que la délégation applique
- [Identité et authentification](./identity) -- comment l'identité des utilisateurs et des canaux est établie
- [Audit et conformité](./audit-logging) -- comment les chaînes de délégation sont enregistrées dans le journal d'audit
