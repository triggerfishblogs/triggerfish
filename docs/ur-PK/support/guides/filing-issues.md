# اچھا Issue File کرنے کا طریقہ

ایک well-structured issue جلد resolve ہوتی ہے۔ بغیر logs اور reproduction steps کے vague issue اکثر ہفتوں تک پڑی رہتی ہے کیونکہ کوئی اس پر act نہیں کر سکتا۔ یہ شامل کرنا ہے۔

## File کرنے سے پہلے

1. **موجودہ issues تلاش کریں۔** ممکن ہے کسی نے پہلے ہی ایک ہی مسئلہ report کیا ہو۔ [open issues](https://github.com/greghavens/triggerfish/issues) اور [closed issues](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed) check کریں۔

2. **Troubleshooting guides check کریں۔** [Troubleshooting section](/ur-PK/support/troubleshooting/) سب سے عام مسائل cover کرتا ہے۔

3. **Known issues check کریں۔** [Known Issues](/ur-PK/support/kb/known-issues) page ان مسائل کی فہرست دیتا ہے جن سے ہم پہلے سے آگاہ ہیں۔

4. **Latest version try کریں۔** اگر آپ latest release پر نہیں ہیں تو پہلے update کریں:
   ```bash
   triggerfish update
   ```

## کیا شامل کریں

### 1. Environment

```
Triggerfish version: (`triggerfish version` چلائیں)
OS: (مثلاً macOS 15.2، Ubuntu 24.04، Windows 11، Docker)
Architecture: (x64 یا arm64)
Installation method: (binary installer، from source، Docker)
```

### 2. Reproduce کرنے کے Steps

وہ exact sequence of actions لکھیں جو مسئلے کی طرف لے جاتی ہے۔ Specific ہوں:

**بری مثال:**
> Bot کام کرنا بند ہو گیا۔

**اچھی مثال:**
> 1. Telegram channel configure کر کے Triggerfish start کیا
> 2. Bot کو DM میں message بھیجا "check my calendar for tomorrow"
> 3. Bot نے calendar results کے ساتھ جواب دیا
> 4. "now email those results to alice@example.com" بھیجا
> 5. Expected: bot email بھیجے
> 6. Actual: bot نے "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL" کے ساتھ جواب دیا

### 3. Expected vs. Actual Behavior

کہیں کہ آپ کو کیا ہونے کی توقع تھی اور اصل میں کیا ہوا۔ اگر کوئی error message ہو تو exact message شامل کریں۔ Copy-paste paraphrasing سے بہتر ہے۔

### 4. Log Output

ایک [log bundle](/ur-PK/support/guides/collecting-logs) attach کریں:

```bash
triggerfish logs bundle
```

اگر issue security-sensitive ہو تو آپ حصوں کو redact کر سکتے ہیں، لیکن issue میں note کریں کہ آپ نے کیا redact کیا۔

کم از کم، متعلقہ log lines paste کریں۔ Timestamps شامل کریں تاکہ ہم events correlate کر سکیں۔

### 5. Configuration (Redacted)

اپنی `triggerfish.yaml` کا متعلقہ section paste کریں۔ **ہمیشہ secrets redact کریں۔** اصل values کو placeholders سے replace کریں:

```yaml
# اچھا - secrets redact کیے گئے
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # keychain میں stored
channels:
  telegram:
    ownerId: "REDACTED"
    classification: INTERNAL
```

### 6. Patrol Output

```bash
triggerfish patrol
```

Output paste کریں۔ یہ ہمیں system health کا quick snapshot دیتا ہے۔

## Issue Types

### Bug Report

ٹوٹی ہوئی چیزوں کے لیے اس template کا استعمال کریں:

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

**Problem:** آج آپ کیا کرنے کی کوشش کر رہے ہیں جو نہیں ہو رہا؟

**Proposed solution:** آپ کے خیال میں یہ کیسے کام کرنا چاہیے؟

**Alternatives considered:** آپ نے اور کیا try کیا؟
```

### Question / Support Request

اگر آپ یقینی نہیں ہیں کہ یہ bug ہے یا آپ بس پھنسے ہوئے ہیں تو Issues کی بجائے [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) استعمال کریں۔ Discussions ان سوالوں کے لیے بہتر ہیں جن کا ایک ہی صحیح جواب نہ ہو۔

## کیا شامل نہ کریں

- **Raw API keys یا passwords۔** ہمیشہ redact کریں۔
- **Conversations سے personal data۔** نام، emails، phone numbers redact کریں۔
- **Entire log files inline۔** ہزاروں lines paste کرنے کی بجائے log bundle کو file کے طور پر attach کریں۔

## File کرنے کے بعد

- **Follow-up questions کے لیے دیکھتے رہیں۔** Maintainers کو مزید معلومات کی ضرورت ہو سکتی ہے۔
- **Fixes test کریں۔** اگر fix push کی جائے تو آپ سے verify کرنے کے لیے کہا جا سکتا ہے۔
- **Issue بند کریں** اگر آپ خود solution ڈھونڈ لیں۔ Solution post کریں تاکہ دوسرے فائدہ اٹھا سکیں۔
