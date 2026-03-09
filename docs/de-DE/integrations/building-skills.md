# Skills erstellen

Diese Anleitung fuehrt Sie durch die Erstellung eines Triggerfish-Skills von Grund auf -- vom Schreiben der `SKILL.md`-Datei bis zum Testen und zur Genehmigung.

## Was Sie erstellen werden

Ein Skill ist ein Ordner mit einer `SKILL.md`-Datei, die dem Agenten beibringt, etwas zu tun. Am Ende dieser Anleitung haben Sie einen funktionierenden Skill, den der Agent entdecken und verwenden kann.

## Skill-Anatomie

Jeder Skill ist ein Verzeichnis mit einer `SKILL.md` an seiner Wurzel:

```
my-skill/
  SKILL.md           # Erforderlich: Frontmatter + Anweisungen
  template.md        # Optional: Vorlagen, auf die der Skill verweist
  helper.ts          # Optional: Unterstuetzender Code
```

Die `SKILL.md`-Datei hat zwei Teile:

1. **YAML-Frontmatter** (zwischen `---`-Trennzeichen) -- Metadaten ueber den Skill
2. **Markdown-Body** -- die Anweisungen, die der Agent liest

## Schritt 1: Frontmatter schreiben

Das Frontmatter deklariert, was der Skill tut, was er benoetigt und welche Sicherheitsbeschraenkungen gelten.

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

### Erforderliche Felder

| Feld          | Beschreibung                                           | Beispiel        |
| ------------- | ------------------------------------------------------ | --------------- |
| `name`        | Eindeutiger Bezeichner. Kleinbuchstaben, Bindestriche fuer Leerzeichen. | `github-triage` |
| `description` | Was der Skill tut und wann er verwendet wird. 1-3 Saetze. | Siehe oben      |

### Optionale Felder

| Feld                     | Beschreibung                        | Standard |
| ------------------------ | ----------------------------------- | -------- |
| `classification_ceiling` | Maximale Daten-Sensitivitaetsstufe  | `PUBLIC` |
| `requires_tools`         | Tools, die der Skill benoetigt      | `[]`     |
| `network_domains`        | Externe Domains, auf die der Skill zugreift | `[]`     |

Zusaetzliche Felder wie `version`, `category`, `tags` und `triggers` koennen fuer Dokumentation und zukuenftige Verwendung eingefuegt werden. Der Skill-Loader ignoriert nicht erkannte Felder stillschweigend.

### Klassifizierungs-Obergrenze waehlen

Die Klassifizierungs-Obergrenze ist die maximale Daten-Sensitivitaet, die Ihr Skill verarbeiten wird. Waehlen Sie die niedrigste Stufe, die funktioniert:

| Stufe          | Wann zu verwenden                 | Beispiele                                        |
| -------------- | --------------------------------- | ------------------------------------------------ |
| `PUBLIC`       | Verwendet nur oeffentlich verfuegbare Daten | Websuche, oeffentliche API-Dokumentation, Wetter |
| `INTERNAL`     | Arbeitet mit internen Projektdaten | Code-Analyse, Konfigurationspruefung, interne Dokumentation |
| `CONFIDENTIAL` | Verarbeitet persoenliche oder private Daten | E-Mail-Zusammenfassung, GitHub-Benachrichtigungen, CRM-Abfragen |
| `RESTRICTED`   | Greift auf hochsensible Daten zu  | Schluesselverwaltung, Sicherheitsaudits, Compliance |

::: warning Wenn die Obergrenze Ihres Skills die konfigurierte Obergrenze des Benutzers ueberschreitet, wird die Skill-Author-API ihn ablehnen. Verwenden Sie immer die minimal notwendige Stufe. :::

## Schritt 2: Anweisungen schreiben

Der Markdown-Body ist das, was der Agent liest, um zu lernen, wie er den Skill ausfuehrt. Machen Sie ihn handlungsorientiert und spezifisch.

### Strukturvorlage

```markdown
# Skill-Name

Einzeilige Zweckbeschreibung.

## Wann zu verwenden

- Bedingung 1 (Benutzer fragt nach X)
- Bedingung 2 (durch Cron ausgeloest)
- Bedingung 3 (verwandtes Schluesselwort erkannt)

## Schritte

1. Erste Aktion mit spezifischen Details
2. Zweite Aktion mit spezifischen Details
3. Ergebnisse verarbeiten und formatieren
4. An den konfigurierten Kanal zustellen

## Ausgabeformat

Beschreiben Sie, wie Ergebnisse formatiert werden sollen.

## Haeufige Fehler

- Tun Sie nicht X, weil Y
- Pruefen Sie immer Z, bevor Sie fortfahren
```

### Best Practices

