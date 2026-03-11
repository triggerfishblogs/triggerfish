# Tide Pool / A2UI

Le Tide Pool est un espace de travail visuel pilote par l'agent ou Triggerfish affiche
du contenu interactif : tableaux de bord, graphiques, formulaires, apercu de code et medias enrichis.
Contrairement au chat, qui est une conversation lineaire, le Tide Pool est un canevas que
l'agent controle.

## Qu'est-ce que A2UI ?

A2UI (Agent-to-UI) est le protocole qui alimente le Tide Pool. Il definit comment
l'agent envoie du contenu visuel et des mises a jour aux clients connectes en temps reel. L'agent
decide ce qu'il faut afficher ; le client le rend.

## Architecture

<img src="/diagrams/tidepool-architecture.svg" alt="Architecture A2UI du Tide Pool : l'agent envoie du contenu via le Gateway vers le rendu Tide Pool sur les clients connectes" style="max-width: 100%;" />

L'agent utilise l'outil `tide_pool` pour envoyer du contenu a l'hote Tide Pool
s'executant dans le Gateway. L'hote relaie les mises a jour via WebSocket a tout
rendu Tide Pool connecte sur une plateforme prise en charge.

## Outils du Tide Pool

L'agent interagit avec le Tide Pool via ces outils :

| Outil             | Description                                          | Cas d'utilisation                                            |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| `tidepool_render` | Rendre un arbre de composants dans l'espace de travail | Tableaux de bord, formulaires, visualisations, contenu riche |
| `tidepool_update` | Mettre a jour les proprietes d'un composant par ID   | Mises a jour incrementales sans remplacer toute la vue       |
| `tidepool_clear`  | Vider l'espace de travail, supprimer tous les composants | Transitions de session, repartir de zero                  |

### Actions heritees

L'hote sous-jacent prend egalement en charge des actions de niveau inferieur pour la
retrocompatibilite :

| Action     | Description                               |
| ---------- | ----------------------------------------- |
| `push`     | Envoyer du contenu HTML/JS brut           |
| `eval`     | Executer du JavaScript dans le bac a sable |
| `reset`    | Effacer tout le contenu                   |
| `snapshot` | Capturer sous forme d'image               |

## Cas d'utilisation

Le Tide Pool est concu pour les scenarios ou le chat seul est insuffisant :

- **Tableaux de bord** -- L'agent construit un tableau de bord en direct montrant les metriques de vos
  integrations connectees.
- **Visualisation de donnees** -- Graphiques rendus a partir des resultats de requetes.
- **Formulaires et saisies** -- Formulaires interactifs pour la collecte de donnees structurees.
- **Apercu de code** -- Code avec coloration syntaxique et resultats d'execution en direct.
- **Medias enrichis** -- Images, cartes et contenu embarque.
- **Edition collaborative** -- L'agent presente un document pour que vous le revisiez
  et l'annotiez.

## Fonctionnement

1. Vous demandez a l'agent de visualiser quelque chose (ou l'agent decide qu'une reponse
   visuelle est appropriee).
2. L'agent utilise l'action `push` pour envoyer du HTML et du JavaScript au Tide
   Pool.
3. L'hote Tide Pool du Gateway recoit le contenu et le relaie aux clients
   connectes.
4. Le rendu affiche le contenu en temps reel.
5. L'agent peut utiliser `eval` pour effectuer des mises a jour incrementales sans remplacer
   la vue entiere.
6. Lorsque le contexte change, l'agent utilise `reset` pour vider l'espace de travail.

## Integration de la securite

Le contenu du Tide Pool est soumis aux memes controles de securite que toute autre
sortie :

- **Hook PRE_OUTPUT** -- Tout le contenu envoye au Tide Pool passe par le
  hook d'application PRE_OUTPUT avant le rendu. Les donnees classifiees qui violent
  la politique de sortie sont bloquees.
- **Taint de session** -- Le contenu rendu herite du niveau de taint de la session. Un
  Tide Pool affichant des donnees `CONFIDENTIAL` est lui-meme `CONFIDENTIAL`.
- **Classification des captures** -- Les captures du Tide Pool sont classifiees au
  niveau de taint de la session au moment de la capture.
- **Bac a sable JavaScript** -- Le JavaScript execute via `eval` est isole dans un bac a sable
  au sein du contexte du Tide Pool. Il n'a pas acces au systeme hote, au reseau ni au
  systeme de fichiers.
- **Pas d'acces reseau** -- L'environnement d'execution du Tide Pool ne peut pas effectuer de requetes reseau.
  Toutes les donnees transitent par l'agent et la couche de politique.

## Indicateurs de statut

L'interface web du Tidepool inclut des indicateurs de statut en temps reel :

### Barre de longueur de contexte

Une barre de progression stylisee montrant l'utilisation de la fenetre de contexte -- quelle part de la
fenetre de contexte du LLM a ete consommee. La barre se met a jour apres chaque message et apres
la compaction.

### Statut des serveurs MCP

Affiche le statut de connexion des serveurs MCP configures (par ex. « MCP 3/3 »).
Code couleur : vert pour tous connectes, jaune pour partiel, rouge pour aucun.

### Saisie securisee de secrets

Lorsque l'agent a besoin que vous saisissiez un secret (via l'outil `secret_save`),
le Tidepool affiche une fenetre de saisie securisee. La valeur saisie va directement au
trousseau -- elle n'est jamais envoyee via le chat ni visible dans l'historique de conversation.

::: tip Pensez au Tide Pool comme au tableau blanc de l'agent. Alors que le chat est la facon dont vous
parlez a l'agent, le Tide Pool est l'endroit ou l'agent vous montre des choses. :::
