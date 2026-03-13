# Secrets ನಿರ್ವಹಣೆ

Triggerfish ಎಂದಿಗೂ configuration ಫೈಲ್‌ಗಳಲ್ಲಿ credentials ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ. ಎಲ್ಲ secrets --
API keys, OAuth tokens, integration credentials -- platform-native ಸುರಕ್ಷಿತ storage ನಲ್ಲಿ
ಸಂಗ್ರಹಿಸಲ್ಪಡುತ್ತವೆ: personal tier ಗಾಗಿ OS keychain, ಅಥವಾ enterprise tier ಗಾಗಿ vault service.
Plugins ಮತ್ತು agents SDK ಮೂಲಕ credentials ನೊಂದಿಗೆ ಸಂವಾದಿಸುತ್ತವೆ, ಇದು ಕಟ್ಟುನಿಟ್ಟಾದ ಪ್ರವೇಶ
ನಿಯಂತ್ರಣಗಳನ್ನು ಜಾರಿಗೊಳಿಸುತ್ತದೆ.

## Storage Backends

| Tier           | Backend           | ವಿವರಗಳು                                                                                        |
| -------------- | ----------------- | ------------------------------------------------------------------------------------------------ |
| **Personal**   | OS keychain       | macOS Keychain, Linux Secret Service (D-Bus ಮೂಲಕ), Windows Credential Manager                  |
| **Enterprise** | Vault integration | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, ಅಥವಾ ಇತರ enterprise vault services       |

ಎರಡೂ ಸಂದರ್ಭಗಳಲ್ಲಿ, secrets storage backend ನಿಂದ ವಿಶ್ರಾಂತಿ ಸ್ಥಿತಿಯಲ್ಲಿ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆಗಿರುತ್ತವೆ.
Triggerfish secrets ಗಾಗಿ ತನ್ನದೇ ಎನ್‌ಕ್ರಿಪ್ಶನ್ ಅನುಷ್ಠಾನಿಸುವುದಿಲ್ಲ -- ಇದು ಉದ್ದೇಶ-ನಿರ್ಮಿತ, ಪರಿಶೀಲಿಸಲ್ಪಟ್ಟ
secret storage ವ್ಯವಸ್ಥೆಗಳಿಗೆ ನಿಯೋಜಿಸುತ್ತದೆ.

Native keychain ಇಲ್ಲದ platforms ನಲ್ಲಿ (Windows without Credential Manager, Docker containers),
Triggerfish `~/.triggerfish/secrets.json` ನಲ್ಲಿ ಎನ್‌ಕ್ರಿಪ್ಟ್ JSON ಫೈಲ್‌ಗೆ ಹಿಂತಿರುಗುತ್ತದೆ.
Entries `~/.triggerfish/secrets.key` (permissions: `0600`) ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಟ್ಟ machine-bound
256-bit key ಬಳಸಿ AES-256-GCM ನಿಂದ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಆಗಿರುತ್ತವೆ. ಪ್ರತಿ entry ಪ್ರತಿ write ನಲ್ಲಿ
ಹೊಸ random 12-byte IV ಬಳಸುತ್ತದೆ. Legacy plaintext secret ಫೈಲ್‌ಗಳು ಮೊದಲ load ನಲ್ಲಿ
ಸ್ವಯಂಚಾಲಿತವಾಗಿ ಎನ್‌ಕ್ರಿಪ್ಟ್ ಫಾರ್ಮ್ಯಾಟ್‌ಗೆ migrate ಆಗುತ್ತವೆ.

::: tip Personal tier secrets ಗಾಗಿ ಶೂನ್ಯ configuration ಅಗತ್ಯ. Setup ಸಮಯದಲ್ಲಿ
(`triggerfish dive`) integration ಸಂಪರ್ಕಿಸಿದಾಗ, credentials ಸ್ವಯಂಚಾಲಿತವಾಗಿ OS keychain ನಲ್ಲಿ
ಸಂಗ್ರಹಿಸಲ್ಪಡುತ್ತವೆ. ನಿಮ್ಮ operating system ಈಗಾಗಲೇ ಒದಗಿಸುವುದಕ್ಕಿಂತ ಹೆಚ್ಚಿನದನ್ನು install ಅಥವಾ
configure ಮಾಡಬೇಕಾಗಿಲ್ಲ. :::

