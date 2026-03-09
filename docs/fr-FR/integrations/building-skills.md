# Construire des skills

Ce guide vous accompagne dans la creation d'une skill Triggerfish de zero -- de
l'ecriture du fichier `SKILL.md` aux tests et a l'approbation.

## Ce que vous allez construire

Une skill est un dossier contenant un fichier `SKILL.md` qui enseigne a l'agent
comment faire quelque chose. A la fin de ce guide, vous aurez une skill
fonctionnelle que l'agent peut decouvrir et utiliser.

## Anatomie d'une skill

Chaque skill est un repertoire avec un `SKILL.md` a sa racine :

```
my-skill/
  SKILL.md           # Requis : frontmatter + instructions
  template.md        # Optionnel : modeles references par la skill
  helper.ts          # Optionnel : code de support
```

Le fichier `SKILL.md` a deux parties :

1. **Frontmatter YAML** (entre les delimiteurs `---`) -- metadonnees sur la skill
2. **Corps markdown** -- les instructions que l'agent lit

## Etape 1 : Ecrire le frontmatter

Le frontmatter declare ce que fait la skill, ce dont elle a besoin et quelles
contraintes de securite s'appliquent.

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, and flag PRs needing review.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---
```

### Champs requis

| Champ         | Description                                                    | Exemple         |
| ------------- | -------------------------------------------------------------- | --------------- |
| `name`        | Identifiant unique. Minuscules, tirets pour les espaces.       | `github-triage` |
| `description` | Ce que fait la skill et quand l'utiliser. 1 a 3 phrases.      | Voir ci-dessus  |

### Champs optionnels

| Champ                    | Description                                 | Defaut   |
| ------------------------ | ------------------------------------------- | -------- |
| `classification_ceiling` | Niveau maximum de sensibilite des donnees   | `PUBLIC` |
| `requires_tools`         | Outils dont la skill a besoin               | `[]`     |
| `network_domains`        | Domaines externes auxquels la skill accede  | `[]`     |

Des champs supplementaires comme `version`, `category`, `tags` et `triggers`
peuvent etre inclus pour la documentation et l'usage futur. Le chargeur de skills
ignorera silencieusement les champs qu'il ne reconnait pas.

### Choisir un plafond de classification

Le plafond de classification est la sensibilite maximale des donnees que votre
skill manipulera. Choisissez le niveau le plus bas qui fonctionne :

| Niveau         | Quand l'utiliser                                  | Exemples                                                     |
| -------------- | ------------------------------------------------- | ------------------------------------------------------------ |
| `PUBLIC`       | Utilise uniquement des donnees publiques           | Recherche web, docs d'API publiques, meteo                   |
| `INTERNAL`     | Travaille avec des donnees internes de projet      | Analyse de code, revue de configuration, docs internes       |
| `CONFIDENTIAL` | Manipule des donnees personnelles ou privees        | Resume d'emails, notifications GitHub, requetes CRM          |
| `RESTRICTED`   | Accede a des donnees hautement sensibles            | Gestion de cles, audits de securite, conformite              |

::: warning Si le plafond de votre skill depasse le plafond configure de
l'utilisateur, l'API de creation de skill le rejettera. Utilisez toujours le
niveau minimum necessaire. :::

## Etape 2 : Ecrire les instructions

Le corps markdown est ce que l'agent lit pour apprendre a executer la skill.
Rendez-le actionnable et specifique.

### Modele de structure

```markdown
# Nom de la skill

Enonce de l'objectif en une ligne.

## Quand l'utiliser

