# Funktionsöversikt

Utöver sin [säkerhetsmodell](/sv-SE/security/) och [kanalstöd](/sv-SE/channels/) tillhandahåller Triggerfish funktioner som utökar din AI-agent bortom frågor och svar: schemalagda uppgifter, beständigt minne, webbåtkomst, röstinmatning och multi-modell-felöver.

## Proaktivt beteende

### [Cron och Triggers](./cron-and-triggers)

Schemalägg återkommande uppgifter med standard cron-uttryck och definiera proaktivt övervakningsbeteende via `TRIGGER.md`. Din agent kan leverera morgonöversikter, kontrollera pipelines, övervaka olästa meddelanden och agera autonomt enligt ett konfigurerbart schema — allt med klassificeringstillämpning och isolerade sessioner.

### [Notifieringar](./notifications)

En notifieringsleveranstjänst som dirigerar meddelanden över alla anslutna kanaler med prioritetsnivåer, offlinekö och deduplicering. Ersätter ad hoc-notifieringsmönster med en enhetlig abstraktion.

## Agentverktyg

### [Webbasksökning och hämtning](./web-search)

Sök på webben och hämta sidinnehåll. Agenten använder `web_search` för att hitta information och `web_fetch` för att läsa webbsidor, med SSRF-skydd och policytillämpning på alla utgående förfrågningar.

### [Beständigt minne](./memory)

Korsessionellt minne med klassificeringsgating. Agenten sparar och återkallar fakta, preferenser och kontext över konversationer. Minnets klassificering tvingas till sessions-taint — LLM:en kan inte välja nivå.

### [Bildanalys och vision](./image-vision)

Klistra in bilder från ditt urklipp (Ctrl+V i CLI, webbläsarklistring i Tidepool) och analysera bildfiler på disk. Konfigurera en separat visionsmodell för att automatiskt beskriva bilder när primärmodellen inte stöder vision.

### [Kodbasutforskning](./explore)

Strukturerad kodbasförståelse via parallella underagenter. Verktyget `explore` kartlägger katalogträd, identifierar kodmönster, spårar importer och analyserar git-historik — allt parallellt.

### [Sessionshantering](./sessions)

Inspektera, kommunicera med och skapa sessioner. Agenten kan delegera bakgrundsuppgifter, skicka korsessionsmeddelanden och nå ut över kanaler — allt under nedskrivningstillämpning.

### [Plansläge och uppgiftsspårning](./planning)

Strukturerad planering före implementering (plansläge) och beständig uppgiftsspårning (uppgifter) över sessioner. Plansläget begränsar agenten till skrivskyddad utforskning tills användaren godkänner planen.

### [Filsystem och Shell](./filesystem)

Läs, skriv, sök och kör kommandon. Grundläggande verktyg för filoperationer med arbetsyteomfång och kommandosvartlisttillämpning.

### [Underagenter och LLM-uppgifter](./subagents)

Delegera arbete till autonoma underagenter eller kör isolerade LLM-promptar för sammanfattning, klassificering och fokuserat resonerande utan att förorenar huvudkonversationen.

### [Agentteam](./agent-teams)

Skapa beständiga team av samarbetande agenter med specialiserade roller. En ledare koordinerar medlemmar som kommunicerar autonomt via korsessionsmeddelanden. Inkluderar livscykelövervakning med inaktivitetstimeouts, livstidsgränser och hälsokontroller. Bäst för komplexa uppgifter som drar nytta av flera perspektiv som itererar på varandras arbete.

## Rika interaktioner

### [Röstpipeline](./voice)

Fullständigt talstöd med konfigurerbara STT- och TTS-leverantörer. Använd Whisper för lokal transkription, Deepgram eller OpenAI för moln-STT och ElevenLabs eller OpenAI för text-till-tal. Röstinmatning passerar genom samma klassificerings- och policytillämpning som text.

### [Tide Pool / A2UI](./tidepool)

En agentstyrd visuell arbetsyta där Triggerfish renderar interaktivt innehåll — instrumentpaneler, diagram, formulär och kodförhandsgranskningar. A2UI-protokollet (Agent-to-UI) skickar realtidsuppdateringar från agenten till anslutna klienter.

## Multi-agent och multi-modell

### [Multi-agentdirigering](./multi-agent)

Dirigera olika kanaler, konton eller kontakter till separata isolerade agenter, var och en med sin egen SPINE.md, arbetsyta, kunskaper och klassificeringstak. Din jobb-Slack går till en agent; din personliga WhatsApp går till en annan.

### [LLM-leverantörer och felöver](./model-failover)

Anslut till Anthropic, OpenAI, Google, lokala modeller (Ollama) eller OpenRouter. Konfigurera felöverkedjor så att din agent automatiskt faller tillbaka till en alternativ leverantör när en är otillgänglig. Varje agent kan använda en annan modell.

### [Hastighetsbegränsning](./rate-limiting)

Glidande fönster-hastighetsbegränsare som förhindrar att LLM-leverantörers API-gränser nås. Spårar tokens-per-minut och förfrågningar-per-minut, fördröjer anrop när kapaciteten är uttömd och integreras med felöverkedjan.

## Drift

### [Strukturerad loggning](./logging)

Enhetlig strukturerad loggning med allvarlighetsnivåer, filrotation och dual utdata till stderr och fil. Komponentmärkta loggrader, automatisk 1 MB-rotation och ett `log_read`-verktyg för åtkomst till logghistorik.

::: info Alla funktioner integreras med kärnssäkerhetsmodellen. Cron-jobb respekterar klassificeringstak. Röstinmatning bär taint. Tide Pool-innehåll passerar genom PRE_OUTPUT-kroken. Multi-agentdirigering tillämpar sessionsisolering. Ingen funktion kringgår policynivån. :::