## Configuration ನಲ್ಲಿ Secret References

Triggerfish `triggerfish.yaml` ನಲ್ಲಿ `secret:` references ಬೆಂಬಲಿಸುತ್ತದೆ. Plaintext ಆಗಿ
credentials ಸಂಗ್ರಹಿಸುವ ಬದಲು, ನೀವು ಅವುಗಳನ್ನು ಹೆಸರಿನಿಂದ ಉಲ್ಲೇಖಿಸುತ್ತೀರಿ ಮತ್ತು ಅವು startup
ನಲ್ಲಿ OS keychain ನಿಂದ ಪರಿಹರಿಸಲ್ಪಡುತ್ತವೆ.

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

Resolver configuration ಫೈಲ್‌ನ depth-first walk ನಡೆಸುತ್ತದೆ. `secret:` ನಿಂದ ಪ್ರಾರಂಭವಾಗುವ
ಯಾವುದೇ string value ಅನುರೂಪ keychain entry ಯಿಂದ ಬದಲಾಯಿಸಲ್ಪಡುತ್ತದೆ. Referenced secret
ಕಂಡುಬಂದಿಲ್ಲದಿದ್ದರೆ, startup ತಕ್ಷಣ ಸ್ಪಷ್ಟ error message ನೊಂದಿಗೆ ವಿಫಲವಾಗುತ್ತದೆ.

### ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ Secrets Migrate ಮಾಡಿ

ಹಿಂದಿನ version ನಿಂದ config ಫೈಲ್‌ನಲ್ಲಿ plaintext credentials ಇದ್ದರೆ, migration command
ಅವುಗಳನ್ನು ಸ್ವಯಂಚಾಲಿತವಾಗಿ keychain ಗೆ ಸ್ಥಳಾಂತರಿಸುತ್ತದೆ:

```bash
triggerfish config migrate-secrets
```

ಈ command:

1. `triggerfish.yaml` ಅನ್ನು plaintext credential values ಗಾಗಿ ಸ್ಕ್ಯಾನ್ ಮಾಡುತ್ತದೆ
2. ಪ್ರತಿಯೊಂದನ್ನು OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸುತ್ತದೆ
3. Plaintext value ಅನ್ನು `secret:` reference ನಿಂದ ಬದಲಾಯಿಸುತ್ತದೆ
4. ಮೂಲ ಫೈಲ್‌ನ backup ರಚಿಸುತ್ತದೆ

::: warning Migration ನ ನಂತರ, backup ಫೈಲ್ ಅಳಿಸುವ ಮೊದಲು agent ಸರಿಯಾಗಿ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ
ಎಂದು ಪರಿಶೀಲಿಸಿ. Migration backup ಇಲ್ಲದೆ ಹಿಂತಿರುಗಿಸಲಾಗದು. :::

## Delegated Credential Architecture

Triggerfish ನ ಮೂಲ ಭದ್ರತಾ ತತ್ವ ಏನೆಂದರೆ data queries **ಬಳಕೆದಾರರ** credentials ನೊಂದಿಗೆ
ಚಲಿಸುತ್ತದೆ, system credentials ನೊಂದಿಗೆ ಅಲ್ಲ. ಇದು agent ಮೂಲ ವ್ಯವಸ್ಥೆಯ permission model
ಆನುವಂಶಿಕವಾಗಿ ಪಡೆಯುತ್ತದೆ ಎಂದು ಖಚಿತಪಡಿಸುತ್ತದೆ -- ಬಳಕೆದಾರ ನೇರವಾಗಿ ಪ್ರವೇಶಿಸಬಹುದಾದ ಡೇಟಾ
ಮಾತ್ರ ಪ್ರವೇಶಿಸಬಹುದು.

<img src="/diagrams/delegated-credentials.svg" alt="Delegated credential architecture: User grants OAuth consent, agent queries with user's token, source system enforces permissions" style="max-width: 100%;" />

ಈ architecture ಅರ್ಥ:

- **Over-permissioning ಇಲ್ಲ** -- ಬಳಕೆದಾರ ನೇರವಾಗಿ ಪ್ರವೇಶಿಸಲಾಗದ ಡೇಟಾ agent ಪ್ರವೇಶಿಸಲಾಗದು
- **System service accounts ಇಲ್ಲ** -- compromise ಆಗಬಹುದಾದ all-powerful credential ಇಲ್ಲ
- **Source system enforcement** -- ಪ್ರತಿ query ನಲ್ಲಿ source system (Salesforce, Jira, GitHub, ಇತ್ಯಾದಿ)
  ತನ್ನದೇ permissions ಜಾರಿಗೊಳಿಸುತ್ತದೆ

