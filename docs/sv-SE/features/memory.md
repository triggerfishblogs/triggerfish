# Beständigt minne

Triggerfish-agenter har beständigt korsessionellt minne. Agenten kan spara fakta, preferenser och kontext som överlever konversationer, omstarter och till och med trigger-uppvakningar. Minnet är klassificeringsgransat — agenten kan inte läsa ovanför sin sessions-taint eller skriva under den.

## Verktyg

### `memory_save`

Spara en fakta eller information till beständigt minne.

| Parameter | Typ    | Obligatorisk | Beskrivning                                                      |
| --------- | ------ | ------------ | ---------------------------------------------------------------- |
| `key`     | string | Ja           | Unik identifierare (t.ex. `användarnamn`, `projektdeadline`)     |
| `content` | string | Ja           | Innehållet att komma ihåg                                        |
| `tags`    | array  | Nej          | Taggar för kategorisering (t.ex. `["personligt", "preferens"]`)  |

Klassificering ställs **automatiskt** till den aktuella sessionens taint-nivå. Agenten kan inte välja vilken nivå ett minne lagras på.

### `memory_get`

Hämta ett specifikt minne med dess nyckel.

| Parameter | Typ    | Obligatorisk | Beskrivning                          |
| --------- | ------ | ------------ | ------------------------------------ |
| `key`     | string | Ja           | Nyckeln för minnet att hämta         |

Returnerar minnets innehåll om det finns och är tillgängligt på den aktuella säkerhetsnivån. Versioner med högre klassificering överskuggar dem med lägre.

### `memory_search`

Sök bland alla tillgängliga minnen med naturligt språk.

| Parameter     | Typ    | Obligatorisk | Beskrivning                         |
| ------------- | ------ | ------------ | ----------------------------------- |
| `query`       | string | Ja           | Naturlig språksöksförfrågan         |
| `max_results` | number | Nej          | Maximalt antal resultat (standard: 10) |

Använder SQLite FTS5 fulltextsökning med stammning. Resultat filtreras av den aktuella sessionens säkerhetsnivå.

### `memory_list`

Lista alla tillgängliga minnen, valfritt filtrerade efter tagg.

| Parameter | Typ    | Obligatorisk | Beskrivning              |
| --------- | ------ | ------------ | ------------------------ |
| `tag`     | string | Nej          | Tagg att filtrera efter  |

### `memory_delete`

Ta bort ett minne med nyckel. Posten mjuktas (dold men behålls för revision).

| Parameter | Typ    | Obligatorisk | Beskrivning                      |
| --------- | ------ | ------------ | -------------------------------- |
| `key`     | string | Ja           | Nyckeln för minnet att ta bort   |

Kan bara ta bort minnen på den aktuella sessionens säkerhetsnivå.

## Hur minnet fungerar

### Automatisk extraktion

Agenten sparar proaktivt viktiga fakta som användaren delar — personliga detaljer, projektkont, preferenser — med beskrivande nycklar. Det här är beteende på promptnivå styrt av SPINE.md. LLM:en väljer **vad** som ska sparas; policynivån tvingar **på vilken nivå**.

### Klassificeringsgating

Varje minnespost bär en klassificeringsnivå som är lika med sessions-tainten vid det tillfälle den sparades:

- Ett minne sparat under en `CONFIDENTIAL`-session klassificeras `CONFIDENTIAL`
- En `PUBLIC`-session kan inte läsa `CONFIDENTIAL`-minnen
- En `CONFIDENTIAL`-session kan läsa både `CONFIDENTIAL`- och `PUBLIC`-minnen

Detta tillämpas via `canFlowTo`-kontroller på varje läsoperation. LLM:en kan inte kringgå detta.

### Minnesöverskuggning

När samma nyckel finns på flera klassificeringsnivåer returneras bara den högst klassificerade versionen som är synlig för den aktuella sessionen. Det förhindrar informationsläckor över klassificeringsgränser.

**Exempel:** Om `användarnamn` finns på både `PUBLIC` (satt under en offentlig chatt) och `INTERNAL` (uppdaterat under en privat session), ser en `INTERNAL`-session `INTERNAL`-versionen, medan en `PUBLIC`-session bara ser `PUBLIC`-versionen.

### Lagring

Minnen lagras via `StorageProvider`-gränssnittet (samma abstraktion som används för sessioner, cron-jobb och uppgifter). Fulltextsökning använder SQLite FTS5 för snabba naturligspråksfrågor med stammning.

## Säkerhet

- Klassificering tvingas alltid till `session.taint` i `PRE_TOOL_CALL`-kroken — LLM:en kan inte välja en lägre klassificering
- Alla läsningar filtreras av `canFlowTo` — inget minne ovanför sessions-taint returneras någonsin
- Borttagningar är mjukborttagningar — posten är dold men behålls för revision
- Agenten kan inte eskalera minnets klassificering genom att läsa högt klassificerad data och spara om den på en lägre nivå (nedskrivningsskydd gäller)

::: warning SÄKERHET LLM:en väljer aldrig minnets klassificering. Den tvingas alltid till den aktuella sessionens taint-nivå av policynivån. Det här är en hård gräns som inte kan konfigureras bort. :::
