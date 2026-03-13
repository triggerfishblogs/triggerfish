# Tide Pool / A2UI

De Tide Pool is een door de agent aangestuurde visuele werkruimte waar Triggerfish interactieve inhoud rendert: dashboards, grafieken, formulieren, codevoorbeelden en rijke media. In tegenstelling tot chat, dat een lineaire conversatie is, is de Tide Pool een canvas dat de agent bestuurt.

## Wat is A2UI?

A2UI (Agent-to-UI) is het protocol dat de Tide Pool aandrijft. Het definieert hoe de agent visuele inhoud en updates in realtime naar verbonden clients pusht. De agent beslist wat er wordt getoond; de client rendert het.

## Architectuur

<img src="/diagrams/tidepool-architecture.svg" alt="Tide Pool A2UI-architectuur: Agent pusht inhoud via Gateway naar Tide Pool Renderer op verbonden clients" style="max-width: 100%;" />

De agent gebruikt de `tide_pool`-tool om inhoud te pushen naar de Tide Pool Host die in de Gateway draait. De Host geeft updates door via WebSocket naar een verbonden Tide Pool Renderer op een ondersteund platform.

## Tide Pool-tools

De agent communiceert met de Tide Pool via deze tools:

| Tool              | Beschrijving                                         | Gebruiksscenario                                              |
| ----------------- | ---------------------------------------------------- | ------------------------------------------------------------- |
| `tidepool_render` | Een componentenstructuur renderen in de werkruimte   | Dashboards, formulieren, visualisaties, rijke inhoud          |
| `tidepool_update` | De props van een enkel component bijwerken op ID     | Incrementele updates zonder de hele weergave te vervangen     |
| `tidepool_clear`  | De werkruimte wissen, alle componenten verwijderen   | Sessieovergangen, opnieuw beginnen                            |

### Verouderde acties

De onderliggende host ondersteunt ook acties op lager niveau voor achterwaartse compatibiliteit:

| Actie      | Beschrijving                               |
| ---------- | ------------------------------------------ |
| `push`     | Ruwe HTML/JS-inhoud pushen                 |
| `eval`     | JavaScript uitvoeren in de sandbox         |
| `reset`    | Alle inhoud wissen                         |
| `snapshot` | Als afbeelding vastleggen                  |

## Gebruiksscenario's

De Tide Pool is ontworpen voor scenario's waarbij chat alleen onvoldoende is:

- **Dashboards** — De agent bouwt een live dashboard met statistieken van uw verbonden integraties.
- **Gegevensvisualisatie** — Grafieken en diagrammen weergegeven vanuit queryresultaten.
- **Formulieren en invoer** — Interactieve formulieren voor gestructureerde gegevensverzameling.
- **Codevoorbeelden** — Syntaxisgemarkeerde code met live uitvoeringsresultaten.
- **Rijke media** — Afbeeldingen, kaarten en ingesloten inhoud.
- **Collaboratief bewerken** — De agent presenteert een document voor u om te beoordelen en aantekeningen te maken.

## Hoe het werkt

1. U vraagt de agent iets te visualiseren (of de agent beslist dat een visueel antwoord passend is).
2. De agent gebruikt de `push`-actie om HTML en JavaScript naar de Tide Pool te sturen.
3. De Tide Pool Host van de Gateway ontvangt de inhoud en geeft deze door aan verbonden clients.
4. De renderer toont de inhoud in realtime.
5. De agent kan `eval` gebruiken om incrementele updates te maken zonder de volledige weergave te vervangen.
6. Wanneer de context verandert, gebruikt de agent `reset` om de werkruimte te wissen.

## Beveiligingsintegratie

Tide Pool-inhoud is onderhevig aan dezelfde beveiligingshandhaving als andere uitvoer:

- **PRE_OUTPUT-hook** — Alle inhoud die naar de Tide Pool wordt gepusht, doorloopt de PRE_OUTPUT-handhavingshook vóór rendering. Geclassificeerde gegevens die het uitvoerbeleid schenden, worden geblokkeerd.
- **Sessie-taint** — Gerenderde inhoud erft het taint-niveau van de sessie. Een Tide Pool met `CONFIDENTIAL`-gegevens is zelf `CONFIDENTIAL`.
- **Snapshotclassificatie** — Tide Pool-snapshots worden geclassificeerd op het taint-niveau van de sessie op het moment van vastleggen.
- **JavaScript-sandboxing** — JavaScript uitgevoerd via `eval` is gesandboxed binnen de Tide Pool-context. Het heeft geen toegang tot het hostsysteem, netwerk of bestandssysteem.
- **Geen netwerktoegang** — De Tide Pool-runtime kan geen netwerkverzoeken doen. Alle gegevens stromen via de agent en de beleidslaag.

## Statusindicatoren

De Tidepool-webinterface bevat realtime statusindicatoren:

### Contextlengteбalk

Een gestylede voortgangsbalk die het gebruik van het contextvenster toont — hoeveel van het contextvenster van het LLM is verbruikt. De balk wordt bijgewerkt na elk bericht en na compactie.

### MCP-serverstatus

Toont de verbindingsstatus van geconfigureerde MCP-servers (bijv. "MCP 3/3"). Kleurgecodeerd: groen voor allemaal verbonden, geel voor gedeeltelijk, rood voor geen.

### Beveiligde geheimtoegang

Wanneer de agent u een geheim wil laten invoeren (via de `secret_save`-tool), toont Tidepool een beveiligd invoervenster. De ingevoerde waarde gaat direct naar de sleutelhanger — het wordt nooit via de chat verzonden of zichtbaar in de gespreksgeschiedenis.

::: tip Denk aan de Tide Pool als het whiteboard van de agent. Terwijl chat de manier is waarop u met de agent praat, is de Tide Pool waar de agent u dingen laat zien. :::
