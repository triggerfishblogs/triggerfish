# समस्या निवारण: Daemon

## Daemon शुरू नहीं होगा

### "Triggerfish is already running"

यह संदेश तब दिखाई देता है जब log फ़ाइल किसी अन्य process द्वारा lock है। Windows पर, यह `EBUSY` / "os error 32" के माध्यम से detect होता है जब file writer log फ़ाइल खोलने का प्रयास करता है।

**समाधान:**

```bash
triggerfish status    # जाँचें कि क्या वास्तव में कोई चल रहा instance है
triggerfish stop      # मौजूदा instance को रोकें
triggerfish start     # नए सिरे से शुरू करें
```

यदि `triggerfish status` रिपोर्ट करता है कि daemon नहीं चल रहा है लेकिन फिर भी आपको यह error मिलता है, तो कोई अन्य process log फ़ाइल को खुला रखे हुए है। Zombie processes की जाँच करें:

```bash
# Linux
ps aux | grep triggerfish

# macOS
ps aux | grep triggerfish

# Windows
tasklist | findstr triggerfish
```

किसी भी stale process को kill करें, फिर पुनः प्रयास करें।

### Port 18789 या 18790 पहले से उपयोग में

Gateway port 18789 (WebSocket) पर और Tidepool port 18790 (A2UI) पर listen करता है। यदि कोई अन्य application इन ports पर कब्ज़ा करता है, तो daemon शुरू होने में विफल होगा।

**पता करें कि port का उपयोग कौन कर रहा है:**

```bash
# Linux
ss -tlnp | grep 18789

# macOS
lsof -i :18789

# Windows
netstat -ano | findstr 18789
```

### कोई LLM provider कॉन्फ़िगर नहीं

यदि `triggerfish.yaml` में `models` section गायब है या primary provider की कोई API key नहीं है, तो gateway log करता है:

```
No LLM provider configured. Check triggerfish.yaml.
```

**समाधान:** Setup wizard चलाएँ या मैन्युअल रूप से कॉन्फ़िगर करें:

```bash
triggerfish dive                    # Interactive setup
# या
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-20250514
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Config फ़ाइल नहीं मिली

यदि `triggerfish.yaml` अपेक्षित path पर मौजूद नहीं है तो daemon बाहर निकल जाता है। Error message environment के अनुसार भिन्न होता है:

- **Native install:** `triggerfish dive` चलाने का सुझाव देता है
- **Docker:** `-v ./triggerfish.yaml:/data/triggerfish.yaml` के साथ config फ़ाइल mount करने का सुझाव देता है

Path जाँचें:

```bash
ls ~/.triggerfish/triggerfish.yaml      # Native
docker exec triggerfish ls /data/       # Docker
```

### Secret resolution विफल

यदि आपका config किसी ऐसे secret (`secret:provider:anthropic:apiKey`) को reference करता है जो keychain में मौजूद नहीं है, तो daemon गायब secret का नाम बताते हुए error के साथ बाहर निकलता है।

**समाधान:**

```bash
triggerfish config set-secret provider:anthropic:apiKey <your-key>
```

---

## Service प्रबंधन

### systemd: logout के बाद daemon रुक जाता है

डिफ़ॉल्ट रूप से, systemd user services उपयोगकर्ता के logout करने पर रुक जाती हैं। Triggerfish इसे रोकने के लिए स्थापना के दौरान `loginctl enable-linger` सक्षम करता है। यदि linger सक्षम होने में विफल रहा:

```bash
# Linger स्थिति जाँचें
loginctl show-user $USER | grep Linger

