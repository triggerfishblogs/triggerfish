# Bygga integrationer

Triggerfish är designat för att utökas. Vare sig du vill ansluta en ny datakälla, automatisera ett arbetsflöde, ge din agent nya kunskaper eller reagera på externa händelser, finns det en väldefinierad integreringsväg — och varje väg respekterar samma säkerhetsmodell.

## Integrationsvägar

Triggerfish erbjuder fem distinkta sätt att utöka plattformen. Varje tjänar ett annat syfte, men alla delar samma säkerhetsgarantier: klassificeringstillämpning, taint-spårning, policykrokar och fullständig revisionsloggning.

| Väg                                        | Syfte                                           | Bäst för                                                                        |
| ------------------------------------------ | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| [MCP Gateway](./mcp-gateway)               | Anslut externa verktygservrar                   | Standardiserad agent-till-verktyg-kommunikation via Model Context Protocol      |
| [Plugins](./plugins)                       | Utöka agenten med anpassade verktyg             | Agentbyggda integrationer, API-anslutare, externa systemfrågor, arbetsflöden    |
| [Exec-miljön](./exec-environment)          | Agenten skriver och kör sin egen kod            | Bygga integrationer, prototyping, testning och iteration i en återkopplingsslinga |
| [Kunskaper](./skills)                      | Ge agenten nya funktioner via instruktioner     | Återanvändbara beteenden, community-marknadsplats, agenters självförfattande    |
| [Webbläsarautomatisering](./browser)       | Styr en webbläsarinstans via CDP                | Webbforskning, formulärfyllning, skrapning, automatiserade webbarbetsflöden     |
| [Webhooks](./webhooks)                     | Ta emot inkommande händelser från externa tjänster | Realtidsreaktioner på e-post, varningar, CI/CD-händelser, kalenderändringar  |
| [GitHub](./github)                         | Full GitHub-arbetsflödesintegration             | PR-granskningsslingor, ärendetriage, grenhantering via webhooks + exec + kunskaper |
| [Google Workspace](./google-workspace)     | Anslut Gmail, Kalender, Uppgifter, Drive, Kalkylark | Buntad OAuth2-integration med 14 verktyg för Google Workspace              |
| [Obsidian](./obsidian)                     | Läs, skriv och sök i Obsidian vault-anteckningar | Klassificeringsgrindad anteckningsåtkomst med mappklassificeringar, wikilinks, dagliga anteckningar |

## Säkerhetsmodell

Varje integration — oavsett väg — arbetar under samma säkerhetsbegränsningar.

### Allt börjar som UNTRUSTED

Nya MCP-servrar, plugins, kanaler och webhook-källor är alla standard `UNTRUSTED`. De kan inte utbyta data med agenten tills de explicit klassificeras av ägaren (personlig nivå) eller administratören (företagsnivå).

```
UNTRUSTED  -->  CLASSIFIED  (efter granskning, tilldelas en klassificeringsnivå)
UNTRUSTED  -->  BLOCKED     (explicit förbjudet)
```

### Klassificering flödar igenom

När en integration returnerar data bär den data en klassificeringsnivå. Åtkomst till klassificerad data eskalerar sessions-tainten för att matcha. En gång märkt kan sessionen inte ge utdata till en destination med lägre klassificering. Det här är [nedskrivningsregeln](/sv-SE/security/no-write-down) — den är fast och kan inte åsidosättas.

### Policykrokar tillämpas vid varje gräns

Alla integrationsåtgärder passerar genom deterministiska policykrokar:

| Krok                    | När den körs                                                     |
| ----------------------- | ---------------------------------------------------------------- |
| `PRE_CONTEXT_INJECTION` | Externa data träder in i agentkontexten (webhooks, pluginsvar)   |
| `PRE_TOOL_CALL`         | Agent begär ett verktygsanrop (MCP, exec, webbläsare)            |
| `POST_TOOL_RESPONSE`    | Verktyg returnerar data (klassificera svar, uppdatera taint)     |
| `PRE_OUTPUT`            | Svar lämnar systemet (slutlig klassificeringskontroll)           |

Dessa krokar är rena funktioner — inga LLM-anrop, ingen slumpmässighet, inget kringgående. Samma indata producerar alltid samma beslut.

### Revisionshistorik

Varje integrationsåtgärd loggas: vad som anropades, vem som anropade det, vilket policybeslut som fattades och hur sessions-tainten förändrades. Denna revisionshistorik är oföränderlig och tillgänglig för efterlevnadsgranskning.

::: warning SÄKERHET LLM:en kan inte kringgå, ändra eller påverka policykrokbeslut. Krokar körs i kod under LLM-nivån. AI:n begär åtgärder — policynivån beslutar. :::

## Välja rätt väg

Använd den här beslutsguiden för att välja den integrationsväg som passar ditt användningsfall:

- **Du vill ansluta en standard verktygserver** — Använd [MCP Gateway](./mcp-gateway). Om ett verktyg talar MCP är det den här vägen.
- **Du behöver köra anpassad kod mot ett externt API** — Använd [Plugins](./plugins). Agenten kan bygga, skanna och ladda plugins under körtid. Plugins körs sandboxat med säkerhetsskanning.
- **Du vill att agenten ska bygga och iterera på kod** — Använd [Exec-miljön](./exec-environment). Agenten får en arbetsyta med en fullständig skriv/kör/reparera-slinga.
- **Du vill lära agenten ett nytt beteende** — Använd [Kunskaper](./skills). Skriv en `SKILL.md` med instruktioner, eller låt agenten skriva sin egen.
- **Du behöver automatisera webbinteraktioner** — Använd [Webbläsarautomatisering](./browser). CDP-kontrollerad Chromium med domänpolicytillämpning.
- **Du behöver reagera på externa händelser i realtid** — Använd [Webhooks](./webhooks). Inkommande händelser verifieras, klassificeras och dirigeras till agenten.

::: tip Dessa vägar är inte ömsesidigt uteslutande. En kunskap kan använda webbläsarautomatisering internt. Ett plugin kan utlösas av ett webhook. En agentförfattad integration i exec-miljön kan bevaras som en kunskap. De komponerar naturligt. :::
