# Bestandssysteem en shelltools

Triggerfish geeft de agent algemene bestandssysteem- en shelltools voor het lezen, schrijven, zoeken en uitvoeren van opdrachten. Dit zijn de fundamentele tools waarop andere mogelijkheden (exec-omgeving, verkennen, skills) zijn gebouwd.

## Tools

### `read_file`

De inhoud lezen van een bestand op een absoluut pad.

| Parameter | Type   | Vereist | Beschrijving                    |
| --------- | ------ | ------- | ------------------------------- |
| `path`    | string | ja      | Absoluut bestandspad om te lezen |

Geeft de volledige tekstinhoud van het bestand terug.

### `write_file`

Inhoud schrijven naar een bestand op een werkruimte-relatief pad.

| Parameter | Type   | Vereist | Beschrijving                                 |
| --------- | ------ | ------- | -------------------------------------------- |
| `path`    | string | ja      | Relatief pad in de werkruimte                |
| `content` | string | ja      | Te schrijven bestandsinhoud                  |

Schrijfbewerkingen zijn beperkt tot de werkruimtemap van de agent. De agent kan niet naar willekeurige locaties op het bestandssysteem schrijven.

### `edit_file`

Een unieke tekenreeks vervangen in een bestand. De `old_text` moet precies één keer in het bestand voorkomen.

| Parameter  | Type   | Vereist | Beschrijving                                              |
| ---------- | ------ | ------- | --------------------------------------------------------- |
| `path`     | string | ja      | Absoluut bestandspad om te bewerken                       |
| `old_text` | string | ja      | Exacte te vinden tekst (moet uniek zijn in het bestand)   |
| `new_text` | string | ja      | Vervangende tekst                                         |

Dit is een chirurgische bewerkingstool — het vindt één exacte overeenkomst en vervangt deze. Als de tekst meer dan één keer of helemaal niet voorkomt, mislukt de bewerking met een fout.

### `list_directory`

Bestanden en mappen weergeven op een gegeven absoluut pad.

| Parameter | Type   | Vereist | Beschrijving                              |
| --------- | ------ | ------- | ----------------------------------------- |
| `path`    | string | ja      | Absoluut mappad om te weergeven           |

Geeft vermeldingen terug met `/`-achtervoegsel voor mappen.

### `search_files`

Zoeken naar bestanden die overeenkomen met een globpatroon, of bestandsinhoud doorzoeken met grep.

| Parameter        | Type    | Vereist | Beschrijving                                                                        |
| ---------------- | ------- | ------- | ----------------------------------------------------------------------------------- |
| `path`           | string  | ja      | Map om in te zoeken                                                                 |
| `pattern`        | string  | ja      | Globpatroon voor bestandsnamen, of tekst/regex om in bestanden te zoeken            |
| `content_search` | boolean | nee     | Als `true`, zoek bestandsinhoud in plaats van bestandsnamen                         |

### `run_command`

Een shellopdracht uitvoeren in de werkruimtemap van de agent.

| Parameter | Type   | Vereist | Beschrijving                         |
| --------- | ------ | ------- | ------------------------------------ |
| `command` | string | ja      | Uit te voeren shellopdracht          |

Geeft stdout, stderr en exitcode terug. Opdrachten worden uitgevoerd in de werkruimtemap van de agent. De `PRE_TOOL_CALL`-hook controleert opdrachten aan de hand van een denylist vóór uitvoering.

## Relatie met andere tools

Deze bestandssysteemtools overlappen met de [Exec-omgeving](../integrations/exec-environment)-tools (`exec.write`, `exec.read`, `exec.run`, `exec.ls`). Het onderscheid:

- **Bestandssysteemtools** werken op absolute paden en de standaardwerkruimte van de agent. Ze zijn altijd beschikbaar.
- **Exec-tools** werken binnen een gestructureerde werkruimte met expliciete isolatie, testrunners en pakketinstallatie. Ze maken deel uit van de exec-omgevingsintegratie.

De agent gebruikt bestandssysteemtools voor algemene bestandsbewerkingen en exec-tools bij het werken in een ontwikkelworkflow (schrijven/uitvoeren/repareren-lus).

## Beveiliging

- `write_file` is beperkt tot de werkruimtemap van de agent
- `run_command` doorloopt de `PRE_TOOL_CALL`-hook met de opdracht als context
- Een opdracht-denylist blokkeert gevaarlijke bewerkingen (`rm -rf /`, `sudo`, enz.)
- Alle toolreacties doorlopen `POST_TOOL_RESPONSE` voor classificatie en taint-tracking
- In planmodus is `write_file` geblokkeerd totdat het plan is goedgekeurd
