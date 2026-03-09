# Environnement d'execution de l'agent

L'environnement d'execution de l'agent est la capacite d'auto-developpement de
Triggerfish -- un espace de travail de code de premiere classe ou l'agent peut
ecrire du code, l'executer, observer les sorties et erreurs, corriger les
problemes et iterer jusqu'a ce que cela fonctionne. C'est ce qui permet a l'agent
de construire des integrations, tester des idees et creer de nouveaux outils par
lui-meme.

## Ce n'est pas le sandbox de plugin

L'environnement d'execution est fondamentalement different du
[sandbox de plugin](./plugins). Comprendre la distinction est important :

- Le **sandbox de plugin** protege le systeme **CONTRE** du code tiers non fiable
- L'**environnement d'execution** donne a l'agent le pouvoir **D'**ecrire,
  executer et deboguer son propre code

Le sandbox de plugin est defensif. L'environnement d'execution est productif. Ils
servent des objectifs opposes et ont des profils de securite differents.

| Aspect                  | Sandbox de plugin                         | Environnement d'execution de l'agent      |
| ----------------------- | ----------------------------------------- | ----------------------------------------- |
| **Objectif**            | Proteger le systeme CONTRE du code non fiable | Donner a l'agent le pouvoir de construire |
| **Systeme de fichiers** | Aucun (entierement en sandbox)            | Repertoire de l'espace de travail uniquement |
| **Reseau**              | Points de terminaison declares uniquement | Listes d'autorisation/refus gerees par politique |
| **Installation de paquets** | Non autorise                          | Autorise (npm, pip, deno add)             |
| **Duree d'execution**   | Timeout strict                            | Timeout genereux (configurable)           |
| **Iteration**           | Execution unique                          | Boucles ecriture/execution/correction illimitees |
| **Persistance**         | Ephemere                                  | L'espace de travail persiste entre les sessions |

## La boucle de retroaction

Le facteur de qualite differentiant. C'est le meme modele qui rend des outils
comme Claude Code efficaces -- un cycle ecriture/execution/correction serre ou
l'agent voit exactement ce qu'un developpeur humain verrait.

### Etape 1 : Ecrire

L'agent cree ou modifie des fichiers dans son espace de travail avec
`write_file`. L'espace de travail est un veritable repertoire du systeme de
fichiers limite a l'agent actuel.

### Etape 2 : Executer

L'agent execute le code via `run_command`, recevant la sortie complete stdout,
stderr et le code de sortie. Aucune sortie n'est masquee ou resumee. L'agent voit
exactement ce que vous verriez dans un terminal.

### Etape 3 : Observer

L'agent lit la sortie complete. Si des erreurs se sont produites, il voit la pile
d'appels complete, les messages d'erreur et la sortie de diagnostic. Si des tests
ont echoue, il voit quels tests ont echoue et pourquoi.

### Etape 4 : Corriger

L'agent modifie le code en fonction de ce qu'il a observe, en utilisant
`write_file` ou `edit_file` pour mettre a jour des fichiers specifiques.

### Etape 5 : Repeter

L'agent execute a nouveau. Cette boucle continue jusqu'a ce que le code
fonctionne -- tests reussis, sortie correcte produite ou objectif atteint.

### Etape 6 : Persister

Une fois fonctionnel, l'agent peut sauvegarder son travail comme une
[skill](./skills) (SKILL.md + fichiers de support), l'enregistrer comme une
integration, le connecter a un cron job ou le rendre disponible comme outil.

::: tip L'etape de persistance est ce qui fait de l'environnement d'execution
plus qu'un bloc-notes. Le code fonctionnel ne disparait pas simplement -- l'agent
peut l'empaqueter en une skill reutilisable qui s'execute sur un planning, repond
a des declencheurs ou est invoquee a la demande. :::

## Outils disponibles

| Outil            | Description                                           | Sortie                                                  |
| ---------------- | ----------------------------------------------------- | ------------------------------------------------------- |
| `write_file`     | Ecrire ou ecraser un fichier dans l'espace de travail | Chemin du fichier, octets ecrits                        |
| `read_file`      | Lire le contenu d'un fichier de l'espace de travail   | Contenu du fichier en chaine                            |
| `edit_file`      | Appliquer des modifications ciblees a un fichier      | Contenu du fichier mis a jour                           |
| `run_command`    | Executer une commande shell dans l'espace de travail  | stdout, stderr, code de sortie, duree                   |
| `list_directory` | Lister les fichiers de l'espace de travail (recursif optionnel) | Liste de fichiers avec tailles                  |
| `search_files`   | Rechercher dans le contenu des fichiers (type grep)   | Lignes correspondantes avec references fichier:ligne    |

## Structure de l'espace de travail

Chaque agent obtient un repertoire d'espace de travail isole qui persiste entre
les sessions :

