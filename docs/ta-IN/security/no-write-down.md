# No Write-Down விதி

No write-down விதி Triggerfish இன் data பாதுகாப்பு மாதிரியின் அடிப்படை. இது ஒவ்வொரு session, ஒவ்வொரு சேனல் மற்றும் ஒவ்வொரு agent க்கும் பொருந்தும் நிலையான, கட்டமைக்க முடியாத விதி -- விதிவிலக்குகள் இல்லை மற்றும் LLM override இல்லை.

**விதி:** Data சேனல்கள் மற்றும் பெறுநர்களுக்கு **சம அல்லது அதிக** வகைப்படுத்தல் நிலையில் மட்டுமே ஓட முடியும்.

இந்த ஒரே விதி தற்செயலான oversharing இலிருந்து முக்கியமான தகவலை exfiltrate செய்ய வடிவமைக்கப்பட்ட sophisticated prompt injection attacks வரை ஒரு முழு வகை data கசிவு scenarios ஐ தடுக்கிறது.

## வகைப்படுத்தல் எவ்வாறு ஓடுகிறது

Triggerfish நான்கு வகைப்படுத்தல் நிலைகளை பயன்படுத்துகிறது (அதிகம் முதல் குறைவு வரை):

<img src="/diagrams/write-down-rules.svg" alt="Write-down rules: data flows only to equal or higher classification levels" style="max-width: 100%;" />

கொடுக்கப்பட்ட நிலையில் வகைப்படுத்தப்பட்ட data அந்த நிலைக்கு அல்லது அதற்கு மேல் உள்ள எந்த நிலைக்கும் ஓடலாம். கீழே ஒருபோதும் ஓட முடியாது. இதுதான் no write-down விதி.

::: danger No write-down விதி **நிலையானது மற்றும் கட்டமைக்க முடியாதது**. Administrators இதை தளர்த்த முடியாது, policy விதிகளால் override செய்ய முடியாது, அல்லது LLM bypass செய்ய முடியாது. இது மற்ற அனைத்து பாதுகாப்பு கட்டுப்பாடுகளும் ஓய்வெடுக்கும் architectural அடிப்படை. :::

## பயனுள்ள வகைப்படுத்தல்

Data கணினியை விட்டு வெளியேறும்போது, Triggerfish இலக்கின் **பயனுள்ள வகைப்படுத்தலை** கணக்கிடுகிறது:

```
EFFECTIVE_CLASSIFICATION = min(channel_classification, recipient_classification)
```

சேனல் மற்றும் பெறுநர் இருவரும் data இன் வகைப்படுத்தல் நிலையில் அல்லது அதற்கு மேல் இருக்க வேண்டும். ஒருவர் கீழே இருந்தால், output blocked ஆகும்.

| சேனல்                | பெறுநர்                   | பயனுள்ள வகைப்படுத்தல் |
| -------------------- | ------------------------- | ---------------------- |
| INTERNAL (Slack)     | INTERNAL (coworker)       | INTERNAL               |
| INTERNAL (Slack)     | EXTERNAL (vendor)         | PUBLIC                 |
| CONFIDENTIAL (Slack) | INTERNAL (coworker)       | INTERNAL               |
| CONFIDENTIAL (Email) | EXTERNAL (personal contact)| PUBLIC                |

::: info EXTERNAL பெறுநருடன் CONFIDENTIAL சேனல் PUBLIC என்று பயனுள்ள வகைப்படுத்தல் கொண்டுள்ளது. Session PUBLIC க்கு மேல் எந்த data வையும் அணுகியிருந்தால், output blocked ஆகும். :::

## உண்மையிலான உதாரணம்

No write-down விதியை action இல் காட்டும் ஒரு concrete scenario இங்கே.

```
User: "Check my Salesforce pipeline"

Agent: [pயனரின் delegated token மூலம் Salesforce அணுகுகிறது]
       [Salesforce data CONFIDENTIAL என்று வகைப்படுத்தப்படுகிறது]
       [session taint CONFIDENTIAL க்கு உயர்கிறது]

       "You have 3 deals closing this week totaling $2.1M..."

User: "Send a message to my wife that I'll be late tonight"

Policy layer: BLOCKED
  - Session taint: CONFIDENTIAL
  - Recipient (wife): EXTERNAL
  - Effective classification: PUBLIC
  - CONFIDENTIAL > PUBLIC --> write-down violation

Agent: "I can't send to external contacts in this session
        because we accessed confidential data.

        -> Reset session and send message
        -> Cancel"
```

பயனர் Salesforce data அணுகியது (CONFIDENTIAL என்று வகைப்படுத்தப்பட்டது), இது முழு session ஐ taint செய்தது. பிறகு வெளிப்புற தொடர்பாளருக்கு (பயனுள்ள வகைப்படுத்தல் PUBLIC) செய்தி அனுப்ப முயற்சித்தபோது, CONFIDENTIAL data PUBLIC இலக்கிற்கு ஓட முடியாது என்பதால் policy அடுக்கு output ஐ blocked செய்தது.

