# Sous-agents et taches LLM

Les agents Triggerfish peuvent deleguer du travail a des sous-agents et executer des prompts LLM isoles.
Cela permet le travail parallele, le raisonnement cible et la decomposition de taches
multi-agents.

## Outils

### `subagent`

Creer un sous-agent pour une tache autonome multi-etapes. Le sous-agent dispose de son propre
contexte de conversation et peut utiliser les outils independamment. Retourne le resultat final
une fois termine.

| Parametre | Type   | Requis | Description                                                             |
| --------- | ------ | ------ | ----------------------------------------------------------------------- |
| `task`    | string | oui    | Ce que le sous-agent doit accomplir                                     |
| `tools`   | string | non    | Liste blanche d'outils separee par des virgules (defaut : outils en lecture seule) |

**Outils par defaut :** Les sous-agents demarrent avec des outils en lecture seule (`read_file`,
`list_directory`, `search_files`, `run_command`). Specifiez des outils supplementaires
explicitement si le sous-agent a besoin d'un acces en ecriture.

**Exemples d'utilisation :**

- Rechercher un sujet pendant que l'agent principal continue d'autres taches
- Explorer une base de code en parallele sous plusieurs angles (c'est ce que fait l'outil
  `explore` en interne)
- Deleguer une tache d'implementation autonome

### `llm_task`

Executer un prompt LLM en une seule passe pour un raisonnement isole. Le prompt s'execute dans un contexte
separe et ne pollue pas l'historique de la conversation principale.

| Parametre | Type   | Requis | Description                                           |
| --------- | ------ | ------ | ----------------------------------------------------- |
| `prompt`  | string | oui    | Le prompt a envoyer                                   |
| `system`  | string | non    | Prompt systeme optionnel                              |
| `model`   | string | non    | Modele/fournisseur optionnel en remplacement          |

**Exemples d'utilisation :**

- Resumer un long document sans remplir le contexte principal
- Classifier ou extraire des donnees d'un texte structure
- Obtenir un deuxieme avis sur une approche
- Executer un prompt contre un modele different du modele principal

### `agents_list`

Lister les fournisseurs LLM et agents configures. Ne prend aucun parametre.

Retourne des informations sur les fournisseurs disponibles, leurs modeles et leur statut de
configuration.

## Fonctionnement des sous-agents

Lorsque l'agent appelle `subagent`, Triggerfish :

1. Cree une nouvelle instance d'orchestrateur avec son propre contexte de conversation
2. Fournit au sous-agent les outils specifies (par defaut en lecture seule)
3. Envoie la tache comme message utilisateur initial
4. Le sous-agent s'execute de maniere autonome -- appelant des outils, traitant les resultats,
   iterant
5. Lorsque le sous-agent produit une reponse finale, elle est retournee a l'agent
   parent

Les sous-agents heritent du niveau de taint et des contraintes de classification de la session
parente. Ils ne peuvent pas escalader au-dela du plafond du parent.

## Quand utiliser chacun

| Outil      | A utiliser quand                                                       |
| ---------- | ---------------------------------------------------------------------- |
| `subagent` | Tache multi-etapes necessitant l'utilisation d'outils et des iterations |
| `llm_task` | Raisonnement en une passe, resume ou classification                    |
| `explore`  | Comprehension de base de code (utilise les sous-agents en interne)     |

::: tip L'outil `explore` est construit sur `subagent` -- il cree 2 a 6
sous-agents paralleles selon le niveau de profondeur. Si vous avez besoin d'une exploration
structuree de base de code, utilisez `explore` directement plutot que de creer manuellement des
sous-agents. :::

## Sous-agents vs equipes d'agents

Les sous-agents fonctionnent en mode tirer-et-oublier : le parent attend un seul resultat.
Les [equipes d'agents](./agent-teams) sont des groupes persistants d'agents collaborant avec
des roles distincts, un responsable coordinateur et une communication inter-membres. Utilisez
les sous-agents pour une delegation ciblee en une seule etape. Utilisez les equipes lorsque la tache beneficie
de multiples perspectives specialisees iterant sur le travail de chacun.
