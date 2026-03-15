# ಉತ್ತಮ Issue File ಮಾಡುವ ವಿಧಾನ

ಚೆನ್ನಾಗಿ structured issue ವೇಗವಾಗಿ resolve ಆಗುತ್ತದೆ. Logs ಮತ್ತು reproduction steps
ಇಲ್ಲದ vague issue ಯಾರಿಗೂ act ಮಾಡಲು ಸಾಧ್ಯವಾಗದ ಕಾರಣ ವಾರಗಟ್ಟಲೆ ಕೂರುತ್ತದೆ. Include
ಮಾಡಬೇಕಾದ ವಿಷಯ ಇಲ್ಲಿದೆ.

## File ಮಾಡುವ ಮೊದಲು

1. **Existing issues ಹುಡುಕಿ.** ಯಾರಾದರೂ ಈಗಾಗಲೇ ಅದೇ ಸಮಸ್ಯೆ report ಮಾಡಿರಬಹುದು.
   [open issues](https://github.com/greghavens/triggerfish/issues) ಮತ್ತು
   [closed issues](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed) ಪರಿಶೀಲಿಸಿ.

2. **Troubleshooting guides check ಮಾಡಿ.** [Troubleshooting section](/kn-IN/support/troubleshooting/)
   ಹೆಚ್ಚಿನ ಸಾಮಾನ್ಯ ಸಮಸ್ಯೆಗಳನ್ನು cover ಮಾಡುತ್ತದೆ.

3. **Known issues check ಮಾಡಿ.** [Known Issues](/kn-IN/support/kb/known-issues) page
   ಈಗಾಗಲೇ ತಿಳಿದ ಸಮಸ್ಯೆಗಳನ್ನು list ಮಾಡುತ್ತದೆ.

4. **Latest version try ಮಾಡಿ.** Latest release ನಲ್ಲಿ ಇಲ್ಲದಿದ್ದರೆ ಮೊದಲು update ಮಾಡಿ:
   ```bash
   triggerfish update
   ```

## ಏನು Include ಮಾಡಬೇಕು

### 1. Environment

```
Triggerfish version: (`triggerfish version` ಚಲಾಯಿಸಿ)
OS: (ಉದಾ., macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Architecture: (x64 ಅಥವಾ arm64)
Installation method: (binary installer, from source, Docker)
```

### 2. Steps to Reproduce

ಸಮಸ್ಯೆಗೆ ಕಾರಣವಾಗುವ exact sequence of actions ಬರೆಯಿರಿ. Specific ಆಗಿರಿ:

**Bad:**
> Bot ಕೆಲಸ ಮಾಡಿಲ್ಲ.

**Good:**
> 1. Telegram channel configure ಮಾಡಿ Triggerfish start ಮಾಡಿದೆ
> 2. Bot ಗೆ DM ನಲ್ಲಿ "check my calendar for tomorrow" message ಕಳಿಸಿದೆ
> 3. Bot calendar results ಜೊತೆ respond ಮಾಡಿತು
> 4. "now email those results to alice@example.com" ಕಳಿಸಿದೆ
> 5. Expected: bot email ಕಳಿಸುತ್ತದೆ
> 6. Actual: bot "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL" ಜೊತೆ respond ಮಾಡಿತು

### 3. Expected vs. Actual Behavior

ಏನು ಆಗಬೇಕಿತ್ತು ಮತ್ತು ಬದಲಾಗಿ ಏನಾಯಿತು ಎಂದು ಹೇಳಿ. Error message ಇದ್ದರೆ exact message
include ಮಾಡಿ. Paraphrase ಮಾಡಿದ್ದಕ್ಕಿಂತ copy-paste ಉತ್ತಮ.

### 4. Log Output

[Log bundle](/kn-IN/support/guides/collecting-logs) attach ಮಾಡಿ:

```bash
triggerfish logs bundle
```

Issue security-sensitive ಆಗಿದ್ದರೆ portions redact ಮಾಡಬಹುದು, ಆದರೆ issue ನಲ್ಲಿ
redact ಮಾಡಿದ್ದೇನು ಎಂದು note ಮಾಡಿ.

ಕನಿಷ್ಠ, relevant log lines paste ಮಾಡಿ. Events correlate ಮಾಡಲು timestamps include
ಮಾಡಿ.

### 5. Configuration (Redacted)

ನಿಮ್ಮ `triggerfish.yaml` ನ relevant section paste ಮಾಡಿ. **ಯಾವಾಗಲೂ secrets redact
ಮಾಡಿ.** Actual values ಅನ್ನು placeholders ಜೊತೆ replace ಮಾಡಿ:

```yaml
# Good - secrets redacted
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # stored in keychain
channels:
  telegram:
    ownerId: "REDACTED"
    classification: INTERNAL
```

### 6. Patrol Output

```bash
triggerfish patrol
```

Output paste ಮಾಡಿ. ಇದು system health ನ quick snapshot ನೀಡುತ್ತದೆ.

## Issue Types

### Bug Report

Broken ಆಗಿರುವ ವಿಷಯಗಳಿಗಾಗಿ ಈ template ಬಳಸಿ:

```markdown
## Bug Report

**Environment:**
- Version:
- OS:
- Install method:

**Steps to reproduce:**
1.
2.
3.

**Expected behavior:**

**Actual behavior:**

**Error message (if any):**

**Patrol output:**

**Relevant config (redacted):**

**Log bundle:** (attach file)
```

### Feature Request

```markdown
## Feature Request

**Problem:** ಇಂದು ಏನು ಮಾಡಲಾಗುತ್ತಿಲ್ಲ?

**Proposed solution:** ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸಬೇಕು?

**Alternatives considered:** ಬೇರೆ ಏನು try ಮಾಡಿದ್ದೀರಿ?
```

### Question / Support Request

ಏನಾದರೂ bug ಎಂದು ಖಾತ್ರಿ ಇಲ್ಲದಿದ್ದರೆ ಅಥವಾ ಸ್ಟಕ್ ಆಗಿದ್ದರೆ, Issues ಬದಲಾಗಿ
[GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) ಬಳಸಿ.
Discussions single right answer ಇಲ್ಲದ questions ಗಾಗಿ ಉತ್ತಮ.

## ಏನು Include ಮಾಡಬಾರದು

- **Raw API keys ಅಥವಾ passwords.** ಯಾವಾಗಲೂ redact ಮಾಡಿ.
- **Conversations ನ personal data.** Names, emails, phone numbers redact ಮಾಡಿ.
- **ಸಂಪೂರ್ಣ log files inline.** ಸಾವಿರ lines paste ಮಾಡುವ ಬದಲಾಗಿ log bundle file
  ಆಗಿ attach ಮಾಡಿ.

## File ಮಾಡಿದ ನಂತರ

- **Follow-up questions ಗಾಗಿ watch ಮಾಡಿ.** Maintainers ಗೆ ಹೆಚ್ಚಿನ ಮಾಹಿತಿ ಬೇಕಾಗಬಹುದು.
- **Fixes test ಮಾಡಿ.** Fix push ಆದರೆ verify ಮಾಡಲು ನಿಮ್ಮನ್ನು ಕೇಳಬಹುದು.
- **Issue close ಮಾಡಿ** ನೀವೇ solution ಕಂಡುಹಿಡಿದರೆ. ಇತರರಿಗೆ benefit ಮಾಡಲು solution
  post ಮಾಡಿ.
