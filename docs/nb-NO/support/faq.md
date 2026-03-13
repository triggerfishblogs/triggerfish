# Ofte stilte spørsmål

## Installasjon

### Hva er systemkravene?

Triggerfish kjøres på macOS (Intel og Apple Silicon), Linux (x64 og arm64) og
Windows (x64). Binærinstallasjonsprogrammet håndterer alt. Hvis du bygger fra
kildekoden, trenger du Deno 2.x.

For Docker-distribusjon fungerer alle systemer som kjøres Docker eller Podman.
Containerbildet er basert på distroless Debian 12.

### Hvor lagrer Triggerfish dataene sine?

Alt befinner seg under `~/.triggerfish/` som standard:

```
~/.triggerfish/
  triggerfish.yaml          # Konfigurasjon
  SPINE.md                  # Agentidentitet
  TRIGGER.md                # Proaktiv atferdsdefinsjon
  logs/                     # Loggfiler (rotert ved 1 MB, 10 sikkerhetskopier)
  data/triggerfish.db       # SQLite-database (sesjoner, minne, tilstand)
  skills/                   # Installerte ferdigheter
  backups/                  # Tidsstemplede konfigurasjonssikkerhetskopier
```

Docker-distribusjoner bruker `/data` i stedet. Du kan overstyre basisataloggen
med `TRIGGERFISH_DATA_DIR`-miljøvariabelen.

### Kan jeg flytte datakatalogen?

Ja. Sett `TRIGGERFISH_DATA_DIR`-miljøvariabelen til ønsket sti før daemon
startes. Hvis du bruker systemd eller launchd, må du oppdatere tjenestdefinisjonen
(se [Plattformmerknader](/nb-NO/support/guides/platform-notes)).

### Installatøren sier den ikke kan skrive til `/usr/local/bin`

Installatøren prøver `/usr/local/bin` først. Hvis det krever root-tilgang,
faller den tilbake til `~/.local/bin`. Hvis du vil ha den systembredte
plasseringen, kjør på nytt med `sudo`:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Hvordan avinstallerer jeg Triggerfish?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

Dette stopper daemon, fjerner tjenestedefinisjonen (systemd-enhet eller launchd-plist),
sletter binærfilen og fjerner hele `~/.triggerfish/`-katalogen inkludert alle data.

---

## Konfigurasjon

### Hvordan endrer jeg LLM-leverandøren?

Rediger `triggerfish.yaml` eller bruk CLI:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

Daemon restarter automatisk etter konfigurasjonsendringer.

### Hvor går API-nøklene?

API-nøkler lagres i OS-nøkkelringen (macOS Keychain, Linux Secret Service eller
en kryptert fil på Windows/Docker). Sett aldri rå API-nøkler i `triggerfish.yaml`.
Bruk `secret:`-referansesyntaksen:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

Lagre den faktiske nøkkelen:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Hva betyr `secret:` i konfigurasjonen min?

Verdier prefikset med `secret:` er referanser til OS-nøkkelringen. Ved oppstart
løser Triggerfish hver referanse og erstatter den med den faktiske hemmelige
verdien i minnet. Den rå hemmeligheten vises aldri i `triggerfish.yaml` på disk.
Se [Hemmeligheter og legitimasjon](/nb-NO/support/troubleshooting/secrets) for
leverandørdetaljer per plattform.

### Hva er SPINE.md?

`SPINE.md` er agentens identitetsfil. Den definerer agentens navn, oppdrag,
personlighet og atferdsretningslinjer. Tenk på det som system-prompt-fundamentet.
Oppsettsveiviseren (`triggerfish dive`) genererer en for deg, men du kan redigere
den fritt.

### Hva er TRIGGER.md?

`TRIGGER.md` definerer agentens proaktive atferd: hva den skal sjekke, overvåke
og handle på under planlagte trigger-oppvåkninger. Uten en `TRIGGER.md` vil
triggers fortsatt utløses, men agenten vil ikke ha instruksjoner om hva den skal gjøre.

### Hvordan legger jeg til en ny kanal?

```bash
triggerfish config add-channel telegram
```

Dette starter en interaktiv prompt som leder deg gjennom de nødvendige feltene
(bot-token, eier-ID, klassifiseringsnivå). Du kan også redigere `triggerfish.yaml`
direkte under `channels:`-seksjonen.

### Jeg endret konfigurasjonen, men ingenting skjedde

Daemon må starte på nytt for å plukke opp endringer. Hvis du brukte
`triggerfish config set`, tilbyr den automatisk omstart. Hvis du redigerte
YAML-filen for hånd, start på nytt med:

