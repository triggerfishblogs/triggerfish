# Woordenlijst

| Term                         | Definitie                                                                                                                                                         |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Team**               | Een permanente groep samenwerkende agentsessies met afzonderlijke rollen. Één lid is de leidende agent die het werk coördineert. Aangemaakt via `team_create`, bewaakt met levenscycluscontroles. |
| **A2UI**                     | Agent-to-UI-protocol voor het in realtime pushen van visuele inhoud van de agent naar de Tide Pool-werkruimte.                                                    |
| **Achtergrondssessie**       | Een sessie gespawnd voor autonome taken (cron, triggers) die begint met verse PUBLIC-taint en draait in een geïsoleerde werkruimte.                                |
| **Buoy**                     | Een begeleidende native app (iOS, Android) die apparaatmogelijkheden zoals camera, locatie, schermopname en pushmeldingen levert aan de agent. (Binnenkort beschikbaar.) |
| **Classificatie**            | Een gevoeligheidslabel toegewezen aan gegevens, kanalen en ontvangers. Vier niveaus: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC.                                  |
| **Cron**                     | Een geplande terugkerende taak uitgevoerd door de agent op een opgegeven tijd met behulp van standaard cron-expressiesyntaxis.                                    |
| **Dive**                     | De installatiewizard voor de eerste start (`triggerfish dive`) die `triggerfish.yaml`, SPINE.md en de beginconfiguratie aanmaakt.                                  |
| **Effectieve classificatie** | Het classificatieniveau dat wordt gebruikt voor uitvoerbeslissingen, berekend als `min(kanaalclassificatie, ontvangersclassificatie)`.                             |
| **Uitvoeringsomgeving**      | De codewerkruimte van de agent voor het schrijven, uitvoeren en debuggen van code in een strakke schrijf-uitvoer-repareer-feedbacklus, onderscheiden van de Pluginsandbox. |
| **Failover**                 | Automatische terugval naar een alternatieve LLM-provider wanneer de huidige provider niet beschikbaar is vanwege snelheidsbeperking, serverfouten of time-outs.   |
| **Gateway**                  | Het langlopende lokale besturingsvlak dat sessies, kanalen, tools, gebeurtenissen en agentprocessen beheert via een WebSocket JSON-RPC-eindpunt.                   |
| **Hook**                     | Een deterministisch handhavingspunt in de gegevensstroom waar de beleidsengine regels evalueert en beslist of een actie wordt toegestaan, geblokkeerd of geredigeerd. |
| **Afkomst (Lineage)**        | Provenancemetadata die de oorsprong, transformaties en huidige locatie bijhoudt van elk gegevenselement dat door Triggerfish wordt verwerkt.                       |
| **LlmProvider**              | De interface voor LLM-completies, geïmplementeerd door elke ondersteunde provider (Anthropic, OpenAI, Google, Local, OpenRouter).                                 |
| **MCP**                      | Model Context Protocol, een standaard voor agent-tool-communicatie. De MCP Gateway van Triggerfish voegt classificatiecontroles toe aan elke MCP-server.          |
| **No Write-Down**            | De vaste, niet-configureerbare regel dat gegevens alleen kunnen stromen naar kanalen of ontvangers op een gelijk of hoger classificatieniveau.                     |
| **NotificationService**      | De uniforme abstractie voor het leveren van eigenaarsmeldingen via alle verbonden kanalen met prioriteit, wachtrijen en deduplicatie.                             |
| **Patrol**                   | De diagnostische gezondheidscontroleopdracht (`triggerfish patrol`) die de gateway, LLM-providers, kanalen en beleidsconfiguratie verifieert.                     |
| **The Reef**                 | De communityskill-marktplaats voor het ontdekken, installeren, publiceren en beheren van Triggerfish-skills.                                                      |
| **Ripple**                   | Realtime typindicatoren en online-statussignalen doorgegeven via kanalen waar ondersteund.                                                                        |
| **Sessie**                   | De fundamentele eenheid van conversatiestatus met onafhankelijke taint-tracking. Elke sessie heeft een unieke ID, gebruiker, kanaal, taint-niveau en geschiedenis. |
| **Skill**                    | Een map met een `SKILL.md`-bestand en optionele ondersteunende bestanden die de agent nieuwe mogelijkheden geven zonder plugins te schrijven.                     |
| **SPINE.md**                 | Het agentidentiteits- en missiebestand geladen als de systeempromptbasis. Definieert persoonlijkheid, regels en grenzen. Het equivalent van CLAUDE.md in Triggerfish. |
| **StorageProvider**          | De uniforme persistentie-abstractie (sleutel-waarde-interface) waardoorheen alle stateful gegevens stromen. Implementaties omvatten Memory, SQLite en enterprise-backends. |
| **Taint**                    | Het classificatieniveau gekoppeld aan een sessie op basis van de gegevens die zijn bereikt. Taint kan alleen escaleren binnen een sessie, nooit dalen.             |
| **Tide Pool**                | Een door de agent aangestuurde visuele werkruimte waar Triggerfish interactieve inhoud rendert (dashboards, grafieken, formulieren) met behulp van het A2UI-protocol. |
| **TRIGGER.md**               | Het proactieve gedragsdefinitiebestand van de agent, dat aangeeft wat er moet worden gecontroleerd, gemonitord en uitgevoerd tijdens periodieke trigger-wakeups.  |
| **Webhook**                  | Een inkomend HTTP-eindpunt dat gebeurtenissen accepteert van externe services (GitHub, Sentry, enz.) en agentacties activeert.                                    |
| **Team Lead**                | De aangewezen coördinator in een agentteam. Ontvangt het teamdoel, decomponeert werk, wijst taken toe aan leden en beslist wanneer het team klaar is.             |
| **Werkruimte**               | Een per-agent bestandssysteemmap waar de agent zijn eigen code schrijft en uitvoert, geïsoleerd van andere agents.                                                |
| **Write-Down**               | De verboden stroom van gegevens van een hoger classificatieniveau naar een lager niveau (bijv. CONFIDENTIAL-gegevens verzonden naar een PUBLIC-kanaal).             |
