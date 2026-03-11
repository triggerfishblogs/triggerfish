# MCP Gateway

> Utilisez n'importe quel serveur MCP. Nous securisons la frontiere.

Le Model Context Protocol (MCP) est le standard emergent pour la communication
agent-outil. Triggerfish fournit un MCP Gateway securise qui vous permet de vous
connecter a n'importe quel serveur compatible MCP tout en appliquant les controles
de classification, les permissions au niveau des outils, le suivi du taint et la
journalisation d'audit complete.

Vous apportez les serveurs MCP. Triggerfish securise chaque requete et reponse qui
traverse la frontiere.

## Fonctionnement

Le MCP Gateway se situe entre votre agent et tout serveur MCP. Chaque appel
d'outil passe par la couche d'application des politiques avant d'atteindre le
serveur externe, et chaque reponse est classifiee avant d'entrer dans le contexte
de l'agent.

<img src="/diagrams/mcp-gateway-flow.svg" alt="Flux du MCP Gateway : Agent → MCP Gateway → Couche de politique → Serveur MCP, avec chemin de refus vers BLOCKED" style="max-width: 100%;" />

Le gateway fournit cinq fonctions essentielles :

1. **Authentification et classification des serveurs** -- Les serveurs MCP doivent
   etre examines et classifies avant utilisation
2. **Application des permissions au niveau des outils** -- Les outils individuels
   peuvent etre autorises, restreints ou bloques
3. **Suivi du taint des requetes/reponses** -- Le taint de session escalade en
   fonction de la classification du serveur
4. **Validation de schema** -- Toutes les requetes et reponses sont validees par
   rapport aux schemas declares
5. **Journalisation d'audit** -- Chaque appel d'outil, decision et changement de
   taint est enregistre

## Etats des serveurs MCP

Tous les serveurs MCP sont par defaut `UNTRUSTED`. Ils doivent etre explicitement
classifies avant que l'agent puisse les invoquer.

| Etat         | Description                                                                     | L'agent peut invoquer ? |
| ------------ | ------------------------------------------------------------------------------- | :---------------------: |
| `UNTRUSTED`  | Defaut pour les nouveaux serveurs. En attente d'examen.                         |           Non           |
| `CLASSIFIED` | Examine et un niveau de classification attribue avec des permissions par outil. |   Oui (dans la politique) |
| `BLOCKED`    | Explicitement interdit par l'administrateur.                                    |           Non           |

<img src="/diagrams/state-machine.svg" alt="Machine a etats du serveur MCP : UNTRUSTED → CLASSIFIED ou BLOCKED" style="max-width: 100%;" />

::: warning SECURITE Un serveur MCP `UNTRUSTED` ne peut etre invoque par l'agent
en aucune circonstance. Le LLM ne peut pas demander, convaincre ou tromper le
systeme pour utiliser un serveur non classifie. La classification est une porte au
niveau du code, pas une decision LLM. :::

## Configuration

Les serveurs MCP sont configures dans `triggerfish.yaml` sous forme de carte
indexee par identifiant de serveur. Chaque serveur utilise soit un sous-processus
local (transport stdio) soit un point de terminaison distant (transport SSE).

### Serveurs locaux (Stdio)

Les serveurs locaux sont lances comme des sous-processus. Triggerfish communique
avec eux via stdin/stdout.

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### Serveurs distants (SSE)

Les serveurs distants fonctionnent ailleurs et sont accedes via HTTP Server-Sent
Events.

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### Cles de configuration

| Cle              | Type     | Requis        | Description                                                                      |
| ---------------- | -------- | ------------- | -------------------------------------------------------------------------------- |
| `command`        | string   | Oui (stdio)   | Binaire a lancer (ex. : `npx`, `deno`, `node`)                                  |
| `args`           | string[] | Non           | Arguments passes a la commande                                                   |
| `env`            | map      | Non           | Variables d'environnement pour le sous-processus                                 |
| `url`            | string   | Oui (SSE)     | Point de terminaison HTTP pour les serveurs distants                             |
| `classification` | string   | **Oui**       | Niveau de sensibilite des donnees : `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` ou `RESTRICTED` |
| `enabled`        | boolean  | Non           | Defaut : `true`. Definir a `false` pour ignorer sans supprimer la configuration. |

