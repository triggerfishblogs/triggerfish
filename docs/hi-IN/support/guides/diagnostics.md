# Diagnostics चलाना

Triggerfish में दो built-in diagnostic tools हैं: `patrol` (external health check) और `healthcheck` tool (internal system probe)।

## Patrol

Patrol एक CLI command है जो जाँचता है कि core systems operational हैं:

```bash
triggerfish patrol
```

### क्या जाँचता है

| जाँच | Status | अर्थ |
|-------|--------|---------|
| Gateway running | CRITICAL यदि down | WebSocket control plane respond नहीं कर रहा |
| LLM connected | CRITICAL यदि down | Primary LLM provider तक नहीं पहुँच सकता |
| Channels active | WARNING यदि 0 | कोई channel adapters connected नहीं |
| Policy rules loaded | WARNING यदि 0 | कोई policy rules loaded नहीं |
| Skills installed | WARNING यदि 0 | कोई skills discovered नहीं |

### Overall status

- **HEALTHY** - सभी checks pass
- **WARNING** - कुछ non-critical checks flagged (जैसे कोई skills स्थापित नहीं)
- **CRITICAL** - कम से कम एक critical check विफल (gateway या LLM unreachable)

### Patrol कब उपयोग करें

- स्थापना के बाद, सत्यापित करने के लिए कि सब कुछ काम कर रहा है
- Config परिवर्तनों के बाद, पुष्टि करने के लिए कि daemon cleanly restart हुआ
- जब bot respond करना बंद कर दे, यह narrow down करने के लिए कि कौन सा component विफल हुआ
- बग रिपोर्ट दर्ज करने से पहले, patrol output शामिल करने के लिए

### उदाहरण output

```
Triggerfish Patrol Report
=========================
Overall: HEALTHY

[OK]      Gateway running
[OK]      LLM connected (anthropic)
[OK]      Channels active (3)
[OK]      Policy rules loaded (12)
[WARNING] Skills installed (0)
```

---

## Healthcheck Tool

Healthcheck tool एक internal agent tool है जो चल रहे gateway के अंदर से system components को probe करता है। यह बातचीत के दौरान agent को उपलब्ध है।

### क्या जाँचता है

**Providers:**
- Default provider मौजूद है और पहुँच योग्य है
- Provider name लौटाता है

**Storage:**
- Round-trip test: एक key लिखता है, वापस पढ़ता है, हटाता है
- Storage layer functional होने की पुष्टि करता है

**Skills:**
- Source (bundled, installed, workspace) के अनुसार discovered skills गिनता है

**Config:**
- Basic config validation

### Status levels

प्रत्येक component इनमें से एक रिपोर्ट करता है:
- `healthy` - पूरी तरह operational
- `degraded` - आंशिक रूप से काम कर रहा (कुछ features काम नहीं कर सकते)
- `error` - component टूटा हुआ है

### Classification आवश्यकता

Healthcheck tool को न्यूनतम INTERNAL classification चाहिए क्योंकि यह system internals (provider names, skill counts, storage status) reveal करता है। PUBLIC session इसे उपयोग नहीं कर सकता।

### Healthcheck उपयोग करना

अपने agent से पूछें:

> Run a healthcheck

या tool को सीधे उपयोग करते हुए:

```
tool: healthcheck
```

Response एक structured report है:

```
Overall: healthy

Providers: healthy
  Default provider: anthropic

Storage: healthy
  Round-trip test passed

Skills: healthy
  12 skills discovered

Config: healthy
```

---

## Diagnostics को संयोजित करना

पूरी तरह से diagnostic session के लिए:

1. **CLI से patrol चलाएँ:**
   ```bash
   triggerfish patrol
   ```

2. **हाल की errors के लिए logs जाँचें:**
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Agent से healthcheck चलाने के लिए कहें** (यदि agent responsive है):
   > Run a system healthcheck and tell me about any issues

4. **Log bundle एकत्र करें** यदि आपको issue दर्ज करनी है:
   ```bash
   triggerfish logs bundle
   ```

---

## Startup Diagnostics

यदि daemon बिल्कुल शुरू नहीं हो रहा, तो इन्हें क्रम में जाँचें:

1. **Config मौजूद है और valid है:**
   ```bash
   triggerfish config validate
   ```

2. **Secrets resolve हो सकते हैं:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **कोई port conflicts नहीं:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **कोई अन्य instance नहीं चल रहा:**
   ```bash
   triggerfish status
   ```

5. **System journal जाँचें (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **launchd जाँचें (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Windows Event Log जाँचें (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
