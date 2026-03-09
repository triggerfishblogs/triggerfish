# Outils de systeme de fichiers et shell

Triggerfish fournit a l'agent des outils generaux de systeme de fichiers et de shell
pour lire, ecrire, rechercher et executer des commandes. Ce sont les
outils fondamentaux sur lesquels d'autres fonctionnalites (environnement d'execution, exploration, skills)
s'appuient.

## Outils

### `read_file`

Lire le contenu d'un fichier a un chemin absolu.

| Parametre | Type   | Requis | Description                       |
| --------- | ------ | ------ | --------------------------------- |
| `path`    | string | oui    | Chemin absolu du fichier a lire   |

Retourne le contenu textuel complet du fichier.

### `write_file`

Ecrire du contenu dans un fichier a un chemin relatif a l'espace de travail.

| Parametre | Type   | Requis | Description                              |
| --------- | ------ | ------ | ---------------------------------------- |
| `path`    | string | oui    | Chemin relatif dans l'espace de travail  |
| `content` | string | oui    | Contenu du fichier a ecrire              |

Les ecritures sont limitees au repertoire de l'espace de travail de l'agent. L'agent ne peut pas ecrire a
des emplacements arbitraires sur le systeme de fichiers.

### `edit_file`

Remplacer une chaine unique dans un fichier. Le `old_text` doit apparaitre exactement une fois dans
le fichier.

| Parametre  | Type   | Requis | Description                                          |
| ---------- | ------ | ------ | ---------------------------------------------------- |
| `path`     | string | oui    | Chemin absolu du fichier a modifier                  |
| `old_text` | string | oui    | Texte exact a trouver (doit etre unique dans le fichier) |
| `new_text` | string | oui    | Texte de remplacement                                |

C'est un outil d'edition chirurgicale -- il trouve une correspondance exacte et la remplace. Si le
texte apparait plus d'une fois ou pas du tout, l'operation echoue avec une erreur.

### `list_directory`

Lister les fichiers et repertoires a un chemin absolu donne.

| Parametre | Type   | Requis | Description                              |
| --------- | ------ | ------ | ---------------------------------------- |
| `path`    | string | oui    | Chemin absolu du repertoire a lister     |

Retourne les entrees avec un suffixe `/` pour les repertoires.

### `search_files`

Rechercher des fichiers correspondant a un motif glob, ou rechercher dans le contenu des fichiers avec grep.

| Parametre        | Type    | Requis | Description                                                                          |
| ---------------- | ------- | ------ | ------------------------------------------------------------------------------------ |
| `path`           | string  | oui    | Repertoire dans lequel rechercher                                                    |
| `pattern`        | string  | oui    | Motif glob pour les noms de fichiers, ou texte/regex pour rechercher dans les fichiers |
| `content_search` | boolean | non    | Si `true`, recherche dans le contenu des fichiers au lieu des noms                   |

### `run_command`

Executer une commande shell dans le repertoire de l'espace de travail de l'agent.

| Parametre | Type   | Requis | Description                     |
| --------- | ------ | ------ | ------------------------------- |
| `command` | string | oui    | Commande shell a executer       |

Retourne stdout, stderr et le code de sortie. Les commandes sont executees dans le
repertoire de l'espace de travail de l'agent. Le hook `PRE_TOOL_CALL` verifie les commandes par rapport a une liste de refus
avant l'execution.

## Relation avec les autres outils

Ces outils de systeme de fichiers se chevauchent avec les outils de
l'[Environnement d'execution](../integrations/exec-environment) (`exec.write`,
`exec.read`, `exec.run`, `exec.ls`). La distinction :

- Les **outils de systeme de fichiers** operent sur des chemins absolus et l'espace de travail par defaut
  de l'agent. Ils sont toujours disponibles.
- Les **outils exec** operent dans un espace de travail structure avec une isolation explicite,
  des lanceurs de tests et l'installation de paquets. Ils font partie de l'integration de
  l'environnement d'execution.

L'agent utilise les outils de systeme de fichiers pour les operations generales sur les fichiers et les outils exec lorsqu'il
travaille dans un workflow de developpement (boucle ecrire/executer/corriger).

## Securite

- `write_file` est limite au repertoire de l'espace de travail de l'agent
- `run_command` passe par le hook `PRE_TOOL_CALL` avec la commande comme
  contexte
- Une liste de refus de commandes bloque les operations dangereuses (`rm -rf /`, `sudo`, etc.)
- Toutes les reponses d'outils passent par `POST_TOOL_RESPONSE` pour la classification et
  le suivi de taint
- En mode plan, `write_file` est bloque jusqu'a l'approbation du plan
