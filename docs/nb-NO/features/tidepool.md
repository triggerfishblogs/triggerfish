# Tide Pool / A2UI

Tide Pool er et agentdrevet visuelt arbeidsområde der Triggerfish gjengir
interaktivt innhold: dashbord, diagrammer, skjemaer, kodeforhåndsvisninger og
rike medier. I motsetning til chat, som er en lineær samtale, er Tide Pool et
lerret som agenten kontrollerer.

## Hva er A2UI?

A2UI (Agent-to-UI) er protokollen som driver Tide Pool. Den definerer hvordan
agenten sender visuelt innhold og oppdateringer til tilkoblede klienter i
sanntid. Agenten bestemmer hva som vises; klienten gjengir det.

## Arkitektur

<img src="/diagrams/tidepool-architecture.svg" alt="Tide Pool A2UI architecture: Agent pushes content through Gateway to Tide Pool Renderer on connected clients" style="max-width: 100%;" />

Agenten bruker `tide_pool`-verktøyet for å sende innhold til Tide Pool Host
som kjøres i Gateway-en. Verten videreformidler oppdateringer over WebSocket
til en hvilken som helst tilkoblet Tide Pool Renderer på en støttet plattform.

## Tide Pool-verktøy

Agenten samhandler med Tide Pool gjennom disse verktøyene:

| Verktøy           | Beskrivelse                                       | Brukstilfelle                                            |
| ----------------- | ------------------------------------------------- | -------------------------------------------------------- |
| `tidepool_render` | Gjengi et komponenttre i arbeidsområdet           | Dashbord, skjemaer, visualiseringer, rikt innhold        |
| `tidepool_update` | Oppdater en enkelt komponents props etter ID      | Inkrementelle oppdateringer uten å erstatte hele visningen|
| `tidepool_clear`  | Tøm arbeidsområdet, fjern alle komponenter        | Sesjonsoverganger, start på nytt                         |

### Eldre handlinger

Den underliggende verten støtter også lavnivåhandlinger for bakoverkompatibilitet:

| Handling   | Beskrivelse                              |
| ---------- | ---------------------------------------- |
| `push`     | Sender rå HTML/JS-innhold               |
| `eval`     | Kjører JavaScript i sandkassen          |
| `reset`    | Tømmer alt innhold                      |
| `snapshot` | Tar et bilde                            |

## Brukstilfeller

Tide Pool er designet for scenarier der chat alene er utilstrekkelig:

- **Dashbord** — Agenten bygger et live-dashbord som viser metrikker fra
  tilkoblede integrasjoner.
- **Datavisualisering** — Diagrammer og grafer gjengitt fra spørringsresultater.
- **Skjemaer og inndata** — Interaktive skjemaer for strukturert datainnsamling.
- **Kodeforhåndsvisninger** — Syntaks-uthevet kode med live kjøringsresultater.
- **Rike medier** — Bilder, kart og innebygd innhold.
- **Samarbeidende redigering** — Agenten presenterer et dokument for deg å
  gjennomgå og kommentere.

## Slik fungerer det

1. Du ber agenten om å visualisere noe (eller agenten bestemmer at et visuelt
   svar er passende).
2. Agenten bruker `push`-handlingen til å sende HTML og JavaScript til Tide Pool.
3. Gateway-ens Tide Pool Host mottar innholdet og sender det videre til tilkoblede
   klienter.
4. Rendereren viser innholdet i sanntid.
5. Agenten kan bruke `eval` for å gjøre inkrementelle oppdateringer uten å
   erstatte hele visningen.
6. Når konteksten endres, bruker agenten `reset` for å tømme arbeidsområdet.

## Sikkerhetsintegrasjon

Tide Pool-innhold er underlagt den samme sikkerhetshåndhevelsen som alle andre utdata:

- **PRE_OUTPUT-hook** — Alt innhold som sendes til Tide Pool passerer gjennom
  PRE_OUTPUT-håndhevelseshooken før gjengiving. Klassifisert data som bryter
  utdatapolicyen blokkeres.
- **Session taint** — Gjengitt innhold arver sesjonens taint-nivå. En Tide Pool
  som viser `CONFIDENTIAL`-data er i seg selv `CONFIDENTIAL`.
- **Øyeblikksbildeklassifisering** — Tide Pool-øyeblikksbilder klassifiseres på
  sesjonens taint-nivå på tidspunktet for opptak.
- **JavaScript-sandkasse** — JavaScript kjørt via `eval` er sandkasset innenfor
  Tide Pool-konteksten. Det har ingen tilgang til vertssystemet, nettverket eller
  filsystemet.
- **Ingen nettverkstilgang** — Tide Pool-kjøretiden kan ikke sende nettverks-
  forespørsler. All data flyter gjennom agenten og policy-laget.

## Statusindikatorer

Tidepool-nettgrensesnittet inkluderer sanntids-statusindikatorer:

### Kontekstlengde-stolpe

En stilisert fremdriftslinje som viser kontekstvindubruk — hvor mye av LLM-ens
kontekstvindu som er brukt. Linjen oppdateres etter hver melding og etter
komprimering.

### MCP-serverstatus

Viser tilkoblingsstatusen til konfigurerte MCP-servere (f.eks. «MCP 3/3»).
Fargekodet: grønn for alle tilkoblet, gul for delvis, rød for ingen.

### Sikker hemmelig inndata

Når agenten trenger at du skriver inn en hemmelighet (via `secret_save`-verktøyet),
viser Tidepool et sikkert inndatafelt. Den angitte verdien går direkte til nøkkelringen
— den sendes aldri gjennom chatten eller er synlig i samtalehistorikken.

::: tip Tenk på Tide Pool som agentens whiteboard. Mens chat er hvordan du snakker
med agenten, er Tide Pool der agenten viser deg ting. :::
