---
title: Dépannage des flux de travail
description: Problèmes courants et solutions lors de l'utilisation des flux de travail Triggerfish.
---

# Dépannage : Flux de travail

## « Workflow not found or not accessible »

Le flux de travail existe mais est stocké à un niveau de classification
supérieur au taint de votre session courante.

Les flux de travail enregistrés pendant une session `CONFIDENTIAL` sont
invisibles pour les sessions `PUBLIC` ou `INTERNAL`. Le stockage utilise des
vérifications `canFlowTo` à chaque chargement et renvoie `null` (affiché comme
« introuvable ») lorsque la classification du flux de travail dépasse le taint
de la session.

**Correction :** Augmentez le taint de votre session en accédant d'abord à des
données classifiées, ou réenregistrez le flux de travail depuis une session de
classification inférieure si le contenu le permet.

**Vérification :** Exécutez `workflow_list` pour voir quels flux de travail sont
visibles à votre niveau de classification actuel. Si le flux de travail attendu
est absent, il a été enregistré à un niveau supérieur.

---

## « Workflow classification ceiling breached »

Le niveau de taint de la session dépasse le `classification_ceiling` du flux de
travail. Cette vérification s'exécute avant chaque tâche, elle peut donc se
déclencher en cours d'exécution si une tâche précédente a augmenté le taint de
la session.

Par exemple, un flux de travail avec `classification_ceiling: INTERNAL`
s'arrêtera si un appel `triggerfish:memory` récupère des données `CONFIDENTIAL`
qui augmentent le taint de la session.

**Correction :**

- Augmentez le `classification_ceiling` du flux de travail pour correspondre à
  la sensibilité attendue des données.
- Ou restructurez le flux de travail pour ne pas accéder aux données classifiées.
  Utilisez des paramètres d'entrée au lieu de lire la mémoire classifiée.

---

## Erreurs d'analyse YAML

### « YAML parse error: ... »

Erreurs de syntaxe YAML courantes :

**Indentation.** YAML est sensible aux espaces. Utilisez des espaces, pas des
tabulations. Chaque niveau d'imbrication doit être exactement de 2 espaces.

```yaml
# Wrong — tabs or inconsistent indent
do:
- fetch:
      call: http

# Correct
do:
  - fetch:
      call: http
```

**Guillemets manquants autour des expressions.** Les chaînes d'expression avec
`${ }` doivent être entre guillemets, sinon YAML interprète `{` comme un mappage
en ligne.

```yaml
# Wrong — YAML parse error
endpoint: ${ .config.url }

# Correct
endpoint: "${ .config.url }"
```

**Bloc `document` manquant.** Chaque flux de travail doit avoir un champ
`document` avec `dsl`, `namespace` et `name` :

```yaml
document:
  dsl: "1.0"
  namespace: my-workflows
  name: my-workflow
```

### « Workflow YAML must be an object »

Le YAML a été analysé avec succès mais le résultat est un scalaire ou un
tableau, pas un objet. Vérifiez que votre YAML a des clés de niveau supérieur
(`document`, `do`).

### « Task has no recognized type »

Chaque entrée de tâche doit contenir exactement une clé de type : `call`, `run`,
`set`, `switch`, `for`, `raise`, `emit` ou `wait`. Si l'analyseur ne trouve
aucune de ces clés, il signale un type non reconnu.

Cause courante : une faute de frappe dans le nom du type de tâche (par ex.
`calls` au lieu de `call`).

---

## Échecs d'évaluation des expressions

### Valeurs incorrectes ou vides

Les expressions utilisent la syntaxe `${ .path.to.value }`. Le point initial est
requis -- il ancre le chemin à la racine du contexte de données du flux de
travail.

```yaml
# Wrong — missing leading dot
value: "${ result.name }"

# Correct
value: "${ .result.name }"
```

### « undefined » dans la sortie

Le chemin pointé n'a rien résolu. Causes courantes :

- **Mauvais nom de tâche.** Chaque tâche stocke son résultat sous son propre
  nom. Si votre tâche s'appelle `fetch_data`, référencez son résultat comme
  `${ .fetch_data }`, pas `${ .data }` ou `${ .result }`.
- **Mauvaise imbrication.** Si l'appel HTTP renvoie
  `{"data": {"items": [...]}}`, les éléments se trouvent à
  `${ .fetch_data.data.items }`.
- **Indexation de tableau.** Utilisez la syntaxe entre crochets :
  `${ .items[0].name }`. Les chemins avec points uniquement ne prennent pas en
  charge les indices numériques.

### Les conditions booléennes ne fonctionnent pas

Les comparaisons d'expressions sont strictes (`===`). Assurez-vous que les types
correspondent :

```yaml
# This fails if .count is a string "0"
if: "${ .count == 0 }"

# Works when .count is a number
if: "${ .count == 0 }"
```

