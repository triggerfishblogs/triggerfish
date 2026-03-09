# Logs एकत्र करना

बग रिपोर्ट दर्ज करते समय, log bundle maintainers को बार-बार विवरण माँगे बिना समस्या का निदान करने के लिए आवश्यक जानकारी प्रदान करता है।

## Quick Bundle

Log bundle बनाने का सबसे तेज़ तरीका:

```bash
triggerfish logs bundle
```

यह `~/.triggerfish/logs/` से सभी log files वाला archive बनाता है:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

यदि archiving किसी कारण से विफल होता है, तो यह raw log files को एक directory में copy करने पर fallback करता है जिसे आप मैन्युअल रूप से zip कर सकते हैं।

## Bundle में क्या शामिल है

- `triggerfish.log` (वर्तमान log file)
- `triggerfish.1.log` से `triggerfish.10.log` तक (rotated backups, यदि मौजूद हैं)

Bundle में शामिल **नहीं** है:
- आपकी `triggerfish.yaml` config file
- Secret keys या credentials
- SQLite database
- SPINE.md या TRIGGER.md

## Manual Log Collection

यदि bundle command उपलब्ध नहीं है (पुराना version, Docker, आदि):

```bash
# Log files ढूँढें
ls ~/.triggerfish/logs/

# मैन्युअल रूप से archive बनाएँ
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Log Detail बढ़ाना

डिफ़ॉल्ट रूप से, logs INFO level पर होते हैं। बग रिपोर्ट के लिए अधिक detail capture करने के लिए:

1. Log level को verbose या debug पर सेट करें:
   ```bash
   triggerfish config set logging.level verbose
   # या अधिकतम detail के लिए:
   triggerfish config set logging.level debug
   ```

2. समस्या reproduce करें

3. Bundle एकत्र करें:
   ```bash
   triggerfish logs bundle
   ```

4. Level को normal पर वापस सेट करें:
   ```bash
   triggerfish config set logging.level normal
   ```

### Log Level Detail

| Level | क्या capture होता है |
|-------|-----------------|
| `quiet` | केवल Errors |
| `normal` | Errors, warnings, info (डिफ़ॉल्ट) |
| `verbose` | Debug messages जोड़ता है (tool calls, provider interactions, classification decisions) |
| `debug` | सब कुछ trace-level messages सहित (raw protocol data, internal state changes) |

**चेतावनी:** `debug` level बहुत अधिक output generate करता है। इसे केवल तभी उपयोग करें जब सक्रिय रूप से कोई समस्या reproduce कर रहे हों, फिर वापस switch करें।

## Real Time में Logs Filter करना

किसी समस्या को reproduce करते समय, आप live log stream filter कर सकते हैं:

```bash
# केवल errors दिखाएँ
triggerfish logs --level ERROR

# Warnings और ऊपर दिखाएँ
triggerfish logs --level WARN
```

Linux/macOS पर, यह filtering के साथ native `tail -f` उपयोग करता है। Windows पर, यह PowerShell `Get-Content -Wait -Tail` उपयोग करता है।

## Log Format

प्रत्येक log line इस format का पालन करती है:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Timestamp:** UTC में ISO 8601
- **Level:** ERROR, WARN, INFO, DEBUG, या TRACE
- **Component:** किस module ने log generate किया (जैसे `gateway`, `anthropic`, `telegram`, `policy`)
- **Message:** Structured context के साथ log message

## बग रिपोर्ट में क्या शामिल करें

Log bundle के साथ, शामिल करें:

1. **Reproduce करने के चरण।** समस्या होने पर आप क्या कर रहे थे?
2. **अपेक्षित व्यवहार।** क्या होना चाहिए था?
3. **वास्तविक व्यवहार।** वास्तव में क्या हुआ?
4. **Platform जानकारी।** OS, architecture, Triggerfish version (`triggerfish version`)
5. **Config excerpt।** आपकी `triggerfish.yaml` का संबंधित section (secrets redact करें)

पूर्ण checklist के लिए [Issues दर्ज करना](/hi-IN/support/guides/filing-issues) देखें।

## Logs में संवेदनशील जानकारी

Triggerfish logs में external data को `<<` और `>>` delimiters में wrap करके sanitize करता है। API keys और tokens कभी भी log output में दिखाई नहीं देने चाहिए। हालाँकि, log bundle submit करने से पहले:

1. कुछ भी ऐसा scan करें जो आप share नहीं करना चाहते (email addresses, file paths, message content)
2. आवश्यकतानुसार redact करें
3. अपनी issue में नोट करें कि bundle redact किया गया है

Log files में आपकी बातचीत से message content होता है। यदि आपकी बातचीत में संवेदनशील जानकारी है, तो share करने से पहले उन भागों को redact करें।
