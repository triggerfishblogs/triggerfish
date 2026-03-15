# Feilsøking: Kanaler

## Generelle kanalproblemer

### Kanalen ser tilkoblet ut, men ingen meldinger kommer frem

1. **Sjekk eier-ID.** Hvis `ownerId` ikke er satt eller er feil, kan meldinger fra
   deg bli ruter som eksterne (ikke-eier) meldinger med begrensede tillatelser.
2. **Sjekk klassifisering.** Hvis kanalens klassifisering er lavere enn sesjons-Taint,
   blokkeres svar av no-write-down-regelen.
3. **Sjekk daemonloggene.** Kjør `triggerfish logs --level WARN` og se etter
   leveringsfeil.

### Meldinger sendes ikke

Ruteren logger leveringsfeil. Sjekk `triggerfish logs` for:

```
Channel send failed
```

Dette betyr at ruteren forsøkte levering, men kanaladapteren returnerte en feil.
Den spesifikke feilen vil bli logget ved siden av.

### Forsøksatferd

Kanalruteren bruker eksponentiell backoff for mislykkede sendinger. Hvis en melding
mislykkes, prøves den på nytt med økende forsinkelser. Etter at alle forsøk er
utmattet, droppes meldingen og feilen logges.

---

## Telegram

### Boten svarer ikke

1. **Verifiser tokenet.** Gå til @BotFather på Telegram, sjekk at tokenet ditt er
   gyldig og samsvarer med det som er lagret i nøkkelringen.
2. **Send melding direkte til boten.** Gruppemeldinger krever at boten har
   gruppemeldingstillatelser.
3. **Sjekk etter pollingfeil.** Telegram bruker long polling. Hvis tilkoblingen
   faller, kobler adapteren seg til på nytt automatisk, men vedvarende nettverksproblemer
   vil forhindre mottak av meldinger.

### Meldinger deles i flere deler

Telegram har en grense på 4 096 tegn per melding. Lange svar deles automatisk
opp. Dette er normal atferd.

### Bot-kommandoer vises ikke i menyen

Adapteren registrerer slash-kommandoer ved oppstart. Hvis registrering mislykkes,
logges en advarsel, men den fortsetter å kjøre. Dette er ikke fatalt. Boten
fungerer fortsatt; kommandomenyen viser bare ikke autofullføringforslag.

### Kan ikke slette gamle meldinger

Telegram lar ikke boter slette meldinger eldre enn 48 timer. Forsøk på å slette
gamle meldinger mislykkes lydløst. Dette er en Telegram API-begrensning.

---

## Slack

### Boten kobler ikke til

Slack krever tre legitimasjonselementer:

| Legitimasjon | Format | Hvor du finner det |
|-----------|--------|-------------------|
| Bot Token | `xoxb-...` | OAuth & Permissions-siden i Slack app-innstillinger |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Heksadesimal streng | Basic Information > App Credentials |

Hvis noen av de tre mangler eller er ugyldige, mislykkes tilkoblingen. Den
vanligste feilen er å glemme App Token, som er separat fra Bot Token.

### Socket Mode-problemer

Triggerfish bruker Slacks Socket Mode, ikke HTTP-hendelsesabonnementer. I Slack
app-innstillingene:

1. Gå til «Socket Mode» og sørg for at det er aktivert
2. Opprett et app-nivå token med `connections:write`-omfang
3. Dette tokenet er `appToken` (`xapp-...`)

Hvis Socket Mode ikke er aktivert, er bot-tokenet alene ikke nok for sanntids
meldinger.

### Meldinger trunkeres

Slack har en grense på 40 000 tegn. I motsetning til Telegram og Discord, trunkerer
Triggerfish Slack-meldinger i stedet for å dele dem. Hvis du regelmessig treffer
denne grensen, vurder å be agenten produsere mer konsist utdata.

### SDK-ressurslekkasjer i tester

