# CLI-kommandon

Triggerfish tillhandahåller ett CLI för att hantera din agent, daemon, kanaler och sessioner. Den här sidan täcker alla tillgängliga kommandon och chattgenvägar.

## Kärnkommandon

### `triggerfish dive`

Kör den interaktiva installationsguiden. Det här är det första kommandot du kör efter installationen och kan köras om när som helst för att konfigurera om.

```bash
triggerfish dive
```

Guiden går igenom 8 steg: LLM-leverantör, agentnamn/personlighet, kanalinställning, valfria plugins, Google Workspace-anslutning, GitHub-anslutning, sökleverantör och daemon-installation. Se [Snabbstart](./quickstart) för en fullständig genomgång.

### `triggerfish chat`

Starta en interaktiv chattsession i din terminal. Det här är standardkommandot när du kör `triggerfish` utan argument.

```bash
triggerfish chat
```

Chattgränssnittet har:

- Inmatningsfält i full bredd längst ned i terminalen
- Strömningssvar med realtidsvisning av tokens
- Kompakt visning av verktygsanrop (växla med Ctrl+O)
- Inmatningshistorik (sparas mellan sessioner)
- ESC för att avbryta ett pågående svar
- Konversationskomprimering för att hantera långa sessioner

### `triggerfish run`

Starta gateway-servern i förgrunden. Användbart för utveckling och felsökning.

```bash
triggerfish run
```

Gateway hanterar WebSocket-anslutningar, kanaladaptrar, policymotorn och sessionstillstånd. I produktion, använd `triggerfish start` för att köra som daemon istället.

### `triggerfish start`

Installera och starta Triggerfish som en bakgrundsdaemon med din OS-tjänstehanterare.

```bash
triggerfish start
```

| Plattform | Tjänstehanterare                     |
| --------- | ------------------------------------ |
| macOS     | launchd                              |
| Linux     | systemd                              |
| Windows   | Windows Service / Task Scheduler     |

Daemonen startar automatiskt vid inloggning och håller din agent igång i bakgrunden.

### `triggerfish stop`

Stoppa den körande daemonen.

```bash
triggerfish stop
```

### `triggerfish status`

Kontrollera om daemonen körs och visa grundläggande statusinformation.

```bash
triggerfish status
```

Exempelutdata:

```
Triggerfish daemon körs
  PID: 12345
  Drifttid: 3d 2h 15m
  Kanaler: 3 aktiva (CLI, Telegram, Slack)
  Sessioner: 2 aktiva
```

### `triggerfish logs`

Visa daemonens loggutdata.

```bash
# Visa senaste loggar
triggerfish logs

# Strömma loggar i realtid
triggerfish logs --tail
```

### `triggerfish patrol`

Kör en hälsokontroll av din Triggerfish-installation.

```bash
triggerfish patrol
```

Exempelutdata:

```
Triggerfish Health Check

  Gateway körs (PID 12345, drifttid 3d 2h)
  LLM-leverantör ansluten (Anthropic, Claude Sonnet 4.5)
  3 kanaler aktiva (CLI, Telegram, Slack)
  Policymotor laddad (12 regler, 3 anpassade)
  5 skills installerade (2 medföljande, 1 hanterad, 2 arbetsyta)
  Hemligheter lagrade säkert (macOS Keychain)
  2 cron-jobb schemalagda
  Webhook-endpoints konfigurerade (2 aktiva)

Övergripande: FRISK
```

Patrol kontrollerar:

- Gateway-processstatus och drifttid
- LLM-leverantörsanslutning
- Kanaladapterhälsa
- Policymotnors regelinladdning
- Installerade skills
- Hemlighetslager
- Cron-jobbschemaläggning
- Webhook-endpoint-konfiguration
- Exponerade portdetektering

### `triggerfish config`

Hantera din konfigurationsfil. Använder punktnotation till `triggerfish.yaml`.

```bash
# Ange vilket konfigurationsvärde som helst
triggerfish config set <nyckel> <värde>

# Läs vilket konfigurationsvärde som helst
triggerfish config get <nyckel>

# Validera konfigurationssyntax och -struktur
triggerfish config validate

# Lägg till en kanal interaktivt
triggerfish config add-channel [typ]
```

Exempel:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config set web.search.api_key sk-abc123
triggerfish config set scheduler.trigger.enabled true
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

Migrera okrypterade uppgifter från `triggerfish.yaml` till OS-nyckelringen.

```bash
triggerfish config migrate-secrets
```

Det här söker igenom din konfiguration efter okrypterade API-nycklar, tokens och lösenord, lagrar dem i OS-nyckelringen och ersätter de okrypterade värdena med `secret:`-referenser. En säkerhetskopia av originalfilen skapas innan några ändringar görs.

