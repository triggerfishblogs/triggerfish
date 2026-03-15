# KB: Breaking Changes

Upgrade செய்யும்போது action தேவைப்படக்கூடிய changes இன் version-by-version பட்டியல்.

## Notion: `client_secret` நீக்கப்பட்டது

**Commit:** 6d876c3

Security hardening measure ஆக Notion integration configuration இலிருந்து `client_secret` field நீக்கப்பட்டது. Notion இப்போது OS keychain இல் stored OAuth token மட்டும் பயன்படுத்துகிறது.

**தேவையான action:** உங்கள் `triggerfish.yaml` இல் `notion.client_secret` field இருந்தால், அதை நீக்கவும். Ignored ஆகும், ஆனால் confusion ஏற்படலாம்.

**புதிய setup flow:**

```bash
triggerfish connect notion
```

இது integration token ஐ keychain இல் store செய்கிறது. Client secret தேவையில்லை.

---

## Tool Names: Dots முதல் Underscores வரை

**Commit:** 505a443

அனைத்து tool names dotted notation (`foo.bar`) இலிருந்து underscore notation (`foo_bar`) க்கு மாற்றப்பட்டன. சில LLM providers tool names இல் dots support செய்வதில்லை, இது tool call failures ஏற்படுத்தியது.

**தேவையான action:** Dots உடன் tool names reference செய்யும் custom policy rules அல்லது skill definitions இருந்தால், underscores பயன்படுத்தும்படி update செய்யவும்:

```yaml
# முன்பு
- tool: notion.search

# இப்போது
- tool: notion_search
```

---

## Windows Installer: Move-Item முதல் Copy-Item வரை

**Commit:** 5e0370f

Upgrades போது binary replacement க்கு Windows PowerShell installer `Move-Item -Force` இலிருந்து `Copy-Item -Force` க்கு மாற்றப்பட்டது. `Move-Item` Windows இல் files reliably overwrite செய்வதில்லை.

**தேவையான action:** Fresh install செய்தால் எதுவும் தேவையில்லை. Older version இல் இருந்து `triggerfish update` Windows இல் fail ஆனால், update செய்வதற்கு முன்பு service manually stop செய்யவும்:

```powershell
Stop-Service Triggerfish
# பின்னர் installer மீண்டும் இயக்கவும் அல்லது triggerfish update இயக்கவும்
```

---

## Version Stamping: Runtime முதல் Build-Time வரை

**Commits:** e8b0c8c, eae3930, 6ce0c25

Version information runtime detection (checking `deno.json`) இலிருந்து git tags இலிருந்து build-time stamping க்கு மாற்றப்பட்டது. CLI banner இப்போது hardcoded version string காட்டவில்லை.

**தேவையான action:** எதுவும் இல்லை. `triggerfish version` தொடர்ந்து வேலை செய்கிறது. Development builds version ஆக `dev` காட்டுகின்றன.

---

## Signal: JRE 21 முதல் JRE 25 வரை

**Commit:** e5b1047

Signal channel இன் auto-installer JRE 21 க்கு பதிலாக JRE 25 (Adoptium இலிருந்து) download செய்யும்படி update ஆனது. signal-cli version v0.14.0 க்கு pinned செய்யப்பட்டது.

**தேவையான action:** Older JRE உடன் existing signal-cli installation இருந்தால், Signal setup மீண்டும் இயக்கவும்:

```bash
triggerfish config add-channel signal
```

இது updated JRE மற்றும் signal-cli download செய்கிறது.

---

## Secrets: Plaintext முதல் Encrypted வரை

Secrets storage format plaintext JSON இலிருந்து AES-256-GCM encrypted JSON க்கு மாறியது.

**தேவையான action:** எதுவும் இல்லை. Migration automatic. Details க்கு [Secrets Migration](/ta-IN/support/kb/secrets-migration) பாருங்கள்.

Migration க்கு பிறகு, plaintext versions disk இல் previously stored ஆனதால் உங்கள் secrets rotate செய்வது recommended.

---

## Tidepool: Callback முதல் Canvas Protocol வரை

Tidepool (A2UI) interface callback-based `TidepoolTools` interface இலிருந்து canvas-based protocol க்கு migrate ஆனது.

**பாதிக்கப்பட்ட files:**
- `src/tools/tidepool/tools/tools_legacy.ts` (பழைய interface, compatibility க்கு retain செய்யப்பட்டது)
- `src/tools/tidepool/tools/tools_canvas.ts` (புதிய interface)

**தேவையான action:** பழைய Tidepool callback interface பயன்படுத்தும் custom skills இருந்தால், legacy shim மூலம் தொடர்ந்து வேலை செய்யும். புதிய skills canvas protocol பயன்படுத்த வேண்டும்.

---

## Config: Legacy `primary` String Format

`models.primary` field முன்பு plain string (`"anthropic/claude-sonnet-4-20250514"`) accept செய்தது. இப்போது object தேவை:

```yaml
# Legacy (backward compatibility க்கு still accepted)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Current (preferred)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**தேவையான action:** Object format க்கு update செய்யவும். String format இன்னும் parsed ஆகிறது, ஆனால் future version இல் நீக்கப்படலாம்.

---

## Console Logging: நீக்கப்பட்டது

**Commit:** 9ce1ce5

அனைத்து raw `console.log`, `console.warn`, மற்றும் `console.error` calls structured logger (`createLogger()`) க்கு migrate செய்யப்பட்டன. Triggerfish daemon ஆக இயங்குவதால், stdout/stderr output users க்கு visible இல்லை. அனைத்து logging உம் file writer மூலம் செல்கிறது.

**தேவையான action:** எதுவும் இல்லை. Debugging க்கு console output rely செய்தீர்களென்றால் (உதா., stdout piping), `triggerfish logs` பயன்படுத்தவும்.

---

## Impact மதிப்பிடுவது

Multiple versions across upgrade செய்யும்போது, மேலே உள்ள ஒவ்வொரு entry உம் சரிபார்க்கவும். பெரும்பாலான changes automatic migration உடன் backward-compatible. Manual action தேவைப்படும் changes மட்டும்:

1. **Notion client_secret removal** (config இலிருந்து field நீக்கவும்)
2. **Tool name format change** (custom policy rules update செய்யவும்)
3. **Signal JRE update** (Signal பயன்படுத்தினால் Signal setup மீண்டும் இயக்கவும்)

மற்ற எல்லாவற்றும் automatically handle செய்யப்படுகின்றன.
