# Equipes d'agents

Les agents Triggerfish peuvent creer des equipes persistantes d'agents collaborant qui travaillent
ensemble sur des taches complexes. Chaque membre de l'equipe dispose de sa propre session, de son role,
de son contexte de conversation et de ses outils. Un membre est designe comme **responsable** et
coordonne le travail.

Les equipes sont ideales pour les taches ouvertes qui beneficient de roles specialises travaillant
en parallele : recherche + analyse + redaction, architecture + implementation +
revue, ou toute tache ou differentes perspectives doivent iterer sur le travail des autres.

::: info Disponibilite
Les equipes d'agents necessitent le plan **Power** (149 $/mois) lors de l'utilisation de Triggerfish
Gateway. Les utilisateurs open source utilisant leurs propres cles API ont un acces complet aux equipes
d'agents -- chaque membre de l'equipe consomme de l'inference depuis votre fournisseur configure.
:::

## Outils

### `team_create`

Creer une equipe persistante d'agents qui collaborent sur une tache. Definissez les roles des membres,
les outils et les modeles. Exactement un membre doit etre le responsable.

| Parametre                | Type   | Requis | Description                                                               |
| ------------------------ | ------ | ------ | ------------------------------------------------------------------------- |
| `name`                   | string | oui    | Nom lisible de l'equipe                                                   |
| `task`                   | string | oui    | L'objectif de l'equipe (envoye au responsable comme instructions initiales) |
| `members`                | array  | oui    | Definitions des membres de l'equipe (voir ci-dessous)                     |
| `idle_timeout_seconds`   | number | non    | Delai d'inactivite par membre. Par defaut : 300 (5 minutes)               |
| `max_lifetime_seconds`   | number | non    | Duree de vie maximale de l'equipe. Par defaut : 3600 (1 heure)            |
| `classification_ceiling` | string | non    | Plafond de classification a l'echelle de l'equipe (par ex. `CONFIDENTIAL`) |

**Definition d'un membre :**

| Champ                    | Type    | Requis | Description                                                    |
| ------------------------ | ------- | ------ | -------------------------------------------------------------- |
| `role`                   | string  | oui    | Identifiant de role unique (par ex. `researcher`, `reviewer`)  |
| `description`            | string  | oui    | Ce que fait ce membre (injecte dans le prompt systeme)         |
| `is_lead`                | boolean | oui    | Si ce membre est le responsable de l'equipe                    |
| `model`                  | string  | non    | Modele specifique pour ce membre                               |
| `classification_ceiling` | string  | non    | Plafond de classification par membre                           |
| `initial_task`           | string  | non    | Instructions initiales (le responsable utilise la tache de l'equipe par defaut) |

**Regles de validation :**

- L'equipe doit avoir exactement un membre avec `is_lead: true`
- Tous les roles doivent etre uniques et non vides
- Les plafonds de classification des membres ne peuvent pas depasser le plafond de l'equipe
- `name` et `task` doivent etre non vides

### `team_status`

Verifier l'etat actuel d'une equipe active.

| Parametre | Type   | Requis | Description       |
| --------- | ------ | ------ | ----------------- |
| `team_id` | string | oui    | Identifiant de l'equipe |

Retourne le statut de l'equipe, le niveau de taint agrege et les details par membre
incluant le taint actuel, le statut et l'horodatage de la derniere activite de chaque membre.

### `team_message`

Envoyer un message a un membre specifique de l'equipe. Utile pour fournir du contexte supplementaire,
reorienter le travail ou demander des mises a jour de progression.

| Parametre | Type   | Requis | Description                                          |
| --------- | ------ | ------ | ---------------------------------------------------- |
| `team_id` | string | oui    | Identifiant de l'equipe                              |
| `role`    | string | non    | Role du membre cible (par defaut : le responsable)   |
| `message` | string | oui    | Contenu du message                                   |

L'equipe doit etre en statut `running` et le membre cible doit etre `active` ou
`idle`.

### `team_disband`

Dissoudre une equipe et terminer toutes les sessions des membres.

| Parametre | Type   | Requis | Description                                 |
| --------- | ------ | ------ | ------------------------------------------- |
| `team_id` | string | oui    | Identifiant de l'equipe                     |
| `reason`  | string | non    | Raison de la dissolution de l'equipe        |

Seule la session qui a cree l'equipe ou le membre responsable peut dissoudre l'equipe.

## Fonctionnement des equipes

### Creation

Lorsque l'agent appelle `team_create`, Triggerfish :

1. Valide la definition de l'equipe (roles, nombre de responsables, plafonds de classification)
2. Cree une session d'agent isolee pour chaque membre via l'usine d'orchestrateur
3. Injecte un **prompt de composition d'equipe** dans le prompt systeme de chaque membre, decrivant
   son role, ses coequipiers et les instructions de collaboration
4. Envoie la tache initiale au responsable (ou une `initial_task` personnalisee par membre)
5. Demarre un moniteur de cycle de vie qui verifie la sante de l'equipe toutes les 30 secondes

Chaque session de membre est entierement isolee avec son propre contexte de conversation, suivi de
taint et acces aux outils.

### Collaboration

Les membres de l'equipe communiquent entre eux via `sessions_send`. L'agent
createur n'a pas besoin de relayer les messages entre les membres. Le flux typique :

1. Le responsable recoit l'objectif de l'equipe
2. Le responsable decompose la tache et envoie des affectations aux membres via
   `sessions_send`
3. Les membres travaillent de maniere autonome, appelant des outils et iterant
4. Les membres envoient les resultats au responsable (ou directement a un autre membre)
5. Le responsable synthetise les resultats et decide quand le travail est termine
6. Le responsable appelle `team_disband` pour dissoudre l'equipe

Les messages entre les membres de l'equipe sont livres directement via l'orchestrateur --
chaque message declenche un tour complet de l'agent dans la session du destinataire.

### Statut

Utilisez `team_status` pour verifier la progression a tout moment. La reponse inclut :

- **Statut de l'equipe :** `running`, `paused`, `completed`, `disbanded` ou `timed_out`
- **Taint agrege :** Le niveau de classification le plus eleve parmi tous les membres
- **Details par membre :** Role, statut (`active`, `idle`, `completed`, `failed`),
  niveau de taint actuel et horodatage de la derniere activite

### Dissolution

Les equipes peuvent etre dissoutes par :

- La session creatrice appelant `team_disband`
- Le membre responsable appelant `team_disband`
- Le moniteur de cycle de vie apres l'expiration de la limite de duree de vie
- Le moniteur de cycle de vie detectant que tous les membres sont inactifs

Lorsqu'une equipe est dissoute, toutes les sessions de membres actifs sont terminees et
les ressources sont liberees.

## Roles d'equipe

### Responsable

Le membre responsable coordonne l'equipe. A la creation :

- Recoit la `task` de l'equipe comme instructions initiales (sauf substitution par
  `initial_task`)
