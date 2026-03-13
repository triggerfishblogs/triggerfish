# Telegram

நீங்கள் Telegram பயன்படுத்தும் எந்த device இலிருந்தும் interact செய்ய உங்கள் Triggerfish agent ஐ Telegram உடன் இணைக்கவும். Adapter Telegram Bot API உடன் தொடர்பு கொள்ள [grammY](https://grammy.dev/) framework பயன்படுத்துகிறது.

## Setup

### படி 1: ஒரு Bot உருவாக்கவும்

1. Telegram திறந்து [@BotFather](https://t.me/BotFather) தேடவும்
2. `/newbot` அனுப்பவும்
3. உங்கள் bot க்கு ஒரு display name தேர்வு செய்யவும் (உதா., "My Triggerfish")
4. உங்கள் bot க்கு ஒரு username தேர்வு செய்யவும் (`bot` இல் முடிய வேண்டும், உதா., `my_triggerfish_bot`)
5. BotFather உங்கள் **bot token** உடன் reply செய்யும் -- அதை copy செய்யவும்

::: warning உங்கள் Token ஐ இரகசியமாக வைக்கவும் உங்கள் bot token உங்கள் bot இன் முழு கட்டுப்பாட்டை வழங்குகிறது. அதை source control க்கு commit செய்யவோ பொதுவில் share செய்யவோ வேண்டாம். Triggerfish அதை உங்கள் OS keychain இல் சேமிக்கிறது. :::

### படி 2: உங்கள் Telegram User ID பெறவும்

உங்களிடமிருந்து செய்திகள் என்று சரிபார்க்க Triggerfish க்கு உங்கள் numeric user ID தேவை. Telegram usernames மாற்றப்படலாம் மற்றும் அடையாளத்திற்கு நம்பகமானவை அல்ல -- numeric ID நிரந்தரமானது மற்றும் Telegram இன் servers மூலம் ஒதுக்கப்படுகிறது, எனவே அதை spoof செய்ய முடியாது.

1. Telegram இல் [@getmyid_bot](https://t.me/getmyid_bot) தேடவும்
2. அதற்கு எந்த செய்தியும் அனுப்பவும்
3. அது உங்கள் user ID உடன் reply செய்கிறது (`8019881968` போன்ற ஒரு எண்)

### படி 3: சேனல் சேர்க்கவும்

Interactive setup இயக்கவும்:

```bash
triggerfish config add-channel telegram
```

இது உங்கள் bot token, user ID மற்றும் classification நிலைக்கு prompt செய்கிறது, பின்னர் `triggerfish.yaml` க்கு config எழுதுகிறது மற்றும் daemon ஐ restart செய்ய offer செய்கிறது.

நீங்கள் அதை manually சேர்க்கலாம்:

```yaml
channels:
  telegram:
    # botToken OS keychain இல் சேமிக்கப்பட்டுள்ளது
    ownerId: 8019881968
    classification: INTERNAL
```

| Option           | Type   | Required | விளக்கம்                                     |
| ---------------- | ------ | -------- | --------------------------------------------- |
| `botToken`       | string | ஆம்      | @BotFather இலிருந்து Bot API token           |
| `ownerId`        | number | ஆம்      | உங்கள் numeric Telegram user ID              |
| `classification` | string | இல்லை   | Classification ceiling (default: `INTERNAL`) |

### படி 4: Chat தொடங்கவும்

Daemon restart ஆன பிறகு, Telegram இல் உங்கள் bot திறந்து `/start` அனுப்பவும். Connection live என்று உறுதிப்படுத்த bot உங்களை வரவேற்கும். பின்னர் நேரடியாக உங்கள் agent உடன் chat செய்யலாம்.

## Classification நடத்தை

`classification` setting ஒரு **ceiling** -- இது **owner** conversations க்கு இந்த சேனல் மூலம் ஓட முடியும் data இன் அதிகபட்ச sensitivity ஐ கட்டுப்படுத்துகிறது. இது அனைத்து பயனர்களுக்கும் சீராக பொருந்தாது.

**செய்திக்கு எவ்வாறு செயல்படுகிறது:**

- **நீங்கள் bot க்கு செய்தி அனுப்பும்போது** (உங்கள் user ID `ownerId` உடன் பொருந்துகிறது): Session channel ceiling பயன்படுத்துகிறது. Default `INTERNAL` உடன், உங்கள் agent உங்களுடன் internal-level data share செய்யலாம்.
- **வேறு யாரோ bot க்கு செய்தி அனுப்பும்போது**: Channel classification ஐ பொருட்படுத்தாமல் அவர்களின் session தானாக `PUBLIC` tainted ஆகிறது. No-write-down விதி எந்த internal data வும் அவர்களின் session ஐ அடைவதை தடுக்கிறது.

இதன் பொருள் ஒரு Telegram bot owner மற்றும் non-owner conversations இரண்டையும் பாதுகாப்பாக கையாளுகிறது. அடையாள சரிபார்ப்பு LLM செய்தியை பார்ப்பதற்கு முன்பே code இல் நடக்கிறது -- LLM அதை பாதிக்க முடியாது.

| Channel Classification | Owner Messages     | Non-Owner Messages |
| ---------------------- | :----------------: | :----------------: |
| `PUBLIC`               | PUBLIC             | PUBLIC             |
| `INTERNAL` (default)   | INTERNAL வரை      | PUBLIC             |
| `CONFIDENTIAL`         | CONFIDENTIAL வரை  | PUBLIC             |
| `RESTRICTED`           | RESTRICTED வரை    | PUBLIC             |

முழு model க்கு [Classification System](/ta-IN/architecture/classification) மற்றும் taint escalation எவ்வாறு செயல்படுகிறது என்பதற்கு [Sessions & Taint](/ta-IN/architecture/taint-and-sessions) பாருங்கள்.

## Owner அடையாளம்

Triggerfish அனுப்புனரின் numeric Telegram user ID ஐ கட்டமைக்கப்பட்ட `ownerId` க்கு எதிராக ஒப்பிட்டு owner நிலையை தீர்மானிக்கிறது. இந்த சரிபார்ப்பு LLM செய்தியை பார்ப்பதற்கு **முன்பே** code இல் நடக்கிறது:

- **பொருந்துகிறது** -- செய்தி owner என்று tag ஆகிறது மற்றும் சேனலின் classification ceiling வரை data அணுக முடியும்
- **பொருந்தவில்லை** -- செய்தி `PUBLIC` taint உடன் tag ஆகிறது, மற்றும் no-write-down விதி எந்த classified data வும் அந்த session ஐ அடைவதை தடுக்கிறது

::: danger எப்போதும் உங்கள் Owner ID அமைக்கவும் `ownerId` இல்லாமல், Triggerfish **அனைத்து** அனுப்புனர்களையும் owner என்று கருதுகிறது. உங்கள் bot ஐ கண்டுபிடிப்பவர் எவரும் சேனலின் classification நிலை வரை உங்கள் data அணுக முடியும். இக்காரணத்திற்காக setup போது இந்த field தேவைப்படுகிறது. :::

## Message Chunking

Telegram க்கு 4,096-character message வரம்பு உள்ளது. உங்கள் agent இதை விட நீண்ட response உருவாக்கும்போது, Triggerfish தானாக அதை பல செய்திகளாக பிரிக்கிறது. Chunker படிக்கும் தன்மைக்கு newlines அல்லது spaces இல் பிரிக்கிறது -- words அல்லது sentences ஐ பாதியில் வெட்டுவதை தவிர்க்கிறது.

## ஆதரிக்கப்படும் Message வகைகள்

Telegram adapter தற்போது கையாளுகிறது:

- **Text messages** -- முழு அனுப்பு மற்றும் பெறு support
- **நீண்ட responses** -- Telegram இன் வரம்புகளுக்கு பொருந்த தானாக chunked

## Typing Indicators

உங்கள் agent ஒரு request செயலாக்கும்போது, Telegram chat இல் bot "typing..." காட்டுகிறது. LLM ஒரு response generate செய்யும் போது indicator இயங்குகிறது மற்றும் reply அனுப்பப்படும்போது clear ஆகிறது.

## Classification மாற்றுதல்

Classification ceiling உயர்த்த அல்லது குறைக்க:

```bash
triggerfish config add-channel telegram
# Prompt செய்யும்போது existing config ஐ overwrite செய்ய தேர்வு செய்யவும்
```

அல்லது `triggerfish.yaml` நேரடியாக திருத்தவும்:

```yaml
channels:
  telegram:
    # botToken OS keychain இல் சேமிக்கப்பட்டுள்ளது
    ownerId: 8019881968
    classification: CONFIDENTIAL
```

Valid நிலைகள்: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

மாற்றிய பிறகு daemon restart செய்யவும்: `triggerfish stop && triggerfish start`
