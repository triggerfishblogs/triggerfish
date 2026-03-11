# अच्छी Issue कैसे दर्ज करें

एक अच्छी तरह से संरचित issue तेज़ी से resolve होती है। बिना logs और reproduction steps वाली अस्पष्ट issue अक्सर हफ्तों तक पड़ी रहती है क्योंकि कोई उस पर कार्रवाई नहीं कर सकता। यहाँ बताया गया है कि क्या शामिल करें।

## दर्ज करने से पहले

1. **मौजूदा issues खोजें।** हो सकता है किसी ने पहले ही वही समस्या रिपोर्ट की हो। [Open issues](https://github.com/greghavens/triggerfish/issues) और [closed issues](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed) जाँचें।

2. **समस्या निवारण गाइड जाँचें।** [समस्या निवारण section](/hi-IN/support/troubleshooting/) अधिकांश सामान्य समस्याओं को कवर करता है।

3. **ज्ञात समस्याएँ जाँचें।** [ज्ञात समस्याएँ](/hi-IN/support/kb/known-issues) page उन समस्याओं को सूचीबद्ध करता है जिनसे हम पहले से अवगत हैं।

4. **नवीनतम version आज़माएँ।** यदि आप नवीनतम release पर नहीं हैं, तो पहले अपडेट करें:
   ```bash
   triggerfish update
   ```

## क्या शामिल करें

### 1. Environment

```
Triggerfish version: (`triggerfish version` चलाएँ)
OS: (जैसे macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Architecture: (x64 या arm64)
Installation method: (binary installer, from source, Docker)
```

### 2. Reproduce करने के चरण

उन कार्यों का सटीक क्रम लिखें जो समस्या की ओर ले जाते हैं। विशिष्ट हों:

**खराब:**
> Bot काम करना बंद कर दिया।

**अच्छा:**
> 1. Telegram channel कॉन्फ़िगर के साथ Triggerfish शुरू किया
> 2. Bot को DM में "check my calendar for tomorrow" संदेश भेजा
> 3. Bot ने calendar results के साथ respond किया
> 4. "now email those results to alice@example.com" भेजा
> 5. अपेक्षित: bot email भेजे
> 6. वास्तविक: bot "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL" के साथ respond करता है

### 3. अपेक्षित बनाम वास्तविक व्यवहार

बताएँ कि आपने क्या होने की अपेक्षा की और वास्तव में क्या हुआ। यदि कोई error message है तो उसे शामिल करें। Copy-paste paraphrasing से बेहतर है।

### 4. Log Output

एक [log bundle](/hi-IN/support/guides/collecting-logs) attach करें:

```bash
triggerfish logs bundle
```

यदि issue security-sensitive है, तो आप भाग redact कर सकते हैं, लेकिन issue में नोट करें कि आपने क्या redact किया।

कम से कम, संबंधित log lines paste करें। Timestamps शामिल करें ताकि हम events को correlate कर सकें।

### 5. Configuration (Redacted)

अपनी `triggerfish.yaml` का संबंधित section paste करें। **हमेशा secrets redact करें।** वास्तविक values को placeholders से replace करें:

```yaml
# अच्छा - secrets redacted
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # keychain में संग्रहीत
channels:
  telegram:
    ownerId: "REDACTED"
    classification: INTERNAL
```

### 6. Patrol Output

```bash
triggerfish patrol
```

Output paste करें। यह हमें system health का quick snapshot देता है।

## Issue Types

### Bug Report

टूटी हुई चीज़ों के लिए यह template उपयोग करें:

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

**Log bundle:** (file attach करें)
```

### Feature Request

```markdown
## Feature Request

**Problem:** आप क्या करने की कोशिश कर रहे हैं जो आज नहीं कर सकते?

**Proposed solution:** आपको लगता है यह कैसे काम करना चाहिए?

**Alternatives considered:** आपने और क्या आज़माया?
```

### Question / Support Request

यदि आपको यकीन नहीं है कि कुछ bug है या आप बस अटके हुए हैं, तो Issues के बजाय [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) उपयोग करें। Discussions उन प्रश्नों के लिए बेहतर हैं जिनका एक ही सही उत्तर नहीं हो सकता।

## क्या शामिल न करें

- **Raw API keys या passwords।** हमेशा redact करें।
- **बातचीत से व्यक्तिगत डेटा।** नाम, emails, phone numbers redact करें।
- **पूरी log files inline।** हज़ारों lines paste करने के बजाय log bundle को file के रूप में attach करें।

## दर्ज करने के बाद

- **Follow-up प्रश्नों पर ध्यान दें।** Maintainers को अधिक जानकारी की आवश्यकता हो सकती है।
- **Fixes test करें।** यदि कोई fix push किया जाता है, तो आपसे इसे verify करने के लिए कहा जा सकता है।
- **Issue बंद करें** यदि आपको स्वयं समाधान मिल जाए। समाधान पोस्ट करें ताकि दूसरे लाभान्वित हो सकें।
