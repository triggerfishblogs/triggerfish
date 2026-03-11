# MCP Gateway

> किसी भी MCP server का उपयोग करें। हम सीमा को सुरक्षित करते हैं।

Model Context Protocol (MCP) agent-to-tool संचार के लिए उभरता हुआ मानक है। Triggerfish एक सुरक्षित MCP Gateway प्रदान करता है जो आपको classification नियंत्रण, tool-स्तरीय अनुमतियाँ, taint ट्रैकिंग, और पूर्ण ऑडिट लॉगिंग लागू करते हुए किसी भी MCP-संगत server से जुड़ने देता है।

आप MCP servers लाएँ। Triggerfish सीमा पार करने वाले प्रत्येक अनुरोध और प्रतिक्रिया को सुरक्षित करता है।

## यह कैसे काम करता है

MCP Gateway आपके agent और किसी भी MCP server के बीच बैठता है। प्रत्येक tool कॉल बाहरी server तक पहुँचने से पहले policy प्रवर्तन परत से गुज़रता है, और प्रत्येक प्रतिक्रिया agent संदर्भ में प्रवेश करने से पहले वर्गीकृत की जाती है।

<img src="/diagrams/mcp-gateway-flow.svg" alt="MCP Gateway प्रवाह: Agent → MCP Gateway → Policy Layer → MCP Server, BLOCKED तक deny पथ के साथ" style="max-width: 100%;" />

Gateway पाँच मूल कार्य प्रदान करता है:

1. **Server प्रमाणीकरण और classification** -- MCP servers को उपयोग से पहले समीक्षा और वर्गीकृत किया जाना चाहिए
2. **Tool-स्तरीय अनुमति प्रवर्तन** -- व्यक्तिगत tools को अनुमत, प्रतिबंधित, या अवरुद्ध किया जा सकता है
3. **अनुरोध/प्रतिक्रिया taint ट्रैकिंग** -- Server classification के आधार पर session taint बढ़ता है
4. **Schema सत्यापन** -- सभी अनुरोध और प्रतिक्रियाएँ घोषित schemas के विरुद्ध सत्यापित
5. **ऑडिट लॉगिंग** -- प्रत्येक tool कॉल, निर्णय, और taint परिवर्तन रिकॉर्ड किया जाता है

## MCP Server स्थितियाँ

सभी MCP servers `UNTRUSTED` पर डिफ़ॉल्ट हैं। Agent उन्हें लागू करने से पहले उन्हें स्पष्ट रूप से वर्गीकृत किया जाना चाहिए।

| स्थिति       | विवरण                                                                    | Agent लागू कर सकता है? |
| ------------ | ------------------------------------------------------------------------ | :--------------------: |
| `UNTRUSTED`  | नए servers के लिए डिफ़ॉल्ट। समीक्षा लंबित।                              |         नहीं           |
| `CLASSIFIED` | समीक्षित और प्रति-tool अनुमतियों के साथ classification स्तर असाइन किया। | हाँ (policy के भीतर)  |
| `BLOCKED`    | Admin द्वारा स्पष्ट रूप से प्रतिबंधित।                                  |         नहीं           |

<img src="/diagrams/state-machine.svg" alt="MCP server स्थिति मशीन: UNTRUSTED → CLASSIFIED या BLOCKED" style="max-width: 100%;" />

::: warning सुरक्षा एक `UNTRUSTED` MCP server को किसी भी परिस्थिति में agent द्वारा लागू नहीं किया जा सकता। LLM अवर्गीकृत server का उपयोग करने के लिए अनुरोध, मनाने, या सिस्टम को धोखा नहीं दे सकता। Classification एक कोड-स्तरीय गेट है, LLM निर्णय नहीं। :::

## कॉन्फ़िगरेशन

MCP servers `triggerfish.yaml` में server ID द्वारा कुंजीकृत मैप के रूप में कॉन्फ़िगर किए जाते हैं। प्रत्येक server या तो स्थानीय subprocess (stdio ट्रांसपोर्ट) या रिमोट endpoint (SSE ट्रांसपोर्ट) का उपयोग करता है।

