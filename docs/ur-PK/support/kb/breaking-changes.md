# KB: Breaking Changes

Upgrade کرتے وقت action کی ضرورت ہو سکتی ہے ایسی version-by-version changes کی فہرست۔

## Notion: `client_secret` ہٹا دیا گیا

**Commit:** 6d876c3

Security hardening measure کے طور پر Notion integration configuration سے `client_secret` field ہٹا دی گئی ہے۔ Notion اب صرف OS keychain میں stored OAuth token استعمال کرتا ہے۔

**Action required:** اگر آپ کی `triggerfish.yaml` میں `notion.client_secret` field ہے تو اسے ہٹا دیں۔ اسے ignore کر دیا جائے گا لیکن confusion پیدا کر سکتا ہے۔

**نیا setup flow:**

```bash
triggerfish connect notion
```

یہ integration token keychain میں store کرتا ہے۔ کسی client secret کی ضرورت نہیں۔

---

## Tool Names: Dots سے Underscores

**Commit:** 505a443

تمام tool names dotted notation (`foo.bar`) سے underscore notation (`foo_bar`) میں بدل دی گئیں۔ کچھ LLM providers tool names میں dots support نہیں کرتے جس کی وجہ سے tool call failures ہوتی تھیں۔

**Action required:** اگر آپ کے پاس custom policy rules یا skill definitions ہیں جو dots کے ساتھ tool names reference کرتی ہیں تو انہیں underscores استعمال کرنے کے لیے update کریں:

```yaml
# پہلے
- tool: notion.search

# بعد میں
- tool: notion_search
```

---

## Windows Installer: Move-Item سے Copy-Item

**Commit:** 5e0370f

Windows PowerShell installer کو upgrades کے دوران binary replacement کے لیے `Move-Item -Force` سے `Copy-Item -Force` میں بدل دیا گیا۔ `Move-Item` Windows پر files reliably overwrite نہیں کرتا۔

**Action required:** اگر fresh install کر رہے ہیں تو کچھ نہیں۔ اگر آپ پرانے version پر ہیں اور Windows پر `triggerfish update` fail ہو تو update سے پہلے service manually بند کریں:

```powershell
Stop-Service Triggerfish
# پھر installer یا triggerfish update دوبارہ چلائیں
```

---

## Version Stamping: Runtime سے Build-Time

**Commits:** e8b0c8c، eae3930، 6ce0c25

Version information runtime detection (checking `deno.json`) سے build-time stamping (git tags سے) میں منتقل کی گئی۔ CLI banner اب hardcoded version string نہیں دکھاتا۔

**Action required:** کچھ نہیں۔ `triggerfish version` کام کرتا رہتا ہے۔ Development builds version کے طور پر `dev` دکھاتے ہیں۔

---

## Signal: JRE 21 سے JRE 25

**Commit:** e5b1047

Signal channel کے auto-installer کو JRE 21 کی بجائے JRE 25 (Adoptium سے) download کرنے کے لیے update کیا گیا۔ signal-cli version بھی v0.14.0 پر pin کی گئی۔

**Action required:** اگر آپ کے پاس پرانے JRE والی existing signal-cli installation ہو تو Signal setup دوبارہ چلائیں:

```bash
triggerfish config add-channel signal
```

یہ updated JRE اور signal-cli download کرتا ہے۔

---

## Secrets: Plaintext سے Encrypted

Secrets storage format plaintext JSON سے AES-256-GCM encrypted JSON میں بدل گیا۔

**Action required:** کچھ نہیں۔ Migration automatic ہے۔ Details کے لیے [Secrets Migration](/ur-PK/support/kb/secrets-migration) دیکھیں۔

Migration کے بعد، اپنے secrets rotate کرنا recommended ہے کیونکہ plaintext versions پہلے disk پر stored تھے۔

---

## Tidepool: Callback سے Canvas Protocol

Tidepool (A2UI) interface callback-based `TidepoolTools` interface سے canvas-based protocol پر migrate ہوئی۔

**Files affected:**
- `src/tools/tidepool/tools/tools_legacy.ts` (پرانا interface، compatibility کے لیے retained)
- `src/tools/tidepool/tools/tools_canvas.ts` (نیا interface)

**Action required:** اگر آپ کے پاس custom skills ہیں جو پرانا Tidepool callback interface استعمال کرتی ہیں تو وہ legacy shim کے ذریعے کام کرتی رہیں گی۔ نئی skills canvas protocol استعمال کریں۔

---

## Config: Legacy `primary` String Format

`models.primary` field پہلے plain string accept کرتی تھی (`"anthropic/claude-sonnet-4-20250514"`)۔ اب object چاہیے:

```yaml
# Legacy (backward compatibility کے لیے ابھی بھی accepted)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# موجودہ (preferred)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Action required:** Object format پر update کریں۔ String format ابھی بھی parse ہوتا ہے لیکن future version میں remove ہو سکتا ہے۔

---

## Console Logging: ہٹا دیا گیا

**Commit:** 9ce1ce5

تمام raw `console.log`، `console.warn`، اور `console.error` calls structured logger (`createLogger()`) میں migrate ہو گئیں۔ چونکہ Triggerfish daemon کے طور پر چلتا ہے، stdout/stderr output users کو visible نہیں ہوتا۔ تمام logging اب file writer کے ذریعے جاتی ہے۔

**Action required:** کچھ نہیں۔ اگر آپ debugging کے لیے console output پر rely کر رہے تھے (مثلاً stdout pipe کر کے) تو اس کی بجائے `triggerfish logs` استعمال کریں۔

---

## Impact کا اندازہ لگانا

Multiple versions کے پار upgrade کرتے وقت، اوپر ہر entry check کریں۔ زیادہ تر changes automatic migration کے ساتھ backward-compatible ہیں۔ صرف وہ changes جن کے لیے manual action درکار ہے:

1. **Notion client_secret removal** (config سے field ہٹائیں)
2. **Tool name format change** (custom policy rules update کریں)
3. **Signal JRE update** (Signal استعمال کر رہے ہیں تو Signal setup دوبارہ چلائیں)

باقی سب automatically handle ہوتا ہے۔