```
~/.triggerfish/workspace/
  <agent-id>/                     # Espace de travail par agent
    scratch/                      # Fichiers de travail temporaires
    integrations/                 # Code d'integration en developpement
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Skills en cours de creation
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Journal d'execution pour l'audit
  background/
    <session-id>/                 # Espace de travail temporaire pour les taches de fond
```

Les espaces de travail sont isoles entre les agents. Un agent ne peut pas acceder
a l'espace de travail d'un autre agent. Les taches de fond (cron jobs,
declencheurs) obtiennent leur propre espace de travail temporaire limite a la
session.

## Flux de developpement d'integration

Lorsque vous demandez a l'agent de construire une nouvelle integration (par
exemple, "connecte-toi a mon Notion et synchronise les taches"), l'agent suit un
workflow de developpement naturel :

1. **Explorer** -- Utilise `run_command` pour tester les points de terminaison
   API, verifier l'authentification, comprendre les formes de reponse
2. **Scaffolding** -- Ecrit le code d'integration avec `write_file`, cree un
   fichier de test a cote
3. **Tester** -- Execute les tests avec `run_command`, voit les echecs, itere
4. **Installer les dependances** -- Utilise `run_command` pour ajouter les paquets
   requis (npm, pip, deno add)
5. **Iterer** -- Boucle ecriture, execution, correction jusqu'a ce que les tests
   passent et que l'integration fonctionne de bout en bout
6. **Persister** -- Sauvegarde comme skill (ecrit SKILL.md avec les metadonnees)
   ou connecte a un cron job
7. **Approbation** -- La skill auto-creee entre dans l'etat `PENDING_APPROVAL` ;
   vous examinez et approuvez

## Support des langages et runtimes

L'environnement d'execution s'execute sur le systeme hote (pas dans WASM), avec
acces a plusieurs runtimes :

| Runtime | Disponible via                                          | Cas d'usage                                 |
| ------- | ------------------------------------------------------- | ------------------------------------------- |
| Deno    | Execution directe                                       | TypeScript/JavaScript (premiere classe)     |
| Node.js | `run_command node`                                      | Acces a l'ecosysteme npm                    |
| Python  | `run_command python`                                    | Science des donnees, ML, scripts            |
| Shell   | `run_command sh` / `run_command bash`                   | Automatisation systeme, scripts de liaison  |

L'agent peut detecter les runtimes disponibles et choisir le plus adapte a la
tache. L'installation de paquets fonctionne via la chaine d'outils standard de
chaque runtime.

## Frontieres de securite

L'environnement d'execution est plus permissif que le sandbox de plugin, mais
reste controle par les politiques a chaque etape.

### Integration des politiques

- Chaque appel `run_command` declenche le hook `PRE_TOOL_CALL` avec la commande
  comme contexte
- La liste d'autorisation/refus de commandes est verifiee avant l'execution
- La sortie est capturee et passee par le hook `POST_TOOL_RESPONSE`
- Les points de terminaison reseau accedes pendant l'execution sont suivis via le
  lignage
- Si le code accede a des donnees classifiees (par exemple, lit depuis une API
  CRM), le taint de session escalade
- L'historique d'execution est journalise dans `.exec_history` pour l'audit

### Frontieres strictes

Ces frontieres ne sont jamais franchies, quelle que soit la configuration :

- Ne peut pas ecrire en dehors du repertoire de l'espace de travail
- Ne peut pas executer de commandes sur la liste de refus (`rm -rf /`, `sudo`,
  etc.)
- Ne peut pas acceder aux espaces de travail d'autres agents
- Tous les appels reseau sont gouvernes par les hooks de politique
- Toute sortie est classifiee et contribue au taint de session
- Limites de ressources appliquees : espace disque, temps CPU par execution,
  memoire

::: warning SECURITE Chaque commande que l'agent execute passe par le hook
`PRE_TOOL_CALL`. Le moteur de politiques la verifie par rapport a la liste
d'autorisation/refus de commandes avant que l'execution ne commence. Les
commandes dangereuses sont bloquees de maniere deterministe -- le LLM ne peut pas
influencer cette decision. :::

### Controles d'entreprise

Les administrateurs d'entreprise disposent de controles supplementaires sur
l'environnement d'execution :

- **Desactiver completement l'exec** pour des agents ou roles specifiques
- **Restreindre les runtimes disponibles** (par exemple, autoriser uniquement
  Deno, bloquer Python et shell)
- **Definir des limites de ressources** par agent (quota disque, temps CPU,
  plafond memoire)
- **Exiger une approbation** pour toutes les operations exec au-dessus d'un seuil
  de classification
- **Liste de refus de commandes personnalisee** au-dela de la liste par defaut
  de commandes dangereuses
