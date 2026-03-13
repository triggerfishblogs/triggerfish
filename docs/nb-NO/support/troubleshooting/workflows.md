---
title: Arbeidsflyt feilsøking
description: Vanlige problemer og løsninger ved arbeid med Triggerfish-arbeidsflyter.
---

# Feilsøking: Arbeidsflyter

## «Workflow not found or not accessible»

Arbeidsflyten eksisterer, men er lagret på et høyere klassifiseringsnivå enn din
gjeldende sesjons Taint.

Arbeidsflyter lagret under en `CONFIDENTIAL`-sesjon er usynlige for `PUBLIC`-
eller `INTERNAL`-sesjoner. Lageret bruker `canFlowTo`-sjekker ved hver lasting
og returnerer `null` (vist som «not found») når arbeidsflytens klassifisering
overskrider sesjons-Tainen.

**Løsning:** Eskalere sesjons-Tainen ved å få tilgang til klassifiserte data
først, eller lagre arbeidsflyten på nytt fra en lavere klassifisert sesjon hvis
innholdet tillater det.

**Verifiser:** Kjør `workflow_list` for å se hvilke arbeidsflyter som er synlige
på ditt gjeldende klassifiseringsnivå. Hvis arbeidsflyten du forventer mangler,
ble den lagret på et høyere nivå.

---

## «Workflow classification ceiling breached»

Sesjonens Taint-nivå overskrider arbeidsflytens `classification_ceiling`. Denne
sjekken kjøres før hver oppgave, så den kan utløses midt i kjøring hvis en
tidligere oppgave eskalerte sesjons-Tainen.

For eksempel vil en arbeidsflyt med `classification_ceiling: INTERNAL` stoppe hvis
et `triggerfish:memory`-kall henter `CONFIDENTIAL`-data som eskalerer sesjons-Tainen.

**Løsning:**

- Hev arbeidsflytens `classification_ceiling` for å matche den forventede
  datasensitiviteten.
- Eller omstrukturere arbeidsflyten slik at klassifiserte data ikke nås. Bruk
  inngangsparametere i stedet for å lese klassifisert minne.

---

## YAML-parserfeil

### «YAML parse error: ...»

Vanlige YAML-syntaksfeil:

**Innrykk.** YAML er mellomromsensitivt. Bruk mellomrom, ikke tabulator. Hvert
nøstingsnivå bør være nøyaktig 2 mellomrom.

```yaml
# Feil — tabulator eller inkonsistent innrykk
do:
- fetch:
      call: http

# Riktig
do:
  - fetch:
      call: http
```

**Manglende anførselstegn rundt uttrykk.** Uttrykksstrenger med `${ }` må
kvoteres, ellers tolker YAML `{` som en innebygd tilordning.

```yaml
# Feil — YAML-parserfeil
endpoint: ${ .config.url }

# Riktig
endpoint: "${ .config.url }"
```

**Manglende `document`-blokk.** Alle arbeidsflyter må ha et `document`-felt med
`dsl`, `namespace` og `name`:

```yaml
document:
  dsl: "1.0"
  namespace: mine-arbeidsflyter
  name: min-arbeidsflyt
```

### «Workflow YAML must be an object»

YAML ble tolket, men resultatet er en skalerverdi eller matrise, ikke et objekt.
Sjekk at YAML-en har overordnede nøkler (`document`, `do`).

### «Task has no recognized type»

Hver oppgaveoppføring må inneholde nøyaktig én typenøkkel: `call`, `run`, `set`,
`switch`, `for`, `raise`, `emit` eller `wait`. Hvis parseren ikke finner noen av
disse, rapporterer den en ukjent type.

Vanlig årsak: skrivefeil i oppgavenavnet (f.eks. `calls` i stedet for `call`).

---

## Feil ved uttrykksevaluering

### Feil eller tomme verdier

Uttrykk bruker `${ .bane.til.verdi }`-syntaks. Den ledende punktum er obligatorisk
— den forankrer banen til arbeidsflytens datakontekstrot.

```yaml
# Feil — manglende ledende punktum
value: "${ result.name }"

# Riktig
value: "${ .result.name }"
```

### «undefined» i utdata

Punktum-banen løste seg til ingenting. Vanlige årsaker:

