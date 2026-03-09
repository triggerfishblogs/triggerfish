# WebChat

Le canal WebChat fournit un widget de chat integrable et integre qui se connecte
a votre agent Triggerfish via WebSocket. Il est concu pour les interactions avec
les clients, les widgets d'assistance ou tout scenario ou vous souhaitez offrir
une experience de chat basee sur le web.

## Classification par defaut

WebChat est par defaut en classification `PUBLIC`. C'est un defaut strict pour
une bonne raison : **les visiteurs web ne sont jamais traites comme le
proprietaire**. Chaque message d'une session WebChat porte un taint `PUBLIC`
quelle que soit la configuration.

::: warning Les visiteurs ne sont jamais proprietaires Contrairement aux autres
canaux ou l'identite du proprietaire est verifiee par ID utilisateur ou numero de
telephone, WebChat definit `isOwner: false` pour toutes les connexions. Cela
signifie que l'agent n'executera jamais de commandes de niveau proprietaire depuis
une session WebChat. C'est une decision de securite deliberee -- vous ne pouvez
pas verifier l'identite d'un visiteur web anonyme. :::

## Configuration

### Etape 1 : Configurer Triggerfish

Ajoutez le canal WebChat a votre `triggerfish.yaml` :

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://votre-site.com"
```

| Option           | Type     | Requis | Description                                     |
| ---------------- | -------- | ------ | ----------------------------------------------- |
| `port`           | number   | Non    | Port du serveur WebSocket (defaut : `8765`)     |
| `classification` | string   | Non    | Niveau de classification (defaut : `PUBLIC`)    |
| `allowedOrigins` | string[] | Non    | Origines CORS autorisees (defaut : `["*"]`)     |

### Etape 2 : Demarrer Triggerfish

```bash
triggerfish stop && triggerfish start
```

Le serveur WebSocket commence a ecouter sur le port configure.

### Etape 3 : Connecter un widget de chat

Connectez-vous au point de terminaison WebSocket depuis votre application web :

```javascript
const ws = new WebSocket("ws://localhost:8765");

ws.onopen = () => {
  console.log("Connected to Triggerfish");
};

ws.onmessage = (event) => {
  const frame = JSON.parse(event.data);

  if (frame.type === "session") {
    // Le serveur a attribue un ID de session
    console.log("Session:", frame.sessionId);
  }

  if (frame.type === "message") {
    // Reponse de l'agent
    console.log("Agent:", frame.content);
  }
};

// Envoyer un message
function sendMessage(text) {
  ws.send(JSON.stringify({
    type: "message",
    content: text,
  }));
}
```

## Fonctionnement

### Flux de connexion

1. Un client navigateur ouvre une connexion WebSocket sur le port configure
2. Triggerfish met a niveau la requete HTTP en WebSocket
3. Un ID de session unique est genere (`webchat-<uuid>`)
4. Le serveur envoie l'ID de session au client dans une trame `session`
5. Le client envoie et recoit des trames `message` en JSON

### Format des trames de message

Tous les messages sont des objets JSON avec cette structure :

```json
{
  "type": "message",
  "content": "Bonjour, comment puis-je vous aider ?",
  "sessionId": "webchat-a1b2c3d4-..."
}
```

Types de trames :

| Type      | Direction          | Description                                            |
| --------- | ------------------ | ------------------------------------------------------ |
| `session` | Serveur vers client | Envoye a la connexion avec l'ID de session attribue   |
| `message` | Les deux           | Message de chat avec contenu texte                     |
| `ping`    | Les deux           | Ping de maintien de connexion                          |
| `pong`    | Les deux           | Reponse de maintien de connexion                       |

### Gestion des sessions

Chaque connexion WebSocket obtient sa propre session. Lorsque la connexion se
ferme, la session est retiree de la carte des connexions actives. Il n'y a pas de
reprise de session -- si la connexion est interrompue, un nouvel ID de session est
attribue a la reconnexion.

## Verification de sante

Le serveur WebSocket repond egalement aux requetes HTTP classiques avec une
verification de sante :

```bash
curl http://localhost:8765
# Reponse : "WebChat OK"
```

C'est utile pour les verifications de sante des equilibreurs de charge et la
surveillance.

## Indicateurs de saisie

Triggerfish envoie et recoit des indicateurs de saisie via WebChat. Lorsque
l'agent est en cours de traitement, une trame d'indicateur de saisie est envoyee
au client. Le widget peut l'afficher pour montrer que l'agent est en train de
reflechir.

## Considerations de securite

- **Tous les visiteurs sont externes** -- `isOwner` est toujours `false`. L'agent
  n'executera pas de commandes proprietaire depuis WebChat.
- **Taint PUBLIC** -- Chaque message est marque `PUBLIC` au niveau de la session.
  L'agent ne peut pas acceder ni renvoyer de donnees au-dessus de la
  classification `PUBLIC` dans une session WebChat.
- **CORS** -- Configurez `allowedOrigins` pour restreindre les domaines pouvant
  se connecter. Le defaut `["*"]` autorise toute origine, ce qui est approprie
  pour le developpement mais devrait etre verrouille en production.

::: tip Verrouillez les origines en production Pour les deploiements en
production, specifiez toujours explicitement vos origines autorisees :

```yaml
channels:
  webchat:
    port: 8765
    allowedOrigins:
      - "https://votre-domaine.com"
      - "https://app.votre-domaine.com"
```

:::

## Modification de la classification

Bien que WebChat soit par defaut `PUBLIC`, vous pouvez techniquement le definir a
un autre niveau. Cependant, puisque `isOwner` est toujours `false`, la
classification effective pour tous les messages reste `PUBLIC` en raison de la
regle de classification effective (`min(canal, destinataire)`).

```yaml
channels:
  webchat:
    port: 8765
    classification: INTERNAL # Autorise, mais isOwner reste false
```

Niveaux valides : `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
