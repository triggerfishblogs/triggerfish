# Policy Engine et hooks

Le policy engine est la couche d'application qui se situe entre le LLM et le
monde extérieur. Il intercepte chaque action aux points critiques du flux de
données et prend des décisions déterministes ALLOW, BLOCK ou REDACT. Le LLM ne
peut ni contourner, ni modifier, ni influencer ces décisions.

## Principe fondamental : application sous le LLM

<img src="/diagrams/policy-enforcement-layers.svg" alt="Couches d'application de politique : le LLM se situe au-dessus de la couche de politique, qui se situe au-dessus de la couche d'exécution" style="max-width: 100%;" />

::: warning SÉCURITÉ Le LLM se situe au-dessus de la couche de politique. Il peut
être victime d'injection de prompt, de jailbreak ou de manipulation -- et cela
n'a pas d'importance. La couche de politique est du code pur qui s'exécute sous
le LLM, examinant des requêtes d'action structurées et prenant des décisions
binaires basées sur les règles de classification. Il n'existe aucun chemin de la
sortie du LLM au contournement d'un hook. :::

## Types de hooks

Huit hooks d'application interceptent les actions à chaque point critique du
flux de données.

### Architecture des hooks

<img src="/diagrams/hook-chain-flow.svg" alt="Flux de la chaîne de hooks : PRE_CONTEXT_INJECTION → Contexte LLM → PRE_TOOL_CALL → Exécution d'outil → POST_TOOL_RESPONSE → Réponse LLM → PRE_OUTPUT → Canal de sortie" style="max-width: 100%;" />

### Tous les types de hooks

| Hook                    | Déclencheur                        | Actions clés                                                                     | Mode d'échec              |
| ----------------------- | ---------------------------------- | -------------------------------------------------------------------------------- | ------------------------- |
| `PRE_CONTEXT_INJECTION` | Entrée externe dans le contexte    | Classifier l'entrée, attribuer le taint, créer le lignage, scanner l'injection  | Rejeter l'entrée          |
| `PRE_TOOL_CALL`         | Le LLM demande l'exécution d'un outil | Vérification des permissions, limite de débit, validation des paramètres       | Bloquer l'appel d'outil   |
| `POST_TOOL_RESPONSE`    | L'outil retourne des données       | Classifier la réponse, mettre à jour le taint, créer/mettre à jour le lignage   | Masquer ou bloquer        |
| `PRE_OUTPUT`            | Réponse sur le point de sortir     | Vérification finale de classification vs. cible, scan PII                        | Bloquer la sortie         |
| `SECRET_ACCESS`         | Un plugin demande un identifiant   | Journaliser l'accès, vérifier la permission vs. portée déclarée                  | Refuser l'identifiant     |
| `SESSION_RESET`         | L'utilisateur demande un reset     | Archiver le lignage, effacer le contexte, vérifier la confirmation               | Exiger une confirmation   |
| `AGENT_INVOCATION`      | Un agent en appelle un autre       | Vérifier la chaîne de délégation, appliquer le plafond de taint                  | Bloquer l'invocation      |
| `MCP_TOOL_CALL`         | Invocation d'outil serveur MCP     | Vérification de politique du Gateway (statut serveur, permissions outil, schéma) | Bloquer l'appel MCP       |

## Interface des hooks

