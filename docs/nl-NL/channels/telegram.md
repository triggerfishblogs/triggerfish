# Telegram

Verbind uw Triggerfish-agent met Telegram zodat u er van elk apparaat mee kunt communiceren waar u Telegram gebruikt. De adapter gebruikt het [grammY](https://grammy.dev/)-framework om te communiceren met de Telegram Bot API.

## Installatie

### Stap 1: Een bot aanmaken

1. Open Telegram en zoek naar [@BotFather](https://t.me/BotFather)
2. Stuur `/newbot`
3. Kies een weergavenaam voor uw bot (bijv. "Mijn Triggerfish")
4. Kies een gebruikersnaam voor uw bot (moet eindigen op `bot`, bijv. `mijn_triggerfish_bot`)
5. BotFather antwoordt met uw **bottoken** — kopieer het

::: warning Houd uw token geheim Uw bottoken geeft volledige controle over uw bot. Sla het nooit op in bronbeheer of deel het publiekelijk. Triggerfish slaat het op in uw OS-sleutelhanger. :::

### Stap 2: Uw Telegram-gebruikers-ID ophalen

Triggerfish heeft uw numerieke gebruikers-ID nodig om te verifiëren dat berichten van u zijn. Telegram-gebruikersnamen kunnen worden gewijzigd en zijn niet betrouwbaar voor identiteit — het numerieke ID is permanent en toegewezen door de servers van Telegram, zodat het niet kan worden nagemaakt.

1. Zoek naar [@getmyid_bot](https://t.me/getmyid_bot) op Telegram
2. Stuur het een bericht
3. Het antwoordt met uw gebruikers-ID (een nummer zoals `8019881968`)

### Stap 3: Het kanaal toevoegen

Voer de interactieve installatie uit:

```bash
triggerfish config add-channel telegram
```

Dit vraagt om uw bottoken, gebruikers-ID en classificatieniveau, schrijft vervolgens de configuratie naar `triggerfish.yaml` en biedt aan de daemon opnieuw te starten.

U kunt het ook handmatig toevoegen:

```yaml
channels:
  telegram:
    # botToken opgeslagen in OS-sleutelhanger
    ownerId: 8019881968
    classification: INTERNAL
```

| Optie            | Type   | Vereist | Beschrijving                                         |
| ---------------- | ------ | ------- | ---------------------------------------------------- |
| `botToken`       | string | Ja      | Bot API-token van @BotFather                         |
| `ownerId`        | number | Ja      | Uw numerieke Telegram-gebruikers-ID                  |
| `classification` | string | Nee     | Classificatieplafond (standaard: `INTERNAL`)          |

### Stap 4: Beginnen met chatten

Nadat de daemon opnieuw is gestart, opent u uw bot in Telegram en stuurt u `/start`. De bot begroet u om te bevestigen dat de verbinding actief is. Daarna kunt u direct met uw agent chatten.

## Classificatiegedrag

De `classification`-instelling is een **plafond** — het bepaalt de maximale gevoeligheid van gegevens die via dit kanaal kunnen stromen voor **eigenaar**gesprekken. Het is niet uniform van toepassing op alle gebruikers.

**Hoe het per bericht werkt:**

- **U stuurt een bericht naar de bot** (uw gebruikers-ID komt overeen met `ownerId`): De sessie gebruikt het kanaalplafond. Met de standaard `INTERNAL` kan uw agent interne gegevens met u delen.
- **Iemand anders stuurt een bericht naar de bot**: Hun sessie wordt automatisch besmet met `PUBLIC` ongeacht de kanaalclassificatie. De no-write-down-regel voorkomt dat interne gegevens hun sessie bereiken.

Dit betekent dat een enkele Telegram-bot veilig zowel eigenaar- als niet-eigenaarsgesprekken verwerkt. De identiteitscontrole vindt in code plaats voordat het LLM het bericht ziet — het LLM kan het niet beïnvloeden.

| Kanaalclassificatie      | Eigenaarberichten    | Niet-eigenaarberichten |
| ------------------------ | :------------------: | :--------------------: |
| `PUBLIC`                 | PUBLIC               | PUBLIC                 |
| `INTERNAL` (standaard)   | Tot INTERNAL         | PUBLIC                 |
| `CONFIDENTIAL`           | Tot CONFIDENTIAL     | PUBLIC                 |
| `RESTRICTED`             | Tot RESTRICTED       | PUBLIC                 |

Zie [Classificatiesysteem](/nl-NL/architecture/classification) voor het volledige model en [Sessies en taint](/nl-NL/architecture/taint-and-sessions) voor hoe taint-escalatie werkt.

## Eigenaaridentiteit

Triggerfish bepaalt eigenaarsrol door het numerieke Telegram-gebruikers-ID van de afzender te vergelijken met de geconfigureerde `ownerId`. Deze controle vindt in code plaats **voordat** het LLM het bericht ziet:

- **Overeenkomst** — Het bericht wordt gelabeld als eigenaar en heeft toegang tot gegevens tot het classificatieplafond van het kanaal
- **Geen overeenkomst** — Het bericht wordt gelabeld met `PUBLIC`-taint, en de no-write-down-regel voorkomt dat geclassificeerde gegevens naar die sessie stromen

::: danger Stel altijd uw eigenaar-ID in Zonder `ownerId` behandelt Triggerfish **alle** afzenders als de eigenaar. Iedereen die uw bot vindt, heeft toegang tot uw gegevens tot het classificatieniveau van het kanaal. Dit veld is vereist tijdens de installatie om deze reden. :::

## Berichtopsplitsing

Telegram heeft een berichtlimiet van 4.096 tekens. Wanneer uw agent een langer antwoord genereert, splitst Triggerfish het automatisch in meerdere berichten. De opsplitser splitst op regeleinden of spaties voor leesbaarheid — het vermijdt het doormidden knippen van woorden of zinnen.

## Ondersteunde berichttypen

De Telegram-adapter verwerkt momenteel:

- **Tekstberichten** — Volledige ondersteuning voor verzenden en ontvangen
- **Lange antwoorden** — Automatisch opgesplitst binnen de limieten van Telegram

## Typaanduidingen

Wanneer uw agent een verzoek verwerkt, toont de bot "typt..." in de Telegram-chat. De aanduiding loopt terwijl het LLM een antwoord genereert en verdwijnt wanneer het antwoord is verzonden.

## Classificatie wijzigen

Het classificatieplafond verhogen of verlagen:

```bash
triggerfish config add-channel telegram
# Selecteer om bestaande configuratie te overschrijven wanneer gevraagd
```

Of bewerk `triggerfish.yaml` direct:

```yaml
channels:
  telegram:
    # botToken opgeslagen in OS-sleutelhanger
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Geldige niveaus: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

Herstart de daemon na het wijzigen: `triggerfish stop && triggerfish start`
