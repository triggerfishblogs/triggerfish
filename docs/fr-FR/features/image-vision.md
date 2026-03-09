# Analyse d'images et vision

Triggerfish prend en charge l'entree d'images a travers toutes les interfaces. Vous pouvez coller des images
depuis votre presse-papiers en CLI ou dans le navigateur, et l'agent peut analyser des fichiers image
sur le disque. Lorsque votre modele principal ne prend pas en charge la vision, un modele de vision
separe peut automatiquement decrire les images avant qu'elles n'atteignent le modele principal.

## Entree d'images

### CLI : Collage depuis le presse-papiers (Ctrl+V)

Appuyez sur **Ctrl+V** dans le chat CLI pour coller une image depuis le presse-papiers de votre systeme.
L'image est lue depuis le presse-papiers du systeme, encodee en base64 et envoyee a l'agent
comme un bloc de contenu multimodal a cote de votre message texte.

La lecture du presse-papiers prend en charge :

- **Linux** -- `xclip` ou `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- Acces au presse-papiers via PowerShell

### Tidepool : Collage dans le navigateur

Dans l'interface web Tidepool, collez des images directement dans la zone de saisie du chat en utilisant
la fonctionnalite native de collage de votre navigateur (Ctrl+V / Cmd+V). L'image est lue comme
une URL de donnees et envoyee comme un bloc de contenu encode en base64.

### Outil `image_analyze`

L'agent peut analyser des fichiers image sur le disque a l'aide de l'outil `image_analyze`.

| Parametre | Type   | Requis | Description                                                                              |
| --------- | ------ | ------ | ---------------------------------------------------------------------------------------- |
| `path`    | string | oui    | Chemin absolu vers le fichier image                                                      |
| `prompt`  | string | non    | Question ou instruction concernant l'image (defaut : « Describe this image in detail ») |

**Formats pris en charge :** PNG, JPEG, GIF, WebP, BMP, SVG

L'outil lit le fichier, l'encode en base64 et l'envoie a un fournisseur LLM capable de vision
pour analyse.

## Modele de vision de repli

Lorsque votre modele principal ne prend pas en charge la vision (par ex. Z.AI `glm-5`), vous pouvez
configurer un modele de vision separe pour decrire automatiquement les images avant qu'elles
n'atteignent le modele principal.

### Fonctionnement

1. Vous collez une image (Ctrl+V) ou envoyez du contenu multimodal
2. L'orchestrateur detecte les blocs de contenu image dans le message
3. Le modele de vision decrit chaque image (vous voyez un indicateur de chargement « Analyse de l'image... »)
4. Les blocs d'image sont remplaces par des descriptions textuelles :
   `[The user shared an image. A vision model described it as follows: ...]`
5. Le modele principal recoit un message texte uniquement avec les descriptions
6. Un indice dans le prompt systeme dit au modele principal de traiter les descriptions comme s'il
   pouvait voir les images

C'est completement transparent -- vous collez une image et obtenez une reponse,
que le modele principal prenne en charge la vision ou non.

### Configuration

Ajoutez un champ `vision` a votre configuration de modeles :

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Modele principal sans vision
  vision: glm-4.5v # Modele de vision pour la description d'images
  providers:
    zai:
      model: glm-5
```

Le modele `vision` reutilise les identifiants de l'entree du trousseau du fournisseur principal.
Dans cet exemple, le fournisseur principal est `zai`, donc `glm-4.5v` utilise la
meme cle API stockee dans le trousseau du systeme pour le fournisseur `zai`.

| Cle             | Type   | Description                                                           |
| --------------- | ------ | --------------------------------------------------------------------- |
| `models.vision` | string | Nom optionnel du modele de vision pour la description automatique d'images |

### Quand le repli de vision s'active

- Uniquement lorsque `models.vision` est configure
- Uniquement lorsque le message contient des blocs de contenu image
- Les messages texte uniquement et les blocs de contenu texte uniquement ignorent completement le repli
- Si le fournisseur de vision echoue, l'erreur est geree gracieusement et l'agent
  continue

### Evenements

L'orchestrateur emet deux evenements pendant le traitement de la vision :

| Evenement         | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `vision_start`    | La description d'image commence (inclut `imageCount`)    |
| `vision_complete` | Toutes les images sont decrites                          |

Ces evenements pilotent l'indicateur « Analyse de l'image... » dans les interfaces CLI et Tidepool.

::: tip Si votre modele principal prend deja en charge la vision (par ex. Anthropic Claude,
OpenAI GPT-4o, Google Gemini), vous n'avez pas besoin de configurer `models.vision`.
Les images seront envoyees directement au modele principal comme contenu multimodal. :::
