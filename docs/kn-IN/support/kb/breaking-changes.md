# KB: Breaking Changes

Upgrade ಮಾಡುವಾಗ action ಅಗತ್ಯ ಇರಬಹುದಾದ version-by-version changes ಪಟ್ಟಿ.

## Notion: `client_secret` ತೆಗೆದುಹಾಕಲಾಗಿದೆ

**Commit:** 6d876c3

Security hardening measure ಆಗಿ Notion integration configuration ನಿಂದ `client_secret` field ತೆಗೆದುಹಾಕಲಾಗಿದೆ. Notion ಈಗ OS keychain ನಲ್ಲಿ store ಆದ OAuth token ಮಾತ್ರ ಬಳಸುತ್ತದೆ.

**Action required:** ನಿಮ್ಮ `triggerfish.yaml` ನಲ್ಲಿ `notion.client_secret` field ಇದ್ದರೆ, ಅದನ್ನು ತೆಗೆದುಹಾಕಿ. Ignored ಆಗುತ್ತದೆ ಆದರೆ confusion create ಮಾಡಬಹುದು.

**New setup flow:**

```bash
triggerfish connect notion
```

ಇದು integration token ಅನ್ನು keychain ನಲ್ಲಿ store ಮಾಡುತ್ತದೆ. Client secret ಅಗತ್ಯವಿಲ್ಲ.

---

## Tool Names: Dots ನಿಂದ Underscores ಗೆ

**Commit:** 505a443

ಎಲ್ಲ tool names dotted notation (`foo.bar`) ನಿಂದ underscore notation (`foo_bar`) ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ. ಕೆಲವು LLM providers tool names ನಲ್ಲಿ dots support ಮಾಡುವುದಿಲ್ಲ, ಇದರಿಂದ tool call failures ಆಗುತ್ತಿದ್ದವು.

**Action required:** Dots ಜೊತೆ tool names reference ಮಾಡುವ custom policy rules ಅಥವಾ skill definitions ಇದ್ದರೆ, underscores ಬಳಸಲು update ಮಾಡಿ:

```yaml
# Before
- tool: notion.search

# After
- tool: notion_search
```

---

## Windows Installer: Move-Item ನಿಂದ Copy-Item ಗೆ

**Commit:** 5e0370f

Windows PowerShell installer binary replacement ಗಾಗಿ upgrades ಸಮಯದಲ್ಲಿ `Move-Item -Force` ನಿಂದ `Copy-Item -Force` ಗೆ ಬದಲಾಯಿಸಲಾಗಿದೆ. `Move-Item` Windows ನಲ್ಲಿ files reliably overwrite ಮಾಡುವುದಿಲ್ಲ.

**Action required:** Fresh install ಮಾಡುತ್ತಿದ್ದರೆ ಏನೂ ಬೇಡ. ಹಳೆಯ version ನಲ್ಲಿದ್ದು Windows ನಲ್ಲಿ `triggerfish update` fail ಆದರೆ, update ಮಾಡುವ ಮೊದಲು service manually stop ಮಾಡಿ:

```powershell
Stop-Service Triggerfish
# ನಂತರ installer ಅಥವಾ triggerfish update ಮತ್ತೆ ಚಲಾಯಿಸಿ
```

---

## Version Stamping: Runtime ನಿಂದ Build-Time ಗೆ

**Commits:** e8b0c8c, eae3930, 6ce0c25

Version information runtime detection (`deno.json` check ಮಾಡುವ) ನಿಂದ git tags ನಿಂದ build-time stamping ಗೆ move ಮಾಡಲಾಗಿದೆ. CLI banner hardcoded version string ತೋರಿಸುವುದಿಲ್ಲ.

**Action required:** ಏನೂ ಬೇಡ. `triggerfish version` ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತಲೇ ಇರುತ್ತದೆ. Development builds version ಆಗಿ `dev` ತೋರಿಸುತ್ತವೆ.

---

## Signal: JRE 21 ನಿಂದ JRE 25 ಗೆ

**Commit:** e5b1047

Signal channel ನ auto-installer JRE 21 ಬದಲಾಗಿ JRE 25 (Adoptium ನಿಂದ) download ಮಾಡಲು update ಮಾಡಲಾಗಿದೆ. Signal-cli version ಕೂಡ v0.14.0 ಗೆ pin ಮಾಡಲಾಗಿದೆ.

**Action required:** ಹಳೆಯ JRE ಜೊತೆ existing signal-cli installation ಇದ್ದರೆ, Signal setup ಮತ್ತೆ ಚಲಾಯಿಸಿ:

```bash
triggerfish config add-channel signal
```

ಇದು updated JRE ಮತ್ತು signal-cli download ಮಾಡುತ್ತದೆ.

---

## Secrets: Plaintext ನಿಂದ Encrypted ಗೆ

Secrets storage format plaintext JSON ನಿಂದ AES-256-GCM encrypted JSON ಗೆ ಬದಲಾಗಿದೆ.

**Action required:** ಏನೂ ಬೇಡ. Migration automatic. Details ಗಾಗಿ [Secrets Migration](/kn-IN/support/kb/secrets-migration) ನೋಡಿ.

Migration ನಂತರ, plaintext versions ಹಿಂದೆ disk ನಲ್ಲಿ store ಆಗಿದ್ದ ಕಾರಣ secrets rotate ಮಾಡಲು recommend ಮಾಡಲಾಗುತ್ತದೆ.

---

## Tidepool: Callback ನಿಂದ Canvas Protocol ಗೆ

Tidepool (A2UI) interface callback-based `TidepoolTools` interface ನಿಂದ canvas-based protocol ಗೆ migrate ಮಾಡಲಾಗಿದೆ.

**Files affected:**
- `src/tools/tidepool/tools/tools_legacy.ts` (ಹಳೆಯ interface, compatibility ಗಾಗಿ ಉಳಿಸಲಾಗಿದೆ)
- `src/tools/tidepool/tools/tools_canvas.ts` (ಹೊಸ interface)

**Action required:** ಹಳೆಯ Tidepool callback interface ಬಳಸುವ custom skills ಇದ್ದರೆ, legacy shim ಮೂಲಕ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತಲೇ ಇರುತ್ತವೆ. ಹೊಸ skills canvas protocol ಬಳಸಬೇಕು.

---

## Config: Legacy `primary` String Format

`models.primary` field ಹಿಂದೆ plain string (`"anthropic/claude-sonnet-4-20250514"`) accept ಮಾಡುತ್ತಿತ್ತು. ಈಗ object ಅಗತ್ಯ:

```yaml
# Legacy (backward compatibility ಗಾಗಿ ಇನ್ನೂ accept ಮಾಡುತ್ತದೆ)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Current (preferred)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Action required:** Object format ಗೆ update ಮಾಡಿ. String format ಇನ್ನೂ parse ಆಗುತ್ತದೆ ಆದರೆ future version ನಲ್ಲಿ ತೆಗೆದುಹಾಕಬಹುದು.

---

## Console Logging: ತೆಗೆದುಹಾಕಲಾಗಿದೆ

**Commit:** 9ce1ce5

ಎಲ್ಲ raw `console.log`, `console.warn`, ಮತ್ತು `console.error` calls structured logger (`createLogger()`) ಗೆ migrate ಮಾಡಲಾಗಿದೆ. Triggerfish daemon ಆಗಿ ಚಲಿಸುವ ಕಾರಣ stdout/stderr output users ಗೆ ಕಾಣಿಸುವುದಿಲ್ಲ. ಎಲ್ಲ logging ಈಗ file writer ಮೂಲಕ ನಡೆಯುತ್ತದೆ.

**Action required:** ಏನೂ ಬೇಡ. Debugging ಗಾಗಿ console output ಅವಲಂಬಿಸಿದ್ದರೆ (ಉದಾ., stdout pipe ಮಾಡಿ), ಬದಲಾಗಿ `triggerfish logs` ಬಳಸಿ.

---

## Impact ಅಂದಾಜಿಸುವುದು

Multiple versions ಮೇಲೆ upgrade ಮಾಡುವಾಗ ಮೇಲಿನ ಪ್ರತಿ entry ಪರಿಶೀಲಿಸಿ. ಹೆಚ್ಚಿನ changes backward-compatible ಮತ್ತು automatic migration ಜೊತೆ. Manual action ಅಗತ್ಯ ಇರುವ changes ಮಾತ್ರ:

1. **Notion client_secret removal** (config ನಿಂದ field ತೆಗೆದುಹಾಕಿ)
2. **Tool name format change** (custom policy rules update ಮಾಡಿ)
3. **Signal JRE update** (Signal ಬಳಸುತ್ತಿದ್ದರೆ Signal setup ಮತ್ತೆ ಚಲಾಯಿಸಿ)

ಉಳಿದದ್ದೆಲ್ಲ automatically handle ಆಗುತ್ತದೆ.
