# Underagenter och LLM-uppgifter

Triggerfish-agenter kan delegera arbete till underagenter och köra isolerade LLM-promptar. Det möjliggör parallellt arbete, fokuserat resonerande och flerstegsnedbrytning av uppgifter.

## Verktyg

### `subagent`

Skapa en underagent för en autonom flerstegsuppgift. Underagenten får sin egen konversationskontext och kan använda verktyg självständigt. Returnerar slutresultatet när det är klart.

| Parameter | Typ    | Obligatorisk | Beskrivning                                                      |
| --------- | ------ | ------------ | ---------------------------------------------------------------- |
| `task`    | string | Ja           | Vad underagenten ska åstadkomma                                  |
| `tools`   | string | Nej          | Kommaseparerad verktygsvitstlista (standard: skrivskyddade verktyg) |

**Standardverktyg:** Underagenter startar med skrivskyddade verktyg (`read_file`, `list_directory`, `search_files`, `run_command`). Ange ytterligare verktyg explicit om underagenten behöver skrivåtkomst.

**Exempelanvändningar:**

- Undersök ett ämne medan huvudagenten fortsätter annat arbete
- Utforska en kodbas parallellt från flera vinklar (det här är vad `explore`-verktyget gör internt)
- Delegera en självständig implementeringsuppgift

### `llm_task`

Kör en enstegs-LLM-prompt för isolerat resonerande. Prompten körs i ett separat sammanhang och förorenar inte den huvudsakliga konversationshistoriken.

| Parameter | Typ    | Obligatorisk | Beskrivning                                      |
| --------- | ------ | ------------ | ------------------------------------------------ |
| `prompt`  | string | Ja           | Prompten att skicka                              |
| `system`  | string | Nej          | Valfri systemprompt                              |
| `model`   | string | Nej          | Valfri modell/leverantörsnamnsöverstyrning       |

**Exempelanvändningar:**

- Sammanfatta ett långt dokument utan att fylla den huvudsakliga kontexten
- Klassificera eller extrahera data från strukturerad text
- Få en andra åsikt om en approach
- Kör en prompt mot en annan modell än den primära

### `agents_list`

Lista konfigurerade LLM-leverantörer och agenter. Tar inga parametrar.

Returnerar information om tillgängliga leverantörer, deras modeller och konfigurationsstatus.

## Hur underagenter fungerar

När agenten anropar `subagent` gör Triggerfish följande:

1. Skapar en ny orkestratorinstans med sin egen konversationskontext
2. Förser underagenten med de angivna verktygen (standard till skrivskyddade)
3. Skickar uppgiften som det initiala användarmeddelandet
4. Underagenten körs autonomt — anropar verktyg, bearbetar resultat, itererar
5. När underagenten producerar ett slutsvar returneras det till föräldragenten

Underagenter ärver föräldrasessionens taint-nivå och klassificeringsbegränsningar. De kan inte eskalera bortom förälderns tak.

## När man ska använda vilka

| Verktyg    | Använd när                                                        |
| ---------- | ----------------------------------------------------------------- |
| `subagent` | Flerstegsuppgift som kräver verktygsanvändning och iteration      |
| `llm_task` | Enkelt resonerande, sammanfattning eller klassificering           |
| `explore`  | Kodbasförståelse (använder underagenter internt)                  |

::: tip Verktyget `explore` är byggt ovanpå `subagent` — det skapar 2-6 parallella underagenter beroende på djupnivå. Om du behöver strukturerad kodbasutforskning, använd `explore` direkt istället för att manuellt skapa underagenter. :::

## Underagenter vs Agentteam

Underagenter är sköt-och-glöm: föräldern väntar på ett enda resultat. [Agentteam](./agent-teams) är beständiga grupper av samarbetande agenter med distinkta roller, en ledkoordinator och kommunikation mellan medlemmar. Använd underagenter för fokuserad delegation av enkla steg. Använd team när uppgiften drar nytta av flera specialiserade perspektiv som itererar på varandras arbete.