::: warning SECURITY ಸಾಂಪ್ರದಾಯಿಕ AI agent platforms ಸಾಮಾನ್ಯವಾಗಿ ಎಲ್ಲ ಬಳಕೆದಾರರ ಪರವಾಗಿ
integrations ಪ್ರವೇಶಿಸಲು ಒಂದೇ system service account ಬಳಸುತ್ತವೆ. ಇದರರ್ಥ agent integration
ನಲ್ಲಿ ಎಲ್ಲ ಡೇಟಾ ಪ್ರವೇಶ ಹೊಂದಿದೆ, ಮತ್ತು ಪ್ರತಿ ಬಳಕೆದಾರರಿಗೆ ಏನು ತೋರಿಸಬೇಕು ಎಂದು ನಿರ್ಧರಿಸಲು
LLM ಅವಲಂಬಿಸುತ್ತದೆ. Triggerfish ಈ ಅಪಾಯವನ್ನು ಸಂಪೂರ್ಣ ತೊಡೆದುಹಾಕುತ್ತದೆ: queries ಬಳಕೆದಾರರ
ಸ್ವಂತ delegated OAuth token ನೊಂದಿಗೆ ಚಲಿಸುತ್ತವೆ. :::

## Plugin SDK Enforcement

Plugins Triggerfish SDK ಮೂಲಕ ಮಾತ್ರ credentials ನೊಂದಿಗೆ ಸಂವಾದಿಸುತ್ತವೆ. SDK
permission-aware methods ಒದಗಿಸುತ್ತದೆ ಮತ್ತು system-level credentials ಪ್ರವೇಶಿಸಲು ಯಾವುದೇ
ಪ್ರಯತ್ನ ತಡೆಯುತ್ತದೆ.

### ಅನುಮತಿಸಲ್ಪಟ್ಟಿದೆ: User Credential Access

```python
def get_user_opportunities(sdk, params):
    # SDK ಸುರಕ್ಷಿತ storage ನಿಂದ user's delegated token ಹಿಂಪಡೆಯುತ್ತದೆ
    # ಬಳಕೆದಾರ Salesforce ಸಂಪರ್ಕಿಸಿಲ್ಲದಿದ್ದರೆ, helpful error ಮರಳಿಸುತ್ತದೆ
    user_token = sdk.get_user_credential("salesforce")

    # Query ಬಳಕೆದಾರರ permissions ನೊಂದಿಗೆ ಚಲಿಸುತ್ತದೆ
    # Source system access control ಜಾರಿಗೊಳಿಸುತ್ತದೆ
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### ತಡೆಯಲ್ಪಟ್ಟಿದೆ: System Credential Access

```python
def get_all_opportunities(sdk, params):
    # ಇದು PermissionError raise ಮಾಡುತ್ತದೆ -- SDK ಯಿಂದ BLOCKED
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` ಯಾವಾಗಲೂ ತಡೆಯಲ್ಪಡುತ್ತದೆ. ಇದನ್ನು enable ಮಾಡಲು
configuration ಇಲ್ಲ, admin override ಇಲ್ಲ, ಮತ್ತು escape hatch ಇಲ್ಲ. ಇದು no-write-down ನಿಯಮದಂತೆ
ಸ್ಥಿರ ಭದ್ರತಾ ನಿಯಮ. :::

## LLM-Callable Secret Tools

Agent ಮೂರು tools ಮೂಲಕ secrets ನಿರ್ವಹಿಸಲು ಸಹಾಯ ಮಾಡಬಹುದು. ನಿರ್ಣಾಯಕವಾಗಿ, LLM ಎಂದಿಗೂ
ವಾಸ್ತವ secret values ನೋಡುವುದಿಲ್ಲ -- input ಮತ್ತು storage out-of-band ಆಗುತ್ತದೆ.

### `secret_save`

Secret value ಸುರಕ್ಷಿತವಾಗಿ ನಮೂದಿಸಲು prompt ಮಾಡುತ್ತದೆ:

- **CLI**: Terminal hidden input mode ಗೆ ಬದಲಾಗುತ್ತದೆ (characters echo ಆಗುವುದಿಲ್ಲ)
- **Tidepool**: Web interface ನಲ್ಲಿ ಸುರಕ್ಷಿತ input popup ಕಾಣಿಸಿಕೊಳ್ಳುತ್ತದೆ

LLM secret ಉಳಿಸಲು ಕೋರಿಕೆ ಮಾಡುತ್ತದೆ, ಆದರೆ ವಾಸ್ತವ value ನೀವು ಸುರಕ್ಷಿತ prompt ಮೂಲಕ
ನಮೂದಿಸುತ್ತೀರಿ. Value ನೇರವಾಗಿ keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಡುತ್ತದೆ -- ಇದು ಎಂದಿಗೂ LLM context
ಮೂಲಕ ಹಾದು ಹೋಗುವುದಿಲ್ಲ.

### `secret_list`

ಸಂಗ್ರಹಿಸಲ್ಪಟ್ಟ ಎಲ್ಲ secrets ನ ಹೆಸರುಗಳನ್ನು ಪಟ್ಟಿ ಮಾಡುತ್ತದೆ. ಎಂದಿಗೂ values ಬಹಿರಂಗ ಮಾಡುವುದಿಲ್ಲ.

### `secret_delete`

Keychain ನಿಂದ ಹೆಸರಿನ ಮೂಲಕ secret ಅಳಿಸುತ್ತದೆ.

### Tool Argument Substitution

<div v-pre>

Agent tool ಬಳಸುವಾಗ secret ಅಗತ್ಯವಿದ್ದರೆ (ಉದಾಹರಣೆಗೆ, MCP server environment variable ನಲ್ಲಿ
API key ಹೊಂದಿಸಲು), tool arguments ನಲ್ಲಿ <span v-pre>`{{secret:name}}`</span> syntax ಬಳಸುತ್ತದೆ:

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:my-api-token}}" }
```

