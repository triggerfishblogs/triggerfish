# Troubleshooting: Configuration

## YAML Parse Errors

### "Configuration parse failed"

May syntax error ang YAML file. Mga karaniwang dahilan:

- **Indentation mismatch.** Sensitibo ang YAML sa whitespace. Gumamit ng spaces, hindi tabs. Bawat nesting level ay dapat eksaktong 2 spaces.
- **Hindi naka-quote ang special characters.** Ang mga values na naglalaman ng `:`, `#`, `{`, `}`, `[`, `]`, o `&` ay kailangang naka-quote.
- **Walang colon pagkatapos ng key.** Bawat key ay nangangailangan ng `: ` (colon na sinusundan ng space).

I-validate ang iyong YAML:

```bash
triggerfish config validate
```

O gumamit ng online YAML validator para mahanap ang eksaktong linya.

### "Configuration file did not parse to an object"

Matagumpay na na-parse ang YAML file pero ang result ay hindi isang YAML mapping (object). Nangyayari ito kung ang file mo ay naglalaman lamang ng scalar value, isang list, o walang laman.

Kailangan ng iyong `triggerfish.yaml` ng top-level mapping. Sa minimum:

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

Hinahanap ng Triggerfish ang config sa mga paths na ito, sunud-sunod:

1. `$TRIGGERFISH_CONFIG` environment variable (kung naka-set)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (kung naka-set ang `TRIGGERFISH_DATA_DIR`)
3. `/data/triggerfish.yaml` (Docker environments)
4. `~/.triggerfish/triggerfish.yaml` (default)

Patakbuhin ang setup wizard para gumawa ng isa:

```bash
triggerfish dive
```

---

## Validation Errors

### "Configuration validation failed"

Ibig sabihin nito ay na-parse ang YAML pero nabigo sa structural validation. Mga specific na mensahe:

**"models is required"** o **"models.primary is required"**

Mandatory ang `models` section. Kailangan mo ng kahit isang primary provider at model:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** o **"primary.model must be non-empty"**

Ang `primary` field ay kailangan may parehong `provider` at `model` na naka-set sa non-empty strings.

**"Invalid classification level"** sa `classification_models`

Ang mga valid levels ay: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. Case-sensitive ang mga ito. Tingnan ang iyong `classification_models` keys.

---

## Secret Reference Errors

### Hindi na-resolve ang secret sa startup

Kung ang config mo ay naglalaman ng `secret:some-key` at hindi umiiral ang key na iyon sa keychain, mag-exit ang daemon na may error tulad ng:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Ayusin:**

```bash
# Tingnan kung anong secrets ang umiiral
triggerfish config get-secret --list

# I-store ang nawawalang secret
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Hindi available ang secret backend

Sa Linux, gumagamit ang secret store ng `secret-tool` (libsecret / GNOME Keyring). Kung hindi available ang Secret Service D-Bus interface (headless servers, minimal containers), makikita mo ang mga errors kapag nagsi-store o nagre-retrieve ng secrets.

**Workaround para sa headless Linux:**

1. Mag-install ng `gnome-keyring` at `libsecret`:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. I-start ang keyring daemon:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. O gamitin ang encrypted file fallback sa pamamagitan ng pag-set ng:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Tandaan: ang memory fallback ay nangangahulugang mawawala ang secrets sa restart. Angkop lamang ito para sa testing.

---

## Mga Isyu sa Config Value

### Boolean coercion

Kapag gumagamit ng `triggerfish config set`, ang string values na `"true"` at `"false"` ay awtomatikong kino-convert sa YAML booleans. Kung kailangan mo talaga ang literal string na `"true"`, direktang i-edit ang YAML file.

Gayundin, ang mga strings na mukhang integers (`"8080"`) ay kino-coerce sa numbers.

### Dotted path syntax

Ang `config set` at `config get` commands ay gumagamit ng dotted paths para mag-navigate sa nested YAML:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Kung ang isang path segment ay naglalaman ng dot, walang escape syntax. Direktang i-edit ang YAML file.

### Secret masking sa `config get`

Kapag nagpa-patakbo ka ng `triggerfish config get` sa key na naglalaman ng "key", "secret", o "token", naka-mask ang output: `****...****` na ang unang at huling 4 na characters lang ang nakikita. Sinadya ito. Gamitin ang `triggerfish config get-secret <key>` para makuha ang actual value.

---

## Config Backups

Gumagawa ang Triggerfish ng timestamped backup sa `~/.triggerfish/backups/` bago ang bawat `config set`, `config add-channel`, o `config add-plugin` operation. Hanggang 10 backups ang pinapanatili.

Para mag-restore ng backup:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Provider Verification

Vine-verify ng setup wizard ang API keys sa pamamagitan ng pagtawag sa model-listing endpoint ng bawat provider (na hindi kumokukunsumo ng tokens). Ang verification endpoints ay:

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

Kung mabigo ang verification, i-double-check:
- Tama at hindi expired ang API key
- Naabot ang endpoint mula sa iyong network
- Para sa local providers (Ollama, LM Studio), talagang tumatakbo ang server

### Hindi nahanap ang model

Kung matagumpay ang verification pero hindi nahanap ang model, magwa-warn ang wizard. Karaniwang ibig sabihin nito ay:

- **Typo sa pangalan ng model.** Tingnan ang docs ng provider para sa eksaktong model IDs.
- **Hindi na-pull ang Ollama model.** Patakbuhin muna ang `ollama pull <model>`.
- **Hindi nili-list ng provider ang model.** Ang ilang providers (Fireworks) ay gumagamit ng iba't ibang naming formats. Nino-normalize ng wizard ang mga karaniwang patterns, pero ang mga hindi karaniwang model IDs ay puwedeng hindi mag-match.
