# Filsystem och Shell-verktyg

Triggerfish förser agenten med allmänna filsystem- och shell-verktyg för att läsa, skriva, söka och köra kommandon. Det här är grundläggande verktyg som andra funktioner (exec-miljön, explore, kunskaper) bygger på.

## Verktyg

### `read_file`

Läs innehållet i en fil med en absolut sökväg.

| Parameter | Typ    | Obligatorisk | Beskrivning                         |
| --------- | ------ | ------------ | ----------------------------------- |
| `path`    | string | Ja           | Absolut filsökväg att läsa          |

Returnerar filens fullständiga textinnehåll.

### `write_file`

Skriv innehåll till en fil med en arbetsyta-relativ sökväg.

| Parameter | Typ    | Obligatorisk | Beskrivning                              |
| --------- | ------ | ------------ | ---------------------------------------- |
| `path`    | string | Ja           | Relativ sökväg i arbetsytan              |
| `content` | string | Ja           | Filinnehåll att skriva                   |

Skrivningar är scoped till agentens arbetsytekatalog. Agenten kan inte skriva till godtyckliga platser på filsystemet.

### `edit_file`

Ersätt en unik sträng i en fil. `old_text` måste förekomma exakt en gång i filen.

| Parameter  | Typ    | Obligatorisk | Beskrivning                                           |
| ---------- | ------ | ------------ | ----------------------------------------------------- |
| `path`     | string | Ja           | Absolut filsökväg att redigera                        |
| `old_text` | string | Ja           | Exakt text att hitta (måste vara unik i filen)        |
| `new_text` | string | Ja           | Ersättningstext                                       |

Det här är ett kirurgiskt redigeringsverktyg — det hittar en exakt matchning och ersätter den. Om texten förekommer mer än en gång eller inte alls misslyckas operationen med ett fel.

### `list_directory`

Lista filer och kataloger vid en given absolut sökväg.

| Parameter | Typ    | Obligatorisk | Beskrivning                            |
| --------- | ------ | ------------ | -------------------------------------- |
| `path`    | string | Ja           | Absolut katalogsökväg att lista        |

Returnerar poster med `/`-suffix för kataloger.

### `search_files`

Sök efter filer som matchar ett glob-mönster, eller sök filinnehåll med grep.

| Parameter        | Typ     | Obligatorisk | Beskrivning                                                              |
| ---------------- | ------- | ------------ | ------------------------------------------------------------------------ |
| `path`           | string  | Ja           | Katalog att söka i                                                       |
| `pattern`        | string  | Ja           | Glob-mönster för filnamn, eller text/regex att söka inom filer           |
| `content_search` | boolean | Nej          | Om `true`, sök filinnehåll istället för filnamn                          |

### `run_command`

Kör ett shell-kommando i agentens arbetsytekatalog.

| Parameter | Typ    | Obligatorisk | Beskrivning                   |
| --------- | ------ | ------------ | ----------------------------- |
| `command` | string | Ja           | Shell-kommando att köra       |

Returnerar stdout, stderr och utgångskod. Kommandon körs i agentens arbetsytekatalog. `PRE_TOOL_CALL`-kroken kontrollerar kommandon mot en svartlista innan exekvering.

## Relation till andra verktyg

Dessa filsystemverktyg överlappar med [Exec-miljön](../integrations/exec-environment)-verktygen (`exec.write`, `exec.read`, `exec.run`, `exec.ls`). Skillnaden:

- **Filsystemverktyg** arbetar med absoluta sökvägar och agentens standardarbetsyta. De är alltid tillgängliga.
- **Exec-verktyg** arbetar inom en strukturerad arbetsyta med explicit isolering, testkörar och paketinstallation. De är en del av exec-miljöintegrationen.

Agenten använder filsystemverktyg för allmänna filoperationer och exec-verktyg när den arbetar i ett utvecklingsarbetsflöde (skriv/kör/reparera-slinga).

## Säkerhet

- `write_file` är scoped till agentens arbetsytekatalog
- `run_command` passerar genom `PRE_TOOL_CALL`-kroken med kommandot som kontext
- En kommandosvartlista blockerar farliga operationer (`rm -rf /`, `sudo`, etc.)
- Alla verktygssvar passerar genom `POST_TOOL_RESPONSE` för klassificering och taint-spårning
- I plansläge blockeras `write_file` tills planen är godkänd