Runtime tool execute ಆಗುವ ಮೊದಲು **LLM layer ಕೆಳಗೆ** <span v-pre>`{{secret:name}}`</span>
references ಪರಿಹರಿಸುತ್ತದೆ. ಪರಿಹರಿಸಲ್ಪಟ್ಟ value ಸಂಭಾಷಣೆ ಇತಿಹಾಸ ಅಥವಾ logs ನಲ್ಲಿ ಕಾಣಿಸಿಕೊಳ್ಳುವುದಿಲ್ಲ.

</div>

::: warning SECURITY <code v-pre>{{secret:name}}</code> substitution LLM ಯಿಂದ ಅಲ್ಲ, ಕೋಡ್‌ನಿಂದ
ಜಾರಿಗೊಳ್ಳುತ್ತದೆ. LLM resolved value log ಅಥವಾ return ಮಾಡಲು ಪ್ರಯತ್ನಿಸಿದರೂ, policy layer
`PRE_OUTPUT` hook ನಲ್ಲಿ ಪ್ರಯತ್ನ ಹಿಡಿಯುತ್ತದೆ. :::

### SDK Permission Methods

| Method                                  | ನಡವಳಿಕೆ                                                                                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | ನಿರ್ದಿಷ್ಟ integration ಗಾಗಿ user's delegated OAuth token ಮರಳಿಸುತ್ತದೆ. ಬಳಕೆದಾರ integration ಸಂಪರ್ಕಿಸಿಲ್ಲದಿದ್ದರೆ, ಸೂಚನೆಗಳೊಂದಿಗೆ error ಮರಳಿಸುತ್ತದೆ. |
| `sdk.query_as_user(integration, query)` | User's delegated credentials ಬಳಸಿ integration ವಿರುದ್ಧ query execute ಮಾಡುತ್ತದೆ. Source system ತನ್ನದೇ permissions ಜಾರಿಗೊಳಿಸುತ್ತದೆ.          |
| `sdk.get_system_credential(name)`       | **ಯಾವಾಗಲೂ ತಡೆಯಲ್ಪಡುತ್ತದೆ.** `PermissionError` raise ಮಾಡುತ್ತದೆ. Security event ಆಗಿ logged ಆಗುತ್ತದೆ.                                        |
| `sdk.has_user_connection(integration)`  | ಬಳಕೆದಾರ ನಿರ್ದಿಷ್ಟ integration ಸಂಪರ್ಕಿಸಿದ್ದರೆ `true`, ಇಲ್ಲದಿದ್ದರೆ `false` ಮರಳಿಸುತ್ತದೆ. Credential ಡೇಟಾ ಬಹಿರಂಗ ಮಾಡುವುದಿಲ್ಲ.              |

