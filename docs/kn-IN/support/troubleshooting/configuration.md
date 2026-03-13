# Troubleshooting: Configuration

## YAML Parse Errors

### "Configuration parse failed"

YAML file ನಲ್ಲಿ syntax error ಇದೆ. ಸಾಮಾನ್ಯ ಕಾರಣಗಳು:

- **Indentation mismatch.** YAML whitespace-sensitive. Tabs ಅಲ್ಲ, spaces ಬಳಸಿ. ಪ್ರತಿ nesting level ಸಂಪೂರ್ಣ 2 spaces ಇರಬೇಕು.
- **Unquoted special characters.** `:`, `#`, `{`, `}`, `[`, `]`, ಅಥವಾ `&` ಒಳಗೊಂಡ values quote ಮಾಡಬೇಕು.
- **Key ನಂತರ colon missing.** ಪ್ರತಿ key ಗೆ `: ` (colon ನಂತರ space) ಅಗತ್ಯ.

ನಿಮ್ಮ YAML validate ಮಾಡಿ:

```bash
triggerfish config validate
```

ಅಥವಾ exact line ಕಂಡುಹಿಡಿಯಲು online YAML validator ಬಳಸಿ.

### "Configuration file did not parse to an object"

YAML file successfully parse ಆಯಿತು ಆದರೆ result YAML mapping (object) ಅಲ್ಲ. File ಕೇವಲ scalar value, list, ಅಥವಾ empty ಆಗಿದ್ದರೆ ಇದು ಆಗುತ್ತದೆ.

ನಿಮ್ಮ `triggerfish.yaml` top-level mapping ಹೊಂದಿರಬೇಕು. ಕನಿಷ್ಠ:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### "Configuration file not found"

Triggerfish ಈ paths ನಲ್ಲಿ, ಕ್ರಮದಲ್ಲಿ config ಹುಡುಕುತ್ತದೆ:

1. `$TRIGGERFISH_CONFIG` environment variable (set ಆಗಿದ್ದರೆ)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (`TRIGGERFISH_DATA_DIR` set ಆಗಿದ್ದರೆ)
3. `/data/triggerfish.yaml` (Docker environments)
4. `~/.triggerfish/triggerfish.yaml` (default)

Create ಮಾಡಲು setup wizard ಚಲಾಯಿಸಿ:

```bash
triggerfish dive
```

---

## Validation Errors

### "Configuration validation failed"

YAML parse ಆಯಿತು ಆದರೆ structural validation fail ಆಯಿತು. Specific messages:

**"models is required"** ಅಥವಾ **"models.primary is required"**

`models` section mandatory. ಕನಿಷ್ಠ primary provider ಮತ್ತು model ಅಗತ್ಯ:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** ಅಥವಾ **"primary.model must be non-empty"**

`primary` field ಗೆ `provider` ಮತ್ತು `model` ಎರಡೂ non-empty strings ಆಗಿ set ಮಾಡಬೇಕು.

**`classification_models` ನಲ್ಲಿ "Invalid classification level"**

Valid levels: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. ಇವು case-sensitive. ನಿಮ್ಮ `classification_models` keys check ಮಾಡಿ.

---

## Secret Reference Errors

### Startup ನಲ್ಲಿ Secret resolve ಆಗಲಿಲ್ಲ

ನಿಮ್ಮ config `secret:some-key` ಒಳಗೊಂಡಿದ್ದು ಆ key keychain ನಲ್ಲಿ exist ಮಾಡದಿದ್ದರೆ, daemon error ಜೊತೆ exit ಮಾಡುತ್ತದೆ:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Fix:**