- Recoit des instructions dans le prompt systeme pour decomposer le travail, assigner les taches et
  decider quand l'objectif est atteint
- Est autorise a dissoudre l'equipe

Il y a exactement un responsable par equipe.

### Membres

Les membres non-responsables sont des specialistes. A la creation :

- Recoivent leur `initial_task` si fournie, sinon restent inactifs jusqu'a ce que le responsable leur envoie
  du travail
- Recoivent des instructions dans le prompt systeme pour envoyer le travail termine au responsable ou au
  coequipier suivant appropriate
- Ne peuvent pas dissoudre l'equipe

## Surveillance du cycle de vie

Les equipes disposent d'une surveillance automatique du cycle de vie qui s'execute toutes les 30 secondes.

### Delai d'inactivite

Chaque membre a un delai d'inactivite (par defaut : 5 minutes). Lorsqu'un membre est inactif :

1. **Premier seuil (idle_timeout_seconds) :** Le membre recoit un message de relance
   lui demandant d'envoyer ses resultats si son travail est termine
2. **Double seuil (2x idle_timeout_seconds) :** Le membre est termine et
   le responsable est notifie

### Delai de duree de vie

Les equipes ont une duree de vie maximale (par defaut : 1 heure). Lorsque la limite est atteinte :

1. Le responsable recoit un message d'avertissement avec 60 secondes pour produire une sortie finale
2. Apres la periode de grace, l'equipe est automatiquement dissoute

### Verifications de sante

Le moniteur verifie la sante des sessions toutes les 30 secondes :

- **Defaillance du responsable :** Si la session du responsable n'est plus joignable, l'equipe est
  mise en pause et la session creatrice est notifiee
- **Defaillance d'un membre :** Si une session de membre a disparu, elle est marquee comme `failed` et
  le responsable est notifie pour continuer avec les membres restants
- **Tous inactifs :** Si tous les membres sont `completed` ou `failed`, la session
  creatrice est notifiee pour injecter de nouvelles instructions ou dissoudre l'equipe

## Classification et taint

Les sessions des membres de l'equipe suivent les memes regles de classification que toutes les autres sessions :

- Chaque membre demarre avec un taint `PUBLIC` et augmente en accedant a des donnees
  classifiees
- Les **plafonds de classification** peuvent etre definis par equipe ou par membre pour restreindre
  les donnees auxquelles les membres peuvent acceder
- L'**application du write-down** s'applique a toute communication inter-membres. Un membre
  ayant un taint `CONFIDENTIAL` ne peut pas envoyer de donnees a un membre a `PUBLIC`
- Le **taint agrege** (taint le plus eleve parmi tous les membres) est rapporte dans
  `team_status` pour que la session creatrice puisse suivre l'exposition globale de
  l'equipe a la classification

::: danger SECURITE Les plafonds de classification des membres ne peuvent pas depasser le plafond de
l'equipe. Si le plafond de l'equipe est `INTERNAL`, aucun membre ne peut etre configure avec un
plafond `CONFIDENTIAL`. Ceci est valide a la creation. :::

## Equipes vs sous-agents

| Aspect          | Sous-agent (`subagent`)                             | Equipe (`team_create`)                                          |
| --------------- | --------------------------------------------------- | --------------------------------------------------------------- |
| **Duree de vie** | Tache unique, retourne le resultat et se termine   | Persistante jusqu'a dissolution ou expiration                   |
| **Membres**     | Un agent                                            | Plusieurs agents avec des roles distincts                       |
| **Interaction** | Tirer-et-oublier depuis le parent                   | Les membres communiquent librement via `sessions_send`          |
| **Coordination**| Le parent attend le resultat                        | Le responsable coordonne, le parent peut verifier via `team_status` |
| **Cas d'usage** | Delegation ciblee en une seule etape                | Collaboration multi-roles complexe                              |

**Utilisez les sous-agents** lorsque vous avez besoin d'un seul agent pour effectuer une tache ciblee et retourner
un resultat. **Utilisez les equipes** lorsque la tache beneficie de multiples perspectives
specialisees iterant sur le travail de chacun.

::: tip Les equipes sont autonomes une fois creees. L'agent createur peut verifier le statut
et envoyer des messages, mais n'a pas besoin de micro-gerer. Le responsable gere
la coordination. :::
