# CLI-kanal

Kommandoradsgränssnittet är standardkanalen i Triggerfish. Det är alltid tillgängligt, kräver ingen extern installation och är det primära sättet du interagerar med din agent under utveckling och lokal användning.

## Klassificering

CLI-kanalen standard till `INTERNAL`-klassificering. Terminalanvändaren behandlas **alltid** som ägaren — det finns inget parnings- eller autentiseringsflöde eftersom du kör processen direkt på din dator.

::: info Varför INTERNAL? CLI är ett direkt, lokalt gränssnitt. Bara någon med åtkomst till din terminal kan använda det. Det gör `INTERNAL` till lämplig standard — din agent kan dela intern data fritt i det här sammanhanget. :::

## Funktioner

### Råterminalinmatning

CLI använder råterminalläge med fullständig ANSI-rymdsekvenssyntolkning. Det ger dig en rik redigeringsupplevelse direkt i din terminal:

- **Radediterig** — Navigera med piltangenter, Home/End, ta bort ord med Ctrl+W
- **Inmatningshistorik** — Tryck Upp/Ned för att bläddra igenom tidigare inmatningar
- **Förslag** — Tabb-komplettering för vanliga kommandon
- **Flerradinmatning** — Ange längre promptar naturligt

### Kompakt verktygsvisning

När agenten anropar verktyg visar CLI en kompakt enradssammanfattning som standard:

```
verktygsnamn arg  resultat
```

Växla mellan kompakt och utökad verktygsutdata med **Ctrl+O**.

### Avbryt körande operationer

Tryck **ESC** för att avbryta den aktuella operationen. Det skickar en avbrytningssignal via orkestratorn till LLM-leverantören och stoppar genereringen omedelbart. Du behöver inte vänta på att ett långt svar ska avslutas.

### Taint-visning

Du kan valfritt visa den aktuella session-taint-nivån i utdata genom att aktivera `showTaint` i CLI-kanalens konfiguration. Det förser varje svar med klassificeringsnivån:

```
[CONFIDENTIAL] Här är dina Q4-pipelinesiffror...
```

### Kontextlängdsförloppsbar

CLI visar en realtidskontextfönsteranvändningsbar i separatorlinjen längst ned i terminalen:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- Baren fylls när kontexttokens förbrukas
- En blå markör visas vid 70%-tröskeln (där automatisk komprimering utlöses)
- Baren blir röd när gränsen närmar sig
- Efter komprimering (`/compact` eller automatisk) återställs baren

### MCP-serversstatus

Separatorn visar också anslutningsstatus för MCP-servrar:

| Visning            | Betydelse                                      |
| ------------------ | ---------------------------------------------- |
| `MCP 3/3` (grön)   | Alla konfigurerade servrar anslutna            |
| `MCP 2/3` (gul)    | Vissa servrar ansluter fortfarande eller misslyckades |
| `MCP 0/3` (röd)    | Inga servrar anslutna                          |

MCP-servrar ansluter latent i bakgrunden efter start. Statusen uppdateras i realtid när servrar kommer online.

## Inmatningshistorik

Din inmatningshistorik bevaras mellan sessioner på:

```
~/.triggerfish/data/input_history.json
```

Historik laddas vid start och sparas efter varje inmatning. Du kan rensa den genom att ta bort filen.

## Icke-TTY / pipead inmatning

När stdin inte är en TTY (till exempel vid piping av indata från en annan process) faller CLI automatiskt tillbaka till **radBuffrat läge**. I det här läget:

- Råterminalfunktioner (piltangenter, historiknavigering) är inaktiverade
- Indata läses rad för rad från stdin
- Utdata skrivs till stdout utan ANSI-formatering

Det tillåter dig att scripta interaktioner med din agent:

```bash
echo "Vad är vädret idag?" | triggerfish run
```

## Konfiguration

CLI-kanalen kräver minimal konfiguration. Den skapas automatiskt när du kör `triggerfish run` eller använder den interaktiva REPL:en.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Alternativ    | Typ     | Standard | Beskrivning                                     |
| ------------- | ------- | -------- | ----------------------------------------------- |
| `interactive` | boolean | `true`   | Aktivera interaktivt REPL-läge                  |
| `showTaint`   | boolean | `false`  | Visa session-taint-nivå i utdata                |

::: tip Ingen installation krävs CLI-kanalen fungerar utan konfiguration. Du behöver inte konfigurera något för att börja använda Triggerfish från din terminal. :::

## Tangentbordsgenvägar

| Genväg     | Åtgärd                                                    |
| ---------- | ---------------------------------------------------------- |
| Enter      | Skicka meddelande                                         |
| Upp / Ned  | Navigera inmatningshistorik                               |
| Ctrl+V     | Klistra in bild från urklipp (skickas som multimodalt innehåll) |
| Ctrl+O     | Växla kompakt/utökad verktygsvisning                      |
| ESC        | Avbryt aktuell operation                                  |
| Ctrl+C     | Avsluta CLI                                               |
| Ctrl+W     | Ta bort föregående ord                                    |
| Home / End | Hoppa till start/slut av rad                              |
