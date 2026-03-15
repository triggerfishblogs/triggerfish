# Bygga kunskaper

Den här guiden leder dig igenom att skapa en Triggerfish-kunskap från grunden — från att skriva `SKILL.md`-filen till att testa den och få den godkänd.

## Vad du kommer att bygga

En kunskap är en mapp som innehåller en `SKILL.md`-fil som lär agenten hur man gör något. I slutet av den här guiden har du en fungerande kunskap som agenten kan identifiera och använda.

## Kunskapens anatomi

Varje kunskap är en katalog med en `SKILL.md` i roten:

```
my-skill/
  SKILL.md           # Obligatorisk: frontmatter + instruktioner
  template.md        # Valfri: mallar som kunskapen refererar till
  helper.ts          # Valfri: stödkod
```

`SKILL.md`-filen har två delar:

1. **YAML-frontmatter** (mellan `---`-avgränsare) — metadata om kunskapen
2. **Markdown-kropp** — instruktionerna agenten läser

## Steg 1: Skriv frontmattern

Frontmattern deklarerar vad kunskapen gör, vad den behöver och vilka säkerhetsbegränsningar som gäller.

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

### Obligatoriska fält

| Fält          | Beskrivning                                                  | Exempel         |
| ------------- | ------------------------------------------------------------ | --------------- |
| `name`        | Unikt identifierare. Gemener, bindestreck för mellanslag.    | `github-triage` |
| `description` | Vad kunskapen gör och när den ska användas. 1–3 meningar.    | Se ovan         |

### Valfria fält

| Fält                     | Beskrivning                            | Standard |
| ------------------------ | -------------------------------------- | -------- |
| `classification_ceiling` | Maximal datakänslighetnivå             | `PUBLIC` |
| `requires_tools`         | Verktyg kunskapen behöver tillgång till | `[]`    |
| `network_domains`        | Externa domäner kunskapen kommer åt    | `[]`     |

Ytterligare fält som `version`, `category`, `tags` och `triggers` kan inkluderas för dokumentation och framtida användning. Kunskapsladdaren ignorerar tyst fält den inte känner igen.

### Välja ett klassificeringstak

Klassificeringstaket är den maximala datakänslighet din kunskap kommer att hantera. Välj den lägsta nivå som fungerar:

| Nivå           | När att använda                      | Exempel                                               |
| -------------- | ------------------------------------ | ----------------------------------------------------- |
| `PUBLIC`       | Använder bara offentligt tillgänglig data | Webbsökning, offentliga API-dokument, väder      |
| `INTERNAL`     | Arbetar med interna projektdata      | Kodanalys, konfigurationsgranskning, interna dokument |
| `CONFIDENTIAL` | Hanterar personliga eller privata data | E-postsammanfattning, GitHub-notifikationer, CRM    |
| `RESTRICTED`   | Kommer åt mycket känsliga data       | Nyckelhantering, säkerhetsgranskningar, efterlevnad   |

::: warning Om din kunskaps tak överstiger användarens konfigurerade tak avvisar SkillAuthor API det. Använd alltid den lägsta nödvändiga nivån. :::

## Steg 2: Skriv instruktionerna

Markdown-kroppen är vad agenten läser för att lära sig hur man utför kunskapen. Gör det handlingsbart och specifikt.

### Strukturmall

```markdown
# Kunskapsnamn

Enradsändamålsförklaring.

## När att använda

- Villkor 1 (användaren frågar om X)
- Villkor 2 (utlöst av cron)
- Villkor 3 (relaterat nyckelord identifierat)

## Steg

1. Första åtgärd med specifika detaljer
2. Andra åtgärd med specifika detaljer
3. Bearbeta och formatera resultaten
4. Leverera till den konfigurerade kanalen

## Utdataformat

Beskriv hur resultat ska formateras.

## Vanliga misstag

- Gör inte X på grund av Y
- Kontrollera alltid Z innan du fortsätter
```

### Bästa praxis

