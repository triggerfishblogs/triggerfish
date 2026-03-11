# Session प्रबंधन

Agent sessions की निरीक्षण, संचार, और spawn कर सकता है। ये tools क्रॉस-session
workflows, पृष्ठभूमि कार्य प्रत्यायोजन, और क्रॉस-चैनल मैसेजिंग सक्षम करते हैं
-- सब write-down प्रवर्तन के अधीन।

## Tools

### `sessions_list`

वर्तमान session को दिखाई देने वाले सभी सक्रिय sessions सूचीबद्ध करें।

कोई parameters नहीं लेता। परिणाम taint स्तर द्वारा filtered होते हैं -- `PUBLIC`
session `CONFIDENTIAL` session metadata नहीं देख सकता।

### `sessions_history`

ID द्वारा session का संदेश इतिहास प्राप्त करें।

| Parameter    | Type   | आवश्यक | विवरण                                   |
| ------------ | ------ | ------ | --------------------------------------- |
| `session_id` | string | हाँ    | इतिहास प्राप्त करने के लिए session ID      |

यदि लक्ष्य session का taint caller के taint से ऊँचा है तो पहुँच अस्वीकार की
जाती है।

### `sessions_send`

वर्तमान session से दूसरे session में सामग्री भेजें। Write-down प्रवर्तन के
अधीन।

| Parameter    | Type   | आवश्यक | विवरण                        |
| ------------ | ------ | ------ | ---------------------------- |
| `session_id` | string | हाँ    | लक्ष्य session ID              |
| `content`    | string | हाँ    | भेजने के लिए संदेश सामग्री      |

**Write-down जाँच:** Caller का taint लक्ष्य session के classification स्तर तक
प्रवाहित होने में सक्षम होना चाहिए। `CONFIDENTIAL` session `PUBLIC` session को
डेटा नहीं भेज सकता।

### `sessions_spawn`

एक स्वायत्त कार्य के लिए नया पृष्ठभूमि session spawn करें।

| Parameter | Type   | आवश्यक | विवरण                                                    |
| --------- | ------ | ------ | -------------------------------------------------------- |
| `task`    | string | हाँ    | पृष्ठभूमि session को क्या करना चाहिए इसका विवरण              |

Spawned session स्वतंत्र `PUBLIC` taint और अपने अलग workspace के साथ शुरू होता
है। यह स्वायत्त रूप से चलता है और पूर्ण होने पर परिणाम लौटाता है।

### `session_status`

किसी विशिष्ट session के लिए metadata और स्थिति प्राप्त करें।

| Parameter    | Type   | आवश्यक | विवरण                      |
| ------------ | ------ | ------ | -------------------------- |
| `session_id` | string | हाँ    | जाँचने के लिए session ID      |

Session ID, चैनल, उपयोगकर्ता, taint स्तर, और निर्माण समय लौटाता है। पहुँच
taint-gated है।

### `message`

चैनल और प्राप्तकर्ता को संदेश भेजें। Policy hooks के माध्यम से write-down
प्रवर्तन के अधीन।

| Parameter   | Type   | आवश्यक | विवरण                                        |
| ----------- | ------ | ------ | -------------------------------------------- |
| `channel`   | string | हाँ    | लक्ष्य चैनल (जैसे `telegram`, `slack`)         |
| `recipient` | string | हाँ    | चैनल में प्राप्तकर्ता पहचानकर्ता                |
| `text`      | string | हाँ    | भेजने के लिए संदेश text                         |

### `summarize`

वर्तमान वार्तालाप का संक्षिप्त सारांश उत्पन्न करें। Handoff नोट्स बनाने, संदर्भ
संपीड़ित करने, या दूसरे चैनल पर डिलीवरी के लिए recap तैयार करने में उपयोगी।

| Parameter | Type   | आवश्यक | विवरण                                             |
| --------- | ------ | ------ | ------------------------------------------------- |
| `scope`   | string | नहीं   | क्या सारांशित करना है: `session` (डिफ़ॉल्ट), `topic` |

### `simulate_tool_call`

Tool को निष्पादित किए बिना policy engine के निर्णय का पूर्वावलोकन करने के लिए
tool call simulate करें। Hook मूल्यांकन परिणाम (ALLOW, BLOCK, या REDACT) और
मूल्यांकित नियम लौटाता है।

| Parameter   | Type   | आवश्यक | विवरण                                    |
| ----------- | ------ | ------ | ---------------------------------------- |
| `tool_name` | string | हाँ    | Simulate करने के लिए tool                   |
| `args`      | object | नहीं   | Simulation में शामिल करने के लिए arguments   |

::: tip निष्पादित करने से पहले यह जाँचने के लिए `simulate_tool_call` उपयोग करें
कि tool call अनुमत होगी या नहीं। यह बिना side effects के policy व्यवहार समझने
के लिए उपयोगी है। :::

## उपयोग मामले

### पृष्ठभूमि कार्य प्रत्यायोजन

Agent वर्तमान वार्तालाप को अवरुद्ध किए बिना लंबे समय तक चलने वाले कार्य को
संभालने के लिए एक पृष्ठभूमि session spawn कर सकता है:

```
User: "प्रतिस्पर्धी मूल्य निर्धारण पर शोध करें और एक सारांश तैयार करें"
Agent: [कार्य के साथ sessions_spawn कॉल करता है]
Agent: "मैंने उस पर शोध करने के लिए एक पृष्ठभूमि session शुरू किया है। शीघ्र ही परिणाम होंगे।"
```

### क्रॉस-Session संचार

Sessions एक-दूसरे को डेटा भेज सकते हैं, ऐसे workflows सक्षम करते हैं जहाँ
एक session डेटा उत्पन्न करता है जो दूसरा उपभोग करता है:

```
पृष्ठभूमि session शोध पूर्ण करता है → पैरेंट को sessions_send → पैरेंट उपयोगकर्ता को सूचित करता है
```

### क्रॉस-चैनल मैसेजिंग

`message` tool agent को किसी भी कनेक्टेड चैनल पर सक्रिय रूप से संपर्क करने देता है:

```
Agent एक तत्काल event पता लगाता है → message({ channel: "telegram", recipient: "owner", text: "Alert: ..." })
```

## सुरक्षा

- सभी session operations taint-gated हैं: आप अपने taint स्तर से ऊपर sessions
  देख, पढ़, या भेज नहीं सकते
- `sessions_send` write-down रोकथाम प्रवर्तित करता है: डेटा निम्न classification
  में प्रवाहित नहीं हो सकता
- Spawned sessions स्वतंत्र taint ट्रैकिंग के साथ `PUBLIC` taint पर शुरू होते हैं
- `message` tool डिलीवरी से पहले `PRE_OUTPUT` policy hooks से गुज़रता है
- Session IDs runtime context से inject किए जाते हैं, LLM arguments से नहीं --
  agent दूसरे session का रूप नहीं ले सकता

::: warning सुरक्षा सभी क्रॉस-session संचार पर write-down रोकथाम प्रवर्तित है।
`CONFIDENTIAL` पर tainted session `PUBLIC` session या चैनल को डेटा नहीं भेज सकता।
यह policy परत द्वारा प्रवर्तित एक कठोर सीमा है। :::