Se [Hemlighethantering](/sv-SE/security/secrets) för detaljer.

### `triggerfish connect`

Anslut en extern tjänst till Triggerfish.

```bash
triggerfish connect google    # Google Workspace (OAuth2-flöde)
triggerfish connect github    # GitHub (personlig åtkomsttoken)
```

**Google Workspace** — Startar OAuth2-flödet. Frågar efter ditt Google Cloud OAuth Client ID och Client Secret, öppnar en webbläsare för auktorisering och lagrar tokens säkert i OS-nyckelringen. Se [Google Workspace](/sv-SE/integrations/google-workspace) för fullständiga installationsanvisningar inklusive hur du skapar uppgifter.

**GitHub** — Guider dig genom att skapa en finkornad personlig åtkomsttoken, validerar den mot GitHub API och lagrar den i OS-nyckelringen. Se [GitHub](/sv-SE/integrations/github) för detaljer.

### `triggerfish disconnect`

Ta bort autentisering för en extern tjänst.

```bash
triggerfish disconnect google    # Ta bort Google-tokens
triggerfish disconnect github    # Ta bort GitHub-token
```

Tar bort alla lagrade tokens från nyckelringen. Du kan ansluta igen när som helst.

### `triggerfish healthcheck`

Kör en snabb anslutningskontroll mot den konfigurerade LLM-leverantören. Returnerar framgång om leverantören svarar, eller ett fel med detaljer.

```bash
triggerfish healthcheck
```

### `triggerfish release-notes`

Visa versionsnoteringar för den aktuella eller en angiven version.

```bash
triggerfish release-notes
triggerfish release-notes v0.5.0
```

### `triggerfish update`

Sök efter tillgängliga uppdateringar och installera dem.

```bash
triggerfish update
```

### `triggerfish version`

Visa den aktuella Triggerfish-versionen.

```bash
triggerfish version
```

## Skill-kommandon

Hantera skills från The Reef-marknadsplatsen och din lokala arbetsyta.

```bash
triggerfish skill search "kalender"     # Sök efter skills i The Reef
triggerfish skill install google-cal    # Installera en skill
triggerfish skill list                  # Lista installerade skills
triggerfish skill update --all          # Uppdatera alla installerade skills
triggerfish skill publish               # Publicera en skill till The Reef
triggerfish skill create                # Skapa en ny skill
```

## Plugin-kommandon

Hantera plugins från The Reef-marknadsplatsen och ditt lokala filsystem. Plugins kan också hanteras av agenten vid körtid med de inbyggda verktygen `plugin_install`, `plugin_reload`, `plugin_scan` och `plugin_list`.

```bash
triggerfish plugin search "väder"       # Sök efter plugins i The Reef
triggerfish plugin install weather      # Installera en plugin från The Reef
triggerfish plugin update               # Kontrollera installerade plugins för uppdateringar
triggerfish plugin publish ./min-plugin # Förbered en plugin för publicering på The Reef
triggerfish plugin scan ./min-plugin    # Kör säkerhetsskanner på en plugin
triggerfish plugin list                 # Lista lokalt installerade plugins
```

## Sessionskommandon

Inspektera och hantera aktiva sessioner.

```bash
triggerfish session list                # Lista aktiva sessioner
triggerfish session history             # Visa sessionsutskrift
triggerfish session spawn               # Skapa en bakgrundssession
```

## Buoy-kommandon <ComingSoon :inline="true" />

Hantera följeslagarenhetsanslutningar. Buoy är ännu inte tillgänglig.

```bash
triggerfish buoys list                  # Lista anslutna buoys
triggerfish buoys pair                  # Para en ny buoy-enhet
```

## Chattkommandon

Dessa kommandon är tillgängliga under en interaktiv chattsession (via `triggerfish chat` eller valfri ansluten kanal). De är bara för ägaren.

| Kommando                | Beskrivning                                                          |
| ----------------------- | -------------------------------------------------------------------- |
| `/help`                 | Visa tillgängliga chattkommandon                                     |
| `/status`               | Visa sessionsstatus: modell, tokenantal, kostnad, taint-nivå         |
| `/reset`                | Återställ session-taint och konversationshistorik                    |
| `/compact`              | Komprimera konversationshistorik med LLM-sammanfattning              |
| `/model <namn>`         | Byt LLM-modell för den aktuella sessionen                            |
| `/skill install <namn>` | Installera en skill från The Reef                                    |
| `/cron list`            | Lista schemalagda cron-jobb                                          |

## Tangentbordsgenvägar

Dessa genvägar fungerar i CLI-chattgränssnittet:

| Genväg  | Åtgärd                                                                         |
| ------- | ------------------------------------------------------------------------------ |
| ESC     | Avbryt det aktuella LLM-svaret                                                 |
| Ctrl+V  | Klistra in bild från urklipp (se [Bild och vision](/sv-SE/features/image-vision)) |
| Ctrl+O  | Växla kompakt/utökad visning av verktygsanrop                                  |
| Ctrl+C  | Avsluta chattsessionen                                                         |
| Upp/Ned | Navigera inmatningshistorik                                                    |

::: tip ESC-avbrottet skickar en avbrytningssignal genom hela kedjan — från orkestratorn till LLM-leverantören. Svaret stoppas rent och du kan fortsätta konversationen. :::

## Felsökningsutdata

Triggerfish inkluderar detaljerad felsökningsloggning för att diagnostisera LLM-leverantörsproblem, tolkning av verktygsanrop och agentloopbeteende. Aktivera det genom att ange miljövariabeln `TRIGGERFISH_DEBUG` till `1`.

::: tip Det rekommenderade sättet att styra loggningsdetaljnivå är via `triggerfish.yaml`:

```yaml
logging:
  level: verbose # quiet, normal, verbose eller debug
```

Miljövariabeln `TRIGGERFISH_DEBUG=1` stöds fortfarande för bakåtkompatibilitet. Se [Strukturerad loggning](/sv-SE/features/logging) för fullständiga detaljer. :::

### Förgrundsläge

```bash
TRIGGERFISH_DEBUG=1 triggerfish run
```

Eller för en chattsession:

```bash
TRIGGERFISH_DEBUG=1 triggerfish chat
```

### Daemonläge (systemd)

Lägg till miljövariabeln i din systemd-tjänstenhet:

```bash
systemctl --user edit triggerfish.service
```

Lägg till under `[Service]`:

```ini
[Service]
Environment=TRIGGERFISH_DEBUG=1
```

Starta sedan om:

```bash
systemctl --user daemon-reload
triggerfish stop && triggerfish start
```

Visa felsökningsutdata med:

```bash
journalctl --user -u triggerfish.service -f
```

### Vad som loggas

När felsökningsläge är aktiverat skrivs följande till stderr:

| Komponent      | Loggprefix     | Detaljer                                                                                                                               |
| -------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Orkestrator    | `[orch]`       | Varje iteration: systempromptlängd, historikpostantal, meddelanderoller/-storlekar, antal tolkade verktygsanrop, slutligt svarstext    |
| OpenRouter     | `[openrouter]` | Fullständig begärans-payload (modell, antal meddelanden, antal verktyg), råsvarstext, innehållslängd, avslutningsorsak, tokenanvändning |
| Andra leverantörer | `[provider]` | Begärans-/svarsammanfattningar (varierar beroende på leverantör)                                                                     |

Exempel på felsökningsutdata:

```
[orch] iter1 sysPrompt=4521chars history=3 entries
[orch]   [0] system 4521chars
[orch]   [1] user 42chars
[orch]   [2] assistant 0chars
[orch] iter1 raw: <tool_call>{"name":"web_search","arguments":{"query":"best fish tacos austin"}}...
[orch] iter1 parsedCalls: 1
[openrouter] request: model=openrouter/aurora-alpha messages=5 tools=12
[openrouter] response: content=1284chars finish=stop tokens=342
```

::: warning Felsökningsutdata inkluderar fullständiga LLM-begärans- och svarspayloads. Lämna det inte aktiverat i produktion eftersom det kan logga känsligt konversationsinnehåll till stderr/journal. :::

## Snabbreferens

```bash
# Installation och hantering
triggerfish dive              # Installationsguide
triggerfish start             # Starta daemon
triggerfish stop              # Stoppa daemon
triggerfish status            # Kontrollera status
triggerfish logs --tail       # Strömma loggar
triggerfish patrol            # Hälsokontroll
triggerfish config set <k> <v> # Ange konfigurationsvärde
triggerfish config get <key>  # Läs konfigurationsvärde
triggerfish config add-channel # Lägg till en kanal
triggerfish config migrate-secrets  # Migrera hemligheter till nyckelring
triggerfish update            # Sök efter uppdateringar
triggerfish version           # Visa version

# Daglig användning
triggerfish chat              # Interaktivt chatt
triggerfish run               # Förgrundsläge

# Skills
triggerfish skill search      # Sök i The Reef
triggerfish skill install     # Installera skill
triggerfish skill list        # Lista installerade
triggerfish skill create      # Skapa ny skill

# Plugins
triggerfish plugin search     # Sök i The Reef
triggerfish plugin install    # Installera plugin
triggerfish plugin update     # Sök efter uppdateringar
triggerfish plugin scan       # Säkerhetsskanning
triggerfish plugin list       # Lista installerade

# Sessioner
triggerfish session list      # Lista sessioner
triggerfish session history   # Visa utskrift
```
