# Klassifiseringssystem

Dataklassifiseringssystemet er grunnlaget for Triggerfish sin sikkerhetsmodell. Hvert datastykke som kommer inn i, beveger seg gjennom eller forlater systemet bærer en klassifiseringsetikett. Disse etikettene bestemmer hvor data kan flyte — og viktigere, hvor det ikke kan.

## Klassifiseringsnivåer

Triggerfish bruker ett enkelt fire-nivå ordnet hierarki for alle distribusjoner.

| Nivå           | Rang        | Beskrivelse                                           | Eksempler                                                              |
| -------------- | ----------- | ----------------------------------------------------- | ---------------------------------------------------------------------- |
| `RESTRICTED`   | 4 (høyest)  | Mest sensitive data som krever maksimal beskyttelse   | M&A-dokumenter, styrematerialer, PII, bankkontoer, medisinske journaler |
| `CONFIDENTIAL` | 3           | Forretningssensitiv eller personlig sensitiv informasjon | CRM-data, økonomi, HR-journaler, kontrakter, skatteoppføringer       |
| `INTERNAL`     | 2           | Ikke ment for ekstern deling                          | Interne wikier, teamdokumenter, personlige notater, kontakter          |
| `PUBLIC`       | 1 (lavest)  | Trygt for alle å se                                   | Markedsføringsmateriell, offentlig dokumentasjon, generelt nettinnhold |

## No-Write-Down-regelen

Den viktigste sikkerhetsinvarianten i Triggerfish:

::: danger Data kan bare flyte til kanaler eller mottakere med **lik eller høyere** klassifisering. Dette er en **fast regel** — den kan ikke konfigureres, overstyres eller deaktiveres. LLM-en kan ikke påvirke denne beslutningen. :::

<img src="/diagrams/classification-hierarchy.svg" alt="Klassifiseringshierarki: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Data flyter kun oppover." style="max-width: 100%;" />

Dette betyr:

- Et svar som inneholder `CONFIDENTIAL`-data kan ikke sendes til en `PUBLIC`-kanal
- En sesjon tainted ved `RESTRICTED` kan ikke sende til noen kanal under `RESTRICTED`
- Det finnes ingen admin-overstyring, ingen bedriftsunntak og ingen LLM-omvei

## Effektiv klassifisering

Kanaler og mottakere bærer begge klassifiseringsnivåer. Når data er i ferd med å forlate systemet, bestemmer den **effektive klassifiseringen** av destinasjonen hva som kan sendes:

```
EFFEKTIV_KLASSIFISERING = min(kanal_klassifisering, mottaker_klassifisering)
```

Den effektive klassifiseringen er den _lavere_ av de to. Dette betyr at en høy-klassifisert kanal med en lav-klassifisert mottaker fortsatt behandles som lav-klassifisert.

| Kanal          | Mottaker   | Effektiv       | Kan motta CONFIDENTIAL-data?    |
| -------------- | ---------- | -------------- | -------------------------------- |
| `INTERNAL`     | `INTERNAL` | `INTERNAL`     | Nei (CONFIDENTIAL > INTERNAL)    |
| `INTERNAL`     | `EXTERNAL` | `PUBLIC`       | Nei                              |
| `CONFIDENTIAL` | `INTERNAL` | `INTERNAL`     | Nei (CONFIDENTIAL > INTERNAL)    |
| `CONFIDENTIAL` | `EXTERNAL` | `PUBLIC`       | Nei                              |
| `RESTRICTED`   | `INTERNAL` | `INTERNAL`     | Nei (CONFIDENTIAL > INTERNAL)    |

## Kanalklassifiseringsregler

Hver kanaltype har spesifikke regler for å bestemme klassifiseringsnivået.

### E-post

- **Domenesammenlikning**: `@bedrift.no`-meldinger klassifiseres som `INTERNAL`
- Admin konfigurerer hvilke domener som er interne
- Ukjente eller eksterne domener standard til `EXTERNAL`
- Eksterne mottakere reduserer effektiv klassifisering til `PUBLIC`

