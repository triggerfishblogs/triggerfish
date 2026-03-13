# Ordlista

| Term                         | Definition                                                                                                                                                        |
| ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Team**               | En beständig grupp av samarbetande agentsessioner med distinkta roller. En medlem är ledaren som koordinerar arbetet. Skapas via `team_create`, övervakas med livscykelkontroller. |
| **A2UI**                     | Agent-to-UI-protokoll för att skicka visuellt innehåll från agenten till Tide Pool-arbetsytan i realtid.                                                          |
| **Background Session**       | En session skapad för autonoma uppgifter (cron, triggers) som startar med fräsch PUBLIC taint och körs i en isolerad arbetsyta.                                   |
| **Buoy**                     | En kompanjonapp (iOS, Android) som tillhandahåller enhetsfunktioner som kamera, plats, skärminspelning och push-notifikationer till agenten. (Kommer snart.)      |
| **Classification**           | En känslighetsetikett tilldelad data, kanaler och mottagare. Fyra nivåer: RESTRICTED, CONFIDENTIAL, INTERNAL, PUBLIC.                                             |
| **Cron**                     | En schemalagd återkommande uppgift som körs av agenten vid en angiven tid med standardkronuttrycksyntax.                                                          |
| **Dive**                     | Förstagångsinställningsguiden (`triggerfish dive`) som scaffoldar `triggerfish.yaml`, SPINE.md och initial konfiguration.                                         |
| **Effective Classification** | Klassificeringsnivån som används för utdatabeslut, beräknad som `min(channel_classification, recipient_classification)`.                                          |
| **Exec Environment**         | Agentens kodarbetsyta för att skriva, köra och felsöka kod i en tät skriv-kör-fixa-feedbackslinga, skild från Plugin Sandboxen.                                   |
| **Failover**                 | Automatisk övergång till en alternativ LLM-leverantör när den aktuella leverantören är otillgänglig på grund av hastighetsbegränsning, serverfel eller tidsgränser. |
| **Gateway**                  | Det långvariga lokala kontrollplanet som hanterar sessioner, kanaler, verktyg, händelser och agentprocesser via en WebSocket JSON-RPC-slutpunkt.                   |
| **Hook**                     | En deterministisk tillämpningspunkt i dataflödet där policymotorn utvärderar regler och beslutar om en åtgärd ska tillåtas, blockeras eller redigeras.            |
| **Lineage**                  | Härkomstmetadata som spårar ursprung, transformationer och aktuell plats för varje dataelement som bearbetas av Triggerfish.                                      |
| **LlmProvider**              | Gränssnittet för LLM-kompletteringar, implementerat av varje stödd leverantör (Anthropic, OpenAI, Google, Local, OpenRouter).                                     |
| **MCP**                      | Model Context Protocol, en standard för agent-verktyg-kommunikation. Triggerfishs MCP Gateway lägger till klassificeringskontroller på valfri MCP-server.        |
| **No Write-Down**            | Den fasta, icke-konfigurerbara regeln att data bara kan flöda till kanaler eller mottagare på en likvärdig eller högre klassificeringsnivå.                       |
| **NotificationService**      | Den enhetliga abstraktionen för att leverera ägarnotifikationer över alla anslutna kanaler med prioritet, köning och deduplicering.                               |
| **Patrol**                   | Det diagnostiska hälsokontrollkommandot (`triggerfish patrol`) som verifierar gatewayen, LLM-leverantörer, kanaler och policykonfiguration.                      |
| **Reef (The)**               | Community-kunskapsmarknadsplatsen för att identifiera, installera, publicera och hantera Triggerfish-kunskaper.                                                   |
| **Ripple**                   | Realtids-skrivningsindikatorer och onlinestatussignaler som vidarebefordras över kanaler där det stöds.                                                           |
| **Session**                  | Den grundläggande enheten av konversationstillstånd med oberoende taint-spårning. Varje session har ett unikt ID, användare, kanal, taint-nivå och historik.     |
| **Skill**                    | En mapp som innehåller en `SKILL.md`-fil och valfria stödfiler som ger agenten nya funktioner utan att skriva plugins.                                           |
| **SPINE.md**                 | Agentidentitets- och uppdragsfilen som laddas som systempromptsgrunden. Definierar personlighet, regler och gränser. Triggerfishs motsvarighet till CLAUDE.md.   |
| **StorageProvider**          | Den enhetliga persistensabstraktionen (nyckel-värde-gränssnitt) genom vilken alla tillståndsdata flödar. Implementeringar inkluderar Memory, SQLite och företagsbakändar. |
| **Taint**                    | Klassificeringsnivån kopplad till en session baserat på de data den har kommit åt. Taint kan bara eskalera inom en session, aldrig minska.                       |
| **Tide Pool**                | En agentdriven visuell arbetsyta där Triggerfish renderar interaktivt innehåll (instrumentpaneler, diagram, formulär) med A2UI-protokollet.                       |
| **TRIGGER.md**               | Agentens proaktiva beteendedefinitionsfil som specificerar vad man ska kontrollera, övervaka och agera på under periodiska triggervaknat.                        |
| **Webhook**                  | En inkommande HTTP-slutpunkt som accepterar händelser från externa tjänster (GitHub, Sentry osv.) och utlöser agentåtgärder.                                     |
| **Team Lead**                | Den utsedda koordinatorn i ett agentteam. Tar emot teamets mål, bryter ner arbetet, tilldelar uppgifter till medlemmar och bestämmer när teamet är klart.        |
| **Workspace**                | En per-agent-filsystemkatalog där agenten skriver och kör sin egen kod, isolerad från andra agenter.                                                             |
| **Write-Down**               | Det förbjudna flödet av data från en högre klassificeringsnivå till en lägre (t.ex. CONFIDENTIAL-data skickas till en PUBLIC-kanal).                             |
