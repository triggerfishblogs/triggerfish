# Persistent geheugen

Triggerfish-agents hebben persistent geheugen over sessies heen. De agent kan feiten, voorkeuren en context opslaan die gesprekken, herstarten en zelfs trigger-wakeups overleven. Geheugen is classificatiegeblokkeerd — de agent kan niet lezen boven zijn sessie-taint of schrijven eronder.

## Tools

### `memory_save`

Een feit of stuk informatie opslaan in persistent geheugen.

| Parameter | Type   | Vereist | Beschrijving                                                          |
| --------- | ------ | ------- | --------------------------------------------------------------------- |
| `key`     | string | ja      | Unieke identificatie (bijv. `gebruiker-naam`, `project-deadline`)     |
| `content` | string | ja      | De op te slaan inhoud                                                 |
| `tags`    | array  | nee     | Tags voor categorisatie (bijv. `["persoonlijk", "voorkeur"]`)         |

Classificatie wordt **automatisch ingesteld** op het taint-niveau van de huidige sessie. De agent kan niet kiezen op welk niveau een geheugen wordt opgeslagen.

### `memory_get`

Een specifiek geheugen ophalen op sleutel.

| Parameter | Type   | Vereist | Beschrijving                               |
| --------- | ------ | ------- | ------------------------------------------ |
| `key`     | string | ja      | De sleutel van het op te halen geheugen    |

Geeft de geheugeninhoud terug als deze bestaat en toegankelijk is op het huidige beveiligingsniveau. Hogergeclassificeerde versies overschaduwen lagere.

### `memory_search`

Zoeken in alle toegankelijke herinneringen met behulp van natuurlijke taal.

| Parameter     | Type   | Vereist | Beschrijving                          |
| ------------- | ------ | ------- | ------------------------------------- |
| `query`       | string | ja      | Zoekopdracht in natuurlijke taal      |
| `max_results` | number | nee     | Maximale resultaten (standaard: 10)   |

Gebruikt SQLite FTS5 full-text zoeken met stammen. Resultaten worden gefilterd op het beveiligingsniveau van de huidige sessie.

### `memory_list`

Alle toegankelijke herinneringen weergeven, optioneel gefilterd op tag.

| Parameter | Type   | Vereist | Beschrijving          |
| --------- | ------ | ------- | --------------------- |
| `tag`     | string | nee     | Tag om op te filteren |

### `memory_delete`

Een geheugen verwijderen op sleutel. De record wordt zacht-verwijderd (verborgen maar bewaard voor audit).

| Parameter | Type   | Vereist | Beschrijving                                  |
| --------- | ------ | ------- | --------------------------------------------- |
| `key`     | string | ja      | De sleutel van het te verwijderen geheugen    |

Kan alleen herinneringen verwijderen op het beveiligingsniveau van de huidige sessie.

## Hoe geheugen werkt

### Auto-extractie

De agent slaat proactief belangrijke feiten op die de gebruiker deelt — persoonlijke gegevens, projectcontext, voorkeuren — met beschrijvende sleutels. Dit is gedrag op promptniveau geleid door SPINE.md. Het LLM kiest **wat** op te slaan; de beleidslaag bepaalt **op welk niveau**.

### Classificatiepoort

Elke geheugenrecord heeft een classificatieniveau gelijk aan de sessie-taint op het moment van opslaan:

- Een geheugen opgeslagen tijdens een `CONFIDENTIAL`-sessie wordt geclassificeerd als `CONFIDENTIAL`
- Een `PUBLIC`-sessie kan geen `CONFIDENTIAL`-herinneringen lezen
- Een `CONFIDENTIAL`-sessie kan zowel `CONFIDENTIAL`- als `PUBLIC`-herinneringen lezen

Dit wordt afgedwongen door `canFlowTo`-controles bij elke leesbewerking. Het LLM kan dit niet omzeilen.

### Geheugen-overschaduwing

Wanneer dezelfde sleutel op meerdere classificatieniveaus bestaat, wordt alleen de hoogstgeclassificeerde versie zichtbaar voor de huidige sessie teruggegeven. Dit voorkomt informatielekken over classificatiegrenzen heen.

**Voorbeeld:** Als `gebruiker-naam` bestaat op zowel `PUBLIC` (ingesteld tijdens een publieke chat) als `INTERNAL` (bijgewerkt tijdens een privésessie), ziet een `INTERNAL`-sessie de `INTERNAL`-versie, terwijl een `PUBLIC`-sessie alleen de `PUBLIC`-versie ziet.

### Opslag

Herinneringen worden opgeslagen via de `StorageProvider`-interface (dezelfde abstractie als voor sessies, cron-taken en todos). Full-text zoeken gebruikt SQLite FTS5 voor snelle zoekopdrachten in natuurlijke taal met stammen.

## Beveiliging

- Classificatie is altijd geforceerd naar `session.taint` in de `PRE_TOOL_CALL`-hook — het LLM kan geen lagere classificatie kiezen
- Alle reads worden gefilterd door `canFlowTo` — geen geheugen boven sessie-taint wordt ooit teruggegeven
- Verwijderingen zijn zacht-verwijderingen — de record is verborgen maar bewaard voor audit
- De agent kan geheugenclassificatie niet escaleren door hoog-geclassificeerde gegevens te lezen en ze op een lager niveau opnieuw op te slaan (write-down-preventie is van toepassing)

::: warning BEVEILIGING Het LLM kiest nooit geheugenclassificatie. Het wordt altijd geforceerd naar het taint-niveau van de huidige sessie door de beleidslaag. Dit is een harde grens die niet weg geconfigureerd kan worden. :::
