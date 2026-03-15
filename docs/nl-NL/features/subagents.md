# Sub-agents en LLM-taken

Triggerfish-agents kunnen werk delegeren aan sub-agents en geïsoleerde LLM-prompts uitvoeren. Dit maakt parallel werk, gerichte redenering en multi-agent taakverdeling mogelijk.

## Tools

### `subagent`

Een sub-agent spawnen voor een autonome meerstapstaak. De sub-agent krijgt zijn eigen gesprekscontext en kan tools onafhankelijk gebruiken. Geeft het eindresultaat terug wanneer voltooid.

| Parameter | Type   | Vereist | Beschrijving                                                           |
| --------- | ------ | ------- | ---------------------------------------------------------------------- |
| `task`    | string | ja      | Wat de sub-agent moet bereiken                                         |
| `tools`   | string | nee     | Kommagescheiden toolacceptatielijst (standaard: alleen-lezen tools)    |

**Standaardtools:** Sub-agents starten met alleen-lezen tools (`read_file`, `list_directory`, `search_files`, `run_command`). Geef aanvullende tools expliciet op als de sub-agent schrijftoegang nodig heeft.

**Voorbeeldgebruiken:**

- Onderzoek een onderwerp terwijl de hoofdagent ander werk doet
- Verken een codebase parallel vanuit meerdere hoeken (dit is wat de `explore`-tool intern doet)
- Delegeer een op zichzelf staande implementatietaak

### `llm_task`

Een eenmalige LLM-prompt uitvoeren voor geïsoleerde redenering. De prompt draait in een aparte context en vervuilt de hoofdgespreksgeschiedenis niet.

| Parameter | Type   | Vereist | Beschrijving                                      |
| --------- | ------ | ------- | ------------------------------------------------- |
| `prompt`  | string | ja      | De te verzenden prompt                            |
| `system`  | string | nee     | Optionele systeemprompt                           |
| `model`   | string | nee     | Optionele override van model/providernaam         |

**Voorbeeldgebruiken:**

- Een lang document samenvatten zonder de hoofdcontext te vullen
- Gegevens classificeren of extraheren uit gestructureerde tekst
- Een tweede mening krijgen over een aanpak
- Een prompt uitvoeren tegen een ander model dan het primaire

### `agents_list`

Geconfigureerde LLM-providers en agents weergeven. Heeft geen parameters.

Geeft informatie terug over beschikbare providers, hun modellen en configuratiestatus.

## Hoe sub-agents werken

Wanneer de agent `subagent` aanroept, doet Triggerfish het volgende:

1. Maakt een nieuw orchestrator-exemplaar aan met zijn eigen gesprekscontext
2. Geeft de sub-agent de opgegeven tools (standaard alleen-lezen)
3. Stuurt de taak als het initiële gebruikersbericht
4. De sub-agent draait autonoom — roept tools aan, verwerkt resultaten, itereert
5. Wanneer de sub-agent een eindantwoord produceert, wordt het teruggegeven aan de bovenliggende agent

Sub-agents erven het taint-niveau en de classificatiebeperkingen van de bovenliggende sessie. Ze kunnen niet escaleren voorbij het plafond van de bovenliggende sessie.

## Wanneer welke te gebruiken

| Tool       | Gebruik wanneer                                                    |
| ---------- | ------------------------------------------------------------------ |
| `subagent` | Meerstapstaak waarvoor toolgebruik en iteratie nodig is            |
| `llm_task` | Eenmalige redenering, samenvatting of classificatie                |
| `explore`  | Begrip van codebases (gebruikt intern sub-agents)                  |

::: tip De `explore`-tool is gebouwd bovenop `subagent` — het spawnt 2-6 parallelle sub-agents afhankelijk van het diepteniveau. Als u gestructureerde codebase-verkenning nodig heeft, gebruik dan `explore` direct in plaats van handmatig sub-agents te spawnen. :::

## Sub-agents versus agentteams

Sub-agents zijn "fire-and-forget": de bovenliggende agent wacht op één resultaat. [Agentteams](./agent-teams) zijn persistente groepen van samenwerkende agents met afzonderlijke rollen, een hoofdcoördinator en communicatie tussen leden. Gebruik sub-agents voor gerichte eenstapsdelegatie. Gebruik teams wanneer de taak baat heeft bij meerdere gespecialiseerde perspectieven die op elkaars werk itereren.
