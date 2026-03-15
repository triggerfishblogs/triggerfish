# Beleidsengine en hooks

De beleidsengine is de handhavingslaag die zich bevindt tussen het LLM en de buitenwereld. Het onderschept elke actie op kritieke punten in de gegevensstroom en neemt deterministische ALLOW-, BLOCK- of REDACT-beslissingen. Het LLM kan deze beslissingen niet omzeilen, wijzigen of beïnvloeden.

## Kernprincipe: handhaving onder het LLM

<img src="/diagrams/policy-enforcement-layers.svg" alt="Beleidshankhanvinglagen: LLM bevindt zich boven de beleidslaag, die boven de uitvoeringslaag bevindt" style="max-width: 100%;" />

::: warning BEVEILIGING Het LLM bevindt zich boven de beleidslaag. Het kan prompt-geïnjecteerd, gekraakt of gemanipuleerd worden — en dat maakt niet uit. De beleidslaag is pure code die onder het LLM draait, gestructureerde actieverzoeken onderzoekt en binaire beslissingen neemt op basis van classificatieregels. Er is geen weg van LLM-uitvoer naar hook-omzeiling. :::

## Hook-typen

Acht handhavingshooks onderscheppen acties op elk kritiek punt in de gegevensstroom.

### Hook-architectuur

<img src="/diagrams/hook-chain-flow.svg" alt="Hook-ketenstroom: PRE_CONTEXT_INJECTION → LLM-context → PRE_TOOL_CALL → Tooluitvoering → POST_TOOL_RESPONSE → LLM-antwoord → PRE_OUTPUT → Uitvoerkanaal" style="max-width: 100%;" />

### Alle hook-typen

| Hook                    | Trigger                                  | Belangrijkste acties                                                            | Faalwijze                |
| ----------------------- | ---------------------------------------- | ------------------------------------------------------------------------------- | ------------------------ |
| `PRE_CONTEXT_INJECTION` | Externe invoer treedt context binnen     | Invoer classificeren, taint toewijzen, lineage aanmaken, scannen op injectie    | Invoer weigeren          |
| `PRE_TOOL_CALL`         | LLM vraagt tooluitvoering                | Machtigingscontrole, snelheidsbeperking, parametervalidatie                     | Toolaanroep blokkeren    |
| `POST_TOOL_RESPONSE`    | Tool retourneert gegevens                | Antwoord classificeren, sessie-taint bijwerken, lineage aanmaken/bijwerken      | Redigeren of blokkeren   |
| `PRE_OUTPUT`            | Antwoord staat op het punt systeem te verlaten | Definitieve classificatiecontrole tegen doel, PII-scan                    | Uitvoer blokkeren        |
| `SECRET_ACCESS`         | Plugin vraagt een inloggegevens          | Toegang vastleggen, machtiging verifiëren tegen gedeclareerd bereik             | Inloggegevens weigeren   |
| `SESSION_RESET`         | Gebruiker vraagt taint-reset             | Lineage archiveren, context wissen, bevestiging verifiëren                      | Bevestiging vereisen     |
| `AGENT_INVOCATION`      | Agent roept een andere agent aan         | Delegatieketen verifiëren, taint-plafond handhaven                              | Aanroep blokkeren        |
| `MCP_TOOL_CALL`         | MCP-server-tool aangeroepen              | Gateway-beleidscontrole (serverstatus, toolmachtigingen, schema)                | MCP-aanroep blokkeren    |

## Hook-interface

Elke hook ontvangt een context en retourneert een resultaat. De handler is een synchrone, pure functie.

```typescript
interface HookContext {
  readonly sessionId: SessionId;
  readonly hookType: HookType;
  readonly timestamp: Date;
  // Hook-specifieke payload verschilt per type
}

interface HookResult {
  readonly decision: "ALLOW" | "BLOCK" | "REDACT";
  readonly reason: string;
  readonly metadata?: Record<string, unknown>;
}

type HookHandler = (context: HookContext) => HookResult;
```

::: info `HookHandler` is synchroon en retourneert `HookResult` direct — geen Promise. Dit is bewust ontworpen. Hooks moeten voltooid zijn voordat de actie doorgaat, en ze synchroon maken elimineert elke mogelijkheid van async-omzeiling. Als een hook time-out krijgt, wordt de actie geweigerd. :::

## Hook-garanties

Elke hook-uitvoering draagt vier invarianten:

| Garantie           | Wat het betekent                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Deterministisch** | Dezelfde invoer levert altijd dezelfde beslissing op. Geen willekeur. Geen LLM-aanroepen in hooks. Geen externe API-aanroepen die beslissingen beïnvloeden. |
| **Synchroon**      | Hooks worden voltooid voordat de actie doorgaat. Geen async-omzeiling is mogelijk. Time-out is gelijk aan weigering.                 |
| **Vastgelegd**     | Elke hook-uitvoering wordt vastgelegd: invoerparameters, genomen beslissing, tijdstempel en geëvalueerde beleidsregels.              |
| **Onvervalsbaar**  | LLM-uitvoer kan geen hook-omzelingsinstructies bevatten. De hooklaag heeft geen logica voor "parseer LLM-uitvoer op opdrachten".     |

## Hiërarchie van beleidsregels

Beleidsregels zijn georganiseerd in drie lagen. Hogere lagen kunnen lagere lagen niet overschrijven.

