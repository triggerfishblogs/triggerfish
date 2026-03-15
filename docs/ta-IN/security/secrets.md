# Secrets நிர்வாகம்

Triggerfish credentials ஐ configuration கோப்புகளில் ஒருபோதும் சேமிப்பதில்லை. அனைத்து secrets -- API விசைகள், OAuth tokens, integration credentials -- platform-native secure storage இல் சேமிக்கப்படுகின்றன: personal tier க்கு OS keychain, அல்லது enterprise tier க்கு vault service. Plugins மற்றும் agents SDK மூலம் credentials உடன் தொடர்பு கொள்கின்றன, இது கடுமையான access controls அமல்படுத்துகிறது.

## Storage Backends

| Tier           | Backend           | விவரங்கள்                                                                                   |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| **Personal**   | OS keychain       | macOS Keychain, Linux Secret Service (D-Bus வழியாக), Windows Credential Manager             |
| **Enterprise** | Vault integration | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault அல்லது மற்ற enterprise vault services |

இரண்டு சந்தர்ப்பங்களிலும், secrets storage backend மூலம் rest இல் encrypted ஆகின்றன. Triggerfish secrets க்கு அதன் சொந்த encryption implement செய்வதில்லை -- இது purpose-built, audited secret storage கணினிகளுக்கு delegate செய்கிறது.

Native keychain இல்லாத platforms இல் (Credential Manager இல்லாத Windows, Docker containers), Triggerfish `~/.triggerfish/secrets.json` இல் encrypted JSON கோப்பிற்கு fallback ஆகிறது. Entries machine-bound 256-bit key உடன் AES-256-GCM மூலம் encrypted ஆகின்றன.

::: tip Personal tier க்கு secrets க்கு zero configuration தேவை. Setup போது integration இணைக்கும்போது (`triggerfish dive`), credentials தானாக உங்கள் OS keychain இல் சேமிக்கப்படுகின்றன. உங்கள் operating system ஏற்கனவே வழங்குவதற்கு மேல் எதுவும் நிறுவ அல்லது கட்டமைக்க தேவையில்லை. :::

## Configuration இல் Secret References

Triggerfish `triggerfish.yaml` இல் `secret:` references ஐ ஆதரிக்கிறது. Credentials ஐ plaintext ஆக சேமிப்பதற்கு பதிலாக, அவற்றை பெயரால் reference செய்கிறீர்கள் மற்றும் startup போது OS keychain இலிருந்து resolve ஆகின்றன.

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

## Secrets அமைக்கவும்

Command line மூலம் secrets அமைக்கவும்:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
triggerfish config set-secret channel:telegram:botToken 123456:ABC...
triggerfish config set-secret integration:github:token ghp_...
```

## Secrets Migration

Configuration கோப்பில் plaintext credentials இருந்தால், அவற்றை keychain க்கு migrate செய்யவும்:

```bash
triggerfish config migrate-secrets
```

இது:
1. `triggerfish.yaml` ஐ plaintext API விசைகள், tokens மற்றும் passwords க்காக scan செய்கிறது
2. அவற்றை OS keychain இல் சேமிக்கிறது
3. Plaintext மதிப்புகளை `secret:` references உடன் மாற்றுகிறது
4. Original கோப்பின் backup உருவாக்குகிறது

## Secret Access Logging

`SECRET_ACCESS` hook ஒவ்வொரு credential அணுகலையும் log செய்கிறது:

- கோரும் plugin அல்லது integration
- Credential scope மற்றும் type
- Access முடிவு (அனுமதிக்கப்பட்டது / மறுக்கப்பட்டது)
- Timestamp மற்றும் session ID

Plugins கணினி credentials அணுக முடியாது. Plugin SDK `sdk.get_system_credential()` ஐ block செய்கிறது. Plugins பயனரின் delegated credentials மட்டும் அணுக முடியும் (`sdk.get_user_credential()`).

## Docker இல் Secrets

OS keychain containers க்கு கிடைக்காததால், Triggerfish volume க்கு உள்ளே `/data/secrets.json` இல் encrypted file-backed store பயன்படுத்துகிறது:

```bash
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

Docker volume bind-mounted அல்லது named volume ஆக persist ஆகிறது.
