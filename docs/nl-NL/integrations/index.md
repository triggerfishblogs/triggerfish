# Integraties bouwen

Triggerfish is ontworpen om te worden uitgebreid. Of u nu een nieuwe gegevensbron wilt koppelen, een workflow wilt automatiseren, uw agent nieuwe vaardigheden wilt geven of op externe gebeurtenissen wilt reageren — er is een goed gedefinieerd integratiepad, en elk pad respecteert hetzelfde beveiligingsmodel.

## Integratiepaden

Triggerfish biedt vijf verschillende manieren om het platform uit te breiden. Elk dient een ander doel, maar alle delen dezelfde beveiligingsgaranties: classificatiehandhaving, taint-tracking, beleidshooks en volledige auditlogboekregistratie.

| Pad                                          | Doel                                              | Het meest geschikt voor                                                                      |
| -------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [MCP Gateway](./mcp-gateway)                 | Externe toolservers verbinden                     | Gestandaardiseerde agent-naar-tool-communicatie via het Model Context Protocol               |
| [Plugins](./plugins)                         | De agent uitbreiden met aangepaste tools          | Door de agent gebouwde integraties, API-connectors, externe systeemqueries, workflows        |
| [Uitvoeringsomgeving](./exec-environment)    | Agent schrijft en draait zijn eigen code          | Integraties bouwen, prototypen, testen en itereren in een feedbacklus                        |
| [Skills](./skills)                           | De agent nieuwe mogelijkheden geven via instructies | Herbruikbaar gedrag, communitymarktplaats, zelfbewerking door agent                        |
| [Browserautomatisering](./browser)           | Een browserinstantie besturen via CDP             | Webonderzoek, formulieren invullen, scrapen, geautomatiseerde webworkflows                   |
| [Webhooks](./webhooks)                       | Inkomende gebeurtenissen ontvangen van externe services | Realtime reacties op e-mails, meldingen, CI/CD-gebeurtenissen, kalenderwijzigingen    |
| [GitHub](./github)                           | Volledige GitHub-workflowintegratie               | PR-beoordelingslussen, issue-triage, branchbeheer via webhooks + exec + skills               |
| [Google Workspace](./google-workspace)       | Gmail, Calendar, Tasks, Drive en Sheets verbinden | Gebundelde OAuth2-integratie met 14 tools voor Google Workspace                             |
| [Obsidian](./obsidian)                       | Obsidian-kluisnotities lezen, schrijven en zoeken | Classificatiebeheerde toegang tot notities met mapmappings, wikilinks en dagelijkse notities |

## Beveiligingsmodel

Elke integratie — ongeacht het pad — werkt onder dezelfde beveiligingsbeperkingen.

### Alles begint als UNTRUSTED

Nieuwe MCP-servers, plugins, kanalen en webhookbronnen zijn standaard ingesteld op de `UNTRUSTED`-status. Ze kunnen pas gegevens uitwisselen met de agent nadat ze expliciet zijn geclassificeerd door de eigenaar (persoonlijke tier) of beheerder (enterprise-tier).

```
UNTRUSTED  -->  CLASSIFIED  (na beoordeling, toegewezen classificatieniveau)
UNTRUSTED  -->  BLOCKED     (expliciet verboden)
```

### Classificatie stroomt door

Wanneer een integratie gegevens retourneert, dragen die gegevens een classificatieniveau. Toegang tot geclassificeerde gegevens escaleert de sessietaint om overeen te komen. Eenmaal besmet kan de sessie niet uitvoeren naar een bestemming met een lagere classificatie. Dit is de [No-Write-Down-regel](/nl-NL/security/no-write-down) — deze is vastgelegd en kan niet worden overschreden.

### Beleidshooks handhaven op elke grens

Alle integratie-acties doorlopen deterministische beleidshooks:

| Hook                    | Wanneer actief                                                        |
| ----------------------- | --------------------------------------------------------------------- |
| `PRE_CONTEXT_INJECTION` | Externe gegevens komen de agentcontext binnen (webhooks, pluginreacties) |
| `PRE_TOOL_CALL`         | Agent vraagt een toolaanroep aan (MCP, exec, browser)                 |
| `POST_TOOL_RESPONSE`    | Tool geeft gegevens terug (reactie classificeren, taint bijwerken)    |
| `PRE_OUTPUT`            | Reactie verlaat het systeem (definitieve classificatiecontrole)       |

Deze hooks zijn pure functies — geen LLM-aanroepen, geen willekeur, geen omleiding. Dezelfde invoer produceert altijd dezelfde beslissing.

### Audittrail

Elke integratie-actie wordt geregistreerd: wat er werd aangeroepen, wie het aanriep, wat de beleidsbeslissing was en hoe de sessietaint veranderde. Dit audittrail is onveranderlijk en beschikbaar voor nalevingscontrole.

::: warning BEVEILIGING De LLM kan beleidshookbeslissingen niet omzeilen, wijzigen of beïnvloeden. Hooks draaien in code onder de LLM-laag. De AI vraagt acties aan — de beleidslaag beslist. :::

## Het juiste pad kiezen

Gebruik deze beslissingshandreiking om het integratiepad te kiezen dat bij uw gebruik past:

- **U wilt een standaard toolserver verbinden** — Gebruik de [MCP Gateway](./mcp-gateway). Als een tool MCP spreekt, is dit het pad.
- **U moet aangepaste code uitvoeren tegen een externe API** — Gebruik [Plugins](./plugins). De agent kan plugins bouwen, scannen en laden tijdens uitvoering. Plugins draaien gesandboxed met beveiligingsscanning.
- **U wilt dat de agent code bouwt en itereert** — Gebruik de [Uitvoeringsomgeving](./exec-environment). De agent krijgt een werkruimte met een volledige schrijf/uitvoer/repareer-lus.
- **U wilt de agent een nieuw gedrag leren** — Gebruik [Skills](./skills). Schrijf een `SKILL.md` met instructies, of laat de agent zijn eigen schrijven.
- **U moet webinteracties automatiseren** — Gebruik [Browserautomatisering](./browser). CDP-bestuurde Chromium met domeinbeleidshandhaving.
- **U moet in realtime op externe gebeurtenissen reageren** — Gebruik [Webhooks](./webhooks). Inkomende gebeurtenissen worden geverifieerd, geclassificeerd en naar de agent gerouteerd.

::: tip Deze paden sluiten elkaar niet uit. Een skill kan intern browserautomatisering gebruiken. Een plugin kan worden geactiveerd door een webhook. Een door de agent geschreven integratie in de uitvoeringsomgeving kan worden opgeslagen als een skill. Ze kunnen van nature worden gecombineerd. :::
