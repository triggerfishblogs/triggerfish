# Skills bouwen

Deze handleiding doorloopt het maken van een Triggerfish-skill van scratch — van het schrijven van het `SKILL.md`-bestand tot het testen en goedkeuren ervan.

## Wat u gaat bouwen

Een skill is een map met een `SKILL.md`-bestand dat de agent leert hoe iets te doen. Aan het einde van deze handleiding heeft u een werkende skill die de agent kan ontdekken en gebruiken.

## Skillstructuur

Elke skill is een map met een `SKILL.md` aan de root:

```
my-skill/
  SKILL.md           # Required: frontmatter + instructions
  template.md        # Optional: templates the skill references
  helper.ts          # Optional: supporting code
```

Het `SKILL.md`-bestand bestaat uit twee delen:

1. **YAML-frontmatter** (tussen `---`-scheidingstekens) — metadata over de skill
2. **Markdown-body** — de instructies die de agent leest

## Stap 1: Schrijf de frontmatter

De frontmatter declareert wat de skill doet, wat hij nodig heeft en welke beveiligingsbeperkingen van toepassing zijn.

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

### Vereiste velden

| Veld          | Beschrijving                                                 | Voorbeeld       |
| ------------- | ------------------------------------------------------------ | --------------- |
| `name`        | Unieke identificatie. Kleine letters, koppeltekens als spaties. | `github-triage` |
| `description` | Wat de skill doet en wanneer te gebruiken. 1-3 zinnen.       | Zie hierboven   |

### Optionele velden

| Veld                     | Beschrijving                             | Standaard |
| ------------------------ | ---------------------------------------- | --------- |
| `classification_ceiling` | Maximaal gegevensgevoeligheidsniveau     | `PUBLIC`  |
| `requires_tools`         | Tools waartoe de skill toegang nodig heeft | `[]`    |
| `network_domains`        | Externe domeinen waartoe de skill toegang heeft | `[]` |

Aanvullende velden zoals `version`, `category`, `tags` en `triggers` kunnen worden opgenomen voor documentatie en toekomstig gebruik. De skillloader negeert stilzwijgend velden die hij niet herkent.

### Een classificatieplafond kiezen

Het classificatieplafond is de maximale gegevensgevoeligheid die uw skill zal verwerken. Kies het laagste niveau dat werkt:

| Niveau         | Wanneer te gebruiken                          | Voorbeelden                                              |
| -------------- | --------------------------------------------- | -------------------------------------------------------- |
| `PUBLIC`       | Gebruikt alleen openbaar beschikbare gegevens | Webzoeken, openbare API-documenten, weer                 |
| `INTERNAL`     | Werkt met interne projectgegevens             | Codeanalyse, configuratiebeoordeling, interne documenten |
| `CONFIDENTIAL` | Verwerkt persoonlijke of privégegevens        | E-mailsamenvatting, GitHub-meldingen, CRM-queries        |
| `RESTRICTED`   | Heeft toegang tot zeer gevoelige gegevens     | Sleutelbeheer, beveiligingsaudits, naleving              |

::: warning Als het plafond van uw skill het geconfigureerde plafond van de gebruiker overschrijdt, wordt het door de skill-auteur-API geweigerd. Gebruik altijd het minimaal benodigde niveau. :::

## Stap 2: Schrijf de instructies

De markdown-body is wat de agent leest om te leren hoe de skill uit te voeren. Maak het uitvoerbaar en specifiek.

### Structuursjabloon

```markdown
# Skill Name

One-line purpose statement.

## When to Use

- Condition 1 (user asks for X)
- Condition 2 (triggered by cron)
- Condition 3 (related keyword detected)

## Steps

1. First action with specific details
2. Second action with specific details
3. Process and format the results
4. Deliver to the configured channel

## Output Format

Describe how results should be formatted.

## Common Mistakes

- Don't do X because Y
- Always check Z before proceeding
```

### Beste praktijken

- **Begin met het doel**: Één zin die uitlegt wat de skill doet
- **Voeg "Wanneer te gebruiken" toe**: Helpt de agent te beslissen wanneer de skill te activeren
- **Wees specifiek**: "Haal de laatste 24 uur ongelezen e-mails op" is beter dan "Haal e-mails op"
- **Gebruik codevoorbeelden**: Toon exacte API-aanroepen, gegevensformaten, opdrachtpatronen
- **Voeg tabellen toe**: Snelle referentie voor opties, eindpunten, parameters
- **Voeg foutafhandeling toe**: Wat te doen als een API-aanroep mislukt of gegevens ontbreken
- **Eindig met "Veelgemaakte fouten"**: Voorkomt dat de agent bekende problemen herhaalt

## Stap 3: Ontdekking testen

Verifieer dat uw skill vindbaar is door de skillloader. Als u hem in de gebundelde map hebt geplaatst:

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

