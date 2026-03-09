# Sessions et taint

Les sessions sont l'unité fondamentale de l'état de conversation dans Triggerfish.
Chaque session suit indépendamment un **niveau de taint** -- un filigrane de
classification qui enregistre la plus haute sensibilité des données consultées
pendant la session. Le taint pilote les décisions de sortie du policy engine :
si une session est marquée `CONFIDENTIAL`, aucune donnée de cette session ne peut
circuler vers un canal classifié en dessous de `CONFIDENTIAL`.

## Modèle de taint de session

### Comment fonctionne le taint

Lorsqu'une session accède à des données d'un certain niveau de classification,
la session entière est **marquée** à ce niveau. Le taint suit trois règles :

1. **Par conversation** : chaque session a son propre niveau de taint indépendant
2. **Escalade uniquement** : le taint peut augmenter, jamais diminuer au sein d'une session
3. **La réinitialisation complète efface tout** : le taint ET l'historique de conversation sont effacés ensemble

<img src="/diagrams/taint-escalation.svg" alt="Escalade du taint : PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Le taint ne peut que s'élever, jamais diminuer." style="max-width: 100%;" />

::: warning SÉCURITÉ Le taint ne peut jamais être réduit sélectivement. Il n'existe
aucun mécanisme pour « démarquer » une session sans effacer tout l'historique de
conversation. Cela empêche les fuites de contexte -- si la session se souvient
avoir vu des données confidentielles, le taint doit le refléter. :::

### Pourquoi le taint ne peut pas diminuer

Même si les données classifiées ne sont plus affichées, la fenêtre de contexte
du LLM les contient toujours. Le modèle peut référencer, résumer ou reprendre
des informations classifiées dans ses réponses futures. Le seul moyen sûr de
baisser le taint est d'éliminer entièrement le contexte -- ce qui est exactement
ce que fait une réinitialisation complète.

## Types de sessions

Triggerfish gère plusieurs types de sessions, chacun avec un suivi de taint indépendant :

| Type de session    | Description                                         | Taint initial | Persiste entre les redémarrages |
| ------------------ | --------------------------------------------------- | ------------- | ------------------------------- |
| **Main**           | Conversation directe principale avec le propriétaire | `PUBLIC`     | Oui                             |
| **Channel**        | Une par canal connecté (Telegram, Slack, etc.)       | `PUBLIC`     | Oui                             |
| **Background**     | Créée pour les tâches autonomes (cron, webhooks)     | `PUBLIC`     | Durée de la tâche               |
| **Agent**          | Sessions par agent pour le routage multi-agent       | `PUBLIC`     | Oui                             |
| **Group**          | Sessions de discussion de groupe                     | `PUBLIC`     | Oui                             |

::: info Les sessions d'arrière-plan démarrent toujours avec un taint `PUBLIC`,
indépendamment du niveau de taint de la session parente. C'est par conception --
les tâches cron et déclenchées par webhook ne doivent pas hériter du taint de la
session qui les a créées. :::

## Exemple d'escalade du taint

Voici un flux complet montrant l'escalade du taint et le blocage de politique qui en résulte :

<img src="/diagrams/taint-with-blocks.svg" alt="Exemple d'escalade du taint : la session démarre PUBLIC, s'élève à CONFIDENTIAL après l'accès Salesforce, puis BLOQUE la sortie vers le canal PUBLIC WhatsApp" style="max-width: 100%;" />

## Mécanisme de réinitialisation complète

Une réinitialisation de session est le seul moyen de baisser le taint. C'est une opération délibérée et destructive :

1. **Archiver les enregistrements de lignage** -- Toutes les données de lignage de la session sont préservées dans le stockage d'audit
2. **Effacer l'historique de conversation** -- La fenêtre de contexte entière est effacée
3. **Réinitialiser le taint à PUBLIC** -- La session repart à zéro
4. **Exiger la confirmation de l'utilisateur** -- Le hook `SESSION_RESET` exige une confirmation explicite avant exécution

Après une réinitialisation, la session est indiscernable d'une session toute neuve. L'agent n'a aucune mémoire de la conversation précédente. C'est le seul moyen de garantir que les données classifiées ne peuvent pas fuiter via le contexte du LLM.

## Communication inter-sessions

Lorsqu'un agent envoie des données entre sessions via `sessions_send`, les mêmes règles de write-down s'appliquent :

