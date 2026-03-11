# Mode plan et suivi des taches

Triggerfish fournit deux outils complementaires pour le travail structure : le **mode plan**
pour la planification d'implementations complexes, et le **suivi de taches** pour la gestion des taches
a travers les sessions.

## Mode plan

Le mode plan contraint l'agent a une exploration en lecture seule et a une planification structuree
avant d'effectuer des modifications. Cela empeche l'agent de se lancer dans l'implementation
avant de comprendre le probleme.

### Outils

#### `plan_enter`

Entrer en mode plan. Bloque les operations d'ecriture (`write_file`, `cron_create`,
`cron_delete`) jusqu'a l'approbation du plan.

| Parametre | Type   | Requis | Description                                                          |
| --------- | ------ | ------ | -------------------------------------------------------------------- |
| `goal`    | string | oui    | Ce que l'agent prevoit de construire/modifier                        |
| `scope`   | string | non    | Limiter l'exploration a des repertoires ou modules specifiques       |

#### `plan_exit`

Sortir du mode plan et presenter le plan d'implementation pour approbation. Ne
commence **pas** automatiquement l'execution.

| Parametre | Type   | Requis | Description                                                                       |
| --------- | ------ | ------ | --------------------------------------------------------------------------------- |
| `plan`    | object | oui    | Le plan d'implementation (resume, approche, etapes, risques, fichiers, tests)     |

L'objet plan inclut :

- `summary` -- Ce que le plan accomplit
- `approach` -- Comment ce sera fait
- `alternatives_considered` -- Quelles autres approches ont ete evaluees
- `steps` -- Liste ordonnee d'etapes d'implementation, chacune avec des fichiers,
  des dependances et une verification
- `risks` -- Risques connus et attenuations
- `files_to_create`, `files_to_modify`, `tests_to_write`
- `estimated_complexity`

#### `plan_status`

Retourne l'etat actuel du mode plan : mode actif, objectif et progression du plan.

#### `plan_approve`

Approuver le plan en attente et commencer l'execution. Appele lorsque vous approuvez.

#### `plan_reject`

Rejeter le plan en attente et revenir au mode normal.

#### `plan_step_complete`

Marquer une etape du plan comme terminee pendant l'execution.

| Parametre             | Type   | Requis | Description                                   |
| --------------------- | ------ | ------ | --------------------------------------------- |
| `step_id`             | number | oui    | L'identifiant de l'etape a marquer comme terminee |
| `verification_result` | string | oui    | Sortie de la commande de verification         |

#### `plan_complete`

Marquer le plan entier comme termine.

| Parametre    | Type   | Requis | Description                              |
| ------------ | ------ | ------ | ---------------------------------------- |
| `summary`    | string | oui    | Ce qui a ete accompli                    |
| `deviations` | array  | non    | Tout ecart par rapport au plan original  |

#### `plan_modify`

Demander une modification a une etape du plan approuve. Necessite l'approbation de l'utilisateur.

| Parametre          | Type   | Requis | Description                              |
| ------------------ | ------ | ------ | ---------------------------------------- |
| `step_id`          | number | oui    | Quelle etape doit etre modifiee          |
| `reason`           | string | oui    | Pourquoi le changement est necessaire    |
| `new_description`  | string | oui    | Description mise a jour de l'etape       |
| `new_files`        | array  | non    | Liste de fichiers mise a jour            |
| `new_verification` | string | non    | Commande de verification mise a jour     |

### Workflow

```
1. Vous demandez quelque chose de complexe
2. L'agent appelle plan_enter({ goal: "..." })
3. L'agent explore la base de code (outils en lecture seule uniquement)
4. L'agent appelle plan_exit({ plan: { ... } })
5. Vous examinez le plan
6. Vous approuvez -> l'agent appelle plan_approve
   (ou rejetez -> l'agent appelle plan_reject)
7. L'agent execute etape par etape, appelant plan_step_complete apres chacune
8. L'agent appelle plan_complete une fois termine
```

### Quand utiliser le mode plan

L'agent entre en mode plan pour les taches complexes : construire des fonctionnalites, refactoriser
des systemes, implementer des modifications multi-fichiers. Pour les taches simples (corriger une faute de frappe, renommer
une variable), il saute le mode plan et agit directement.

## Suivi des taches

L'agent dispose d'une liste de taches persistante pour suivre le travail multi-etapes a travers
les sessions.

### Outils

#### `todo_read`

Lire la liste de taches actuelle. Retourne tous les elements avec leur identifiant, contenu, statut,
priorite et horodatages.

#### `todo_write`

Remplacer la liste de taches entiere. C'est un remplacement complet, pas une mise a jour
partielle.

| Parametre | Type  | Requis | Description                          |
| --------- | ----- | ------ | ------------------------------------ |
| `todos`   | array | oui    | Liste complete des elements de tache |

Chaque element de tache possede :

| Champ        | Type   | Valeurs                               |
| ------------ | ------ | ------------------------------------- |
| `id`         | string | Identifiant unique                    |
| `content`    | string | Description de la tache               |
| `status`     | string | `pending`, `in_progress`, `completed` |
| `priority`   | string | `high`, `medium`, `low`               |
| `created_at` | string | Horodatage ISO                        |
| `updated_at` | string | Horodatage ISO                        |

### Comportement

- Les taches sont limitees par agent (pas par session) -- elles persistent a travers les sessions,
  les reveils de triggers et les redemarrages
- L'agent n'utilise les taches que pour des taches reellement complexes (3+ etapes distinctes)
- Une seule tache est `in_progress` a la fois ; les elements termines sont marques immediatement
- Lorsque l'agent ecrit une nouvelle liste qui omet des elements precedemment stockes, ces
  elements sont automatiquement preserves comme `completed`
- Lorsque tous les elements sont `completed`, les anciens elements ne sont pas preserves (table rase)

### Affichage

Les taches sont rendues a la fois dans le CLI et dans le Tidepool :

- **CLI** -- Cadre ANSI style avec icones de statut : `checkmark` (termine, barre),
  `triangle` (en cours, gras), `cercle` (en attente)
- **Tidepool** -- Liste HTML avec des classes CSS pour chaque statut
