# Agentdelegatie

Naarmate AI-agents steeds meer met elkaar interageren — de ene agent die een andere aanroept om subtaken te voltooien — ontstaat een nieuwe klasse beveiligingsrisico's. Een agentenketen kan worden gebruikt om gegevens te witwassen via een minder beperkte agent en classificatiecontroles te omzeilen. Triggerfish voorkomt dit met cryptografische agentidentiteit, classificatieplafonds en verplichte taint-overerving.

## Agentcertificaten

Elke agent in Triggerfish heeft een certificaat dat zijn identiteit, mogelijkheden en delegatierechten definieert. Dit certificaat is ondertekend door de eigenaar van de agent en kan niet worden gewijzigd door de agent zelf of door andere agents.

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Sales Assistant",
  "created_at": "2025-01-15T00:00:00Z",
  "expires_at": "2026-01-15T00:00:00Z",

  "owner": {
    "type": "user",
    "id": "user_456",
    "org_id": "org_789"
  },

  "capabilities": {
    "integrations": ["salesforce", "slack", "email"],
    "actions": ["read", "write", "send_message"],
    "max_classification": "CONFIDENTIAL"
  },

  "delegation": {
    "can_invoke_agents": true,
    "can_be_invoked_by": ["agent_def456", "agent_ghi789"],
    "max_delegation_depth": 3
  },

  "signature": "ed25519:xyz..."
}
```

Sleutelvelden in het certificaat:

| Veld                   | Doel                                                                                                                                                                                |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `max_classification`   | Het **classificatieplafond** — het hoogste taint-niveau waarop deze agent kan werken. Een agent met een INTERNAL-plafond kan niet worden aangeroepen door een sessie besmet tot CONFIDENTIAL. |
| `can_invoke_agents`    | Of deze agent andere agents mag aanroepen.                                                                                                                                          |
| `can_be_invoked_by`    | Expliciete acceptatielijst van agents die deze agent mogen aanroepen.                                                                                                               |
| `max_delegation_depth` | Maximale diepte van de agentaanroepketen. Voorkomt onbegrensde recursie.                                                                                                            |
| `signature`            | Ed25519-handtekening van de eigenaar. Voorkomt certificaatmanipulatie.                                                                                                              |

## Aanroepopdrachtstroom

Wanneer de ene agent een andere aanroept, verifieert de beleidslaag de delegatie voordat de aangeroepen agent wordt uitgevoerd. De controle is deterministisch en wordt uitgevoerd in code — de aanroepende agent kan de beslissing niet beïnvloeden.

<img src="/diagrams/agent-delegation-sequence.svg" alt="Agentdelegatievolgorde: Agent A roept Agent B aan, beleidslaag verifieert taint versus plafond en blokkeert wanneer taint het plafond overschrijdt" style="max-width: 100%;" />

In dit voorbeeld heeft Agent A een sessie-taint van CONFIDENTIAL (het heeft eerder Salesforce-gegevens benaderd). Agent B heeft een classificatieplafond van INTERNAL. Omdat CONFIDENTIAL hoger is dan INTERNAL, wordt de aanroep geblokkeerd. De besmette gegevens van Agent A kunnen niet stromen naar een agent met een lager classificatieplafond.

::: warning BEVEILIGING De beleidslaag controleert de **huidige sessie-taint** van de aanroeper, niet het plafond ervan. Zelfs als Agent A een CONFIDENTIAL-plafond heeft, is wat telt het werkelijke taint-niveau van de sessie op het moment van aanroep. Als Agent A geen geclassificeerde gegevens heeft benaderd (taint is PUBLIC), kan het Agent B (INTERNAL-plafond) zonder problemen aanroepen. :::

## Delegatieketentracering

Wanneer agents andere agents aanroepen, wordt de volledige keten bijgehouden met tijdstempels en taint-niveaus bij elke stap:

```json
{
  "invocation_id": "inv_123",
  "chain": [
    {
      "agent_id": "agent_abc",
      "agent_name": "Sales Assistant",
      "invoked_at": "2025-01-29T10:00:00Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Summarize Q4 pipeline"
    },
    {
      "agent_id": "agent_def",
      "agent_name": "Data Analyst",
      "invoked_at": "2025-01-29T10:00:01Z",
      "taint_at_invocation": "CONFIDENTIAL",
      "task": "Calculate win rates"
    }
  ],
  "max_depth_allowed": 3,
  "current_depth": 2
}
```

Deze keten wordt vastgelegd in het auditlog en kan worden bevraagd voor compliance en forensisch onderzoek. U kunt precies traceren welke agents betrokken waren, wat hun taint-niveaus waren en welke taken ze uitvoerden.

## Beveiligingsinvarianten

Vier invarianten bepalen agentdelegatie. Alle worden afgedwongen door code in de beleidslaag en kunnen niet worden overschreven door een agent in de keten.

| Invariant                         | Handhaving                                                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| **Taint neemt alleen toe**        | Elke aangeroepene erft `max(eigen taint, taint aanroeper)`. Een aangeroepene kan nooit een lagere taint hebben dan de aanroeper.                |
| **Plafond gerespecteerd**         | Een agent kan niet worden aangeroepen als de taint van de aanroeper het `max_classification`-plafond van de aangeroepene overschrijdt.          |
| **Dieptelimieten afgedwongen**    | De keten eindigt bij `max_delegation_depth`. Als de limiet 3 is, wordt een vierde-niveau aanroep geblokkeerd.                                   |
| **Circulaire aanroep geblokkeerd** | Een agent kan niet twee keer in dezelfde keten verschijnen. Als Agent A Agent B aanroept die Agent A probeert aan te roepen, wordt de tweede aanroep geblokkeerd. |

### Taint-overerving in detail

Wanneer Agent A (taint: CONFIDENTIAL) met succes Agent B aanroept (plafond: CONFIDENTIAL), begint Agent B met een taint van CONFIDENTIAL — geërfd van Agent A. Als Agent B dan RESTRICTED-gegevens benadert, escaleert zijn taint naar RESTRICTED. Dit verhoogde taint-niveau wordt teruggedragen naar Agent A wanneer de aanroep is voltooid.

<img src="/diagrams/taint-inheritance.svg" alt="Taint-overerving: Agent A (INTERNAL) roept Agent B aan, B erft taint, benadert Salesforce (CONFIDENTIAL), geeft verhoogde taint terug aan A" style="max-width: 100%;" />

Taint stroomt in beide richtingen — van aanroeper naar aangeroepene bij aanroeptijd, en van aangeroepene terug naar aanroeper bij voltooiing. Het kan alleen escaleren.

## Gegevenswassen voorkomen

Een belangrijk aanvalsvector in multi-agent-systemen is **gegevenswassen** — het gebruik van een agentenketen om geclassificeerde gegevens naar een lager-geclassificeerde bestemming te verplaatsen door ze via tussenliggende agents te routeren.

### De aanval

```
Aanvallersdoel: CONFIDENTIAL-gegevens exfiltreren via een PUBLIC-kanaal

