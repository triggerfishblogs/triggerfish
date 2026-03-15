# Vanliga frågor

## Installation

### Vilka är systemkraven?

Triggerfish körs på macOS (Intel och Apple Silicon), Linux (x64 och arm64) och Windows (x64). Binärinstallationsverktyget hanterar allt. Om du bygger från källkod behöver du Deno 2.x.

För Docker-distributioner fungerar alla system med Docker eller Podman. Containeravbildningen är baserad på distroless Debian 12.

### Var lagrar Triggerfish sin data?

Allt bor under `~/.triggerfish/` som standard:

```
~/.triggerfish/
  triggerfish.yaml          # Konfiguration
  SPINE.md                  # Agentidentitet
  TRIGGER.md                # Definition av proaktivt beteende
  logs/                     # Loggfiler (roteras vid 1 MB, 10 säkerhetskopior)
  data/triggerfish.db       # SQLite-databas (sessioner, minne, tillstånd)
  skills/                   # Installerade kunskaper
  backups/                  # Tidstämplade konfigurationssäkerhetskopior
```

Docker-distributioner använder `/data` istället. Du kan åsidosätta baskatalogen med miljövariabeln `TRIGGERFISH_DATA_DIR`.

### Kan jag flytta datakatalogen?

Ja. Ange miljövariabeln `TRIGGERFISH_DATA_DIR` till önskad sökväg innan du startar daemonen. Om du använder systemd eller launchd behöver du uppdatera tjänstedefinitionen (se [Plattformsanteckningar](/sv-SE/support/guides/platform-notes)).

### Installationsverktyget säger att det inte kan skriva till `/usr/local/bin`

Installationsverktyget provar `/usr/local/bin` först. Om det kräver root-åtkomst faller det tillbaka till `~/.local/bin`. Om du vill ha platsen för hela systemet, kör om med `sudo`:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Hur avinstallerar jag Triggerfish?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

Det stoppar daemonen, tar bort tjänstedefinitionen (systemd-enhet eller launchd plist), tar bort binären och tar bort hela `~/.triggerfish/`-katalogen inklusive all data.

---

## Konfiguration

### Hur byter jag LLM-leverantör?

Redigera `triggerfish.yaml` eller använd CLI:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

Daemonen startar om automatiskt efter konfigurationsändringar.

### Var lägger man API-nycklar?

API-nycklar lagras i din OS-nyckelring (macOS Keychain, Linux Secret Service, eller en krypterad fil på Windows/Docker). Lägg aldrig råa API-nycklar i `triggerfish.yaml`. Använd `secret:`-referenssyntaxen:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

Lagra den faktiska nyckeln:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Vad betyder `secret:` i min konfiguration?

Värden med prefixet `secret:` är referenser till din OS-nyckelring. Vid uppstart löser Triggerfish upp varje referens och ersätter den med det faktiska hemlighetsvärdet i minnet. Den råa hemligheten visas aldrig i `triggerfish.yaml` på disk. Se [Hemligheter och uppgifter](/sv-SE/support/troubleshooting/secrets) för bakändsdetaljer per plattform.

### Vad är SPINE.md?

`SPINE.md` är din agents identitetsfil. Den definierar agentens namn, uppdrag, personlighet och beteenderiktlinjer. Tänk på det som systempromptsgrunden. Installationsguiden (`triggerfish dive`) genererar en åt dig, men du kan redigera den fritt.

### Vad är TRIGGER.md?

`TRIGGER.md` definierar din agents proaktiva beteende: vad den ska kontrollera, övervaka och agera på under schemalagda triggervaknat. Utan en `TRIGGER.md` utlöses triggers fortfarande men agenten har inga instruktioner om vad den ska göra.

### Hur lägger jag till en ny kanal?

```bash
triggerfish config add-channel telegram
```

Det startar en interaktiv uppmaning som vägleder dig genom de nödvändiga fälten (bot-token, ägar-ID, klassificeringsnivå). Du kan också redigera `triggerfish.yaml` direkt under avsnittet `channels:`.

### Jag ändrade min konfiguration men ingenting hände

Daemonen måste starta om för att plocka upp ändringar. Om du använde `triggerfish config set` erbjuder det automatisk omstart. Om du redigerade YAML-filen manuellt, starta om med:

```bash
triggerfish stop && triggerfish start
```

