# Audit et conformité

Chaque décision de politique dans Triggerfish est journalisée avec le contexte complet. Il n'y a aucune exception, aucun « mode debug » qui désactive la journalisation, et aucun moyen pour le LLM de supprimer les enregistrements d'audit. Cela fournit un enregistrement complet et résistant aux altérations de chaque décision de sécurité prise par le système.

## Ce qui est enregistré

La journalisation d'audit est une **règle fixe** -- elle est toujours active et ne peut pas être désactivée. Chaque exécution de hook d'application produit un enregistrement d'audit contenant :

| Champ             | Description                                                                                                                                                                        |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `timestamp`       | Quand la décision a été prise (ISO 8601, UTC)                                                                                                                                      |
| `hook_type`       | Quel hook d'application s'est exécuté (`PRE_CONTEXT_INJECTION`, `PRE_TOOL_CALL`, `POST_TOOL_RESPONSE`, `PRE_OUTPUT`, `SECRET_ACCESS`, `SESSION_RESET`, `AGENT_INVOCATION`, `MCP_TOOL_CALL`) |
| `session_id`      | La session dans laquelle l'action a eu lieu                                                                                                                                        |
| `decision`        | `ALLOW`, `BLOCK` ou `REDACT`                                                                                                                                                       |
| `reason`          | Explication lisible de la décision                                                                                                                                                  |
| `input`           | Les données ou l'action qui ont déclenché le hook                                                                                                                                   |
| `rules_evaluated` | Quelles règles de politique ont été vérifiées pour atteindre la décision                                                                                                           |
| `taint_before`    | Niveau de taint de session avant l'action                                                                                                                                           |
| `taint_after`     | Niveau de taint de session après l'action (si changé)                                                                                                                               |
| `metadata`        | Contexte supplémentaire spécifique au type de hook                                                                                                                                  |

## Exemples d'enregistrements d'audit

### Sortie autorisée

```json
{
  "timestamp": "2025-01-29T10:23:47Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Classification check passed",
  "input": {
    "target_channel": "telegram",
    "recipient": "owner"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification"
  ],
  "taint_before": "INTERNAL",
  "taint_after": "INTERNAL"
}
```

### Write-down bloqué

```json
{
  "timestamp": "2025-01-29T10:24:12Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Session taint (CONFIDENTIAL) exceeds effective classification (PUBLIC)",
  "input": {
    "target_channel": "whatsapp",
    "recipient": "external_user_789",
    "effective_classification": "PUBLIC"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification",
    "recipient_classification"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

### Appel d'outil avec escalade du taint

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "POST_TOOL_RESPONSE",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Tool response classified and taint updated",
  "input": {
    "tool_name": "salesforce.query_opportunities",
    "response_classification": "CONFIDENTIAL"
  },
  "rules_evaluated": [
    "tool_response_classification",
    "taint_escalation"
  ],
  "taint_before": "PUBLIC",
  "taint_after": "CONFIDENTIAL",
  "metadata": {
    "lineage_id": "lin_789xyz",
    "records_returned": 3
  }
}
```

### Délégation d'agent bloquée

```json
{
  "timestamp": "2025-01-29T10:25:00Z",
  "hook_type": "AGENT_INVOCATION",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Agent ceiling (INTERNAL) below session taint (CONFIDENTIAL)",
  "input": {
    "caller_agent_id": "agent_abc",
    "callee_agent_id": "agent_def",
    "callee_ceiling": "INTERNAL",
    "task": "Generate public summary"
  },
  "rules_evaluated": [
    "delegation_ceiling_check",
    "delegation_allowlist",
    "delegation_depth"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL"
}
```

## Capacités de trace d'audit

<img src="/diagrams/audit-trace-flow.svg" alt="Flux de trace d'audit : trace en avant, trace en arrière et justification de classification alimentent l'export de conformité" style="max-width: 100%;" />

Les enregistrements d'audit peuvent être interrogés de quatre manières, chacune répondant à un besoin différent de conformité et d'investigation.

### Trace en avant

**Question :** « Qu'est-il advenu des données de l'enregistrement Salesforce `opp_00123ABC` ? »

Une trace en avant suit un élément de données depuis son point d'origine à travers chaque transformation, session et sortie. Elle répond à : où ces données sont-elles allées, qui les a vues, et ont-elles été envoyées en dehors de l'organisation ?

### Trace en arrière

**Question :** « Quelles sources ont contribué au message envoyé à 10:24 UTC ? »

Une trace en arrière part d'une sortie et remonte la chaîne de lignage pour identifier chaque source de données qui a influencé la sortie.

### Justification de classification

**Question :** « Pourquoi est-ce marqué CONFIDENTIAL ? »