- **Börja med syftet**: En mening som förklarar vad kunskapen gör
- **Inkludera "När att använda"**: Hjälper agenten att bestämma när kunskapen ska aktiveras
- **Var specifik**: "Hämta de senaste 24 timmarnas olästa e-post" är bättre än "Hämta e-post"
- **Använd kodexempel**: Visa exakta API-anrop, dataformat, kommandomönster
- **Lägg till tabeller**: Snabbreferens för alternativ, slutpunkter, parametrar
- **Inkludera felhantering**: Vad man gör när ett API-anrop misslyckas eller data saknas
- **Avsluta med "Vanliga misstag"**: Förhindrar agenten från att upprepa kända problem

## Steg 3: Testa discovery

Verifiera att din kunskap kan hittas av kunskapsladdaren. Om du placerat den i den inbyggda katalogen:

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

Kontrollera att:

- Kunskapen visas i den identifierade listan
- `name` matchar frontmattern
- `classificationCeiling` är korrekt
- `requiresTools` och `networkDomains` är ifyllda

## Agentens självförfattande

Agenten kan skapa kunskaper programmatiskt med SkillAuthor API. Det är så agenten utökar sig själv när den ombeds göra något nytt.

### Arbetsflödet

```
1. Användare: "Jag behöver att du kontrollerar Notion för nya uppgifter varje morgon"
2. Agent:     Använder SkillAuthor för att skapa en kunskap i sin arbetsyta
3. Kunskap:   Går in i PENDING_APPROVAL-tillstånd
4. Användare: Tar emot notifikation, granskar kunskapen
5. Användare: Godkänner → kunskapen blir aktiv
6. Agent:     Kopplar kunskapen till morgonens cron-schema
```

### Använda SkillAuthor API

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

### Godkännandestatusar

| Status             | Betydelse                                  |
| ------------------ | ------------------------------------------ |
| `PENDING_APPROVAL` | Skapad, väntar på ägarens granskning       |
| `APPROVED`         | Ägaren godkände, kunskapen är aktiv        |
| `REJECTED`         | Ägaren avvisade, kunskapen är inaktiv      |

::: warning SÄKERHET Agenten kan inte godkänna sina egna kunskaper. Det tillämpas på API-nivå. Alla agentförfattade kunskaper kräver explicit ägarbekräftelse innan aktivering. :::

## Säkerhetsskanning

Innan aktivering passerar kunskaper genom en säkerhetsskanner som kontrollerar efter promptinjektionsmönster:

- "Ignore all previous instructions" — promptinjektion
- "You are now a..." — identitetsomdefiniering
- "Reveal secrets/credentials" — dataexfiltreringsförsök
- "Bypass security/policy" — säkerhetskringgående
- "Sudo/admin/god mode" — privilegieskalering

Kunskaper flaggade av skannern inkluderar varningar som ägaren måste granska innan godkännande.

## Triggers

Kunskaper kan definiera automatiska triggers i sin frontmatter:

```yaml
triggers:
  - cron: "0 7 * * *" # Varje dag kl 07:00
  - cron: "*/30 * * * *" # Var 30:e minut
```

Schemaläggaren läser dessa definitioner och väcker agenten vid angivna tider för att utföra kunskapen. Du kan kombinera triggers med tysta timmar i `triggerfish.yaml` för att förhindra körning under vissa perioder.

## Komplett exempel

Här är en fullständig kunskap för att prioritera GitHub-notifikationer:

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

## Kunskapschecklista

Innan du anser en kunskap fullständig:

- [ ] Mappnamn matchar `name` i frontmattern
- [ ] Beskrivning förklarar **vad** och **när** den ska användas
- [ ] Klassificeringstak är den lägsta nivå som fungerar
- [ ] Alla nödvändiga verktyg listas i `requires_tools`
- [ ] Alla externa domäner listas i `network_domains`
- [ ] Instruktioner är konkreta och stegvisa
- [ ] Kodexempel använder Triggerfish-mönster (Result-typer, fabriksfunktioner)
- [ ] Utdataformat specificerat
- [ ] Avsnittet om vanliga misstag inkluderat
- [ ] Kunskapen kan hittas av laddaren (testad)
