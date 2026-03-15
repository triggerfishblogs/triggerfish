# Sessiebeheer

De agent kan sessies inspecteren, ermee communiceren en nieuwe spawnen. Deze tools maken workflows over sessies heen mogelijk, achtergrondtaakdelegatie en berichten sturen via kanalen — allemaal onder write-down-handhaving.

## Tools

### `sessions_list`

Alle actieve sessies weergeven die zichtbaar zijn voor de huidige sessie.

Heeft geen parameters. Resultaten worden gefilterd op taint-niveau — een `PUBLIC`-sessie kan geen `CONFIDENTIAL`-sessiemetadata zien.

### `sessions_history`

De berichtengeschiedenis ophalen voor een sessie op ID.

| Parameter    | Type   | Vereist | Beschrijving                                      |
| ------------ | ------ | ------- | ------------------------------------------------- |
| `session_id` | string | ja      | Het sessie-ID waarvoor de geschiedenis wordt opgehaald |

Toegang wordt geweigerd als de taint van de doelsessie hoger is dan de taint van de aanroeper.

### `sessions_send`

Inhoud verzenden van de huidige sessie naar een andere sessie. Onderhevig aan write-down-handhaving.

| Parameter    | Type   | Vereist | Beschrijving                              |
| ------------ | ------ | ------- | ----------------------------------------- |
| `session_id` | string | ja      | Doelsessie-ID                             |
| `content`    | string | ja      | De te verzenden berichtinhoud             |

**Write-down-controle:** De taint van de aanroeper moet naar het classificatieniveau van de doelsessie kunnen stromen. Een `CONFIDENTIAL`-sessie kan geen gegevens sturen naar een `PUBLIC`-sessie.

### `sessions_spawn`

Een nieuwe achtergrond-sessie spawnen voor een autonome taak.

| Parameter | Type   | Vereist | Beschrijving                                                      |
| --------- | ------ | ------- | ----------------------------------------------------------------- |
| `task`    | string | ja      | Beschrijving van wat de achtergrond-sessie moet doen              |

De gespawnde sessie start met onafhankelijke `PUBLIC`-taint en zijn eigen geïsoleerde werkruimte. Het draait autonoom en geeft resultaten terug wanneer voltooid.

### `session_status`

Metadata en status ophalen voor een specifieke sessie.

| Parameter    | Type   | Vereist | Beschrijving                    |
| ------------ | ------ | ------- | ------------------------------- |
| `session_id` | string | ja      | Het te controleren sessie-ID    |

Geeft sessie-ID, kanaal, gebruiker, taint-niveau en aanmaaktijdstip terug. Toegang is taint-geblokkeerd.

### `message`

Een bericht sturen naar een kanaal en ontvanger. Onderhevig aan write-down-handhaving via beleidshooks.

| Parameter   | Type   | Vereist | Beschrijving                                     |
| ----------- | ------ | ------- | ------------------------------------------------ |
| `channel`   | string | ja      | Doelkanaal (bijv. `telegram`, `slack`)           |
| `recipient` | string | ja      | Ontvangeridentificatie binnen het kanaal         |
| `text`      | string | ja      | Te verzenden berichttekst                        |

### `summarize`

Een beknopte samenvatting van het huidige gesprek genereren. Handig voor het aanmaken van overdrachtnotities, contextcompressie of het produceren van een samenvatting voor bezorging naar een ander kanaal.

| Parameter | Type   | Vereist | Beschrijving                                                   |
| --------- | ------ | ------- | -------------------------------------------------------------- |
| `scope`   | string | nee     | Wat samen te vatten: `session` (standaard), `topic`            |

### `simulate_tool_call`

Een toolaanroep simuleren om de beslissing van de beleidsengine te voorvertonen zonder de tool uit te voeren. Geeft het hookbeoordelingsresultaat terug (ALLOW, BLOCK of REDACT) en de geëvalueerde regels.

| Parameter   | Type   | Vereist | Beschrijving                                   |
| ----------- | ------ | ------- | ---------------------------------------------- |
| `tool_name` | string | ja      | De te simuleren tool                           |
| `args`      | object | nee     | Argumenten om in de simulatie op te nemen      |

::: tip Gebruik `simulate_tool_call` om te controleren of een toolaanroep wordt toegestaan voordat u het uitvoert. Dit is handig voor het begrijpen van beleidsgedrag zonder bijwerkingen. :::

## Gebruiksscenario's

### Delegatie van achtergrondtaken

De agent kan een achtergrond-sessie spawnen om een langdurige taak te verwerken zonder de huidige conversatie te blokkeren:

```
Gebruiker: "Onderzoek concurrentenprijzen en maak een samenvatting"
Agent: [roept sessions_spawn aan met de taak]
Agent: "Ik heb een achtergrond-sessie gestart om dat te onderzoeken. Ik heb snel resultaten."
```

### Communicatie over sessies heen

Sessies kunnen gegevens naar elkaar sturen, wat workflows mogelijk maakt waarbij één sessie gegevens produceert die een andere verbruikt:

```
Achtergrond-sessie voltooit onderzoek → sessions_send naar bovenliggende sessie → bovenliggende sessie meldt aan gebruiker
```

### Berichten sturen via kanalen

De `message`-tool laat de agent proactief contact opnemen via een verbonden kanaal:

```
Agent detecteert urgente gebeurtenis → message({ channel: "telegram", recipient: "owner", text: "Waarschuwing: ..." })
```

## Beveiliging

- Alle sessiebewerkingen zijn taint-geblokkeerd: u kunt sessies boven uw taint-niveau niet zien, lezen of ernaar sturen
- `sessions_send` handhaaft write-down-preventie: gegevens kunnen niet stromen naar een lagere classificatie
- Gespawnde sessies starten bij `PUBLIC`-taint met onafhankelijke taint-tracking
- De `message`-tool doorloopt `PRE_OUTPUT`-beleidshooks vóór bezorging
- Sessie-ID's worden geïnjecteerd vanuit de runtimecontext, niet vanuit LLM-argumenten — de agent kan een andere sessie niet nabootsen

::: warning BEVEILIGING Write-down-preventie wordt afgedwongen op alle communicatie over sessies heen. Een sessie besmet bij `CONFIDENTIAL` kan geen gegevens sturen naar een `PUBLIC`-sessie of -kanaal. Dit is een harde grens afgedwongen door de beleidslaag. :::