```bash
triggerfish stop && triggerfish start
```

---

## Kanaler

### Hvorfor reagerer ikke boten min på meldinger?

Start med å sjekke:

1. **Kjøres daemon?** Kjør `triggerfish status`
2. **Er kanalen tilkoblet?** Sjekk loggene: `triggerfish logs`
3. **Er bot-tokenet gyldig?** De fleste kanaler feiler stille med ugyldige tokens
4. **Er eier-ID-en riktig?** Hvis du ikke gjenkjennes som eier, kan boten begrense svar

Se [Kanal-feilsøking](/nb-NO/support/troubleshooting/channels) for kanalspesifikke
sjekklister.

### Hva er eier-ID-en og hvorfor er den viktig?

Eier-ID-en forteller Triggerfish hvilken bruker på en gitt kanal som er deg
(operatøren). Ikke-eier-brukere får begrenset verktøytilgang og kan være underlagt
klassifiseringsgrenser. Hvis du lar eier-ID-en stå tom, varierer atferden etter
kanal. Noen kanaler (som WhatsApp) vil behandle alle som eier, noe som er en
sikkerhetsrisiko.

### Kan jeg bruke flere kanaler samtidig?

Ja. Konfigurer så mange kanaler du vil i `triggerfish.yaml`. Hver kanal vedlikeholder
sine egne sesjoner og klassifiseringsnivå. Ruteren håndterer meldingslevering på
tvers av alle tilkoblede kanaler.

### Hva er meldingsstørrelsesgrensene?

| Kanal    | Grense              | Atferd                            |
|----------|---------------------|-----------------------------------|
| Telegram | 4 096 tegn          | Deles automatisk opp              |
| Discord  | 2 000 tegn          | Deles automatisk opp              |
| Slack    | 40 000 tegn         | Avkortes (ikke delt opp)          |
| WhatsApp | 4 096 tegn          | Avkortes                          |
| Email    | Ingen hard grense   | Full melding sendt                |
| WebChat  | Ingen hard grense   | Full melding sendt                |

### Hvorfor avkortes Slack-meldinger?

Slack har en grense på 40 000 tegn. I motsetning til Telegram og Discord avkorter
Triggerfish Slack-meldinger i stedet for å dele dem i flere meldinger. Svært
lange svar (som store kodeoutput) kan miste innhold på slutten.

---

## Sikkerhet og klassifisering

### Hva er klassifiseringsnivåene?

Fire nivåer, fra minst til mest sensitiv:

1. **PUBLIC** - Ingen begrensninger på dataflyt
2. **INTERNAL** - Standard driftsdata
3. **CONFIDENTIAL** - Sensitiv data (legitimasjon, personlig informasjon, finansielle poster)
4. **RESTRICTED** - Høyeste sensitivitet (regulert data, compliance-kritisk)

Data kan bare flyte fra lavere nivåer til like eller høyere nivåer. CONFIDENTIAL-data
kan aldri nå en PUBLIC-kanal. Dette er no-write-down-regelen og kan ikke overstyres.

### Hva betyr «session taint»?

Alle sesjoner starter på PUBLIC. Når agenten aksesserer klassifisert data (leser
en CONFIDENTIAL-fil, spør en RESTRICTED-database), eskalerer session taint til
å matche. Taint går bare opp, aldri ned. En sesjon taintet til CONFIDENTIAL kan
ikke sende utdataene sine til en PUBLIC-kanal.

### Hvorfor får jeg «write-down blocked»-feil?

Sesjonen din er taintet til et klassifiseringsnivå høyere enn destinasjonen.
For eksempel, hvis du aksesserte CONFIDENTIAL-data og deretter prøvde å sende
resultater til en PUBLIC WebChat-kanal, blokkerer policy-motoren det.

Dette fungerer som tiltenkt. For å løse det, enten:
- Start en ny sesjon (ny samtale)
- Bruk en kanal klassifisert på eller over sesjonens taint-nivå

### Kan jeg deaktivere klassifiseringshåndhevelse?

Nei. Klassifiseringssystemet er en kjerne sikkerhets invariant. Det kjøres som
deterministisk kode under LLM-laget og kan ikke omgås, deaktiveres eller
påvirkes av agenten. Dette er av design.

---

## LLM-leverandører

### Hvilke leverandører støttes?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI og lokale
modeller via Ollama eller LM Studio.

### Hvordan fungerer failover?

