# Filsystem og shell-verktøy

Triggerfish gir agenten generelle filsystem- og shell-verktøy for lesing,
skriving, søking og kjøring av kommandoer. Dette er de grunnleggende verktøyene
som andre funksjoner (exec-miljø, explore, ferdigheter) bygger på.

## Verktøy

### `read_file`

Les innholdet i en fil på en absolutt sti.

| Parameter | Type   | Påkrevd | Beskrivelse                    |
| --------- | ------ | ------- | ------------------------------ |
| `path`    | string | Ja      | Absolutt filsti som skal leses |

Returnerer fullt tekstinnhold av filen.

### `write_file`

Skriv innhold til en fil på en workspace-relativ sti.

| Parameter | Type   | Påkrevd | Beskrivelse                            |
| --------- | ------ | ------- | -------------------------------------- |
| `path`    | string | Ja      | Relativ sti i arbeidsområdet           |
| `content` | string | Ja      | Filinnhold som skal skrives            |

Skrivinger er scoped til agentens arbeidsområdekatalog. Agenten kan ikke skrive
til vilkårlige steder på filsystemet.

### `edit_file`

Erstatt en unik streng i en fil. `old_text` må forekomme nøyaktig én gang i filen.

| Parameter  | Type   | Påkrevd | Beskrivelse                                                |
| ---------- | ------ | ------- | ---------------------------------------------------------- |
| `path`     | string | Ja      | Absolutt filsti som skal redigeres                         |
| `old_text` | string | Ja      | Nøyaktig tekst som skal finnes (må være unik i filen)      |
| `new_text` | string | Ja      | Erstatningstekst                                           |

Dette er et kirurgisk redigeringsverktøy — det finner ett nøyaktig samsvar og
erstatter det. Hvis teksten forekommer mer enn én gang eller ikke i det hele tatt,
mislykkes operasjonen med en feil.

### `list_directory`

List filer og kataloger på en gitt absolutt sti.

| Parameter | Type   | Påkrevd | Beskrivelse                           |
| --------- | ------ | ------- | ------------------------------------- |
| `path`    | string | Ja      | Absolutt katalogsti som skal listes   |

Returnerer oppføringer med `/`-suffiks for kataloger.

### `search_files`

Søk etter filer som samsvarer med et glob-mønster, eller søk i filinnhold med grep.

| Parameter        | Type    | Påkrevd | Beskrivelse                                                               |
| ---------------- | ------- | ------- | ------------------------------------------------------------------------- |
| `path`           | string  | Ja      | Katalog å søke i                                                          |
| `pattern`        | string  | Ja      | Glob-mønster for filnavn, eller tekst/regex å søke i filinnhold           |
| `content_search` | boolean | Nei     | Hvis `true`, søk i filinnhold i stedet for filnavn                        |

### `run_command`

Kjør en shell-kommando i agentens arbeidsområdekatalog.

| Parameter | Type   | Påkrevd | Beskrivelse                  |
| --------- | ------ | ------- | ---------------------------- |
| `command` | string | Ja      | Shell-kommando som skal kjøres |

Returnerer stdout, stderr og avslutningskode. Kommandoer kjøres i agentens
arbeidsområdekatalog. `PRE_TOOL_CALL`-hooken sjekker kommandoer mot en
denylist før kjøring.

## Forhold til andre verktøy

Disse filsystemverktøyene overlapper med
[Exec-miljø](../integrations/exec-environment)-verktøyene (`exec.write`,
`exec.read`, `exec.run`, `exec.ls`). Forskjellen:

- **Filsystemverktøy** opererer på absolutte stier og agentens standard
  arbeidsområde. De er alltid tilgjengelige.
- **Exec-verktøy** opererer innenfor et strukturert arbeidsområde med eksplisitt
  isolasjon, testkjørere og pakkinstallasjon. De er del av exec-miljøintegrasjonen.

Agenten bruker filsystemverktøy for generelle filoperasjoner og exec-verktøy
når den arbeider i en utviklingsarbeidsflyt (skriv/kjør/fiks-løkke).

## Sikkerhet

- `write_file` er scoped til agentens arbeidsområdekatalog
- `run_command` passerer gjennom `PRE_TOOL_CALL`-hooken med kommandoen som kontekst
- En kommando-denylist blokkerer farlige operasjoner (`rm -rf /`, `sudo` osv.)
- Alle verktøysvar passerer gjennom `POST_TOOL_RESPONSE` for klassifisering og
  taint-sporing
- I planmodus er `write_file` blokkert inntil planen er godkjent
