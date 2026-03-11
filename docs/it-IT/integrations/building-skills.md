# Costruire Skill

Questa guida accompagna nella creazione di una skill Triggerfish da zero --
dalla scrittura del file `SKILL.md` al test e all'approvazione.

## Cosa Si Costruirà

Una skill è una cartella contenente un file `SKILL.md` che insegna all'agent
come fare qualcosa. Al termine di questa guida, si avrà una skill funzionante
che l'agent può scoprire e utilizzare.

## Anatomia di una Skill

Ogni skill è una directory con un `SKILL.md` alla sua radice:

```
my-skill/
  SKILL.md           # Obbligatorio: frontmatter + istruzioni
  template.md        # Opzionale: template a cui la skill fa riferimento
  helper.ts          # Opzionale: codice di supporto
```

Il file `SKILL.md` ha due parti:

1. **Frontmatter YAML** (tra delimitatori `---`) -- metadati sulla skill
2. **Corpo markdown** -- le istruzioni che l'agent legge

## Passo 1: Scrivere il Frontmatter

Il frontmatter dichiara cosa fa la skill, di cosa ha bisogno e quali vincoli
di sicurezza si applicano.

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

### Campi Obbligatori

| Campo         | Descrizione                                                    | Esempio         |
| ------------- | -------------------------------------------------------------- | --------------- |
| `name`        | Identificatore univoco. Minuscolo, trattini per gli spazi.     | `github-triage` |
| `description` | Cosa fa la skill e quando utilizzarla. 1-3 frasi.              | Vedi sopra      |

### Campi Opzionali

| Campo                    | Descrizione                                     | Predefinito |
| ------------------------ | ----------------------------------------------- | ----------- |
| `classification_ceiling` | Livello massimo di sensibilità dei dati          | `PUBLIC`    |
| `requires_tools`         | Tool di cui la skill necessita                   | `[]`        |
| `network_domains`        | Domini esterni a cui la skill accede             | `[]`        |

Campi aggiuntivi come `version`, `category`, `tags` e `triggers` possono essere
inclusi per documentazione e uso futuro. Il loader delle skill ignorerà
silenziosamente i campi che non riconosce.

### Scegliere un Limite di Classificazione

Il limite di classificazione è la sensibilità massima dei dati che la skill
gestirà. Scegliere il livello più basso che funziona:

| Livello        | Quando Utilizzarlo                          | Esempi                                                   |
| -------------- | ------------------------------------------- | -------------------------------------------------------- |
| `PUBLIC`       | Utilizza solo dati pubblicamente disponibili | Ricerca web, documentazione API pubblica, meteo          |
| `INTERNAL`     | Lavora con dati di progetto interni         | Analisi del codice, revisione configurazioni, doc interni |
| `CONFIDENTIAL` | Gestisce dati personali o privati           | Riepilogo email, notifiche GitHub, query CRM              |
| `RESTRICTED`   | Accede a dati altamente sensibili           | Gestione chiavi, audit di sicurezza, conformità           |

::: warning Se il limite della skill supera il limite configurato dell'utente,
l'API di creazione delle skill lo rifiuterà. Utilizzare sempre il livello
minimo necessario. :::

## Passo 2: Scrivere le Istruzioni

Il corpo markdown è ciò che l'agent legge per imparare come eseguire la skill.
Renderlo operativo e specifico.

### Template di Struttura

```markdown
# Nome della Skill

Dichiarazione di scopo in una riga.

## Quando Utilizzare

- Condizione 1 (l'utente chiede X)
- Condizione 2 (attivata da cron)
- Condizione 3 (parola chiave correlata rilevata)

## Passaggi

1. Prima azione con dettagli specifici
2. Seconda azione con dettagli specifici
3. Elaborare e formattare i risultati
4. Consegnare al canale configurato

## Formato dell'Output

Descrivere come devono essere formattati i risultati.

## Errori Comuni

- Non fare X perché Y
- Verificare sempre Z prima di procedere
```

### Buone Pratiche

- **Iniziare con lo scopo**: Una frase che spiega cosa fa la skill
- **Includere "Quando Utilizzare"**: Aiuta l'agent a decidere quando attivare la skill
- **Essere specifici**: "Recuperare le email non lette delle ultime 24 ore" è
  meglio di "Ottenere le email"
- **Usare esempi di codice**: Mostrare chiamate API esatte, formati dati, pattern
  di comando
- **Aggiungere tabelle**: Riferimento rapido per opzioni, endpoint, parametri
- **Includere la gestione degli errori**: Cosa fare quando una chiamata API
  fallisce o i dati mancano
- **Terminare con "Errori Comuni"**: Evita che l'agent ripeta problemi noti

## Passo 3: Testare la Scoperta

Verificare che la skill sia scopribile dal loader delle skill. Se è stata
posizionata nella directory delle skill integrate:

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

Verificare che:

- La skill appaia nella lista delle scoperte
- `name` corrisponda al frontmatter
- `classificationCeiling` sia corretto
- `requiresTools` e `networkDomains` siano popolati

