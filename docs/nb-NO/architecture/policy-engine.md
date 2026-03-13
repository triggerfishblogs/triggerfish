# Policy-motor og hooks

Policy-motoren er håndhevelseslaget som sitter mellom LLM-en og omverdenen. Den avskjærer hver handling på kritiske punkter i dataflyten og tar deterministiske ALLOW-, BLOCK- eller REDACT-beslutninger. LLM-en kan ikke omgå, endre eller påvirke disse beslutningene.

## Kjerneprinsipper: Håndhevelse under LLM

<img src="/diagrams/policy-enforcement-layers.svg" alt="Policy-håndhevelseslag: LLM sitter over policy-laget, som sitter over utførelseslag" style="max-width: 100%;" />

::: warning SIKKERHET LLM-en sitter over policy-laget. Den kan prompt-injiseres, jailbreakes eller manipuleres — og det spiller ingen rolle. Policy-laget er ren kode som kjører under LLM-en, undersøker strukturerte handlingsforespørsler og tar binære beslutninger basert på klassifiseringsregler. Det er ingen vei fra LLM-utdata til hook-omgåelse. :::

## Hook-typer

Åtte håndhevingshooks avskjærer handlinger på hvert kritiske punkt i dataflyten.

### Hook-arkitektur

<img src="/diagrams/hook-chain-flow.svg" alt="Hook-kjedeflyt: PRE_CONTEXT_INJECTION → LLM-kontekst → PRE_TOOL_CALL → Verktøyutførelse → POST_TOOL_RESPONSE → LLM-svar → PRE_OUTPUT → Utgangskanal" style="max-width: 100%;" />

### Alle hook-typer

| Hook                    | Utløser                           | Nøkkelhandlinger                                                    | Feilmodus            |
| ----------------------- | --------------------------------- | ------------------------------------------------------------------- | -------------------- |
| `PRE_CONTEXT_INJECTION` | Ekstern inndata inn i kontekst    | Klassifiser inndata, tildel taint, opprett linje, skann for injeksjon | Avvis inndata       |
| `PRE_TOOL_CALL`         | LLM ber om verktøyutførelse       | Tillatelsessjekk, hastighetsbegrensning, parametervalidering        | Blokker verktøykall  |
| `POST_TOOL_RESPONSE`    | Verktøy returnerer data           | Klassifiser svar, oppdater session taint, opprett/oppdater linje    | Rediger eller blokker |
| `PRE_OUTPUT`            | Svar i ferd med å forlate systemet | Endelig klassifiseringssjekk mot mål, PII-skanning                 | Blokker utdata       |
| `SECRET_ACCESS`         | Plugin ber om legitimasjon        | Logg tilgang, verifiser tillatelse mot erklært omfang               | Nekt legitimasjon    |
| `SESSION_RESET`         | Bruker ber om taint-tilbakestilling | Arkiver linje, tøm kontekst, verifiser bekreftelse                | Krev bekreftelse     |
| `AGENT_INVOCATION`      | Agent kaller en annen agent       | Verifiser delegeringskjede, håndhev taint-tak                      | Blokker invokasjon   |
| `MCP_TOOL_CALL`         | MCP-serververktøy påkalt          | Gateway policy-sjekk (serverstatus, verktøytillatelser, skjema)    | Blokker MCP-kall     |

## Hook-grensesnitt

