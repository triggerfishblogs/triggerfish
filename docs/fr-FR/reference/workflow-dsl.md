---
title: Référence DSL de flux de travail
description: Référence complète du CNCF Serverless Workflow DSL 1.0 tel qu'implémenté dans Triggerfish.
---

# Référence DSL de flux de travail

Référence complète du CNCF Serverless Workflow DSL 1.0 tel qu'implémenté dans le
moteur de flux de travail de Triggerfish. Pour le guide d'utilisation et les
exemples, consultez [Flux de travail](/fr-FR/features/workflows).

## Structure du document

Chaque YAML de flux de travail doit comporter un champ `document` de niveau
supérieur et un bloc `do`.

```yaml
document:
  dsl: "1.0"
  namespace: my-namespace
  name: my-workflow
  version: "1.0.0"            # optional
  description: "What it does"  # optional
classification_ceiling: INTERNAL  # optional
input:                            # optional
  from: "${ . }"
output:                           # optional
  from:
    result: "${ .final_step }"
timeout:                          # optional
  after: PT5M
do:
  - task_name:
      # task definition
```

### Métadonnées du document

| Field         | Type   | Required | Description                                            |
| ------------- | ------ | -------- | ------------------------------------------------------ |
| `dsl`         | string | yes      | Version du DSL. Doit être `"1.0"`                      |
| `namespace`   | string | yes      | Regroupement logique (par ex. `ops`, `reports`)        |
| `name`        | string | yes      | Nom unique du flux de travail au sein du namespace     |
| `version`     | string | no       | Chaîne de version sémantique                           |
| `description` | string | no       | Description lisible par l'humain                       |

### Champs de niveau supérieur

| Field                     | Type         | Required | Description                                                    |
| ------------------------- | ------------ | -------- | -------------------------------------------------------------- |
| `document`                | object       | yes      | Métadonnées du document (voir ci-dessus)                       |
| `do`                      | array        | yes      | Liste ordonnée des entrées de tâches                           |
| `classification_ceiling`  | string       | no       | Taint de session maximum autorisé pendant l'exécution          |
| `input`                   | transform    | no       | Transformation appliquée à l'entrée du flux de travail         |
| `output`                  | transform    | no       | Transformation appliquée à la sortie du flux de travail        |
| `timeout`                 | object       | no       | Délai d'expiration au niveau du flux (`after: <ISO 8601>`)     |
| `metadata`                | object       | no       | Métadonnées clé-valeur arbitraires                             |

---

## Format des entrées de tâches

Chaque entrée dans le bloc `do` est un objet à clé unique. La clé est le nom de
la tâche, la valeur est la définition de la tâche.

```yaml
do:
  - my_task_name:
      call: http
      with:
        endpoint: "https://example.com"
```

Les noms de tâches doivent être uniques au sein du même bloc `do`. Le résultat
de la tâche est stocké dans le contexte de données sous le nom de la tâche.

---

## Champs communs aux tâches

Tous les types de tâches partagent ces champs optionnels :

| Field      | Type      | Description                                                           |
| ---------- | --------- | --------------------------------------------------------------------- |
| `if`       | string    | Condition d'expression. La tâche est ignorée si la valeur est fausse. |
| `input`    | transform | Transformation appliquée avant l'exécution de la tâche                |
| `output`   | transform | Transformation appliquée après l'exécution de la tâche                |
| `timeout`  | object    | Délai d'expiration de la tâche : `after: <durée ISO 8601>`            |
| `then`     | string    | Directive de flux : `continue`, `end` ou un nom de tâche              |
| `metadata` | object    | Métadonnées clé-valeur arbitraires (non utilisées par le moteur)      |

---

## Types de tâches

### `call`

Distribution vers un point de terminaison HTTP ou un service Triggerfish.