---

## Kanaler

### Varför svarar inte min bot på meddelanden?

Börja med att kontrollera:

1. **Körs daemonen?** Kör `triggerfish status`
2. **Är kanalen ansluten?** Kontrollera loggarna: `triggerfish logs`
3. **Är bot-token giltig?** De flesta kanaler misslyckas tyst med ogiltiga tokens
4. **Är ägar-ID korrekt?** Om du inte känns igen som ägare kan boten begränsa svar

Se guiden [Kanalfelsökning](/sv-SE/support/troubleshooting/channels) för kanalspecifika checklistor.

### Vad är ägar-ID och varför spelar det roll?

Ägar-ID talar om för Triggerfish vilken användare på en given kanal som är du (operatören). Icke-ägaranvändare får begränsad verktygstillgång och kan vara föremål för klassificeringsgränser. Om du lämnar ägar-ID tomt varierar beteendet beroende på kanal. Vissa kanaler (som WhatsApp) behandlar alla som ägaren, vilket är en säkerhetsrisk.

### Kan jag använda flera kanaler samtidigt?

Ja. Konfigurera hur många kanaler du vill i `triggerfish.yaml`. Varje kanal upprätthåller sina egna sessioner och klassificeringsnivå. Routern hanterar meddelandeleverans över alla anslutna kanaler.

### Vilka är meddelandestorleksgränserna?

| Kanal     | Gräns              | Beteende                      |
| --------- | ------------------ | ----------------------------- |
| Telegram  | 4 096 tecken       | Delas automatiskt             |
| Discord   | 2 000 tecken       | Delas automatiskt             |
| Slack     | 40 000 tecken      | Trunkeras (inte delas)        |
| WhatsApp  | 4 096 tecken       | Trunkeras                     |
| E-post    | Ingen hård gräns   | Fullt meddelande skickas      |
| WebChat   | Ingen hård gräns   | Fullt meddelande skickas      |

### Varför klipps Slack-meddelanden av?

Slack har en 40 000-teckengräns. Till skillnad från Telegram och Discord trunkerar Triggerfish Slack-meddelanden istället för att dela dem i flera meddelanden. Mycket långa svar (som stor kodutdata) kan förlora innehåll i slutet.

---

## Säkerhet och klassificering

### Vilka är klassificeringsnivåerna?

Fyra nivåer, från minst till mest känsliga:

1. **PUBLIC** — Inga begränsningar för dataflöde
2. **INTERNAL** — Standard operativa data
3. **CONFIDENTIAL** — Känsliga data (uppgifter, personlig information, ekonomiska poster)
4. **RESTRICTED** — Högsta känslighet (reglerade data, efterlevnadskritiska)

Data kan bara flöda från lägre nivåer till likvärdig eller högre nivåer. CONFIDENTIAL-data kan aldrig nå en PUBLIC-kanal. Det är "nedskrivningsregeln" och den kan inte åsidosättas.

### Vad betyder "sessions-taint"?

Varje session börjar vid PUBLIC. När agenten kommer åt klassificerade data (läser en CONFIDENTIAL-fil, frågar en RESTRICTED-databas) eskalerar sessions-taint för att matcha. Taint går bara upp, aldrig ner. En session märkt med CONFIDENTIAL kan inte skicka sin utdata till en PUBLIC-kanal.

### Varför får jag fel om "write-down blockerad"?

Din session har märkts till en klassificeringsnivå som är högre än destinationen. Till exempel, om du kom åt CONFIDENTIAL-data och sedan försökte skicka resultat till en PUBLIC WebChat-kanal blockerar policymotorn det.

Det fungerar som avsett. För att lösa det, antingen:
- Starta en ny session (ny konversation)
- Använd en kanal klassificerad vid eller över din sessions taint-nivå

### Kan jag inaktivera klassificeringstillämpning?

Nej. Klassificeringssystemet är en kärnsäkerhetsinvariant. Det körs som deterministisk kod under LLM-nivån och kan inte kringgås, inaktiveras eller påverkas av agenten. Det är avsiktligt.

---

## LLM-leverantörer

### Vilka leverantörer stöds?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI och lokala modeller via Ollama eller LM Studio.

### Hur fungerar failover?

