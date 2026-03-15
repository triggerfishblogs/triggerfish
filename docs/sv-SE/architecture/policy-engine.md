# Policymotor och Hooks

Policymotorn är hanteringslagret som sitter mellan LLM:en och omvärlden. Den fångar upp varje åtgärd vid kritiska punkter i dataflödet och fattar deterministiska ALLOW-, BLOCK- eller REDACT-beslut. LLM:en kan inte kringgå, ändra eller påverka dessa beslut.

## Kärnprincip: Hantering under LLM-lagret

<img src="/diagrams/policy-enforcement-layers.svg" alt="Policyhanteringslager: LLM sitter ovanför policylagret, som sitter ovanför exekveringslagret" style="max-width: 100%;" />

::: warning SÄKERHET LLM:en sitter ovanför policylagret. Den kan prompt-injiceras, jailbreakass eller manipuleras — och det spelar ingen roll. Policylagret är ren kod som körs under LLM:en, undersöker strukturerade åtgärdsförfrågningar och fattar binära beslut baserat på klassificeringsregler. Det finns ingen väg från LLM-utdata till hook-kringgång. :::

## Hook-typer

Åtta hanteringshooks fångar upp åtgärder vid varje kritisk punkt i dataflödet.

### Hook-arkitektur

<img src="/diagrams/hook-chain-flow.svg" alt="Hook-kedjeflöde: PRE_CONTEXT_INJECTION → LLM-kontext → PRE_TOOL_CALL → Verktygsexekvering → POST_TOOL_RESPONSE → LLM-svar → PRE_OUTPUT → Utdatakanal" style="max-width: 100%;" />

### Alla hook-typer

| Hook                    | Utlösare                          | Nyckelåtgärder                                                               | Felsäkert läge       |
| ----------------------- | --------------------------------- | ---------------------------------------------------------------------------- | -------------------- |
| `PRE_CONTEXT_INJECTION` | Extern indata hamnar i kontext    | Klassificera indata, tilldela taint, skapa lineage, skanna för injektion     | Avvisa indata        |
| `PRE_TOOL_CALL`         | LLM begär verktygsexekvering      | Behörighetskontroll, hastighetsbegränsning, parametervalidering              | Blockera verktygsanrop |
| `POST_TOOL_RESPONSE`    | Verktyget returnerar data         | Klassificera svar, uppdatera session-taint, skapa/uppdatera lineage          | Redigera eller blockera |
| `PRE_OUTPUT`            | Svar är på väg att lämna systemet | Slutlig klassificeringskontroll mot mål, PII-skanning                        | Blockera utdata      |
| `SECRET_ACCESS`         | Plugin begär en autentiseringsuppgift | Logga åtkomst, verifiera behörighet mot deklarerat omfång                | Neka autentiseringsuppgift |
| `SESSION_RESET`         | Användare begär taint-återställning | Arkivera lineage, rensa kontext, verifiera bekräftelse                    | Kräv bekräftelse     |
| `AGENT_INVOCATION`      | Agent anropar en annan agent      | Verifiera delegeringskedja, tillämpa taint-tak                               | Blockera anrop       |
| `MCP_TOOL_CALL`         | MCP-serververktyg anropas         | Gateway-policykontroll (serverstatus, verktygsbehörigheter, schema)          | Blockera MCP-anrop   |

## Hook-gränssnitt