Controleer dat:

- De skill verschijnt in de ontdekte lijst
- `name` overeenkomt met de frontmatter
- `classificationCeiling` correct is
- `requiresTools` en `networkDomains` zijn ingevuld

## Zelfbewerking door agent

De agent kan programmatisch skills maken via de `SkillAuthor`-API. Dit is hoe de agent zichzelf uitbreidt wanneer gevraagd iets nieuws te doen.

### De workflow

```
1. Gebruiker:  "I need you to check Notion for new tasks every morning"
2. Agent: Uses SkillAuthor to create a skill in its workspace
3. Skill: Enters PENDING_APPROVAL status
4. Gebruiker:  Receives notification, reviews the skill
5. Gebruiker:  Approves → skill becomes active
6. Agent: Wires skill into the morning cron schedule
```

### De SkillAuthor-API gebruiken

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

## When to Use

- Morning cron trigger
- User asks about pending tasks

## Steps

1. Fetch tasks from Notion API using the user's integration token
2. Filter for tasks created or updated in the last 24 hours
3. Categorize by priority (P0, P1, P2)
4. Format as a concise bullet-point summary
5. Deliver to the configured channel
`,
});

if (result.ok) {
  console.log(`Skill created at: ${result.value.path}`);
  console.log(`Status: ${result.value.status}`); // "PENDING_APPROVAL"
}
```

### Goedkeuringsstatussen

| Status             | Betekenis                                     |
| ------------------ | --------------------------------------------- |
| `PENDING_APPROVAL` | Aangemaakt, wacht op beoordeling door eigenaar |
| `APPROVED`         | Eigenaar heeft goedgekeurd, skill is actief   |
| `REJECTED`         | Eigenaar heeft geweigerd, skill is inactief   |

::: warning BEVEILIGING De agent kan zijn eigen skills niet goedkeuren. Dit wordt gehandhaafd op API-niveau. Alle door de agent gemaakte skills vereisen expliciete bevestiging door de eigenaar voordat activering. :::

## Beveiligingsscanning

Vóór activering doorlopen skills een beveiligingsscanner die controleert op prompt-injectiepatronen:

- "Ignore all previous instructions" — prompt-injectie
- "You are now a..." — identiteitsredefinitie
- "Reveal secrets/credentials" — gegevensexfiltratiepogingen
- "Bypass security/policy" — beveiligingsomzeiling
- "Sudo/admin/god mode" — escalatie van bevoegdheden

Skills die door de scanner worden gemarkeerd, bevatten waarschuwingen die de eigenaar moet beoordelen vóór goedkeuring.

## Triggers

Skills kunnen automatische triggers definiëren in hun frontmatter:

```yaml
triggers:
  - cron: "0 7 * * *" # Every day at 7 AM
  - cron: "*/30 * * * *" # Every 30 minutes
```

De planner leest deze definities en wekt de agent op de opgegeven tijden om de skill uit te voeren. U kunt triggers combineren met stille uren in `triggerfish.yaml` om uitvoering tijdens bepaalde perioden te voorkomen.

## Volledig voorbeeld

Hier is een volledige skill voor het triage van GitHub-meldingen:

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

Review and categorize GitHub notifications, issues, and pull requests.

## When to Use

- User asks "what's happening on GitHub?"
- Hourly cron trigger
- User asks about specific repo activity

## Steps

1. Fetch notifications from GitHub API using the user's token
2. Categorize: PRs needing review, new issues, mentions, CI failures
3. Prioritize by label: bug > security > feature > question
4. Summarize top items with direct links
5. Flag anything assigned to the user

## Output Format

### PRs Needing Review
- [#123 Fix auth flow](link) — assigned to you, 2 days old

### New Issues (Last Hour)
- [#456 Login broken on mobile](link) — bug, high priority

### Mentions
- @you mentioned in #789 discussion

## Common Mistakes

- Don't fetch all notifications — filter by `since` parameter for the last hour
- Always check rate limits before making multiple API calls
- Include direct links to every item for quick action
```

## Skillchecklist

Voordat u een skill als voltooid beschouwt:

- [ ] Mapnaam komt overeen met `name` in frontmatter
- [ ] Beschrijving legt **wat** en **wanneer te gebruiken** uit
- [ ] Classificatieplafond is het laagste niveau dat werkt
- [ ] Alle vereiste tools staan vermeld in `requires_tools`
- [ ] Alle externe domeinen staan vermeld in `network_domains`
- [ ] Instructies zijn concreet en stapsgewijs
- [ ] Codevoorbeelden gebruiken Triggerfish-patronen (Result-typen, fabriekspatronen)
- [ ] Uitvoerformaat is gespecificeerd
- [ ] Sectie "Veelgemaakte fouten" is opgenomen
- [ ] Skill is vindbaar door de loader (getest)
