# Feilsøking: Sikkerhet og klassifisering

## Write-down-blokkering

### «Write-down blocked»

Dette er den vanligste sikkerhetsfeilen. Det betyr at data prøver å flyte fra et
høyere klassifiseringsnivå til et lavere.

**Eksempel:** Sesjonen din fikk tilgang til CONFIDENTIAL-data (leste en klassifisert
fil, spørte en klassifisert database). Sesjons-Taint er nå CONFIDENTIAL. Du prøvde
deretter å sende svaret til en PUBLIC WebChat-kanal. Policy-motoren blokkerer dette
fordi CONFIDENTIAL-data ikke kan flyte til PUBLIC-destinasjoner.

```
Write-down blocked: CONFIDENTIAL cannot flow to PUBLIC
```

**Slik løser du det:**
1. **Start en ny sesjon.** En ny sesjon starter på PUBLIC Taint. Bruk en ny samtale.
2. **Bruk en høyere klassifisert kanal.** Send svaret gjennom en kanal klassifisert
   på CONFIDENTIAL eller over.
3. **Forstå hva som forårsaket Tainten.** Sjekk loggene for «Taint escalation»-oppføringer
   for å se hvilket verktøykall som hevet sesjonens klassifisering.

### «Session taint cannot flow to channel»

Samme som write-down, men spesifikt om kanalklassifisering:

```
Write-down blocked: your session taint is CONFIDENTIAL, but channel "webchat" is classified as PUBLIC.
Data cannot flow from CONFIDENTIAL to PUBLIC.
```

### «Integration write-down blocked»

Verktøykall til klassifiserte integrasjoner håndhever også write-down:

```
Session taint CONFIDENTIAL cannot flow to tool_name (classified INTERNAL)
```

Vent, dette ser bakvendt ut. Sesjons-Taint er høyere enn verktøyets klassifisering.
Dette betyr at sesjonen er for mye tainter til å bruke et lavere klassifisert
verktøy. Bekymringen er at kalling av verktøyet kan lekke klassifisert kontekst
til et mindre sikkert system.

### «Workspace write-down blocked»

Agentarbeidsområder har klassifisering per mappe. Skriving til en lavere klassifisert
mappe fra en høyere tainter sesjon er blokkert:

```
Write-down: CONFIDENTIAL session cannot write to INTERNAL directory
```

---

## Taint-eskalering

### «Taint escalation»

Dette er informativt, ikke en feil. Det betyr at sesjonens klassifiseringsnivå
nettopp økte fordi agenten fikk tilgang til klassifiserte data.

```
Taint escalation: PUBLIC → INTERNAL (accessed internal_tool)
```

Taint går bare opp, aldri ned. Når en sesjon er tainter til CONFIDENTIAL, forblir
den der resten av sesjonen.

### «Resource-based taint escalation firing»

Et verktøykall fikk tilgang til en ressurs med høyere klassifisering enn sesjonens
gjeldende Taint. Sesjons-Taint eskaleres automatisk for å samsvare.

### «Non-owner taint applied»

Ikke-eier-brukere kan få sesjonene sine tainter basert på kanalens klassifisering
eller brukerens tillatelser. Dette er separat fra ressursbasert Taint.

---

## SSRF (Server-Side Request Forgery)

### «SSRF blocked: hostname resolves to private IP»

Alle utgående HTTP-forespørsler (web_fetch, nettlesernavigasjon, MCP SSE-tilkoblinger)
går gjennom SSRF-beskyttelse. Hvis målvertsnavnet løses til en privat IP-adresse,
blokkeres forespørselen.

**Blokkerte områder:**
- `127.0.0.0/8` (loopback)
- `10.0.0.0/8` (privat)
- `172.16.0.0/12` (privat)
- `192.168.0.0/16` (privat)
- `169.254.0.0/16` (linklokalt)
- `0.0.0.0/8` (uspesifisert)
- `::1` (IPv6 loopback)
- `fc00::/7` (IPv6 ULA)
- `fe80::/10` (IPv6 linklokalt)

Denne beskyttelsen er hardkodet og kan ikke deaktiveres eller konfigureres. Det
forhindrer at AI-agenten lures til å få tilgang til interne tjenester.

**IPv4-tilordnet IPv6:** Adresser som `::ffff:127.0.0.1` oppdages og blokkeres.

### «SSRF check blocked outbound request»

