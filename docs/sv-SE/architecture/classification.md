# Klassificeringssystem

Dataklassificeringssystemet är grunden för Triggerfish säkerhetsmodell. Varje dataelement som går in i, rör sig genom eller lämnar systemet bär en klassificeringsetikett. Dessa etiketter avgör vart data kan flöda — och viktigare, vart det inte kan.

## Klassificeringsnivåer

Triggerfish använder en enda fyranivåad ordnad hierarki för alla driftsättningar.

| Nivå           | Rang          | Beskrivning                                               | Exempel                                                                  |
| -------------- | ------------- | --------------------------------------------------------- | ------------------------------------------------------------------------ |
| `RESTRICTED`   | 4 (högst)     | Mest känslig data som kräver maximalt skydd               | Fusionsdokument, styrelsematerial, personuppgifter, bankkonton, journaler |
| `CONFIDENTIAL` | 3             | Affärskänslig eller personkänslig information             | CRM-data, ekonomi, HR-poster, kontrakt, skatteuppgifter                  |
| `INTERNAL`     | 2             | Inte avsedd för extern delning                            | Interna wikis, teamdokument, personliga anteckningar, kontakter           |
| `PUBLIC`       | 1 (lägst)     | Säker för alla att se                                     | Marknadsföringsmaterial, offentlig dokumentation, allmänt webbinnehåll   |

## Nedskrivningsförbudet

Den enskilt viktigaste säkerhetsprincipen i Triggerfish:

::: danger Data kan bara flöda till kanaler eller mottagare med **lika eller högre** klassificering. Det här är en **fast regel** — den kan inte konfigureras, åsidosättas eller inaktiveras. LLM:en kan inte påverka det här beslutet. :::

<img src="/diagrams/classification-hierarchy.svg" alt="Klassificeringshierarki: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Data flödar bara uppåt." style="max-width: 100%;" />

Det innebär:

- Ett svar som innehåller `CONFIDENTIAL`-data kan inte skickas till en `PUBLIC`-kanal
- En session taintad vid `RESTRICTED` kan inte mata ut till någon kanal under `RESTRICTED`
- Det finns ingen admin-åsidosättning, ingen företagsundantagslucka och ingen LLM-omväg

## Effektiv klassificering

Kanaler och mottagare bär båda klassificeringsnivåer. När data är på väg att lämna systemet avgör **effektiv klassificering** för målet vad som kan skickas:

```
EFFEKTIV_KLASSIFICERING = min(kanalklassificering, mottagarklassificering)
```

Den effektiva klassificeringen är den _lägre_ av de två. Det innebär att en högt klassificerad kanal med en lågt klassificerad mottagare fortfarande behandlas som lågklassificerad.

| Kanal          | Mottagare  | Effektiv       | Kan ta emot CONFIDENTIAL-data?       |
| -------------- | ---------- | -------------- | ------------------------------------ |
| `INTERNAL`     | `INTERNAL` | `INTERNAL`     | Nej (CONFIDENTIAL > INTERNAL)        |
| `INTERNAL`     | `EXTERNAL` | `PUBLIC`       | Nej                                  |
| `CONFIDENTIAL` | `INTERNAL` | `INTERNAL`     | Nej (CONFIDENTIAL > INTERNAL)        |
| `CONFIDENTIAL` | `EXTERNAL` | `PUBLIC`       | Nej                                  |
| `RESTRICTED`   | `INTERNAL` | `INTERNAL`     | Nej (CONFIDENTIAL > INTERNAL)        |

## Kanalklassificeringsregler

Varje kanaltyp har specifika regler för att bestämma sin klassificeringsnivå.

### E-post

- **Domänmatchning**: `@company.com`-meddelanden klassificeras som `INTERNAL`
- Admin konfigurerar vilka domäner som är interna
- Okända eller externa domäner standard till `EXTERNAL`
- Externa mottagare minskar effektiv klassificering till `PUBLIC`

### Slack / Teams

- **Arbetsytemedlemskap**: Medlemmar av samma arbetsyta/klientorganisation är `INTERNAL`
- Slack Connect externa användare klassificeras som `EXTERNAL`
- Gästanvändare klassificeras som `EXTERNAL`
- Klassificering härleds från plattforms-API, inte från LLM-tolkning

### WhatsApp / Telegram / iMessage

- **Företag**: Telefonnummer matchade mot HR-katalogsynkronisering avgör internt kontra externt
- **Personlig**: Alla mottagare standard till `EXTERNAL`
- Användare kan markera betrodda kontakter, men det ändrar inte klassificeringsmatematiken — det ändrar mottagarklassificeringen

### WebChat

- WebChat-besökare klassificeras alltid som `PUBLIC` (besökare verifieras aldrig som ägare)
- WebChat är avsedd för publika interaktioner

### CLI

- CLI-kanalen körs lokalt och klassificeras baserat på den autentiserade användaren
- Direkt terminalåtkomst är vanligtvis `INTERNAL` eller högre

## Mottagarklassificeringskällor

### Företag

- **Katalogsynkronisering** (Okta, Azure AD, Google Workspace) fyller automatiskt i mottagarklassificeringar
- Alla katalogmedlemmar klassificeras som `INTERNAL`
- Externa gäster och leverantörer klassificeras som `EXTERNAL`
- Admins kan åsidosätta per kontakt eller per domän

### Personlig

- **Standard**: Alla mottagare är `EXTERNAL`
- Användare omklassificerar betrodda kontakter via in-flow-uppmaningar eller följeslagarappen
- Omklassificering är explicit och loggad

## Kanaltillstånd

Varje kanal går igenom en tillståndsmaskin innan den kan bära data:

<img src="/diagrams/state-machine.svg" alt="Kanaltillståndsmaskin: UNTRUSTED → CLASSIFIED eller BLOCKED" style="max-width: 100%;" />

| Tillstånd    | Kan ta emot data? | Kan skicka data till agentkontext? | Beskrivning                                                          |
| ------------ | :---------------: | :--------------------------------: | -------------------------------------------------------------------- |
| `UNTRUSTED`  | Nej               | Nej                                | Standard för nya/okända kanaler. Fullständigt isolerad.             |
| `CLASSIFIED` | Ja (inom policy)  | Ja (med klassificering)            | Granskad och tilldelad en klassificeringsnivå.                       |
| `BLOCKED`    | Nej               | Nej                                | Uttryckligen förbjuden av admin eller användare.                    |

::: warning SÄKERHET Nya kanaler hamnar alltid i `UNTRUSTED`-tillståndet. De kan inte ta emot data från agenten och kan inte skicka data till agentens kontext. Kanalen förblir fullständigt isolerad tills en admin (företag) eller användaren (personlig) uttryckligen klassificerar den. :::

## Hur klassificering samverkar med andra system

Klassificering är inte en fristående funktion — den driver beslut i hela plattformen:

| System                | Hur klassificering används                                                      |
| --------------------- | ------------------------------------------------------------------------------- |
| **Session-taint**     | Åtkomst till klassificerade data eskalerar sessionen till den nivån             |
| **Policy-hooks**      | PRE_OUTPUT jämför session-taint mot målklassificering                          |
| **MCP Gateway**       | MCP-servervar bär klassificering som taintar sessionen                          |
| **Datalinjegrafi**    | Varje linjegrafipost inkluderar klassificeringsnivå och orsak                  |
| **Notifieringar**     | Notifieringsinnehåll är föremål för samma klassificeringsregler                |
| **Agentdelegering**   | Kallad agents klassificeringstak måste uppfylla anroparens taint               |
| **Plugin-sandlåda**   | Plugin SDK klassificerar automatiskt all emitterad data                         |
