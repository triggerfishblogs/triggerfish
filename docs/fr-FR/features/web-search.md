# Recherche et recuperation web

Triggerfish donne a votre agent un acces a Internet via deux outils :
`web_search` pour trouver des informations et `web_fetch` pour lire les pages web.
Ensemble, ils permettent a l'agent de rechercher des sujets, consulter la documentation, verifier
l'actualite et recuperer des donnees du web -- le tout sous la meme application de
politique que tout autre outil.

## Outils

### `web_search`

Rechercher sur le web. Retourne les titres, URL et extraits.

| Parametre     | Type   | Requis | Description                                                                                          |
| ------------- | ------ | ------ | ---------------------------------------------------------------------------------------------------- |
| `query`       | string | oui    | Requete de recherche. Soyez precis -- incluez des mots-cles, noms ou dates pertinents pour de meilleurs resultats. |
| `max_results` | number | non    | Nombre maximum de resultats a retourner (defaut : 5, max : 20).                                      |

**Exemple de reponse :**

```
Search results for "deno sqlite module":

1. @db/sqlite - Deno SQLite bindings
   https://jsr.io/@db/sqlite
   Fast SQLite3 bindings for Deno using FFI...

2. Deno SQLite Guide
   https://docs.deno.com/examples/sqlite
   How to use SQLite with Deno...
```

### `web_fetch`

Recuperer et extraire le contenu lisible d'une URL. Retourne le texte de l'article par defaut
en utilisant Mozilla Readability.

| Parametre | Type   | Requis | Description                                                                            |
| --------- | ------ | ------ | -------------------------------------------------------------------------------------- |
| `url`     | string | oui    | L'URL a recuperer. Utilisez les URL des resultats de `web_search`.                     |
| `mode`    | string | non    | Mode d'extraction : `readability` (defaut, texte de l'article) ou `raw` (HTML complet). |

**Modes d'extraction :**

- **`readability`** (defaut) -- Extrait le contenu principal de l'article, en supprimant
  la navigation, les publicites et le texte standard. Ideal pour les articles d'actualite, les billets de blog et
  la documentation.
- **`raw`** -- Retourne le HTML complet. A utiliser lorsque l'extraction readability retourne
  trop peu de contenu (par ex. applications monopage, contenu dynamique).

## Comment l'agent les utilise

L'agent suit un schema recherche-puis-recuperation :

1. Utiliser `web_search` pour trouver des URL pertinentes
2. Utiliser `web_fetch` pour lire les pages les plus prometteuses
3. Synthetiser les informations et citer les sources

Lorsqu'il repond avec des informations web, l'agent cite les URL sources en ligne pour qu'elles
soient visibles sur tous les canaux (Telegram, Slack, CLI, etc.).

## Configuration

La recherche web necessite un fournisseur de recherche. Configurez-le dans `triggerfish.yaml` :

```yaml
web:
  search:
    provider: brave # Backend de recherche (brave est la valeur par defaut)
    api_key: your-api-key # Cle API Brave Search
```

| Cle                   | Type   | Description                                              |
| --------------------- | ------ | -------------------------------------------------------- |
| `web.search.provider` | string | Backend de recherche. Actuellement pris en charge : `brave`. |
| `web.search.api_key`  | string | Cle API pour le fournisseur de recherche.                |

::: tip Si aucun fournisseur de recherche n'est configure, `web_search` retourne un message
d'erreur indiquant a l'agent que la recherche n'est pas disponible. `web_fetch` fonctionne
independamment -- il ne necessite pas de fournisseur de recherche. :::

## Securite

- Toutes les URL recuperees passent par la prevention SSRF : le DNS est resolu d'abord et
  verifie par rapport a une liste de refus d'adresses IP codee en dur. Les plages d'IP privees/reservees sont toujours
  bloquees.
- Le contenu recupere est classifie et contribue au taint de la session comme toute autre
  reponse d'outil.
- Le hook `PRE_TOOL_CALL` se declenche avant chaque recuperation, et `POST_TOOL_RESPONSE`
  se declenche apres, de sorte que les regles de politique personnalisees peuvent restreindre les domaines auxquels l'agent
  accede.