# इसे सक्षम करें (sudo आवश्यक हो सकता है)
sudo loginctl enable-linger $USER
```

Linger के बिना, daemon केवल तभी चलता है जब आप logged in होते हैं।

### systemd: service शुरू होने में विफल

Service status और journal जाँचें:

```bash
systemctl --user status triggerfish.service
journalctl --user -u triggerfish.service --no-pager -n 50
```

सामान्य कारण:
- **Binary स्थानांतरित या हटा दी गई।** Unit file में binary का hardcoded path है। Daemon पुनः स्थापित करें: `triggerfish dive --install-daemon`
- **PATH समस्याएँ।** Systemd unit install time पर आपका PATH capture करती है। यदि आपने daemon स्थापना के बाद नए tools (जैसे MCP servers) स्थापित किए, तो PATH अपडेट करने के लिए daemon पुनः स्थापित करें।
- **DENO_DIR सेट नहीं।** Systemd unit `DENO_DIR=~/.cache/deno` सेट करती है। यदि यह directory writable नहीं है, तो SQLite FFI plugins load होने में विफल होंगे।

### launchd: login पर daemon शुरू नहीं हो रहा

Plist status जाँचें:

```bash
launchctl list | grep triggerfish
launchctl print gui/$(id -u)/dev.triggerfish.agent
```

यदि plist loaded नहीं है:

```bash
launchctl load ~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

सामान्य कारण:
- **Plist हटा दी गई या corrupt हो गई।** पुनः स्थापित करें: `triggerfish dive --install-daemon`
- **Binary स्थानांतरित हुई।** Plist में hardcoded path है। Binary स्थानांतरित करने के बाद पुनः स्थापित करें।
- **Install time पर PATH।** Systemd की तरह, launchd plist बनाते समय PATH capture करता है। यदि आपने PATH में नए tools जोड़े हैं तो पुनः स्थापित करें।

### Windows: service शुरू नहीं होती

Service status जाँचें:

```powershell
sc query Triggerfish
Get-Service Triggerfish
```

सामान्य कारण:
- **Service स्थापित नहीं है।** पुनः स्थापित करें: installer को Administrator के रूप में चलाएँ।
- **Binary path बदल गया।** Service wrapper में hardcoded path है। पुनः स्थापित करें।
- **.NET compilation install के दौरान विफल।** C# service wrapper को .NET Framework 4.x `csc.exe` की आवश्यकता है।

### Upgrade daemon को तोड़ देता है

`triggerfish update` चलाने के बाद, daemon स्वचालित रूप से पुनः आरंभ होता है। यदि ऐसा नहीं होता:

1. पुरानी binary अभी भी चल रही हो सकती है। इसे मैन्युअल रूप से रोकें: `triggerfish stop`
2. Windows पर, पुरानी binary को `.old` नाम दिया जाता है। यदि rename विफल होता है, तो update error देगा। पहले service रोकें, फिर update करें।

---

## Log फ़ाइल समस्याएँ

### Log फ़ाइल खाली है

Daemon `~/.triggerfish/logs/triggerfish.log` में लिखता है। यदि फ़ाइल मौजूद है लेकिन खाली है:

- Daemon अभी शुरू हुआ हो सकता है। एक क्षण प्रतीक्षा करें।
- Log level `quiet` पर सेट है, जो केवल ERROR-level संदेश log करता है। इसे `normal` या `verbose` पर सेट करें:

```bash
triggerfish config set logging.level normal
```

### Logs बहुत शोर वाले हैं

केवल errors देखने के लिए log level को `quiet` पर सेट करें:

```bash
triggerfish config set logging.level quiet
```

Level mapping:

| Config value | न्यूनतम logged level |
|-------------|---------------------|
| `quiet` | केवल ERROR |
| `normal` | INFO और ऊपर |
| `verbose` | DEBUG और ऊपर |
| `debug` | TRACE और ऊपर (सब कुछ) |

### Log rotation

Logs स्वचालित रूप से rotate होते हैं जब वर्तमान फ़ाइल 1 MB से अधिक हो जाती है। अधिकतम 10 rotated फ़ाइलें रखी जाती हैं:

```
triggerfish.log        # वर्तमान
triggerfish.1.log      # सबसे हाल का backup
triggerfish.2.log      # दूसरा सबसे हाल का
...
triggerfish.10.log     # सबसे पुरानी (नई rotation होने पर हटा दी जाती है)
```

कोई समय-आधारित rotation नहीं है, केवल आकार-आधारित।