- Condition 1 (l'utilisateur demande X)
- Condition 2 (declenche par cron)
- Condition 3 (mot-cle associe detecte)

## Etapes

1. Premiere action avec details specifiques
2. Deuxieme action avec details specifiques
3. Traiter et formater les resultats
4. Livrer au canal configure

## Format de sortie

Decrire comment les resultats doivent etre formates.

## Erreurs courantes

- Ne pas faire X parce que Y
- Toujours verifier Z avant de continuer
```

### Bonnes pratiques

- **Commencez par l'objectif** : Une phrase expliquant ce que fait la skill
- **Incluez "Quand l'utiliser"** : Aide l'agent a decider quand activer la skill
- **Soyez specifique** : "Recuperer les emails non lus des dernieres 24 heures"
  est mieux que "Obtenir les emails"
- **Utilisez des exemples de code** : Montrez les appels API exacts, formats de
  donnees, motifs de commandes
- **Ajoutez des tableaux** : Reference rapide pour les options, points de
  terminaison, parametres
- **Incluez la gestion d'erreurs** : Que faire lorsqu'un appel API echoue ou que
  des donnees manquent
- **Terminez par "Erreurs courantes"** : Empeche l'agent de repeter des problemes
  connus

## Etape 3 : Tester la decouverte

Verifiez que votre skill est decouvrable par le chargeur de skills. Si vous
l'avez placee dans le repertoire fourni :

```typescript
import { createSkillLoader } from "../src/skills/loader.ts";

const loader = createSkillLoader({
  directories: ["skills/bundled"],
  dirTypes: { "skills/bundled": "bundled" },
});

const skills = await loader.discover();
const mySkill = skills.find((s) => s.name === "github-triage");
console.log(mySkill);
// { name: "github-triage", classificationCeiling: "CONFIDENTIAL", ... }
```

Verifiez que :

- La skill apparait dans la liste decouverte
- `name` correspond au frontmatter
- `classificationCeiling` est correct
- `requiresTools` et `networkDomains` sont renseignes

## Auto-creation par l'agent

L'agent peut creer des skills programmatiquement en utilisant l'API
`SkillAuthor`. C'est ainsi que l'agent s'etend lorsqu'on lui demande de faire
quelque chose de nouveau.

### Le workflow

```
1. Utilisateur :  "J'ai besoin que tu verifies Notion pour les nouvelles taches chaque matin"
2. Agent :        Utilise SkillAuthor pour creer une skill dans son espace de travail
3. Skill :        Entre dans le statut PENDING_APPROVAL
4. Utilisateur :  Recoit une notification, examine la skill
5. Utilisateur :  Approuve → la skill devient active
6. Agent :        Connecte la skill au planning cron du matin
```

### Utilisation de l'API SkillAuthor

```typescript
import { createSkillAuthor } from "triggerfish/skills";

const author = createSkillAuthor({
  skillsDir: workspace.skillsPath,
  userCeiling: "CONFIDENTIAL",
});

const result = await author.create({
  name: "notion-tasks",
  description: "Check Notion for new tasks and summarize them daily",
  classificationCeiling: "INTERNAL",
  requiresTools: ["browser"],
  networkDomains: ["api.notion.com"],
  content: `# Notion Task Checker

## Quand l'utiliser

- Declencheur cron du matin
- L'utilisateur demande des informations sur les taches en attente

## Etapes

1. Recuperer les taches depuis l'API Notion en utilisant le token d'integration de l'utilisateur
2. Filtrer les taches creees ou mises a jour dans les dernieres 24 heures
3. Categoriser par priorite (P0, P1, P2)
4. Formater en resume concis a puces
5. Livrer au canal configure
`,
});

if (result.ok) {
  console.log(`Skill created at: ${result.value.path}`);
  console.log(`Status: ${result.value.status}`); // "PENDING_APPROVAL"
}
```

### Statuts d'approbation

| Statut             | Signification                                    |
| ------------------ | ------------------------------------------------ |
| `PENDING_APPROVAL` | Creee, en attente d'examen par le proprietaire   |
| `APPROVED`         | Proprietaire a approuve, la skill est active     |
| `REJECTED`         | Proprietaire a rejete, la skill est inactive     |

::: warning SECURITE L'agent ne peut pas approuver ses propres skills. Ceci est
applique au niveau de l'API. Toutes les skills creees par l'agent necessitent une
confirmation explicite du proprietaire avant activation. :::

## Scan de securite

Avant activation, les skills passent par un scanner de securite qui verifie les
motifs d'injection de prompt :

- "Ignore all previous instructions" -- injection de prompt
- "You are now a..." -- redefinition d'identite
- "Reveal secrets/credentials" -- tentatives d'exfiltration de donnees
- "Bypass security/policy" -- contournement de securite
- "Sudo/admin/god mode" -- escalade de privileges

Les skills signalees par le scanner incluent des avertissements que le
proprietaire doit examiner avant approbation.

## Declencheurs

Les skills peuvent definir des declencheurs automatiques dans leur frontmatter :

```yaml
triggers:
  - cron: "0 7 * * *" # Chaque jour a 7h
  - cron: "*/30 * * * *" # Toutes les 30 minutes
```

Le planificateur lit ces definitions et reveille l'agent aux heures specifiees
pour executer la skill. Vous pouvez combiner les declencheurs avec des heures de
silence dans `triggerfish.yaml` pour empecher l'execution pendant certaines
periodes.

## Exemple complet

Voici une skill complete pour le triage des notifications GitHub :

```
github-triage/
  SKILL.md
```

```yaml
---
name: github-triage
description: >
  Triage GitHub notifications and issues. Categorize by priority,
  summarize new issues, flag PRs needing review. Use when the user
  asks about GitHub activity or on the hourly cron.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - exec
network_domains:
  - api.github.com
---

# GitHub Triage

Examiner et categoriser les notifications, issues et pull requests GitHub.

## Quand l'utiliser

- L'utilisateur demande "que se passe-t-il sur GitHub ?"
- Declencheur cron horaire
- L'utilisateur demande l'activite d'un depot specifique

## Etapes

1. Recuperer les notifications depuis l'API GitHub en utilisant le token de l'utilisateur
2. Categoriser : PR a examiner, nouvelles issues, mentions, echecs CI
3. Prioriser par label : bug > security > feature > question
4. Resumer les elements principaux avec des liens directs
5. Signaler tout ce qui est assigne a l'utilisateur

## Format de sortie

### PR a examiner
- [#123 Fix auth flow](link) — assigne a vous, 2 jours


### Nouvelles issues (derniere heure)
- [#456 Login broken on mobile](link) — bug, haute priorite

### Mentions
- @vous mentionne dans la discussion #789

## Erreurs courantes

- Ne pas recuperer toutes les notifications — filtrer par le parametre `since` pour la derniere heure
- Toujours verifier les limites de debit avant de faire plusieurs appels API
- Inclure des liens directs vers chaque element pour une action rapide
```

## Checklist de la skill

Avant de considerer une skill comme terminee :

- [ ] Le nom du dossier correspond au `name` du frontmatter
- [ ] La description explique **quoi** et **quand** l'utiliser
- [ ] Le plafond de classification est le niveau le plus bas qui fonctionne
- [ ] Tous les outils requis sont listes dans `requires_tools`
- [ ] Tous les domaines externes sont listes dans `network_domains`
- [ ] Les instructions sont concretes et pas a pas
- [ ] Les exemples de code utilisent les motifs Triggerfish (types Result, fonctions factory)
- [ ] Le format de sortie est specifie
- [ ] La section erreurs courantes est incluse
- [ ] La skill est decouvrable par le chargeur (testee)
