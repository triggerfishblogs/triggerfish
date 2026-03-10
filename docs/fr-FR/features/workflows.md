---
title: Flux de travail
description: Automatisez des tâches multi-étapes avec le moteur DSL CNCF Serverless Workflow intégré à Triggerfish.
---

# Flux de travail

Triggerfish inclut un moteur d'exécution intégré pour le
[CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification).
Les flux de travail vous permettent de définir des automatisations déterministes
et multi-étapes en YAML qui s'exécutent **sans intervention du LLM** pendant
l'exécution. L'agent crée et déclenche les flux de travail, mais le moteur gère
la distribution des tâches, les branchements, les boucles et le flux de données.

## Quand utiliser les flux de travail

**Utilisez les flux de travail** pour des séquences répétables et déterministes
où vous connaissez les étapes à l'avance : récupérer des données depuis une API,
les transformer, les enregistrer en mémoire, envoyer une notification. La même
entrée produit toujours le même résultat.

**Utilisez l'agent directement** pour le raisonnement ouvert, l'exploration ou
les tâches où l'étape suivante dépend du jugement : recherche d'un sujet,
écriture de code, résolution d'un problème.

Une bonne règle empirique : si vous demandez régulièrement à l'agent d'effectuer
la même séquence multi-étapes, transformez-la en flux de travail.

::: info Disponibilité
Les flux de travail sont disponibles sur tous les plans. Les utilisateur·ice·s
open source utilisant leurs propres clés API ont un accès complet au moteur de
flux de travail -- chaque appel `triggerfish:llm` ou `triggerfish:agent` au sein
d'un flux de travail consomme de l'inférence auprès de votre fournisseur
configuré.
:::

## Outils

### `workflow_save`

Analyse, valide et stocke une définition de flux de travail. Le flux de travail
est enregistré au niveau de classification de la session courante.

| Parameter     | Type   | Required | Description                                   |
| ------------- | ------ | -------- | --------------------------------------------- |
| `name`        | string | yes      | Nom du flux de travail                        |
| `yaml`        | string | yes      | Définition YAML du flux de travail            |
| `description` | string | no       | Ce que fait le flux de travail                |

### `workflow_run`

Exécute un flux de travail par nom ou à partir de YAML en ligne. Renvoie le
résultat et le statut de l'exécution.

| Parameter | Type   | Required | Description                                                     |
| --------- | ------ | -------- | --------------------------------------------------------------- |
| `name`    | string | no       | Nom d'un flux de travail enregistré à exécuter                  |
| `yaml`    | string | no       | Définition YAML en ligne (lorsqu'on n'utilise pas un flux enregistré) |
| `input`   | string | no       | Chaîne JSON des données d'entrée pour le flux de travail        |

L'un des paramètres `name` ou `yaml` est requis.

### `workflow_list`

Liste tous les flux de travail enregistrés accessibles au niveau de
classification actuel. Ne prend aucun paramètre.

### `workflow_get`

Récupère une définition de flux de travail enregistré par nom.

| Parameter | Type   | Required | Description                               |
| --------- | ------ | -------- | ----------------------------------------- |
| `name`    | string | yes      | Nom du flux de travail à récupérer        |

### `workflow_delete`

Supprime un flux de travail enregistré par nom. Le flux de travail doit être
accessible au niveau de classification de la session courante.

| Parameter | Type   | Required | Description                             |
| --------- | ------ | -------- | --------------------------------------- |
| `name`    | string | yes      | Nom du flux de travail à supprimer      |

### `workflow_history`

Affiche les résultats d'exécutions passées, avec filtrage optionnel par nom de
flux de travail.

| Parameter       | Type   | Required | Description                                           |
| --------------- | ------ | -------- | ----------------------------------------------------- |
| `workflow_name` | string | no       | Filtrer les résultats par nom de flux de travail      |
| `limit`         | string | no       | Nombre maximum de résultats (par défaut 10)           |

## Types de tâches

