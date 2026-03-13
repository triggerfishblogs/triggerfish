# Agent Exec-miljön

Agent Exec-miljön är Triggerfishs självutvecklingsförmåga — en förstklassig kodarbetsyta där agenten kan skriva kod, köra den, observera utdata och fel, åtgärda problem och iterera tills något fungerar. Det är detta som gör det möjligt för agenten att bygga integrationer, testa idéer och skapa nya verktyg på egen hand.

## Inte Plugin Sandboxen

Exec-miljön är fundamentalt annorlunda från [Plugin Sandboxen](./plugins). Att förstå skillnaden är viktigt:

- **Plugin Sandboxen** skyddar systemet **FRÅN** opålitlig tredjepartskod
- **Exec-miljön** ger agenten möjlighet **ATT** skriva, köra och felsöka sin egen kod

Plugin-sandboxen är defensiv. Exec-miljön är produktiv. De tjänar motsatta syften och har olika säkerhetsprofiler.

| Aspekt               | Plugin Sandbox                       | Agent Exec-miljö                     |
| -------------------- | ------------------------------------ | ------------------------------------ |
| **Syfte**            | Skydda systemet FRÅN opålitlig kod   | Ge agenten möjlighet ATT bygga saker |
| **Filsystem**        | Inget (fullständigt sandboxat)       | Enbart arbetsytakatalog              |
| **Nätverk**          | Enbart deklarerade slutpunkter       | Policystyrda tillåt/neka-listor      |
| **Paketinstallation**| Ej tillåten                          | Tillåten (npm, pip, deno add)        |
| **Körtid**           | Strikt tidsgräns                     | Generös tidsgräns (konfigurerbar)    |
| **Iteration**        | Enkörning                            | Obegränsade skriv/kör/fixa-slingor  |
| **Persistens**       | Tillfällig                           | Arbetsyta kvarstår mellan sessioner  |

## Feedbackslingan

Den centrala kvalitetsskiljaren. Det är samma mönster som gör verktyg som Claude Code effektiva — en tät skriv/kör/fixa-cykel där agenten ser exakt vad en mänsklig utvecklare skulle se.

### Steg 1: Skriv

Agenten skapar eller modifierar filer i sin arbetsyta med `write_file`. Arbetsytan är en verklig filsystemkatalog scoped till den aktuella agenten.

### Steg 2: Kör

Agenten kör koden via `run_command` och tar emot komplett stdout, stderr och exit-kod. Ingen utdata döljs eller sammanfattas. Agenten ser exakt vad du skulle se i en terminal.

### Steg 3: Observera

Agenten läser hela utdatan. Om fel inträffade ser den hela stackspårningen, felmeddelanden och diagnostikutdata. Om tester misslyckades ser den vilka tester som misslyckades och varför.

### Steg 4: Åtgärda

Agenten redigerar koden baserat på vad den observerade och använder `write_file` eller `edit_file` för att uppdatera specifika filer.

### Steg 5: Upprepa

Agenten kör igen. Denna slinga fortsätter tills koden fungerar — passerar tester, producerar korrekt utdata eller uppnår det angivna målet.

### Steg 6: Bevara

När den fungerar kan agenten spara sitt arbete som en [kunskap](./skills) (SKILL.md + stödfiler), registrera det som en integration, koppla det till ett cron-jobb eller göra det tillgängligt som ett verktyg.

::: tip Bevarandesteget är vad som gör exec-miljön till mer än ett kladdblock. Fungerande kod försvinner inte bara — agenten kan paketera det till en återanvändbar kunskap som körs på schema, svarar på triggers eller anropas på begäran. :::

## Tillgängliga verktyg

| Verktyg          | Beskrivning                                           | Utdata                                      |
| ---------------- | ----------------------------------------------------- | ------------------------------------------- |
| `write_file`     | Skriv eller skriv över en fil i arbetsytan            | Filsökväg, skrivna bytes                    |
| `read_file`      | Läs filinnehåll från arbetsytan                       | Filinnehåll som sträng                      |
| `edit_file`      | Tillämpa riktade redigeringar på en fil               | Uppdaterat filinnehåll                      |
| `run_command`    | Kör ett skalkommando i arbetsytan                     | stdout, stderr, exit-kod, varaktighet       |
| `list_directory` | Lista filer i arbetsytan (rekursiv valfri)            | Fillista med storlekar                      |
| `search_files`   | Sök filinnehåll (grep-liknande)                       | Matchande rader med fil:rad-referenser      |

## Arbetsytastruktur

Varje agent får en isolerad arbetsytakatalog som kvarstår mellan sessioner:

