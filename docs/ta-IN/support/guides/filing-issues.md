# நல்ல Issue எவ்வாறு File செய்வது

Well-structured issue விரைவாக resolve ஆகிறது. Logs இல்லாமல் reproduction steps இல்லாமல் vague issue வாரக்கணக்கில் யாரும் act செய்ய முடியாமல் உட்கார்ந்திருக்கிறது. என்ன include செய்வது என்று இதோ.

## File செய்வதற்கு முன்பு

1. **Existing issues தேடவும்.** யாரோ ஏற்கனவே அதே problem report செய்திருக்கலாம். [Open issues](https://github.com/greghavens/triggerfish/issues) மற்றும் [closed issues](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed) சரிபார்க்கவும்.

2. **Troubleshooting guides சரிபார்க்கவும்.** [Troubleshooting section](/ta-IN/support/troubleshooting/) most common problems cover செய்கிறது.

3. **Known issues சரிபார்க்கவும்.** [Known Issues](/ta-IN/support/kb/known-issues) page ஏற்கனவே aware ஆயிருக்கும் problems list செய்கிறது.

4. **Latest version try செய்யவும்.** Latest release இல் இல்லையென்றால், முதலில் update செய்யவும்:
   ```bash
   triggerfish update
   ```

## என்ன Include செய்வது

### 1. Environment

```
Triggerfish version: (`triggerfish version` இயக்கவும்)
OS: (உதா., macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Architecture: (x64 அல்லது arm64)
Installation method: (binary installer, from source, Docker)
```

### 2. Reproduce செய்வதற்கான Steps

Problem க்கு இட்டுச் செல்லும் exact sequence of actions எழுதவும். Specific ஆக இருங்கள்:

**Bad:**
> Bot வேலை செய்வதில்லை.

**Good:**
> 1. Telegram channel configure செய்து Triggerfish தொடங்கினேன்
> 2. Bot க்கு DM இல் "check my calendar for tomorrow" message அனுப்பினேன்
> 3. Bot calendar results உடன் respond செய்தது
> 4. "now email those results to alice@example.com" அனுப்பினேன்
> 5. Expected: Bot email அனுப்பும்
> 6. Actual: Bot "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL" என்று respond செய்தது

### 3. Expected vs. Actual Behavior

என்ன நடக்க expect செய்தீர்கள் மற்றும் என்ன நடந்தது என்று சொல்லுங்கள். Error message இருந்தால் exact message include செய்யுங்கள். Paraphrasing ஐ விட Copy-paste சிறந்தது.

### 4. Log Output

[Log bundle](/ta-IN/support/guides/collecting-logs) attach செய்யுங்கள்:

```bash
triggerfish logs bundle
```

Issue security-sensitive ஆனால், portions redact செய்யலாம், ஆனால் issue இல் redacted என்று குறிப்பிடவும்.

குறைந்தது relevant log lines paste செய்யுங்கள். Events correlate செய்ய timestamps include செய்யுங்கள்.

### 5. Configuration (Redacted)

`triggerfish.yaml` இன் relevant section paste செய்யுங்கள். **எப்போதும் secrets redact செய்யவும்.** Actual values ஐ placeholders உடன் replace செய்யுங்கள்:

```yaml
# Good - secrets redacted
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # keychain இல் stored
channels:
  telegram:
    ownerId: "REDACTED"
    classification: INTERNAL
```

### 6. Patrol Output

```bash
triggerfish patrol
```

Output paste செய்யுங்கள். System health இன் quick snapshot கிடைக்கும்.

## Issue Types

### Bug Report

Broken ஆயிருக்கும் விஷயங்களுக்கு இந்த template பயன்படுத்தவும்:

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

**Log bundle:** (file attach செய்யவும்)
```

### Feature Request

```markdown
## Feature Request

**Problem:** இன்று செய்ய முடியாத என்ன செய்ய try செய்கிறீர்கள்?

**Proposed solution:** எவ்வாறு வேலை செய்ய வேண்டும் என்று நினைக்கிறீர்கள்?

**Alternatives considered:** வேறு என்ன try செய்தீர்கள்?
```

### Question / Support Request

ஏதாவது bug ஆ என்று தெரியாவிட்டால் அல்லது stuck ஆகியிருந்தால், Issues க்கு பதிலாக [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) பயன்படுத்தவும். ஒரே சரியான answer இல்லாத questions க்கு Discussions சிறந்தது.

## என்ன Include செய்யக்கூடாது

- **Raw API keys அல்லது passwords.** எப்போதும் redact செய்யவும்.
- **Conversations இலிருந்து personal data.** Names, emails, phone numbers redact செய்யவும்.
- **Entire log files inline.** ஆயிரக்கணக்கான lines paste செய்வதற்கு பதிலாக log bundle ஒரு file ஆக attach செய்யவும்.

## File செய்த பிறகு

- **Follow-up questions க்காக watch செய்யுங்கள்.** Maintainers க்கு அதிக information தேவைப்படலாம்.
- **Fixes test செய்யுங்கள்.** Fix push ஆனால், நீங்கள் verify செய்யுமாறு கேட்கப்படலாம்.
- **Issue close செய்யுங்கள்** நீங்களே solution கண்டுபிடித்தால். மற்றவர்களுக்கு பயன்படும்படி solution post செய்யுங்கள்.