Konfigurera en `failover`-lista i `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Om den primära leverantören misslyckas provar Triggerfish varje reserv i ordning. Avsnittet `failover_config` kontrollerar antal återförsök, fördröjning och vilka felvillkor som utlöser failover.

### Min leverantör returnerar 401/403-fel

Din API-nyckel är ogiltig eller har gått ut. Lagra om den:

```bash
triggerfish config set-secret provider:<namn>:apiKey <din-nyckel>
```

Starta sedan om daemonen. Se [LLM-leverantörsfelsökning](/sv-SE/support/troubleshooting/providers) för leverantörsspecifik vägledning.

### Kan jag använda olika modeller för olika klassificeringsnivåer?

Ja. Använd konfigurationen `classification_models`:

```yaml
models:
  classification_models:
    RESTRICTED:
      provider: local
      model: llama-3.3-70b
    CONFIDENTIAL:
      provider: anthropic
      model: claude-sonnet-4-20250514
```

Sessioner märkta till en specifik nivå använder den motsvarande modellen. Nivåer utan explicita åsidosättanden faller tillbaka till den primära modellen.

---

## Docker

### Hur kör jag Triggerfish i Docker?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

Det laddar ner Docker-omskriptets skript och compose-fil, hämtar avbildningen och kör installationsguiden.

### Var lagras data i Docker?

All beständig data bor i en Docker-namngiven volym (`triggerfish-data`) monterad vid `/data` inuti containern. Det inkluderar konfiguration, hemligheter, SQLite-databasen, loggar, kunskaper och agentarbetsytor.

### Hur fungerar hemligheter i Docker?

Docker-containrar kan inte komma åt värdens OS-nyckelring. Triggerfish använder ett krypterat filarkiv istället: `secrets.json` (krypterade värden) och `secrets.key` (AES-256-krypteringsnyckel), båda lagrade i `/data`-volymen. Behandla volymen som känslig.

### Containern hittar inte min konfigurationsfil

Se till att du monterade den korrekt:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Om containern startar utan en konfigurationsfil skriver den ut ett hjälpmeddelande och avslutar.

### Hur uppdaterar jag Docker-avbildningen?

```bash
triggerfish update    # Om du använder omskriptsskriptet
# eller
docker compose pull && docker compose up -d
```

---

## Kunskaper och Revet

### Vad är en kunskap?

En kunskap är en mapp som innehåller en `SKILL.md`-fil som ger agenten nya funktioner, kontext eller beteenderiktlinjer. Kunskaper kan inkludera verktygsdefinitioner, kod, mallar och instruktioner.

### Vad är Revet?

Revet är Triggerfishs kunskapsmarknadsplats. Du kan hitta, installera och publicera kunskaper via den:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### Varför blockerades min kunskap av säkerhetsskannern?

Varje kunskap skannas före installation. Skannern kontrollerar efter misstänkta mönster, överdrivna behörigheter och klassificeringstakvioleringar. Om en kunskaps tak är lägre än din aktuella sessions-taint blockeras aktivering för att förhindra nedskrivning.

### Vad är ett klassificeringstak på en kunskap?

Kunskaper deklarerar en maximal klassificeringsnivå de har tillåtelse att operera vid. En kunskap med `classification_ceiling: INTERNAL` kan inte aktiveras i en session märkt med CONFIDENTIAL eller högre. Det förhindrar kunskaper från att komma åt data över deras behörighet.

---

## Triggers och schemaläggning

### Vad är triggers?

Triggers är periodiska agentvaknat för proaktivt beteende. Du definierar vad agenten ska kontrollera i `TRIGGER.md`, och Triggerfish väcker den på ett schema. Agenten granskar sina instruktioner, vidtar åtgärder (kontrollerar en kalender, övervakar en tjänst, skickar en påminnelse) och går tillbaka till vila.

### Hur skiljer sig triggers från cron-jobb?

Cron-jobb kör en fast uppgift på ett schema. Triggers väcker agenten med hela dess kontext (minne, verktyg, kanalåtkomst) och låter den bestämma vad den ska göra baserat på `TRIGGER.md`-instruktioner. Cron är mekanisk; triggers är agentbaserade.

### Vad är tysta timmar?

Inställningen `quiet_hours` i `scheduler.trigger` förhindrar triggers från att utlösas under angivna timmar:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Hur fungerar webhooks?

Externa tjänster kan POST:a till Triggerfishs webhook-slutpunkt för att utlösa agentåtgärder. Varje webhook-källa kräver HMAC-signering för autentisering och inkluderar uppspelningsdetektering.

---

## Agentteam

### Vad är agentteam?

Agentteam är beständiga grupper av samarbetande agenter som arbetar tillsammans på komplexa uppgifter. Varje teammedlem är en separat agentsession med sin egen roll, konversationskontext och verktyg. En medlem utses till ledare och koordinerar arbetet. Se [Agentteam](/sv-SE/features/agent-teams) för fullständig dokumentation.

### Hur skiljer sig team från underagenter?

Underagenter är skjut-och-glöm: du delegerar en enskild uppgift och väntar på resultatet. Team är beständiga — medlemmar kommunicerar med varandra via `sessions_send`, ledaren koordinerar arbetet och teamet kör autonomt tills det är upplöst eller har timeout. Använd underagenter för fokuserad delegering; använd team för komplex flerrollssamarbete.

### Kräver agentteam ett betalt abonnemang?

Agentteam kräver **Power**-planen (149 $/månad) när du använder Triggerfish Gateway. Öppen källkod-användare som kör sina egna API-nycklar har full åtkomst — varje teammedlem förbrukar inferens från din konfigurerade LLM-leverantör.

### Varför misslyckades min teamledare omedelbart?

Den vanligaste orsaken är en felkonfigurerad LLM-leverantör. Varje teammedlem skapar sin egen agentsession som behöver en fungerande LLM-anslutning. Kontrollera `triggerfish logs` för leverantörsfel kring tidpunkten för teamskapandet.

### Kan teammedlemmar använda olika modeller?

Ja. Varje medlemsdefinition accepterar ett valfritt `model`-fält. Om det utelämnas ärver medlemmen den skapande agentens modell. Det låter dig tilldela dyra modeller till komplexa roller och billigare modeller till enkla.

### Hur länge kan ett team köra?

Som standard har team en 1-timmes livstid (`max_lifetime_seconds: 3600`). När gränsen nås får ledaren en 60-sekunders varning för att producera slutlig utdata, sedan upplöses teamet automatiskt. Du kan konfigurera en längre livstid vid skapandetillfället.

### Vad händer om en teammedlem kraschar?

Livscykelövervakningen identifierar medlemsfel inom 30 sekunder. Misslyckade medlemmar markeras som `failed` och ledaren meddelas för att fortsätta med återstående medlemmar eller upplösa teamet. Om ledaren själv misslyckas pausas teamet och den skapande sessionen meddelas.

---

## Övrigt

### Är Triggerfish öppen källkod?

Ja, licensierad under Apache 2.0. Den fullständiga källkoden, inklusive alla säkerhetskritiska komponenter, är tillgänglig för granskning på [GitHub](https://github.com/greghavens/triggerfish).

### Ringer Triggerfish hem?

Nej. Triggerfish gör inga utgående anslutningar utom till de tjänster du explicit konfigurerar (LLM-leverantörer, kanal-API:er, integrationer). Det finns ingen telemetri, analys eller uppdateringskontroll om du inte kör `triggerfish update`.

### Kan jag köra flera agenter?

Ja. Konfigurationsavsnittet `agents` definierar flera agenter, var och en med sitt eget namn, modell, kanalbindningar, verktygssatser och klassificeringstak. Routingssystemet dirigerar meddelanden till lämplig agent.

### Vad är gatewayen?

Gatewayen är Triggerfishs interna WebSocket-kontrollplan. Den hanterar sessioner, dirigerar meddelanden mellan kanaler och agenten, skickar verktyg och tillämpar policy. CLI-chattgränssnittet ansluter till gatewayen för att kommunicera med din agent.

### Vilka portar använder Triggerfish?

| Port  | Syfte                        | Bindning           |
| ----- | ---------------------------- | ------------------ |
| 18789 | Gateway WebSocket            | Enbart localhost   |
| 18790 | Tidepool A2UI                | Enbart localhost   |
| 8765  | WebChat (om aktiverat)       | Konfigurerbar      |
| 8443  | WhatsApp webhook (om aktiverat) | Konfigurerbar   |

Alla standardportar binder till localhost. Ingen exponeras till nätverket om du inte explicit konfigurerar det eller använder en omvänd proxy.
