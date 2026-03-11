# Secrets Management

Hindi kailanman nag-store ng credentials ang Triggerfish sa configuration files. Lahat ng secrets -- API keys, OAuth tokens, integration credentials -- ay naka-store sa platform-native secure storage: ang OS keychain para sa personal tier, o vault service para sa enterprise tier. Nakikipag-interact ang plugins at agents sa credentials sa pamamagitan ng SDK, na nag-e-enforce ng strict access controls.

## Mga Storage Backend

| Tier           | Backend           | Mga Detalye                                                                                |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| **Personal**   | OS keychain       | macOS Keychain, Linux Secret Service (sa pamamagitan ng D-Bus), Windows Credential Manager |
| **Enterprise** | Vault integration | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, o ibang enterprise vault services   |

Sa parehong kaso, encrypted at rest ang secrets ng storage backend. Hindi nag-i-implement ang Triggerfish ng sarili nitong encryption para sa secrets -- dine-delegate nito sa purpose-built, audited secret storage systems.

Sa mga platform na walang native keychain, nag-fa-fall back ang Triggerfish sa encrypted JSON file sa `~/.triggerfish/secrets.json`. Ang entries ay encrypted gamit ang AES-256-GCM na may machine-bound 256-bit key na naka-store sa `~/.triggerfish/secrets.key` (permissions: `0600`).

::: tip Ang personal tier ay nangangailangan ng zero configuration para sa secrets. Kapag nag-connect ka ng integration sa setup (`triggerfish dive`), awtomatikong ini-store ang credentials sa iyong OS keychain. :::

## Mga Secret Reference sa Configuration

Sinusuportahan ng Triggerfish ang `secret:` references sa `triggerfish.yaml`. Sa halip na mag-store ng credentials bilang plaintext, nire-reference mo ang mga ito ayon sa pangalan at nire-resolve ang mga ito mula sa OS keychain sa startup.

```yaml
models:
  providers:
    anthropic:
      apiKey: "secret:provider:anthropic:apiKey"
    openai:
      apiKey: "secret:provider:openai:apiKey"

channels:
  telegram:
    botToken: "secret:channel:telegram:botToken"
```

### Pag-migrate ng Existing Secrets

Kung may plaintext credentials sa iyong config file mula sa mas lumang version:

```bash
triggerfish config migrate-secrets
```

## Delegated Credential Architecture

Isang core security principle sa Triggerfish na ang data queries ay tumatakbo gamit ang **credentials ng user**, hindi system credentials. Sinisiguro nito na nag-i-inherit ang agent ng permission model ng source system.

<img src="/diagrams/delegated-credentials.svg" alt="Delegated credential architecture: nagbibigay ang user ng OAuth consent, nagqu-query ang agent gamit ang token ng user, ine-enforce ng source system ang permissions" style="max-width: 100%;" />

::: warning SECURITY Ang tradisyonal na AI agent platforms ay madalas gumagamit ng iisang system service account para mag-access ng integrations sa ngalan ng lahat ng users. Inalis ng Triggerfish ang risk na ito: tumatakbo ang queries gamit ang sariling delegated OAuth token ng user. :::

## Mga LLM-Callable Secret Tool

Makakatulong ang agent sa pamamahala ng secrets sa pamamagitan ng tatlong tools. Kritikal na hindi kailanman nakikita ng LLM ang aktwal na secret values.

### `secret_save`

Nagpo-prompt sa iyo na mag-enter ng secret value nang ligtas. Sa CLI, nagshi-switch ang terminal sa hidden input mode. Sa Tidepool, lumilitaw ang secure input popup.

### `secret_list`

Nilalista ang mga pangalan ng lahat ng stored secrets. Hindi kailanman nag-e-expose ng values.

### `secret_delete`

Nagde-delete ng secret ayon sa pangalan mula sa keychain.

## Secret Access Logging

Bawat credential access ay nilo-log sa pamamagitan ng `SECRET_ACCESS` enforcement hook. Ang blocked attempts ay nilo-log din sa elevated alert level.

## Mga Kaugnay na Pahina

- [Security-First Design](./) -- overview ng security architecture
- [No Write-Down Rule](./no-write-down) -- paano kumukumpleto ang classification controls sa credential isolation
- [Identity & Auth](./identity) -- paano nagpa-feed ang user identity sa delegated credential access
- [Audit & Compliance](./audit-logging) -- paano nire-record ang credential access events
