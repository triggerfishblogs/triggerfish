# Secrets Management

Triggerfish कधीच configuration files मध्ये credentials store करत नाही. सर्व secrets
-- API keys, OAuth tokens, integration credentials -- platform-native secure storage
मध्ये stored आहेत: personal tier साठी OS keychain, किंवा enterprise tier साठी
vault service. Plugins आणि agents SDK द्वारे credentials शी interact करतात, जे
strict access controls enforce करतो.

## Storage Backends

| Tier           | Backend            | Details                                                                                          |
| -------------- | ------------------ | ------------------------------------------------------------------------------------------------ |
| **Personal**   | OS keychain        | macOS Keychain, Linux Secret Service (D-Bus द्वारे), Windows Credential Manager                 |
| **Enterprise** | Vault integration  | HashiCorp Vault, AWS Secrets Manager, Azure Key Vault, किंवा इतर enterprise vault services      |

दोन्ही cases मध्ये, secrets storage backend द्वारे at rest encrypted आहेत. Triggerfish
secrets साठी स्वतःची encryption implement करत नाही -- ते purpose-built, audited
secret storage systems ला delegate करते.

Native keychain नसलेल्या platforms वर (Windows without Credential Manager, Docker
containers), Triggerfish `~/.triggerfish/secrets.json` वर encrypted JSON file ला
fall back करतो. Entries `~/.triggerfish/secrets.key` वर stored machine-bound 256-bit
key वापरून AES-256-GCM सह encrypted आहेत (permissions: `0600`). प्रत्येक entry
प्रत्येक write वर fresh random 12-byte IV वापरतो. Legacy plaintext secret files first
load वर automatically encrypted format ला migrated होतात.

::: tip Personal tier ला secrets साठी zero configuration आवश्यक आहे. जेव्हा तुम्ही
setup दरम्यान integration connect करता (`triggerfish dive`), credentials automatically
तुमच्या OS keychain मध्ये stored होतात. तुमचे operating system आधीच provide
करत असलेल्या पलीकडे तुम्हाला कोणतेही install किंवा configure करण्याची आवश्यकता
नाही. :::

## Configuration मध्ये Secret References

Triggerfish `triggerfish.yaml` मध्ये `secret:` references support करतो. Credentials
plaintext म्हणून store करण्याऐवजी, तुम्ही त्यांना नावाने reference करता आणि ते
startup वर OS keychain मधून resolved होतात.

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

Resolver configuration file चा depth-first walk perform करतो. `secret:` ने
सुरू होणारे कोणतेही string value corresponding keychain entry सह substituted होते.
Referenced secret सापडला नाहीतर, startup लगेच clear error message सह fail होतो.

### Existing Secrets Migrate करणे

Earlier version मधून तुमच्या config file मध्ये plaintext credentials असल्यास,
migration command ते automatically keychain ला move करते:

```bash
triggerfish config migrate-secrets
```

हे command:

1. Plaintext credential values साठी `triggerfish.yaml` scan करतो
2. प्रत्येक OS keychain मध्ये store करतो
3. Plaintext value `secret:` reference सह replace करतो
4. Original file चे backup create करतो

::: warning Migration नंतर, backup file delete करण्यापूर्वी तुमचा agent correctly
start होतो का verify करा. Migration backup शिवाय reversible नाही. :::

## Delegated Credential Architecture

Triggerfish मधील एक core security principle असा आहे की data queries **user च्या**
credentials सह run होतात, system credentials सह नाही. हे ensure करते की agent
source system चे permission model inherit करतो -- user फक्त ते data access करू
शकतो जे ते directly access करू शकतात.

<img src="/diagrams/delegated-credentials.svg" alt="Delegated credential architecture: User grants OAuth consent, agent queries with user's token, source system enforces permissions" style="max-width: 100%;" />

या architecture म्हणजे:

- **No over-permissioning** -- agent user directly access करू शकत नाही असा data
  access करू शकत नाही
- **No system service accounts** -- कोणतेही all-powerful credential नाही जे
  compromised होऊ शकते
- **Source system enforcement** -- source system (Salesforce, Jira, GitHub, इ.) प्रत्येक
  query वर स्वतःचे permissions enforce करतो