Les flux de travail sont composés de tâches dans un bloc `do:`. Chaque tâche est
une entrée nommée avec un corps spécifique au type. Triggerfish prend en charge
8 types de tâches.

### `call` -- Appels externes

Distribution vers des points de terminaison HTTP ou des services Triggerfish.

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

Le champ `call` détermine la cible de distribution. Consultez
[Distribution des appels](#distribution-des-appels) pour la correspondance
complète.

### `run` -- Shell, script ou sous-flux de travail

Exécute une commande shell, un script en ligne ou un autre flux de travail
enregistré.

**Commande shell :**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**Sous-flux de travail :**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
L'exécution shell et script nécessite que le drapeau `allowShellExecution` soit
activé dans le contexte de l'outil de flux de travail. Si désactivé, les tâches
run avec les cibles `shell` ou `script` échoueront.
:::

### `set` -- Mutations du contexte de données

Assigne des valeurs au contexte de données du flux de travail. Prend en charge
les expressions.

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` -- Branchement conditionnel

Branche selon des conditions. Chaque cas possède une expression `when` et une
directive de flux `then`. Un cas sans `when` agit comme cas par défaut.

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` -- Itération

Boucle sur une collection, exécutant un bloc `do:` imbriqué pour chaque élément.

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

Le champ `each` nomme la variable de boucle, `in` référence la collection, et le
champ optionnel `at` fournit l'index courant.

### `raise` -- Arrêt avec erreur

Arrête l'exécution avec une erreur structurée.

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
        detail: "The requested item does not exist"
```

### `emit` -- Enregistrement d'événements

Enregistre un événement de flux de travail. Les événements sont capturés dans le
résultat d'exécution et peuvent être consultés via `workflow_history`.

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` -- Pause

Met en pause l'exécution pour une durée ISO 8601.

```yaml
- rate_limit_pause:
    wait: PT2S
```

## Distribution des appels

Le champ `call` dans une tâche d'appel détermine quel outil Triggerfish est
invoqué.

| Type d'appel           | Outil Triggerfish | Champs `with:` requis                  |
| ---------------------- | ----------------- | -------------------------------------- |
| `http`                 | `web_fetch`       | `endpoint` (ou `url`), `method`        |
| `triggerfish:llm`      | `llm_task`        | `prompt` (ou `task`)                   |
| `triggerfish:agent`    | `subagent`        | `prompt` (ou `task`)                   |
| `triggerfish:memory`   | `memory_*`        | `operation` + champs spécifiques       |
| `triggerfish:web_search` | `web_search`    | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`     | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`   |
| `triggerfish:message`  | `send_message`    | `channel`, `text`                      |

**Opérations mémoire :** Le type d'appel `triggerfish:memory` nécessite un champ
`operation` défini sur `save`, `search`, `get`, `list` ou `delete`. Les champs
`with:` restants sont transmis directement à l'outil mémoire correspondant.

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**Appels MCP :** Le type d'appel `triggerfish:mcp` route vers n'importe quel
outil de serveur MCP connecté. Spécifiez le nom du `server`, le nom de l'outil
`tool` et l'objet `arguments`.

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## Expressions

Les expressions de flux de travail utilisent la syntaxe `${ }` avec une
résolution par chemin pointé sur le contexte de données du flux de travail.

```yaml
# Simple value reference
url: "${ .config.api_url }"

# Array indexing
first_item: "${ .results[0].name }"

# String interpolation (multiple expressions in one string)
message: "Found ${ .count } issues in ${ .repo }"

# Comparison (returns boolean)
if: "${ .status == 'open' }"

# Arithmetic
total: "${ .price * .quantity }"
```

**Opérateurs pris en charge :**

- Comparaison : `==`, `!=`, `>`, `<`, `>=`, `<=`
- Arithmétique : `+`, `-`, `*`, `/`, `%`

**Littéraux :** Chaîne (`"value"` ou `'value'`), nombre (`42`, `3.14`), booléen
(`true`, `false`), null (`null`).

Lorsqu'une expression `${ }` constitue la valeur entière, le type brut est
préservé (nombre, booléen, objet). Lorsqu'elle est mélangée avec du texte, le
résultat est toujours une chaîne.

## Exemple complet

Ce flux de travail récupère un ticket GitHub, le résume avec le LLM, enregistre
le résumé en mémoire et envoie une notification.

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Fetch a GitHub issue, summarize it, and notify the team.
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "Summarize this GitHub issue in 2-3 sentences:\n\nTitle: ${ .issue_title }\n\nBody: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Issue #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Issue #${ .issue_number } summarized: ${ .summarize }"
```

**Exécutez-le :**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## Transformations d'entrée et de sortie

Les tâches peuvent transformer leur entrée avant l'exécution et leur sortie
avant de stocker les résultats.

```yaml
- fetch_data:
    call: http
    with:
      endpoint: "${ .api_url }"
    input:
      from: "${ .config }"
    output:
      from:
        items: "${ .fetch_data.data.results }"
        total: "${ .fetch_data.data.count }"
```

- **`input.from`** -- Expression ou mappage d'objet qui remplace le contexte
  d'entrée de la tâche avant l'exécution.
- **`output.from`** -- Expression ou mappage d'objet qui remodèle le résultat
  de la tâche avant de le stocker dans le contexte de données.

## Contrôle de flux

Chaque tâche peut inclure une directive `then` contrôlant ce qui se passe
ensuite :

- **`continue`** (par défaut) -- passe à la tâche suivante dans la séquence
- **`end`** -- arrête immédiatement le flux de travail (statut : completed)
- **Nom de tâche** -- saute à une tâche spécifique par nom

```yaml
- validate:
    switch:
      - invalid:
          when: "${ .input.email == null }"
          then: handle_error
      - valid:
          then: continue
- process:
    call: triggerfish:llm
    with:
      task: "Process ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "Missing email"
```

## Exécution conditionnelle

Toute tâche peut inclure un champ `if`. La tâche est ignorée lorsque la
condition s'évalue à une valeur fausse.

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## Sous-flux de travail

Une tâche `run` avec une cible `workflow` exécute un autre flux de travail
enregistré. Le sous-flux de travail s'exécute avec son propre contexte et
renvoie sa sortie au parent.

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

Les sous-flux de travail peuvent s'imbriquer jusqu'à **5 niveaux de
profondeur**. Dépasser cette limite produit une erreur et arrête l'exécution.

## Classification et sécurité

Les flux de travail participent au même système de classification que toutes les
autres données Triggerfish.

**Classification du stockage.** Lorsque vous enregistrez un flux de travail avec
`workflow_save`, il est stocké au niveau de taint de la session courante. Un flux
de travail enregistré pendant une session `CONFIDENTIAL` ne peut être chargé que
par des sessions de niveau `CONFIDENTIAL` ou supérieur.

**Plafond de classification.** Les flux de travail peuvent déclarer un
`classification_ceiling` dans leur YAML. Avant chaque exécution de tâche, le
moteur vérifie que le taint actuel de la session ne dépasse pas le plafond. Si le
taint de la session s'élève au-delà du plafond pendant l'exécution (par exemple,
en accédant à des données classifiées via un appel d'outil), le flux de travail
s'arrête avec une erreur de dépassement de plafond.

```yaml
classification_ceiling: INTERNAL
```

Valeurs valides : `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**Historique d'exécution.** Les résultats d'exécution sont stockés avec la
classification de la session au moment de l'achèvement. `workflow_history` filtre
les résultats par `canFlowTo`, de sorte que vous ne voyez que les exécutions dont
le niveau est égal ou inférieur à votre taint de session actuel.

::: danger SÉCURITÉ
La suppression d'un flux de travail nécessite que celui-ci soit accessible au
niveau de classification de votre session courante. Vous ne pouvez pas supprimer
un flux de travail stocké au niveau `CONFIDENTIAL` depuis une session `PUBLIC`.
L'outil `workflow_delete` charge d'abord le flux de travail et renvoie
« introuvable » si la vérification de classification échoue.
:::