Chaque serveur doit avoir soit `command` (local) soit `url` (distant). Les
serveurs sans aucun des deux sont ignores.

### Connexion paresseuse

Les serveurs MCP se connectent en arriere-plan apres le demarrage. Vous n'avez
pas besoin d'attendre que tous les serveurs soient prets avant d'utiliser votre
agent.

- Les serveurs reessaient avec un backoff exponentiel : 2s → 4s → 8s → 30s max
- Les nouveaux serveurs deviennent disponibles pour l'agent a mesure qu'ils se
  connectent -- pas besoin de redemarrer la session
- Si un serveur echoue a se connecter apres toutes les tentatives, il entre dans
  l'etat `failed` et peut etre reessaye au prochain redemarrage du daemon

Les interfaces CLI et Tidepool affichent le statut de connexion MCP en temps
reel. Consultez le [canal CLI](/fr-FR/channels/cli#statut-des-serveurs-mcp) pour
plus de details.

### Desactiver un serveur

Pour desactiver temporairement un serveur MCP sans supprimer sa configuration :

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # Ignore au demarrage
```

### Variables d'environnement et secrets

Les valeurs d'environnement prefixees par `keychain:` sont resolues depuis le
trousseau de cles du systeme au demarrage :

```yaml
env:
  API_KEY: "keychain:my-secret-name" # Resolu depuis le trousseau de cles du systeme
  PLAIN_VAR: "literal-value" # Passe tel quel
```

Seul `PATH` est herite de l'environnement hote (pour que `npx`, `node`, `deno`,
etc. se resolvent correctement). Aucune autre variable d'environnement hote ne
fuit dans les sous-processus des serveurs MCP.

::: tip Stockez les secrets avec `triggerfish config set-secret <nom> <valeur>`.
Puis referencez-les comme `keychain:<nom>` dans la configuration d'environnement
de votre serveur MCP. :::

### Nommage des outils

Les outils des serveurs MCP sont espaces comme `mcp_<serverId>_<toolName>` pour
eviter les collisions avec les outils integres. Par exemple, si un serveur nomme
`github` expose un outil appele `list_repos`, l'agent le voit comme
`mcp_github_list_repos`.

### Classification et refus par defaut

Si vous omettez `classification`, le serveur est enregistre comme **UNTRUSTED** et
le gateway rejette tous les appels d'outils. Vous devez explicitement choisir un
niveau de classification. Consultez le
[guide de classification](/fr-FR/guide/classification-guide) pour vous aider a
choisir le bon niveau.

## Flux d'appel d'outil

Lorsque l'agent demande un appel d'outil MCP, le gateway execute une sequence
deterministe de verifications avant de transmettre la requete.

### 1. Verifications pre-vol

Toutes les verifications sont deterministes -- pas d'appels LLM, pas d'aleatoire.

| Verification                                                 | Resultat en cas d'echec                            |
| ------------------------------------------------------------ | -------------------------------------------------- |
| Le statut du serveur est `CLASSIFIED` ?                      | Blocage : "Server not approved"                    |
| L'outil est autorise pour ce serveur ?                       | Blocage : "Tool not permitted"                     |
| L'utilisateur a les permissions requises ?                   | Blocage : "Permission denied"                      |
| Le taint de session est compatible avec la classification du serveur ? | Blocage : "Would violate write-down"      |
| La validation de schema reussit ?                            | Blocage : "Invalid parameters"                     |

::: info Si le taint de session est superieur a la classification du serveur,
l'appel est bloque pour empecher l'ecriture descendante. Une session marquee a
`CONFIDENTIAL` ne peut pas envoyer de donnees a un serveur MCP `PUBLIC`. :::

### 2. Execution

Si toutes les verifications pre-vol reussissent, le gateway transmet la requete au
serveur MCP.

### 3. Traitement de la reponse

Lorsque le serveur MCP renvoie une reponse :

- Valider la reponse par rapport au schema declare
- Classifier les donnees de reponse au niveau de classification du serveur
- Mettre a jour le taint de session : `taint = max(taint_actuel, classification_serveur)`
- Creer un enregistrement de lignage tracant l'origine des donnees

### 4. Audit

Chaque appel d'outil est journalise avec : identite du serveur, nom de l'outil,
identite de l'utilisateur, decision de politique, changement de taint et
horodatage.

## Regles de taint des reponses

Les reponses des serveurs MCP heritent du niveau de classification du serveur. Le
taint de session ne peut qu'escalader.

| Classification du serveur | Taint de la reponse | Impact sur la session                                |
| ------------------------- | ------------------- | ---------------------------------------------------- |
| `PUBLIC`                  | `PUBLIC`            | Aucun changement de taint                            |
| `INTERNAL`                | `INTERNAL`          | Le taint escalade au moins a `INTERNAL`              |
| `CONFIDENTIAL`            | `CONFIDENTIAL`      | Le taint escalade au moins a `CONFIDENTIAL`          |
| `RESTRICTED`              | `RESTRICTED`        | Le taint escalade a `RESTRICTED`                     |

Une fois qu'une session est marquee a un niveau donne, elle reste a ce niveau ou
plus haut pour le reste de la session. Une reinitialisation complete de session
(qui efface l'historique de conversation) est necessaire pour reduire le taint.

## Passthrough d'authentification utilisateur

Pour les serveurs MCP qui prennent en charge l'authentification au niveau
utilisateur, le gateway transmet les identifiants delegues de l'utilisateur plutot
que les identifiants systeme.

Lorsqu'un outil est configure avec `requires_user_auth: true` :

1. Le gateway verifie si l'utilisateur a connecte ce serveur MCP
2. Recupere les identifiants delegues de l'utilisateur depuis le magasin
   d'identifiants securise
3. Ajoute l'authentification utilisateur aux en-tetes de requete MCP
4. Le serveur MCP applique les permissions au niveau utilisateur

Le resultat : le serveur MCP voit l'**identite de l'utilisateur**, pas une
identite systeme. L'heritage des permissions fonctionne a travers la frontiere
MCP -- l'agent ne peut acceder qu'a ce que l'utilisateur peut acceder.

::: tip Le passthrough d'authentification utilisateur est le modele prefere pour
tout serveur MCP qui gere le controle d'acces. Cela signifie que l'agent herite
des permissions de l'utilisateur plutot que d'avoir un acces systeme global. :::

## Validation de schema

Le gateway valide toutes les requetes et reponses MCP par rapport aux schemas
declares avant de les transmettre :

```typescript
// Validation de requete (simplifiee)
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // Valider les parametres par rapport au schema JSON
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // Verifier les motifs d'injection dans les parametres string
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

La validation de schema detecte les requetes malformees avant qu'elles
n'atteignent le serveur externe et signale les motifs d'injection potentiels dans
les parametres string.

## Controles d'entreprise

Les deploiements d'entreprise disposent de controles supplementaires pour la
gestion des serveurs MCP :

- **Registre de serveurs gere par l'administrateur** -- Seuls les serveurs MCP
  approuves par l'administrateur peuvent etre classifies
- **Permissions d'outils par departement** -- Differentes equipes peuvent avoir
  des acces differents aux outils
- **Journalisation de conformite** -- Toutes les interactions MCP disponibles dans
  les tableaux de bord de conformite
- **Limitation de debit** -- Limites de debit par serveur et par outil
- **Surveillance de sante des serveurs** -- Le gateway suit la disponibilite et
  les temps de reponse des serveurs
