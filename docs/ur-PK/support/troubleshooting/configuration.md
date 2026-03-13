# Troubleshooting: Configuration

## YAML Parse Errors

### "Configuration parse failed"

YAML file میں syntax error ہے۔ عام وجوہات:

- **Indentation mismatch۔** YAML whitespace-sensitive ہے۔ Spaces استعمال کریں، tabs نہیں۔ ہر nesting level بالکل 2 spaces ہونے چاہئیں۔
- **Unquoted special characters۔** `:` ، `#` ، `{` ، `}` ، `[` ، `]` ، یا `&` پر مشتمل values کو quote کیا جانا چاہیے۔
- **Key کے بعد colon missing۔** ہر key کو `: ` (colon followed by a space) چاہیے۔

اپنا YAML validate کریں:

```bash
triggerfish config validate
```

یا exact line ڈھونڈنے کے لیے online YAML validator استعمال کریں۔

### "Configuration file did not parse to an object"

YAML file successfully parse ہوئی لیکن result YAML mapping (object) نہیں ہے۔ یہ تب ہوتا ہے جب آپ کی file صرف scalar value، list، یا empty ہو۔

آپ کی `triggerfish.yaml` میں top-level mapping ہونی چاہیے۔ کم از کم:

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

Triggerfish config ان paths پر order میں دیکھتا ہے:

1. `$TRIGGERFISH_CONFIG` environment variable (اگر set ہو)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (اگر `TRIGGERFISH_DATA_DIR` set ہو)
3. `/data/triggerfish.yaml` (Docker environments)
4. `~/.triggerfish/triggerfish.yaml` (ڈیفالٹ)

ایک بنانے کے لیے setup wizard چلائیں:

```bash
triggerfish dive
```

---

## Validation Errors

### "Configuration validation failed"

اس کا مطلب ہے YAML parse ہوئی لیکن structural validation fail ہوئی۔ مخصوص messages:

**"models is required"** یا **"models.primary is required"**

`models` section mandatory ہے۔ آپ کو کم از کم primary provider اور model چاہیے:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** یا **"primary.model must be non-empty"**

`primary` field میں `provider` اور `model` دونوں non-empty strings پر set ہونے چاہئیں۔

**"Invalid classification level"** in `classification_models`

Valid levels ہیں: `RESTRICTED`، `CONFIDENTIAL`، `INTERNAL`، `PUBLIC`۔ یہ case-sensitive ہیں۔ اپنے `classification_models` keys check کریں۔

---

## Secret Reference Errors

### Startup پر Secret resolve نہیں ہوا

اگر آپ کا config `secret:some-key` contain کرے اور وہ key keychain میں موجود نہ ہو تو daemon error کے ساتھ exit ہوتا ہے:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Fix:**

```bash
# کون سے secrets موجود ہیں list کریں
triggerfish config get-secret --list

# Missing secret store کریں
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Secret backend دستیاب نہیں

Linux پر، secret store `secret-tool` (libsecret / GNOME Keyring) استعمال کرتا ہے۔ اگر Secret Service D-Bus interface دستیاب نہ ہو (headless servers، minimal containers) تو secrets store یا retrieve کرتے وقت errors آئیں گے۔

**Headless Linux کے لیے workaround:**

1. `gnome-keyring` اور `libsecret` install کریں:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Keyring daemon start کریں:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. یا encrypted file fallback استعمال کریں:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Note: memory fallback کا مطلب ہے secrets restart پر ضائع ہو جاتے ہیں۔ یہ صرف testing کے لیے suitable ہے۔

---

## Config Value Issues

### Boolean coercion

`triggerfish config set` استعمال کرتے وقت، string values `"true"` اور `"false"` خود بخود YAML booleans میں convert ہو جاتی ہیں۔ اگر آپ کو literal string `"true"` چاہیے تو YAML file براہ راست edit کریں۔

اسی طرح، integers جیسی strings (`"8080"`) numbers میں coerce ہوتی ہیں۔

### Dotted path syntax

`config set` اور `config get` commands nested YAML navigate کرنے کے لیے dotted paths استعمال کرتے ہیں:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

اگر کوئی path segment dot contain کرے تو کوئی escape syntax نہیں۔ YAML file براہ راست edit کریں۔

### `config get` میں Secret masking

جب آپ "key"، "secret"، یا "token" پر مشتمل key پر `triggerfish config get` چلائیں تو output masked ہوتا ہے: `****...****` صرف پہلے اور آخری 4 characters visible کے ساتھ۔ یہ intentional ہے۔ Actual value retrieve کرنے کے لیے `triggerfish config get-secret <key>` استعمال کریں۔

---

## Config Backups

Triggerfish ہر `config set`، `config add-channel`، یا `config add-plugin` operation سے پہلے `~/.triggerfish/backups/` میں timestamped backup بناتا ہے۔ زیادہ سے زیادہ 10 backups رکھی جاتی ہیں۔

Backup restore کرنے کے لیے:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Provider Verification

Setup wizard ہر provider کے model-listing endpoint کو call کر کے API keys verify کرتا ہے (جو tokens consume نہیں کرتا)۔ Verification endpoints ہیں:

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

اگر verification fail ہو تو double-check کریں:
- API key correct ہے اور expire نہیں ہوئی
- Endpoint آپ کے network سے reachable ہے
- Local providers (Ollama، LM Studio) کے لیے، server چل رہا ہو

### Model نہیں ملا

اگر verification succeed ہو لیکن model نہ ملے تو wizard آپ کو warn کرتا ہے۔ یہ عموماً مطلب ہے:

- **Model name میں typo۔** Exact model IDs کے لیے provider کی docs check کریں۔
- **Ollama model pull نہیں کیا۔** پہلے `ollama pull <model>` چلائیں۔
- **Provider model list نہیں کرتا۔** کچھ providers (Fireworks) مختلف naming formats استعمال کرتے ہیں۔ Wizard عام patterns normalize کرتا ہے، لیکن unusual model IDs match نہ ہوں۔
