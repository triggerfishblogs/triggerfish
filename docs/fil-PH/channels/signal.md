# Signal

Ikonekta ang iyong Triggerfish agent sa Signal para makapa-message ito ng mga
tao mula sa Signal app. Nakikipag-communicate ang adapter sa isang
[signal-cli](https://github.com/AsamK/signal-cli) daemon sa pamamagitan ng
JSON-RPC, gamit ang iyong linked Signal phone number.

## Paano Naiiba ang Signal

Ang Signal adapter **ay** ang iyong phone number. Hindi tulad ng Telegram o
Slack kung saan may separate bot account, ang mga Signal messages ay mula sa
ibang tao papunta sa iyong number. Ibig sabihin:

- Lahat ng inbound messages ay may `isOwner: false` -- palagi itong mula sa iba
- Tumutugon ang adapter bilang ang iyong phone number
- Walang per-message owner check tulad ng ibang channels

Perpekto ang Signal para sa pagtanggap ng messages mula sa mga contacts na
nagme-message sa iyong number, kung saan tumutugon ang agent sa iyong ngalan.

## Default Classification

Naka-default ang Signal sa `PUBLIC` classification. Dahil lahat ng inbound
messages ay mula sa external contacts, `PUBLIC` ang ligtas na default.

## Setup

### Step 1: Mag-install ng signal-cli

Ang signal-cli ay isang third-party command-line client para sa Signal.
Nakikipag-communicate ang Triggerfish dito sa pamamagitan ng TCP o Unix socket.

**Linux (native build -- walang Java na kailangan):**

I-download ang latest native build mula sa
[signal-cli releases](https://github.com/AsamK/signal-cli/releases) page, o
hayaan ang Triggerfish na i-download ito para sa iyo habang nagse-setup.

**macOS / ibang platforms (JVM build):**

Kailangan ng Java 21+. Pwedeng automatic na mag-download ang Triggerfish ng
portable JRE kung hindi naka-install ang Java.

Pwede ka ring mag-run ng guided setup:

```bash
triggerfish config add-channel signal
```

Chine-check nito ang signal-cli, nag-ooffer na i-download kung wala, at
gina-guide ka sa pag-link.

### Step 2: I-link ang Iyong Device

Kailangan i-link ang signal-cli sa iyong existing Signal account (parang
pag-link ng desktop app):

```bash
signal-cli link -n "Triggerfish"
```

Magpi-print ito ng `tsdevice:` URI. I-scan ang QR code gamit ang iyong Signal
mobile app (Settings > Linked Devices > Link New Device).

### Step 3: I-start ang Daemon

Nare-run ang signal-cli bilang background daemon na kinokonekta ng Triggerfish:

```bash
signal-cli -a +14155552671 daemon --tcp localhost:7583
```

Palitan ang `+14155552671` ng iyong phone number sa E.164 format.

### Step 4: I-configure ang Triggerfish

Idagdag ang Signal sa iyong `triggerfish.yaml`:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: PUBLIC
```

| Option             | Type    | Required | Description                                                                           |
| ------------------ | ------- | -------- | ------------------------------------------------------------------------------------- |
| `endpoint`         | string  | Oo       | signal-cli daemon address (`tcp://host:port` o `unix:///path/to/socket`)              |
| `account`          | string  | Oo       | Ang iyong Signal phone number (E.164 format)                                          |
| `classification`   | string  | Hindi    | Classification ceiling (default: `PUBLIC`)                                            |
| `defaultGroupMode` | string  | Hindi    | Group message handling: `always`, `mentioned-only`, `owner-only` (default: `always`)  |
| `groups`           | object  | Hindi    | Per-group configuration overrides                                                     |
| `ownerPhone`       | string  | Hindi    | Reserved para sa future use                                                           |
| `pairing`          | boolean | Hindi    | I-enable ang pairing mode habang nagse-setup                                          |

### Step 5: I-start ang Triggerfish

```bash
triggerfish stop && triggerfish start
```

Magpadala ng message sa iyong phone number mula sa ibang Signal user para
kumpirmahin ang connection.

## Group Messages

Sumusuporta ang Signal ng group chats. Pwede mong kontrolin kung paano tumutugon
ang agent sa group messages:

| Mode             | Behavior                                                     |
| ---------------- | ------------------------------------------------------------ |
| `always`         | Tumugon sa lahat ng group messages (default)                 |
| `mentioned-only` | Tumugon lang kapag binanggit gamit ang phone number o @mention |
| `owner-only`     | Huwag kailanman tumugon sa groups                            |

I-configure nang global o per-group:

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    defaultGroupMode: mentioned-only
    groups:
      "your-group-id":
        mode: always
        classification: INTERNAL
```

Ang mga Group IDs ay base64-encoded identifiers. Gamitin ang
`triggerfish signal list-groups` o tingnan ang signal-cli documentation para
mahanap ang mga ito.

## Message Chunking

Ang Signal ay may 4,000-character message limit. Ang mga responses na mas
mahaba dito ay automatic na hina-hatiin sa maraming messages, ini-break sa
newlines o spaces para sa readability.

## Typing Indicators

Nagpapadala ang adapter ng typing indicators habang nagpo-process ng request ang
agent. Naci-clear ang typing state kapag naipadala na ang reply.

## Extended Tools

Nag-eexpose ang Signal adapter ng mga karagdagang tools:

- `sendTyping` / `stopTyping` -- Manual typing indicator control
- `listGroups` -- I-list ang lahat ng Signal groups na kasapi ang account
- `listContacts` -- I-list ang lahat ng Signal contacts

## Pagpapalit ng Classification

```yaml
channels:
  signal:
    endpoint: "tcp://127.0.0.1:7583"
    account: "+14155552671"
    classification: INTERNAL
```

Mga valid na levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

I-restart ang daemon pagkatapos magbago: `triggerfish stop && triggerfish start`

## Mga Reliability Feature

Kasama sa Signal adapter ang ilang reliability mechanisms:

### Auto-Reconnection

Kung mawala ang connection sa signal-cli (network interruption, daemon restart),
automatic na nagre-reconnect ang adapter na may exponential backoff. Walang
manual intervention na kailangan.

### Health Checking

Sa startup, chine-check ng Triggerfish kung healthy ang existing signal-cli
daemon gamit ang JSON-RPC ping probe. Kung unresponsive ang daemon, kini-kill at
nire-restart ito nang automatic.

### Version Tracking

Tina-track ng Triggerfish ang known-good signal-cli version (kasalukuyang
0.13.0) at nagbabala sa startup kung mas luma ang installed version mo.
Nilo-log ang signal-cli version sa bawat successful connection.

### Unix Socket Support

Bukod sa TCP endpoints, sumusuporta rin ang adapter ng Unix domain sockets:

```yaml
channels:
  signal:
    endpoint: "unix:///run/signal-cli/socket"
    account: "+14155552671"
```

## Troubleshooting

**Hindi maabot ang signal-cli daemon:**

- I-verify na tumatakbo ang daemon: tingnan ang process o subukan ang
  `nc -z 127.0.0.1 7583`
- IPv4 lang ang bina-bind ng signal-cli -- gamitin ang `127.0.0.1`, hindi
  `localhost`
- TCP default port ay 7583
- Auto na ire-restart ng Triggerfish ang daemon kung may maka-detect na
  unhealthy process

**Hindi dumadating ang mga messages:**

- Kumpirmahin na naka-link ang device: tingnan ang Signal mobile app sa Linked
  Devices
- Kailangan ng signal-cli na makatanggap ng kahit isang sync pagkatapos mag-link
- Tingnan ang logs para sa connection errors: `triggerfish logs --tail`

**Java errors (JVM build lang):**

- Kailangan ng signal-cli JVM build ang Java 21+
- I-run ang `java -version` para tingnan
- Pwedeng mag-download ang Triggerfish ng portable JRE habang nagse-setup kung
  kailangan

**Reconnection loops:**

- Kung nakikita mo ang paulit-ulit na reconnection attempts sa logs, baka
  nagcra-crash ang signal-cli daemon
- Tingnan ang sariling stderr output ng signal-cli para sa errors
- Subukan ang pag-restart na may fresh daemon: ihinto ang Triggerfish, patayin
  ang signal-cli, i-restart pareho