Geprobeerde stroom:
1. Agent A benadert Salesforce (taint --> CONFIDENTIAL)
2. Agent A roept Agent B aan (die een PUBLIC-kanaal heeft)
3. Agent B verzendt gegevens naar het PUBLIC-kanaal
```

### Waarom het mislukt

Triggerfish blokkeert deze aanval op meerdere punten:

**Blokkeerpunt 1: Aanroepcontrole.** Als Agent B een plafond onder CONFIDENTIAL heeft, wordt de aanroep direct geblokkeerd. De taint van Agent A (CONFIDENTIAL) overschrijdt het plafond van Agent B.

**Blokkeerpunt 2: Taint-overerving.** Zelfs als Agent B een CONFIDENTIAL-plafond heeft en de aanroep slaagt, erft Agent B de CONFIDENTIAL-taint van Agent A. Wanneer Agent B probeert uit te voeren naar een PUBLIC-kanaal, blokkeert de `PRE_OUTPUT`-hook de write-down.

**Blokkeerpunt 3: Geen taint-reset in delegatie.** Agents in een delegatieketen kunnen hun taint niet resetten. Taint-reset is alleen beschikbaar voor de eindgebruiker, en het wist de volledige gespreksgeschiedenis. Er is geen mechanisme waarmee een agent zijn taint-niveau kan "wassen" tijdens een keten.

::: danger Gegevens kunnen hun classificatie niet ontsnappen via agentdelegatie. De combinatie van plafondcontroles, verplichte taint-overerving en geen-taint-reset-in-ketens maakt gegevenswassen via agentketens onmogelijk binnen het beveiligingsmodel van Triggerfish. :::

## Voorbeeldscenario's

### Scenario 1: Succesvolle delegatie

```
Agent A (plafond: CONFIDENTIAL, huidige taint: INTERNAL)
  roept Agent B aan (plafond: CONFIDENTIAL)

Beleidscontrole:
  - Kan A B aanroepen? JA (B staat op de delegatielijst van A)
  - Taint van A (INTERNAL) <= plafond van B (CONFIDENTIAL)? JA
  - Dieptelimiet OK? JA (diepte 1 van maximaal 3)
  - Circulair? NEE

Resultaat: TOEGESTAAN
Agent B start met taint: INTERNAL (geërfd van A)
```

### Scenario 2: Geblokkeerd door plafond

```
Agent A (plafond: RESTRICTED, huidige taint: CONFIDENTIAL)
  roept Agent B aan (plafond: INTERNAL)

Beleidscontrole:
  - Taint van A (CONFIDENTIAL) <= plafond van B (INTERNAL)? NEE

Resultaat: GEBLOKKEERD
Reden: Plafond Agent B (INTERNAL) onder sessie-taint (CONFIDENTIAL)
```

### Scenario 3: Geblokkeerd door dieptelimiet

```
Agent A roept Agent B aan (diepte 1)
  Agent B roept Agent C aan (diepte 2)
    Agent C roept Agent D aan (diepte 3)
      Agent D roept Agent E aan (diepte 4)

Beleidscontrole voor Agent E:
  - Diepte 4 > max_delegation_depth (3)

Resultaat: GEBLOKKEERD
Reden: Maximale delegatiediepte overschreden
```

### Scenario 4: Geblokkeerd door circulaire verwijzing

```
Agent A roept Agent B aan (diepte 1)
  Agent B roept Agent C aan (diepte 2)
    Agent C roept Agent A aan (diepte 3)

Beleidscontrole voor de tweede Agent A-aanroep:
  - Agent A verschijnt al in de keten

Resultaat: GEBLOKKEERD
Reden: Circulaire agentaanroep gedetecteerd
```

## Gerelateerde pagina's

- [Beveiligingsgericht ontwerp](./) — overzicht van de beveiligingsarchitectuur
- [No-write-down-regel](./no-write-down) — de classificatiestroomregel die delegatie handhaaft
- [Identiteit en authenticatie](./identity) — hoe gebruikers- en kanaalidentiteit wordt vastgesteld
- [Audit en compliance](./audit-logging) — hoe delegatieketens worden vastgelegd in het auditlog
