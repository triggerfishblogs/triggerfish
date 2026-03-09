# समस्या निवारण: स्थापना

## Binary Installer समस्याएँ

### Checksum verification विफल

Installer binary के साथ एक `SHA256SUMS.txt` फ़ाइल डाउनलोड करता है और स्थापना से पहले hash की पुष्टि करता है। यदि यह विफल होता है:

- **Network ने download को बाधित किया।** आंशिक download हटाएँ और पुनः प्रयास करें।
- **Mirror या CDN ने पुरानी सामग्री प्रदान की।** कुछ मिनट प्रतीक्षा करें और पुनः प्रयास करें। Installer GitHub Releases से fetch करता है।
- **SHA256SUMS.txt में asset नहीं मिला।** इसका अर्थ है कि release आपके platform के लिए checksum के बिना प्रकाशित हुई थी। एक [GitHub issue](https://github.com/greghavens/triggerfish/issues) दर्ज करें।

Installer Linux पर `sha256sum` और macOS पर `shasum -a 256` का उपयोग करता है। यदि दोनों में से कोई उपलब्ध नहीं है, तो यह download की पुष्टि नहीं कर सकता।

### `/usr/local/bin` में लिखने की अनुमति नहीं

Installer पहले `/usr/local/bin` का प्रयास करता है, फिर `~/.local/bin` पर वापस आता है। यदि दोनों काम नहीं करते:

```bash
# विकल्प 1: system-wide install के लिए sudo के साथ चलाएँ
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# विकल्प 2: ~/.local/bin बनाएँ और PATH में जोड़ें
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# फिर installer पुनः चलाएँ
```

### macOS quarantine चेतावनी

macOS इंटरनेट से डाउनलोड की गई binaries को block करता है। Installer quarantine attribute को साफ़ करने के लिए `xattr -cr` चलाता है, लेकिन यदि आपने binary मैन्युअल रूप से डाउनलोड की है, तो चलाएँ:

```bash
xattr -cr /usr/local/bin/triggerfish
```

या Finder में binary पर right-click करें, "Open" चुनें, और security prompt की पुष्टि करें।

### Install के बाद PATH अपडेट नहीं हुआ

Installer install directory को आपके shell profile (`.zshrc`, `.bashrc`, या `.bash_profile`) में जोड़ता है। यदि स्थापना के बाद `triggerfish` command नहीं मिलता:

1. एक नई terminal window खोलें (वर्तमान shell profile परिवर्तन नहीं उठाएगा)
2. या अपनी profile को मैन्युअल रूप से source करें: `source ~/.zshrc` (या जो भी profile फ़ाइल आपका shell उपयोग करता है)

यदि installer ने PATH अपडेट छोड़ दिया, तो इसका अर्थ है कि install directory पहले से आपके PATH में थी।

---

## Source से Build करना

### Deno नहीं मिला

From-source installer (`deploy/scripts/install-from-source.sh`) Deno को स्वचालित रूप से स्थापित करता है यदि यह मौजूद नहीं है। यदि वह विफल होता है:

```bash
# Deno मैन्युअल रूप से स्थापित करें
curl -fsSL https://deno.land/install.sh | sh

# सत्यापित करें
deno --version   # 2.x होना चाहिए
```

### अनुमति errors के साथ Compile विफल

`deno compile` command को `--allow-all` की आवश्यकता है क्योंकि compiled binary को पूर्ण system access (network, filesystem, SQLite के लिए FFI, subprocess spawning) की आवश्यकता होती है। यदि आपको compilation के दौरान अनुमति errors दिखते हैं, तो सुनिश्चित करें कि आप install script को target directory तक write access वाले user के रूप में चला रहे हैं।

### विशिष्ट branch या version

किसी विशिष्ट branch को clone करने के लिए `TRIGGERFISH_BRANCH` सेट करें:

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

Binary installer के लिए, `TRIGGERFISH_VERSION` सेट करें:

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows-विशिष्ट समस्याएँ

### PowerShell execution policy installer को block करती है

PowerShell को Administrator के रूप में चलाएँ और script execution की अनुमति दें:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

फिर installer पुनः चलाएँ।

### Windows Service compilation विफल

Windows installer .NET Framework 4.x के `csc.exe` का उपयोग करके एक C# service wrapper on the fly compile करता है। यदि compilation विफल होता है:

1. **सत्यापित करें कि .NET Framework स्थापित है।** Command prompt में `where csc.exe` चलाएँ। Installer `%WINDIR%\Microsoft.NET\Framework64\` के अंतर्गत .NET Framework directory में देखता है।
2. **Administrator के रूप में चलाएँ।** Service स्थापना के लिए elevated privileges आवश्यक हैं।
3. **Fallback।** यदि service compilation विफल होती है, तो आप अभी भी Triggerfish को मैन्युअल रूप से चला सकते हैं: `triggerfish run` (foreground mode)। आपको terminal खुला रखना होगा।

### Upgrade के दौरान `Move-Item` विफल

Windows installer के पुराने संस्करण `Move-Item -Force` का उपयोग करते थे जो target binary उपयोग में होने पर विफल हो जाता है। यह version 0.3.4+ में ठीक कर दिया गया था। यदि आप किसी पुराने version पर इस समस्या का सामना करते हैं, तो पहले service को मैन्युअल रूप से रोकें:

```powershell
Stop-Service Triggerfish
# फिर installer पुनः चलाएँ
```

---

## Docker समस्याएँ

### Container तुरंत बाहर निकल जाता है

Container logs जाँचें:

```bash
docker logs triggerfish
```

सामान्य कारण:

- **Config फ़ाइल गायब है।** अपनी `triggerfish.yaml` को `/data/` में mount करें:
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **Port conflict।** यदि port 18789 या 18790 उपयोग में है, तो gateway शुरू नहीं हो सकता।
- **Volume पर अनुमति नहीं।** Container UID 65534 (nonroot) के रूप में चलता है। सुनिश्चित करें कि volume उस user द्वारा writable है।

### Host से Triggerfish तक पहुँच नहीं

Gateway डिफ़ॉल्ट रूप से container के अंदर `127.0.0.1` से bind होता है। Host से इसे एक्सेस करने के लिए, Docker compose file ports `18789` और `18790` को map करती है। यदि आप सीधे `docker run` का उपयोग कर रहे हैं, तो जोड़ें:

```bash
-p 18789:18789 -p 18790:18790
```

### Docker के बजाय Podman

Docker install script स्वचालित रूप से `podman` को container runtime के रूप में detect करता है। आप इसे स्पष्ट रूप से भी सेट कर सकते हैं:

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

`triggerfish` wrapper script (Docker installer द्वारा स्थापित) भी स्वचालित रूप से podman detect करता है।

### Custom image या registry

`TRIGGERFISH_IMAGE` से image override करें:

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## स्थापना के बाद

### Setup wizard शुरू नहीं होता

Binary स्थापना के बाद, installer setup wizard लॉन्च करने के लिए `triggerfish dive --install-daemon` चलाता है। यदि यह शुरू नहीं होता:

1. इसे मैन्युअल रूप से चलाएँ: `triggerfish dive`
2. यदि आपको "Terminal requirement not met" दिखता है, तो wizard को एक interactive TTY की आवश्यकता है। SSH sessions, CI pipelines, और piped input काम नहीं करेंगे। इसके बजाय `triggerfish.yaml` को मैन्युअल रूप से कॉन्फ़िगर करें।

### Signal channel auto-install विफल

Signal को `signal-cli` की आवश्यकता है, जो एक Java application है। Auto-installer एक pre-built `signal-cli` binary और JRE 25 runtime डाउनलोड करता है। विफलताएँ हो सकती हैं यदि:

- **Install directory में write access नहीं है।** `~/.triggerfish/signal-cli/` पर permissions जाँचें।
- **JRE download विफल।** Installer Adoptium से fetch करता है। Network restrictions या corporate proxies इसे block कर सकते हैं।
- **Architecture समर्थित नहीं है।** JRE auto-install केवल x64 और aarch64 का समर्थन करता है।

यदि auto-install विफल होता है, तो `signal-cli` को मैन्युअल रूप से स्थापित करें और सुनिश्चित करें कि यह आपके PATH में है। मैन्युअल setup चरणों के लिए [Signal channel docs](/channels/signal) देखें।