```
~/.triggerfish/workspace/
  <agent-id>/                     # Per-agent-arbetsyta
    scratch/                      # Temporära arbetsfiler
    integrations/                 # Integrationskod under utveckling
      notion-sync/
        index.ts
        index_test.ts
        package.json
      salesforce-report/
        main.py
        test_main.py
    skills/                       # Kunskaper under författande
      morning-briefing/
        SKILL.md
        briefing.ts
    .exec_history                 # Körningslogg för granskning
  background/
    <session-id>/                 # Temporär arbetsyta för bakgrundsuppgifter
```

Arbetsytor är isolerade mellan agenter. En agent kan inte komma åt en annan agents arbetsyta. Bakgrundsuppgifter (cron-jobb, triggers) får sin egen temporära arbetsyta scoped till sessionen.

## Integrationsutvecklingsflöde

När du ber agenten bygga en ny integration (till exempel "anslut till min Notion och synkronisera uppgifter") följer agenten ett naturligt utvecklingsarbetsflöde:

1. **Utforska** — Använder `run_command` för att testa API-slutpunkter, kontrollera autentisering, förstå svarsformat
2. **Scaffolda** — Skriver integrationskod med `write_file`, skapar en testfil bredvid
3. **Testa** — Kör tester med `run_command`, ser misslyckanden, itererar
4. **Installera beroenden** — Använder `run_command` för att lägga till nödvändiga paket (npm, pip, deno add)
5. **Iterera** — Skriv, kör, fixa-slinga tills tester passerar och integrationen fungerar end-to-end
6. **Bevara** — Sparar som en kunskap (skriver SKILL.md med metadata) eller kopplar till ett cron-jobb
7. **Godkännande** — Självförfattad kunskap går in i `PENDING_APPROVAL`-tillstånd; du granskar och godkänner

## Språk- och körtidsstöd

Exec-miljön körs på värdsystemet (inte i WASM), med tillgång till flera körtider:

| Körtid  | Tillgänglig via                      | Användningsfall                             |
| ------- | ------------------------------------ | ------------------------------------------- |
| Deno    | Direkt körning                       | TypeScript/JavaScript (förstklassigt)       |
| Node.js | `run_command node`                   | npm-ekosystemstillgång                      |
| Python  | `run_command python`                 | Data science, ML, skriptning                |
| Shell   | `run_command sh` / `run_command bash`| Systemautomation, limskript                 |

Agenten kan identifiera tillgängliga körtider och välja den bästa för uppgiften. Paketinstallation fungerar via den vanliga verktygskedjan för varje körtid.

## Säkerhetsgränser

Exec-miljön är mer tillåtande än plugin-sandboxen, men fortfarande policystyrd vid varje steg.

### Policyintegrering

- Varje `run_command`-anrop utlöser `PRE_TOOL_CALL`-kroken med kommandot som kontext
- Kommandotillåt-/neka-lista kontrolleras före körning
- Utdata fångas och skickas genom `POST_TOOL_RESPONSE`-kroken
- Nätverksslutpunkter som nås under körning spåras via härstamning
- Om koden kommer åt klassificerade data (till exempel läser från ett CRM API) eskalerar sessions-taint
- Körningshistorik loggas i `.exec_history` för granskning

### Hårda gränser

Dessa gränser korsas aldrig, oavsett konfiguration:

- Kan inte skriva utanför arbetsytakatalogen
- Kan inte köra kommandon på nekalistan (`rm -rf /`, `sudo` osv.)
- Kan inte komma åt andra agenters arbetsytor
- Alla nätverksanrop styrs av policykrokar
- All utdata klassificeras och bidrar till sessions-taint
- Resursgränser tillämpas: diskutrymme, CPU-tid per körning, minne

::: warning SÄKERHET Varje kommando agenten kör passerar genom `PRE_TOOL_CALL`-kroken. Policymotorn kontrollerar det mot kommandotillåt-/neka-listan innan körning börjar. Farliga kommandon blockeras deterministiskt — LLM:en kan inte påverka detta beslut. :::

### Företagskontroller

Företagsadministratörer har ytterligare kontroller över exec-miljön:

- **Inaktivera exec helt** för specifika agenter eller roller
- **Begränsa tillgängliga körtider** (till exempel tillåt bara Deno, blockera Python och shell)
- **Ange resursgränser** per agent (diskkvota, CPU-tid, minnesgräns)
- **Kräv godkännande** för alla exec-operationer över en klassificeringströskel
- **Anpassad kommandonekalista** utöver standardlistan för farliga kommandon