### Vaste regels (altijd gehandhaafd, NIET configureerbaar)

Deze regels zijn hardgecodeerd en kunnen niet worden uitgeschakeld door een beheerder, gebruiker of configuratie:

- **Geen write-down**: Classificatiestroom is eenrichtingsverkeer. Gegevens kunnen niet naar een lager niveau stromen.
- **UNTRUSTED-kanalen**: Geen gegevens in of uit. Punt.
- **Sessie-taint**: Eenmaal verhoogd, blijft verhoogd voor de sessieduur.
- **Auditregistratie**: Alle acties vastgelegd. Geen uitzonderingen. Geen manier om uit te schakelen.

### Configureerbare regels (door beheerder afstembaar)

Beheerders kunnen deze aanpassen via de UI of configuratiebestanden:

- Standaardclassificaties van integraties (bijv. Salesforce is standaard `CONFIDENTIAL`)
- Kanaalclassificaties
- Actie-toestaan/weigeren-lijsten per integratie
- Domeinallowijsten voor externe communicaties
- Snelheidslimieten per tool, per gebruiker of per sessie

### Declaratieve ontsnappingsroute (enterprise)

Enterprise-implementaties kunnen aangepaste beleidsregels definiëren in gestructureerde YAML voor geavanceerde scenario's:

```yaml
# Blokkeer elke Salesforce-query die BSN-patronen bevat
hook: POST_TOOL_RESPONSE
conditions:
  - tool_name: salesforce.*
  - content_matches: '\b\d{3}-\d{2}-\d{4}\b'
action: REDACT
redaction_pattern: "[BSN VERWIJDERD]"
log_level: ALERT
notify: security-team@bedrijf.nl
```

```yaml
# Goedkeuring vereisen voor transacties van hoge waarde
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
# Tijdgebaseerde beperking: geen externe verzendingen buiten kantooruren
hook: PRE_OUTPUT
conditions:
  - recipient_type: EXTERNAL
  - time_of_day: "18:00-08:00"
  - day_of_week: "Mon-Fri"
action: BLOCK
reason: "Externe communicaties beperkt buiten kantooruren"
```

::: tip Aangepaste YAML-regels moeten validatie doorstaan voordat ze worden geactiveerd. Ongeldige regels worden geweigerd bij configuratietijd, niet bij runtime. Dit voorkomt dat misconfiguratie beveiligingsgaten creëert. :::

## Gebruikerservaring bij weigering

Wanneer de beleidsengine een actie blokkeert, ziet de gebruiker een duidelijke uitleg — geen generieke foutmelding.

**Standaard (specifiek):**

```
Ik kan geen vertrouwelijke gegevens naar een openbaar kanaal sturen.

  -> Sessie resetten en bericht versturen
  -> Annuleren
```

**Opt-in (educatief):**

```
Ik kan geen vertrouwelijke gegevens naar een openbaar kanaal sturen.

Waarom: Deze sessie heeft Salesforce (CONFIDENTIAL) geraadpleegd.
WhatsApp persoonlijk is geclassificeerd als PUBLIC.
Gegevens kunnen alleen stromen naar een gelijke of hogere classificatie.

Opties:
  -> Sessie resetten en bericht versturen
  -> Uw beheerder vragen het WhatsApp-kanaal opnieuw te classificeren
  -> Meer informatie: [documentatielink]
```

De educatieve modus is opt-in en helpt gebruikers begrijpen _waarom_ een actie was geblokkeerd, inclusief welke gegevensbron de taint-escalatie veroorzaakte en wat het classificatieverschil is. Beide modi bieden uitvoerbare vervolgstappen in plaats van doodlopende fouten.

## Hoe hooks aan elkaar worden gekoppeld

In een typische verzoek-/antwoordcyclus worden meerdere hooks achtereenvolgens geactiveerd. Elke hook heeft volledig zicht op de beslissingen van eerdere hooks in de keten.

```
Gebruiker stuurt: "Controleer mijn Salesforce-pipeline en stuur een bericht naar mijn partner"

1. PRE_CONTEXT_INJECTION
   - Invoer van eigenaar, geclassificeerd als PUBLIC
   - Sessie-taint: PUBLIC

2. PRE_TOOL_CALL (salesforce.query_opportunities)
   - Tool toegestaan? JA
   - Gebruiker heeft Salesforce-verbinding? JA
   - Snelheidslimiet? OK
   - Beslissing: ALLOW

3. POST_TOOL_RESPONSE (Salesforce-resultaten)
   - Gegevens geclassificeerd: CONFIDENTIAL
   - Sessie-taint escaleert: PUBLIC -> CONFIDENTIAL
   - Lineagerecord aangemaakt

4. PRE_TOOL_CALL (whatsapp.send_message)
   - Tool toegestaan? JA
   - Beslissing: ALLOW (toolniveaucontrole geslaagd)

5. PRE_OUTPUT (bericht naar partner via WhatsApp)
   - Sessie-taint: CONFIDENTIAL
   - Effectieve doelclassificatie: PUBLIC (externe ontvanger)
   - CONFIDENTIAL -> PUBLIC: GEBLOKKEERD
   - Beslissing: BLOCK
   - Reden: "classification_violation"

6. Agent presenteert resetoptie aan gebruiker
```
