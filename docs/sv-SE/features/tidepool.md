# Tide Pool / A2UI

Tide Pool är en agentstyrd visuell arbetsyta där Triggerfish renderar interaktivt innehåll: instrumentpaneler, diagram, formulär, kodförhandsgranskningar och rika media. Till skillnad från chatt, som är en linjär konversation, är Tide Pool en arbetsyta som agenten kontrollerar.

## Vad är A2UI?

A2UI (Agent-to-UI) är protokollet som driver Tide Pool. Det definierar hur agenten skickar visuellt innehåll och uppdateringar till anslutna klienter i realtid. Agenten bestämmer vad som ska visas; klienten renderar det.

## Arkitektur

<img src="/diagrams/tidepool-architecture.svg" alt="Tide Pool A2UI-arkitektur: Agent skickar innehåll via Gateway till Tide Pool-rendereraren på anslutna klienter" style="max-width: 100%;" />

Agenten använder verktyget `tide_pool` för att skicka innehåll till Tide Pool Host som körs i Gateway. Värden vidarebefordrar uppdateringar via WebSocket till alla anslutna Tide Pool-rendererare på en plattform som stöds.

## Tide Pool-verktyg

Agenten interagerar med Tide Pool via dessa verktyg:

| Verktyg           | Beskrivning                                       | Användningsfall                                         |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------- |
| `tidepool_render` | Rendera ett komponentträd i arbetsytan            | Instrumentpaneler, formulär, visualiseringar, rikt innehåll |
| `tidepool_update` | Uppdatera en enskild komponents props med ID      | Inkrementella uppdateringar utan att ersätta hela vyn   |
| `tidepool_clear`  | Rensa arbetsytan och ta bort alla komponenter     | Sessionsövergångar, börja om                            |

### Äldre åtgärder

Den underliggande värden stöder också åtgärder på lägre nivå för bakåtkompatibilitet:

| Åtgärd     | Beskrivning                            |
| ---------- | -------------------------------------- |
| `push`     | Skicka rå HTML/JS-innehåll             |
| `eval`     | Kör JavaScript i sandboxen             |
| `reset`    | Rensa allt innehåll                    |
| `snapshot` | Fånga som en bild                      |

## Användningsfall

Tide Pool är utformad för scenarier där chatt ensam är otillräcklig:

- **Instrumentpaneler** — Agenten bygger en live-instrumentpanel som visar mätvärden från dina anslutna integrationer.
- **Datavisualisering** — Diagram och grafer renderade från frågeresultat.
- **Formulär och inmatningar** — Interaktiva formulär för strukturerad datainsamling.
- **Kodförhandsgranskningar** — Syntaxmarkerad kod med live exekveringsresultat.
- **Rika media** — Bilder, kartor och inbäddat innehåll.
- **Samarbetsredigering** — Agenten presenterar ett dokument för dig att granska och kommentera.

## Hur det fungerar

1. Du ber agenten att visualisera något (eller agenten bestämmer att ett visuellt svar är lämpligt).
2. Agenten använder `push`-åtgärden för att skicka HTML och JavaScript till Tide Pool.
3. Gatewayens Tide Pool Host tar emot innehållet och vidarebefordrar det till anslutna klienter.
4. Rendereraren visar innehållet i realtid.
5. Agenten kan använda `eval` för att göra inkrementella uppdateringar utan att ersätta hela vyn.
6. När kontexten ändras använder agenten `reset` för att rensa arbetsytan.

## Säkerhetsintegration

Tide Pool-innehåll är underkastat samma säkerhetstillämpning som alla andra utdata:

- **PRE_OUTPUT-kroken** — Allt innehåll som skickas till Tide Pool passerar genom PRE_OUTPUT-tillämpningskroken innan rendering. Klassificerad data som bryter mot outputpolicyn blockeras.
- **Sessions-taint** — Renderat innehåll ärver sessionens taint-nivå. En Tide Pool som visar `CONFIDENTIAL`-data är i sig `CONFIDENTIAL`.
- **Ögonblicksbildsklassificering** — Tide Pool-ögonblicksbilder klassificeras vid sessionens taint-nivå vid tidpunkten för fångst.
- **JavaScript-sandboxning** — JavaScript som körs via `eval` är sandboxat inom Tide Pool-kontexten. Det har ingen åtkomst till värdsystemet, nätverk eller filsystem.
- **Ingen nätverksåtkomst** — Tide Pool-körtiden kan inte göra nätverksförfrågningar. All data flödar via agenten och policynivån.

## Statusindikatorer

Tidepool-webbgränssnittet inkluderar statusindikatorer i realtid:

### Kontextlängdsrad

En stilad förloppsrad som visar kontextfönstrets användning — hur mycket av LLM:ens kontextfönster som förbrukats. Raden uppdateras efter varje meddelande och efter komprimering.

### MCP-serverstatus

Visar anslutningsstatus för konfigurerade MCP-servrar (t.ex. "MCP 3/3"). Färgkodad: grön för alla anslutna, gul för delvis, röd för ingen.

### Säker hemlighetsinmatning

När agenten behöver att du anger en hemlighet (via `secret_save`-verktyget) visar Tidepool en säker inmatningspopup. Det angivna värdet går direkt till nyckelringen — det skickas aldrig via chatten eller visas i konversationshistoriken.

::: tip Tänk på Tide Pool som agentens whiteboard. Medan chatten är hur du pratar med agenten är Tide Pool där agenten visar dig saker. :::
