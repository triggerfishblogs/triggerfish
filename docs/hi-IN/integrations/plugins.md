# Plugin SDK और Sandbox

Triggerfish plugins आपको agent को कस्टम कोड के साथ विस्तारित करने देते हैं जो बाहरी सिस्टम के साथ इंटरैक्ट करता है -- CRM क्वेरीज़, डेटाबेस ऑपरेशन, API एकीकरण, मल्टी-स्टेप वर्कफ़्लो -- जबकि एक डबल sandbox के अंदर चलता है जो कोड को कुछ भी करने से रोकता है जिसकी उसे स्पष्ट रूप से अनुमति नहीं दी गई है।

## रनटाइम वातावरण

Plugins Deno + Pyodide (WASM) पर चलते हैं। कोई Docker नहीं। कोई containers नहीं। Triggerfish इंस्टॉलेशन के अलावा कोई पूर्वापेक्षाएँ नहीं।

- **TypeScript plugins** सीधे Deno sandbox में चलते हैं
- **Python plugins** Pyodide (WebAssembly में संकलित Python interpreter) के अंदर चलते हैं, जो स्वयं Deno sandbox के अंदर चलता है

<img src="/diagrams/plugin-sandbox.svg" alt="Plugin sandbox: Deno sandbox WASM sandbox को लपेटता है, plugin कोड अंतरतम परत में चलता है" style="max-width: 100%;" />

इस डबल-sandbox आर्किटेक्चर का मतलब है कि भले ही किसी plugin में दुर्भावनापूर्ण कोड हो, यह फ़ाइलसिस्टम तक पहुँच नहीं सकता, अघोषित नेटवर्क कॉल नहीं कर सकता, या होस्ट सिस्टम से बच नहीं सकता।

## Plugins क्या कर सकते हैं

Plugins में सख्त सीमाओं के भीतर लचीला आंतरिक भाग है। Sandbox के अंदर, आपका plugin:

- लक्ष्य सिस्टम पर पूर्ण CRUD ऑपरेशन कर सकता है (उपयोगकर्ता की अनुमतियों का उपयोग करके)
- जटिल क्वेरीज़ और डेटा रूपांतरण निष्पादित कर सकता है
- मल्टी-स्टेप वर्कफ़्लो संचालित कर सकता है
- डेटा संसाधित और विश्लेषित कर सकता है
- आमंत्रणों में plugin स्थिति बनाए रख सकता है
- किसी भी घोषित बाहरी API endpoint को कॉल कर सकता है

## Plugins क्या नहीं कर सकते

| प्रतिबंध                                    | कैसे लागू किया जाता है                                            |
| ------------------------------------------- | ----------------------------------------------------------------- |
| अघोषित नेटवर्क endpoints तक पहुँच           | Sandbox allowlist पर न होने वाली सभी नेटवर्क कॉल को अवरुद्ध करता है |
| Classification लेबल के बिना डेटा उत्सर्जित  | SDK अवर्गीकृत डेटा को अस्वीकार करता है                            |
| Taint प्रसार के बिना डेटा पढ़ें             | डेटा एक्सेस होने पर SDK स्वचालित रूप से session को taint करता है   |
| Triggerfish के बाहर डेटा बनाए रखें          | Sandbox के भीतर से कोई फ़ाइलसिस्टम एक्सेस नहीं                   |
| साइड channels के माध्यम से डेटा निकालें     | संसाधन सीमाएँ लागू, कोई रॉ socket एक्सेस नहीं                    |
| सिस्टम क्रेडेंशियल का उपयोग                | SDK `get_system_credential()` को अवरुद्ध करता है; केवल उपयोगकर्ता क्रेडेंशियल |

::: warning सुरक्षा `sdk.get_system_credential()` डिज़ाइन द्वारा **अवरुद्ध** है। Plugins को हमेशा `sdk.get_user_credential()` के माध्यम से प्रत्यायोजित उपयोगकर्ता क्रेडेंशियल का उपयोग करना चाहिए। यह सुनिश्चित करता है कि agent केवल वही एक्सेस कर सकता है जो उपयोगकर्ता एक्सेस कर सकता है -- कभी अधिक नहीं। :::

