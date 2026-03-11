# Mga Madalas Itanong (FAQ)

## Installation

### Ano ang system requirements?

Tumatakbo ang Triggerfish sa macOS (Intel at Apple Silicon), Linux (x64 at arm64), at Windows (x64). Inaasikaso ng binary installer ang lahat. Kung magbi-build mula sa source, kailangan mo ng Deno 2.x.

Para sa Docker deployments, kahit anong system na may Docker o Podman ay gagana. Ang container image ay based sa distroless Debian 12.

### Saan sino-store ng Triggerfish ang data nito?

Lahat ay nasa `~/.triggerfish/` bilang default:

```
~/.triggerfish/
  triggerfish.yaml          # Configuration
  SPINE.md                  # Agent identity
  TRIGGER.md                # Proactive behavior definition
  logs/                     # Log files (niro-rotate sa 1 MB, 10 backups)
  data/triggerfish.db       # SQLite database (sessions, memory, state)
  skills/                   # Naka-install na skills
  backups/                  # Timestamped na config backups
```

Ang Docker deployments ay gumagamit ng `/data` sa halip. Puwede mong i-override ang base directory gamit ang `TRIGGERFISH_DATA_DIR` environment variable.

### Puwede ko bang ilipat ang data directory?

Oo. I-set ang `TRIGGERFISH_DATA_DIR` environment variable sa gusto mong path bago i-start ang daemon. Kung gumagamit ka ng systemd o launchd, kailangan mong i-update ang service definition (tingnan ang [Platform Notes](/fil-PH/support/guides/platform-notes)).

### Sinasabi ng installer na hindi makapagsulat sa `/usr/local/bin`

Sinusubukan muna ng installer ang `/usr/local/bin`. Kung kailangan ng root access, bumabagsak ito sa `~/.local/bin`. Kung gusto mo ang system-wide na location, patakbuhin ulit gamit ang `sudo`:

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | sudo bash
```

### Paano ko i-uninstall ang Triggerfish?

```bash
# Linux / macOS
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
```

Hihinto nito ang daemon, aalisin ang service definition (systemd unit o launchd plist), ide-delete ang binary, at aalisin ang buong `~/.triggerfish/` directory kasama ang lahat ng data.

---

## Configuration

### Paano ko babaguhin ang LLM provider?

I-edit ang `triggerfish.yaml` o gamitin ang CLI:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
```

Awtomatikong magre-restart ang daemon pagkatapos ng mga config changes.

### Saan mapupunta ang mga API keys?

Ang mga API keys ay sino-store sa iyong OS keychain (macOS Keychain, Linux Secret Service, o encrypted file sa Windows/Docker). Huwag kailanman maglagay ng raw API keys sa `triggerfish.yaml`. Gamitin ang `secret:` reference syntax:

```yaml
models:
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

I-store ang actual key:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Ano ang ibig sabihin ng `secret:` sa config ko?

Ang mga values na may prefix na `secret:` ay mga reference sa iyong OS keychain. Sa startup, nire-resolve ng Triggerfish ang bawat reference at pinapalitan ito ng actual na secret value sa memory. Ang raw secret ay hindi kailanman lalabas sa `triggerfish.yaml` sa disk. Tingnan ang [Secrets & Credentials](/fil-PH/support/troubleshooting/secrets) para sa backend details ayon sa platform.

### Ano ang SPINE.md?

Ang `SPINE.md` ang identity file ng iyong agent. Dine-define nito ang pangalan, misyon, personalidad, at behavioral guidelines ng agent. Isipin mo itong system prompt foundation. Ginagawa ito ng setup wizard (`triggerfish dive`) para sa iyo, pero puwede mo itong i-edit nang malaya.

### Ano ang TRIGGER.md?

Dine-define ng `TRIGGER.md` ang proactive behavior ng iyong agent: ano ang dapat nitong i-check, i-monitor, at gawin sa mga scheduled trigger wakeups. Kung walang `TRIGGER.md`, magfi-fire pa rin ang mga triggers pero walang instructions ang agent kung ano ang gagawin.

### Paano mag-add ng bagong channel?

```bash
triggerfish config add-channel telegram
```

Magsta-start ito ng interactive prompt na gagabay sa iyo sa mga required fields (bot token, owner ID, classification level). Puwede mo ring i-edit nang direkta ang `triggerfish.yaml` sa ilalim ng `channels:` section.

### Binago ko ang config ko pero wala namang nangyari

Kailangan mag-restart ng daemon para ma-pick up ang mga changes. Kung ginamit mo ang `triggerfish config set`, mag-o-offer itong awtomatikong mag-restart. Kung mano-mano mong in-edit ang YAML file, mag-restart gamit ang:

```bash
triggerfish stop && triggerfish start
```

---

## Channels

### Bakit hindi sumasagot ang bot ko sa mga mensahe?

Simulang i-check ang:

1. **Tumatakbo ba ang daemon?** Patakbuhin ang `triggerfish status`
2. **Nakakonekta ba ang channel?** Tingnan ang logs: `triggerfish logs`
3. **Valid ba ang bot token?** Karamihan ng channels ay tahimik na nagfa-fail sa invalid na tokens
4. **Tama ba ang owner ID?** Kung hindi ka kinikilala bilang owner, baka nirerestrict ng bot ang mga responses

Tingnan ang [Channels Troubleshooting](/fil-PH/support/troubleshooting/channels) guide para sa channel-specific na mga checklist.

### Ano ang owner ID at bakit mahalaga ito?

Sinasabi ng owner ID sa Triggerfish kung aling user sa isang channel ang ikaw (ang operator). Ang mga non-owner users ay may restricted na tool access at puwedeng may classification limits. Kung iiwan mong blangko ang owner ID, iba-iba ang behavior depende sa channel. Ang ilang channels (tulad ng WhatsApp) ay ituturing ang lahat bilang owner, na isang security risk.

### Puwede ko bang gamitin ang maraming channels nang sabay-sabay?

Oo. Mag-configure ng kahit ilang channels sa `triggerfish.yaml`. Ang bawat channel ay nagma-maintain ng sariling sessions at classification level. Ang router ang nag-hahandle ng message delivery sa lahat ng nakakonektang channels.

### Ano ang mga message size limits?

| Channel | Limit | Behavior |
|---------|-------|----------|
| Telegram | 4,096 characters | Awtomatikong hinahati |
| Discord | 2,000 characters | Awtomatikong hinahati |
| Slack | 40,000 characters | Tina-truncate (hindi hinahati) |
| WhatsApp | 4,096 characters | Tina-truncate |
| Email | Walang hard limit | Buong message ang ipinapadala |
| WebChat | Walang hard limit | Buong message ang ipinapadala |

### Bakit napu-putol ang mga Slack messages?

May 40,000-character limit ang Slack. Hindi katulad ng Telegram at Discord, tina-truncate ng Triggerfish ang Slack messages sa halip na hatiin sa maraming messages. Ang napakahabang responses (tulad ng malalaking code outputs) ay maaaring mawalan ng content sa dulo.

---

## Security & Classification

### Ano ang mga classification levels?

Apat na levels, mula sa pinakamababa hanggang sa pinakamataas na sensitivity:

1. **PUBLIC** - Walang restrictions sa data flow
2. **INTERNAL** - Standard na operational data
3. **CONFIDENTIAL** - Sensitibong data (credentials, personal info, financial records)
4. **RESTRICTED** - Pinakamataas na sensitivity (regulated data, compliance-critical)

Ang data ay puwede lamang mag-flow mula sa mas mababang levels papuntang katumbas o mas mataas na levels. Ang CONFIDENTIAL na data ay hindi kailanman makakaabot sa isang PUBLIC channel. Ito ang "no write-down" rule at hindi ito ma-o-override.

### Ano ang ibig sabihin ng "session taint"?

Ang bawat session ay nagsisimula sa PUBLIC. Kapag nag-access ang agent ng classified data (nagbasa ng CONFIDENTIAL file, nag-query ng RESTRICTED database), ang session taint ay umaangat para tumugma. Ang taint ay pataas lang, hindi pababa. Ang session na naka-taint sa CONFIDENTIAL ay hindi makapagpadala ng output nito sa isang PUBLIC channel.

### Bakit nakakakuha ako ng "write-down blocked" errors?

Ang iyong session ay na-taint na sa classification level na mas mataas kaysa sa destination. Halimbawa, kung nag-access ka ng CONFIDENTIAL data at sinubukan mong ipadala ang mga results sa isang PUBLIC WebChat channel, bina-block ito ng policy engine.

Gumagana ito ayon sa intensyon. Para maayos, alinman sa:
- Mag-start ng bagong session (bagong conversation)
- Gumamit ng channel na classified sa katumbas o mas mataas sa taint level ng iyong session

### Puwede ko bang i-disable ang classification enforcement?

Hindi. Ang classification system ay isang core security invariant. Tumatakbo ito bilang deterministic code sa ilalim ng LLM layer at hindi puwedeng i-bypass, i-disable, o impluwensyahan ng agent. Sadyang ganito ang disenyo nito.

---

## LLM Providers

### Aling mga providers ang supported?

Anthropic, OpenAI, Google Gemini, Fireworks, OpenRouter, ZenMux, Z.AI, at local models sa pamamagitan ng Ollama o LM Studio.

### Paano gumagana ang failover?

Mag-configure ng `failover` list sa `triggerfish.yaml`:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  failover:
    - openai/gpt-4o
    - google/gemini-2.5-pro
```