Hver hook mottar en kontekst og returnerer et resultat. Behandleren er en synkron, ren funksjon.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Hook-spesifikk nyttelast varierer etter type
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` er synkron og returnerer `HookResult` direkte — ikke et Promise. Dette er med hensikt. Hooks må fullføres før handlingen fortsetter, og å gjøre dem synkrone eliminerer enhver mulighet for async-omgåelse. Hvis en hook timer ut, avvises handlingen. :::

## Hook-garantier

Hver hook-utførelse bærer fire invarianter:

| Garanti           | Hva det betyr                                                                                                                              |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Deterministisk** | Samme inndata gir alltid samme beslutning. Ingen tilfeldighet. Ingen LLM-kall inne i hooks. Ingen eksterne API-kall som påvirker beslutninger. |
| **Synkron**       | Hooks fullføres før handlingen fortsetter. Ingen async-omgåelse er mulig. Tidsavbrudd betyr avvisning.                                    |
| **Logget**        | Hver hook-utførelse registreres: inngangsparametere, beslutning tatt, tidsstempel og policy-regler evaluert.                              |
| **Uforfalskebare** | LLM-utdata kan ikke inneholde hook-omgåelsesinstruksjoner. Hook-laget har ingen "parse LLM-utdata for kommandoer"-logikk.                 |

## Policy-regelshierarki

Policy-regler er organisert i tre nivåer. Høyere nivåer kan ikke overstyre lavere nivåer.

### Faste regler (alltid håndhevet, IKKE konfigurerbare)

Disse reglene er hardkodet og kan ikke deaktiveres av noen admin, bruker eller konfigurasjon:

- **No write-down**: Klassifiseringsflyt er enrettet. Data kan ikke flyte til et lavere nivå.
- **UNTRUSTED-kanaler**: Ingen data inn eller ut. Punkt.
- **Session taint**: Når eskalert, forblir eskalert for sesjonens levetid.
- **Revisjonslogging**: Alle handlinger logges. Ingen unntak. Ingen måte å deaktivere på.

### Konfigurerbare regler (admin-justerbare)

Administratorer kan justere disse gjennom brukergrensesnittet eller konfigurasjonsfiler:

- Integrasjonsstandardklassifiseringer (f.eks. Salesforce standard til `CONFIDENTIAL`)
- Kanalklassifiseringer
- Handlings-tillat/avvis-lister per integrasjon
- Domene-tillat-lister for ekstern kommunikasjon
- Hastighetsbegrensninger per verktøy, per bruker eller per sesjon

### Deklarativt unntak (bedrift)

Bedriftsdistribusjoner kan definere tilpassede policy-regler i strukturert YAML for avanserte scenarier:

```yaml
# Blokker alle Salesforce-spørringer som inneholder SSN-mønstre
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[SSN REDIGERT]"
log_level: ALERT
notify: sikkerhetsteam@bedrift.no
```

```yaml
# Krev godkjenning for høyverdige transaksjoner
hook: PRE_TOOL_CALL
conditions:
  - tool_name: stripe.create_charge
  - parameter.amount: ">10000"
action: REQUIRE_APPROVAL
approvers:
  - role: finance-admin
timeout: 1h
timeout_action: DENY
```

```yaml
# Tidsbasert begrensning: ingen eksterne sendinger etter åpningstid
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "Ekstern kommunikasjon begrenset utenfor åpningstid"
```

::: tip Tilpassede YAML-regler må bestå validering før aktivering. Ugyldige regler avvises ved konfigurasjonstid, ikke under kjøring. Dette forhindrer feilkonfigurasjon fra å skape sikkerhetshull. :::

## Avvisningsbrukeropplevelse

Når policy-motoren blokkerer en handling, ser brukeren en klar forklaring — ikke en generisk feil.

**Standard (spesifikk):**

```
Jeg kan ikke sende konfidensielle data til en offentlig kanal.

  -> Tilbakestill sesjon og send melding
  -> Avbryt
```

**Opt-in (pedagogisk):**

```
Jeg kan ikke sende konfidensielle data til en offentlig kanal.

Hvorfor: Denne sesjonen fikk tilgang til Salesforce (CONFIDENTIAL).
WhatsApp personlig er klassifisert som PUBLIC.
Data kan bare flyte til lik eller høyere klassifisering.

Alternativer:
  -> Tilbakestill sesjon og send melding
  -> Be adminen reklassifisere WhatsApp-kanalen
  -> Lær mer: [dok-lenke]
```

Den pedagogiske modusen er opt-in og hjelper brukere å forstå _hvorfor_ en handling ble blokkert, inkludert hvilken datakilde som forårsaket taint-eskalering og hva klassifiseringsmismatch er. Begge modi tilbyr handlingsbare neste steg i stedet for blindveisfeil.

## Slik kjedes hooks sammen

I en typisk forespørsel/svar-syklus aktiveres flere hooks i sekvens. Hver hook har full synlighet av beslutningene tatt av tidligere hooks i kjeden.

```
Bruker sender: "Sjekk Salesforce-pipelinen min og send melding til kona"

1. PRE_CONTEXT_INJECTION
   - Inndata fra eier, klassifisert som PUBLIC
   - Session taint: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - Verktøy tillatt? JA
   - Bruker har Salesforce-tilkobling? JA
   - Hastighetsbegrensning? OK
   - Beslutning: ALLOW

3. POST_TOOL_RESPONSE (Salesforce-resultater)
   - Data klassifisert: CONFIDENTIAL
   - Session taint eskalerer: PUBLIC -> CONFIDENTIAL
   - Linjepost opprettet

4. PRE_TOOL_CALL (whatsapp.send_message)
   - Verktøy tillatt? JA
   - Beslutning: ALLOW (verktøynivåsjekk bestått)

5. PRE_OUTPUT (melding til kona via WhatsApp)
   - Session taint: CONFIDENTIAL
   - Mål effektiv klassifisering: PUBLIC (ekstern mottaker)
   - CONFIDENTIAL -> PUBLIC: BLOKKERT
   - Beslutning: BLOCK
   - Årsak: "classification_violation"

6. Agent presenterer tilbakestillingsalternativ til bruker
```
