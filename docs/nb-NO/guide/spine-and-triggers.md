# SPINE og Triggers

Triggerfish bruker to markdown-filer til å definere agentens atferd: **SPINE.md** kontrollerer hvem agenten er, og **TRIGGER.md** kontrollerer hva agenten gjør proaktivt. Begge er friformat markdown — du skriver dem på vanlig norsk eller engelsk.

## SPINE.md — Agent-identitet

`SPINE.md` er grunnlaget for agentens systemprompt. Den definerer agentens navn, personlighet, oppdrag, kunnskapsområder og grenser. Triggerfish laster denne filen hver gang den behandler en melding, slik at endringer trer i kraft umiddelbart.

### Filplassering

```
~/.triggerfish/SPINE.md
```

For oppsett med flere agenter har hver agent sin egen SPINE.md:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### Kom i gang

Oppsettveiviseren (`triggerfish dive`) genererer en start-SPINE.md basert på svarene dine. Du kan redigere den fritt når som helst — det er bare markdown.

### Skrive en effektiv SPINE.md

En god SPINE.md er spesifikk. Jo mer konkret du er om agentens rolle, desto bedre presterer den. Her er en anbefalt struktur:

```markdown
# Identitet

Du er Reef, en personlig AI-assistent for Kari.

# Oppdrag

Hjelp Kari å holde seg organisert, informert og produktiv. Prioriter
kalenderadministrasjon, e-posttriagering og oppgavesporing.

# Kommunikasjonsstil

- Vær konsis og direkte. Ingen fyllord.
- Bruk punktlister for lister med 3+ elementer.
- Når du er usikker, si det heller enn å gjette.
- Tilpass formaliteten til kanalen: uformell på WhatsApp, profesjonell på Slack.

# Domenekunnskap

- Kari er produktsjef hos Norsk Tech AS.
- Nøkkelverktøy: Linear for oppgaver, Google Kalender, Gmail, Slack.
- VIP-kontakter: @sjef (Erik Hansen), @skip (Anne Larsen).
- Nåværende prioriteringer: Q2-veikart, mobilapplanseringen.

# Grenser

- Send aldri meldinger til eksterne kontakter uten eksplisitt godkjenning.
- Gjennomfør aldri finansielle transaksjoner.
- Bekreft alltid før du sletter eller endrer kalenderbegivenheter.
- Når du diskuterer arbeidstemaer på personlige kanaler, minn Kari på
  klassifiseringsgrenser.

# Svarbetalinger

- Standard til korte svar (2-3 setninger).
- Bruk lengre svar kun når spørsmålet krever det.
- For kode, inkluder korte kommentarer som forklarer viktige beslutninger.
```

### Beste praksis

::: tip **Vær spesifikk om personlighet.** I stedet for "vær hjelpsom", skriv "vær konsis, direkte og bruk punktlister for klarhet." :::

::: tip **Inkluder kontekst om eieren.** Agenten presterer bedre når den kjenner rollen, verktøyene og prioriteringene dine. :::

::: tip **Angi eksplisitte grenser.** Definer hva agenten aldri skal gjøre. Dette supplerer (men erstatter ikke) policy-motorens deterministiske håndhevelse. :::

::: warning SPINE.md-instruksjoner veileder LLM-ens atferd, men er ikke sikkerhetskontroller. For håndhevbare begrensninger, bruk policy-motoren i `triggerfish.yaml`. Policy-motoren er deterministisk og kan ikke omgås — SPINE.md-instruksjoner kan det. :::

## TRIGGER.md — Proaktiv atferd

`TRIGGER.md` definerer hva agenten din skal sjekke, overvåke og handle på under periodiske oppvåkninger. I motsetning til cron-jobber (som utfører faste oppgaver etter en tidsplan), gir triggers agenten skjønn til å vurdere betingelser og avgjøre om handling er nødvendig.

### Filplassering

```
~/.triggerfish/TRIGGER.md
```

For oppsett med flere agenter:

```
~/.triggerfish/workspace/<agent-id>/TRIGGER.md
```

### Slik fungerer triggers

1. Trigger-sløyfen vekker agenten med et konfigurert intervall (angitt i `triggerfish.yaml`)
2. Triggerfish laster TRIGGER.md og presenterer den for agenten
3. Agenten evaluerer hvert element og handler ved behov
4. Alle trigger-handlinger går gjennom de vanlige policy-hooks
5. Trigger-sesjonen kjører med et klassifiseringstak (også konfigurert i YAML)
6. Stille timer respekteres — ingen triggers utløses i disse timene

