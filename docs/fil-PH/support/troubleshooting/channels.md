# Troubleshooting: Channels

## Mga Pangkalahatang Isyu sa Channel

### Mukhang nakakonekta ang channel pero walang dumarating na mensahe

1. **Tingnan ang owner ID.** Kung hindi naka-set o mali ang `ownerId`, puwedeng ma-route ang mga mensahe mo bilang external (non-owner) messages na may restricted permissions.
2. **Tingnan ang classification.** Kung mas mababa ang classification ng channel kaysa sa session taint, bina-block ang mga responses ng no-write-down rule.
3. **Tingnan ang daemon logs.** Patakbuhin ang `triggerfish logs --level WARN` at maghanap ng delivery errors.

### Hindi naipapadala ang mga mensahe

Nila-log ng router ang delivery failures. Tingnan ang `triggerfish logs` para sa:

```
Channel send failed
```

Ibig sabihin nito ay sinubukang mag-deliver ng router pero nagbalik ng error ang channel adapter. Ang specific na error ay naka-log kasama nito.

### Retry behavior

Gumagamit ang channel router ng exponential backoff para sa mga failed sends. Kung mabigo ang isang mensahe, nire-retry ito na may tumataas na delays. Pagkatapos maubos ang lahat ng retries, dina-drop ang mensahe at nila-log ang error.

---

## Telegram

### Hindi sumasagot ang bot

1. **I-verify ang token.** Pumunta sa @BotFather sa Telegram, i-check na valid ang token mo at tugma sa nasa keychain.
2. **Direktang i-message ang bot.** Ang group messages ay nangangailangan ng group message permissions sa bot.
3. **Tingnan kung may polling errors.** Gumagamit ang Telegram ng long polling. Kung madiskonekta, awtomatikong magre-reconnect ang adapter, pero ang persistent na network issues ay pipigil sa pagtanggap ng mensahe.

### Hinati sa maraming parte ang mga mensahe

May 4,096-character limit ang Telegram bawat mensahe. Awtomatikong hinahati ang mga mahabang responses. Normal na behavior ito.

### Hindi lumalabas ang bot commands sa menu

Nire-register ng adapter ang slash commands sa startup. Kung mabigo ang registration, nagla-log ito ng warning pero patuloy na tumatakbo. Hindi ito fatal. Gumagana pa rin ang bot; ang command menu lang ang hindi magpapakita ng autocomplete suggestions.

### Hindi ma-delete ang mga lumang mensahe

Hindi pinapayagan ng Telegram ang mga bots na mag-delete ng mga mensaheng mas matanda sa 48 oras. Tahimik na nabibigo ang mga attempts na mag-delete ng lumang mensahe. Ito ay isang Telegram API limitation.

---

## Slack

### Hindi nakakonekta ang bot

Nangangailangan ang Slack ng tatlong credentials:

| Credential | Format | Saan mahahanap |
|-----------|--------|-------------------|
| Bot Token | `xoxb-...` | OAuth & Permissions page sa Slack app settings |
| App Token | `xapp-...` | Basic Information > App-Level Tokens |
| Signing Secret | Hex string | Basic Information > App Credentials |

Kung kulang o invalid ang kahit alin sa tatlo, mabibigo ang connection. Ang pinakakaraniwang pagkakamali ay pagkalimot sa App Token, na hiwalay sa Bot Token.

### Mga isyu sa Socket Mode

Gumagamit ang Triggerfish ng Socket Mode ng Slack, hindi HTTP event subscriptions. Sa iyong Slack app settings:

1. Pumunta sa "Socket Mode" at siguraduhing enabled ito
2. Gumawa ng app-level token na may `connections:write` scope
3. Ang token na ito ang `appToken` (`xapp-...`)

Kung hindi enabled ang Socket Mode, hindi sapat ang bot token lang para sa real-time messaging.

### Napu-putol ang mga mensahe

May 40,000-character limit ang Slack. Hindi katulad ng Telegram at Discord, tina-truncate ng Triggerfish ang Slack messages sa halip na hatiin sa maraming mensahe. Kung madalas kang pumapalo sa limit na ito, isaalang-alang na hilingin sa iyong agent na gumawa ng mas maiikling output.

