# Secrets Management

Triggerfish کبھی configuration files میں credentials store نہیں کرتا۔ تمام secrets —
API کلیدیں، OAuth tokens، integration credentials — platform-native secure storage میں
محفوظ ہوتے ہیں: personal tier کے لیے OS keychain، یا enterprise tier کے لیے vault سروس۔
Plugins اور agents credentials کے ساتھ SDK کے ذریعے interact کرتے ہیں، جو سخت access
کنٹرولز نافذ کرتا ہے۔

## Storage Backends

| Tier           | Backend           | تفصیلات                                                                                     |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------ |
| **Personal**   | OS keychain       | macOS Keychain، Linux Secret Service (D-Bus کے ذریعے)، Windows Credential Manager        |
| **Enterprise** | Vault integration | HashiCorp Vault، AWS Secrets Manager، Azure Key Vault، یا دیگر enterprise vault services  |

دونوں صورتوں میں، secrets storage backend کے ذریعے rest پر encrypted ہوتے ہیں۔ Triggerfish
secrets کے لیے اپنی encryption implement نہیں کرتا — یہ purpose-built، audited secret
storage systems کو delegate کرتا ہے۔

Native keychain کے بغیر پلیٹ فارمز پر (Windows بغیر Credential Manager، Docker containers)،
Triggerfish `~/.triggerfish/secrets.json` پر ایک encrypted JSON فائل کو fallback کرتا ہے۔
Entries AES-256-GCM کے ساتھ `~/.triggerfish/secrets.key` پر محفوظ machine-bound 256-bit
key استعمال کر کے encrypted ہوتی ہیں (permissions: `0600`)۔ ہر entry ہر write پر ایک
تازہ random 12-byte IV استعمال کرتی ہے۔ Legacy plaintext secret فائلیں پہلے load پر
خود بخود encrypted format میں migrate ہوتی ہیں۔

::: tip Personal tier کو secrets کے لیے صفر configuration درکار ہے۔ جب آپ setup کے
دوران (`triggerfish dive`) کوئی integration جوڑتے ہیں، credentials خود بخود آپ کے OS
keychain میں محفوظ ہوتے ہیں۔ آپ کو آپ کا operating system جو پہلے سے فراہم کرتا ہے اس
سے پرے کچھ بھی انسٹال یا configure کرنے کی ضرورت نہیں۔ :::

## Configuration میں Secret References

Triggerfish `triggerfish.yaml` میں `secret:` references کی حمایت کرتا ہے۔ credentials کو
plaintext کے طور پر store کرنے کی بجائے، آپ انہیں نام سے reference کرتے ہیں اور startup
پر OS keychain سے resolve ہوتے ہیں۔

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

Resolver configuration فائل کی depth-first walk کرتا ہے۔ `secret:` سے شروع ہونے والی
کوئی بھی string value corresponding keychain entry سے بدل جاتی ہے۔ اگر referenced
secret نہ ملے، تو startup فوری طور پر ایک واضح error message کے ساتھ ناکام ہو جاتی ہے۔

### موجودہ Secrets Migrate کرنا

اگر آپ کے config فائل میں پرانے ورژن سے plaintext credentials ہیں، تو migration کمانڈ
انہیں خود بخود keychain میں منتقل کرتی ہے:

```bash
triggerfish config migrate-secrets
```

یہ کمانڈ:

1. `triggerfish.yaml` کو plaintext credential values کے لیے scan کرتی ہے
2. ہر ایک کو OS keychain میں store کرتی ہے
3. Plaintext value کو `secret:` reference سے بدل دیتی ہے
4. اصل فائل کا backup بناتی ہے

::: warning Migration کے بعد، backup فائل delete کرنے سے پہلے verify کریں کہ آپ کا
ایجنٹ صحیح طریقے سے شروع ہوتا ہے۔ Migration backup کے بغیر reversible نہیں ہے۔ :::

## Delegated Credential Architecture

Triggerfish میں ایک بنیادی سیکیورٹی اصول یہ ہے کہ data queries system credentials کی
بجائے **user's** credentials کے ساتھ چلتے ہیں۔ یہ یقینی بناتا ہے کہ ایجنٹ source system
کا permission model وراثت میں پاتا ہے — user صرف وہ ڈیٹا access کر سکتا ہے جو وہ
براہ راست access کر سکتا ہے۔

