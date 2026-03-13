# Classificatiesysteem

Het gegevensclassificatiesysteem is de basis van het beveiligingsmodel van Triggerfish. Elk stuk gegevens dat het systeem binnenkomt, doorloopt of verlaat, draagt een classificatielabel. Deze labels bepalen waarheen gegevens kunnen stromen — en nog belangrijker, waarheen ze niet kunnen.

## Classificatieniveaus

Triggerfish gebruikt één enkele vierniveaus geordende hiërarchie voor alle implementaties.

| Niveau         | Rang         | Beschrijving                                              | Voorbeelden                                                          |
| -------------- | ------------ | --------------------------------------------------------- | -------------------------------------------------------------------- |
| `RESTRICTED`   | 4 (hoogste)  | Meest gevoelige gegevens die maximale bescherming vereisen | F&O-documenten, bestuursmateriaal, PII, bankrekeningen, medische dossiers |
| `CONFIDENTIAL` | 3            | Bedrijfsgevoelige of persoonsgevoelige informatie         | CRM-gegevens, financiën, HR-dossiers, contracten, belastinggegevens  |
| `INTERNAL`     | 2            | Niet bedoeld voor extern delen                            | Interne wiki's, teamdocumenten, persoonlijke notities, contacten     |
| `PUBLIC`       | 1 (laagste)  | Veilig voor iedereen om te zien                           | Marketingmateriaal, openbare documentatie, algemene webinhoud        |

## De no-write-down-regel

De meest belangrijke beveiligingsinvariant in Triggerfish:

::: danger Gegevens kunnen alleen stromen naar kanalen of ontvangers met **gelijke of hogere** classificatie. Dit is een **vaste regel** — deze kan niet worden geconfigureerd, overschreven of uitgeschakeld. Het LLM kan deze beslissing niet beïnvloeden. :::

<img src="/diagrams/classification-hierarchy.svg" alt="Classificatiehiërarchie: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Gegevens stromen alleen omhoog." style="max-width: 100%;" />

Dit betekent:

- Een antwoord met `CONFIDENTIAL`-gegevens kan niet worden verzonden naar een `PUBLIC`-kanaal
- Een sessie die is besmet op `RESTRICTED` kan niet uitvoeren naar een kanaal onder `RESTRICTED`
- Er is geen beheerdersoverschrijving, geen enterprise-ontsnappingsroute en geen LLM-omzeiling

## Effectieve classificatie

Kanalen en ontvangers dragen beide classificatieniveaus. Wanneer gegevens het systeem gaan verlaten, bepaalt de **effectieve classificatie** van de bestemming wat kan worden verzonden:

```
EFFECTIEVE_CLASSIFICATIE = min(kanaal_classificatie, ontvanger_classificatie)
```

De effectieve classificatie is de _laagste_ van de twee. Dit betekent dat een kanaal met hoge classificatie en een ontvanger met lage classificatie nog steeds wordt behandeld als lage classificatie.

| Kanaal         | Ontvanger  | Effectief      | Kan CONFIDENTIAL-gegevens ontvangen? |
| -------------- | ---------- | -------------- | ------------------------------------ |
| `INTERNAL`     | `INTERNAL` | `INTERNAL`     | Nee (CONFIDENTIAL > INTERNAL)        |
| `INTERNAL`     | `EXTERNAL` | `PUBLIC`       | Nee                                  |
| `CONFIDENTIAL` | `INTERNAL` | `INTERNAL`     | Nee (CONFIDENTIAL > INTERNAL)        |
| `CONFIDENTIAL` | `EXTERNAL` | `PUBLIC`       | Nee                                  |
| `RESTRICTED`   | `INTERNAL` | `INTERNAL`     | Nee (CONFIDENTIAL > INTERNAL)        |

## Kanaalclassificatieregels

Elk kanaaltype heeft specifieke regels voor het bepalen van het classificatieniveau.

### E-mail

- **Domeinmatching**: `@bedrijf.nl`-berichten worden geclassificeerd als `INTERNAL`
- Beheerder configureert welke domeinen intern zijn
- Onbekende of externe domeinen zijn standaard `EXTERNAL`
- Externe ontvangers verminderen de effectieve classificatie naar `PUBLIC`

