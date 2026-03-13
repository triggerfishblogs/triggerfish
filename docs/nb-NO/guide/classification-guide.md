# Velge klassifiseringsnivåer

Hver kanal, MCP-server, integrasjon og plugin i Triggerfish må ha et klassifiseringsnivå. Denne siden hjelper deg å velge riktig.

## De fire nivåene

| Nivå             | Hva det betyr                                           | Data flyter til...                 |
| ---------------- | ------------------------------------------------------- | ---------------------------------- |
| **PUBLIC**       | Trygt for alle å se                                     | Hvor som helst                     |
| **INTERNAL**     | Kun for deg — ingenting sensitivt, men ikke offentlig   | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | Inneholder sensitive data du aldri vil at skal lekke    | CONFIDENTIAL, RESTRICTED           |
| **RESTRICTED**   | Mest sensitivt — juridisk, medisinsk, finansielt, PII   | Kun RESTRICTED                     |

Data kan bare flyte **oppover eller sidelengs**, aldri ned. Dette er [no-write-down-regelen](/nb-NO/security/no-write-down) og den kan ikke overstyres.

## To spørsmål å stille

For enhver integrasjon du konfigurerer, spør:

**1. Hva er de mest sensitive dataene denne kilden kan returnere?**

Dette bestemmer **minimums**-klassifiseringsnivået. Hvis en MCP-server kan returnere finansielle data, må den være minst CONFIDENTIAL — selv om de fleste av verktøyene returnerer ufarlig metadata.

**2. Ville jeg være komfortabel hvis sesjonsdata fløt _til_ denne destinasjonen?**

Dette bestemmer **maksimums**-klassifiseringsnivået du vil tildele. Et høyere klassifiseringsnivå betyr at session taint eskalerer når du bruker det, noe som begrenser hvor data kan flyte etterpå.

## Klassifisering etter datatype

| Datatype                                        | Anbefalt nivå    | Hvorfor                                        |
| ----------------------------------------------- | ---------------- | ---------------------------------------------- |
| Vær, offentlige nettsider, tidssoner            | **PUBLIC**       | Fritt tilgjengelig for alle                    |
| Dine personlige notater, bokmerker, oppgavelister | **INTERNAL**   | Privat, men ikke skadelig hvis eksponert       |
| Interne wikier, teamdokumenter, prosjekttavler  | **INTERNAL**     | Organisasjonsinternt innhold                   |
| E-post, kalenderbegivenheter, kontakter         | **CONFIDENTIAL** | Inneholder navn, tidsplaner, relasjoner        |
| CRM-data, salgspipeline, kundejournaler         | **CONFIDENTIAL** | Forretningssensitivt, kundedata                |
| Finansregistre, bankkontoer, fakturaer          | **CONFIDENTIAL** | Pengemessig informasjon                        |
| Kildekodedepoter (private)                      | **CONFIDENTIAL** | Immaterielle rettigheter                       |
| Medisinske eller helsejournaler                 | **RESTRICTED**   | Juridisk beskyttet (HIPAA osv.)                |
| Statlige ID-nummer, personnummer, pass          | **RESTRICTED**   | Risiko for identitetstyveri                    |
| Juridiske dokumenter, kontrakter under NDA      | **RESTRICTED**   | Juridisk eksponering                           |
| Krypteringsnøkler, legitimasjon, hemmeligheter  | **RESTRICTED**   | Risiko for systemkompromittering               |

## MCP-servere

Når du legger til en MCP-server i `triggerfish.yaml`, bestemmer klassifiseringen to ting:

1. **Session taint** — å kalle et verktøy på denne serveren eskalerer sesjonen til dette nivået
2. **Write-down-forebygging** — en sesjon som allerede er taint-eskalert over dette nivået kan ikke sende data _til_ denne serveren

```yaml
mcp_servers:
  # PUBLIC — åpne data, ingen sensitivitet
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — ditt eget filsystem, privat men ikke hemmeligheter
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/deg/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — tilgang til private repos, kundeproblemstillinger
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — database med PII, medisinske journaler, juridiske dokumenter
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning STANDARD AVVIS Hvis du utelater `classification`, registreres serveren som **UNTRUSTED** og gatewayen avviser alle verktøykall. Du må eksplisitt velge et nivå. :::

### Vanlige MCP-serverklassifiseringer

| MCP-server                             | Foreslått nivå   | Begrunnelse                                           |
| -------------------------------------- | ---------------- | ----------------------------------------------------- |
| Filsystem (offentlige dokumenter)      | PUBLIC           | Eksponerer kun offentlig tilgjengelige filer          |
| Filsystem (hjemmekatalog)              | INTERNAL         | Personlige filer, ingenting hemmelig                  |
| Filsystem (arbeidsprosjekter)          | CONFIDENTIAL     | Kan inneholde proprietær kode eller data              |
| GitHub (kun offentlige repos)          | INTERNAL         | Koden er offentlig, men bruksmønstre er private       |
| GitHub (private repos)                 | CONFIDENTIAL     | Proprietær kildekode                                  |
| Slack                                  | CONFIDENTIAL     | Arbeidsplassamtaler, muligens sensitive               |
| Database (analyse/rapportering)        | CONFIDENTIAL     | Aggregerte forretningsdata                            |
| Database (produksjon med PII)          | RESTRICTED       | Inneholder personidentifiserbar informasjon           |
| Vær / tid / kalkulator                 | PUBLIC           | Ingen sensitive data                                  |
| Nettsøk                                | PUBLIC           | Returnerer offentlig tilgjengelig informasjon         |
| E-post                                 | CONFIDENTIAL     | Navn, samtaler, vedlegg                               |
| Google Drive                           | CONFIDENTIAL     | Dokumenter kan inneholde sensitive forretningsdata    |

## Kanaler

Kanalklassifisering bestemmer **taket** — den maksimale sensitiviteten til data som kan leveres til den kanalen.

```yaml
channels:
  cli:
    classification: INTERNAL # Din lokale terminal — trygt for interne data
  telegram:
    classification: INTERNAL # Din private bot — samme som CLI for eieren
  webchat:
    classification: PUBLIC # Anonyme besøkende — kun offentlige data
  email:
    classification: CONFIDENTIAL # E-post er privat, men kan videresendes
