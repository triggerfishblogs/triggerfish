# Troubleshooting: Configuration

## YAML Parse Errors

### "Configuration parse failed"

The YAML file has a syntax error. Common causes:

- **Indentation mismatch.** YAML is whitespace-sensitive. Use spaces, not tabs. Each nesting level should be exactly 2 spaces.
- **Unquoted special characters.** Values containing `:`, `#`, `{`, `}`, `[`, `]`, or `&` must be quoted.
- **Missing colon after key.** Every key needs a `: ` (colon followed by a space).

Validate your YAML:

```bash
triggerfish config validate
```

Or use an online YAML validator to find the exact line.

### "Configuration file did not parse to an object"

The YAML file parsed successfully but the result is not a YAML mapping (object). This happens if your file contains only a scalar value, a list, or is empty.

Your `triggerfish.yaml` must have a top-level mapping. At minimum:

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

Triggerfish looks for config at these paths, in order:

1. `$TRIGGERFISH_CONFIG` environment variable (if set)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (if `TRIGGERFISH_DATA_DIR` is set)
3. `/data/triggerfish.yaml` (Docker environments)
4. `~/.triggerfish/triggerfish.yaml` (default)

Run the setup wizard to create one:

```bash
triggerfish dive
```

---

## Validation Errors

### "Configuration validation failed"

This means the YAML parsed but failed structural validation. Specific messages:

**"models is required"** or **"models.primary is required"**

The `models` section is mandatory. You need at least a primary provider and model:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** or **"primary.model must be non-empty"**

The `primary` field must have both `provider` and `model` set to non-empty strings.

**"Invalid classification level"** in `classification_models`

Valid levels are: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. These are case-sensitive. Check your `classification_models` keys.

---

## Secret Reference Errors

### Secret not resolved at startup

If your config contains `secret:some-key` and that key does not exist in the keychain, the daemon exits with an error like:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Fix:**

```bash
# List what secrets exist
triggerfish config get-secret --list

# Store the missing secret
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Secret backend not available

On Linux, the secret store uses `secret-tool` (libsecret / GNOME Keyring). If the Secret Service D-Bus interface is not available (headless servers, minimal containers), you will see errors when storing or retrieving secrets.

**Workaround for headless Linux:**

1. Install `gnome-keyring` and `libsecret`:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Start the keyring daemon:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. Or use the encrypted file fallback by setting:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Note: memory fallback means secrets are lost on restart. It is only suitable for testing.

---

## Config Value Issues

### Boolean coercion

When using `triggerfish config set`, string values `"true"` and `"false"` are automatically converted to YAML booleans. If you actually need the literal string `"true"`, edit the YAML file directly.

Similarly, strings that look like integers (`"8080"`) are coerced to numbers.

### Dotted path syntax

The `config set` and `config get` commands use dotted paths to navigate nested YAML:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

If a path segment contains a dot, there is no escape syntax. Edit the YAML file directly.

### Secret masking in `config get`

When you run `triggerfish config get` on a key containing "key", "secret", or "token", the output is masked: `****...****` with only the first and last 4 characters visible. This is intentional. Use `triggerfish config get-secret <key>` to retrieve the actual value.

---

## Config Backups

Triggerfish creates a timestamped backup in `~/.triggerfish/backups/` before every `config set`, `config add-channel`, or `config add-plugin` operation. Up to 10 backups are retained.

To restore a backup:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Provider Verification

The setup wizard verifies API keys by calling each provider's model-listing endpoint (which does not consume tokens). The verification endpoints are:

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

If verification fails, double-check:
- The API key is correct and not expired
- The endpoint is reachable from your network
- For local providers (Ollama, LM Studio), the server is actually running

### Model not found

If verification succeeds but the model is not found, the wizard warns you. This usually means:

- **Typo in the model name.** Check the provider's docs for exact model IDs.
- **Ollama model not pulled.** Run `ollama pull <model>` first.
- **Provider does not list the model.** Some providers (Fireworks) use different naming formats. The wizard normalizes common patterns, but unusual model IDs may not match.