<img src="/diagrams/delegated-credentials.svg" alt="Delegated credential architecture: User grants OAuth consent, agent queries with user's token, source system enforces permissions" style="max-width: 100%;" />

یہ architecture کا مطلب ہے:

- **کوئی over-permissioning نہیں** — ایجنٹ وہ ڈیٹا access نہیں کر سکتا جو user براہ راست
  access نہیں کر سکتا
- **کوئی system service accounts نہیں** — کوئی all-powerful credential نہیں جسے
  compromise کیا جا سکے
- **Source system enforcement** — source system (Salesforce، Jira، GitHub، وغیرہ) ہر
  query پر اپنی permissions خود نافذ کرتا ہے

::: warning سیکیورٹی روایتی AI ایجنٹ پلیٹ فارمز اکثر تمام users کی طرف سے integrations
تک رسائی کے لیے ایک واحد system service account استعمال کرتے ہیں۔ اس کا مطلب ہے ایجنٹ
کو integration میں تمام ڈیٹا تک رسائی حاصل ہے، اور LLM پر انحصار کرتا ہے کہ فیصلہ کرے
ہر user کو کیا دکھانا ہے۔ Triggerfish یہ خطرہ مکمل طور پر ختم کرتا ہے: queries user کے
اپنے delegated OAuth token کے ساتھ چلتی ہیں۔ :::

## Plugin SDK Enforcement

Plugins خصوصی طور پر Triggerfish SDK کے ذریعے credentials کے ساتھ interact کرتے ہیں۔
SDK permission-aware methods فراہم کرتا ہے اور system-level credentials تک رسائی کی
کسی بھی کوشش کو block کرتا ہے۔

### اجازت یافتہ: User Credential Access

```python
def get_user_opportunities(sdk, params):
    # SDK secure storage سے user کا delegated token retrieve کرتا ہے
    # اگر user نے Salesforce connect نہیں کیا، helpful error واپس کرتا ہے
    user_token = sdk.get_user_credential("salesforce")

    # Query user کی permissions کے ساتھ چلتی ہے
    # Source system access control نافذ کرتا ہے
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### Blocked: System Credential Access

```python
def get_all_opportunities(sdk, params):
    # یہ PermissionError raise کرے گا — SDK نے BLOCKED کیا
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` ہمیشہ blocked ہے۔ اسے فعال کرنے کے لیے
کوئی configuration نہیں، کوئی admin override نہیں، اور کوئی escape hatch نہیں۔ یہ ایک
مقررہ سیکیورٹی قاعدہ ہے، no-write-down قاعدے جیسا ہی۔ :::

## LLM-Callable Secret Tools

ایجنٹ تین tools کے ذریعے secrets manage کرنے میں آپ کی مدد کر سکتا ہے۔ اہم بات،
LLM اصل secret values کبھی نہیں دیکھتا — input اور storage out-of-band ہوتے ہیں۔

### `secret_save`

آپ کو محفوظ طریقے سے ایک secret value درج کرنے پر prompt کرتا ہے:

- **CLI**: Terminal hidden input mode میں switch ہو جاتا ہے (characters echo نہیں ہوتے)
- **Tidepool**: Web interface میں ایک secure input popup ظاہر ہوتا ہے

LLM درخواست کرتا ہے کہ ایک secret save کیا جائے، لیکن اصل value آپ secure prompt کے
ذریعے درج کرتے ہیں۔ Value براہ راست keychain میں محفوظ ہوتی ہے — یہ کبھی LLM context
سے نہیں گزرتی۔

### `secret_list`

تمام محفوظ secrets کے نام فہرست کرتا ہے۔ Values کبھی expose نہیں کرتا۔

### `secret_delete`

Keychain سے نام کے ذریعے ایک secret delete کرتا ہے۔

### SDK Permission Methods

| Method                                  | رویہ                                                                                                                         |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | مخصوص integration کے لیے user کا delegated OAuth token واپس کرتا ہے۔ اگر user نے integration connect نہیں کیا، ہدایات کے ساتھ error واپس۔ |
| `sdk.query_as_user(integration, query)` | User کے delegated credentials استعمال کر کے integration کے خلاف query execute کرتا ہے۔ Source system اپنی permissions خود نافذ کرتا ہے۔ |
| `sdk.get_system_credential(name)`       | **ہمیشہ blocked۔** `PermissionError` raise کرتا ہے۔ Security event کے طور پر logged۔                                        |
| `sdk.has_user_connection(integration)`  | اگر user نے مخصوص integration connect کیا ہو تو `true` واپس کرتا ہے، ورنہ `false`۔ کوئی credential data expose نہیں کرتا۔  |

## Permission-Aware Data Access

Delegated credential architecture classification system کے ساتھ مل کر کام کرتا ہے۔
یہاں تک کہ اگر user کو source system میں ڈیٹا تک رسائی کی اجازت ہے، Triggerfish کے
classification قواعد طے کرتے ہیں کہ retrieve ہونے کے بعد وہ ڈیٹا کہاں بہہ سکتا ہے۔

**مثال:**

```
User: "Summarize the Acme deal and send to my wife"