| Field  | Type   | Required | Description                                          |
| ------ | ------ | -------- | ---------------------------------------------------- |
| `call` | string | yes      | Type d'appel (voir le tableau de distribution ci-dessous) |
| `with` | object | no       | Arguments transmis à l'outil cible                   |

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      method: GET
```

### `run`

Exécute une commande shell, un script en ligne ou un sous-flux de travail. Le
champ `run` doit contenir exactement un des éléments suivants : `shell`,
`script` ou `workflow`.

**Shell :**

| Field                  | Type   | Required | Description                    |
| ---------------------- | ------ | -------- | ------------------------------ |
| `run.shell.command`    | string | yes      | Commande shell à exécuter      |
| `run.shell.arguments`  | object | no       | Arguments nommés               |
| `run.shell.environment`| object | no       | Variables d'environnement      |

**Script :**

| Field                  | Type   | Required | Description                    |
| ---------------------- | ------ | -------- | ------------------------------ |
| `run.script.language`  | string | yes      | Langage du script              |
| `run.script.code`      | string | yes      | Code du script en ligne        |
| `run.script.arguments` | object | no       | Arguments nommés               |

**Sous-flux de travail :**

| Field                | Type   | Required | Description                              |
| -------------------- | ------ | -------- | ---------------------------------------- |
| `run.workflow.name`  | string | yes      | Nom du flux de travail enregistré        |
| `run.workflow.version` | string | no     | Contrainte de version                    |
| `run.workflow.input` | object | no       | Données d'entrée pour le sous-flux       |

### `set`

Assigne des valeurs au contexte de données.

| Field | Type   | Required | Description                                                             |
| ----- | ------ | -------- | ----------------------------------------------------------------------- |
| `set` | object | yes      | Paires clé-valeur à assigner. Les valeurs peuvent être des expressions. |

```yaml
- prepare:
    set:
      full_name: "${ .first_name } ${ .last_name }"
      count: 0
```

### `switch`

Branchement conditionnel. Le champ `switch` est un tableau d'entrées de cas.
Chaque cas est un objet à clé unique dont la clé est le nom du cas.

| Case field | Type   | Required | Description                                               |
| ---------- | ------ | -------- | --------------------------------------------------------- |
| `when`     | string | no       | Condition d'expression. Omettre pour le cas par défaut.   |
| `then`     | string | yes      | Directive de flux : `continue`, `end` ou nom de tâche     |

Les cas sont évalués dans l'ordre. Le premier cas avec un `when` véridique (ou
sans `when`) est pris.

```yaml
- route:
    switch:
      - high:
          when: "${ .priority > 7 }"
          then: alert_team
      - low:
          then: log_only
```

### `for`

Itération sur une collection.

| Field      | Type   | Required | Description                                    |
| ---------- | ------ | -------- | ---------------------------------------------- |
| `for.each` | string | yes      | Nom de variable pour l'élément courant         |
| `for.in`   | string | yes      | Expression référençant la collection           |
| `for.at`   | string | no       | Nom de variable pour l'index courant           |
| `do`       | array  | yes      | Liste de tâches imbriquées exécutées par itération |

```yaml
- process_all:
    for:
      each: item
      in: "${ .items }"
      at: idx
    do:
      - handle:
          call: triggerfish:llm
          with:
            task: "Process item ${ .idx }: ${ .item.name }"
```

### `raise`

Arrête le flux de travail avec une erreur structurée.

| Field                | Type   | Required | Description                |
| -------------------- | ------ | -------- | -------------------------- |
| `raise.error.status` | number | yes      | Code de statut style HTTP  |
| `raise.error.type`   | string | yes      | URI/chaîne de type d'erreur|
| `raise.error.title`  | string | yes      | Titre lisible par l'humain |
| `raise.error.detail` | string | no       | Message d'erreur détaillé  |

```yaml
- abort:
    raise:
      error:
        status: 422
        type: "validation-error"
        title: "Invalid input"
        detail: "Field 'email' is required"
```

### `emit`

Enregistre un événement de flux de travail. Les événements sont stockés dans le
résultat d'exécution.

| Field                | Type   | Required | Description                   |
| -------------------- | ------ | -------- | ----------------------------- |
| `emit.event.type`    | string | yes      | Identifiant du type d'événement |
| `emit.event.source`  | string | no       | URI source de l'événement     |
| `emit.event.data`    | object | no       | Charge utile de l'événement   |

```yaml
- record:
    emit:
      event:
        type: "step.completed"
        source: "workflow/pipeline"
        data:
          step: "transform"
          duration_ms: 1200
