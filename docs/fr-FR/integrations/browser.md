# Automatisation du navigateur

Triggerfish fournit un controle approfondi du navigateur via une instance Chromium
geree dediee utilisant CDP (Chrome DevTools Protocol). L'agent peut naviguer sur
le web, interagir avec les pages, remplir des formulaires, capturer des captures
d'ecran et automatiser des workflows web -- le tout sous application des
politiques.

## Architecture

L'automatisation du navigateur est construite sur `puppeteer-core`, se connectant
a une instance Chromium geree via CDP. Chaque action du navigateur passe par la
couche de politique avant d'atteindre le navigateur.

Triggerfish detecte automatiquement les navigateurs bases sur Chromium, y compris
**Google Chrome**, **Chromium** et **Brave**. La detection couvre les chemins
d'installation standard sur Linux, macOS, Windows et les environnements Flatpak.

::: info L'outil `browser_navigate` necessite des URLs `http://` ou `https://`.
Les schemas internes au navigateur (comme `chrome://`, `brave://`, `about:`) ne
sont pas pris en charge et renverront une erreur avec des indications pour
utiliser une URL web a la place. :::

<img src="/diagrams/browser-automation-flow.svg" alt="Flux d'automatisation du navigateur : Agent → Outil navigateur → Couche de politique → CDP → Chromium gere" style="max-width: 100%;" />

Le profil du navigateur est isole par agent. L'instance Chromium geree ne partage
pas les cookies, sessions ou stockage local avec votre navigateur personnel.
Le remplissage automatique des identifiants est desactive par defaut.

## Actions disponibles

| Action     | Description                                           | Exemple d'utilisation                                       |
| ---------- | ----------------------------------------------------- | ----------------------------------------------------------- |
| `navigate` | Aller a une URL (soumis a la politique de domaine)    | Ouvrir une page web pour recherche                          |
| `snapshot` | Capturer une capture d'ecran de la page               | Documenter un etat d'interface, extraire des informations visuelles |
| `click`    | Cliquer sur un element de la page                     | Soumettre un formulaire, activer un bouton                  |
| `type`     | Saisir du texte dans un champ de saisie               | Remplir une barre de recherche, completer un formulaire     |
| `select`   | Selectionner une option dans un menu deroulant         | Choisir dans un menu                                        |
| `upload`   | Telecharger un fichier dans un formulaire              | Joindre un document                                         |
| `evaluate` | Executer du JavaScript dans le contexte de la page (sandbox) | Extraire des donnees, manipuler le DOM                |
| `wait`     | Attendre un element ou une condition                   | S'assurer qu'une page est chargee avant d'interagir         |

## Application de la politique de domaine

Chaque URL vers laquelle l'agent navigue est verifiee par rapport a une liste
d'autorisation et de refus de domaines avant que le navigateur n'agisse.

### Configuration

```yaml
browser:
  domain_policy:
    allow:
      - "*.example.com"
      - "github.com"
      - "docs.google.com"
      - "*.notion.so"
    deny:
      - "*.malware-site.com"
    classification:
      "*.internal.company.com": INTERNAL
      "github.com": INTERNAL
      "*.google.com": INTERNAL
```

### Fonctionnement de la politique de domaine

1. L'agent appelle `browser.navigate("https://github.com/org/repo")`
2. Le hook `PRE_TOOL_CALL` se declenche avec l'URL comme contexte
3. Le moteur de politiques verifie le domaine par rapport aux listes
   d'autorisation/refus
4. Si refuse ou pas sur la liste d'autorisation, la navigation est **bloquee**
5. Si autorise, la classification du domaine est recherchee
6. Le taint de session escalade pour correspondre a la classification du domaine
7. La navigation se poursuit

::: warning SECURITE Si un domaine n'est pas sur la liste d'autorisation, la
navigation est bloquee par defaut. Le LLM ne peut pas outrepasser la politique de
domaine. Cela empeche l'agent de visiter des sites web arbitraires qui pourraient
exposer des donnees sensibles ou declencher des actions indesirables. :::

## Captures d'ecran et classification