La justification de classification remonte à la règle ou la politique qui a attribué le niveau de classification.

### Export de conformité

Pour une revue légale, réglementaire ou interne, Triggerfish peut exporter la chaîne de garde complète pour tout élément de données ou plage temporelle.

::: tip Les exports de conformité sont des fichiers JSON structurés qui peuvent être ingérés par les systèmes SIEM, les tableaux de bord de conformité ou les outils de revue juridique. Le format d'export est stable et versionné. :::

## Lignage des données

La journalisation d'audit fonctionne conjointement avec le système de lignage des données de Triggerfish. Chaque élément de données traité par Triggerfish porte des métadonnées de provenance.

| Événement                                     | Action de lignage                                       |
| --------------------------------------------- | ------------------------------------------------------- |
| Données lues depuis une intégration            | Créer un enregistrement de lignage avec l'origine       |
| Données transformées par le LLM                | Ajouter la transformation, lier les lignages d'entrée   |
| Données agrégées de plusieurs sources          | Fusionner le lignage, classification = max(entrées)     |
| Données envoyées vers un canal                 | Enregistrer la destination, vérifier la classification  |
| Réinitialisation de session                    | Archiver les enregistrements de lignage, effacer du contexte |

## Stockage et rétention

Les journaux d'audit sont persistés via l'abstraction `StorageProvider` sous l'espace de noms `audit:`. Les enregistrements de lignage sont stockés sous l'espace de noms `lineage:`.

| Type de données       | Espace de noms | Rétention par défaut            |
| --------------------- | -------------- | ------------------------------- |
| Journaux d'audit      | `audit:`       | 1 an                            |
| Enregistrements de lignage | `lineage:` | 90 jours                       |
| État de session       | `sessions:`    | 30 jours                        |
| Historique de taint   | `taint:`       | Identique à la session          |

::: warning SÉCURITÉ Les périodes de rétention sont configurables, mais les journaux d'audit sont par défaut à 1 an pour supporter les exigences de conformité (SOC 2, RGPD, HIPAA). Réduire la période de rétention en dessous de l'exigence réglementaire de votre organisation relève de la responsabilité de l'administrateur. :::

### Backends de stockage

| Tier           | Backend   | Détails                                                                                                                                                          |
| -------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Personnel**  | SQLite    | Base de données en mode WAL à `~/.triggerfish/data/triggerfish.db`. Les enregistrements d'audit sont stockés en JSON structuré dans la même base que tout l'état Triggerfish. |
| **Entreprise** | Pluggable | Les backends entreprise (Postgres, S3, etc.) peuvent être utilisés via l'interface `StorageProvider`. Cela permet l'intégration avec l'infrastructure d'agrégation de logs existante. |

## Immuabilité et intégrité

Les enregistrements d'audit sont en mode ajout uniquement. Une fois écrits, ils ne peuvent être ni modifiés ni supprimés par aucun composant du système -- y compris le LLM, l'agent ou les plugins. La suppression ne se fait que par expiration de la politique de rétention.

Chaque enregistrement d'audit inclut un hash de contenu qui peut être utilisé pour vérifier l'intégrité. Si les enregistrements sont exportés pour une revue de conformité, les hashes peuvent être validés par rapport aux enregistrements stockés pour détecter les altérations.

## Fonctionnalités de conformité entreprise

Les déploiements entreprise peuvent étendre la journalisation d'audit avec :

| Fonctionnalité                | Description                                                                                         |
| ----------------------------- | --------------------------------------------------------------------------------------------------- |
| **Conservation légale**       | Suspendre la suppression basée sur la rétention pour des utilisateurs, sessions ou plages temporelles spécifiés |
| **Intégration SIEM**          | Diffuser les événements d'audit vers Splunk, Datadog ou d'autres systèmes SIEM en temps réel        |
| **Tableaux de bord de conformité** | Vue d'ensemble visuelle des décisions de politique, actions bloquées et patterns de taint       |
| **Exports planifiés**         | Exports périodiques automatiques pour revue réglementaire                                            |
| **Règles d'alerte**           | Déclencher des notifications lors de patterns d'audit spécifiques (ex. write-downs bloqués répétés)  |

## Pages connexes

- [Conception axée sécurité](./) -- vue d'ensemble de l'architecture de sécurité
- [Règle du No Write-Down](./no-write-down) -- la règle de flux de classification dont l'application est journalisée
- [Identité et authentification](./identity) -- comment les décisions d'identité sont enregistrées
- [Délégation d'agent](./agent-delegation) -- comment les chaînes de délégation apparaissent dans les enregistrements d'audit
- [Gestion des secrets](./secrets) -- comment l'accès aux identifiants est journalisé