| Taint de la session source | Canal de la session cible | Décision |
| -------------------------- | ------------------------- | -------- |
| `PUBLIC`                   | Canal `PUBLIC`            | ALLOW    |
| `CONFIDENTIAL`             | Canal `CONFIDENTIAL`      | ALLOW    |
| `CONFIDENTIAL`             | Canal `PUBLIC`            | BLOCK    |
| `RESTRICTED`               | Canal `CONFIDENTIAL`      | BLOCK    |

Outils de session disponibles pour l'agent :

| Outil              | Description                                  | Impact sur le taint                       |
| ------------------ | -------------------------------------------- | ----------------------------------------- |
| `sessions_list`    | Lister les sessions actives avec filtres     | Pas de changement de taint                |
| `sessions_history` | Récupérer la transcription d'une session     | Le taint hérite de la session référencée  |
| `sessions_send`    | Envoyer un message à une autre session       | Soumis à la vérification du write-down    |
| `sessions_spawn`   | Créer une session de tâche d'arrière-plan    | Nouvelle session au taint `PUBLIC`        |
| `session_status`   | Vérifier l'état et les métadonnées de la session | Pas de changement de taint            |

## Lignage des données

Chaque élément de données traité par Triggerfish porte des **métadonnées de provenance** -- un enregistrement complet de l'origine des données, de leurs transformations et de leur destination. Le lignage est la piste d'audit qui rend les décisions de classification vérifiables.

### Structure d'un enregistrement de lignage

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Selected fields: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    },
    {
      "type": "summarization",
      "description": "LLM summarized 3 records into pipeline overview",
      "timestamp": "2025-01-29T10:23:47Z",
      "input_lineage_ids": ["lin_789xyz", "lin_790xyz", "lin_791xyz"],
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

### Règles de suivi du lignage

| Événement                                     | Action de lignage                                       |
| --------------------------------------------- | ------------------------------------------------------- |
| Données lues depuis une intégration            | Créer un enregistrement de lignage avec l'origine       |
| Données transformées par le LLM                | Ajouter la transformation, lier les lignages d'entrée   |
| Données agrégées de plusieurs sources          | Fusionner le lignage, classification = `max(entrées)`   |
| Données envoyées vers un canal                 | Enregistrer la destination, vérifier la classification  |
| Réinitialisation de session                    | Archiver les enregistrements de lignage, effacer du contexte |

### Classification par agrégation

Lorsque des données de plusieurs sources sont combinées (par exemple, un résumé LLM d'enregistrements de différentes intégrations), le résultat agrégé hérite de la **classification maximale** de toutes les entrées :

```
Entrée 1 : INTERNAL    (wiki interne)
Entrée 2 : CONFIDENTIAL (enregistrement Salesforce)
Entrée 3 : PUBLIC      (API météo)

Classification de la sortie agrégée : CONFIDENTIAL (max des entrées)
```

::: tip Les déploiements entreprise peuvent configurer des règles de déclassement optionnelles pour les agrégats statistiques (moyennes, comptages, sommes de 10+ enregistrements) ou les données anonymisées certifiées. Tous les déclassements nécessitent des règles de politique explicites, sont journalisés avec une justification complète et sont soumis à examen d'audit. :::

### Capacités d'audit

Le lignage permet quatre catégories de requêtes d'audit :

- **Trace en avant** : « Qu'est-il advenu des données de l'enregistrement Salesforce X ? » -- suit les données en avant depuis l'origine vers toutes les destinations
- **Trace en arrière** : « Quelles sources ont contribué à cette sortie ? » -- retrace une sortie jusqu'à tous ses enregistrements sources
- **Justification de classification** : « Pourquoi est-ce marqué CONFIDENTIAL ? » -- montre la chaîne de raison de classification
- **Export de conformité** : chaîne de garde complète pour examen légal ou réglementaire

## Persistance du taint

Le taint de session est persisté via le `StorageProvider` sous l'espace de noms `taint:`. Cela signifie que le taint survit aux redémarrages du daemon -- une session qui était `CONFIDENTIAL` avant un redémarrage est toujours `CONFIDENTIAL` après.

Les enregistrements de lignage sont persistés sous l'espace de noms `lineage:` avec une rétention orientée conformité (90 jours par défaut).