## Permission-Aware Data Access

Delegated credential architecture classification system ನೊಂದಿಗೆ ಕೈಜೋಡಿಸಿ ಕೆಲಸ ಮಾಡುತ್ತದೆ.
ಬಳಕೆದಾರ source system ನಲ್ಲಿ ಡೇಟಾ ಪ್ರವೇಶಿಸಲು permission ಹೊಂದಿದ್ದರೂ, Triggerfish ನ classification
ನಿಯಮಗಳು ಆ ಡೇಟಾ retrieve ಆದ ನಂತರ ಎಲ್ಲಿ ಹರಿಯಬಹುದು ಎಂದು ನಿಯಂತ್ರಿಸುತ್ತವೆ.

<img src="/diagrams/secret-resolution-flow.svg" alt="Secret resolution flow: config file references resolved from OS keychain below the LLM layer" style="max-width: 100%;" />

**ಉದಾಹರಣೆ:**

```
ಬಳಕೆದಾರ: "Acme deal ಸಾರಾಂಶ ಮಾಡಿ ಮತ್ತು ನನ್ನ ಹೆಂಡತಿಗೆ ಕಳುಹಿಸಿ"

Step 1: Permission check
  --> ಬಳಕೆದಾರರ Salesforce token ಬಳಸಲ್ಪಟ್ಟಿದೆ
  --> Salesforce Acme opportunity ಮರಳಿಸಿದೆ (ಬಳಕೆದಾರ ಪ್ರವೇಶ ಹೊಂದಿದ್ದಾರೆ)

Step 2: Classification
  --> Salesforce ಡೇಟಾ CONFIDENTIAL ಎಂದು ವರ್ಗೀಕರಿಸಲ್ಪಟ್ಟಿದೆ
  --> Session taint CONFIDENTIAL ಗೆ ಏರಿದೆ

Step 3: Output check
  --> ಹೆಂಡತಿ = EXTERNAL ಸ್ವೀಕರಿಸುವವರು
  --> CONFIDENTIAL --> EXTERNAL: BLOCKED

ಫಲಿತಾಂಶ: ಡೇಟಾ retrieve ಆಗಿದೆ (ಬಳಕೆದಾರ permission ಹೊಂದಿದ್ದಾರೆ), ಆದರೆ ಕಳುಹಿಸಲಾಗದು
          (classification ನಿಯಮಗಳು ಸೋರಿಕೆ ತಡೆಯುತ್ತವೆ)
```

Salesforce ನಲ್ಲಿ Acme deal ಗೆ ಬಳಕೆದಾರ ಸಕ್ರಮ ಪ್ರವೇಶ ಹೊಂದಿದ್ದಾರೆ. Triggerfish ಅದನ್ನು
ಗೌರವಿಸುತ್ತದೆ ಮತ್ತು ಡೇಟಾ retrieve ಮಾಡುತ್ತದೆ. ಆದರೆ classification system ಆ ಡೇಟಾ ಬಾಹ್ಯ
ಸ್ವೀಕರಿಸುವವರಿಗೆ ಹರಿಯುವುದನ್ನು ತಡೆಯುತ್ತದೆ. ಡೇಟಾ ಪ್ರವೇಶಿಸಲು permission ಡೇಟಾ ಹಂಚಿಕೊಳ್ಳಲು
permission ನಿಂದ ಪ್ರತ್ಯೇಕವಾಗಿದೆ.

## Secret Access Logging

ಪ್ರತಿ credential access `SECRET_ACCESS` enforcement hook ಮೂಲಕ logged ಆಗುತ್ತದೆ:

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

Blocked attempts ಕೂಡ logged ಆಗುತ್ತವೆ:

```json
{
  "timestamp": "2025-01-29T10:23:46Z",
  "hook_type": "SECRET_ACCESS",
  "session_id": "sess_456",
  "decision": "BLOCK",
  "details": {
    "method": "get_system_credential",
    "requested_name": "SALESFORCE_TOKEN",
    "reason": "System credential access is prohibited",
    "plugin_id": "plugin_789"
  }
}
```

