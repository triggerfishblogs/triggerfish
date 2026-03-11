# Routage multi-agent

Triggerfish prend en charge le routage de differents canaux, comptes ou contacts vers
des agents isoles separes, chacun avec son propre espace de travail, ses sessions, sa personnalite
et son plafond de classification.

## Pourquoi plusieurs agents ?

Un seul agent avec une seule personnalite ne suffit pas toujours. Vous pouvez vouloir :

- Un **assistant personnel** sur WhatsApp qui gere le calendrier, les rappels et
  les messages familiaux.
- Un **assistant professionnel** sur Slack qui gere les tickets Jira, les PR GitHub et les revues
  de code.
- Un **agent de support** sur Discord qui repond aux questions de la communaute avec un
  ton different et un acces limite.

Le routage multi-agent vous permet d'executer tous ces agents simultanement depuis une seule
installation Triggerfish.

## Fonctionnement

<img src="/diagrams/multi-agent-routing.svg" alt="Routage multi-agent : canaux entrants routes via l'AgentRouter vers des espaces de travail d'agents isoles" style="max-width: 100%;" />

L'**AgentRouter** examine chaque message entrant et l'associe a un agent selon
des regles de routage configurables. Si aucune regle ne correspond, les messages vont a un agent
par defaut.

## Regles de routage

Les messages peuvent etre routes par :

| Critere  | Description                                        | Exemple                                               |
| -------- | -------------------------------------------------- | ----------------------------------------------------- |
| Canal    | Router par plateforme de messagerie                | Tous les messages Slack vont a « Travail »            |
| Compte   | Router par compte specifique au sein d'un canal    | Email professionnel vs email personnel                |
| Contact  | Router par identite de l'expediteur/correspondant  | Les messages de votre responsable vont a « Travail »  |
| Defaut   | Repli lorsqu'aucune regle ne correspond            | Tout le reste va a « Personnel »                      |

## Configuration

Definissez les agents et le routage dans `triggerfish.yaml` :

```yaml
agents:
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp-personal, telegram-dm]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

    - id: work
      name: "Work Assistant"
      channels: [slack-work, email-work]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

    - id: support
      name: "Customer Support"
      channels: [discord-server]
      tools:
        profile: "messaging"
      model: claude-haiku-4-5
      classification_ceiling: PUBLIC
```

Chaque agent specifie :

- **id** -- Identifiant unique pour le routage.
- **name** -- Nom lisible par l'humain.
- **channels** -- Quelles instances de canaux cet agent gere.
- **tools** -- Profil d'outils et listes d'autorisation/refus explicites.
- **model** -- Quel modele LLM utiliser (peut differer par agent).
- **classification_ceiling** -- Niveau de classification maximum que cet agent peut
  atteindre.

## Identite de l'agent

Chaque agent a son propre `SPINE.md` definissant sa personnalite, sa mission et
ses limites. Les fichiers SPINE.md se trouvent dans le repertoire de l'espace de travail de l'agent :

```
~/.triggerfish/
  workspace/
    personal/
      SPINE.md          # Personnalite de l'assistant personnel
    work/
      SPINE.md          # Personnalite de l'assistant professionnel
    support/
      SPINE.md          # Personnalite du bot de support
```

## Isolation

Le routage multi-agent applique une isolation stricte entre les agents :

| Aspect            | Isolation                                                                                        |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| Sessions          | Chaque agent a un espace de sessions independant. Les sessions ne sont jamais partagees.          |
| Taint             | Le taint est suivi par agent, pas entre agents. Le taint professionnel n'affecte pas les sessions personnelles. |
| Skills            | Les skills sont charges par espace de travail. Un skill professionnel n'est pas disponible pour l'agent personnel. |
| Secrets           | Les identifiants sont isoles par agent. L'agent de support ne peut pas acceder aux cles API professionnelles. |
| Espaces de travail | Chaque agent a son propre espace de travail sur le systeme de fichiers pour l'execution de code. |

::: warning La communication inter-agents est possible via `sessions_send` mais est
controlee par la couche de politique. Un agent ne peut pas acceder silencieusement aux donnees ou
aux sessions d'un autre agent sans regles de politique explicites l'autorisant. :::

::: tip Le routage multi-agent sert a separer les preoccupations entre canaux et
personas. Pour les agents qui doivent collaborer sur une tache partagee, consultez
[Equipes d'agents](/fr-FR/features/agent-teams). :::

## Agent par defaut

Lorsqu'aucune regle de routage ne correspond a un message entrant, il est dirige vers l'agent par defaut.
Vous pouvez le definir dans la configuration :

```yaml
agents:
  default: personal
```

Si aucun agent par defaut n'est configure, le premier agent de la liste est utilise comme defaut.
