# பல-சேனல் மேலோட்டம்

Triggerfish உங்கள் தற்போதைய messaging platforms உடன் இணைகிறது. நீங்கள் ஏற்கனவே தொடர்பு கொள்ளும் இடத்தில் -- terminal, Telegram, Slack, Discord, WhatsApp, web widget, அல்லது email -- உங்கள் agent உடன் பேசுகிறீர்கள். ஒவ்வொரு சேனலுக்கும் அதன் சொந்த classification நிலை, owner அடையாள சரிபார்ப்புகள் மற்றும் policy அமலாக்கம் உள்ளது.

## சேனல்கள் எவ்வாறு செயல்படுகின்றன

ஒவ்வொரு channel adapter உம் ஒரே interface ஐ implement செய்கிறது: `connect`, `disconnect`, `send`, `onMessage`, மற்றும் `status`. **Channel router** அனைத்து adapters மேலும் அமர்ந்து message dispatch, classification சரிபார்ப்புகள் மற்றும் retry logic ஐ கையாளுகிறது.

<img src="/diagrams/channel-router.svg" alt="Channel router: all channel adapters flow through a central classification gate to the Gateway Server" style="max-width: 100%;" />

எந்த சேனலிலும் ஒரு செய்தி வரும்போது, router:

1. **Code-level அடையாள சரிபார்ப்புகள்** மூலம் -- LLM interpretation அல்ல -- அனுப்புனரை (owner அல்லது external) அடையாளம் காண்கிறது
2. சேனலின் classification நிலையுடன் செய்தியை tag செய்கிறது
3. அமலாக்கத்திற்கு policy engine க்கு அனுப்புகிறது
4. Agent இன் response ஐ அதே சேனல் மூலம் திரும்ப அனுப்புகிறது

## சேனல் Classification

ஒவ்வொரு சேனலுக்கும் ஒரு default classification நிலை உள்ளது, இது எந்த data அதன் மூலம் ஓட முடியும் என்பதை தீர்மானிக்கிறது. Policy engine **no write-down விதியை** அமல்படுத்துகிறது: கொடுக்கப்பட்ட classification நிலையிலுள்ள data குறைந்த classification உள்ள சேனலுக்கு ஒருபோதும் ஓட முடியாது.

| சேனல்                              | Default Classification | Owner கண்டறிதல்                         |
| ----------------------------------- | :--------------------: | ----------------------------------------- |
| [CLI](/ta-IN/channels/cli)          |       `INTERNAL`       | எப்போதும் owner (terminal பயனர்)         |
| [Telegram](/ta-IN/channels/telegram) |       `INTERNAL`       | Telegram user ID பொருத்தம்               |
| [Signal](/ta-IN/channels/signal)    |        `PUBLIC`        | ஒருபோதும் owner அல்ல (adapter உங்கள் phone) |
| [Slack](/ta-IN/channels/slack)      |        `PUBLIC`        | OAuth மூலம் Slack user ID                |
| [Discord](/ta-IN/channels/discord)  |        `PUBLIC`        | Discord user ID பொருத்தம்               |
| [WhatsApp](/ta-IN/channels/whatsapp) |        `PUBLIC`        | Phone number பொருத்தம்                  |
| [WebChat](/ta-IN/channels/webchat)  |        `PUBLIC`        | ஒருபோதும் owner அல்ல (visitors)         |
| [Email](/ta-IN/channels/email)      |     `CONFIDENTIAL`     | Email address பொருத்தம்                 |

::: tip முழுமையாக கட்டமைக்கக்கூடியது உங்கள் `triggerfish.yaml` இல் அனைத்து classifications உம் கட்டமைக்கக்கூடியவை. உங்கள் பாதுகாப்பு தேவைகளின் அடிப்படையில் எந்த சேனலையும் எந்த classification நிலைக்கும் அமைக்கலாம்.

```yaml
channels:
  telegram:
    classification: CONFIDENTIAL
  slack:
    classification: INTERNAL
```

:::

## Effective Classification

எந்த செய்திக்கும் effective classification என்பது சேனல் classification மற்றும் பெறுநர் classification இன் **குறைந்தபட்சம்**:

| சேனல் நிலை  | பெறுநர் நிலை | Effective நிலை |
| ------------ | ------------- | --------------- |
| INTERNAL     | INTERNAL      | INTERNAL        |
| INTERNAL     | EXTERNAL      | PUBLIC          |
| CONFIDENTIAL | INTERNAL      | INTERNAL        |
| CONFIDENTIAL | EXTERNAL      | PUBLIC          |

இதன் பொருள் ஒரு சேனல் `CONFIDENTIAL` என்று வகைப்படுத்தப்பட்டாலும், அந்த சேனலில் external பெறுநர்களுக்கான செய்திகள் `PUBLIC` என்று கருதப்படுகின்றன.

## சேனல் நிலைகள்