::: info Blocked credential access attempts elevated alert level ನಲ್ಲಿ logged ಆಗುತ್ತವೆ.
Enterprise deployments ನಲ್ಲಿ, ಈ events security team ಗೆ notifications trigger ಮಾಡಬಹುದು. :::

## Enterprise Vault Integration

Enterprise deployments Triggerfish ಅನ್ನು credential management ಗಾಗಿ centralized vault
service ಗೆ ಸಂಪರ್ಕಿಸಬಹುದು:

| Vault Service       | Integration                          |
| ------------------- | ------------------------------------ |
| HashiCorp Vault     | Native API integration               |
| AWS Secrets Manager | AWS SDK integration                  |
| Azure Key Vault     | Azure SDK integration                |
| Custom vault        | Pluggable `SecretProvider` interface |

Enterprise vault integration ಒದಗಿಸುತ್ತದೆ:

- **Centralized rotation** -- vault ನಲ್ಲಿ credentials rotate ಆಗುತ್ತವೆ ಮತ್ತು Triggerfish
  ಸ್ವಯಂಚಾಲಿತವಾಗಿ pickup ಮಾಡುತ್ತದೆ
- **Access policies** -- vault-level policies ಯಾವ agents ಮತ್ತು users ಯಾವ credentials
  ಪ್ರವೇಶಿಸಬಹುದು ಎಂದು ನಿಯಂತ್ರಿಸುತ್ತದೆ
- **Audit consolidation** -- Triggerfish ಮತ್ತು vault ನಿಂದ credential access logs
  ಪರಸ್ಪರ correlate ಮಾಡಬಹುದು

## Config ಫೈಲ್‌ಗಳಲ್ಲಿ ಎಂದಿಗೂ ಸಂಗ್ರಹಿಸದ್ದು

ಕೆಳಗಿನವು `triggerfish.yaml` ಅಥವಾ ಯಾವುದೇ ಇತರ configuration ಫೈಲ್‌ನಲ್ಲಿ plaintext values
ಆಗಿ ಎಂದಿಗೂ ಕಾಣಿಸಿಕೊಳ್ಳುವುದಿಲ್ಲ. ಅವು OS keychain ನಲ್ಲಿ ಸಂಗ್ರಹಿಸಲ್ಪಟ್ಟು `secret:` syntax
ಮೂಲಕ ಉಲ್ಲೇಖಿಸಲ್ಪಡುತ್ತವೆ, ಅಥವಾ `secret_save` tool ಮೂಲಕ ನಿರ್ವಹಿಸಲ್ಪಡುತ್ತವೆ:

- LLM providers ಗಾಗಿ API keys
- Integrations ಗಾಗಿ OAuth tokens
- Database credentials
- Webhook secrets
- Encryption keys
- Pairing codes (ತಾತ್ಕಾಲಿಕ, in-memory ಮಾತ್ರ)

::: danger Triggerfish configuration ಫೈಲ್‌ನಲ್ಲಿ plaintext credentials ಕಂಡುಬಂದರೆ (`secret:`
references ಆಗಿಲ್ಲದ values), ಏನೋ ತಪ್ಪಾಗಿದೆ. ಅವುಗಳನ್ನು keychain ಗೆ ಸ್ಥಳಾಂತರಿಸಲು
`triggerfish config migrate-secrets` ರನ್ ಮಾಡಿ. Plaintext ಆಗಿ ಕಂಡ credentials ತಕ್ಷಣ
rotate ಮಾಡಬೇಕು. :::

## ಸಂಬಂಧಿತ ಪುಟಗಳು

- [ಭದ್ರತಾ-ಪ್ರಥಮ ವಿನ್ಯಾಸ](./) -- ಭದ್ರತಾ architecture ಅವಲೋಕನ
- [No Write-Down ನಿಯಮ](./no-write-down) -- classification controls credential isolation ಅನ್ನು
  ಹೇಗೆ ಪೂರಕಗೊಳಿಸುತ್ತದೆ
- [Identity & Auth](./identity) -- ಬಳಕೆದಾರ identity delegated credential access ಗೆ ಹೇಗೆ
  ಹರಿಯುತ್ತದೆ
- [Audit & Compliance](./audit-logging) -- credential access events ಹೇಗೆ ದಾಖಲಿಸಲ್ಪಡುತ್ತವೆ