## Plugin SDK विधियाँ

SDK plugins को बाहरी सिस्टम और Triggerfish प्लेटफ़ॉर्म के साथ इंटरैक्ट करने के लिए एक नियंत्रित इंटरफ़ेस प्रदान करता है।

### क्रेडेंशियल एक्सेस

```typescript
// किसी सेवा के लिए उपयोगकर्ता का प्रत्यायोजित क्रेडेंशियल प्राप्त करें
const credential = await sdk.get_user_credential("salesforce");

// जाँचें कि उपयोगकर्ता ने कोई सेवा कनेक्ट की है
const connected = await sdk.has_user_connection("notion");
```

`sdk.get_user_credential(service)` नामित सेवा के लिए उपयोगकर्ता का OAuth token या API key प्राप्त करता है। यदि उपयोगकर्ता ने सेवा कनेक्ट नहीं की है, तो कॉल `null` लौटाता है और plugin को इसे सुचारू रूप से संभालना चाहिए।

### डेटा ऑपरेशन

```typescript
// उपयोगकर्ता की अनुमतियों का उपयोग करके बाहरी सिस्टम से क्वेरी करें
const results = await sdk.query_as_user("salesforce", {
  query: "SELECT Name, Amount FROM Opportunity WHERE StageName = 'Closed Won'",
});

// Agent को डेटा वापस भेजें — classification लेबल आवश्यक है
sdk.emitData({
  classification: "CONFIDENTIAL",
  payload: results,
  source: "salesforce",
});
```

::: info `sdk.emitData()` के प्रत्येक कॉल के लिए `classification` लेबल आवश्यक है। यदि आप इसे छोड़ते हैं, तो SDK कॉल को अस्वीकार करता है। यह सुनिश्चित करता है कि plugins से agent संदर्भ में प्रवाहित होने वाला सभी डेटा ठीक से वर्गीकृत है। :::

### कनेक्शन जाँच

```typescript
// जाँचें कि उपयोगकर्ता का किसी सेवा से लाइव कनेक्शन है
if (await sdk.has_user_connection("github")) {
  const repos = await sdk.query_as_user("github", {
    endpoint: "/user/repos",
  });
  sdk.emitData({
    classification: "INTERNAL",
    payload: repos,
    source: "github",
  });
}
```

## Plugin जीवनचक्र

प्रत्येक plugin एक जीवनचक्र का पालन करता है जो सक्रियण से पहले सुरक्षा समीक्षा सुनिश्चित करता है।

```
1. Plugin बनाया गया (उपयोगकर्ता, agent, या तृतीय पक्ष द्वारा)
       |
       v
2. Plugin SDK का उपयोग करके बनाया गया
   - आवश्यक interfaces लागू करना होगा
   - Endpoints और क्षमताओं की घोषणा करनी होगी
   - सत्यापन पास करना होगा
       |
       v
3. Plugin UNTRUSTED स्थिति में प्रवेश करता है
   - Agent इसका उपयोग नहीं कर सकता
   - Owner/admin को सूचित किया जाता है: "वर्गीकरण लंबित"
       |
       v
4. Owner (व्यक्तिगत) या admin (एंटरप्राइज़) समीक्षा करता है:
   - यह plugin कौन सा डेटा एक्सेस करता है?
   - यह क्या क्रियाएँ कर सकता है?
   - Classification स्तर असाइन करता है
       |
       v
5. Plugin असाइन किए गए classification पर सक्रिय
   - Agent policy बाधाओं के भीतर लागू कर सकता है
   - सभी आमंत्रण policy hooks से गुज़रते हैं
```

::: tip व्यक्तिगत स्तर में, आप owner हैं -- आप अपने स्वयं के plugins की समीक्षा और वर्गीकरण करते हैं। एंटरप्राइज़ स्तर में, एक admin plugin रजिस्ट्री प्रबंधित करता है और classification स्तर असाइन करता है। :::