Samme som ovenfor, men logget fra web_fetch-verktøyet i stedet for SSRF-modulen.

### DNS-løsingsfeil

```
DNS resolution failed for hostname
No DNS records found for hostname
```

Vertsnavnet kunne ikke løses. Sjekk:
- URL-en er stavet riktig
- DNS-serveren din er nåbar
- Domenet faktisk eksisterer

---

## Policy-motoren

### «Hook evaluation failed, defaulting to BLOCK»

En policy-hook kastet et unntak under evaluering. Når dette skjer, er standard
handling BLOCK (nekte). Dette er den trygge standarden.

Sjekk loggene for det fullstendige unntaket. Det indikerer sannsynligvis en feil
i en egendefinert policyregel.

### «Policy rule blocked action»

En policyregel nektet eksplisitt handlingen. Loggoppføringen inkluderer hvilken
regel som ble utløst og hvorfor. Sjekk `policy.rules`-seksjonen i konfigurasjonen
for å se hvilke regler som er definert.

### «Tool floor violation»

Et verktøy ble kalt som krever et minimums klassifiseringsnivå, men sesjonen er
under det nivået.

**Eksempel:** Helsesjekk-verktøyet krever minst INTERNAL-klassifisering (fordi
det avslører system-internt). Hvis en PUBLIC-sesjon prøver å bruke det, blokkeres
kallet.

---

## Plugin- og ferdighets-sikkerhet

### «Plugin network access blocked»

Plugins kjører i en sandkasse med begrenset nettverkstilgang. De kan bare få tilgang
til URL-er på det deklarerte endepunktdomenet.

```
Plugin network access blocked: invalid URL
Plugin SSRF blocked
```

Pluginen prøvde å få tilgang til en URL som ikke er i de deklarerte endepunktene,
eller URL-en løste seg til en privat IP.

### «Skill activation blocked by classification ceiling»

Ferdigheter deklarerer et `classification_ceiling` i SKILL.md-frontmatter. Hvis
taket er under sesjonens Taint-nivå, kan ikke ferdigheten aktiveres:

```
Cannot activate skill below session taint (write-down risk).
INTERNAL ceiling but session taint is CONFIDENTIAL.
```

Dette forhindrer at en lavere klassifisert ferdighet eksponeres for høyere
klassifiserte data.

### «Skill content integrity check failed»

Etter installasjon hasher Triggerfish ferdighetens innhold. Hvis hashen endres
(ferdigheten ble endret etter installasjon), mislykkes integritetssjekken:

```
Skill content hash mismatch detected
```

Dette kan indikere manipulasjon. Reinstaller ferdigheten fra en pålitelig kilde.

### «Skill install rejected by scanner»

Sikkerhetsscanneren fant mistenkelig innhold i ferdigheten. Scanneren sjekker for
mønstre som kan indikere ondsinnet atferd. De spesifikke advarslene er inkludert
i feilmeldingen.

---

## Sesjonssikkerhet

### «Session not found»

```
Session not found: <sesjon-id>
```

Den forespurte sesjonen eksisterer ikke i sesjonsbehandleren. Den kan ha blitt
ryddet opp, eller sesjons-ID-en er ugyldig.

### «Session status access denied: taint exceeds caller»

Du prøvde å se en sesjons status, men den sesjonen har et høyere Taint-nivå enn
din gjeldende sesjon. Dette forhindrer lavere klassifiserte sesjoner fra å lære
om høyere klassifiserte operasjoner.

### «Session history access denied»

Samme konsept som ovenfor, men for visning av samtalehistorikk.

---

## Agentteam

### «Team message delivery denied: team status is ...»

Teamet er ikke i `running`-status. Dette skjer når:

- Teamet ble **oppløst** (manuelt eller av livssyklus-monitoren)
- Teamet ble **pauset** fordi leadsjefen mislyktes
- Teamet **tidsavbrutt** etter å ha overskredet livstidsgrensen

Sjekk teamets gjeldende status med `team_status`. Hvis teamet er pauset på grunn
av leder-feil, kan du oppløse det med `team_disband` og opprette et nytt.

### «Team member not found» / «Team member ... is not active»

Målmedlemmet eksisterer enten ikke (feil rollenavn) eller har blitt avsluttet.
Medlemmer avsluttes når:

- De overskrider inaktivitetstidsavbruddet (2x `idle_timeout_seconds`)
- Teamet oppløses
- Sesjonen krasjer og livssyklus-monitoren oppdager det

