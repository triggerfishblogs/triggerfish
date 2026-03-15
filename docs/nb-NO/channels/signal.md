# Signal

Koble Triggerfish-agenten din til Signal slik at folk kan sende meldinger til den fra Signal-appen. Adapteren kommuniserer med en [signal-cli](https://github.com/AsamK/signal-cli)-daemon over JSON-RPC, ved hjelp av det tilkoblede Signal-telefonnummeret ditt.

## Hvordan Signal er annerledes

Signal-adapteren **er** telefonnummeret ditt. I motsetning til Telegram eller Slack der det finnes en separat botkonto, kommer Signal-meldinger fra andre til nummeret ditt. Dette betyr:

- Alle innkommende meldinger har `isOwner: false` — de er alltid fra noen andre
- Adapteren svarer som ditt telefonnummer
- Det finnes ingen per-melding eiersjekk som på andre kanaler

Dette gjør Signal ideelt for å motta meldinger fra kontakter som sender melding til nummeret ditt, med agenten som svarer på dine vegne.

## Standard klassifisering

Signal er som standard `PUBLIC`-klassifisert. Siden alle innkommende meldinger kommer fra eksterne kontakter, er `PUBLIC` den trygge standarden.

## Oppsett

### Trinn 1: Installer signal-cli

signal-cli er en tredjeparts kommandolinjeklient for Signal. Triggerfish kommuniserer med den over en TCP- eller Unix-socket.

**Linux (native bygg — ingen Java nødvendig):**

Last ned det siste native bygget fra [signal-cli-utgivelsessiden](https://github.com/AsamK/signal-cli/releases), eller la Triggerfish laste det ned for deg under oppsett.

**macOS / andre plattformer (JVM-bygg):**

Krever Java 21+. Triggerfish kan automatisk laste ned en bærbar JRE hvis Java ikke er installert.

Du kan også kjøre det guidede oppsettet:

```bash
triggerfish config add-channel signal
```

Dette sjekker etter signal-cli, tilbyr å laste det ned hvis det mangler, og veileder deg gjennom kobling.

### Trinn 2: Koble enheten din

signal-cli må kobles til din eksisterende Signal-konto (som å koble til en skrivebordsapp):

```bash
signal-cli link -n "Triggerfish"
```

Dette skriver ut en `tsdevice:`-URI. Skann QR-koden med Signal-mobilappen din (Innstillinger > Tilkoblede enheter > Koble til ny enhet).

### Trinn 3: Start daemonen

signal-cli kjøres som en bakgrunnsdaemon som Triggerfish kobler seg til:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

Erstatt `+14155552671` med telefonnummeret ditt i E.164-format.

### Trinn 4: Konfigurer Triggerfish

Legg til Signal i din `triggerfish.yaml`:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Alternativ         | Type    | Påkrevd | Beskrivelse                                                                                     |
| ------------------ | ------- | ------- | ----------------------------------------------------------------------------------------------- |
| `endpoint`         | string  | Ja      | signal-cli daemon-adresse (`tcp://host:port` eller `unix:///sti/til/socket`)                    |
| `account`          | string  | Ja      | Ditt Signal-telefonnummer (E.164-format)                                                        |
| `classification`   | string  | Nei     | Klassifiseringstak (standard: `PUBLIC`)                                                         |
| `defaultGroupMode` | string  | Nei     | Gruppemeldingshåndtering: `always`, `mentioned-only`, `owner-only` (standard: `always`)         |
| `groups`           | object  | Nei     | Per-gruppe konfigurasjonsoverstyringer                                                          |
| `ownerPhone`       | string  | Nei     | Reservert for fremtidig bruk                                                                    |
| `pairing`          | boolean | Nei     | Aktiver paringsmodus under oppsett                                                              |

### Trinn 5: Start Triggerfish

```bash
triggerfish stop && triggerfish start
```

Send en melding til telefonnummeret ditt fra en annen Signal-bruker for å bekrefte tilkoblingen.

## Gruppemeldinger

Signal støtter gruppechatter. Du kan kontrollere hvordan agenten svarer på gruppemeldinger:

| Modus            | Atferd                                                  |
| ---------------- | ------------------------------------------------------- |
| `always`         | Svar på alle gruppemeldinger (standard)                 |
| `mentioned-only` | Svar bare når nevnt av telefonnummer eller @nevning     |
| `owner-only`     | Svar aldri i grupper                                    |

Konfigurer globalt eller per gruppe:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "din-gruppe-id":
        mode: always
        classification: INTERNAL
```

Gruppe-ID-er er base64-kodede identifikatorer. Bruk `triggerfish signal list-groups` eller sjekk signal-cli-dokumentasjonen for å finne dem.

## Meldingsdeling

Signal har en 4 000-tegns meldingsgrense. Svar som er lengre enn dette deles automatisk i flere meldinger, med deling ved linjeskift eller mellomrom for lesbarhet.

## Skriveindikatorer

Adapteren sender skriveindikatorer mens agenten behandler en forespørsel. Skrivetilstanden tømmes når svaret er sendt.

## Utvidede verktøy

Signal-adapteren eksponerer ytterligere verktøy:

- `sendTyping` / `stopTyping` — Manuell kontroll av skriveindikator
- `listGroups` — List alle Signal-grupper kontoen er medlem av
- `listContacts` — List alle Signal-kontakter

## Endre klassifisering

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Gyldige nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Start daemonen på nytt etter endring: `triggerfish stop && triggerfish start`

## Pålitelighetsegenskaper

Signal-adapteren inkluderer flere pålitelighetsmekanismer:

### Automatisk gjenkobling

Hvis tilkoblingen til signal-cli faller ut (nettverksavbrudd, daemon-omstart), kobler adapteren automatisk til igjen med eksponensiell tilbakekobling. Ingen manuell intervensjon nødvendig.

### Helsesjekk

Ved oppstart sjekker Triggerfish om en eksisterende signal-cli-daemon er sunn ved hjelp av en JSON-RPC ping-probe. Hvis daemonen ikke svarer, drepes den og startes på nytt automatisk.

### Versjonssporing

Triggerfish sporer den kjente-gode signal-cli-versjonen (for øyeblikket 0.13.0) og advarer ved oppstart hvis den installerte versjonen er eldre. signal-cli-versjonen logges ved hver vellykket tilkobling.

### Unix Socket-støtte

I tillegg til TCP-endepunkter støtter adapteren Unix domain sockets:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Feilsøking

**signal-cli-daemon ikke nåbar:**

- Verifiser at daemonen kjører: sjekk for prosessen eller prøv `nc -z 127.0.0.1 7583`
- signal-cli binder bare IPv4 — bruk `127.0.0.1`, ikke `localhost`
- TCP standard port er 7583
- Triggerfish vil automatisk starte daemonen på nytt hvis den oppdager en usunn prosess

**Meldinger ankommer ikke:**

- Bekreft at enheten er koblet til: sjekk Signal-mobilappen under Tilkoblede enheter
- signal-cli må ha mottatt minst én synkronisering etter kobling
- Sjekk logger for tilkoblingsfeil: `triggerfish logs --tail`

**Java-feil (kun JVM-bygg):**

- signal-cli JVM-bygg krever Java 21+
- Kjør `java -version` for å sjekke
- Triggerfish kan laste ned en bærbar JRE under oppsett hvis nødvendig

**Gjenoblingslooper:**

- Hvis du ser gjentatte gjenoblingsforsøk i loggene, kan signal-cli-daemonen krasje
- Sjekk signal-cli-ens egne stderr-utdata for feil
- Prøv å starte på nytt med en frisk daemon: stopp Triggerfish, drep signal-cli, start begge på nytt
