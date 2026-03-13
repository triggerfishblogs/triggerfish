---
layout: home

hero:
  name: Triggerfish
  text: பாதுகாப்பான AI Agent கள்
  tagline: LLM அடுக்கிற்கு கீழே நிர்ணயவாத கொள்கை அமலாக்கம். ஒவ்வொரு சேனலிலும். எந்த விதிவிலக்கும் இல்லை.
  image:
    src: /triggerfish.png
    alt: Triggerfish — டிஜிட்டல் கடலில் சுற்றித் திரிகிறது
  actions:
    - theme: brand
      text: தொடங்குங்கள்
      link: /ta-IN/guide/
    - theme: alt
      text: விலை நிர்ணயம்
      link: /ta-IN/pricing
    - theme: alt
      text: GitHub இல் பாருங்கள்
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: LLM க்கு கீழே பாதுகாப்பு
    details: நிர்ணயவாத, sub-LLM கொள்கை அமலாக்கம். AI க்கு bypass, override அல்லது தாக்கம் செய்ய முடியாத தூய கோட் hook கள். ஒரே input எப்போதும் ஒரே முடிவை உருவாக்கும்.
  - icon: "\U0001F4AC"
    title: நீங்கள் பயன்படுத்தும் ஒவ்வொரு சேனலும்
    details: Telegram, Slack, Discord, WhatsApp, Email, WebChat, CLI — அனைத்தும் per-channel வகைப்படுத்தல் மற்றும் தானியங்கி taint கண்காணிப்புடன்.
  - icon: "\U0001F528"
    title: எதையும் உருவாக்குங்கள்
    details: write/run/fix feedback loop உடன் Agent execution environment. தன்னை தானே உருவாக்கும் skills. திறன்களை கண்டுபிடிக்கவும் பகிரவும் The Reef marketplace.
  - icon: "\U0001F916"
    title: எந்த LLM வழங்குநரும்
    details: Anthropic, OpenAI, Google Gemini, Ollama மூலம் உள்ளூர் மாதிரிகள், OpenRouter. தானியங்கி failover சங்கிலிகள். அல்லது Triggerfish Gateway தேர்வு செய்யுங்கள் — API விசைகள் தேவையில்லை.
  - icon: "\U0001F3AF"
    title: இயல்பாகவே முன்கூட்டியே செயல்படுவது
    details: Cron jobs, triggers மற்றும் webhooks. உங்கள் agent கண்காணிக்கிறது, கவனிக்கிறது, மற்றும் சுயாதீனமாக செயல்படுகிறது — கடுமையான கொள்கை எல்லைகளுக்கு உள்ளே.
  - icon: "\U0001F310"
    title: திறந்த மூல
    details: Apache 2.0 உரிமம். பாதுகாப்பு-முக்கியமான கூறுகள் தணிக்கைக்காக முழுமையாக திறந்திருக்கின்றன. எங்களை நம்பாதீர்கள் — கோட்டை சரிபாருங்கள்.
---

<LatestRelease />

## ஒரே கட்டளையில் நிறுவுங்கள்

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

binary installer கள் முன்கூட்டியே உருவாக்கப்பட்ட release ஐ பதிவிறக்கி, அதன் checksum ஐ சரிபார்த்து, setup wizard ஐ இயக்குகின்றன. Docker அமைப்பு, மூலத்திலிருந்து build மற்றும் release செயல்முறைக்கு [நிறுவல் வழிகாட்டியைப்](/ta-IN/guide/installation) பாருங்கள்.

API விசைகளை நிர்வகிக்க விரும்பவில்லையா? Triggerfish Gateway க்காக [விலை நிர்ணயத்தைப் பாருங்கள்](/ta-IN/pricing) — நிர்வகிக்கப்பட்ட LLM மற்றும் search infrastructure, நிமிடங்களில் தயார்.

## இது எவ்வாறு செயல்படுகிறது

Triggerfish உங்கள் AI agent க்கும் அது தொடும் அனைத்திற்கும் இடையே ஒரு நிர்ணயவாத கொள்கை அடுக்கை வைக்கிறது. LLM செயல்களை முன்மொழிகிறது — தூய கோட் hook கள் அவை அனுமதிக்கப்பட்டதா என்பதை தீர்மானிக்கின்றன.

- **நிர்ணயவாத கொள்கை** — பாதுகாப்பு முடிவுகள் தூய கோட் ஆகும். எந்த சீரற்றதன்மையும் இல்லை, LLM தாக்கமும் இல்லை, விதிவிலக்கும் இல்லை. ஒரே input, ஒரே முடிவு, எப்போதும்.
- **தகவல் ஓட்ட கட்டுப்பாடு** — நான்கு வகைப்படுத்தல் நிலைகள் (PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED) session taint மூலம் தானியங்கியாக பரவுகின்றன. தரவு ஒருபோதும் குறைந்த பாதுகாப்பான சூழலுக்கு கீழே ஓட முடியாது.
- **ஆறு அமலாக்க Hook கள்** — data pipeline இன் ஒவ்வொரு கட்டமும் gate செய்யப்பட்டுள்ளது: LLM சூழலில் என்ன நுழைகிறது, எந்த tools அழைக்கப்படுகின்றன, என்ன முடிவுகள் திரும்பி வருகின்றன, மற்றும் கணினியிலிருந்து என்ன வெளியேறுகிறது. ஒவ்வொரு முடிவும் audit-log செய்யப்படுகிறது.
- **இயல்பாகவே மறுப்பு** — எதுவும் மௌனமாக அனுமதிக்கப்படவில்லை. வகைப்படுத்தப்படாத tools, integrations மற்றும் data sources வெளிப்படையாக கட்டமைக்கப்படும் வரை நிராகரிக்கப்படுகின்றன.
- **Agent அடையாளம்** — உங்கள் agent இன் mission SPINE.md இல் உள்ளது, முன்கூட்டிய நடத்தைகள் TRIGGER.md இல் உள்ளன. Skills எளிய folder மரபுகள் மூலம் திறன்களை விரிவாக்குகின்றன. The Reef marketplace அவற்றை கண்டுபிடிக்கவும் பகிரவும் உங்களை அனுமதிக்கிறது.

[architecture பற்றி மேலும் அறியுங்கள்.](/ta-IN/architecture/)
