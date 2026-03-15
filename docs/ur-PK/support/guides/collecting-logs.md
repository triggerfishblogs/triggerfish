# Logs جمع کرنا

Bug report file کرتے وقت، log bundle maintainers کو وہ معلومات دیتا ہے جن کی انہیں issue diagnose کرنے کے لیے ضرورت ہے، بار بار details مانگے بغیر۔

## فوری Bundle

Log bundle بنانے کا سب سے تیز طریقہ:

```bash
triggerfish logs bundle
```

یہ `~/.triggerfish/logs/` سے تمام log files پر مشتمل archive بناتا ہے:

- **Linux/macOS:** `triggerfish-logs.tar.gz`
- **Windows:** `triggerfish-logs.zip`

اگر archiving کسی بھی وجہ سے fail ہو تو یہ raw log files کو ایک directory میں copy کرنے پر fallback کرتا ہے جسے آپ manually zip کر سکتے ہیں۔

## Bundle میں کیا ہے

- `triggerfish.log` (موجودہ log file)
- `triggerfish.1.log` سے `triggerfish.10.log` تک (rotated backups، اگر موجود ہوں)

Bundle میں یہ **نہیں** ہے:
- آپ کی `triggerfish.yaml` config file
- Secret keys یا credentials
- SQLite database
- SPINE.md یا TRIGGER.md

## Manual Log Collection

اگر bundle command دستیاب نہ ہو (پرانا version، Docker، وغیرہ):

```bash
# Log files ڈھونڈیں
ls ~/.triggerfish/logs/

# Archive manually بنائیں
tar czf triggerfish-logs.tar.gz ~/.triggerfish/logs/

# Docker
docker cp triggerfish:/data/logs/ ./triggerfish-logs/
tar czf triggerfish-logs.tar.gz triggerfish-logs/
```

## Log Detail بڑھانا

بطور ڈیفالٹ، logs INFO level پر ہیں۔ Bug report کے لیے زیادہ detail capture کرنے کے لیے:

1. Log level verbose یا debug پر set کریں:
   ```bash
   triggerfish config set logging.level verbose
   # یا maximum detail کے لیے:
   triggerfish config set logging.level debug
   ```

2. Issue reproduce کریں

3. Bundle جمع کریں:
   ```bash
   triggerfish logs bundle
   ```

4. Level واپس normal پر set کریں:
   ```bash
   triggerfish config set logging.level normal
   ```

### Log Level Detail

| Level | کیا capture کرتا ہے |
|-------|-----------------|
| `quiet` | صرف Errors |
| `normal` | Errors، warnings، info (ڈیفالٹ) |
| `verbose` | Debug messages add کرتا ہے (tool calls، provider interactions، classification decisions) |
| `debug` | trace-level messages سمیت سب کچھ (raw protocol data، internal state changes) |

**Warning:** `debug` level بہت زیادہ output generate کرتا ہے۔ صرف issue actively reproduce کرتے وقت استعمال کریں، پھر واپس switch کریں۔

## Real Time میں Logs Filter کرنا

Issue reproduce کرتے وقت، آپ live log stream filter کر سکتے ہیں:

```bash
# صرف errors دکھائیں
triggerfish logs --level ERROR

# Warnings اور اس سے اوپر دکھائیں
triggerfish logs --level WARN
```

Linux/macOS پر، یہ filtering کے ساتھ native `tail -f` استعمال کرتا ہے۔ Windows پر، یہ PowerShell `Get-Content -Wait -Tail` استعمال کرتا ہے۔

## Log Format

ہر log line اس format کی پیروی کرتی ہے:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] Gateway WebSocket server started on port 18789
```

- **Timestamp:** ISO 8601 in UTC
- **Level:** ERROR، WARN، INFO، DEBUG، یا TRACE
- **Component:** کون سا module log generate کیا (مثلاً `gateway`، `anthropic`، `telegram`، `policy`)
- **Message:** structured context کے ساتھ log message

## Bug Report میں کیا شامل کریں

Log bundle کے ساتھ، شامل کریں:

1. **Reproduce کرنے کے steps۔** آپ کیا کر رہے تھے جب issue ہوا؟
2. **Expected behavior۔** کیا ہونا چاہیے تھا؟
3. **Actual behavior۔** بجائے اس کے کیا ہوا؟
4. **Platform info۔** OS، architecture، Triggerfish version (`triggerfish version`)
5. **Config excerpt۔** آپ کی `triggerfish.yaml` کا متعلقہ section (secrets redact کریں)

مکمل checklist کے لیے [Issues File کرنا](/ur-PK/support/guides/filing-issues) دیکھیں۔

## Logs میں Sensitive Information

Triggerfish logs میں external data کو `<<` اور `>>` delimiters میں wrap کر کے sanitize کرتا ہے۔ API keys اور tokens کبھی log output میں نہیں آنے چاہئیں۔ تاہم، log bundle submit کرنے سے پہلے:

1. کسی بھی چیز کو scan کریں جو آپ share نہیں کرنا چاہتے (email addresses، file paths، message content)
2. ضرورت ہو تو redact کریں
3. اپنے issue میں note کریں کہ bundle redact کیا گیا ہے

Log files آپ کی conversations کا message content contain کرتی ہیں۔ اگر آپ کی conversations میں sensitive information ہے تو share کرنے سے پہلے ان حصوں کو redact کریں۔
