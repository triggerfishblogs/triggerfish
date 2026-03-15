# Hurtigstart

Denne veiledningen tar deg gjennom dine første 5 minutter med Triggerfish — fra å kjøre oppsettveiviseren til å ha en fungerende AI-agent du kan chatte med.

## Kjør oppsettveiviseren

Hvis du brukte énkommandoinstallasjonsprogrammet, kjørte veiviseren allerede under installasjonen. For å kjøre den igjen eller starte på nytt:

```bash
triggerfish dive
```

Veiviseren leder deg gjennom åtte trinn:

### Trinn 1: Velg LLM-leverandør

```
Trinn 1/8: Velg LLM-leverandør
  > Triggerfish Gateway — ingen API-nøkler nødvendig
    Anthropic (Claude)
    OpenAI
    Google (Gemini)
    Lokal (Ollama)
    OpenRouter
```

Velg en leverandør og skriv inn legitimasjonen din. Triggerfish støtter flere leverandører med automatisk failover. **Triggerfish Gateway** er det enkleste alternativet — abonner på en [Pro eller Power-plan](/nb-NO/pricing), og agenten din kobler seg til administrert LLM og søkeinfrastruktur uten API-nøkler å konfigurere.

### Trinn 2: Navngi agenten din

```
Trinn 2/8: Navngi agenten din og angi personlighet
  Agentnavn: Reef
  Oppdrag (én setning): Hjelp meg å holde meg organisert og informert
  Tone: > Profesjonell  Uformell  Konsis  Egendefinert
```

Dette genererer `SPINE.md`-filen din — grunnlaget for agentens systemprompt. Du kan redigere den når som helst i `~/.triggerfish/SPINE.md`.

### Trinn 3: Koble til en kanal

```
Trinn 3/8: Koble til din første kanal
  > CLI (allerede tilgjengelig)
    WebChat
    Telegram (skriv inn bot-token)
    Hopp over for nå
```

Velg en meldingsplattform eller hopp over dette trinnet for å starte med bare CLI. Du kan legge til kanaler senere i `triggerfish.yaml`.

### Trinn 4: Valgfrie plugins

```
Trinn 4/8: Installer valgfrie plugins
  > Obsidian
    Hopp over
```

Koble til valgfrie integrasjoner som Obsidian for notatskriving.

### Trinn 5: Koble til Google Workspace (valgfritt)

Koble Google-kontoen din for Gmail, Kalender, Oppgaver, Drive og Sheets via OAuth2. Du kan hoppe over dette og koble til senere med `triggerfish connect google`.

### Trinn 6: Koble til GitHub (valgfritt)

Koble GitHub ved å lime inn et personlig tilgangstoken. Gir agenten verktøy for repos, PR-er, issues og Actions. Du kan hoppe over dette og koble til senere med `triggerfish connect github`.

### Trinn 7: Sett opp nettsøk

Velg en søkemotor (Brave Search eller selvdriftet SearXNG) som agenten din skal bruke, eller hopp over for nå.

### Trinn 8: Start daemonen

```
Trinn 8/8: Installer som daemon?
  > Ja (start ved pålogging, kjør i bakgrunnen)
    Nei (kun manuell start)
```

Velg Ja for å ha agenten kjørende når maskinen er på.

## Begynn å chatte

Etter at veiviseren er ferdig, kan du begynne å chatte umiddelbart via CLI:

```bash
triggerfish chat
```

Eller, hvis du koblet til en meldingskanal, send agenten din en melding der.

### Eksempelsamtale

```
Du: Hva kan du hjelpe meg med?

Reef: Jeg kan hjelpe deg med en rekke oppgaver. Her er noen ting
jeg er konfigurert for:

  - Svare på spørsmål og ha samtaler
  - Administrere kalenderen og timeplanen din
  - Oppsummere e-poster og meldinger
  - Skrive og redigere dokumenter
  - Kjøre kode i et sandkassemiljø
  - Søke på nettet etter informasjon
  - Automatisere gjentakende oppgaver med cron-jobber

Hva vil du begynne med?

Du: Sett opp en morgenbriefing hver dag klokka 7

Reef: Jeg har opprettet en cron-jobb for morgenbriefinget ditt:

  Tidsplan: Hver dag klokka 7:00
  Oppgave: Forbered briefing med kalenderbegivenheter, uleste e-poster
           og værmeldingen
  Levering: CLI (legg til en kanal i konfig for å få det på Telegram/Slack)

Du vil motta din første briefing i morgen tidlig. Du kan administrere
cron-jobber når som helst med /cron list.
```

## Verifiser oppsettet ditt

Kjør helsesjekken for å forsikre deg om at alt fungerer:

```bash
triggerfish patrol
```

```
Triggerfish helsesjekk

  Gateway kjører (PID 12345, oppetid 2m)
  LLM-leverandør tilkoblet (Anthropic, Claude Sonnet 4.5)
  1 kanal aktiv (CLI)
  Policy-motor lastet (4 regler)
  3 skills installert (3 medfølgende)

Totalt: FRISK
```

## Hva du bør gjøre neste

- **Tilpass agenten din** — rediger `~/.triggerfish/SPINE.md` for å finjustere agentens personlighet og evner. Se [SPINE og Triggers](./spine-and-triggers).
- **Legg til flere kanaler** — koble til Telegram, Slack, Discord eller WhatsApp i `triggerfish.yaml`. Se [Konfigurasjon](./configuration).
- **Koble til integrasjoner** — `triggerfish connect google` for Google Workspace, `triggerfish connect github` for GitHub. Se [Integrasjoner](/nb-NO/integrations/).
- **Sett opp proaktiv atferd** — opprett `~/.triggerfish/TRIGGER.md` for å fortelle agenten din hva den skal overvåke. Se [SPINE og Triggers](./spine-and-triggers).
- **Utforsk kommandoer** — lær alle tilgjengelige CLI- og i-chat-kommandoer. Se [CLI-kommandoer](./commands).