Konfigurer en `failover`-liste i `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Hvis primærleverandøren feiler, prøver Triggerfish hver reserve i rekkefølge.
`failover_config`-seksjonen kontrollerer antall forsøk, forsinkelse og hvilke
feilbetingelser som utløser failover.

### Leverandøren returnerer 401 / 403-feil

API-nøkkelen din er ugyldig eller utløpt. Lagre den på nytt:

```bash
triggerfish config set-secret provider:<navn>:apiKey <din-nøkkel>
```

Deretter start daemon på nytt. Se [LLM-leverandør feilsøking](/nb-NO/support/troubleshooting/providers)
for leverandørspesifikk veiledning.

### Kan jeg bruke forskjellige modeller for forskjellige klassifiseringsnivåer?

Ja. Bruk `classification_models`-konfigurasjonen:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

Sesjoner taintet til et spesifikt nivå vil bruke den tilsvarende modellen. Nivåer
uten eksplisitte overstyrninger faller tilbake til primærmodellen.

---

## Docker

### Hvordan kjøres Triggerfish i Docker?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

Dette laster ned Docker-innpakningsskriptet og compose-filen, henter bildet og
kjører oppsettsveiviseren.

### Hvor lagres data i Docker?

All vedvarende data befinner seg i et Docker-navngitt volum (`triggerfish-data`)
montert på `/data` inne i containeren. Dette inkluderer konfigurasjon, hemmeligheter,
SQLite-databasen, logger, ferdigheter og agent-arbeidsområder.

### Hvordan fungerer hemmeligheter i Docker?

Docker-containere kan ikke aksessere vertens OS-nøkkelring. Triggerfish bruker
i stedet en kryptert fillagring: `secrets.json` (krypterte verdier) og `secrets.key`
(AES-256-krypteringsnøkkel), begge lagret i `/data`-volumet. Behandle volumet
som sensitivt.

### Containeren kan ikke finne konfigurasjonsfilen min

Sørg for at du monterte den riktig:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Hvis containeren starter uten en konfigurasjonsfil, vil den skrive ut en
hjelpmelding og avslutte.

### Hvordan oppdaterer jeg Docker-bildet?

```bash
triggerfish update    # Hvis du bruker innpakningsskriptet
# eller
docker compose pull && docker compose up -d
```

---

## Ferdigheter og The Reef

### Hva er en ferdighet?

En ferdighet er en mappe som inneholder en `SKILL.md`-fil som gir agenten nye
funksjoner, kontekst eller atferdsretningslinjer. Ferdigheter kan inkludere
verktøydefinisjoner, kode, maler og instruksjoner.

### Hva er The Reef?

The Reef er Triggerfishs ferdighetmarkedsplass. Du kan oppdage, installere og
publisere ferdigheter gjennom den:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### Hvorfor ble ferdigheten min blokkert av sikkerhetsscanneren?

Alle ferdigheter skannes før installasjon. Scanneren sjekker etter mistenkelige
mønstre, overdrevne tillatelser og klassifiseringstak-brudd. Hvis ferdighetens
tak er under din gjeldende session taint, blokkeres aktivering for å forhindre
no-write-down-brudd.

### Hva er et klassifiseringstak på en ferdighet?

Ferdigheter erklærer et maksimalt klassifiseringsnivå de har lov til å operere på.
En ferdighet med `classification_ceiling: INTERNAL` kan ikke aktiveres i en
sesjon taintet til CONFIDENTIAL eller over. Dette forhindrer ferdigheter fra å
aksessere data over godkjenningsnivået sitt.

---

## Triggers og planlegging

### Hva er triggers?

Triggers er periodiske agent-oppvåkninger for proaktiv atferd. Du definerer hva
agenten skal sjekke i `TRIGGER.md`, og Triggerfish vekker den etter en plan.
Agenten gjennomgår instruksjonene, utfører handlinger (sjekker en kalender,
overvåker en tjeneste, sender en påminnelse) og går tilbake til dvale.

### Hvordan er triggers forskjellige fra cron-jobber?

Cron-jobber kjører en fast oppgave etter en plan. Triggers vekker agenten med
full kontekst (minne, verktøy, kanaltilgang) og lar den bestemme hva den skal
gjøre basert på `TRIGGER.md`-instruksjoner. Cron er mekanisk; triggers er agentiske.

### Hva er stille-timer?

`quiet_hours`-innstillingen i `scheduler.trigger` forhindrer triggers fra å
utløses i angitte timer:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Hvordan fungerer webhooks?

Eksterne tjenester kan POST til Triggerfishs webhook-endepunkt for å utløse
agenthandlinger. Hver webhook-kilde krever HMAC-signering for autentisering og
inkluderer svardeteksjon.

---

## Agentteam

### Hva er agentteam?

Agentteam er vedvarende grupper av samarbeidende agenter som arbeider sammen om
komplekse oppgaver. Hvert teammedlem er en separat agentsesjon med sin egen rolle,
samtalekontekst og verktøy. Én member utpekes som leder og koordinerer arbeidet.
Se [Agentteam](/nb-NO/features/agent-teams) for fullstendig dokumentasjon.

### Hvordan er team forskjellige fra sub-agenter?

Sub-agenter er brann-og-glem: du delegerer en enkelt oppgave og venter på
resultatet. Team er vedvarende — membere kommuniserer med hverandre via
`sessions_send`, lederen koordinerer arbeidet, og teamet kjøres autonomt inntil
det oppløses eller timer ut. Bruk sub-agenter for fokusert delegering; bruk team
for komplekst flerrollesamarbeid.

### Krever agentteam en betalt plan?

Agentteam krever **Power**-planen ($149/måned) når Triggerfish Gateway brukes.
Åpen kildekode-brukere som kjøres egne API-nøkler har full tilgang — hvert
teammedlem forbruker inferens fra den konfigurerte LLM-leverandøren din.

### Hvorfor feilet teamlederen min umiddelbart?

Den vanligste årsaken er en feilkonfigurert LLM-leverandør. Hvert teammedlem
spawner sin egen agentsesjon som trenger en fungerende LLM-tilkobling. Sjekk
`triggerfish logs` for leverandørfeil rundt tidspunktet for teamopprettelse. Se
[Agentteam feilsøking](/nb-NO/support/troubleshooting/security#agent-teams) for
flere detaljer.

### Kan teammedlemmer bruke forskjellige modeller?

Ja. Hver memberdefinsjon aksepterer et valgfritt `model`-felt. Hvis utelatt,
arver memberet den opprettende agentens modell. Dette lar deg tildele dyre modeller
til komplekse roller og billigere modeller til enkle.

### Hvor lenge kan et team kjøres?

Som standard har team en 1-times levetid (`max_lifetime_seconds: 3600`). Når
grensen nås, får lederen en 60-sekunders advarsel for å produsere endelig utdata,
deretter oppløses teamet automatisk. Du kan konfigurere en lengre levetid ved
opprettelsestidspunktet.

### Hva skjer hvis et teammedlem krasjer?

Livssyklusmonitoren oppdager memberfeil innen 30 sekunder. Feilede membere merkes
som `failed` og lederen varsles om å fortsette med gjenværende membere eller
oppløse. Hvis lederen selv feiler, settes teamet på pause og den opprettende
sesjonen varsles.

---

## Diverse

### Er Triggerfish åpen kildekode?

Ja, Apache 2.0-lisensiert. Full kildekode, inkludert alle sikkerhetskritiske
komponenter, er tilgjengelig for revisjon på [GitHub](https://github.com/greghavens/triggerfish).

### Sender Triggerfish hjem?

Nei. Triggerfish gjør ingen utgående tilkoblinger bortsett fra til tjenestene
du eksplisitt konfigurerer (LLM-leverandører, kanal-API-er, integrasjoner). Det
er ingen telemetri, analyse eller oppdateringssjekking med mindre du kjøres
`triggerfish update`.

### Kan jeg kjøres flere agenter?

Ja. `agents`-konfigseksjonen definerer flere agenter, hver med sine egne navn,
modell, kanaltilknytninger, verktøysett og klassifiseringstak. Rutingssystemet
dirigerer meldinger til den aktuelle agenten.

### Hva er gateway-en?

Gateway-en er Triggerfishs interne WebSocket-kontrollplan. Den administrerer
sesjoner, ruter meldinger mellom kanaler og agenten, dispatcher verktøy og
håndhever policy. CLI-chat-grensesnittet kobler til gateway-en for å kommunisere
med agenten din.

### Hvilke porter bruker Triggerfish?

| Port  | Formål                  | Binding       |
|-------|-------------------------|---------------|
| 18789 | Gateway WebSocket       | Bare localhost |
| 18790 | Tidepool A2UI           | Bare localhost |
| 8765  | WebChat (hvis aktivert) | Konfigurerbar |
| 8443  | WhatsApp webhook (hvis aktivert) | Konfigurerbar |

Alle standardporter binder til localhost. Ingen eksponeres til nettverket med
mindre du eksplisitt konfigurerer det eller bruker en omvendt proxy.
