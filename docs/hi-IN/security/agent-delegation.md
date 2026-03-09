# Agent Delegation

जैसे-जैसे AI agents एक-दूसरे के साथ इंटरैक्ट करते हैं -- एक agent दूसरे को
subtasks पूरा करने के लिए कॉल करता है -- सुरक्षा जोखिमों का एक नया वर्ग उभरता
है। Triggerfish क्रिप्टोग्राफ़िक agent पहचान, वर्गीकरण सीमाओं, और अनिवार्य taint
विरासत से इसे रोकता है।

## Agent प्रमाणपत्र

प्रत्येक agent का एक प्रमाणपत्र होता है जो उसकी पहचान, क्षमताएँ, और delegation
अनुमतियाँ परिभाषित करता है।

```json
{
  "agent_id": "agent_abc123",
  "agent_name": "Sales Assistant",
  "capabilities": {
    "integrations": ["salesforce", "slack", "email"],
    "max_classification": "CONFIDENTIAL"
  },
  "delegation": {
    "can_invoke_agents": true,
    "can_be_invoked_by": ["agent_def456", "agent_ghi789"],
    "max_delegation_depth": 3
  },
  "signature": "ed25519:xyz..."
}
```

| फ़ील्ड                   | उद्देश्य                                                                |
| ----------------------- | ----------------------------------------------------------------------- |
| `max_classification`    | **वर्गीकरण सीमा** -- agent किस उच्चतम taint स्तर पर संचालित हो सकता है |
| `can_invoke_agents`     | क्या यह agent अन्य agents को कॉल करने की अनुमति रखता है                  |
| `can_be_invoked_by`     | इसे आह्वान करने वाले agents की स्पष्ट allowlist                         |
| `max_delegation_depth`  | Agent आह्वान श्रृंखला की अधिकतम गहराई                                   |

## सुरक्षा अपरिवर्तनीय

| अपरिवर्तनीय                      | प्रवर्तन                                                                              |
| -------------------------------- | -------------------------------------------------------------------------------------- |
| **Taint केवल बढ़ती है**           | प्रत्येक callee `max(स्वयं की taint, caller taint)` विरासत में लेता है                  |
| **सीमा का सम्मान**               | यदि caller की taint callee की `max_classification` सीमा से अधिक है तो agent आह्वान अवरुद्ध |
| **गहराई सीमा लागू**              | श्रृंखला `max_delegation_depth` पर समाप्त होती है                                       |
| **वृत्ताकार आह्वान अवरुद्ध**     | एक agent एक ही श्रृंखला में दो बार प्रकट नहीं हो सकता                                   |

## डेटा लॉन्ड्रिंग रोकना

### हमला

```
हमलावर लक्ष्य: PUBLIC चैनल के माध्यम से CONFIDENTIAL डेटा निष्कासित करना

1. Agent A Salesforce एक्सेस करता है (taint --> CONFIDENTIAL)
2. Agent A Agent B को आह्वान करता है (जिसके पास PUBLIC चैनल है)
3. Agent B डेटा PUBLIC चैनल पर भेजता है
```

### यह विफल क्यों होता है

**अवरोध बिंदु 1:** यदि Agent B की सीमा CONFIDENTIAL से नीचे है, आह्वान अवरुद्ध।

**अवरोध बिंदु 2:** भले ही आह्वान सफल हो, Agent B Agent A की CONFIDENTIAL taint
विरासत में लेता है। जब Agent B PUBLIC चैनल पर आउटपुट करने का प्रयास करता है,
`PRE_OUTPUT` hook write-down अवरुद्ध करता है।

**अवरोध बिंदु 3:** Delegation श्रृंखला में agents अपनी taint रीसेट नहीं कर सकते।

::: danger डेटा agent delegation के माध्यम से अपने वर्गीकरण से बच नहीं सकता।
सीमा जाँच, अनिवार्य taint विरासत, और श्रृंखलाओं में no-taint-reset का संयोजन
agent chains के माध्यम से डेटा लॉन्ड्रिंग को असंभव बनाता है। :::

## संबंधित पृष्ठ

- [सुरक्षा-प्रथम डिज़ाइन](./) -- सुरक्षा आर्किटेक्चर का अवलोकन
- [No Write-Down नियम](./no-write-down) -- वर्गीकरण प्रवाह नियम
- [पहचान और प्रमाणीकरण](./identity) -- उपयोगकर्ता और चैनल पहचान
- [ऑडिट और अनुपालन](./audit-logging) -- delegation chains कैसे ऑडिट लॉग में रिकॉर्ड होती हैं