Bruk `team_status` for å se alle medlemmer og gjeldende status.

### «Team disband denied: only the lead or creating session can disband»

Bare to sesjoner kan oppløse et team:

1. Sesjonen som opprinnelig kalte `team_create`
2. Ledermedlemmets sesjon

Hvis du får denne feilen fra innsiden av teamet, er det kallende medlemmet ikke
lederen. Hvis du får det utenfra teamet, er du ikke sesjonen som opprettet det.

### Teamleder mislykkes umiddelbart etter opprettelse

Lederens agentsesjon kunne ikke fullføre sin første tur. Vanlige årsaker:

1. **LLM-leverandørfeil:** Leverandøren returnerte en feil (hastighetsbegrensning,
   autentiseringsfeil, modell ikke funnet). Sjekk `triggerfish logs` for leverandørfeil.
2. **Klassifiseringstak for lavt:** Hvis lederen trenger verktøy klassifisert over
   taket, kan sesjonen mislykkes på det første verktøykallets.
3. **Manglende verktøy:** Lederen kan trenge spesifikke verktøy for å dekomponere
   arbeid. Sørg for at verktøyprofiler er konfigurert riktig.

### Teammedlemmer er inaktive og produserer aldri utdata

Medlemmer venter på at lederen sender dem arbeid via `sessions_send`. Hvis lederen
ikke dekomponerer oppgaven:

- Lederens modell forstår kanskje ikke teamkoordinering. Prøv en mer kapabel
  modell for lederrollen.
- `task`-beskrivelsen kan være for vag for lederen til å dekomponere i deloppgaver.
- Sjekk `team_status` for å se om lederen er `active` og har nylig aktivitet.

### «Write-down blocked» mellom teammedlemmer

Teammedlemmer følger de samme klassifiseringsreglene som alle sesjoner. Hvis ett
medlem har blitt tainter til `CONFIDENTIAL` og prøver å sende data til et medlem
på `PUBLIC`, blokkerer write-down-sjekken det. Dette er forventet atferd —
klassifiserte data kan ikke flyte til lavere klassifiserte sesjoner, selv innenfor
et team.

---

## Delegasjon og multi-agent

### «Delegation certificate signature invalid»

Agentdelegasjon bruker kryptografiske sertifikater. Hvis signatursjekken mislykkes,
avvises delegasjonen. Dette forhindrer forgede delegasjonskjeder.

### «Delegation certificate expired»

Delegasjonssertifikatet har en levetid. Hvis det er utløpt, kan ikke den delegerte
agenten lenger handle på vegne av delegatoren.

### «Delegation chain linkage broken»

I multihop-delegasjoner (A delegerer til B, B delegerer til C) må hvert ledd i
kjeden være gyldig. Hvis noe ledd er brutt, avvises hele kjeden.

---

## Webhooks

### «Webhook HMAC verification failed»

Innkommende webhooks krever HMAC-signaturer for autentisering. Hvis signaturen
mangler, er feilformatert, eller ikke stemmer:

```
Webhook HMAC verification failed: missing secret or body
Webhook HMAC verification failed: signature parse error
Webhook signature verification failed: length mismatch
Webhook signature verification failed: signature mismatch
```

Sjekk at:
- Webhook-kilden sender den riktige HMAC-signaturheaderen
- Den delte hemmeligheten i konfigurasjonen samsvarer med kildens hemmelighet
- Signaturformatet stemmer overens (hex-kodet HMAC-SHA256)

### «Webhook replay detected»

Triggerfish inkluderer replay-beskyttelse. Hvis en webhook-melding mottas en gang
til (samme signatur), avvises den.

### «Webhook rate limit exceeded»

```
Webhook rate limit exceeded: source=<kildeId>
```

For mange webhook-forespørsler fra samme kilde i løpet av kort tid. Dette beskytter
mot webhook-flommer. Vent og prøv igjen.

---

## Revisjonsintegritet

### «previousHash mismatch»

Revisjonsloggen bruker hash-kjeding. Hver oppføring inkluderer hashen til forrige
oppføring. Hvis kjeden er brutt, betyr det at revisjonsloggen ble manipulert eller
korruptert.

### «HMAC mismatch»

Revisjonsoppføringens HMAC-signatur stemmer ikke. Oppføringen kan ha blitt endret
etter opprettelse.