```

::: tip EIER vs. IKKE-EIER For **eieren** har alle kanaler samme tillitsnivå — du er deg, uavhengig av hvilken app du bruker. Kanalklassifisering er viktigst for **ikke-eier-brukere** (besøkende på webchat, medlemmer i en Slack-kanal osv.) der den begrenser hvilke data som kan flyte til dem. :::

### Velge kanalklassifisering

| Spørsmål                                                                        | Hvis ja...              | Hvis nei...             |
| ------------------------------------------------------------------------------- | ----------------------- | ----------------------- |
| Kan en fremmed se meldinger på denne kanalen?                                   | **PUBLIC**              | Les videre              |
| Er denne kanalen kun for deg personlig?                                         | **INTERNAL** eller høyere | Les videre            |
| Kan meldinger videresendes, skjermdumpes eller logges av en tredjepart?         | Tak ved **CONFIDENTIAL** | Kan være **RESTRICTED** |
| Er kanalen ende-til-ende-kryptert og under din fulle kontroll?                  | Kan være **RESTRICTED** | Tak ved **CONFIDENTIAL** |

## Hva skjer når du gjør det galt

**For lavt (f.eks. CONFIDENTIAL-server merket PUBLIC):**

- Data fra denne serveren vil ikke eskalere session taint
- Sesjonen kan sende klassifiserte data til offentlige kanaler — **risiko for datalekkasje**
- Dette er den farlige retningen

**For høyt (f.eks. PUBLIC-server merket CONFIDENTIAL):**

- Session taint eskalerer unødvendig ved bruk av denne serveren
- Du vil bli blokkert fra å sende til lavere klassifiserte kanaler etterpå
- Irriterende, men **trygt** — ta feil på siden av for høyt

::: danger Når du er i tvil, **klassifiser høyere**. Du kan alltid senke det senere etter å ha gjennomgått hvilke data serveren faktisk returnerer. Underklassifisering er en sikkerhetsrisiko; overklassifisering er bare en ulempe. :::

## Taint-kaskaden

Å forstå den praktiske effekten hjelper deg å velge klokt. Her er hva som skjer i en sesjon:

```
1. Sesjon starter ved PUBLIC
2. Du spør om vær (PUBLIC-server)                 → taint forblir PUBLIC
3. Du sjekker notatene dine (INTERNAL filsystem)  → taint eskalerer til INTERNAL
4. Du spør GitHub-issues (CONFIDENTIAL)           → taint eskalerer til CONFIDENTIAL
5. Du prøver å poste til webchat (PUBLIC-kanal)   → BLOKKERT (write-down-brudd)
6. Du tilbakestiller sesjonen                     → taint returnerer til PUBLIC
7. Du poster til webchat                          → tillatt
```

Hvis du ofte bruker et CONFIDENTIAL-verktøy etterfulgt av en PUBLIC-kanal, vil du tilbakestille ofte. Vurder om verktøyet virkelig trenger CONFIDENTIAL, eller om kanalen kan reklassifiseres.

## Filsystemstier

Du kan også klassifisere individuelle filsystemstier, noe som er nyttig når agenten din har tilgang til kataloger med blandet sensitivitet:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/deg/public": PUBLIC
    "/home/deg/work/kunder": CONFIDENTIAL
    "/home/deg/juridisk": RESTRICTED
```

## Gjennomgangssjekkliste

Før du går live med en ny integrasjon:

- [ ] Hva er de verste dataene denne kilden kan returnere? Klassifiser på det nivået.
- [ ] Er klassifiseringen minst like høy som datatypetabellen foreslår?
- [ ] Hvis dette er en kanal, er klassifiseringen passende for alle mulige mottakere?
- [ ] Har du testet at taint-kaskaden fungerer for den typiske arbeidsflyten din?
- [ ] Når du var i tvil, klassifiserte du høyere heller enn lavere?

## Relaterte sider

- [No-Write-Down-regelen](/nb-NO/security/no-write-down) — den faste dataflytregelen
- [Konfigurasjon](/nb-NO/guide/configuration) — fullstendig YAML-referanse
- [MCP Gateway](/nb-NO/integrations/mcp-gateway) — MCP-serverens sikkerhetsmodell
