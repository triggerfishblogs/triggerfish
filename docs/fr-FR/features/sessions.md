# Gestion des sessions

L'agent peut inspecter, communiquer avec et creer des sessions. Ces outils permettent
les workflows inter-sessions, la delegation de taches en arriere-plan et la messagerie
inter-canaux -- le tout sous controle de write-down.

## Outils

### `sessions_list`

Lister toutes les sessions actives visibles pour la session courante.

Ne prend aucun parametre. Les resultats sont filtres par niveau de taint -- une session `PUBLIC`
ne peut pas voir les metadonnees d'une session `CONFIDENTIAL`.

### `sessions_history`

Obtenir l'historique des messages d'une session par identifiant.

| Parametre    | Type   | Requis | Description                                          |
| ------------ | ------ | ------ | ---------------------------------------------------- |
| `session_id` | string | oui    | L'identifiant de la session dont recuperer l'historique |

L'acces est refuse si le taint de la session cible est superieur a celui de la session
appelante.

### `sessions_send`

Envoyer du contenu de la session courante vers une autre session. Soumis au controle de
write-down.

| Parametre    | Type   | Requis | Description                      |
| ------------ | ------ | ------ | -------------------------------- |
| `session_id` | string | oui    | Identifiant de la session cible  |
| `content`    | string | oui    | Le contenu du message a envoyer  |

**Verification du write-down :** Le taint de l'appelant doit pouvoir circuler vers le
niveau de classification de la session cible. Une session `CONFIDENTIAL` ne peut pas envoyer de donnees a une
session `PUBLIC`.

### `sessions_spawn`

Creer une nouvelle session d'arriere-plan pour une tache autonome.

| Parametre | Type   | Requis | Description                                                       |
| --------- | ------ | ------ | ----------------------------------------------------------------- |
| `task`    | string | oui    | Description de ce que la session d'arriere-plan doit faire        |

La session creee demarre avec un taint `PUBLIC` independant et son propre espace de travail
isole. Elle s'execute de maniere autonome et retourne les resultats une fois terminee.

### `session_status`

Obtenir les metadonnees et le statut d'une session specifique.

| Parametre    | Type   | Requis | Description                         |
| ------------ | ------ | ------ | ----------------------------------- |
| `session_id` | string | oui    | L'identifiant de la session a verifier |

Retourne l'identifiant de session, le canal, l'utilisateur, le niveau de taint et l'heure de creation. L'acces est
controle par taint.

### `message`

Envoyer un message a un canal et un destinataire. Soumis au controle de write-down via
les hooks de politique.

| Parametre   | Type   | Requis | Description                                            |
| ----------- | ------ | ------ | ------------------------------------------------------ |
| `channel`   | string | oui    | Canal cible (par ex. `telegram`, `slack`)              |
| `recipient` | string | oui    | Identifiant du destinataire au sein du canal           |
| `text`      | string | oui    | Texte du message a envoyer                             |

### `summarize`

Generer un resume concis de la conversation en cours. Utile pour creer
des notes de transfert, compresser le contexte ou produire un recapitulatif a livrer sur un autre
canal.

| Parametre | Type   | Requis | Description                                                |
| --------- | ------ | ------ | ---------------------------------------------------------- |
| `scope`   | string | non    | Quoi resumer : `session` (defaut), `topic`                 |

### `simulate_tool_call`

Simuler un appel d'outil pour previsualiser la decision du moteur de politique sans executer
l'outil. Retourne le resultat de l'evaluation du hook (ALLOW, BLOCK ou REDACT) et les
regles qui ont ete evaluees.

| Parametre   | Type   | Requis | Description                                    |
| ----------- | ------ | ------ | ---------------------------------------------- |
| `tool_name` | string | oui    | L'outil dont simuler l'appel                   |
| `args`      | object | non    | Arguments a inclure dans la simulation         |

::: tip Utilisez `simulate_tool_call` pour verifier si un appel d'outil sera autorise
avant de l'executer. C'est utile pour comprendre le comportement de la politique sans
effets secondaires. :::

## Cas d'utilisation

### Delegation de taches en arriere-plan

L'agent peut creer une session d'arriere-plan pour gerer une tache longue sans
bloquer la conversation en cours :

```
Utilisateur : "Recherche les prix des concurrents et prepare un resume"
Agent : [appelle sessions_spawn avec la tache]
Agent : "J'ai lance une session d'arriere-plan pour cette recherche. J'aurai les resultats sous peu."
```

### Communication inter-sessions

Les sessions peuvent s'envoyer des donnees, permettant des workflows ou une session
produit des donnees qu'une autre consomme :

```
Session d'arriere-plan termine la recherche -> sessions_send au parent -> le parent notifie l'utilisateur
```

### Messagerie inter-canaux

L'outil `message` permet a l'agent de contacter proactivement sur n'importe quel canal
connecte :

```
L'agent detecte un evenement urgent -> message({ channel: "telegram", recipient: "owner", text: "Alerte : ..." })
```

## Securite

- Toutes les operations de session sont controlees par taint : vous ne pouvez pas voir, lire ou envoyer a
  des sessions au-dessus de votre niveau de taint
- `sessions_send` applique la prevention du write-down : les donnees ne peuvent pas circuler vers une
  classification inferieure
- Les sessions creees demarrent avec un taint `PUBLIC` avec un suivi de taint independant
- L'outil `message` passe par les hooks de politique `PRE_OUTPUT` avant la livraison
- Les identifiants de session sont injectes depuis le contexte d'execution, pas depuis les arguments du LLM --
  l'agent ne peut pas usurper l'identite d'une autre session

::: warning SECURITE La prevention du write-down est appliquee sur toute communication
inter-sessions. Une session avec un taint `CONFIDENTIAL` ne peut pas envoyer de donnees a une
session ou un canal `PUBLIC`. C'est une frontiere absolue appliquee par la couche de
politique. :::