### Mga SDK resource leaks sa tests

Nagla-leak ng async operations ang Slack SDK sa pag-import. Ito ay isang kilalang upstream issue. Ang mga tests na gumagamit ng Slack adapter ay nangangailangan ng `sanitizeResources: false` at `sanitizeOps: false`. Hindi ito nakakaapekto sa production use.

---

## Discord

### Hindi mabasa ng bot ang mga mensahe sa servers

Nangangailangan ang Discord ng **Message Content** privileged intent. Kung wala ito, natatanggap ng bot ang message events pero walang laman ang message content.

**Ayusin:** Sa [Discord Developer Portal](https://discord.com/developers/applications):
1. Piliin ang iyong application
2. Pumunta sa "Bot" settings
3. I-enable ang "Message Content Intent" sa ilalim ng Privileged Gateway Intents
4. I-save ang mga changes

### Mga required bot intents

Nangangailangan ang adapter ng mga intents na ito na enabled:

- Guilds
- Guild Messages
- Direct Messages
- Message Content (privileged)

### Hinahati ang mga mensahe

May 2,000-character limit ang Discord. Awtomatikong hinahati sa maraming mensahe ang mga mahabang mensahe.

### Nabibigo ang typing indicator

Nagpapadala ang adapter ng typing indicators bago ang mga responses. Kung walang permission ang bot na magpadala ng mensahe sa isang channel, tahimik na nabibigo ang typing indicator (nila-log sa DEBUG level). Cosmetic lamang ito.

### Mga SDK resource leaks

Tulad ng Slack, ang discord.js SDK ay nagla-leak ng async operations sa pag-import. Nangangailangan ang tests ng `sanitizeOps: false`. Hindi ito nakakaapekto sa production.

---

## WhatsApp

### Walang natatanggap na mensahe

Gumagamit ang WhatsApp ng webhook model. Naka-listen ang bot sa mga papasok na HTTP POST requests mula sa servers ng Meta. Para makarating ang mga mensahe:

1. **I-register ang webhook URL** sa [Meta Business Dashboard](https://developers.facebook.com/)
2. **I-configure ang verify token.** Nagpapatakbo ang adapter ng verification handshake kapag unang kumokonekta ang Meta
3. **I-start ang webhook listener.** Naka-listen ang adapter sa port 8443 bilang default. Siguraduhing naabot ang port na ito mula sa internet (gumamit ng reverse proxy o tunnel)

### "ownerPhone not configured" warning

Kung hindi naka-set ang `ownerPhone` sa WhatsApp channel config, lahat ng senders ay itinuturing bilang owner. Ibig sabihin nito ay lahat ng user ay may buong access sa lahat ng tools. Ito ay isang security issue.

**Ayusin:** I-set ang owner phone number sa iyong config:

```yaml
channels:
  whatsapp:
    ownerPhone: "+1234567890"
```

### Expired na ang access token

Puwedeng mag-expire ang WhatsApp Cloud API access tokens. Kung nagsisimulang mag-fail ang mga sends na may 401 errors, i-regenerate ang token sa Meta dashboard at i-update ito:

```bash
triggerfish config set-secret whatsapp:accessToken <new-token>
```

---

## Signal

### Hindi nahanap ang signal-cli

Nangangailangan ang Signal channel ng `signal-cli`, isang third-party Java application. Sinusubukan ng Triggerfish na awtomatikong i-install ito sa setup, pero puwedeng mabigo kung:

- Hindi available ang Java (JRE 21+) at nabigo ang auto-install ng JRE 25
- Na-block ng network restrictions ang download
- Hindi writable ang target directory

**Manual install:**

```bash
# Mano-manong i-install ang signal-cli
# Tingnan ang https://github.com/AsamK/signal-cli para sa instructions
```

### Hindi naabot ang signal-cli daemon

Pagkatapos i-start ang signal-cli, naghihintay ang Triggerfish ng hanggang 60 segundo para maging reachable ito. Kung mag-time out ito:

```
signal-cli daemon (tcp) not reachable within 60s
```

Tingnan:
1. Tumatakbo ba talaga ang signal-cli? Tingnan ang `ps aux | grep signal-cli`
2. Naka-listen ba ito sa inaasahang endpoint (TCP socket o Unix socket)?
3. Kailangan bang i-link ang Signal account? Patakbuhin ang `triggerfish config add-channel signal` para ulitin ang linking process.

### Nabigo ang device linking

Nangangailangan ang Signal ng pag-link ng device sa iyong Signal account sa pamamagitan ng QR code. Kung mabigo ang linking process:

1. Siguraduhing naka-install ang Signal sa iyong phone
2. Buksan ang Signal > Settings > Linked Devices > Link New Device
3. I-scan ang QR code na ipinapakita ng setup wizard
4. Kung nag-expire ang QR code, ulitin ang linking process

### signal-cli version mismatch

Naka-pin ang Triggerfish sa isang known-good version ng signal-cli. Kung nag-install ka ng ibang version, puwedeng makakita ka ng warning:

```
Signal CLI version older than known-good
```

Hindi ito fatal pero puwedeng magdulot ng compatibility issues.

---

## Email

### Nabigo ang IMAP connection

Kumokonekta ang email adapter sa iyong IMAP server para sa incoming mail. Mga karaniwang isyu:

- **Maling credentials.** I-verify ang IMAP username at password.
- **Naka-block ang port 993.** Gumagamit ang adapter ng IMAP over TLS (port 993). Bina-block ito ng ilang networks.
- **Kailangan ng app-specific password.** Ang Gmail at ibang providers ay nangangailangan ng app-specific passwords kapag enabled ang 2FA.

Mga error messages na puwedeng makita mo:
- `IMAP LOGIN failed` - maling username o password
- `IMAP connection not established` - hindi maabot ang server
- `IMAP connection closed unexpectedly` - binitawan ng server ang connection

### Mga SMTP send failures

Nagpapadala ang email adapter sa pamamagitan ng SMTP API relay (hindi direct SMTP). Kung mabigo ang mga sends na may HTTP errors:

- 401/403: Invalid ang API key
- 429: Rate limited
- 5xx: Down ang relay service

### Huminto ang IMAP polling

Nagpo-poll ang adapter para sa bagong emails kada 30 segundo. Kung mabigo ang polling, nila-log ang error pero walang awtomatikong reconnection. I-restart ang daemon para i-re-establish ang IMAP connection.

Ito ay isang kilalang limitation. Tingnan ang [Known Issues](/fil-PH/support/kb/known-issues).

---

## WebChat

### Na-reject ang WebSocket upgrade

Vina-validate ng WebChat adapter ang mga papasok na connections:

- **Masyadong malaki ang headers (431).** Lumampas ang combined header size sa 8,192 bytes. Puwedeng mangyari ito sa malalaking cookies o custom headers.
- **CORS rejection.** Kung naka-configure ang `allowedOrigins`, kailangan mag-match ang Origin header. Ang default ay `["*"]` (payagan lahat).
- **Malformed frames.** Ang invalid JSON sa WebSocket frames ay nila-log sa WARN level at dina-drop ang frame.

### Classification

Ang WebChat ay naka-default sa PUBLIC classification. Ang mga visitor ay hindi kailanman itinuturing bilang owner. Kung kailangan mo ng mas mataas na classification para sa WebChat, i-set ito nang explicitly:

```yaml
channels:
  webchat:
    classification: INTERNAL
```

---

## Google Chat

### Mga PubSub polling failures

Gumagamit ang Google Chat ng Pub/Sub para sa message delivery. Kung mabigo ang polling:

```
Google Chat PubSub poll failed
```

Tingnan:
- Valid ang Google Cloud credentials (tingnan ang `credentials_ref` sa config)
- Umiiral ang Pub/Sub subscription at hindi na-delete
- May `pubsub.subscriber` role ang service account

### Na-deny ang group messages

Kung hindi naka-configure ang group mode, puwedeng tahimik na i-drop ang group messages:

```
Google Chat group message denied by group mode
```

I-configure ang `defaultGroupMode` sa Google Chat channel config.

### Hindi naka-configure ang ownerEmail

Kung walang `ownerEmail`, lahat ng users ay itinuturing bilang non-owner:

```
Google Chat ownerEmail not configured, defaulting to non-owner
```

I-set ito sa iyong config para makakuha ng buong tool access.
