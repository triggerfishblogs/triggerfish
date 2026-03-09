# KB: Breaking Changes

Upgrade करते समय कार्रवाई की आवश्यकता वाले परिवर्तनों की संस्करण-दर-संस्करण सूची।

## Notion: `client_secret` हटाया गया

**Commit:** 6d876c3

Security hardening उपाय के रूप में `client_secret` field को Notion integration configuration से हटा दिया गया। Notion अब केवल OS keychain में संग्रहीत OAuth token उपयोग करता है।

**आवश्यक कार्रवाई:** यदि आपकी `triggerfish.yaml` में `notion.client_secret` field है, तो इसे हटा दें। इसे ignore किया जाएगा लेकिन भ्रम पैदा कर सकता है।

**नया setup flow:**

```bash
triggerfish connect notion
```

यह integration token को keychain में संग्रहीत करता है। कोई client secret आवश्यक नहीं।

---

## Tool Names: Dots से Underscores

**Commit:** 505a443

सभी tool names dotted notation (`foo.bar`) से underscore notation (`foo_bar`) में बदल दिए गए। कुछ LLM providers tool names में dots का समर्थन नहीं करते, जिससे tool call विफलताएँ होती थीं।

**आवश्यक कार्रवाई:** यदि आपके पास dots वाले tool names reference करने वाले custom policy rules या skill definitions हैं, तो उन्हें underscores उपयोग करने के लिए अपडेट करें:

```yaml
# पहले
- tool: notion.search

# बाद में
- tool: notion_search
```

---

## Windows Installer: Move-Item से Copy-Item

**Commit:** 5e0370f

Windows PowerShell installer को upgrades के दौरान binary replacement के लिए `Move-Item -Force` से `Copy-Item -Force` में बदला गया। `Move-Item` Windows पर files को विश्वसनीय रूप से overwrite नहीं करता।

**आवश्यक कार्रवाई:** Fresh install करने पर कोई नहीं। यदि आप पुराने version पर हैं और Windows पर `triggerfish update` विफल होता है, तो update करने से पहले service मैन्युअल रूप से रोकें:

```powershell
Stop-Service Triggerfish
# फिर installer या triggerfish update पुनः चलाएँ
```

---

## Version Stamping: Runtime से Build-Time

**Commits:** e8b0c8c, eae3930, 6ce0c25

Version जानकारी runtime detection (deno.json जाँचना) से build-time stamping (git tags से) में स्थानांतरित हुई। CLI banner अब hardcoded version string नहीं दिखाता।

**आवश्यक कार्रवाई:** कोई नहीं। `triggerfish version` काम करता रहता है। Development builds version के रूप में `dev` दिखाते हैं।

---

## Signal: JRE 21 से JRE 25

**Commit:** e5b1047

Signal channel के auto-installer को JRE 21 के बजाय JRE 25 (Adoptium से) download करने के लिए अपडेट किया गया। signal-cli version भी v0.14.0 पर pin किया गया।

**आवश्यक कार्रवाई:** यदि आपके पास पुराने JRE के साथ मौजूदा signal-cli installation है, तो Signal setup पुनः चलाएँ:

```bash
triggerfish config add-channel signal
```

यह अपडेटेड JRE और signal-cli download करता है।

---

## Secrets: Plaintext से Encrypted

Secrets storage format plaintext JSON से AES-256-GCM encrypted JSON में बदला।

**आवश्यक कार्रवाई:** कोई नहीं। माइग्रेशन automatic है। विवरण के लिए [Secrets माइग्रेशन](/hi-IN/support/kb/secrets-migration) देखें।

माइग्रेशन के बाद, अपने secrets rotate करने की सिफारिश है क्योंकि plaintext versions पहले disk पर संग्रहीत थे।

---

## Tidepool: Callback से Canvas Protocol

Tidepool (A2UI) interface callback-based `TidepoolTools` interface से canvas-based protocol में migrate हुआ।

**प्रभावित files:**
- `src/tools/tidepool/tools/tools_legacy.ts` (पुराना interface, compatibility के लिए रखा गया)
- `src/tools/tidepool/tools/tools_canvas.ts` (नया interface)

**आवश्यक कार्रवाई:** यदि आपके पास पुराने Tidepool callback interface उपयोग करने वाली custom skills हैं, तो वे legacy shim के माध्यम से काम करती रहेंगी। नई skills को canvas protocol उपयोग करना चाहिए।

---

## Config: Legacy `primary` String Format

`models.primary` field पहले plain string (`"anthropic/claude-sonnet-4-20250514"`) स्वीकार करता था। अब इसे object चाहिए:

```yaml
# Legacy (backward compatibility के लिए अभी भी स्वीकार)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# वर्तमान (preferred)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**आवश्यक कार्रवाई:** Object format में अपडेट करें। String format अभी भी parse होता है लेकिन भविष्य के version में हटाया जा सकता है।

---

## Console Logging: हटाया गया

**Commit:** 9ce1ce5

सभी raw `console.log`, `console.warn`, और `console.error` calls structured logger (`createLogger()`) में migrate हो गए। चूँकि Triggerfish daemon के रूप में चलता है, stdout/stderr output users को दिखाई नहीं देता। सभी logging अब file writer के माध्यम से होती है।

**आवश्यक कार्रवाई:** कोई नहीं। यदि आप debugging के लिए console output पर निर्भर थे (जैसे stdout pipe करना), तो इसके बजाय `triggerfish logs` उपयोग करें।

---

## प्रभाव का अनुमान लगाना

कई versions में upgrade करते समय, ऊपर की प्रत्येक entry जाँचें। अधिकांश परिवर्तन automatic migration के साथ backward-compatible हैं। केवल वे परिवर्तन जिनमें manual कार्रवाई आवश्यक है:

1. **Notion client_secret हटाना** (config से field हटाएँ)
2. **Tool name format परिवर्तन** (custom policy rules अपडेट करें)
3. **Signal JRE update** (यदि Signal उपयोग कर रहे हैं तो Signal setup पुनः चलाएँ)

बाकी सब कुछ स्वचालित रूप से handle होता है।
