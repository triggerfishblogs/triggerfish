# Troubleshooting: Configuration

## YAML Parse Errors

### "Configuration parse failed"

YAML file இல் syntax error இருக்கிறது. பொதுவான காரணங்கள்:

- **Indentation mismatch.** YAML whitespace-sensitive. Tabs க்கு பதிலாக spaces பயன்படுத்தவும். ஒவ்வொரு nesting level உம் exactly 2 spaces ஆக இருக்க வேண்டும்.
- **Unquoted special characters.** `:`, `#`, `{`, `}`, `[`, `]`, அல்லது `&` contain செய்யும் values quote செய்ய வேண்டும்.
- **Key க்கு பிறகு colon missing.** ஒவ்வொரு key உம் `: ` (colon followed by a space) தேவை.

YAML validate செய்யவும்:

```bash
triggerfish config validate
```

அல்லது exact line கண்டுபிடிக்க online YAML validator பயன்படுத்தவும்.

### "Configuration file did not parse to an object"

YAML file successfully parsed ஆனது, ஆனால் result YAML mapping (object) இல்லை. File scalar value, list மட்டும் contain செய்தால் அல்லது empty ஆனால் இது நடக்கும்.

உங்கள் `triggerfish.yaml` top-level mapping இருக்க வேண்டும். Minimum:

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

Triggerfish config ஐ இந்த paths இல் order இல் தேடுகிறது:

1. `$TRIGGERFISH_CONFIG` environment variable (set ஆனால்)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (`TRIGGERFISH_DATA_DIR` set ஆனால்)
3. `/data/triggerfish.yaml` (Docker environments)
4. `~/.triggerfish/triggerfish.yaml` (default)

Setup wizard இயக்கி ஒன்று உருவாக்கவும்:

```bash
triggerfish dive
```

---

## Validation Errors

### "Configuration validation failed"

YAML parsed ஆனது, ஆனால் structural validation fail ஆனது. Specific messages:

**"models is required"** அல்லது **"models.primary is required"**

`models` section mandatory. குறைந்தது primary provider மற்றும் model தேவை:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** அல்லது **"primary.model must be non-empty"**

`primary` field இல் `provider` மற்றும் `model` இரண்டும் non-empty strings ஆக set ஆக வேண்டும்.

**`classification_models` இல் "Invalid classification level"**

Valid levels: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. இவை case-sensitive. உங்கள் `classification_models` keys சரிபார்க்கவும்.

---

## Secret Reference Errors

### Startup போது Secret resolve ஆகவில்லை

Config `secret:some-key` contain செய்து அந்த key keychain இல் இல்லையென்றால், daemon இந்த error உடன் exit ஆகும்:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Fix:**

```bash
# என்ன secrets exist என்று list செய்யவும்
triggerfish config get-secret --list

# Missing secret store செய்யவும்
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Secret backend available இல்லை

Linux இல், secret store `secret-tool` (libsecret / GNOME Keyring) பயன்படுத்துகிறது. Secret Service D-Bus interface available இல்லையென்றால் (headless servers, minimal containers), secrets store அல்லது retrieve செய்யும்போது errors பார்ப்பீர்கள்.

**Headless Linux க்கு Workaround:**

1. `gnome-keyring` மற்றும் `libsecret` install செய்யவும்:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Keyring daemon start செய்யவும்:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. அல்லது encrypted file fallback பயன்படுத்தவும்:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Note: memory fallback என்றால் restart ஆனால் secrets இழக்கப்படும். Testing மட்டும் suitable.

---

## Config Value Issues

### Boolean coercion

`triggerfish config set` பயன்படுத்தும்போது, `"true"` மற்றும் `"false"` string values automatically YAML booleans ஆக convert ஆகின்றன. Literal string `"true"` தேவையென்றால், YAML file directly edit செய்யவும்.

Similarly, integers போல் தெரியும் strings (`"8080"`) numbers ஆக coerce ஆகின்றன.

### Dotted path syntax

`config set` மற்றும் `config get` commands nested YAML navigate செய்ய dotted paths பயன்படுத்துகின்றன:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Path segment இல் dot இருந்தால், escape syntax இல்லை. YAML file directly edit செய்யவும்.

### `config get` இல் Secret masking

"key", "secret", அல்லது "token" contain செய்யும் key இல் `triggerfish config get` இயக்கும்போது, output masked ஆகும்: முதல் மற்றும் கடைசி 4 characters மட்டும் visible ஆக `****...****`. இது intentional. Actual value retrieve செய்ய `triggerfish config get-secret <key>` பயன்படுத்தவும்.

---

## Config Backups

ஒவ்வொரு `config set`, `config add-channel`, அல்லது `config add-plugin` operation க்கு முன்பும் Triggerfish `~/.triggerfish/backups/` இல் timestamped backup உருவாக்குகிறது. Up to 10 backups retained ஆகின்றன.

Backup restore செய்ய:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Provider Verification

Setup wizard tokens consume செய்யாமல் ஒவ்வொரு provider இன் model-listing endpoint call செய்து API keys verify செய்கிறது. Verification endpoints:

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

Verification fail ஆனால் சரிபார்க்கவும்:
- API key correct மற்றும் expired ஆகவில்லை
- Endpoint உங்கள் network இலிருந்து reachable
- Local providers க்கு (Ollama, LM Studio), server actually running ஆகிறதா

### Model கண்டுபிடிக்கப்படவில்லை

Verification succeed ஆனாலும் model கண்டுபிடிக்கப்படவில்லையென்றால், wizard warn செய்கிறது. இது பொதுவாக:

- **Model name இல் typo.** Exact model IDs க்கு provider இன் docs சரிபார்க்கவும்.
- **Ollama model pull ஆகவில்லை.** முதலில் `ollama pull <model>` இயக்கவும்.
- **Provider model list செய்வதில்லை.** சில providers (Fireworks) different naming formats பயன்படுத்துகின்றன. Wizard common patterns normalize செய்கிறது, ஆனால் unusual model IDs match ஆகாமல் போகலாம்.
