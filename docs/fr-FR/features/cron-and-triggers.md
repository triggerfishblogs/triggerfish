# Cron et Triggers

Les agents Triggerfish ne se limitent pas au mode question-reponse reactif. Le systeme
de cron et de triggers permet un comportement proactif : taches planifiees, verifications periodiques,
briefings matinaux, surveillance en arriere-plan et workflows autonomes multi-etapes.

## Taches Cron

Les taches cron sont des taches planifiees avec des instructions fixes, un canal de livraison et un
plafond de classification. Elles utilisent la syntaxe standard des expressions cron.

### Configuration

Definissez les taches cron dans `triggerfish.yaml` ou laissez l'agent les gerer a l'execution
via l'outil cron :

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # 7h tous les jours
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # Ou livrer
        classification: INTERNAL # Taint maximum pour cette tache

      - id: pipeline-check
        schedule: "0 */4 * * *" # Toutes les 4 heures
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### Fonctionnement

1. Le **CronManager** analyse les expressions cron standard et maintient un
   registre de taches persistant qui survit aux redemarrages.
2. Lorsqu'une tache se declenche, l'**OrchestratorFactory** cree un orchestrateur
   et une session isoles specifiquement pour cette execution.
3. La tache s'execute dans un **espace de travail de session d'arriere-plan** avec son propre
   suivi de taint.
4. La sortie est livree au canal configure, sous reserve des regles de
   classification de ce canal.
5. L'historique d'execution est enregistre pour l'audit.

### Cron gere par l'agent

L'agent peut creer et gerer ses propres taches cron via l'outil `cron` :

| Action         | Description                    | Securite                                            |
| -------------- | ------------------------------ | --------------------------------------------------- |
| `cron.list`    | Lister toutes les taches planifiees | Proprietaire uniquement                          |
| `cron.create`  | Planifier une nouvelle tache   | Proprietaire uniquement, plafond de classification applique |
| `cron.delete`  | Supprimer une tache planifiee  | Proprietaire uniquement                             |
| `cron.history` | Voir les executions passees    | Piste d'audit conservee                             |

::: warning La creation de taches cron necessite l'authentification du proprietaire. L'agent ne peut pas
planifier de taches au nom d'utilisateurs externes ni depasser le plafond de
classification configure. :::

### Gestion CLI des taches cron

Les taches cron peuvent egalement etre gerees directement depuis la ligne de commande :

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

Le drapeau `--classification` definit le plafond de classification pour la tache. Les niveaux
valides sont `PUBLIC`, `INTERNAL`, `CONFIDENTIAL` et `RESTRICTED`. S'il est omis,
la valeur par defaut est `INTERNAL`.

## Systeme de Triggers

Les triggers sont des boucles periodiques de « verification » ou l'agent se reveille pour evaluer
si une action proactive est necessaire. Contrairement aux taches cron avec des instructions fixes,
les triggers donnent a l'agent la discretion de decider ce qui necessite une attention.

### TRIGGER.md

`TRIGGER.md` definit ce que l'agent doit verifier lors de chaque reveil. Il se trouve dans
`~/.triggerfish/config/TRIGGER.md` et est un fichier markdown libre ou vous
specifiez les priorites de surveillance, les regles d'escalade et les comportements proactifs.

Si `TRIGGER.md` est absent, l'agent utilise ses connaissances generales pour decider ce qui
necessite une attention.

**Exemple de TRIGGER.md :**

```markdown
# TRIGGER.md -- Ce qu'il faut verifier a chaque reveil

## Verifications prioritaires

- Messages non lus sur tous les canaux datant de plus d'une heure
- Conflits de calendrier dans les prochaines 24 heures
- Taches en retard dans Linear ou Jira

## Surveillance

- GitHub : PR en attente de mon examen
- Email : tout message de contacts VIP (signaler pour notification immediate)
- Slack : mentions dans le canal #incidents

## Proactif

- Si le matin (7h-9h), preparer le briefing quotidien
- Si vendredi apres-midi, rediger le resume hebdomadaire
```

### Configuration des triggers

Le timing et les contraintes des triggers sont definis dans `triggerfish.yaml` :

```yaml
scheduler:
  trigger:
    enabled: true # Mettre a false pour desactiver les triggers (par defaut : true)
    interval_minutes: 30 # Verifier toutes les 30 minutes (par defaut : 30)
    # Mettre a 0 pour desactiver les triggers sans supprimer la configuration
    classification_ceiling: CONFIDENTIAL # Plafond de taint maximum (par defaut : CONFIDENTIAL)
    quiet_hours:
      start: 22 # Ne pas se reveiller entre 22h ...
      end: 7 # ... et 7h
```