Step 1: Permission check
  --> User's Salesforce token used
  --> Salesforce returns Acme opportunity (user has access)

Step 2: Classification
  --> Salesforce data classified as CONFIDENTIAL
  --> Session taint escalates to CONFIDENTIAL

Step 3: Output check
  --> Wife = EXTERNAL recipient
  --> CONFIDENTIAL --> EXTERNAL: BLOCKED

Result: Data retrieved (user has permission), but cannot be sent
        (classification rules prevent leakage)
```

User کو Salesforce میں Acme deal تک جائز رسائی ہے۔ Triggerfish اس کا احترام کرتا اور
ڈیٹا retrieve کرتا ہے۔ لیکن classification system اس ڈیٹا کو بیرونی recipient تک بہنے
سے روکتا ہے۔ ڈیٹا تک رسائی کی اجازت اسے share کرنے کی اجازت سے الگ ہے۔

## Secret Access Logging

ہر credential رسائی `SECRET_ACCESS` enforcement hook کے ذریعے logged ہوتی ہے:

```json
{
  "timestamp": "2025-01-29T10:23:45Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "ALLOW",
  "details": {
    "method": "get_user_credential",
    "integration": "salesforce",
    "user_id": "user_456",
    "credential_type": "oauth_delegated"
  }
}
```

Blocked کوششیں بھی logged ہوتی ہیں۔

## Enterprise Vault Integration

Enterprise deployments credential management کے لیے Triggerfish کو ایک مرکزی vault
service سے جوڑ سکتے ہیں:

| Vault Service       | Integration                            |
| ------------------- | -------------------------------------- |
| HashiCorp Vault     | Native API integration                 |
| AWS Secrets Manager | AWS SDK integration                    |
| Azure Key Vault     | Azure SDK integration                  |
| Custom vault        | Pluggable `SecretProvider` interface   |

## Config Files میں کیا کبھی Store نہیں ہوتا

مندرجہ ذیل `triggerfish.yaml` یا کسی دیگر configuration فائل میں plaintext values کے
طور پر کبھی نہیں آتے:

- LLM فراہم کنندگان کے لیے API کلیدیں
- Integrations کے لیے OAuth tokens
- Database credentials
- Webhook secrets
- Encryption کلیدیں
- Pairing codes (عارضی، صرف in-memory)

::: danger اگر آپ کو Triggerfish configuration فائل میں plaintext credentials ملیں
(values جو `secret:` references نہیں ہیں)، تو کچھ غلط ہوا ہے۔ انہیں keychain میں منتقل
کرنے کے لیے `triggerfish config migrate-secrets` چلائیں۔ Plaintext پائی گئی credentials
فوری طور پر rotate کی جانی چاہئیں۔ :::

## متعلقہ صفحات

- [سیکیورٹی-اول ڈیزائن](./) — سیکیورٹی architecture کا جائزہ
- [No Write-Down قاعدہ](./no-write-down) — classification controls credential isolation کی تکمیل کیسے کرتے ہیں
- [Identity اور Auth](./identity) — user identity delegated credential رسائی میں کیسے شامل ہوتی ہے
- [Audit اور Compliance](./audit-logging) — credential access events کیسے recorded ہوتے ہیں