```

### `wait`

Met en pause l'exécution pour une durée donnée.

| Field  | Type   | Required | Description                          |
| ------ | ------ | -------- | ------------------------------------ |
| `wait` | string | yes      | Durée ISO 8601 (par ex. `PT5S`)      |

Durées courantes : `PT1S` (1 seconde), `PT30S` (30 secondes), `PT1M`
(1 minute), `PT5M` (5 minutes).

---

## Tableau de distribution des appels

Associe la valeur du champ `call` à l'outil Triggerfish effectivement invoqué.

| Valeur `call`          | Outil invoqué    | Champs `with:` requis                                              |
| ---------------------- | ---------------- | ------------------------------------------------------------------ |
| `http`                 | `web_fetch`      | `endpoint` ou `url` ; optionnel `method`, `headers`, `body`       |
| `triggerfish:llm`      | `llm_task`       | `prompt` ou `task` ; optionnel `tools`, `max_iterations`           |
| `triggerfish:agent`    | `subagent`       | `prompt` ou `task` ; optionnel `tools`, `agent`                    |
| `triggerfish:memory`   | `memory_*`       | `operation` (`save`/`search`/`get`/`list`/`delete`) + champs de l'opération |
| `triggerfish:web_search` | `web_search`   | `query` ; optionnel `max_results`                                  |
| `triggerfish:web_fetch`  | `web_fetch`    | `url` ; optionnel `method`, `headers`, `body`                      |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool` ; optionnel `arguments`                  |
| `triggerfish:message`  | `send_message`   | `channel`, `text` ; optionnel `recipient`                          |

Les types d'appel CNCF non pris en charge (`grpc`, `openapi`, `asyncapi`)
renvoient une erreur.

---

## Syntaxe des expressions

Les expressions sont délimitées par `${ }` et sont résolues sur le contexte de
données du flux de travail.

### Résolution par chemin pointé

| Syntaxe                 | Description                         | Exemple de résultat   |
| ----------------------- | ----------------------------------- | --------------------- |
| `${ . }`                | Contexte de données complet         | `{...}`               |
| `${ .key }`             | Clé de niveau supérieur             | `"value"`             |
| `${ .a.b.c }`           | Clé imbriquée                       | `"deep value"`        |
| `${ .items[0] }`        | Index de tableau                    | `{...premier élément...}` |
| `${ .items[0].name }`   | Index de tableau puis clé           | `"first"`             |

Le point initial (ou `$.`) ancre le chemin à la racine du contexte. Les chemins
qui se résolvent en `undefined` produisent une chaîne vide lorsqu'ils sont
interpolés, ou `undefined` lorsqu'ils sont utilisés comme valeur autonome.

### Opérateurs

| Type        | Opérateurs                     | Exemple                        |
| ----------- | ------------------------------ | ------------------------------ |
| Comparaison | `==`, `!=`, `>`, `<`, `>=`, `<=` | `${ .count > 0 }`          |
| Arithmétique| `+`, `-`, `*`, `/`, `%`        | `${ .price * .quantity }`      |

Les expressions de comparaison renvoient `true` ou `false`. Les expressions
arithmétiques renvoient un nombre (`undefined` si l'un des opérandes n'est pas
numérique ou en cas de division par zéro).

### Littéraux

| Type    | Exemples                 |
| ------- | ------------------------ |
| String  | `"hello"`, `'hello'`     |
| Number  | `42`, `3.14`, `-1`       |
| Boolean | `true`, `false`          |
| Null    | `null`                   |

### Modes d'interpolation

**Expression unique (valeur brute) :** Lorsque la chaîne entière est une seule
expression `${ }`, la valeur typée brute est renvoyée (nombre, booléen, objet,
tableau).

```yaml
count: "${ .items.length }"  # returns a number, not a string
```

**Mixte / expressions multiples (chaîne) :** Lorsque des expressions `${ }` sont
mélangées avec du texte ou qu'il y a plusieurs expressions, le résultat est
toujours une chaîne.

```yaml
message: "Found ${ .count } items in ${ .category }"  # returns a string
```

### Véracité

Pour les conditions `if:` et les expressions `when:` de `switch`, les valeurs
sont évaluées selon la véracité style JavaScript :

| Valeur                        | Véridique ? |
| ----------------------------- | ----------- |
| `true`                        | oui         |
| Nombre non nul                | oui         |
| Chaîne non vide               | oui         |
| Tableau non vide              | oui         |
| Objet                         | oui         |
| `false`, `0`, `""`, `null`, `undefined`, tableau vide | non |

---

## Transformations d'entrée/sortie

Les transformations remodèlent les données circulant dans et hors des tâches.

### `input`

Appliquée avant l'exécution de la tâche. Remplace la vue du contexte de données
de la tâche.

```yaml
- step:
    call: http
    input:
      from: "${ .config }"       # task sees only the config object
    with:
      endpoint: "${ .api_url }"  # resolved against the config object
```

