---
title: பொறுப்பான வெளிப்படுத்தல் கொள்கை
description: Triggerfish இல் பாதுகாப்பு vulnerabilities ஐ எவ்வாறு report செய்வது.
---

# பொறுப்பான வெளிப்படுத்தல் கொள்கை

## Vulnerability ஐ Report செய்தல்

**பாதுகாப்பு vulnerabilities க்கு public GitHub issue திறக்காதீர்கள்.**

Email மூலம் report செய்யுங்கள்:

```
security@trigger.fish
```

தயவுசெய்து இவற்றை சேர்க்கவும்:

- விளக்கம் மற்றும் சாத்தியமான தாக்கம்
- மீண்டும் உருவாக்கும் படிகள் அல்லது proof of concept
- பாதிக்கப்பட்ட versions அல்லது components
- பரிந்துரைக்கப்பட்ட தீர்வு, ஏதேனும் இருந்தால்

## Response Timeline

| Timeline   | செயல்                                                    |
| ---------- | --------------------------------------------------------- |
| 24 மணிநேரம் | பரிமாற்றத்தின் உறுதிப்படுத்தல்                         |
| 72 மணிநேரம் | ஆரம்ப மதிப்பீடு மற்றும் தீவிரத்தன்மை வகைப்படுத்தல்    |
| 14 நாட்கள்  | Fix உருவாக்கி சோதிக்கப்பட்டது (critical/high severity) |
| 90 நாட்கள்  | ஒருங்கிணைந்த வெளிப்படுத்தல் window                     |

90-நாள் window க்கு முன்னோ அல்லது fix வெளியிடப்படுவதற்கு முன்னோ, எது முதலில் வந்தாலும், பொதுவில் வெளிப்படுத்தாதீர்கள் என்று கோருகிறோம்.

## Scope

### Scope இல்

- Triggerfish core application
  ([github.com/greghavens/triggerfish](https://github.com/greghavens/triggerfish))
- பாதுகாப்பு policy enforcement bypasses (classification, taint tracking,
  no-write-down)
- Plugin sandbox escapes
- Authentication அல்லது authorization bypasses
- MCP Gateway பாதுகாப்பு boundary violations
- Secrets leakage (credentials logs, context, அல்லது storage இல் தோன்றுவது)
- நிர்ணயவாத policy முடிவுகளை வெற்றிகரமாக பாதிக்கும் Prompt injection attacks
- Official Docker images (கிடைக்கும்போது) மற்றும் install scripts

### Scope வெளியே

- நிர்ணயவாத policy அடுக்கை bypass செய்யாத LLM நடத்தை (policy அடுக்கு செயலை சரியாக தடுத்திருந்தால், model தவறானது சொல்வது vulnerability அல்ல)
- Triggerfish பராமரிக்காத third-party skills அல்லது plugins
- Triggerfish பணியாளர்களுக்கு எதிரான social engineering attacks
- Denial-of-service attacks
- நிரூபிக்கப்பட்ட தாக்கம் இல்லாத automated scanner reports

## Safe Harbor

இந்த கொள்கைக்கு இணங்க நடத்தப்படும் பாதுகாப்பு ஆராய்ச்சி அங்கீகரிக்கப்பட்டது. நல்ல நம்பிக்கையில் vulnerabilities report செய்யும் researchers க்கு எதிராக legal நடவடிக்கை எடுக்க மாட்டோம். Privacy violations, data destruction மற்றும் service இடையூறை தவிர்க்க நல்ல நம்பிக்கை முயற்சி செய்யுங்கள் என்று கோருகிறோம்.

## அங்கீகாரம்

நீங்கள் அநாமதேயமாக இருக்க விரும்பாவிட்டால், எங்கள் release notes மற்றும் security advisories இல் valid vulnerabilities report செய்யும் researchers ஐ சேர்க்கிறோம். தற்போது paid bug bounty program வழங்கவில்லை, ஆனால் எதிர்காலத்தில் ஒன்று அறிமுகப்படுத்தலாம்.

## PGP Key

உங்கள் report ஐ encrypt செய்ய வேண்டுமென்றால், `security@trigger.fish` க்கான எங்கள் PGP key
[`https://trigger.fish/.well-known/security.txt`](https://trigger.fish/.well-known/security.txt)
இல் மற்றும் முக்கிய keyservers இல் வெளியிடப்பட்டுள்ளது.
