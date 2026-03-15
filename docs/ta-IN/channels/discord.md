# Discord

Server channels மற்றும் direct messages இல் respond செய்ய உங்கள் Triggerfish agent ஐ Discord உடன் இணைக்கவும். Adapter Discord Gateway உடன் இணைக்க [discord.js](https://discord.js.org/) பயன்படுத்துகிறது.

## Default Classification

Discord `PUBLIC` classification க்கு default ஆகும். Discord servers பெரும்பாலும் நம்பகமான members மற்றும் public visitors கலவை சேர்க்கும், எனவே `PUBLIC` பாதுகாப்பான default. உங்கள் server private மற்றும் நம்பகமானதென்றால் இதை உயர்த்தலாம்.

## Setup

### படி 1: ஒரு Discord Application உருவாக்கவும்

1. [Discord Developer Portal](https://discord.com/developers/applications) க்கு செல்லவும்
2. **New Application** click செய்யவும்
3. உங்கள் application க்கு பெயரிடுங்கள் (உதா., "Triggerfish")
4. **Create** click செய்யவும்

### படி 2: ஒரு Bot User உருவாக்கவும்

1. உங்கள் application இல், sidebar இல் **Bot** க்கு navigate செய்யவும்
2. **Add Bot** click செய்யவும் (ஏற்கனவே உருவாக்கப்படவில்லையென்றால்)
3. Bot இன் username இல், புதிய token generate செய்ய **Reset Token** click செய்யவும்
4. **bot token** copy செய்யவும்

::: warning உங்கள் Token ஐ இரகசியமாக வைக்கவும் உங்கள் bot token உங்கள் bot இன் முழு கட்டுப்பாட்டை வழங்குகிறது. அதை source control க்கு commit செய்யவோ பொதுவில் share செய்யவோ வேண்டாம். :::

### படி 3: Privileged Intents கட்டமைக்கவும்

**Bot** page இல் தொடர்ந்து, இந்த privileged gateway intents enable செய்யவும்:

- **Message Content Intent** -- செய்தி content படிக்க தேவை
- **Server Members Intent** -- விரும்பினால், member lookup க்கு

### படி 4: உங்கள் Discord User ID பெறவும்

1. Discord திறக்கவும்
2. **Settings** > **Advanced** க்கு செல்லவும் மற்றும் **Developer Mode** enable செய்யவும்
3. Discord இல் எங்கும் உங்கள் username click செய்யவும்
4. **Copy User ID** click செய்யவும்

இது Triggerfish owner அடையாளத்தை verify செய்ய பயன்படுத்தும் snowflake ID.

### படி 5: ஒரு Invite Link Generate செய்யவும்

1. Developer Portal இல், **OAuth2** > **URL Generator** க்கு navigate செய்யவும்
2. **Scopes** இல், `bot` தேர்வு செய்யவும்
3. **Bot Permissions** இல் தேர்வு செய்யவும்:
   - Send Messages
   - Read Message History
   - View Channels
4. Generated URL copy செய்து உங்கள் browser இல் திறக்கவும்
5. Bot சேர்க்க விரும்பும் server தேர்வு செய்து **Authorize** click செய்யவும்

### படி 6: Triggerfish கட்டமைக்கவும்

உங்கள் `triggerfish.yaml` இல் Discord சேனல் சேர்க்கவும்:

```yaml
channels:
  discord:
    # botToken OS keychain இல் சேமிக்கப்பட்டுள்ளது
    ownerId: "123456789012345678"
```

| Option           | Type   | Required         | விளக்கம்                                           |
| ---------------- | ------ | ---------------- | --------------------------------------------------- |
| `botToken`       | string | ஆம்              | Discord bot token                                   |
| `ownerId`        | string | பரிந்துரைக்கப்பட்டது | Owner verification க்கான உங்கள் Discord user ID (snowflake) |
| `classification` | string | இல்லை            | Classification நிலை (default: `PUBLIC`)            |

### படி 7: Triggerfish தொடங்கவும்

```bash
triggerfish stop && triggerfish start
```

Bot present உள்ள ஒரு channel இல் ஒரு செய்தி அனுப்பவும், அல்லது connection ஐ உறுதிப்படுத்த நேரடியாக DM செய்யவும்.

## Owner அடையாளம்

Triggerfish அனுப்புனரின் Discord user ID ஐ கட்டமைக்கப்பட்ட `ownerId` க்கு எதிராக ஒப்பிட்டு owner நிலையை தீர்மானிக்கிறது. இந்த சரிபார்ப்பு LLM செய்தியை பார்ப்பதற்கு முன்பே code இல் நடக்கிறது:

- **பொருந்துகிறது** -- செய்தி ஒரு owner command
- **பொருந்தவில்லை** -- `PUBLIC` taint உடன் செய்தி external input

`ownerId` கட்டமைக்கப்படவில்லையென்றால், அனைத்து செய்திகளும் owner இடமிருந்து வருவதாக கருதப்படுகின்றன.

::: danger எப்போதும் Owner ID அமைக்கவும் உங்கள் bot மற்ற members உள்ள ஒரு server இல் இருந்தால், எப்போதும் `ownerId` கட்டமைக்கவும். அது இல்லாமல், எந்த server member உம் உங்கள் agent க்கு commands கொடுக்கலாம். :::

## Message Chunking

Discord க்கு 2,000-character message வரம்பு உள்ளது. Agent இதை விட நீண்ட response உருவாக்கும்போது, Triggerfish தானாக அதை பல செய்திகளாக பிரிக்கிறது. Chunker படிக்கும் தன்மையை பாதுகாக்க newlines அல்லது spaces இல் பிரிக்கிறது.

## Bot நடத்தை

Discord adapter:

- **தன்னுடைய செய்திகளை ignore செய்கிறது** -- Bot அனுப்பும் செய்திகளுக்கு respond செய்யாது
- **அணுகக்கூடிய அனைத்து channels இலும் கேட்கிறது** -- Guild channels, group DMs, மற்றும் direct messages
- **Message Content Intent தேவை** -- இது இல்லாமல், bot empty message events பெறுகிறது

## Typing Indicators

Agent ஒரு request செயலாக்கும்போது Triggerfish Discord க்கு typing indicators அனுப்புகிறது. Discord bots க்கு நம்பகமான வழியில் பயனர்களிடமிருந்து typing events ஐ expose செய்வதில்லை, எனவே இது send-only.

## Group Chat

Bot server channels இல் பங்கேற்கலாம். Group நடத்தையை கட்டமைக்கவும்:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| நடத்தை           | விளக்கம்                                      |
| ---------------- | ---------------------------------------------- |
| `mentioned-only` | Bot @mentioned ஆகும்போது மட்டும் respond செய்யவும் |
| `always`         | Channel இல் அனைத்து செய்திகளுக்கும் respond செய்யவும் |

## Classification மாற்றுதல்

```yaml
channels:
  discord:
    # botToken OS keychain இல் சேமிக்கப்பட்டுள்ளது
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Valid நிலைகள்: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