## Auto-Creazione dell'Agent

L'agent può creare skill programmaticamente usando l'API `SkillAuthor`. Questo
è il modo in cui l'agent estende se stesso quando gli viene chiesto di fare
qualcosa di nuovo.

### Il Flusso di Lavoro

```
1. Utente: "Ho bisogno che controlli Notion per nuove attività ogni mattina"
2. Agent:  Usa SkillAuthor per creare una skill nel proprio spazio di lavoro
3. Skill:  Entra nello stato PENDING_APPROVAL
4. Utente: Riceve notifica, revisiona la skill
5. Utente: Approva → la skill diventa attiva
6. Agent:  Collega la skill allo schedule cron mattutino
```

### Utilizzare l'API SkillAuthor

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

## Quando Utilizzare

- Trigger cron mattutino
- L'utente chiede delle attività pendenti

## Passaggi

1. Recuperare le attività dall'API Notion usando il token di integrazione dell'utente
2. Filtrare per attività create o aggiornate nelle ultime 24 ore
3. Categorizzare per priorità (P0, P1, P2)
4. Formattare come riepilogo conciso a punti
5. Consegnare al canale configurato
`,
});

if (result.ok) {
  console.log(`Skill created at: ${result.value.path}`);
  console.log(`Status: ${result.value.status}`); // "PENDING_APPROVAL"
}
```

### Stati di Approvazione

| Stato              | Significato                                         |
| ------------------ | --------------------------------------------------- |
| `PENDING_APPROVAL` | Creata, in attesa della revisione del proprietario   |
| `APPROVED`         | Proprietario ha approvato, la skill è attiva         |
| `REJECTED`         | Proprietario ha rifiutato, la skill è inattiva       |

::: warning SICUREZZA L'agent non può approvare le proprie skill. Questo è
applicato a livello di API. Tutte le skill create dall'agent richiedono la
conferma esplicita del proprietario prima dell'attivazione. :::

## Scansione di Sicurezza

Prima dell'attivazione, le skill passano attraverso uno scanner di sicurezza che
verifica pattern di prompt injection:

- "Ignore all previous instructions" -- prompt injection
- "You are now a..." -- ridefinizione dell'identità
- "Reveal secrets/credentials" -- tentativi di esfiltrazione dati
- "Bypass security/policy" -- elusione della sicurezza
- "Sudo/admin/god mode" -- escalazione dei privilegi

Le skill segnalate dallo scanner includono avvisi che il proprietario deve
revisionare prima dell'approvazione.

## Trigger

Le skill possono definire trigger automatici nel loro frontmatter:

```yaml
triggers:
  - cron: "0 7 * * *" # Ogni giorno alle 7:00
  - cron: "*/30 * * * *" # Ogni 30 minuti
```

Lo scheduler legge queste definizioni e risveglia l'agent agli orari specificati
per eseguire la skill. È possibile combinare i trigger con le ore di silenzio in
`triggerfish.yaml` per prevenire l'esecuzione durante determinati periodi.

## Esempio Completo

Ecco una skill completa per il triage delle notifiche GitHub:

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

Revisionare e categorizzare notifiche, issue e pull request GitHub.

## Quando Utilizzare

- L'utente chiede "cosa succede su GitHub?"
- Trigger cron ogni ora
- L'utente chiede dell'attività su un repository specifico

## Passaggi

1. Recuperare le notifiche dall'API GitHub usando il token dell'utente
2. Categorizzare: PR da revisionare, nuove issue, menzioni, fallimenti CI
3. Prioritizzare per etichetta: bug > security > feature > question
4. Riassumere gli elementi principali con link diretti
5. Segnalare tutto ciò che è assegnato all'utente

## Formato dell'Output

### PR da Revisionare
- [#123 Fix auth flow](link) — assegnata a te, 2 giorni fa

### Nuove Issue (Ultima Ora)
- [#456 Login broken on mobile](link) — bug, alta priorità

### Menzioni
- @tu menzionato nella discussione #789

## Errori Comuni

- Non recuperare tutte le notifiche — filtrare con il parametro `since` per l'ultima ora
- Verificare sempre i limiti di frequenza prima di effettuare chiamate API multiple
- Includere link diretti a ogni elemento per azione rapida
```

## Checklist delle Skill

Prima di considerare una skill completa:

- [ ] Il nome della cartella corrisponde al `name` nel frontmatter
- [ ] La descrizione spiega **cosa** e **quando** utilizzare
- [ ] Il limite di classificazione è il livello più basso che funziona
- [ ] Tutti i tool richiesti sono elencati in `requires_tools`
- [ ] Tutti i domini esterni sono elencati in `network_domains`
- [ ] Le istruzioni sono concrete e passo-passo
- [ ] Gli esempi di codice usano pattern Triggerfish (tipi Result, funzioni factory)
- [ ] Il formato dell'output è specificato
- [ ] La sezione errori comuni è inclusa
- [ ] La skill è scopribile dal loader (testato)