### Slack / Teams

- **Arbeidsplassmedlemskap**: Medlemmer av samme arbeidsrom/tenant er `INTERNAL`
- Slack Connect-eksterne brukere klassifiseres som `EXTERNAL`
- Gjestebrukere klassifiseres som `EXTERNAL`
- Klassifisering utledes fra plattform-API, ikke fra LLM-tolkning

### WhatsApp / Telegram / iMessage

- **Bedrift**: Telefonnumre sammenliknet mot HR-katalogsynkronisering bestemmer intern vs. ekstern
- **Personlig**: Alle mottakere standard til `EXTERNAL`
- Brukere kan merke betrodde kontakter, men dette endrer ikke klassifiseringsberegningen — det endrer mottakerklassifiseringen

### WebChat

- WebChat-besøkende er alltid klassifisert som `PUBLIC` (besøkende er aldri bekreftet som eier)
- WebChat er ment for offentlig-vendte interaksjoner

### CLI

- CLI-kanalen kjører lokalt og klassifiseres basert på den autentiserte brukeren
- Direkte terminaladgang er typisk `INTERNAL` eller høyere

## Mottakerklassifiseringskilder

### Bedrift

- **Katalogsynkronisering** (Okta, Azure AD, Google Workspace) fyller automatisk ut mottakerklassifiseringer
- Alle katalogmedlemmer klassifiseres som `INTERNAL`
- Eksterne gjester og leverandører klassifiseres som `EXTERNAL`
- Administratorer kan overstyre per kontakt eller per domene

### Personlig

- **Standard**: Alle mottakere er `EXTERNAL`
- Brukere reklassifiserer betrodde kontakter gjennom innflytingsprompter eller følgeappen
- Reklassifisering er eksplisitt og logget

## Kanaltilstander

Hver kanal går gjennom en tilstandsmaskin før den kan bære data:

<img src="/diagrams/state-machine.svg" alt="Kanaltilstandsmaskin: UNTRUSTED → CLASSIFIED eller BLOCKED" style="max-width: 100%;" />

| Tilstand     | Kan motta data?      | Kan sende data til agentkontekst? | Beskrivelse                                                           |
| ------------ | :------------------: | :-------------------------------: | --------------------------------------------------------------------- |
| `UNTRUSTED`  | Nei                  | Nei                               | Standard for nye/ukjente kanaler. Fullstendig isolert.               |
| `CLASSIFIED` | Ja (innenfor policy) | Ja (med klassifisering)           | Gjennomgått og tildelt et klassifiseringsnivå.                       |
| `BLOCKED`    | Nei                  | Nei                               | Eksplisitt forbudt av admin eller bruker.                            |

::: warning SIKKERHET Nye kanaler lander alltid i `UNTRUSTED`-tilstanden. De kan ikke motta data fra agenten og kan ikke sende data inn i agentkonteksten. Kanalen forblir fullstendig isolert inntil en admin (bedrift) eller brukeren (personlig) eksplisitt klassifiserer den. :::

## Hvordan klassifisering samhandler med andre systemer

Klassifisering er ikke en frittstående funksjon — det driver beslutninger på tvers av hele plattformen:

| System               | Hvordan klassifisering brukes                                               |
| -------------------- | --------------------------------------------------------------------------- |
| **Session taint**    | Tilgang til klassifiserte data eskalerer sesjonen til det nivået            |
| **Policy-hooks**     | PRE_OUTPUT sammenligner session taint mot destinasjonsklassifisering        |
| **MCP Gateway**      | MCP-serversvar bærer klassifisering som taint-er sesjonen                  |
| **Datalinje**        | Hver linjepost inkluderer klassifiseringsnivå og årsak                     |
| **Varsler**          | Varslingsinnhold er underlagt de samme klassifiseringsreglene               |
| **Agentdelegasjon**  | Kalt agents klassifiseringstak må møte kallerens taint                     |
| **Plugin-sandkasse** | Plugin SDK klassifiserer automatisk alle emitterte data                    |