### Slack / Teams

- **Werkruimtelidmaatschap**: Leden van dezelfde werkruimte/tenant zijn `INTERNAL`
- Slack Connect externe gebruikers worden geclassificeerd als `EXTERNAL`
- Gastgebruikers worden geclassificeerd als `EXTERNAL`
- Classificatie afgeleid van platform-API, niet van LLM-interpretatie

### WhatsApp / Telegram / iMessage

- **Enterprise**: Telefoonnummers vergeleken met HR-directorysyncs bepalen intern versus extern
- **Persoonlijk**: Alle ontvangers zijn standaard `EXTERNAL`
- Gebruikers kunnen vertrouwde contacten markeren, maar dit verandert de classificatiewiskunde niet — het verandert de ontvangerclassificatie

### WebChat

- WebChat-bezoekers worden altijd geclassificeerd als `PUBLIC` (bezoekers worden nooit geverifieerd als eigenaar)
- WebChat is bedoeld voor publiekgerichte interacties

### CLI

- Het CLI-kanaal draait lokaal en wordt geclassificeerd op basis van de geverifieerde gebruiker
- Directe terminaltoegang is doorgaans `INTERNAL` of hoger

## Bronnen voor ontvangerclassificatie

### Enterprise

- **Directorysync** (Okta, Azure AD, Google Workspace) vult ontvangerclassificaties automatisch in
- Alle directoryleden worden geclassificeerd als `INTERNAL`
- Externe gasten en leveranciers worden geclassificeerd als `EXTERNAL`
- Beheerders kunnen per contact of per domein overschrijven

### Persoonlijk

- **Standaard**: Alle ontvangers zijn `EXTERNAL`
- Gebruikers herclassificeren vertrouwde contacten via in-flow-prompts of de companion-app
- Herclassificatie is expliciet en vastgelegd

## Kanaalstatussen

Elk kanaal doorloopt een toestandsmachine voordat het gegevens kan dragen:

<img src="/diagrams/state-machine.svg" alt="Kanaaltoestandsmachine: UNTRUSTED → CLASSIFIED of BLOCKED" style="max-width: 100%;" />

| Status       | Kan gegevens ontvangen? | Kan gegevens naar agentcontext sturen? | Beschrijving                                                   |
| ------------ | :---------------------: | :------------------------------------: | -------------------------------------------------------------- |
| `UNTRUSTED`  | Nee                     | Nee                                    | Standaard voor nieuwe/onbekende kanalen. Volledig geïsoleerd.  |
| `CLASSIFIED` | Ja (binnen beleid)      | Ja (met classificatie)                 | Beoordeeld en een classificatieniveau toegewezen.              |
| `BLOCKED`    | Nee                     | Nee                                    | Expliciet verboden door beheerder of gebruiker.                |

::: warning BEVEILIGING Nieuwe kanalen landen altijd in de `UNTRUSTED`-status. Ze kunnen geen gegevens van de agent ontvangen en kunnen geen gegevens in de agentcontext sturen. Het kanaal blijft volledig geïsoleerd totdat een beheerder (enterprise) of de gebruiker (persoonlijk) het expliciet classificeert. :::

## Hoe classificatie interageert met andere systemen

Classificatie is geen op zichzelf staande functie — het stuurt beslissingen in het hele platform:

| Systeem               | Hoe classificatie wordt gebruikt                                        |
| --------------------- | ----------------------------------------------------------------------- |
| **Sessie-taint**      | Het raadplegen van geclassificeerde gegevens escaleert de sessie naar dat niveau |
| **Beleidshooks**      | PRE_OUTPUT vergelijkt sessie-taint met bestemmingsclassificatie         |
| **MCP Gateway**       | MCP-serverreacties dragen classificatie die de sessie besmet            |
| **Gegevenslineage**   | Elke lineagerecord bevat het classificatieniveau en de reden            |
| **Meldingen**         | Meldingsinhoud is onderworpen aan dezelfde classificatieregels          |
| **Agentdelegatie**    | Het classificatieplafond van de callee-agent moet voldoen aan de taint van de caller |
| **Plugin-sandbox**    | Plugin SDK classificeert automatisch alle uitgezonden gegevens          |