## डेटाबेस कनेक्टिविटी

नेटिव डेटाबेस ड्राइवर (psycopg2, mysqlclient, आदि) WASM sandbox के अंदर काम नहीं करते। Plugins इसके बजाय HTTP-आधारित APIs के माध्यम से डेटाबेस से कनेक्ट करते हैं।

| डेटाबेस   | HTTP-आधारित विकल्प                |
| ---------- | --------------------------------- |
| PostgreSQL | PostgREST, Supabase SDK, Neon API |
| MySQL      | PlanetScale API                   |
| MongoDB    | Atlas Data API                    |
| Snowflake  | REST API                          |
| BigQuery   | REST API                          |
| DynamoDB   | AWS SDK (HTTP)                    |

यह एक सुरक्षा लाभ है, सीमा नहीं। सभी डेटाबेस एक्सेस निरीक्षण योग्य, नियंत्रणीय HTTP अनुरोधों के माध्यम से प्रवाहित होता है जिसे sandbox लागू कर सकता है और ऑडिट सिस्टम लॉग कर सकता है।

## TypeScript Plugin लिखना

REST API क्वेरी करने वाला एक न्यूनतम TypeScript plugin:

```typescript
import type { PluginResult, PluginSdk } from "triggerfish/plugin";

export async function execute(sdk: PluginSdk): Promise<PluginResult> {
  // जाँचें कि उपयोगकर्ता ने सेवा कनेक्ट की है
  if (!await sdk.has_user_connection("acme-api")) {
    return {
      success: false,
      error: "User has not connected Acme API. Please connect it first.",
    };
  }

  // उपयोगकर्ता के क्रेडेंशियल का उपयोग करके क्वेरी करें
  const data = await sdk.query_as_user("acme-api", {
    endpoint: "/api/v1/tasks",
    method: "GET",
  });

  // Agent को वर्गीकृत डेटा वापस भेजें
  sdk.emitData({
    classification: "INTERNAL",
    payload: data,
    source: "acme-api",
  });

  return { success: true };
}
```

## Python Plugin लिखना

एक न्यूनतम Python plugin:

```python
async def execute(sdk):
    # कनेक्शन जाँचें
    if not await sdk.has_user_connection("analytics-db"):
        return {"success": False, "error": "Analytics DB not connected"}

    # उपयोगकर्ता के क्रेडेंशियल का उपयोग करके क्वेरी करें
    results = await sdk.query_as_user("analytics-db", {
        "endpoint": "/rest/v1/metrics",
        "method": "GET",
        "params": {"period": "7d"}
    })

    # Classification के साथ उत्सर्जित करें
    sdk.emit_data({
        "classification": "CONFIDENTIAL",
        "payload": results,
        "source": "analytics-db"
    })

    return {"success": True}
```

Python plugins Pyodide WASM रनटाइम के अंदर चलते हैं। मानक पुस्तकालय मॉड्यूल उपलब्ध हैं, लेकिन नेटिव C एक्सटेंशन नहीं। बाहरी कनेक्टिविटी के लिए HTTP-आधारित APIs का उपयोग करें।

## Plugin सुरक्षा सारांश

- Plugins सख्त isolation के साथ डबल sandbox (Deno + WASM) में चलते हैं
- सभी नेटवर्क एक्सेस plugin manifest में घोषित होना चाहिए
- सभी उत्सर्जित डेटा में classification लेबल होना चाहिए
- सिस्टम क्रेडेंशियल अवरुद्ध हैं -- केवल उपयोगकर्ता-प्रत्यायोजित क्रेडेंशियल उपलब्ध हैं
- प्रत्येक plugin `UNTRUSTED` के रूप में सिस्टम में प्रवेश करता है और उपयोग से पहले वर्गीकृत होना चाहिए
- सभी plugin आमंत्रण policy hooks से गुज़रते हैं और पूरी तरह से ऑडिट किए जाते हैं