Kung mag-fail ang primary provider, susubukan ng Triggerfish ang bawat fallback nang sunud-sunod. Kinokontrol ng `failover_config` section ang retry counts, delay, at kung aling error conditions ang nagti-trigger ng failover.

### Nagbabalik ang provider ko ng 401 / 403 errors

Invalid o expired ang iyong API key. I-store ulit ito:

```bash
triggerfish config set-secret provider:<name>:apiKey <your-key>
```

Pagkatapos ay i-restart ang daemon. Tingnan ang [LLM Provider Troubleshooting](/fil-PH/support/troubleshooting/providers) para sa provider-specific na gabay.

### Puwede ko bang gamitin ang iba't ibang models para sa iba't ibang classification levels?

Oo. Gamitin ang `classification_models` config:

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

Ang mga sessions na naka-taint sa isang specific level ay gagamit ng kaukulang model. Ang mga levels na walang explicit na overrides ay bumabagsak sa primary model.

---

## Docker

### Paano ko patakbuhin ang Triggerfish sa Docker?

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/docker/install.sh | bash
```

Dina-download nito ang Docker wrapper script at compose file, pinu-pull ang image, at pinapatakbo ang setup wizard.

### Saan sino-store ang data sa Docker?

Lahat ng persistent data ay nasa Docker named volume (`triggerfish-data`) na naka-mount sa `/data` sa loob ng container. Kasama rito ang config, secrets, ang SQLite database, logs, skills, at agent workspaces.

### Paano gumagana ang secrets sa Docker?

Hindi maa-access ng Docker containers ang host OS keychain. Sa halip, gumagamit ang Triggerfish ng encrypted file store: `secrets.json` (encrypted values) at `secrets.key` (AES-256 encryption key), parehong naka-store sa `/data` volume. Ituring ang volume bilang sensitibo.

### Hindi mahanap ng container ang config file ko

Siguraduhing tama ang pag-mount mo:

```bash
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
```

Kung mag-start ang container nang walang config file, magpi-print ito ng help message at mag-exit.

### Paano i-update ang Docker image?

```bash
triggerfish update    # Kung gumagamit ng wrapper script
# o kaya
docker compose pull && docker compose up -d
```

---

## Skills & The Reef

### Ano ang skill?

Ang skill ay isang folder na naglalaman ng `SKILL.md` file na nagbibigay sa agent ng mga bagong capabilities, context, o behavioral guidelines. Puwedeng maglaman ang skills ng tool definitions, code, templates, at instructions.

### Ano ang The Reef?

Ang The Reef ang skill marketplace ng Triggerfish. Puwede kang mag-discover, mag-install, at mag-publish ng mga skills dito:

```bash
triggerfish skill search "web scraping"
triggerfish skill install reef://data-extraction
```

### Bakit na-block ng security scanner ang skill ko?

Bawat skill ay nii-scan bago i-install. Tinitingnan ng scanner ang mga suspicious patterns, labis na permissions, at classification ceiling violations. Kung ang ceiling ng skill ay mas mababa sa iyong kasalukuyang session taint, bina-block ang activation para maiwasan ang write-down.

### Ano ang classification ceiling sa isang skill?

Nagde-declare ang mga skills ng maximum classification level kung saan pinapayagan silang mag-operate. Ang skill na may `classification_ceiling: INTERNAL` ay hindi ma-a-activate sa session na naka-taint sa CONFIDENTIAL o mas mataas. Pinipigilan nito ang mga skills na maka-access ng data na mas mataas sa kanilang clearance.

---

## Triggers & Scheduling

### Ano ang mga triggers?

Ang mga triggers ay periodic na agent wakeups para sa proactive behavior. Dine-define mo kung ano ang dapat i-check ng agent sa `TRIGGER.md`, at gigisingin ito ng Triggerfish sa isang schedule. Rere-review ng agent ang instructions nito, kikilos (mag-check ng calendar, mag-monitor ng service, magpadala ng reminder), at matutulog ulit.

### Paano iba ang triggers sa cron jobs?

Nagpapatakbo ang cron jobs ng fixed na task sa isang schedule. Ang triggers ay gigisingin ang agent kasama ang buong context nito (memory, tools, channel access) at hahayaan itong mag-desisyon kung ano ang gagawin base sa `TRIGGER.md` instructions. Ang cron ay mekanikal; ang triggers ay agentic.

### Ano ang quiet hours?

Pinipigilan ng `quiet_hours` setting sa `scheduler.trigger` ang mga triggers na mag-fire sa mga tinukoy na oras:

```yaml
scheduler:
  trigger:
    interval: "30m"
    quiet_hours: "22:00-07:00"