**`from` en tant que chaîne :** Expression qui remplace entièrement le contexte
d'entrée.

**`from` en tant qu'objet :** Associe de nouvelles clés à des expressions :

```yaml
input:
  from:
    url: "${ .config.api_url }"
    token: "${ .secrets.api_token }"
```

### `output`

Appliquée après l'exécution de la tâche. Remodèle le résultat avant de le
stocker dans le contexte sous le nom de la tâche.

```yaml
- fetch:
    call: http
    output:
      from:
        items: "${ .fetch.data.results }"
        count: "${ .fetch.data.total }"
```

---

## Directives de flux

Le champ `then` sur toute tâche contrôle le flux d'exécution après la complétion
de la tâche.

| Valeur       | Comportement                                             |
| ------------ | -------------------------------------------------------- |
| `continue`   | Passe à la tâche suivante dans la séquence (par défaut)  |
| `end`        | Arrête le flux de travail. Statut : `completed`.         |
| `<nom de tâche>` | Saute à la tâche nommée. La tâche doit exister dans le même bloc `do`. |

Les cas de switch utilisent également des directives de flux dans leur champ
`then`.

---

## Plafond de classification

Champ optionnel restreignant le taint de session maximum pendant l'exécution.

```yaml
classification_ceiling: INTERNAL
```

| Valeur         | Signification                                         |
| -------------- | ----------------------------------------------------- |
| `PUBLIC`       | Le flux de travail s'arrête si des données classifiées sont accédées |
| `INTERNAL`     | Autorise les données `PUBLIC` et `INTERNAL`           |
| `CONFIDENTIAL` | Autorise les données jusqu'à `CONFIDENTIAL`          |
| `RESTRICTED`   | Autorise tous les niveaux de classification           |
| *(omis)*       | Aucun plafond appliqué                                |

Le plafond est vérifié avant chaque tâche. Si le taint de la session a augmenté
au-delà du plafond (par exemple, parce qu'une tâche précédente a accédé à des
données classifiées), le flux de travail s'arrête avec le statut `failed` et
l'erreur `Workflow classification ceiling breached`.

---

## Stockage

### Définitions de flux de travail

Stockées avec le préfixe de clé `workflows:{name}`. Chaque enregistrement
contient :

| Field            | Type   | Description                                         |
| ---------------- | ------ | --------------------------------------------------- |
| `name`           | string | Nom du flux de travail                              |
| `yaml`           | string | Définition YAML brute                               |
| `classification` | string | Niveau de classification au moment de l'enregistrement |
| `savedAt`        | string | Horodatage ISO 8601                                 |
| `description`    | string | Description optionnelle                             |

### Historique d'exécution

Stocké avec le préfixe de clé `workflow-runs:{runId}`. Chaque enregistrement
d'exécution contient :

| Field            | Type   | Description                                         |
| ---------------- | ------ | --------------------------------------------------- |
| `runId`          | string | UUID de cette exécution                             |
| `workflowName`   | string | Nom du flux de travail exécuté                      |
| `status`         | string | `completed`, `failed` ou `cancelled`                |
| `output`         | object | Contexte de données final (clés internes filtrées)  |
| `events`         | array  | Événements émis pendant l'exécution                 |
| `error`          | string | Message d'erreur (si le statut est `failed`)        |
| `startedAt`      | string | Horodatage ISO 8601                                 |
| `completedAt`    | string | Horodatage ISO 8601                                 |
| `taskCount`      | number | Nombre de tâches dans le flux de travail            |
| `classification` | string | Taint de session à la complétion                    |

---

## Limites

| Limite                        | Valeur | Description                                         |
| ----------------------------- | ------ | --------------------------------------------------- |
| Profondeur max. sous-flux     | 5      | Imbrication maximale des appels `run.workflow`       |
| Limite par défaut historique  | 10     | `limit` par défaut pour `workflow_history`           |

---

## Statuts d'exécution

| Statut      | Description                                                       |
| ----------- | ----------------------------------------------------------------- |
| `pending`   | Le flux de travail a été créé mais pas encore démarré             |
| `running`   | Le flux de travail est en cours d'exécution                       |
| `completed` | Toutes les tâches se sont terminées avec succès (ou `then: end`)  |
| `failed`    | Une tâche a échoué, un `raise` a été atteint ou le plafond dépassé|
| `cancelled` | L'exécution a été annulée de l'extérieur                          |