::: tip மனைவிக்கான agent இன் செய்தி ("I'll be late tonight") தன்னுடையே Salesforce data கொண்டிரு்க்கவில்லை. ஆனால் session முந்தைய Salesforce அணுகலால் tainted ஆகியது, மற்றும் LLM Salesforce response இலிருந்து retain செய்திருக்கக்கூடிய எதுவும் உட்பட முழு session சூழலும் -- output ஐ தாக்கக்கூடும். No write-down விதி இந்த முழு வகை context கசிவையும் தடுக்கிறது. :::

## பயனர் என்ன பார்க்கிறார்

No write-down விதி ஒரு செயலை block செய்யும்போது, பயனர் தெளிவான, actionable செய்தியைப் பெறுகிறார்.

**இயல்புநிலை (குறிப்பிட்டது):**

```
I can't send confidential data to a public channel.

-> Reset session and send message
-> Cancel
```

**கல்வி (கட்டமைப்பு மூலம் opt-in):**

```
I can't send confidential data to a public channel.

Why: This session accessed Salesforce (CONFIDENTIAL).
WhatsApp personal is classified as PUBLIC.
Data can only flow to equal or higher classification.

Options:
  - Reset session and send message
  - Ask your admin to reclassify the WhatsApp channel
  - Learn more: https://trigger.fish/security/no-write-down
```

## Session Reset

பயனர் "Reset session and send message" தேர்வு செய்யும்போது, Triggerfish **முழு reset** செய்கிறது:

1. Session taint PUBLIC க்கு திரும்ப அழிக்கப்படுகிறது
2. முழு உரையாடல் வரலாறும் அழிக்கப்படுகிறது (context கசிவை தடுக்கும்)
3. கோரப்பட்ட செயல் பிறகு புதிய session க்கு எதிராக மீண்டும் மதிப்பீடு செய்யப்படுகிறது
4. செயல் இப்போது அனுமதிக்கப்பட்டால் (PUBLIC data PUBLIC சேனலுக்கு), அது தொடர்கிறது

::: warning SECURITY Session reset taint **மற்றும்** உரையாடல் வரலாறு இரண்டையும் அழிக்கிறது. இது optional அல்ல. Taint label மட்டும் அழிக்கப்பட்டு உரையாடல் சூழல் இருந்தால், LLM இன்னும் முந்தைய செய்திகளிலிருந்து வகைப்படுத்தப்பட்ட தகவலை reference செய்யலாம். :::

## Enforcement எவ்வாறு செயல்படுகிறது

No write-down விதி `PRE_OUTPUT` hook இல் அமல்படுத்தப்படுகிறது -- எந்த data வும் கணினியை விட்டு வெளியேறுவதற்கு முன் கடைசி enforcement புள்ளி. Hook synchronous, நிர்ணயவாத code ஆக இயங்குகிறது.

இந்த code:

- **நிர்ணயவாதம்** -- ஒரே inputs எப்போதும் ஒரே முடிவை உருவாக்கும்
- **Synchronous** -- output அனுப்பப்படுவதற்கு முன் hook முடிகிறது
- **Unforgeable** -- LLM hook இன் முடிவை தாக்க முடியாது
- **Logged** -- ஒவ்வொரு execution முழு சூழலுடன் பதிவு செய்யப்படுகிறது

## இந்த விதி நிலையானது ஏன்

No write-down விதி கட்டமைக்கக்கூடியதல்ல, ஏனெனில் அதை கட்டமைக்கக்கூடியதாக செய்வது முழு பாதுகாப்பு மாதிரியையும் குறைமதிப்பிற்கு உட்படுத்தும். ஒரு administrator ஒரு விதிவிலக்கை உருவாக்க முடிந்தால் -- "இந்த ஒரு integration க்கு CONFIDENTIAL data PUBLIC சேனல்களுக்கு ஓட அனுமதி" -- அந்த விதிவிலக்கு attack surface ஆகிறது.

::: info Administrators சேனல்கள், பெறுநர்கள் மற்றும் integrations க்கு ஒதுக்கப்பட்ட வகைப்படுத்தல் நிலைகளை **கட்டமைக்கலாம்**. Data flow ஐ சரிசெய்வதற்கான சரியான வழி இதுதான்: ஒரு சேனல் அதிக-வகைப்படுத்தப்பட்ட data பெற வேண்டும் என்றால், சேனலை அதிக நிலையில் வகைப்படுத்துங்கள். விதி தன்னை நிலையாக இருக்கிறது; விதிக்கான inputs கட்டமைக்கக்கூடியவை. :::

## தொடர்புடைய பக்கங்கள்

- [பாதுகாப்பு-முதல் Design](./) -- பாதுகாப்பு architecture கண்ணோட்டம்
- [Identity & Auth](./identity) -- channel அடையாளம் எவ்வாறு நிறுவப்படுகிறது
- [Audit & Compliance](./audit-logging) -- blocked செயல்கள் எவ்வாறு பதிவு செய்யப்படுகின்றன
- [Architecture: Taint & Sessions](/ta-IN/architecture/taint-and-sessions) -- session taint mechanics விரிவாக