சேனல்கள் வரையறுக்கப்பட்ட நிலைகள் மூலம் நகர்கின்றன:

- **UNTRUSTED** -- புதிய அல்லது தெரியாத சேனல்கள் இங்கே தொடங்குகின்றன. Data உள்ளேயோ வெளியேயோ ஓடுவதில்லை. நீங்கள் அதை classify செய்யும் வரை சேனல் முழுமையாக தனிமைப்படுத்தப்படுகிறது.
- **CLASSIFIED** -- சேனலுக்கு ஒரு classification நிலை ஒதுக்கப்பட்டுள்ளது மற்றும் active ஆக உள்ளது. Policy விதிகளுக்கு இணங்க செய்திகள் ஓடுகின்றன.
- **BLOCKED** -- சேனல் வெளிப்படையாக முடக்கப்பட்டுள்ளது. செய்திகள் எதுவும் செயலாக்கப்படவில்லை.

::: warning UNTRUSTED சேனல்கள் ஒரு `UNTRUSTED` சேனல் agent இலிருந்து எந்த data வையும் பெற முடியாது மற்றும் agent இன் context க்கு data அனுப்ப முடியாது. இது ஒரு hard பாதுகாப்பு எல்லை, ஒரு பரிந்துரை அல்ல. :::

## சேனல் Router

Channel router அனைத்து பதிவு செய்யப்பட்ட adapters ஐ நிர்வகிக்கிறது மற்றும் வழங்குகிறது:

- **Adapter பதிவு** -- Channel ID மூலம் channel adapters ஐ பதிவு செய்யவும் மற்றும் நீக்கவும்
- **Message dispatch** -- Outbound செய்திகளை சரியான adapter க்கு route செய்யவும்
- **Exponential backoff உடன் Retry** -- தோல்வியுற்ற sends அதிகரிக்கும் delays உடன் (1s, 2s, 4s) 3 முறை வரை retry ஆகின்றன
- **Bulk operations** -- Lifecycle management க்கு `connectAll()` மற்றும் `disconnectAll()`

```yaml
# Router retry behavior கட்டமைக்கக்கூடியது
router:
  maxRetries: 3
  baseDelay: 1000 # milliseconds
```

## Ripple: Typing மற்றும் Presence

Triggerfish அவற்றை support செய்யும் சேனல்களில் typing indicators மற்றும் presence நிலையை relay செய்கிறது. இது **Ripple** என்று அழைக்கப்படுகிறது.

| சேனல்    | Typing Indicators   | Read Receipts |
| -------- | :---------------:   | :-----------: |
| Telegram | அனுப்பு மற்றும் பெறு | ஆம்           |
| Signal   | அனுப்பு மற்றும் பெறு | --            |
| Slack    | அனுப்பு மட்டும்     | --            |
| Discord  | அனுப்பு மட்டும்     | --            |
| WhatsApp | அனுப்பு மற்றும் பெறு | ஆம்           |
| WebChat  | அனுப்பு மற்றும் பெறு | ஆம்           |

Agent presence நிலைகள்: `idle`, `online`, `away`, `busy`, `processing`, `speaking`, `error`.

## Message Chunking

Platforms க்கு message நீள வரம்புகள் உள்ளன. Triggerfish ஒவ்வொரு platform இன் கட்டுப்பாடுகளுக்கு பொருந்த நீண்ட responses ஐ தானாக chunk செய்கிறது, படிக்கும் தன்மைக்கு newlines அல்லது spaces இல் பிரிக்கிறது:

| சேனல்    | அதிகபட்ச செய்தி நீளம் |
| -------- | :--------------------: |
| Telegram |  4,096 characters      |
| Signal   |  4,000 characters      |
| Discord  |  2,000 characters      |
| Slack    | 40,000 characters      |
| WhatsApp |  4,096 characters      |
| WebChat  |     Unlimited          |

## அடுத்த படிகள்

நீங்கள் பயன்படுத்தும் சேனல்களை அமைக்கவும்:

- [CLI](/ta-IN/channels/cli) -- எப்போதும் கிடைக்கும், setup தேவையில்லை
- [Telegram](/ta-IN/channels/telegram) -- @BotFather மூலம் ஒரு bot உருவாக்கவும்
- [Signal](/ta-IN/channels/signal) -- signal-cli daemon மூலம் இணைக்கவும்
- [Slack](/ta-IN/channels/slack) -- Socket Mode உடன் ஒரு Slack app உருவாக்கவும்
- [Discord](/ta-IN/channels/discord) -- ஒரு Discord bot application உருவாக்கவும்
- [WhatsApp](/ta-IN/channels/whatsapp) -- WhatsApp Business Cloud API மூலம் இணைக்கவும்
- [WebChat](/ta-IN/channels/webchat) -- உங்கள் site இல் ஒரு chat widget embed செய்யவும்
- [Email](/ta-IN/channels/email) -- IMAP மற்றும் SMTP relay மூலம் இணைக்கவும்
