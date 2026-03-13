# CLI-kanaal

De opdrachtregelinterface is het standaardkanaal in Triggerfish. Het is altijd beschikbaar, vereist geen externe installatie en is de primaire manier waarop u met uw agent communiceert tijdens ontwikkeling en lokaal gebruik.

## Classificatie

Het CLI-kanaal is standaard ingesteld op `INTERNAL`-classificatie. De terminalgebruiker wordt **altijd** als eigenaar behandeld — er is geen koppel- of verificatiestroom omdat u het proces direct op uw machine uitvoert.

::: info Waarom INTERNAL? De CLI is een directe, lokale interface. Alleen iemand met toegang tot uw terminal kan het gebruiken. Dit maakt `INTERNAL` de juiste standaard — uw agent kan in deze context vrijelijk interne gegevens delen. :::

## Functies

### Onbewerkte terminalinvoer

De CLI gebruikt onbewerkte terminalmodus met volledige ANSI-escapereeksverwerking. Dit geeft u een rijke bewerkingservaring direct in uw terminal:

- **Regelbewerking** — Navigeer met pijltoetsen, Home/End, verwijder woorden met Ctrl+W
- **Invoergeschiedenis** — Druk op Omhoog/Omlaag om door eerdere invoeren te bladeren
- **Suggesties** — Tab-aanvulling voor veelgebruikte opdrachten
- **Meerdere regels invoer** — Voer langere prompts op natuurlijke wijze in

### Compacte tooltweergave

Wanneer de agent tools aanroept, toont de CLI standaard een compacte samenvatting op één regel:

```
tool_name arg  result
```

Schakel tussen compacte en uitgebreide tooluitvoer met **Ctrl+O**.

### Lopende bewerkingen onderbreken

Druk op **ESC** om de huidige bewerking te onderbreken. Dit stuurt een afbreeksignaal via de orchestrator naar de LLM-provider en stopt de generatie onmiddellijk. U hoeft niet te wachten tot een lang antwoord is voltooid.

### Taint-weergave

U kunt optioneel het huidige sessie-taint-niveau in de uitvoer weergeven door `showTaint` in te schakelen in de CLI-kanaalconfiguratie. Dit voegt het classificatieniveau toe aan elk antwoord:

```
[CONFIDENTIAL] Hier zijn uw Q4-pijplijncijfers...
```

### Voortgangsbalk contextlengte

De CLI toont een realtime gebruiksbalk voor het contextvenster in de scheidingslijn onderaan de terminal:

```
[████████████░░░░░░░░] 62% ctx  MCP 3/3
```

- De balk vult zich naarmate contexttokens worden verbruikt
- Een blauwe markering verschijnt bij de 70%-drempel (waar automatische compactie wordt geactiveerd)
- De balk wordt rood wanneer de limiet nadert
- Na compactie (`/compact` of automatisch) wordt de balk gereset

### MCP-serverstatus

De scheidingslijn toont ook de verbindingsstatus van MCP-servers:

| Weergave           | Betekenis                                       |
| ------------------ | ----------------------------------------------- |
| `MCP 3/3` (groen)  | Alle geconfigureerde servers verbonden          |
| `MCP 2/3` (geel)   | Sommige servers nog aan het verbinden of mislukt |
| `MCP 0/3` (rood)   | Geen servers verbonden                          |

MCP-servers verbinden lui op de achtergrond na het opstarten. De status wordt in realtime bijgewerkt naarmate servers online komen.

## Invoergeschiedenis

Uw invoergeschiedenis blijft bewaard over sessies heen op:

```
~/.triggerfish/data/input_history.json
```

Geschiedenis wordt geladen bij het opstarten en opgeslagen na elke invoer. U kunt het wissen door het bestand te verwijderen.

## Niet-TTY / Ingeleide invoer

Wanneer stdin geen TTY is (bijvoorbeeld bij het doorsturen van invoer van een ander proces), schakelt de CLI automatisch over naar **regelgebufferde modus**. In deze modus:

- Onbewerkte terminalfuncties (pijltoetsen, geschiedenisnavigatie) zijn uitgeschakeld
- Invoer wordt regel voor regel gelezen uit stdin
- Uitvoer wordt geschreven naar stdout zonder ANSI-opmaak

Hiermee kunt u interacties met uw agent scripten:

```bash
echo "Wat is het weer vandaag?" | triggerfish run
```

## Configuratie

Het CLI-kanaal vereist minimale configuratie. Het wordt automatisch aangemaakt wanneer u `triggerfish run` uitvoert of de interactieve REPL gebruikt.

```yaml
channels:
  cli:
    interactive: true
    showTaint: false
```

| Optie         | Type    | Standaard | Beschrijving                           |
| ------------- | ------- | --------- | -------------------------------------- |
| `interactive` | boolean | `true`    | Interactieve REPL-modus inschakelen    |
| `showTaint`   | boolean | `false`   | Sessie-taint-niveau in uitvoer tonen   |

::: tip Geen installatie vereist Het CLI-kanaal werkt direct uit de doos. U hoeft niets te configureren om Triggerfish vanuit uw terminal te gaan gebruiken. :::

## Sneltoetsen

| Sneltoets    | Actie                                                         |
| ------------ | ------------------------------------------------------------- |
| Enter        | Bericht verzenden                                             |
| Omhoog / Omlaag | Door invoergeschiedenis navigeren                          |
| Ctrl+V       | Afbeelding plakken uit klembord (verzonden als multimodale inhoud) |
| Ctrl+O       | Wisselen tussen compacte/uitgebreide tooltweergave            |
| ESC          | Huidige bewerking onderbreken                                 |
| Ctrl+C       | CLI afsluiten                                                 |
| Ctrl+W       | Vorig woord verwijderen                                       |
| Home / End   | Naar begin/einde van regel springen                           |
