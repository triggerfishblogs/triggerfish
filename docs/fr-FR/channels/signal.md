# Signal

Connectez votre agent Triggerfish a Signal pour que des personnes puissent lui
envoyer des messages depuis l'application Signal. L'adaptateur communique avec un
daemon [signal-cli](https://github.com/AsamK/signal-cli) via JSON-RPC, en
utilisant votre numero de telephone Signal lie.

## En quoi Signal est different

L'adaptateur Signal **est** votre numero de telephone. Contrairement a Telegram ou
Slack ou un compte bot separe existe, les messages Signal proviennent d'autres
personnes vers votre numero. Cela signifie :

- Tous les messages entrants ont `isOwner: false` -- ils proviennent toujours de
  quelqu'un d'autre
- L'adaptateur repond en tant que votre numero de telephone
- Il n'y a pas de verification de proprietaire par message comme sur les autres
  canaux

Cela rend Signal ideal pour recevoir des messages de contacts qui ecrivent a votre
numero, avec l'agent repondant en votre nom.

## Classification par defaut

Signal est par defaut en classification `PUBLIC`. Puisque tous les messages
entrants proviennent de contacts externes, `PUBLIC` est le defaut securise.

## Configuration

### Etape 1 : Installer signal-cli

signal-cli est un client en ligne de commande tiers pour Signal. Triggerfish
communique avec lui via un socket TCP ou Unix.

**Linux (build natif -- pas besoin de Java) :**

Telechargez le dernier build natif depuis la page des
[releases signal-cli](https://github.com/AsamK/signal-cli/releases), ou laissez
Triggerfish le telecharger pour vous lors de la configuration.

**macOS / autres plateformes (build JVM) :**

Necessite Java 21+. Triggerfish peut telecharger automatiquement un JRE portable
si Java n'est pas installe.

Vous pouvez aussi lancer la configuration guidee :

```bash
triggerfish config add-channel signal
```

Cela verifie la presence de signal-cli, propose de le telecharger s'il est absent
et vous guide dans le processus de liaison.

### Etape 2 : Lier votre appareil

signal-cli doit etre lie a votre compte Signal existant (comme lier une
application de bureau) :

```bash
signal-cli link -n "Triggerfish"
```

Cela affiche une URI `tsdevice:`. Scannez le code QR avec votre application
mobile Signal (Parametres > Appareils lies > Lier un nouvel appareil).

### Etape 3 : Demarrer le daemon

signal-cli s'execute comme un daemon en arriere-plan auquel Triggerfish se
connecte :

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

Remplacez `+14155552671` par votre numero de telephone au format E.164.

### Etape 4 : Configurer Triggerfish

Ajoutez Signal a votre `triggerfish.yaml` :

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Option             | Type    | Requis | Description                                                                                  |
| ------------------ | ------- | ------ | -------------------------------------------------------------------------------------------- |
| `endpoint`         | string  | Oui    | Adresse du daemon signal-cli (`tcp://hote:port` ou `unix:///chemin/vers/socket`)             |
| `account`          | string  | Oui    | Votre numero de telephone Signal (format E.164)                                              |
| `classification`   | string  | Non    | Plafond de classification (defaut : `PUBLIC`)                                                |
| `defaultGroupMode` | string  | Non    | Gestion des messages de groupe : `always`, `mentioned-only`, `owner-only` (defaut : `always`) |
| `groups`           | object  | Non    | Configurations specifiques par groupe                                                         |
| `ownerPhone`       | string  | Non    | Reserve pour un usage futur                                                                   |
| `pairing`          | boolean | Non    | Activer le mode d'appairage lors de la configuration                                          |

### Etape 5 : Demarrer Triggerfish

```bash
triggerfish stop && triggerfish start
```

Envoyez un message a votre numero de telephone depuis un autre utilisateur Signal
pour confirmer la connexion.

## Messages de groupe

Signal prend en charge les discussions de groupe. Vous pouvez controler comment
l'agent repond aux messages de groupe :

| Mode             | Comportement                                                     |
| ---------------- | ---------------------------------------------------------------- |
| `always`         | Repondre a tous les messages de groupe (defaut)                  |
| `mentioned-only` | Repondre uniquement lorsque mentionne par numero de telephone ou @mention |
| `owner-only`     | Ne jamais repondre dans les groupes                              |

Configurez globalement ou par groupe :

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "your-group-id":
        mode: always
        classification: INTERNAL
```

Les identifiants de groupe sont encodes en base64. Utilisez
`triggerfish signal list-groups` ou consultez la documentation de signal-cli pour
les trouver.

## Decoupage des messages

Signal a une limite de message de 4 000 caracteres. Les reponses plus longues
sont automatiquement decoupees en plusieurs messages, en coupant sur les retours a
la ligne ou les espaces pour la lisibilite.

## Indicateurs de saisie

L'adaptateur envoie des indicateurs de saisie pendant que l'agent traite une
requete. L'etat de saisie s'efface lorsque la reponse est envoyee.

## Outils supplementaires

L'adaptateur Signal expose des outils supplementaires :

- `sendTyping` / `stopTyping` -- Controle manuel des indicateurs de saisie
- `listGroups` -- Lister tous les groupes Signal dont le compte est membre
- `listContacts` -- Lister tous les contacts Signal

## Modification de la classification

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Niveaux valides : `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Redemarrez le daemon apres modification : `triggerfish stop && triggerfish start`

## Fonctionnalites de fiabilite

L'adaptateur Signal inclut plusieurs mecanismes de fiabilite :

### Reconnexion automatique

Si la connexion a signal-cli est interrompue (interruption reseau, redemarrage du
daemon), l'adaptateur se reconnecte automatiquement avec un backoff exponentiel.
Aucune intervention manuelle n'est necessaire.

### Verification de sante

Au demarrage, Triggerfish verifie si un daemon signal-cli existant est fonctionnel
a l'aide d'une sonde ping JSON-RPC. Si le daemon ne repond pas, il est arrete et
redemarre automatiquement.

### Suivi de version

Triggerfish suit la version connue et fonctionnelle de signal-cli (actuellement
0.13.0) et avertit au demarrage si votre version installee est plus ancienne. La
version de signal-cli est enregistree a chaque connexion reussie.

### Support des sockets Unix

En plus des points de terminaison TCP, l'adaptateur prend en charge les sockets
de domaine Unix :

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Depannage

**Daemon signal-cli inaccessible :**

- Verifiez que le daemon est en cours d'execution : verifiez le processus ou
  essayez `nc -z 127.0.0.1 7583`
- signal-cli se lie en IPv4 uniquement -- utilisez `127.0.0.1`, pas `localhost`
- Le port TCP par defaut est 7583
- Triggerfish redemarrera automatiquement le daemon s'il detecte un processus
  defaillant

**Messages non recus :**

- Confirmez que l'appareil est lie : verifiez l'application mobile Signal sous
  Appareils lies
- signal-cli doit avoir recu au moins une synchronisation apres la liaison
- Verifiez les logs pour les erreurs de connexion : `triggerfish logs --tail`

**Erreurs Java (build JVM uniquement) :**

- Le build JVM de signal-cli necessite Java 21+
- Executez `java -version` pour verifier
- Triggerfish peut telecharger un JRE portable lors de la configuration si
  necessaire

**Boucles de reconnexion :**

- Si vous voyez des tentatives de reconnexion repetees dans les logs, le daemon
  signal-cli est peut-etre en train de planter
- Verifiez la sortie stderr de signal-cli pour les erreurs
- Essayez de redemarrer avec un daemon neuf : arretez Triggerfish, tuez
  signal-cli, redemarrez les deux