::: warning SECURITY Traditional AI agent platforms अनेकदा सर्व users च्या वतीने
integrations access करण्यासाठी single system service account वापरतात. याचा अर्थ
agent ला integration मधील सर्व data access असतो, आणि प्रत्येक user ला काय दाखवायचे
हे decide करण्यासाठी LLM वर rely करतो. Triggerfish हा risk पूर्णपणे eliminate करतो:
queries user च्या स्वतःच्या delegated OAuth token सह run होतात. :::

## Plugin SDK Enforcement

Plugins Triggerfish SDK द्वारे exclusively credentials शी interact करतात. SDK
permission-aware methods provide करतो आणि system-level credentials access करण्याचे
कोणतेही attempt block करतो.

### Allowed: User Credential Access

```python
def get_user_opportunities(sdk, params):
    # SDK user चे delegated token secure storage मधून retrieve करतो
    # User Salesforce connect केले नसल्यास, helpful error return करतो
    user_token = sdk.get_user_credential("salesforce")

    # Query user च्या permissions सह run होतो
    # Source system access control enforce करतो
    return sdk.query_as_user(
        integration="salesforce",
        query="SELECT Id, Name, Amount FROM Opportunity",
        user_id=sdk.current_user_id
    )
```

### Blocked: System Credential Access

```python
def get_all_opportunities(sdk, params):
    # हे PermissionError raise करेल -- SDK द्वारे BLOCKED
    token = sdk.get_system_credential("SALESFORCE_TOKEN")
    return query_salesforce(token, "SELECT * FROM Opportunity")
```

::: danger `sdk.get_system_credential()` नेहमी blocked आहे. ते enable करण्यासाठी
कोणतेही configuration नाही, admin override नाही, आणि escape hatch नाही. हे एक
fixed security rule आहे, no-write-down rule प्रमाणेच. :::

## LLM-Callable Secret Tools

Agent तीन tools द्वारे secrets manage करण्यात तुम्हाला help करू शकतो. Critically,
LLM actual secret values कधीच पाहत नाही -- input आणि storage out-of-band होते.

### `secret_save`

Secret value securely enter करण्यासाठी तुम्हाला prompt करतो:

- **CLI**: Terminal hidden input mode ला switch होतो (characters echoed नाहीत)
- **Tidepool**: Web interface मध्ये secure input popup appear होतो

LLM request करतो की secret saved व्हावे, पण actual value secure prompt द्वारे
तुमच्याद्वारे entered होते. Value directly keychain मध्ये stored होते -- ते कधीच
LLM context मधून pass होत नाही.

### `secret_list`

Stored secrets ची names list करतो. Values कधीच expose करत नाही.

### `secret_delete`

Keychain मधून नावाने secret delete करतो.

### Tool Argument Substitution

<div v-pre>

जेव्हा agent secret आवश्यक असलेला tool वापरतो (उदाहरणार्थ, MCP server environment
variable मध्ये API key set करणे), तेव्हा ते tool arguments मध्ये <span v-pre>`{{secret:name}}`</span>
syntax वापरतो:

```
tool_call: set_env_var
arguments: { "key": "API_TOKEN", "value": "{{secret:my-api-token}}" }
```

Runtime tool execute होण्यापूर्वी **LLM layer च्या खाली** <span v-pre>`{{secret:name}}`</span>
references resolve करतो. Resolved value conversation history किंवा logs मध्ये
कधीच appear होत नाही.

</div>

::: warning SECURITY <code v-pre>{{secret:name}}</code> substitution code द्वारे
enforced आहे, LLM द्वारे नाही. LLM resolved value log किंवा return करण्याचा प्रयत्न
केला तरी, policy layer `PRE_OUTPUT` hook मध्ये attempt catch करेल. :::

### SDK Permission Methods

