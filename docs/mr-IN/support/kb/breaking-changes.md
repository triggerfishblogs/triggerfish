# KB: Breaking Changes

Version-by-version बदलांची यादी जी upgrade करताना action आवश्यक असू शकते.

## Notion: `client_secret` काढला

**Commit:** 6d876c3

Security hardening म्हणून Notion integration configuration मधून `client_secret` field काढला. Notion आता फक्त OS keychain मध्ये stored OAuth token वापरतो.

**Action required:** तुमच्या `triggerfish.yaml` मध्ये `notion.client_secret` field असल्यास, ते काढा. ते ignore केले जाईल पण confusion होऊ शकते.

**नवीन setup flow:**

```bash
triggerfish connect notion
```

हे integration token keychain मध्ये store करतो. Client secret आवश्यक नाही.

---

## Tool Names: Dots to Underscores

**Commit:** 505a443

सर्व tool names dotted notation (`foo.bar`) वरून underscore notation (`foo_bar`) ला बदलले. काही LLM providers tool names मध्ये dots support करत नाहीत, ज्यामुळे tool call failures होत होत्या.

**Action required:** तुमच्याकडे dots असलेल्या tool names reference करणारे custom policy rules किंवा skill definitions असल्यास, underscores वापरण्यासाठी update करा:

```yaml
# पूर्वी
- tool: notion.search

# नंतर
- tool: notion_search
```

---

## Windows Installer: Move-Item to Copy-Item

**Commit:** 5e0370f

Upgrades दरम्यान binary replacement साठी Windows PowerShell installer `Move-Item -Force` वरून `Copy-Item -Force` ला बदलला. `Move-Item` Windows वर files reliably overwrite करत नाही.

**Action required:** Fresh install करत असल्यास काहीही नाही. जुन्या version वर असल्यास आणि Windows वर `triggerfish update` fail होत असल्यास, update करण्यापूर्वी service manually stop करा:

```powershell
Stop-Service Triggerfish
# नंतर installer किंवा triggerfish update पुन्हा run करा
```

---

## Version Stamping: Runtime to Build-Time

**Commits:** e8b0c8c, eae3930, 6ce0c25

Version information runtime detection (`deno.json` check करणे) वरून git tags मधून build-time stamping ला moved. CLI banner आता hardcoded version string दाखवत नाही.

**Action required:** काहीही नाही. `triggerfish version` काम करत राहतो. Development builds version म्हणून `dev` दाखवतात.

---

## Signal: JRE 21 to JRE 25

**Commit:** e5b1047

Signal channel चा auto-installer JRE 21 ऐवजी JRE 25 (Adoptium मधून) download करण्यासाठी updated. signal-cli version देखील v0.14.0 ला pinned केला.

**Action required:** जुन्या JRE सह existing signal-cli installation असल्यास, Signal setup पुन्हा run करा:

```bash
triggerfish config add-channel signal
```

हे updated JRE आणि signal-cli download करतो.

---

## Secrets: Plaintext to Encrypted

Secrets storage format plaintext JSON वरून AES-256-GCM encrypted JSON ला बदलला.

**Action required:** काहीही नाही. Migration automatic आहे. Details साठी [Secrets Migration](/mr-IN/support/kb/secrets-migration) पहा.

Migration नंतर secrets rotate करणे recommended आहे कारण plaintext versions आधी disk वर stored होत्या.

---

## Tidepool: Callback to Canvas Protocol

Tidepool (A2UI) interface callback-based `TidepoolTools` interface वरून canvas-based protocol ला migrated झाला.

**Files affected:**
- `src/tools/tidepool/tools/tools_legacy.ts` (जुना interface, compatibility साठी retained)
- `src/tools/tidepool/tools/tools_canvas.ts` (नवीन interface)

**Action required:** जुना Tidepool callback interface वापरणारे custom skills असल्यास, ते legacy shim द्वारे काम करत राहतील. नवीन skills canvas protocol वापरायला हवेत.

---

## Config: Legacy `primary` String Format

`models.primary` field आधी plain string (`"anthropic/claude-sonnet-4-20250514"`) accept करत होता. आता object आवश्यक आहे:

```yaml
# Legacy (backward compatibility साठी अजूनही accepted)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Current (preferred)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Action required:** Object format ला update करा. String format अजूनही parsed होतो पण future version मध्ये removed होऊ शकतो.

---

## Console Logging: काढले

**Commit:** 9ce1ce5

सर्व raw `console.log`, `console.warn`, आणि `console.error` calls structured logger (`createLogger()`) ला migrated. Triggerfish daemon म्हणून run होत असल्यामुळे, stdout/stderr output users ला visible नसतो. सर्व logging आता file writer मधून जाते.

**Action required:** काहीही नाही. Debugging साठी console output वर अवलंबून असल्यास (उदा. stdout pipe करणे), त्याऐवजी `triggerfish logs` वापरा.

---

## Impact चा अंदाज

Multiple versions across upgrade करताना, वरील प्रत्येक entry check करा. बहुतेक changes automatic migration सह backward-compatible आहेत. Manual action आवश्यक असलेले फक्त हे changes आहेत:

1. **Notion client_secret removal** (config मधून field काढा)
2. **Tool name format change** (custom policy rules update करा)
3. **Signal JRE update** (Signal वापरत असल्यास Signal setup पुन्हा run करा)

इतर सर्व automatically handled आहे.