### Trigger-konfigurasjon i YAML

Angi timing og begrensninger i `triggerfish.yaml`:

```yaml
trigger:
  interval: 30m # Sjekk hvert 30. minutt
  classification: INTERNAL # Maks taint-tak for trigger-sesjoner
  quiet_hours: "22:00-07:00" # Ingen oppvåkninger i disse timene
```

### Skrive TRIGGER.md

Organiser triggerne dine etter prioritet. Vær spesifikk om hva som teller som handlingsdyktig og hva agenten skal gjøre med det.

```markdown
# Prioriteringssjekker

- Uleste meldinger på tvers av alle kanaler eldre enn 1 time — oppsummer og varsle
  på primærkanal.
- Kalenderkonflikter de neste 24 timene — flagg og foreslå løsning.
- Forfalte oppgaver i Linear — list dem opp med antall dager forsinkelse.

# Overvåking

- GitHub: PR-er som venter på gjennomgang — varsle hvis eldre enn 4 timer.
- E-post: alt fra VIP-kontakter (Erik Hansen, Anne Larsen) — flagg for
  umiddelbart varsel uavhengig av stille timer.
- Slack: nevnelser i #hendelser-kanalen — oppsummer og eskaler hvis uløst.

# Proaktiv

- Hvis morgen (7-9), forbered daglig briefing med kalender, vær og topp 3 prioriteringer.
- Hvis fredag ettermiddag, lag ukentlig oppsummering av fullførte oppgaver og åpne punkter.
- Hvis innbokstall overstiger 50 uleste, tilby batch-triagering.
```

### Eksempel: Minimal TRIGGER.md

Hvis du ønsker et enkelt utgangspunkt:

```markdown
# Sjekk ved hver oppvåkning

- Uleste meldinger eldre enn 1 time
- Kalenderbegivenheter de neste 4 timene
- Noe haster i e-post
```

### Eksempel: Utviklerfokusert TRIGGER.md

```markdown
# Høy prioritet

- CI-feil på main-grenen — undersøk og varsle.
- PR-er som venter på gjennomgang eldre enn 2 timer.
- Sentry-feil med "critical" alvorlighetsgrad den siste timen.

# Overvåking

- Dependabot PR-er — godkjenn patch-oppdateringer automatisk, flagg minor/major.
- Byggetider som stiger over 10 minutter — rapport ukentlig.
- Åpne issues tildelt meg uten oppdateringer i 3 dager.

# Daglig

- Morgen: oppsummer nattens CI-kjøringer og distribusjonsstatus.
- Slutt på dagen: list PR-er jeg åpnet som fortsatt venter på gjennomgang.
```

### Triggers og policy-motoren

Alle trigger-handlinger er underlagt den samme policy-håndhevelsen som interaktive samtaler:

- Hver trigger-oppvåkning spawner en isolert sesjon med sin egen taint-sporing
- Klassifiseringstaket i YAML-konfigen begrenser hvilke data triggeren kan få tilgang til
- No-write-down-regelen gjelder — hvis en trigger får tilgang til konfidensielle data, kan den ikke sende resultater til en offentlig kanal
- Alle trigger-handlinger logges i revisjonsloggen

::: info Hvis TRIGGER.md mangler, skjer trigger-oppvåkninger fortsatt med det konfigurerte intervallet. Agenten bruker sin generelle kunnskap og SPINE.md til å avgjøre hva som trenger oppmerksomhet. For beste resultater, skriv en TRIGGER.md. :::

## SPINE.md vs TRIGGER.md

| Aspekt     | SPINE.md                           | TRIGGER.md                       |
| ---------- | ---------------------------------- | -------------------------------- |
| Formål     | Definer hvem agenten er            | Definer hva agenten overvåker    |
| Lastes     | Hver melding                       | Hver trigger-oppvåkning          |
| Omfang     | Alle samtaler                      | Kun trigger-sesjoner             |
| Påvirker   | Personlighet, kunnskap, grenser    | Proaktive sjekker og handlinger  |
| Påkrevd    | Ja (generert av dive-veiviseren)   | Nei (men anbefalt)               |

## Neste steg

- Konfigurer trigger-timing og cron-jobber i [triggerfish.yaml](./configuration)
- Lær om alle tilgjengelige CLI-kommandoer i [Kommandreferanse](./commands)