```bash
# ಯಾವ secrets exist ಮಾಡುತ್ತವೆ ಎಂದು list ಮಾಡಿ
triggerfish config get-secret --list

# Missing secret store ಮಾಡಿ
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Secret backend available ಅಲ್ಲ

Linux ನಲ್ಲಿ, secret store `secret-tool` (libsecret / GNOME Keyring) ಬಳಸುತ್ತದೆ. Secret Service D-Bus interface available ಇಲ್ಲದಿದ್ದರೆ (headless servers, minimal containers), secrets store ಅಥವಾ retrieve ಮಾಡುವಾಗ errors ಕಾಣಿಸುತ್ತವೆ.

**Headless Linux ಗಾಗಿ Workaround:**

1. `gnome-keyring` ಮತ್ತು `libsecret` install ಮಾಡಿ:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Keyring daemon start ಮಾಡಿ:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. ಅಥವಾ encrypted file fallback ಬಳಸಿ:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Note: memory fallback ಅಂದರೆ restart ನಲ್ಲಿ secrets ಕಳೆದುಹೋಗುತ್ತವೆ. Testing ಗಾಗಿ ಮಾತ್ರ suitable.

---

## Config Value Issues

### Boolean coercion

`triggerfish config set` ಬಳಸುವಾಗ, string values `"true"` ಮತ್ತು `"false"` automatically YAML booleans ಗೆ convert ಆಗುತ್ತವೆ. ನಿಜವಾಗಿ literal string `"true"` ಅಗತ್ಯವಿದ್ದರೆ, YAML file directly edit ಮಾಡಿ.

ಅದೇ ರೀತಿ, integers ನಂತೆ ಕಾಣಿಸುವ strings (`"8080"`) numbers ಗೆ coerce ಆಗುತ್ತವೆ.

### Dotted path syntax

`config set` ಮತ್ತು `config get` commands nested YAML navigate ಮಾಡಲು dotted paths ಬಳಸುತ್ತವೆ:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Path segment ಒಂದು dot ಒಳಗೊಂಡಿದ್ದರೆ, escape syntax ಇಲ್ಲ. YAML file directly edit ಮಾಡಿ.

### `config get` ನಲ್ಲಿ Secret masking

"key", "secret", ಅಥವಾ "token" ಒಳಗೊಂಡ key ಮೇಲೆ `triggerfish config get` ಚಲಾಯಿಸಿದಾಗ, output mask ಆಗುತ್ತದೆ: `****...****` ಮೊದಲ ಮತ್ತು ಕೊನೆಯ 4 characters ಮಾತ್ರ visible. ಇದು intentional. Actual value retrieve ಮಾಡಲು `triggerfish config get-secret <key>` ಬಳಸಿ.

---

## Config Backups

Triggerfish ಪ್ರತಿ `config set`, `config add-channel`, ಅಥವಾ `config add-plugin` operation ಮೊದಲು `~/.triggerfish/backups/` ನಲ್ಲಿ timestamped backup create ಮಾಡುತ್ತದೆ. 10 backups ತನಕ ಉಳಿಸಲಾಗುತ್ತದೆ.

Backup restore ಮಾಡಲು:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Provider Verification

Setup wizard ಪ್ರತಿ provider ನ model-listing endpoint call ಮಾಡಿ API keys verify ಮಾಡುತ್ತದೆ (tokens consume ಮಾಡುವುದಿಲ್ಲ). Verification endpoints:

| Provider | Endpoint |
|----------|----------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

Verification fail ಆದರೆ:
- API key correct ಮತ್ತು expire ಆಗದ ಎಂದು double-check ಮಾಡಿ
- ನಿಮ್ಮ network ನಿಂದ endpoint reachable ಇದೆ ಎಂದು ಖಾತ್ರಿಪಡಿಸಿ
- Local providers (Ollama, LM Studio) ಗಾಗಿ, server ಚಲಿಸುತ್ತಿದೆ ಎಂದು verify ಮಾಡಿ

### Model ಕಂಡುಹಿಡಿಯಲಿಲ್ಲ

Verification succeed ಆದರೆ model ಕಂಡುಹಿಡಿಯಲಿಲ್ಲ ಎಂದರೆ wizard warn ಮಾಡುತ್ತದೆ. ಇದು ಸಾಮಾನ್ಯವಾಗಿ ಅರ್ಥ:

- **Model name ನಲ್ಲಿ typo.** Exact model IDs ಗಾಗಿ provider ನ docs check ಮಾಡಿ.
- **Ollama model pull ಮಾಡಲಾಗಿಲ್ಲ.** ಮೊದಲು `ollama pull <model>` ಚಲಾಯಿಸಿ.
- **Provider model list ಮಾಡುತ್ತಿಲ್ಲ.** ಕೆಲವು providers (Fireworks) different naming formats ಬಳಸುತ್ತವೆ. Wizard common patterns normalize ಮಾಡುತ್ತದೆ, ಆದರೆ unusual model IDs match ಆಗದಿರಬಹುದು.