Slack SDK lekker asynkrone operasjoner ved import. Dette er et kjent upstream-problem.
Tester som bruker Slack-adapteren trenger `sanitizeResources: false` og
`sanitizeOps: false`. Dette påvirker ikke produksjonsbruk.

---

## Discord

### Boten kan ikke lese meldinger i servere

Discord krever **Message Content** privileged intent. Uten det mottar boten
meldingshendelser, men meldingsinnholdet er tomt.

**Løsning:** I [Discord Developer Portal](https://discord.com/developers/applications):
1. Velg applikasjonen din
2. Gå til «Bot»-innstillinger
3. Aktiver «Message Content Intent» under Privileged Gateway Intents
4. Lagre endringer

### Nødvendige bot-intents

Adapteren krever disse intentene aktivert:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privileged)

### Meldinger deles opp

Discord har en grense på 2 000 tegn. Lange meldinger deles automatisk opp i
flere meldinger.

### Skriveindikator mislyktes

Adapteren sender skriveindikatorer før svar. Hvis boten mangler tillatelse til å
sende meldinger i en kanal, mislykkes skriveindikatoren lydløst (logget på
DEBUG-nivå). Dette er kun kosmetisk.

### SDK-ressurslekkasjer

Som Slack lekker discord.js SDK asynkrone operasjoner ved import. Tester trenger
`sanitizeOps: false`. Dette påvirker ikke produksjon.

---

## WhatsApp

### Ingen meldinger mottas

WhatsApp bruker en webhook-modell. Boten lytter etter innkommende HTTP POST-forespørsler
fra Metas servere. For at meldinger skal komme frem:

1. **Registrer webhook-URL** i [Meta Business Dashboard](https://developers.facebook.com/)
2. **Konfigurer verifiseringstokenet.** Adapteren kjører et verifiseringshandtrykk
   når Meta kobler til første gang
3. **Start webhook-lytteren.** Adapteren lytter på port 8443 som standard. Sørg
   for at denne porten er nåbar fra internett (bruk en omvendt proxy eller tunnel)

### «ownerPhone not configured»-advarsel

Hvis `ownerPhone` ikke er satt i WhatsApp-kanalkonfigurasjonen, behandles alle
sendere som eieren. Dette betyr at enhver bruker får full tilgang til alle verktøy.
Dette er et sikkerhetsproblem.

**Løsning:** Sett eiertelefonummeret i konfigurasjonen:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Tilgangstoken utløpt

WhatsApp Cloud API-tilgangstokener kan utløpe. Hvis sendinger begynner å mislykkes
med 401-feil, regenerer tokenet i Meta-dashbordet og oppdater det:

```bash
triggerfish config set-secret whatsapp:accessToken <nytt-token>
```

---

## Signal

### signal-cli ikke funnet

Signal-kanalen krever `signal-cli`, en tredjeparts Java-applikasjon. Triggerfish
prøver å auto-installere det under oppsett, men dette kan mislykkes hvis:

- Java (JRE 21+) ikke er tilgjengelig og auto-installasjon av JRE 25 mislyktes
- Nedlastingen ble blokkert av nettverksbegrensninger
- Målmappen ikke er skrivbar

**Manuell installasjon:**

```bash
# Installer signal-cli manuelt
# Se https://github.com/AsamK/signal-cli for instruksjoner
```

### signal-cli daemon ikke nåbar

Etter oppstart av signal-cli venter Triggerfish i opptil 60 sekunder på at det
skal bli nåbar. Hvis dette tidsavbrytes:

```
signal-cli daemon (tcp) not reachable within 60s
```

Sjekk:
1. Kjører signal-cli faktisk? Sjekk `ps aux | grep signal-cli`
2. Lytter det på det forventede endepunktet (TCP-socket eller Unix-socket)?
3. Trenger Signal-kontoen å kobles til? Kjør `triggerfish config add-channel signal`
   for å gå gjennom koblingsprosessen igjen.

### Enhetskoblimg mislyktes

Signal krever kobling av enheten til Signal-kontoen din via QR-kode. Hvis
koblingsprosessen mislykkes:

1. Sørg for at Signal er installert på telefonen din
2. Åpne Signal > Innstillinger > Koblede enheter > Koble ny enhet
3. Skann QR-koden vist av oppsettveiviseren
4. Hvis QR-koden utløp, start koblingsprosessen på nytt

### signal-cli versjonsmismatch

Triggerfish fester seg til en kjent-god versjon av signal-cli. Hvis du installerte
en annen versjon, kan du se en advarsel:

```
Signal CLI version older than known-good
```

Dette er ikke fatalt, men kan forårsake kompatibilitetsproblemer.

---

## E-post

### IMAP-tilkobling mislykkes

E-postadapteren kobler seg til IMAP-serveren for innkommende post. Vanlige problemer:

- **Feil legitimasjon.** Verifiser IMAP-brukernavn og passord.
- **Port 993 blokkert.** Adapteren bruker IMAP over TLS (port 993). Noen nettverk
  blokkerer dette.
- **App-spesifikt passord kreves.** Gmail og andre leverandører krever app-spesifikke
  passord når 2FA er aktivert.

Feilmeldinger du kan se:
- `IMAP LOGIN failed` - feil brukernavn eller passord
- `IMAP connection not established` - kan ikke nå serveren
- `IMAP connection closed unexpectedly` - serveren droppet tilkoblingen

### SMTP-sendefeil

E-postadapteren sender via et SMTP API-relé (ikke direkte SMTP). Hvis sendinger
mislykkes med HTTP-feil:

- 401/403: API-nøkkelen er ugyldig
- 429: Hastighetsbegrenset
- 5xx: Reléetjenesten er nede

### IMAP-polling stopper

Adapteren poller etter nye e-poster hvert 30. sekund. Hvis polling mislykkes,
logges feilen, men det er ingen automatisk gjentilkobling. Start daemonen på nytt
for å gjenopprette IMAP-tilkoblingen.

Dette er en kjent begrensning. Se [Kjente problemer](/nb-NO/support/kb/known-issues).

---

## WebChat

### WebSocket-oppgradering avvist

WebChat-adapteren validerer innkommende tilkoblinger:

- **Overskrifter for store (431).** Den samlede overskriftstørrelsen overskrider
  8 192 byte. Dette kan skje med for store informasjonskapsler eller egendefinerte
  overskrifter.
- **CORS-avvisning.** Hvis `allowedOrigins` er konfigurert, må Origin-overskriften
  samsvare. Standard er `["*"]` (tillat alle).
- **Feilformede rammer.** Ugyldig JSON i WebSocket-rammer logges på WARN-nivå og
  rammen droppes.

### Klassifisering

WebChat er som standard PUBLIC-klassifisering. Besøkende behandles aldri som eier.
Hvis du trenger høyere klassifisering for WebChat, sett det eksplisitt:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### PubSub-pollingfeil

Google Chat bruker Pub/Sub for meldingslevering. Hvis polling mislykkes:

```
Google Chat PubSub poll failed
```

Sjekk:
- Google Cloud-legitimasjon er gyldig (sjekk `credentials_ref` i konfigurasjonen)
- Pub/Sub-abonnementet eksisterer og ikke er slettet
- Tjenestekontoen har `pubsub.subscriber`-rollen

### Gruppemeldinger nektet

Hvis gruppemodus ikke er konfigurert, kan gruppemeldinger bli stille droppet:

```
Google Chat group message denied by group mode
```

Konfigurer `defaultGroupMode` i Google Chat-kanalens konfigurasjon.

### ownerEmail ikke konfigurert

Uten `ownerEmail` behandles alle brukere som ikke-eier:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

Sett det i konfigurasjonen for å få full verktøytilgang.
