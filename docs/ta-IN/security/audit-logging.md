# Audit & Compliance

Triggerfish இல் ஒவ்வொரு policy முடிவும் முழு சூழலுடன் log ஆகிறது. விதிவிலக்குகள் இல்லை, logging ஐ முடக்கும் "debug mode" இல்லை, மற்றும் LLM audit records ஐ suppress செய்ய வழி இல்லை. இது கணினி எடுத்த ஒவ்வொரு பாதுகாப்பு முடிவினதும் முழுமையான, tamper-evident record வழங்குகிறது.

## என்ன பதிவு செய்யப்படுகிறது

Audit logging ஒரு **நிலையான விதி** -- இது எப்போதும் active மற்றும் முடக்க முடியாது. ஒவ்வொரு enforcement hook execution ம் கொண்டிருக்கும் ஒரு audit record உருவாக்குகிறது:

| Field             | விளக்கம்                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `timestamp`       | முடிவு எடுக்கப்பட்டது (ISO 8601, UTC)                                                                                                                       |
| `hook_type`       | எந்த enforcement hook இயங்கியது                                                                                                                              |
| `session_id`      | செயல் நடந்த session                                                                                                                                          |
| `decision`        | `ALLOW`, `BLOCK` அல்லது `REDACT`                                                                                                                            |
| `reason`          | முடிவின் human-readable விளக்கம்                                                                                                                            |
| `input`           | Hook ஐ trigger செய்த data அல்லது செயல்                                                                                                                      |
| `rules_evaluated` | முடிவை எட்ட சரிபார்க்கப்பட்ட policy விதிகள்                                                                                                                |
| `taint_before`    | செயலுக்கு முன் Session taint நிலை                                                                                                                           |
| `taint_after`     | செயலுக்கு பிறகு Session taint நிலை (மாறியிருந்தால்)                                                                                                        |
| `metadata`        | Hook வகைக்கு குறிப்பிட்ட கூடுதல் சூழல்                                                                                                                    |

## Audit Record எடுத்துக்காட்டுகள்

### அனுமதிக்கப்பட்ட Output

```json
{
  "timestamp": "2025-01-29T10:23:47Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "reason": "Classification check passed",
  "input": {
    "target_channel": "telegram",
    "recipient": "owner"
  },
  "rules_evaluated": [
    "no_write_down",
    "channel_classification"
  ],
  "taint_before": "INTERNAL",
  "taint_after": "INTERNAL"
}
```

### Blocked Write-Down

```json
{
  "timestamp": "2025-01-29T10:23:55Z",
  "hook_type": "PRE_OUTPUT",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "reason": "Session taint (CONFIDENTIAL) exceeds effective classification (PUBLIC)",
  "input": {
    "target_channel": "whatsapp",
    "recipient_classification": "EXTERNAL"
  },
  "rules_evaluated": [
    "no_write_down",
    "effective_classification"
  ],
  "taint_before": "CONFIDENTIAL",
  "taint_after": "CONFIDENTIAL",
  "metadata": {
    "taint_source": "salesforce_query",
    "lineage_ids": ["lin_789", "lin_790"]
  }
}
```

## Audit Storage

Audit records `audit:` namespace கீழ் `StorageProvider` மூலம் persist ஆகின்றன. இயல்புநிலை retention 1 வருடம். Enterprise deployments compliance requirements க்கு இதை நீட்டிக்கலாம்.

## Compliance Export

Audit trail forward traces, backward traces மற்றும் classification justifications க்கான queries ஆதரிக்கிறது. Legal அல்லது regulatory review க்கான முழு chain of custody export செய்யலாம்.

## Log Poisoning பாதுகாப்பு

Audit system log poisoning attacks க்கு resist செய்கிறது:

- Audit records append-only (தவறான records திருத்த முடியாது)
- ஒவ்வொரு record hook execution இலிருந்து content hash கொண்டிருக்கிறது
- LLM conversation history audit records இலிருந்து தனிமைப்படுத்தப்பட்டது
- Audit storage credentials LLM context க்கு வெளிப்படுவதில்லை
