# Feilsøking: Integrasjoner

## Google Workspace

### OAuth-token utløpt eller tilbakekalt

Google OAuth-oppdateringstokener kan tilbakekalles (av brukeren, av Google, eller
ved inaktivitet). Når dette skjer:

```
Google OAuth token exchange failed
```

Eller du vil se 401-feil på Google API-kall.

**Løsning:** Autentiser på nytt:

```bash
triggerfish connect google
```

Dette åpner en nettleser for OAuth-samtykkeflyten. Etter å ha gitt tilgang lagres
de nye tokenene i nøkkelringen.

### «No refresh token»

OAuth-flyten returnerte et tilgangstoken, men ikke noe oppdateringstoken. Dette
skjer når:

- Du har allerede autorisert appen før (Google sender bare oppdateringstokenet ved
  den første autorisasjonen)
- OAuth-samtykke-skjermen ba ikke om offline-tilgang

**Løsning:** Trekk tilbake appens tilgang i
[Google-kontoinnstillinger](https://myaccount.google.com/permissions), og kjør
deretter `triggerfish connect google` igjen. Denne gangen sender Google et nytt
oppdateringstoken.

### Forebygging av samtidige oppdateringer

Hvis flere forespørsler utløser en tokenoppdatering samtidig, serialiserer
Triggerfish dem slik at bare én oppdateringsforespørsel sendes. Hvis du ser
tidsavbrudd under tokenoppdatering, kan det hende at den første oppdateringen tar
for lang tid.

---

## GitHub

### «GitHub token not found in keychain»

GitHub-integrasjonen lagrer Personal Access Token i OS-nøkkelringen under nøkkelen
`github-pat`.

**Løsning:**

```bash
triggerfish connect github
# eller manuelt:
triggerfish config set-secret github-pat ghp_...
```

### Tokenformat

GitHub støtter to tokenformater:
- Klassiske PAT-er: `ghp_...`
- Finkornet PAT-er: `github_pat_...`

Begge fungerer. Oppsettveiviseren verifiserer tokenet ved å kalle GitHub API.
Hvis verifisering mislykkes:

```
GitHub token verification failed
GitHub API request failed
```

Dobbeltsjekk at tokenet har de nødvendige omfangene. For full funksjonalitet
trenger du: `repo`, `read:org`, `read:user`.

### Kloningsfeil

GitHub klone-verktøyet har automatisk gjenforsøkslogikk:

1. Første forsøk: kloner med angitt `--branch`
2. Hvis grenen ikke eksisterer: prøver på nytt uten `--branch` (bruker
   standardgrenen)

Hvis begge forsøkene mislykkes:

```
Clone failed on retry
Clone failed
```

Sjekk:
- Tokenet har `repo`-omfang
- Repositoriet eksisterer og tokenet har tilgang
- Nettverkstilkobling til github.com

### Hastighetsbegrensning

GitHubs API-hastighetsbegrensning er 5 000 forespørsler/time for autentiserte
forespørsler. Det gjenværende antallet og tilbakestillingstidspunktet ekstraheres
fra svarhoder og inkluderes i feilmeldinger:

```
Rate limit: X remaining, resets at HH:MM:SS
```

Det er ingen automatisk backoff. Vent på at hastighetsbegrensningsvinduet tilbakestilles.

---

## Notion

### «Notion enabled but token not found in keychain»

Notion-integrasjonen krever et internt integrasjonstoken lagret i nøkkelringen.

**Løsning:**

```bash
triggerfish connect notion
```

Dette ber om tokenet og lagrer det i nøkkelringen etter å ha verifisert det med
Notion API.

### Tokenformat

Notion bruker to tokenformater:
- Interne integrasjonstokener: `ntn_...`
- Eldre tokener: `secret_...`

Begge aksepteres. Tilkoblingsveiviseren validerer formatet før lagring.

### Hastighetsbegrensning (429)

Notions API er hastighetsbegrenset til omtrent 3 forespørsler per sekund.
Triggerfish har innebygd hastighetsbegrensning (konfigurerbar) og gjenforsøkslogikk:

- Standardhastighet: 3 forespørsler/sekund
- Gjenforsøk: opptil 3 ganger ved 429
- Backoff: eksponentiell med jitter, starter på 1 sekund
- Respekterer `Retry-After`-headeren fra Notions svar

Hvis du fortsatt treffer hastighetsbegrensninger:

```
Notion API rate limited, retrying
```

Reduser samtidige operasjoner eller senk hastighetsbegrensningen i konfigurasjonen.

### 404 Ikke funnet

```
Notion: 404 Not Found
```

Ressursen eksisterer, men er ikke delt med integrasjonen din. I Notion:

1. Åpne siden eller databasen
2. Klikk «...»-menyen > «Connections»
3. Legg til Triggerfish-integrasjonen din

### «client_secret removed» (Brytende endring)

I en sikkerhetsoppdatering ble `client_secret`-feltet fjernet fra Notion-konfigurasjonen.
Hvis du har dette feltet i `triggerfish.yaml`, fjern det. Notion bruker nå kun
OAuth-tokenet lagret i nøkkelringen.

### Nettverksfeil

```
Notion API network request failed
Notion API network error: <melding>
```

API-et er ikke nåbar. Sjekk nettverkstilkoblingen din. Hvis du er bak en
bedriftsproxyserver, må Notions API (`api.notion.com`) være tilgjengelig.

---

## CalDAV (Kalender)

### Legitimasjonsløsing mislyktes

```
CalDAV credential resolution failed: missing username
CalDAV credential resolution failed: secret not found
```

CalDAV-integrasjonen trenger et brukernavn og passord:

```yaml
caldav:
  server_url: "https://calendar.example.com/dav"
  username: "ditt-brukernavn"
  credential_ref: "secret:caldav:password"
```

Lagre passordet:

```bash
triggerfish config set-secret caldav:password <ditt-passord>
```

### Oppdagingsfeil

CalDAV bruker en flertrinnsprosess for oppdaging:
1. Finn principal-URL (PROPFIND på well-known-endepunkt)
2. Finn calendar-home-set
3. List tilgjengelige kalendere

Hvis noe trinn mislykkes:

```
CalDAV principal discovery failed
CalDAV calendar-home-set discovery failed
CalDAV calendar listing failed
```

Vanlige årsaker:
- Feil server-URL (noen servere trenger `/dav/principals/` eller `/remote.php/dav/`)
- Legitimasjon avvist (feil brukernavn/passord)
- Serveren støtter ikke CalDAV (noen servere annonserer WebDAV men ikke CalDAV)

### ETag-mismatch ved oppdatering/sletting

```
ETag mismatch — the event was modified by another client. Fetch the latest version and retry.
```

CalDAV bruker ETager for optimistisk samtidihetskontroll. Hvis en annen klient
(telefon, nett) endret hendelsen mellom din lesing og oppdatering, stemmer ikke
ETag-en.

**Løsning:** Agenten bør hente hendelsen på nytt for å få gjeldende ETag, og
deretter prøve operasjonen på nytt. Dette håndteres automatisk i de fleste tilfeller.

### «CalDAV credentials not available, executor deferred»

CalDAV-eksekutøren starter i en utsatt tilstand hvis legitimasjon ikke kan løses
ved oppstart. Dette er ikke fatalt; eksekutøren rapporterer feil hvis du prøver
å bruke CalDAV-verktøy.

---

## MCP (Model Context Protocol)-servere

### Server ikke funnet

```
MCP server '<navn>' not found
```

Verktøykallets referanser til en MCP-server som ikke er konfigurert. Sjekk
`mcp_servers`-seksjonen i `triggerfish.yaml`.

### Server-binærfil ikke i PATH

MCP-servere startes som underprosesser. Hvis binærfilen ikke er funnet:

```
MCP server '<navn>': <valideringsfeil>
```

Vanlige problemer:
- Kommandoen (f.eks. `npx`, `python`, `node`) er ikke i daemonens PATH
- **systemd/launchd PATH-problem:** Daemonen tar opp din PATH ved installasjonstidspunktet.
  Hvis du installerte MCP-serververktøyet etter installasjon av daemonen,
  reinstaller daemonen for å oppdatere PATH:

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### Serveren krasjer

Hvis en MCP-serverprosess krasjer, avsluttes leseløkken og serveren blir
utilgjengelig. Det er ingen automatisk gjentilkobling.

**Løsning:** Start daemonen på nytt for å starte alle MCP-servere på nytt.

### SSE-transport blokkert

MCP-servere som bruker SSE (Server-Sent Events)-transport er underlagt SSRF-sjekker:

```
MCP SSE connection blocked by SSRF policy
```

SSE-URL-er som peker til private IP-adresser er blokkert. Dette er etter design.
Bruk stdio-transport for lokale MCP-servere i stedet.

### Verktøykallet feil

```
tools/list failed: <melding>
tools/call failed: <melding>
```

MCP-serveren svarte med en feil. Dette er serverens feil, ikke Triggerfish. Sjekk
MCP-serverens egne logger for detaljer.

---

## Obsidian

### «Vault path does not exist»

```
Vault path does not exist: /path/to/vault
```

Den konfigurerte hvelv-banen i `plugins.obsidian.vault_path` eksisterer ikke. Sørg
for at banen er riktig og tilgjengelig.

### Sti-traversering blokkert

```
Path traversal rejected: <sti>
Path escapes vault boundary: <sti>
```

En notatbane forsøkte å flykte fra hvelv-mappen (f.eks. ved bruk av `../`). Dette
er en sikkerhetssjekk. Alle notateroperasjoner er begrenset til hvelv-mappen.

### Ekskluderte mapper

```
Path is excluded: <sti>
```

Notatet er i en mappe som er listet i `exclude_folders`. For å få tilgang til det,
fjern mappen fra ekskluderingslisten.

### Klassifiseringshåndhevelse

```
Obsidian read blocked: classification exceeds session taint
Obsidian write-down blocked
```

Hvelvet eller den spesifikke mappen har et klassifiseringsnivå som konflikter med
sesjons-Taint. Se [Sikkerhets feilsøking](/nb-NO/support/troubleshooting/security)
for detaljer om write-down-regler.
