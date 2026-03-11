# Paano Mag-file ng Magandang Issue

Ang isang maayos na nakabalangkas na issue ay mas mabilis na nare-resolve. Ang vague na issue na walang logs at walang reproduction steps ay kadalasang nakatambay nang matagal dahil walang makakilos dito. Narito ang dapat isama.

## Bago Mag-file

1. **Hanapin ang mga existing issues.** Maaaring may nag-report na ng parehong problema. Tingnan ang [open issues](https://github.com/greghavens/triggerfish/issues) at [closed issues](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed).

2. **Tingnan ang troubleshooting guides.** Sinasaklaw ng [Troubleshooting section](/fil-PH/support/troubleshooting/) ang karamihan sa mga karaniwang problema.

3. **Tingnan ang known issues.** Nilalista ng [Known Issues](/fil-PH/support/kb/known-issues) page ang mga problemang alam na namin.

4. **Subukan ang pinakabagong version.** Kung wala ka sa pinakabagong release, mag-update muna:
   ```bash
   triggerfish update
   ```

## Ano ang Isasama

### 1. Environment

```
Triggerfish version: (patakbuhin ang `triggerfish version`)
OS: (hal., macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Architecture: (x64 o arm64)
Installation method: (binary installer, from source, Docker)
```

### 2. Mga Hakbang para I-reproduce

Isulat ang eksaktong sequence ng mga aksyon na humahantong sa problema. Maging specific:

**Masama:**
> Tumigil ang bot.

**Maganda:**
> 1. Sinimulan ang Triggerfish na may Telegram channel na naka-configure
> 2. Nagpadala ng mensaheng "check my calendar for tomorrow" sa DM sa bot
> 3. Tumugon ang bot ng calendar results
> 4. Nagpadala ng "now email those results to alice@example.com"
> 5. Inaasahan: nagpapadala ang bot ng email
> 6. Aktwal: tumugon ang bot ng "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL"

### 3. Inaasahang vs. Aktwal na Behavior

Sabihin kung ano ang inaasahan mong mangyari at ano ang aktwal na nangyari. Isama ang eksaktong error message kung meron. Mas maganda ang copy-paste kaysa paraphrasing.

### 4. Log Output

Mag-attach ng [log bundle](/fil-PH/support/guides/collecting-logs):

```bash
triggerfish logs bundle
```

Kung security-sensitive ang issue, maaari mong i-redact ang mga bahagi, pero i-note sa issue kung ano ang na-redact mo.

Sa minimum, i-paste ang mga relevant log lines. Isama ang timestamps para ma-correlate namin ang mga events.

### 5. Configuration (Na-redact)

I-paste ang relevant section ng iyong `triggerfish.yaml`. **Palaging i-redact ang secrets.** Palitan ang aktwal na values ng placeholders:

```yaml
# Maganda - na-redact ang secrets
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # naka-store sa keychain
channels:
  telegram:
    ownerId: "REDACTED"
    classification: INTERNAL
```

### 6. Patrol Output

```bash
triggerfish patrol
```

I-paste ang output. Nagbibigay ito sa amin ng mabilis na snapshot ng system health.

## Mga Uri ng Issue

### Bug Report

Gamitin ang template na ito para sa mga bagay na sira:

```markdown
## Bug Report

**Environment:**
- Version:
- OS:
- Install method:

**Mga hakbang para i-reproduce:**
1.
2.
3.

**Inaasahang behavior:**

**Aktwal na behavior:**

**Error message (kung meron):**

**Patrol output:**

**Relevant config (na-redact):**

**Log bundle:** (i-attach ang file)
```

### Feature Request

```markdown
## Feature Request

**Problema:** Ano ang sinusubukan mong gawin na hindi mo magawa ngayon?

**Iminumungkahing solusyon:** Paano sa tingin mo ito dapat gumana?

**Mga alternatibong isinaalang-alang:** Ano pa ang sinubukan mo?
```

### Tanong / Support Request

Kung hindi ka sigurado kung bug ba ito o naipit ka lang, gamitin ang [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) sa halip na Issues. Mas maganda ang Discussions para sa mga tanong na maaaring walang iisang tamang sagot.

## Ano ang HINDI Isasama

- **Raw API keys o passwords.** Palaging i-redact.
- **Personal data mula sa conversations.** I-redact ang mga pangalan, email addresses, phone numbers.
- **Buong log files na inline.** I-attach ang log bundle bilang file sa halip na mag-paste ng libu-libong linya.

## Pagkatapos Mag-file

- **Bantayan ang follow-up questions.** Maaaring mangailangan ang mga maintainers ng karagdagang impormasyon.
- **I-test ang fixes.** Kung may na-push na fix, maaaring hilingin sa iyo na i-verify ito.
- **I-close ang issue** kung ikaw mismo ang nakahanap ng solusyon. I-post ang solusyon para makinabang ang iba.