- **Beginnen Sie mit dem Zweck**: Ein Satz, der erklaert, was der Skill tut
- **Fuegen Sie "Wann zu verwenden" ein**: Hilft dem Agenten zu entscheiden, wann der Skill aktiviert werden soll
- **Seien Sie spezifisch**: "Die letzten 24 Stunden ungelesener E-Mails abrufen" ist besser als "E-Mails holen"
- **Verwenden Sie Code-Beispiele**: Zeigen Sie exakte API-Aufrufe, Datenformate, Befehlsmuster
- **Fuegen Sie Tabellen hinzu**: Schnellreferenz fuer Optionen, Endpunkte, Parameter
- **Fuegen Sie Fehlerbehandlung ein**: Was zu tun ist, wenn ein API-Aufruf fehlschlaegt oder Daten fehlen
- **Enden Sie mit "Haeufige Fehler"**: Verhindert, dass der Agent bekannte Probleme wiederholt

## Schritt 3: Erkennung testen

Ueberpruefen Sie, dass Ihr Skill vom Skill-Loader erkannt wird. Wenn Sie ihn im gebundelten Verzeichnis platziert haben:

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

Pruefen Sie, dass:

- Der Skill in der erkannten Liste erscheint
- `name` mit dem Frontmatter uebereinstimmt
- `classificationCeiling` korrekt ist
- `requiresTools` und `networkDomains` befuellt sind

## Agenten-Selbsterstellung

Der Agent kann Skills programmatisch ueber die `SkillAuthor`-API erstellen. So erweitert sich der Agent selbst, wenn er gebeten wird, etwas Neues zu tun.

### Der Workflow

```
1. Benutzer:  "Ich moechte, dass du Notion taeglich auf neue Aufgaben pruefst"
2. Agent: Verwendet SkillAuthor, um einen Skill in seinem Workspace zu erstellen
3. Skill: Geht in den PENDING_APPROVAL-Status
4. Benutzer:  Erhaelt Benachrichtigung, prueft den Skill
5. Benutzer:  Genehmigt → Skill wird aktiv
6. Agent: Verdrahtet den Skill in den Morgen-Cron-Zeitplan
```

### Verwendung der SkillAuthor-API

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

### Genehmigungs-Status

| Status             | Bedeutung                           |
| ------------------ | ----------------------------------- |
| `PENDING_APPROVAL` | Erstellt, wartet auf Eigentuemer-Pruefung |
| `APPROVED`         | Eigentuemer genehmigt, Skill ist aktiv |
| `REJECTED`         | Eigentuemer abgelehnt, Skill ist inaktiv |

::: warning SICHERHEIT Der Agent kann seine eigenen Skills nicht genehmigen. Dies wird auf API-Ebene durchgesetzt. Alle vom Agenten erstellten Skills erfordern eine explizite Eigentuemer-Bestaetigung vor der Aktivierung. :::

## Sicherheitspruefung

Vor der Aktivierung durchlaufen Skills einen Sicherheitsscanner, der auf Prompt-Injection-Muster prueft:

- "Ignore all previous instructions" -- Prompt-Injection
- "You are now a..." -- Identitaets-Neudefinition
- "Reveal secrets/credentials" -- Daten-Exfiltrationsversuche
- "Bypass security/policy" -- Sicherheitsumgehung
- "Sudo/admin/god mode" -- Privilegien-Eskalation

Skills, die vom Scanner markiert werden, enthalten Warnungen, die der Eigentuemer vor der Genehmigung pruefen muss.

## Trigger

Skills koennen automatische Trigger in ihrem Frontmatter definieren:

```yaml
triggers:
  - cron: "0 7 * * *" # Jeden Tag um 7 Uhr
  - cron: "*/30 * * * *" # Alle 30 Minuten
```

Der Scheduler liest diese Definitionen und weckt den Agenten zu den angegebenen Zeiten, um den Skill auszufuehren. Sie koennen Trigger mit Ruhezeiten in `triggerfish.yaml` kombinieren, um die Ausfuehrung waehrend bestimmter Zeitraeume zu verhindern.

## Vollstaendiges Beispiel

Hier ist ein vollstaendiger Skill fuer das Triagieren von GitHub-Benachrichtigungen:

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

## Skill-Checkliste

Bevor Sie einen Skill als fertig betrachten:

- [ ] Ordnername stimmt mit `name` im Frontmatter ueberein
- [ ] Beschreibung erklaert **was** und **wann** zu verwenden
- [ ] Klassifizierungs-Obergrenze ist die niedrigste Stufe, die funktioniert
- [ ] Alle erforderlichen Tools sind in `requires_tools` aufgelistet
- [ ] Alle externen Domains sind in `network_domains` aufgelistet
- [ ] Anweisungen sind konkret und schrittweise
- [ ] Code-Beispiele verwenden Triggerfish-Muster (Result-Typen, Factory-Funktionen)
- [ ] Ausgabeformat ist angegeben
- [ ] Abschnitt "Haeufige Fehler" ist enthalten
- [ ] Skill ist vom Loader erkennbar (getestet)
