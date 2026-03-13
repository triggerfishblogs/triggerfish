# Sessions & Taint

Sessions என்பது Triggerfish இல் உரையாடல் நிலையின் அடிப்படை அலகு. ஒவ்வொரு session சுயாதீனமாக **taint நிலையை** கண்காணிக்கிறது -- session போது அணுகப்பட்ட தரவின் அதிக உணர்திறனை பதிவு செய்யும் வகைப்படுத்தல் watermark. Taint policy engine இன் output முடிவுகளை இயக்குகிறது: ஒரு session `CONFIDENTIAL` இல் tainted ஆனால், அந்த session இலிருந்து எந்த தரவும் `CONFIDENTIAL` க்கு கீழே வகைப்படுத்தப்பட்ட சேனலுக்கு ஓட முடியாது.

## Session Taint மாதிரி

### Taint எவ்வாறு செயல்படுகிறது

ஒரு session வகைப்படுத்தல் நிலையில் தரவை அணுகும்போது, முழு session அந்த நிலையில் **tainted** ஆகிறது. Taint மூன்று விதிகளை பின்பற்றுகிறது:

1. **Per-conversation**: ஒவ்வொரு session அதன் சொந்த சுயாதீன taint நிலையை வைத்திருக்கிறது
2. **Escalation மட்டும்**: Taint session க்குள் அதிகரிக்க முடியும், குறைய முடியாது
3. **முழு reset எல்லாவற்றையும் அழிக்கிறது**: Taint மற்றும் உரையாடல் வரலாறு ஒன்றாக அழிக்கப்படுகின்றன

<img src="/diagrams/taint-escalation.svg" alt="Taint escalation: PUBLIC → INTERNAL → CONFIDENTIAL → RESTRICTED. Taint can only escalate, never decrease." style="max-width: 100%;" />

::: warning SECURITY Taint ஒருபோதும் தேர்ந்தெடுத்து குறைக்கப்பட முடியாது. முழு உரையாடல் வரலாற்றை அழிக்காமல் ஒரு session ஐ "un-taint" செய்ய எந்த வழிமுறையும் இல்லை. இது சூழல் கசிவை தடுக்கிறது -- session confidential தரவை பார்த்ததை நினைவில் வைத்திருந்தால், taint அதை பிரதிபலிக்க வேண்டும். :::

### Taint ஏன் குறைக்க முடியாது

வகைப்படுத்தப்பட்ட தரவு இனி காட்டப்படவில்லையாலும், LLM இன் context window இன்னும் அதை கொண்டிருக்கிறது. மாதிரி எதிர்கால responses இல் வகைப்படுத்தப்பட்ட தகவலை reference, summarize அல்லது echo செய்யலாம். Taint ஐ குறைக்க ஒரே பாதுகாப்பான வழி context ஐ முழுமையாக நீக்குவது -- முழு reset சரியாக அதுதான் செய்கிறது.

## Session வகைகள்

Triggerfish பல session வகைகளை நிர்வகிக்கிறது, ஒவ்வொன்றும் சுயாதீன taint கண்காணிப்புடன்:

| Session வகை    | விளக்கம்                                                | ஆரம்ப Taint | Restarts முழுவதும் நிலைத்திருக்குமா |
| -------------- | ------------------------------------------------------- | ------------ | ------------------------------------ |
| **Main**       | Owner உடன் முதன்மை நேரடி உரையாடல்                      | `PUBLIC`     | ஆம்                                  |
| **Channel**    | இணைக்கப்பட்ட சேனலுக்கு ஒன்று (Telegram, Slack, போன்றவை) | `PUBLIC`  | ஆம்                                  |
| **Background** | சுயாதீன tasks க்கு உருவாக்கப்படுகிறது (cron, webhooks) | `PUBLIC`     | Task காலம் வரை                       |
| **Agent**      | Multi-agent routing க்கான per-agent sessions           | `PUBLIC`     | ஆம்                                  |
| **Group**      | Group chat sessions                                     | `PUBLIC`     | ஆம்                                  |

::: info Background sessions எப்போதும் `PUBLIC` taint உடன் தொடங்குகின்றன, parent session இன் taint நிலையைப் பொருட்படுத்தாமல். இது வடிவமைப்பால் -- cron jobs மற்றும் webhook-triggered tasks தங்களை spawn செய்த session இன் taint ஐ வாரிசாக பெற கூடாது. :::

## Taint Escalation உதாரணம்

Taint escalation மற்றும் அதன் விளைவாக policy block காட்டும் முழுமையான flow இதோ:

<img src="/diagrams/taint-with-blocks.svg" alt="Taint escalation example: session starts PUBLIC, escalates to CONFIDENTIAL after Salesforce access, then BLOCKS output to PUBLIC WhatsApp channel" style="max-width: 100%;" />

## முழு Reset வழிமுறை

Session reset taint ஐ குறைக்க ஒரே வழி. இது வேண்டுமென்று செய்யும் ஒரு அழிவு தரும் செயல்:

1. **Lineage records archive செய்யவும்** -- session இலிருந்து அனைத்து lineage தரவும் audit storage இல் பாதுகாக்கப்படுகிறது
2. **உரையாடல் வரலாற்றை அழிக்கவும்** -- முழு context window துடைக்கப்படுகிறது
3. **Taint ஐ PUBLIC க்கு reset செய்யவும்** -- session புதிதாக தொடங்குகிறது
4. **பயனர் confirmation தேவை** -- `SESSION_RESET` hook செயல்படுத்துவதற்கு முன் வெளிப்படையான confirmation தேவைப்படுகிறது