### स्थानीय Servers (Stdio)

स्थानीय servers subprocesses के रूप में शुरू किए जाते हैं। Triggerfish stdin/stdout के माध्यम से उनसे संवाद करता है।

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC
```

### रिमोट Servers (SSE)

रिमोट servers कहीं और चलते हैं और HTTP Server-Sent Events के माध्यम से एक्सेस किए जाते हैं।

```yaml
mcp_servers:
  remote_api:
    url: "https://mcp.example.com/sse"
    classification: CONFIDENTIAL
```

### कॉन्फ़िगरेशन कुंजियाँ

| कुंजी             | प्रकार   | आवश्यक      | विवरण                                                                          |
| ----------------- | -------- | ----------- | ------------------------------------------------------------------------------ |
| `command`         | string   | हाँ (stdio) | शुरू करने के लिए बाइनरी (जैसे, `npx`, `deno`, `node`)                         |
| `args`            | string[] | नहीं        | कमांड को पास किए गए आर्गुमेंट                                                |
| `env`             | map      | नहीं        | Subprocess के लिए environment variables                                        |
| `url`             | string   | हाँ (SSE)   | रिमोट servers के लिए HTTP endpoint                                             |
| `classification`  | string   | **हाँ**     | डेटा संवेदनशीलता स्तर: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, या `RESTRICTED` |
| `enabled`         | boolean  | नहीं        | डिफ़ॉल्ट: `true`। कॉन्फ़िगरेशन हटाए बिना छोड़ने के लिए `false` सेट करें।     |

प्रत्येक server में या तो `command` (स्थानीय) या `url` (रिमोट) होना चाहिए। दोनों के बिना servers छोड़ दिए जाते हैं।

### आलसी कनेक्शन

MCP servers स्टार्टअप के बाद पृष्ठभूमि में कनेक्ट होते हैं। अपने agent का उपयोग करने से पहले आपको सभी servers के तैयार होने की प्रतीक्षा करने की आवश्यकता नहीं है।

- Servers एक्सपोनेंशियल बैकऑफ़ के साथ पुनः प्रयास करते हैं: 2s → 4s → 8s → 30s अधिकतम
- नए servers कनेक्ट होने पर agent के लिए उपलब्ध हो जाते हैं -- किसी session पुनः आरंभ की आवश्यकता नहीं
- यदि कोई server सभी पुनः प्रयासों के बाद कनेक्ट होने में विफल रहता है, तो यह `failed` स्थिति में प्रवेश करता है और अगले daemon पुनः आरंभ पर पुनः प्रयास किया जा सकता है

CLI और Tidepool इंटरफ़ेस वास्तविक-समय MCP कनेक्शन स्थिति प्रदर्शित करते हैं। विवरण के लिए [CLI Channel](/hi-IN/channels/cli#mcp-server-status) देखें।

### Server अक्षम करना

किसी MCP server को उसका कॉन्फ़िगरेशन हटाए बिना अस्थायी रूप से अक्षम करने के लिए:

```yaml
mcp_servers:
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    classification: CONFIDENTIAL
    enabled: false # स्टार्टअप के दौरान छोड़ दिया जाता है
```

### Environment Variables और Secrets

`keychain:` उपसर्ग वाले Env मान स्टार्टअप पर OS keychain से हल किए जाते हैं:

```yaml
env:
  API_KEY: "keychain:my-secret-name" # OS keychain से हल किया गया
  PLAIN_VAR: "literal-value" # जैसा है वैसा पास किया गया
