# Canal CLI

L'interface en ligne de commande est le canal par defaut de Triggerfish. Il est
toujours disponible, ne necessite aucune configuration externe et constitue le
principal moyen d'interagir avec votre agent pendant le developpement et
l'utilisation locale.

## Classification

Le canal CLI est par defaut en classification `INTERNAL`. L'utilisateur ou
l'utilisatrice du terminal est **toujours** considere comme le proprietaire -- il
n'y a aucun flux d'appairage ou d'authentification car vous executez le processus
directement sur votre machine.

::: info Pourquoi INTERNAL ? Le CLI est une interface directe et locale. Seule
une personne ayant acces a votre terminal peut l'utiliser. Cela fait de `INTERNAL`
le defaut approprie -- votre agent peut partager librement les donnees internes
dans ce contexte. :::

## Fonctionnalites

### Saisie en mode terminal brut

Le CLI utilise le mode terminal brut avec une analyse complete des sequences
d'echappement ANSI. Cela vous offre une experience d'edition riche directement
dans votre terminal :

- **Edition de ligne** -- Naviguez avec les touches flechees, Debut/Fin,
  supprimez des mots avec Ctrl+W
- **Historique de saisie** -- Appuyez sur Haut/Bas pour parcourir les saisies
  precedentes
- **Suggestions** -- Completion par tabulation pour les commandes courantes
- **Saisie multiligne** -- Entrez naturellement des prompts plus longs

### Affichage compact des outils

Lorsque l'agent appelle des outils, le CLI affiche par defaut un resume compact
sur une ligne :

```
tool_name arg  result
```

Basculez entre l'affichage compact et etendu des outils avec **Ctrl+O**.

### Interruption des operations en cours

Appuyez sur **ESC** pour interrompre l'operation en cours. Cela envoie un signal
d'abandon via l'orchestrateur au fournisseur LLM, arretant immediatement la
generation. Vous n'avez pas besoin d'attendre la fin d'une longue reponse.

### Affichage du taint

Vous pouvez optionnellement afficher le niveau de taint de la session en cours
dans la sortie en activant `showTaint` dans la configuration du canal CLI. Cela
prefixe le niveau de classification a chaque reponse :

```
[CONFIDENTIAL] Voici vos chiffres du pipeline Q4...
```

### Barre de progression de la longueur du contexte

Le CLI affiche une barre d'utilisation de la fenetre de contexte en temps reel
dans la ligne de separation en bas du terminal :

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- La barre se remplit au fur et a mesure que les tokens de contexte sont consommes
- Un marqueur bleu apparait au seuil de 70 % (ou la compaction automatique se
  declenche)
- La barre devient rouge a l'approche de la limite
- Apres compaction (`/compact` ou automatique), la barre se reinitialise

### Statut des serveurs MCP

La ligne de separation affiche egalement le statut de connexion des serveurs MCP :

| Affichage          | Signification                                   |
| ------------------ | ----------------------------------------------- |
| `MCP 3/3` (vert)  | Tous les serveurs configures sont connectes     |
| `MCP 2/3` (jaune) | Certains serveurs en cours de connexion ou en echec |
| `MCP 0/3` (rouge) | Aucun serveur connecte                          |

Les serveurs MCP se connectent paresseusement en arriere-plan apres le demarrage.
Le statut se met a jour en temps reel au fur et a mesure que les serveurs
deviennent disponibles.

## Historique de saisie

Votre historique de saisie est persiste entre les sessions a l'emplacement :

```
~/.triggerfish/data/input_history.json
```

L'historique est charge au demarrage et sauvegarde apres chaque saisie. Vous
pouvez le supprimer en effacant le fichier.

## Non-TTY / Entree par pipe

Lorsque stdin n'est pas un TTY (par exemple, lors d'un pipe depuis un autre
processus), le CLI bascule automatiquement en **mode ligne tamponnee**. Dans ce
mode :

- Les fonctionnalites du terminal brut (touches flechees, navigation dans
  l'historique) sont desactivees
- L'entree est lue ligne par ligne depuis stdin
- La sortie est ecrite sur stdout sans formatage ANSI

Cela vous permet de scripter les interactions avec votre agent :

```bash
echo "Quel temps fait-il aujourd'hui ?" | triggerfish run
```

## Configuration

Le canal CLI necessite une configuration minimale. Il est cree automatiquement
lorsque vous executez `triggerfish run` ou utilisez le REPL interactif.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Option        | Type    | Defaut  | Description                                       |
| ------------- | ------- | ------- | ------------------------------------------------- |
| `interactive` | boolean | `true`  | Activer le mode REPL interactif                   |
| `showTaint`   | boolean | `false` | Afficher le niveau de taint de session en sortie  |

::: tip Aucune configuration requise Le canal CLI fonctionne directement. Vous
n'avez rien a configurer pour commencer a utiliser Triggerfish depuis votre
terminal. :::

## Raccourcis clavier

| Raccourci    | Action                                                        |
| ------------ | ------------------------------------------------------------- |
| Entree       | Envoyer le message                                            |
| Haut / Bas   | Naviguer dans l'historique de saisie                          |
| Ctrl+V       | Coller une image depuis le presse-papiers (envoyee en contenu multimodal) |
| Ctrl+O       | Basculer l'affichage compact/etendu des outils               |
| ESC          | Interrompre l'operation en cours                              |
| Ctrl+C       | Quitter le CLI                                                |
| Ctrl+W       | Supprimer le mot precedent                                    |
| Debut / Fin  | Aller au debut/fin de la ligne                                |