| Parametre                               | Description                                                                                                                                         |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | Si les reveils periodiques des triggers sont actifs. Mettre a `false` pour desactiver.                                                              |
| `interval_minutes`                      | Frequence (en minutes) a laquelle l'agent se reveille pour verifier les triggers. Par defaut : `30`. Mettre a `0` pour desactiver sans supprimer la configuration. |
| `classification_ceiling`                | Niveau de classification maximum que la session de trigger peut atteindre. Par defaut : `CONFIDENTIAL`.                                             |
| `quiet_hours.start` / `quiet_hours.end` | Plage horaire (horloge 24h) pendant laquelle les triggers sont supprimes.                                                                           |

::: tip Pour desactiver temporairement les triggers, definissez `interval_minutes: 0`. C'est
equivalent a `enabled: false` et vous permet de conserver vos autres parametres de trigger
pour les reactiver facilement. :::

### Execution des triggers

Chaque reveil de trigger suit cette sequence :

1. Le planificateur se declenche a l'intervalle configure.
2. Une nouvelle session d'arriere-plan est creee avec un taint `PUBLIC`.
3. L'agent lit `TRIGGER.md` pour ses instructions de surveillance.
4. L'agent evalue chaque verification, en utilisant les outils disponibles et les serveurs MCP.
5. Si une action est necessaire, l'agent agit -- envoyant des notifications, creant des taches
   ou livrant des resumes.
6. Le taint de la session peut augmenter a mesure que des donnees classifiees sont accedees, mais il
   ne peut pas depasser le plafond configure.
7. La session est archivee apres achevement.

::: tip Les triggers et les taches cron se completent. Utilisez le cron pour les taches qui
doivent s'executer a des heures exactes independamment des conditions (briefing matinal a 7h).
Utilisez les triggers pour la surveillance qui necessite du jugement (verifier si quelque chose necessite mon
attention toutes les 30 minutes). :::

## Outil de contexte de trigger

L'agent peut charger les resultats de trigger dans sa conversation en cours a l'aide de l'outil
`trigger_add_to_context`. C'est utile lorsque vous posez une question sur quelque chose
qui a ete verifie lors du dernier reveil de trigger.

### Utilisation

| Parametre | Par defaut  | Description                                                                                          |
| --------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| `source`  | `"trigger"` | Quelle sortie de trigger charger : `"trigger"` (periodique), `"cron:<job-id>"` ou `"webhook:<source>"` |

L'outil charge le resultat d'execution le plus recent pour la source specifiee et
l'ajoute au contexte de la conversation.

### Application du write-down

L'injection de contexte de trigger respecte la regle de non-write-down :

- Si la classification du trigger **depasse** le taint de la session, le taint de la session
  **augmente** pour correspondre
- Si le taint de la session **depasse** la classification du trigger, l'injection
  est **autorisee** -- les donnees de classification inferieure peuvent toujours circuler vers une
  session de classification superieure (comportement normal `canFlowTo`). Le taint de la session
  reste inchange.

::: info Une session CONFIDENTIAL peut charger un resultat de trigger PUBLIC sans probleme --
les donnees circulent vers le haut. L'inverse (injecter des donnees de trigger CONFIDENTIAL dans une
session avec un plafond PUBLIC) augmenterait le taint de la session a
CONFIDENTIAL. :::

### Persistance

Les resultats de trigger sont stockes via `StorageProvider` avec des cles au format
`trigger:last:<source>`. Seul le resultat le plus recent par source est conserve.

## Integration de la securite

Toute execution planifiee s'integre au modele de securite central :

- **Sessions isolees** -- Chaque tache cron et reveil de trigger s'execute dans sa propre
  session creee avec un suivi de taint independant.
- **Plafond de classification** -- Les taches d'arriere-plan ne peuvent pas depasser leur niveau de
  classification configure, meme si les outils qu'elles invoquent retournent des donnees
  de classification superieure.
- **Hooks de politique** -- Toutes les actions au sein des taches planifiees passent par les memes
  hooks d'application que les sessions interactives (PRE_TOOL_CALL, POST_TOOL_RESPONSE,
  PRE_OUTPUT).
- **Classification des canaux** -- La livraison de sortie respecte le niveau de classification
  du canal cible. Un resultat `CONFIDENTIAL` ne peut pas etre envoye a un canal `PUBLIC`.
- **Piste d'audit** -- Chaque execution planifiee est enregistree avec le contexte complet : identifiant
  de tache, identifiant de session, historique de taint, actions effectuees et statut de livraison.
- **Persistance** -- Les taches cron sont stockees via `StorageProvider` (espace de noms :
  `cron:`) et survivent aux redemarrages du Gateway.