```

होस्ट environment से केवल `PATH` विरासत में मिलता है (ताकि `npx`, `node`, `deno`, आदि सही ढंग से हल हों)। कोई अन्य होस्ट environment variables MCP server subprocesses में लीक नहीं होते।

::: tip `triggerfish config set-secret <name> <value>` के साथ secrets संग्रहीत करें। फिर अपने MCP server env कॉन्फ़िगरेशन में `keychain:<name>` के रूप में उनका संदर्भ दें। :::

### Tool नामकरण

MCP servers के tools को बिल्ट-इन tools के साथ टकराव से बचने के लिए `mcp_<serverId>_<toolName>` के रूप में नामस्थान दिया जाता है। उदाहरण के लिए, यदि `github` नामक server `list_repos` नामक tool प्रदान करता है, तो agent इसे `mcp_github_list_repos` के रूप में देखता है।

### Classification और Default Deny

यदि आप `classification` छोड़ते हैं, तो server **UNTRUSTED** के रूप में पंजीकृत होता है और gateway सभी tool कॉल को अस्वीकार करता है। आपको स्पष्ट रूप से एक classification स्तर चुनना होगा। सही स्तर चुनने में सहायता के लिए [Classification गाइड](/guide/classification-guide) देखें।

## Tool कॉल प्रवाह

जब agent MCP tool कॉल का अनुरोध करता है, gateway अनुरोध अग्रेषित करने से पहले जाँचों का एक नियतात्मक अनुक्रम निष्पादित करता है।

### 1. पूर्व-उड़ान जाँचें

सभी जाँचें नियतात्मक हैं -- कोई LLM कॉल नहीं, कोई यादृच्छिकता नहीं।

| जाँच                                                  | विफलता परिणाम                           |
| ----------------------------------------------------- | ---------------------------------------- |
| Server की स्थिति `CLASSIFIED` है?                     | अवरोध: "Server स्वीकृत नहीं"           |
| इस server के लिए tool अनुमत है?                       | अवरोध: "Tool अनुमत नहीं"               |
| उपयोगकर्ता के पास आवश्यक अनुमतियाँ हैं?               | अवरोध: "अनुमति अस्वीकृत"               |
| Session taint server classification के साथ संगत है?    | अवरोध: "Write-down का उल्लंघन होगा"    |
| Schema सत्यापन पास?                                   | अवरोध: "अमान्य पैरामीटर"               |

::: info यदि session taint server classification से अधिक है, तो write-down को रोकने के लिए कॉल अवरुद्ध है। `CONFIDENTIAL` पर tainted session `PUBLIC` MCP server को डेटा नहीं भेज सकता। :::

### 2. निष्पादन

यदि सभी पूर्व-उड़ान जाँचें पास हो जाती हैं, तो gateway अनुरोध को MCP server को अग्रेषित करता है।

### 3. प्रतिक्रिया प्रसंस्करण

जब MCP server प्रतिक्रिया लौटाता है:

- घोषित schema के विरुद्ध प्रतिक्रिया सत्यापित करें
- Server के classification स्तर पर प्रतिक्रिया डेटा वर्गीकृत करें
- Session taint अपडेट करें: `taint = max(current_taint, server_classification)`
- डेटा मूल को ट्रैक करने वाला lineage रिकॉर्ड बनाएँ

### 4. ऑडिट

प्रत्येक tool कॉल लॉग किया जाता है: server पहचान, tool नाम, उपयोगकर्ता पहचान, policy निर्णय, taint परिवर्तन, और टाइमस्टैम्प।

## प्रतिक्रिया Taint नियम

MCP server प्रतिक्रियाएँ server का classification स्तर विरासत में लेती हैं। Session taint केवल बढ़ सकता है।

| Server Classification | प्रतिक्रिया Taint | Session प्रभाव                                  |
| --------------------- | ----------------- | ------------------------------------------------ |
| `PUBLIC`              | `PUBLIC`          | कोई taint परिवर्तन नहीं                         |
| `INTERNAL`            | `INTERNAL`        | Taint कम से कम `INTERNAL` तक बढ़ता है            |
| `CONFIDENTIAL`        | `CONFIDENTIAL`    | Taint कम से कम `CONFIDENTIAL` तक बढ़ता है        |
| `RESTRICTED`          | `RESTRICTED`      | Taint `RESTRICTED` तक बढ़ता है                   |

एक बार session किसी दिए गए स्तर पर tainted हो जाता है, तो यह session के शेष भाग के लिए उस स्तर या उससे ऊपर रहता है। Taint कम करने के लिए पूर्ण session रीसेट (जो वार्तालाप इतिहास साफ़ करता है) आवश्यक है।

## उपयोगकर्ता प्रमाणीकरण Passthrough

उपयोगकर्ता-स्तरीय प्रमाणीकरण का समर्थन करने वाले MCP servers के लिए, gateway सिस्टम क्रेडेंशियल के बजाय उपयोगकर्ता के प्रत्यायोजित क्रेडेंशियल पास करता है।

जब कोई tool `requires_user_auth: true` के साथ कॉन्फ़िगर किया जाता है:

1. Gateway जाँचता है कि उपयोगकर्ता ने इस MCP server को कनेक्ट किया है या नहीं
2. सुरक्षित क्रेडेंशियल स्टोर से उपयोगकर्ता का प्रत्यायोजित क्रेडेंशियल प्राप्त करता है
3. MCP अनुरोध headers में उपयोगकर्ता प्रमाणीकरण जोड़ता है
4. MCP server उपयोगकर्ता-स्तरीय अनुमतियाँ लागू करता है

परिणाम: MCP server **उपयोगकर्ता की पहचान** देखता है, सिस्टम पहचान नहीं। अनुमति विरासत MCP सीमा के माध्यम से काम करती है -- agent केवल वही एक्सेस कर सकता है जो उपयोगकर्ता एक्सेस कर सकता है।

::: tip उपयोगकर्ता auth passthrough किसी भी MCP server के लिए पसंदीदा पैटर्न है जो एक्सेस नियंत्रण प्रबंधित करता है। इसका मतलब है कि agent व्यापक सिस्टम एक्सेस के बजाय उपयोगकर्ता की अनुमतियाँ विरासत में लेता है। :::

## Schema सत्यापन

Gateway अग्रेषित करने से पहले सभी MCP अनुरोधों और प्रतिक्रियाओं को घोषित schemas के विरुद्ध सत्यापित करता है:

```typescript
// अनुरोध सत्यापन (सरलीकृत)
function validateMcpRequest(
  serverConfig: McpServerConfig,
  toolName: string,
  params: Record<string, unknown>,
): Result<void, McpError> {
  const toolSchema = serverConfig.getToolSchema(toolName);

  if (!toolSchema) {
    return err(new McpError("Unknown tool"));
  }

  // JSON schema के विरुद्ध params सत्यापित करें
  if (!validateJsonSchema(params, toolSchema.inputSchema)) {
    return err(new McpError("Invalid parameters"));
  }

  // स्ट्रिंग params में injection पैटर्न जाँचें
  for (const [, value] of Object.entries(params)) {
    if (typeof value === "string" && containsInjectionPattern(value)) {
      return err(new McpError("Potential injection detected"));
    }
  }

  return ok(undefined);
}
```

Schema सत्यापन बाहरी server तक पहुँचने से पहले विकृत अनुरोधों को पकड़ता है और स्ट्रिंग पैरामीटर में संभावित injection पैटर्न को फ़्लैग करता है।

## एंटरप्राइज़ नियंत्रण

एंटरप्राइज़ परिनियोजन में MCP server प्रबंधन के लिए अतिरिक्त नियंत्रण हैं:

- **Admin-प्रबंधित server रजिस्ट्री** -- केवल admin-स्वीकृत MCP servers को वर्गीकृत किया जा सकता है
- **प्रति-विभाग tool अनुमतियाँ** -- विभिन्न टीमों के पास अलग-अलग tool एक्सेस हो सकता है
- **अनुपालन लॉगिंग** -- सभी MCP इंटरैक्शन अनुपालन डैशबोर्ड में उपलब्ध
- **Rate limiting** -- प्रति-server और प्रति-tool rate limits
- **Server स्वास्थ्य निगरानी** -- Gateway server उपलब्धता और प्रतिक्रिया समय ट्रैक करता है
