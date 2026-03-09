# Memoire persistante

Les agents Triggerfish disposent d'une memoire persistante inter-sessions. L'agent peut sauvegarder
des faits, preferences et contextes qui survivent aux conversations, redemarrages et
meme aux reveils de triggers. La memoire est controlee par classification -- l'agent ne peut pas lire
au-dessus du taint de sa session ni ecrire en dessous.

## Outils

### `memory_save`

Sauvegarder un fait ou une information dans la memoire persistante.

| Parametre | Type   | Requis | Description                                                             |
| --------- | ------ | ------ | ----------------------------------------------------------------------- |
| `key`     | string | oui    | Identifiant unique (par ex. `user-name`, `project-deadline`)            |
| `content` | string | oui    | Le contenu a memoriser                                                  |
| `tags`    | array  | non    | Etiquettes pour la categorisation (par ex. `["personal", "preference"]`) |

La classification est **automatiquement definie** au niveau de taint actuel de la session.
L'agent ne peut pas choisir a quel niveau une memoire est stockee.

### `memory_get`

Recuperer une memoire specifique par sa cle.

| Parametre | Type   | Requis | Description                                  |
| --------- | ------ | ------ | -------------------------------------------- |
| `key`     | string | oui    | La cle de la memoire a recuperer             |

Retourne le contenu de la memoire s'il existe et est accessible au niveau de securite
actuel. Les versions de classification superieure masquent les versions inferieures.

### `memory_search`

Rechercher dans toutes les memoires accessibles en langage naturel.

| Parametre     | Type   | Requis | Description                              |
| ------------- | ------ | ------ | ---------------------------------------- |
| `query`       | string | oui    | Requete de recherche en langage naturel  |
| `max_results` | number | non    | Nombre maximum de resultats (defaut : 10) |

Utilise la recherche plein texte SQLite FTS5 avec stemming. Les resultats sont filtres par le
niveau de securite actuel de la session.

### `memory_list`

Lister toutes les memoires accessibles, eventuellement filtrees par etiquette.

| Parametre | Type   | Requis | Description              |
| --------- | ------ | ------ | ------------------------ |
| `tag`     | string | non    | Etiquette de filtrage    |

### `memory_delete`

Supprimer une memoire par cle. L'enregistrement est supprime de maniere logique (masque mais conserve pour
l'audit).

| Parametre | Type   | Requis | Description                          |
| --------- | ------ | ------ | ------------------------------------ |
| `key`     | string | oui    | La cle de la memoire a supprimer     |

Ne peut supprimer que les memoires au niveau de securite actuel de la session.

## Fonctionnement de la memoire

### Extraction automatique

L'agent sauvegarde proactivement les faits importants que vous partagez -- details personnels,
contexte de projet, preferences -- en utilisant des cles descriptives. C'est un comportement au niveau du
prompt guide par SPINE.md. Le LLM choisit **quoi** sauvegarder ; la couche de politique
force **a quel niveau**.

### Controle par classification

Chaque enregistrement de memoire porte un niveau de classification egal au taint de la session au
moment ou il a ete sauvegarde :

- Une memoire sauvegardee pendant une session `CONFIDENTIAL` est classifiee `CONFIDENTIAL`
- Une session `PUBLIC` ne peut pas lire les memoires `CONFIDENTIAL`
- Une session `CONFIDENTIAL` peut lire les memoires `CONFIDENTIAL` et `PUBLIC`

Ceci est applique par des verifications `canFlowTo` sur chaque operation de lecture. Le LLM ne peut pas
contourner cela.

### Masquage de memoire

Lorsque la meme cle existe a plusieurs niveaux de classification, seule la
version de classification la plus elevee visible par la session actuelle est retournee. Cela
empeche les fuites d'information entre les frontieres de classification.

**Exemple :** Si `user-name` existe a la fois a `PUBLIC` (defini pendant un chat public)
et `INTERNAL` (mis a jour pendant une session privee), une session `INTERNAL` voit
la version `INTERNAL`, tandis qu'une session `PUBLIC` voit uniquement la version `PUBLIC`.

### Stockage

Les memoires sont stockees via l'interface `StorageProvider` (la meme abstraction
utilisee pour les sessions, les taches cron et les todos). La recherche plein texte utilise SQLite FTS5 pour
des requetes rapides en langage naturel avec stemming.

## Securite

- La classification est toujours forcee a `session.taint` dans le hook `PRE_TOOL_CALL`
  -- le LLM ne peut pas choisir une classification inferieure
- Toutes les lectures sont filtrees par `canFlowTo` -- aucune memoire au-dessus du taint de la session n'est jamais
  retournee
- Les suppressions sont des suppressions logiques -- l'enregistrement est masque mais conserve pour l'audit
- L'agent ne peut pas augmenter la classification de la memoire en lisant des donnees de haute classification
  et en les re-sauvegardant a un niveau inferieur (la prevention du write-down s'applique)

::: warning SECURITE Le LLM ne choisit jamais la classification de la memoire. Elle est toujours
forcee au niveau de taint actuel de la session par la couche de politique. C'est une frontiere
absolue qui ne peut pas etre desactivee par configuration. :::