Reset க்குப் பிறகு, session முற்றிலும் புதிய session போல இருக்கும். agent முந்தைய உரையாடலின் எந்த நினைவும் வைத்திரு வதில்லை. வகைப்படுத்தப்பட்ட தரவு LLM இன் context மூலம் கசிய முடியாது என்று உத்தரவாதம் செய்ய இதுவே ஒரே வழி.

## Inter-Session Communication

`sessions_send` பயன்படுத்தி agent sessions இடையே தரவை அனுப்பும்போது, ஒரே write-down விதிகள் பொருந்தும்:

| Source Session Taint | Target Session Channel | முடிவு |
| -------------------- | ---------------------- | ------- |
| `PUBLIC`             | `PUBLIC` channel       | ALLOW   |
| `CONFIDENTIAL`       | `CONFIDENTIAL` channel | ALLOW   |
| `CONFIDENTIAL`       | `PUBLIC` channel       | BLOCK   |
| `RESTRICTED`         | `CONFIDENTIAL` channel | BLOCK   |

Agent க்கு கிடைக்கும் session tools:

| Tool               | விளக்கம்                                     | Taint தாக்கம்                          |
| ------------------ | --------------------------------------------- | --------------------------------------- |
| `sessions_list`    | filters உடன் செயலில் உள்ள sessions பட்டியலிடு | Taint மாற்றமில்லை                      |
| `sessions_history` | ஒரு session க்கான transcript பெறு             | Referenced session இலிருந்து Taint வாரிசாகும் |
| `sessions_send`    | மற்றொரு session க்கு செய்தி அனுப்பு          | Write-down சரிபார்ப்பிற்கு உட்பட்டது  |
| `sessions_spawn`   | Background task session உருவாக்கு             | புதிய session `PUBLIC` இல் தொடங்கும்   |
| `session_status`   | தற்போதைய session நிலை மற்றும் metadata சரிபார்க்கவும் | Taint மாற்றமில்லை               |

## Data Lineage

Triggerfish செயலாக்கும் ஒவ்வொரு தரவு உறுப்பும் **provenance metadata** சுமக்கிறது -- தரவு எங்கிருந்து வந்தது, எவ்வாறு மாற்றப்பட்டது மற்றும் எங்கே சென்றது என்பதன் முழுமையான பதிவு. Lineage என்பது வகைப்படுத்தல் முடிவுகளை சரிபார்க்கக்கூடியதாக செய்யும் audit trail.

### Lineage Record கட்டமைப்பு

```json
{
  "lineage_id": "lin_789xyz",
  "content_hash": "sha256:a1b2c3d4...",
  "origin": {
    "source_type": "integration",
    "source_name": "salesforce",
    "record_id": "opp_00123ABC",
    "record_type": "Opportunity",
    "accessed_at": "2025-01-29T10:23:45Z",
    "accessed_by": "user_456",
    "access_method": "plugin_query"
  },
  "classification": {
    "level": "CONFIDENTIAL",
    "reason": "source_system_default",
    "assigned_at": "2025-01-29T10:23:45Z",
    "can_be_downgraded": false
  },
  "transformations": [
    {
      "type": "extraction",
      "description": "Selected fields: name, amount, stage",
      "timestamp": "2025-01-29T10:23:46Z",
      "agent_id": "agent_123"
    }
  ],
  "current_location": {
    "session_id": "sess_456",
    "context_position": "assistant_response_3"
  }
}
```

### Lineage கண்காணிப்பு விதிகள்

| நிகழ்வு                               | Lineage செயல்                                   |
| ------------------------------------- | ------------------------------------------------ |
| Integration இலிருந்து தரவு படிக்கப்பட்டது | Origin உடன் lineage record உருவாக்கு            |
| LLM மூலம் தரவு மாற்றப்பட்டது         | Transformation இணைத்து, input lineages இணை       |
| பல மூலங்களிலிருந்து தரவு ஒருங்கிணைக்கப்பட்டது | Lineage merge செய், வகைப்படுத்தல் = `max(inputs)` |
| சேனலுக்கு தரவு அனுப்பப்பட்டது        | இலக்கு பதிவு செய், வகைப்படுத்தல் சரிபார்         |
| Session reset                         | Lineage records archive செய், சூழலிலிருந்து அழி  |

### Aggregation வகைப்படுத்தல்

பல மூலங்களிலிருந்து தரவு ஒன்றாக்கப்படும்போது (உதா., வெவ்வேறு integrations இலிருந்து records இன் LLM summary), ஒருங்கிணைந்த முடிவு அனைத்து inputs இன் **அதிகபட்ச வகைப்படுத்தலை** வாரிசாக பெறுகிறது:

```
Input 1: INTERNAL    (internal wiki)
Input 2: CONFIDENTIAL (Salesforce record)
Input 3: PUBLIC      (weather API)

Aggregated output classification: CONFIDENTIAL (max of inputs)
```

## Taint நிலைத்தன்மை

Session taint `taint:` namespace கீழ் `StorageProvider` மூலம் நிலைத்திருக்கிறது. இதன் அர்த்தம் taint daemon restarts வழியாக உயிர்வாழ்கிறது -- restart க்கு முன் `CONFIDENTIAL` ஆக இருந்த session பிறகும் `CONFIDENTIAL` ஆக இருக்கும்.

Lineage records compliance-driven retention (இயல்புநிலை 90 நாட்கள்) உடன் `lineage:` namespace கீழ் நிலைத்திருக்கின்றன.