Varje hook tar emot ett sammanhang och returnerar ett resultat. Hanteraren är en synkron, ren funktion.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Hook-specifikt nyttolast varierar beroende på typ
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` är synkron och returnerar `HookResult` direkt — inte ett Promise. Det här är av design. Hooks måste slutföras innan åtgärden fortsätter, och att göra dem synkrona eliminerar varje möjlighet till asynkron kringgång. Om en hook tar för lång tid avvisas åtgärden. :::

## Hook-garantier

Varje hook-exekvering har fyra invarianter:

| Garanti          | Vad det innebär                                                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Deterministisk** | Samma indata ger alltid samma beslut. Ingen slumpmässighet. Inga LLM-anrop i hooks. Inga externa API-anrop som påverkar beslut.             |
| **Synkron**       | Hooks slutförs innan åtgärden fortsätter. Ingen asynkron kringgång är möjlig. Timeout innebär avvisning.                                    |
| **Loggad**        | Varje hook-exekvering registreras: indataparametrar, fattat beslut, tidsstämpel och utvärderade policyregler.                               |
| **Ofalsknlig**    | LLM-utdata kan inte innehålla hook-kringgångsinstruktioner. Hook-lagret har ingen "tolka LLM-utdata för kommandon"-logik.                    |

## Policyregelhierarki

Policyregler organiseras i tre nivåer. Högre nivåer kan inte åsidosätta lägre nivåer.

### Fasta regler (alltid tillämpade, INTE konfigurerbara)

Dessa regler är hårdkodade och kan inte inaktiveras av någon admin, användare eller konfiguration:

- **Inget nedskrivningsförbud**: Klassificeringsflöde är enkelriktat. Data kan inte flöda till en lägre nivå.
- **UNTRUSTED-kanaler**: Ingen data in eller ut. Punkt.
- **Session-taint**: När eskalerad, förblir eskalerad under sessionens livstid.
- **Revisionsloggning**: Alla åtgärder loggas. Inga undantag. Inget sätt att inaktivera.

### Konfigurerbara regler (administratörsjusterbara)

Administratörer kan justera dessa via UI eller konfigurationsfiler:

- Integrationsstandardklassificeringar (t.ex. Salesforce standard till `CONFIDENTIAL`)
- Kanalklassificeringar
- Åtgärds-tillåt/neka-listor per integration
- Domäntillåtningslistor för extern kommunikation
- Hastighetsgränser per verktyg, per användare eller per session

### Deklarativt undantag (företag)

Företagsdriftsättningar kan definiera anpassade policyregler i strukturerat YAML för avancerade scenarier:

```yaml
# Blockera Salesforce-frågor som innehåller personnummermönster
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[PERSONNUMMER BORTTAGET]"
log_level: ALERT
notify: security-team@company.com
```

```yaml
# Kräv godkännande för högt värderade transaktioner
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
# Tidsbaserad begränsning: inga externa sändningar efter arbetstid
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "Extern kommunikation begränsad utanför arbetstid"
```

::: tip Anpassade YAML-regler måste godkännas i validering innan aktivering. Ogiltiga regler avvisas vid konfigurationstid, inte vid körtid. Det förhindrar felkonfiguration från att skapa säkerhetsluckor. :::

## Neka-användarupplevelse

När policymotorn blockerar en åtgärd ser användaren en tydlig förklaring — inte ett generiskt fel.

**Standard (specifikt):**

```
Jag kan inte skicka konfidentiell data till en publik kanal.

  -> Återställ session och skicka meddelande
  -> Avbryt
```

**Opt-in (pedagogisk):**

```
Jag kan inte skicka konfidentiell data till en publik kanal.

Varför: Den här sessionen kom åt Salesforce (CONFIDENTIAL).
WhatsApp personlig är klassificerad som PUBLIC.
Data kan bara flöda till lika eller högre klassificering.

Alternativ:
  -> Återställ session och skicka meddelande
  -> Be din admin omklassificera WhatsApp-kanalen
  -> Läs mer: [docs-länk]
```

Det pedagogiska läget är opt-in och hjälper användare att förstå _varför_ en åtgärd blockerades, inklusive vilken datakälla som orsakade taint-eskaleringen och vad klassificeringsmissmatchningen är. Båda lägena erbjuder handlingsbara nästa steg snarare än återvändsgrändfel.

## Hur hooks kedjas ihop

I en typisk begäran/svar-cykel utlöses flera hooks i sekvens. Varje hook har full insyn i besluten från tidigare hooks i kedjan.

```
Användaren skickar: "Kontrollera min Salesforce-pipeline och meddela min fru"

1. PRE_CONTEXT_INJECTION
   - Indata från ägaren, klassificerad som PUBLIC
   - Session-taint: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - Verktyg tillåtet? JA
   - Användaren har Salesforce-anslutning? JA
   - Hastighetsgräns? OK
   - Beslut: ALLOW

3. POST_TOOL_RESPONSE (Salesforce-resultat)
   - Data klassificerad: CONFIDENTIAL
   - Session-taint eskalerar: PUBLIC -> CONFIDENTIAL
   - Linjegrafipost skapad

4. PRE_TOOL_CALL (whatsapp.send_message)
   - Verktyg tillåtet? JA
   - Beslut: ALLOW (verktygsnivåkontroll godkänns)

5. PRE_OUTPUT (meddelande till frun via WhatsApp)
   - Session-taint: CONFIDENTIAL
   - Effektiv målklassificering: PUBLIC (extern mottagare)
   - CONFIDENTIAL -> PUBLIC: BLOCKERAD
   - Beslut: BLOCK
   - Orsak: "classification_violation"

6. Agenten presenterar återställningsalternativ för användaren
```