- **Feil oppgavenavn.** Hver oppgave lagrer resultatet under sitt eget navn. Hvis
  oppgaven heter `hent_data`, refererer du til resultatet som `${ .hent_data }`,
  ikke `${ .data }` eller `${ .result }`.
- **Feil nøsting.** Hvis HTTP-kallet returnerer `{"data": {"items": [...]}}`, er
  elementene på `${ .hent_data.data.items }`.
- **Matrise-indeksering.** Bruk parentes-syntaks: `${ .items[0].name }`. Bare-punktum-baner
  støtter ikke numeriske indekser.

### Boolske betingelser fungerer ikke

Uttrykksammenligninger er strenge (`===`). Sørg for at typene stemmer:

```yaml
# Dette mislykkes hvis .count er strengen "0"
if: "${ .count == 0 }"

# Fungerer når .count er et tall
if: "${ .count == 0 }"
```

Sjekk om oppstrøms oppgaver returnerer strenger eller tall. HTTP-svar returnerer
ofte strengverdier som trenger ingen konvertering for sammenligning — bare sammenlign
mot strengformen.

---

## HTTP-kallet mislykkes

### Tidsavbrudd

HTTP-kall går gjennom `web_fetch`-verktøyet. Hvis målserveren er treg, kan
forespørselen tidsavbrytes. Det er ingen per-oppgave-tidsavbrudds-overstyring for
HTTP-kall i arbeidsflyt-DSL — standard tidsavbrudd for `web_fetch`-verktøyet
gjelder.

### SSRF-blokkering

All utgående HTTP i Triggerfish løser DNS først og sjekker den løste IP-adressen
mot en hardkodet avvisningsliste. Private og reserverte IP-områder er alltid blokkert.

Hvis arbeidsflyten kaller en intern tjeneste på en privat IP (f.eks.
`http://192.168.1.100/api`), vil den bli blokkert av SSRF-forebygging. Dette er
etter design og kan ikke konfigureres.

**Løsning:** Bruk et offentlig vertsnavn som løses til en offentlig IP, eller bruk
`triggerfish:mcp` for å rute gjennom en MCP-server som har direkte tilgang.

### Manglende overskrifter

`http`-kalltypen tilordner `with.headers` direkte til forespørselsoverskriftene.
Hvis API-et krever autentisering, inkluder overskriften:

```yaml
- fetch:
    call: http
    with:
      endpoint: "https://api.example.com/data"
      headers:
        Authorization: "Bearer ${ .api_token }"
```

Sørg for at tokenverdien er gitt i arbeidsflyten inn-parametere eller satt av en
forutgående oppgave.

---

## Sub-arbeidsflyt rekursjonsgrense

### «Workflow recursion depth exceeded maximum of 5»

Sub-arbeidsflyter kan nøstes opptil 5 nivåer dypt. Denne grensen forhindrer
uendelig rekursjon når arbeidsflyt A kaller arbeidsflyt B som kaller arbeidsflyt A.

**Løsning:**

- Flate ut arbeidsflytkjeden. Kombiner trinn i færre arbeidsflyter.
- Sjekk for sirkulære referanser der to arbeidsflyter kaller hverandre.

---

## Shell-kjøring deaktivert

### «Shell execution failed» eller tomt resultat fra run-oppgaver

`allowShellExecution`-flagget i arbeidsflytkonteksten kontrollerer om `run`-oppgaver
med `shell`- eller `script`-mål er tillatt. Når det er deaktivert, mislykkes
disse oppgavene.

**Løsning:** Sjekk om shell-kjøring er aktivert i Triggerfish-konfigurasjonen.
I produksjonsmiljøer kan shell-kjøring være bevisst deaktivert av sikkerhetsgrunner.

---

## Arbeidsflyten kjøres, men produserer feil utdata

### Feilsøking med `workflow_history`

Bruk `workflow_history` for å inspisere tidligere kjøringer:

```
workflow_history with workflow_name: "min-arbeidsflyt" and limit: "5"
```

Hver historikkoppføring inkluderer:

- **status** — `completed` eller `failed`
- **error** — feilmelding hvis mislyktes
- **taskCount** — antall oppgaver i arbeidsflyten
- **startedAt / completedAt** — timinginformasjon

### Sjekke kontekstflyt

Hver oppgave lagrer resultatet i datakonteksten under oppgavens navn. Hvis
arbeidsflyten har oppgaver kalt `fetch`, `transform` og `save`, ser datakonteksten
ut slik etter alle tre oppgavene:

```json
{
  "fetch": { "...http-respons..." },
  "transform": { "...transformerte data..." },
  "save": { "...lagringsresultat..." }
}
```

Vanlige feil:

- **Overskrive kontekst.** En `set`-oppgave som tildeler til en nøkkel som allerede
  eksisterer, vil erstatte den forrige verdien.
- **Feil oppgavereferanse.** Refererer `${ .steg1 }` når oppgaven heter `steg_1`.
- **Inngangs-transform som erstatter kontekst.** Et `input.from`-direktiv erstatter
  oppgavens inngangskontekst fullstendig. Hvis du bruker `input.from: "${ .config }"`,
  ser oppgaven kun `config`-objektet, ikke hele konteksten.

### Manglende utdata

Hvis arbeidsflyten fullføres, men returnerer tomt utdata, sjekk om den siste
oppgavens resultat er som forventet. Arbeidsflytutdataet er den fullstendige
datakonteksten ved fullføring, med interne nøkler filtrert ut.

---

## «Permission denied» på workflow_delete

`workflow_delete`-verktøyet laster arbeidsflyten først ved hjelp av sesjonens
gjeldende Taint-nivå. Hvis arbeidsflyten ble lagret på et klassifiseringsnivå som
overskrider sesjons-Tainen, returnerer lastingen null og `workflow_delete` rapporterer
«not found» i stedet for «permission denied».

Dette er tilsiktet — eksistensen av klassifiserte arbeidsflyter avsløres ikke for
lavere klassifiserte sesjoner.

**Løsning:** Eskalere sesjons-Tainen for å matche eller overstige arbeidsflytens
klassifiseringsnivå før sletting. Eller slett den fra samme sesjontype der den
opprinnelig ble lagret.

---

## Selvhelbredelse

### «Step metadata missing on task 'X': self-healing requires description, expects, produces»

Når `self_healing.enabled` er `true`, må alle oppgaver ha alle tre metadatafeltene.
Parseren avviser arbeidsflyten ved lagring hvis noen mangler.

**Løsning:** Legg til `description`, `expects` og `produces` i hvert oppgaves
`metadata`-blokk:

```yaml
- min-oppgave:
    call: http
    with:
      endpoint: "https://example.com/api"
    metadata:
      description: "Hva dette trinnet gjør og hvorfor"
      expects: "Hva dette trinnet trenger som inndata"
      produces: "Hva dette trinnet produserer som utdata"
```

---

### «Self-healing config mutation rejected in version proposal»

Helbredingsagenten foreslo en ny arbeidsflytversjon som modifiserer
`self_healing`-konfigurasjonsblokken. Dette er forbudt — agenten kan ikke endre
sin egen helbredelseskonfigurasjon.

Dette fungerer som tilsiktet. Bare mennesker kan endre `self_healing`-konfigurasjonen
ved å lagre en ny versjon av arbeidsflyten direkte via `workflow_save`.

---

### Helbredingsagent starter ikke

Arbeidsflyten kjøres, men ingen helbredingsagent vises. Sjekk:

1. **`enabled` er `true`** i `metadata.triggerfish.self_healing`.
2. **Konfigurasjonen er på riktig sted** — må være nestet under
   `metadata.triggerfish.self_healing`, ikke på toppnivå.
3. **Alle trinn har metadata** — hvis validering mislyktes ved lagring, ble
   arbeidsflyten lagret uten selvhelbredelse aktivert.

---

### Foreslåtte rettelser sitter fast i venting

Hvis `approval_required` er `true` (standard), venter foreslåtte versjoner på
menneskelig gjennomgang. Bruk `workflow_version_list` for å se ventende forslag
og `workflow_version_approve` eller `workflow_version_reject` for å handle på dem.

---

### «Retry budget exhausted» / Uløsbar eskalering

Helbredingsagenten har brukt alle intervensjonsforsøk (standard 3) uten å løse
problemet. Det eskalerer som `unresolvable` og slutter å prøve rettelser.

**Løsning:**

- Sjekk `workflow_healing_status` for å se hvilke intervensjoner som ble forsøkt.
- Gjennomgå og fiks det underliggende problemet manuelt.
- For å tillate flere forsøk, øk `retry_budget` i selvhelbredelseskonfigurasjonen
  og lagre arbeidsflyten på nytt.