```

### Paano gumagana ang webhooks?

Ang mga external services ay puwedeng mag-POST sa webhook endpoint ng Triggerfish para mag-trigger ng agent actions. Ang bawat webhook source ay nangangailangan ng HMAC signing para sa authentication at kasama ang replay detection.

---

## Agent Teams

### Ano ang agent teams?

Ang agent teams ay mga persistent groups ng mga nagko-collaborate na agents na nagtutulungan sa mga kumplikadong tasks. Bawat team member ay isang hiwalay na agent session na may sariling role, conversation context, at tools. Isa ang nakatalagang lead na nagko-coordinate ng trabaho. Tingnan ang [Agent Teams](/features/agent-teams) para sa buong dokumentasyon.

### Paano iba ang teams sa sub-agents?

Ang sub-agents ay fire-and-forget: magde-delegate ka ng isang task at hihintayin ang result. Ang teams ay persistent -- ang mga members ay nagko-communicate sa isa't isa sa pamamagitan ng `sessions_send`, kino-coordinate ng lead ang trabaho, at tumatakbo ang team nang autonomous hanggang ma-disband o mag-time out. Gamitin ang sub-agents para sa focused na delegation; gamitin ang teams para sa kumplikadong multi-role collaboration.

### Nangangailangan ba ng paid plan ang agent teams?

Nangangailangan ang agent teams ng **Power** plan ($149/month) kapag gumagamit ng Triggerfish Gateway. Ang open source users na nagpapatakbo ng sariling API keys ay may buong access -- ang bawat team member ay kumokukunsumo ng inference mula sa configured mong LLM provider.

### Bakit agad nag-fail ang team lead ko?

Ang pinaka-karaniwang dahilan ay misconfigured na LLM provider. Bawat team member ay nagsa-spawn ng sariling agent session na nangangailangan ng gumaganang LLM connection. Tingnan ang `triggerfish logs` para sa provider errors sa paligid ng oras ng team creation. Tingnan ang [Agent Teams Troubleshooting](/fil-PH/support/troubleshooting/security#agent-teams) para sa higit pang detalye.

### Puwede bang gumamit ng iba't ibang models ang team members?

Oo. Bawat member definition ay tumatanggap ng optional na `model` field. Kung wala, mana-mana ng member ang model ng creating agent. Pinapayagan ka nitong mag-assign ng mahal na models sa mga kumplikadong roles at mas murang models sa mga simpleng roles.

### Gaano katagal puwedeng tumakbo ang isang team?

Bilang default, ang mga teams ay may 1-hour na lifetime (`max_lifetime_seconds: 3600`). Kapag naabot ang limit, makakakuha ng 60-second na warning ang lead para mag-produce ng final output, pagkatapos ay awtomatikong idi-disband ang team. Puwede kang mag-configure ng mas mahabang lifetime sa oras ng creation.

### Ano ang mangyayari kung mag-crash ang isang team member?

Naide-detect ng lifecycle monitor ang mga member failures sa loob ng 30 segundo. Ang mga failed members ay mama-mark bilang `failed` at ino-notify ang lead na magpatuloy sa mga natitirang members o mag-disband. Kung ang lead mismo ang mag-fail, napa-pause ang team at ino-notify ang creating session.

---

## Iba Pa

### Open source ba ang Triggerfish?

Oo, Apache 2.0 licensed. Ang buong source code, kasama ang lahat ng security-critical components, ay available para sa audit sa [GitHub](https://github.com/greghavens/triggerfish).

### Nagpho-phone home ba ang Triggerfish?

Hindi. Ang Triggerfish ay hindi gumagawa ng outbound connections maliban sa mga services na explicitly mong na-configure (LLM providers, channel APIs, integrations). Walang telemetry, analytics, o update checking maliban kung patakbuhin mo ang `triggerfish update`.

### Puwede ko bang patakbuhin ang maraming agents?

Oo. Ang `agents` config section ay nagde-define ng maraming agents, bawat isa ay may sariling pangalan, model, channel bindings, tool sets, at classification ceilings. Ang routing system ang nagdi-direct ng mga mensahe sa tamang agent.

### Ano ang gateway?

Ang gateway ang internal WebSocket control plane ng Triggerfish. Namamahala ito ng mga sessions, nag-ro-route ng mga mensahe sa pagitan ng channels at ng agent, nagdi-dispatch ng tools, at nagpa-patupad ng policy. Kumokonekta ang CLI chat interface sa gateway para makipag-communicate sa iyong agent.

### Anong mga ports ang ginagamit ng Triggerfish?

| Port | Layunin | Binding |
|------|---------|---------|
| 18789 | Gateway WebSocket | localhost lamang |
| 18790 | Tidepool A2UI | localhost lamang |
| 8765 | WebChat (kung enabled) | configurable |
| 8443 | WhatsApp webhook (kung enabled) | configurable |

Lahat ng default ports ay naka-bind sa localhost. Wala sa mga ito ang naka-expose sa network maliban kung explicitly mong i-configure o gumamit ng reverse proxy.