Chaque hook reçoit un contexte et retourne un résultat. Le gestionnaire est une
fonction synchrone et pure.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // La charge utile spécifique au hook varie selon le type
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` est synchrone et retourne `HookResult` directement -- pas
une Promise. C'est par conception. Les hooks doivent se terminer avant que
l'action ne se poursuive, et les rendre synchrones élimine toute possibilité de
contournement asynchrone. Si un hook dépasse le délai, l'action est rejetée. :::

## Garanties des hooks

Chaque exécution de hook porte quatre invariants :

| Garantie            | Signification                                                                                                                                       |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Déterministe**    | Même entrée, toujours même décision. Pas d'aléatoire. Pas d'appels LLM dans les hooks. Pas d'appels API externes affectant les décisions.         |
| **Synchrone**       | Les hooks se terminent avant que l'action ne se poursuive. Aucun contournement asynchrone possible. Timeout = rejet.                                |
| **Journalisé**      | Chaque exécution de hook est enregistrée : paramètres d'entrée, décision prise, horodatage et règles de politique évaluées.                        |
| **Infalsifiable**   | La sortie du LLM ne peut pas contenir d'instructions de contournement de hook. La couche de hooks n'a aucune logique « parser la sortie du LLM ». |

## Hiérarchie des règles de politique

Les règles de politique sont organisées en trois tiers. Les tiers supérieurs ne
peuvent pas outrepasser les tiers inférieurs.

### Règles fixes (toujours appliquées, NON configurables)

Ces règles sont codées en dur et ne peuvent être désactivées par aucun administrateur, utilisateur ou configuration :

- **Pas d'écriture descendante** : le flux de classification est unidirectionnel. Les données ne peuvent pas circuler vers un niveau inférieur.
- **Canaux UNTRUSTED** : aucune donnée en entrée ni en sortie. Point final.
- **Taint de session** : une fois élevé, reste élevé pour la durée de la session.
- **Journalisation d'audit** : toutes les actions journalisées. Aucune exception. Aucun moyen de désactiver.

### Règles configurables (ajustables par l'administrateur)

Les administrateurs peuvent ajuster celles-ci via l'interface ou les fichiers de configuration :

- Classifications par défaut des intégrations (ex. Salesforce par défaut à `CONFIDENTIAL`)
- Classifications des canaux
- Listes d'autorisation/refus d'actions par intégration
- Listes blanches de domaines pour les communications externes
- Limites de débit par outil, par utilisateur ou par session

### Échappatoire déclarative (entreprise)

Les déploiements entreprise peuvent définir des règles de politique personnalisées en YAML structuré pour les scénarios avancés :

```yaml
# Bloquer toute requête Salesforce contenant des patterns SSN
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN MASQUÉ]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# Exiger une approbation pour les transactions à haute valeur
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# Restriction horaire : pas d'envois externes en dehors des heures de bureau
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "Communications externes restreintes en dehors des heures de bureau"
```

::: tip Les règles YAML personnalisées doivent passer la validation avant activation. Les règles invalides sont rejetées au moment de la configuration, pas à l'exécution. Cela empêche les erreurs de configuration de créer des failles de sécurité. :::

## Expérience utilisateur en cas de refus

Lorsque le policy engine bloque une action, l'utilisateur voit une explication claire -- pas une erreur générique.

**Par défaut (spécifique) :**

```
Je ne peux pas envoyer de données confidentielles vers un canal public.

  -> Réinitialiser la session et envoyer le message
  -> Annuler
```

**Opt-in (éducatif) :**

```
Je ne peux pas envoyer de données confidentielles vers un canal public.

Pourquoi : cette session a accédé à Salesforce (CONFIDENTIAL).
WhatsApp personnel est classifié comme PUBLIC.
Les données ne peuvent circuler que vers un niveau de classification égal ou supérieur.

Options :
  -> Réinitialiser la session et envoyer le message
  -> Demander à votre administrateur de reclassifier le canal WhatsApp
  -> En savoir plus : [lien docs]
```

Le mode éducatif est opt-in et aide les utilisateurs à comprendre _pourquoi_ une action a été bloquée, y compris quelle source de données a causé l'escalade du taint et quel est le décalage de classification. Les deux modes proposent des prochaines étapes actionnables plutôt que des erreurs sans issue.

## Comment les hooks s'enchaînent

Dans un cycle requête/réponse typique, plusieurs hooks se déclenchent en séquence. Chaque hook a une visibilité complète sur les décisions prises par les hooks précédents dans la chaîne.

```
L'utilisateur envoie : "Vérifie mon pipeline Salesforce et envoie un message à ma femme"

1. PRE_CONTEXT_INJECTION
   - Entrée du propriétaire, classifiée PUBLIC
   - Taint de session : PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - Outil autorisé ? OUI
   - L'utilisateur a une connexion Salesforce ? OUI
   - Limite de débit ? OK
   - Décision : ALLOW

3. POST_TOOL_RESPONSE (résultats Salesforce)
   - Données classifiées : CONFIDENTIAL
   - Taint de session s'élève : PUBLIC -> CONFIDENTIAL
   - Enregistrement de lignage créé

4. PRE_TOOL_CALL (whatsapp.send_message)
   - Outil autorisé ? OUI
   - Décision : ALLOW (vérification au niveau outil réussie)

5. PRE_OUTPUT (message à la femme via WhatsApp)
   - Taint de session : CONFIDENTIAL
   - Classification effective de la cible : PUBLIC (destinataire externe)
   - CONFIDENTIAL -> PUBLIC : BLOQUÉ
   - Décision : BLOCK
   - Raison : "classification_violation"

6. L'agent présente l'option de réinitialisation à l'utilisateur
```