Les captures d'ecran capturees via `browser.snapshot` heritent du niveau de taint
actuel de la session. Si la session est marquee a `CONFIDENTIAL`, toutes les
captures d'ecran de cette session sont classifiees comme `CONFIDENTIAL`.

C'est important pour la politique de sortie. Une capture d'ecran classifiee
`CONFIDENTIAL` ne peut pas etre envoyee a un canal `PUBLIC`. Le hook `PRE_OUTPUT`
applique cela a la frontiere.

## Contenu scrape et lignage

Lorsque l'agent extrait du contenu d'une page web (via `evaluate`, lecture de
texte ou analyse d'elements), les donnees extraites :

- Sont classifiees en fonction du niveau de classification attribue au domaine
- Creent un enregistrement de lignage tracant l'URL source, l'heure d'extraction
  et la classification
- Contribuent au taint de session (le taint escalade pour correspondre a la
  classification du contenu)

Ce suivi du lignage signifie que vous pouvez toujours retrouver d'ou viennent les
donnees, meme si elles ont ete scrapees d'une page web il y a des semaines.

## Controles de securite

### Isolation du navigateur par agent

Chaque agent obtient son propre profil de navigateur. Cela signifie :

- Pas de cookies partages entre agents
- Pas de stockage local ou de session partage
- Pas d'acces aux cookies ou sessions du navigateur hote
- Remplissage automatique des identifiants desactive par defaut
- Les extensions du navigateur ne sont pas chargees

### Integration des hooks de politique

Toutes les actions du navigateur passent par les hooks de politique standard :

| Hook                 | Quand il se declenche                           | Ce qu'il verifie                                                        |
| -------------------- | ----------------------------------------------- | ----------------------------------------------------------------------- |
| `PRE_TOOL_CALL`      | Avant chaque action du navigateur               | Liste d'autorisation de domaine, politique d'URL, permissions d'action  |
| `POST_TOOL_RESPONSE` | Apres que le navigateur renvoie des donnees     | Classifier la reponse, mettre a jour le taint de session, creer le lignage |
| `PRE_OUTPUT`         | Lorsque le contenu du navigateur quitte le systeme | Verification de classification par rapport a la destination            |

### Limites de ressources

- Le timeout de navigation empeche le navigateur de rester bloque indefiniment
- Les limites de taille de chargement de page empechent une consommation excessive
  de memoire
- Les limites d'onglets simultanees sont appliquees par agent

## Controles d'entreprise

Les deploiements d'entreprise disposent de controles supplementaires pour
l'automatisation du navigateur :

| Controle                              | Description                                                                          |
| ------------------------------------- | ------------------------------------------------------------------------------------ |
| Classification au niveau du domaine   | Les domaines intranet sont automatiquement classifies comme `INTERNAL`               |
| Liste de domaines bloques             | Liste geree par l'administrateur de domaines interdits                               |
| Politique de retention des captures   | Duree de stockage des captures d'ecran capturees                                     |
| Journalisation d'audit de session     | Journalisation complete de toutes les actions du navigateur pour la conformite        |
| Desactiver l'automatisation du navigateur | L'administrateur peut desactiver l'outil navigateur pour des agents ou roles specifiques |

## Exemple : Workflow de recherche web

Un workflow typique d'agent utilisant l'automatisation du navigateur :

```
1. Utilisateur :  "Recherche les prix des concurrents sur example-competitor.com"

2. Agent : browser.navigate("https://example-competitor.com/pricing")
           -> PRE_TOOL_CALL : domaine "example-competitor.com" verifie par rapport a la liste d'autorisation
           -> Autorise, classifie comme PUBLIC
           -> La navigation se poursuit

3. Agent : browser.snapshot()
           -> Capture d'ecran capturee, classifiee au niveau de taint de session (PUBLIC)

4. Agent : browser.evaluate("document.querySelector('.pricing-table').innerText")
           -> Texte extrait, classifie comme PUBLIC
           -> Enregistrement de lignage cree : source=example-competitor.com/pricing

5. Agent : Resume les informations de tarification et les renvoie a l'utilisateur
           -> PRE_OUTPUT : donnees PUBLIC vers le canal utilisateur -- AUTORISE
```

Chaque etape est journalisee, classifiee et auditable.