Vérifiez si les tâches en amont renvoient des chaînes ou des nombres. Les
réponses HTTP renvoient souvent des valeurs sous forme de chaîne qui ne
nécessitent pas de conversion pour la comparaison -- comparez simplement avec la
forme chaîne.

---

## Échecs d'appels HTTP

### Délais d'attente

Les appels HTTP passent par l'outil `web_fetch`. Si le serveur cible est lent,
la requête peut expirer. Il n'y a pas de remplacement de délai par tâche pour
les appels HTTP dans le DSL de flux de travail -- le délai par défaut de l'outil
`web_fetch` s'applique.

### Blocages SSRF

Tous les HTTP sortants dans Triggerfish résolvent d'abord le DNS et vérifient
l'IP résolue contre une liste de refus codée en dur. Les plages d'IP privées et
réservées sont toujours bloquées.

Si votre flux de travail appelle un service interne à une IP privée (par ex.
`http://192.168.1.100/api`), il sera bloqué par la prévention SSRF. C'est
intentionnel et non configurable.

**Correction :** Utilisez un nom d'hôte public qui se résout vers une IP
publique, ou utilisez `triggerfish:mcp` pour router via un serveur MCP ayant un
accès direct.

### En-têtes manquants

Le type d'appel `http` transmet `with.headers` directement aux en-têtes de la
requête. Si votre API nécessite une authentification, incluez l'en-tête :

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Assurez-vous que la valeur du jeton est fournie dans l'entrée du flux de travail
ou définie par une tâche précédente.

---

## Limite de récursion des sous-flux de travail

### « Workflow recursion depth exceeded maximum of 5 »

Les sous-flux de travail peuvent s'imbriquer jusqu'à 5 niveaux de profondeur.
Cette limite empêche la récursion infinie lorsque le flux de travail A appelle
le flux de travail B qui appelle le flux de travail A.

**Correction :**

- Aplatissez la chaîne de flux de travail. Combinez les étapes en moins de flux
  de travail.
- Vérifiez les références circulaires où deux flux de travail s'appellent
  mutuellement.

---

## Exécution shell désactivée

### « Shell execution failed » ou résultat vide des tâches run

Le drapeau `allowShellExecution` dans le contexte de l'outil de flux de travail
contrôle si les tâches `run` avec les cibles `shell` ou `script` sont
autorisées. Lorsqu'il est désactivé, ces tâches échouent.

**Correction :** Vérifiez si l'exécution shell est activée dans votre
configuration Triggerfish. Dans les environnements de production, l'exécution
shell peut être intentionnellement désactivée pour des raisons de sécurité.

---

## Le flux de travail s'exécute mais produit un résultat incorrect

### Débogage avec `workflow_history`

Utilisez `workflow_history` pour inspecter les exécutions passées :

```
workflow_history with workflow_name: "my-workflow" and limit: "5"
```

Chaque entrée d'historique inclut :

- **status** -- `completed` ou `failed`
- **error** -- message d'erreur en cas d'échec
- **taskCount** -- nombre de tâches dans le flux de travail
- **startedAt / completedAt** -- informations de temporisation

### Vérification du flux de contexte

Chaque tâche stocke son résultat dans le contexte de données sous le nom de la
tâche. Si votre flux de travail a des tâches nommées `fetch`, `transform` et
`save`, le contexte de données après les trois tâches ressemble à :

```json
{
  "fetch": { "...http response..." },
  "transform": { "...transformed data..." },
  "save": { "...save result..." }
}
```

Erreurs courantes :

- **Écrasement du contexte.** Une tâche `set` qui assigne à une clé existante
  remplace la valeur précédente.
- **Mauvaise référence de tâche.** Référencer `${ .step1 }` alors que la tâche
  s'appelle `step_1`.
- **Remplacement du contexte par la transformation d'entrée.** Une directive
  `input.from` remplace entièrement le contexte d'entrée de la tâche. Si vous
  utilisez `input.from: "${ .config }"`, la tâche ne voit que l'objet `config`,
  pas le contexte complet.

### Sortie manquante

Si le flux de travail se termine mais renvoie une sortie vide, vérifiez si le
résultat de la dernière tâche est ce que vous attendez. La sortie du flux de
travail est le contexte de données complet à la fin de l'exécution, avec les
clés internes filtrées.

---

## « Permission denied » sur workflow_delete

L'outil `workflow_delete` charge d'abord le flux de travail en utilisant le
niveau de taint actuel de la session. Si le flux de travail a été enregistré à
un niveau de classification qui dépasse votre taint de session, le chargement
renvoie null et `workflow_delete` signale « introuvable » plutôt que
« permission refusée ».

C'est intentionnel -- l'existence de flux de travail classifiés n'est pas
divulguée aux sessions de classification inférieure.

**Correction :** Augmentez le taint de votre session pour égaler ou dépasser le
niveau de classification du flux de travail avant de le supprimer. Ou
supprimez-le depuis le même type de session où il a été initialement enregistré.