| Method                                  | Behavior                                                                                                                                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sdk.get_user_credential(integration)`  | Specified integration साठी user चे delegated OAuth token return करतो. User ने integration connect केले नसल्यास, instructions सह error return करतो.                        |
| `sdk.query_as_user(integration, query)` | User च्या delegated credentials वापरून integration विरुद्ध query execute करतो. Source system स्वतःचे permissions enforce करतो.                                             |
| `sdk.get_system_credential(name)`       | **नेहमी blocked.** `PermissionError` raise करतो. Security event म्हणून Logged.                                                                                             |
| `sdk.has_user_connection(integration)`  | User ने specified integration connect केले असल्यास `true` return करतो, अन्यथा `false`. कोणतेही credential data expose करत नाही.                                           |

## Permission-Aware Data Access

Delegated credential architecture classification system सह hand-in-hand काम करते.
User ला source system मधील data access करण्याची permission असली तरी, Triggerfish
चे classification rules ते data retrieved झाल्यानंतर कुठे flow करू शकते हे govern
करतात.

<img src="/diagrams/secret-resolution-flow.svg" alt="Secret resolution flow: config file references resolved from OS keychain below the LLM layer" style="max-width: 100%;" />

**Example:**

```
User: "Summarize the Acme deal and send to my wife"

Step 1: Permission check
  --> User चे Salesforce token वापरला जातो
  --> Salesforce Acme opportunity return करतो (user ला access आहे)

Step 2: Classification
  --> Salesforce data CONFIDENTIAL म्हणून classified
  --> Session taint CONFIDENTIAL ला escalates

Step 3: Output check
  --> Wife = EXTERNAL recipient
  --> CONFIDENTIAL --> EXTERNAL: BLOCKED

Result: Data retrieved (user ला permission आहे), पण पाठवला जाऊ शकत नाही
        (classification rules leakage रोखतात)
```

User ला Salesforce मध्ये Acme deal ला legitimate access आहे. Triggerfish ते respect
करतो आणि data retrieve करतो. पण classification system त्या data ला external
recipient ला flow होण्यापासून रोखतो. Data access करण्याची permission आणि ते share
करण्याची permission वेगळ्या आहेत.

## Secret Access Logging

प्रत्येक credential access `SECRET_ACCESS` enforcement hook द्वारे logged आहे:

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

Blocked attempts देखील logged आहेत:

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

::: info Blocked credential access attempts elevated alert level वर logged आहेत.
Enterprise deployments मध्ये, हे events security team ला notifications trigger
करू शकतात. :::

## Enterprise Vault Integration

Enterprise deployments credential management साठी Triggerfish ला centralized vault
service शी connect करू शकतात:

| Vault Service       | Integration                            |
| ------------------- | -------------------------------------- |
| HashiCorp Vault     | Native API integration                 |
| AWS Secrets Manager | AWS SDK integration                    |
| Azure Key Vault     | Azure SDK integration                  |
| Custom vault        | Pluggable `SecretProvider` interface   |

Enterprise vault integration provide करते:

- **Centralized rotation** -- credentials vault मध्ये rotated होतात आणि
  Triggerfish द्वारे automatically picked up होतात
- **Access policies** -- vault-level policies control करतात कोणते agents आणि
  users कोणते credentials access करू शकतात
- **Audit consolidation** -- Triggerfish आणि vault मधून credential access logs
  correlated केले जाऊ शकतात

## Config Files मध्ये काय कधीच Stored नाही

पुढील गोष्टी `triggerfish.yaml` किंवा इतर कोणत्याही configuration file मध्ये
plaintext values म्हणून कधीच appear होत नाहीत. त्या OS keychain मध्ये stored आणि
`secret:` syntax द्वारे referenced आहेत, किंवा `secret_save` tool द्वारे managed आहेत:

- LLM providers साठी API keys
- Integrations साठी OAuth tokens
- Database credentials
- Webhook secrets
- Encryption keys
- Pairing codes (ephemeral, in-memory only)

::: danger Triggerfish configuration file मध्ये plaintext credentials सापडल्यास
(`secret:` references नसलेल्या values), काहीतरी चुकले आहे. Keychain ला move
करण्यासाठी `triggerfish config migrate-secrets` run करा. Plaintext म्हणून
सापडलेले credentials लगेच rotate करायला हवेत. :::

## Related Pages

- [Security-First Design](./) -- security architecture चे overview
- [No Write-Down Rule](./no-write-down) -- classification controls credential isolation ला कसे complement करतात
- [Identity & Auth](./identity) -- user identity delegated credential access मध्ये कसे feed होते
- [Audit & Compliance](./audit-logging) -- credential access events कसे recorded होतात
