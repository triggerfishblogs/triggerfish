# Multi-Agent रूटिंग

Triggerfish विभिन्न चैनलों, खातों, या संपर्कों को अलग-अलग agents तक रूटिंग का
समर्थन करता है, प्रत्येक का अपना workspace, sessions, व्यक्तित्व, और
classification ceiling होता है।

## कई Agents क्यों?

एकल व्यक्तित्व वाला एक agent हमेशा पर्याप्त नहीं होता। आप चाह सकते हैं:

- WhatsApp पर एक **व्यक्तिगत सहायक** जो कैलेंडर, रिमाइंडर, और परिवार के
  संदेश संभाले।
- Slack पर एक **कार्य सहायक** जो Jira tickets, GitHub PRs, और code reviews
  प्रबंधित करे।
- Discord पर एक **support agent** जो अलग tone और सीमित पहुँच के साथ community
  प्रश्नों का उत्तर दे।

Multi-agent रूटिंग आपको एक Triggerfish installation से ये सभी एक साथ चलाने देती
है।

## यह कैसे काम करता है

<img src="/diagrams/multi-agent-routing.svg" alt="Multi-agent रूटिंग: इनबाउंड चैनल AgentRouter के माध्यम से अलग agent workspaces तक रूट किए जाते हैं" style="max-width: 100%;" />

**AgentRouter** प्रत्येक इनबाउंड संदेश की जाँच करता है और कॉन्फ़िगर करने योग्य
रूटिंग नियमों के आधार पर इसे एक agent से मैप करता है। यदि कोई नियम मेल नहीं
खाता, तो संदेश डिफ़ॉल्ट agent को जाते हैं।

## रूटिंग नियम

संदेशों को इनके द्वारा रूट किया जा सकता है:

| मानदंड    | विवरण                                    | उदाहरण                                     |
| --------- | ---------------------------------------- | ------------------------------------------- |
| Channel   | मैसेजिंग प्लेटफ़ॉर्म द्वारा रूट          | सभी Slack संदेश "Work" को जाते हैं           |
| Account   | चैनल के भीतर विशिष्ट खाते द्वारा रूट     | कार्य email बनाम व्यक्तिगत email             |
| Contact   | प्रेषक/peer पहचान द्वारा रूट              | आपके प्रबंधक के संदेश "Work" को जाते हैं     |
| Default   | जब कोई नियम मेल नहीं खाता तो Fallback    | बाकी सब "Personal" को जाता है               |

## कॉन्फ़िगरेशन

`triggerfish.yaml` में agents और रूटिंग परिभाषित करें:

```yaml
agents:
  list:
    - id: personal
      name: "Personal Assistant"
      channels: [whatsapp-personal, telegram-dm]
      tools:
        profile: "full"
      model: claude-opus-4-5
      classification_ceiling: PERSONAL

    - id: work
      name: "Work Assistant"
      channels: [slack-work, email-work]
      tools:
        profile: "coding"
        allow: [browser, github]
      model: claude-sonnet-4-5
      classification_ceiling: CONFIDENTIAL

    - id: support
      name: "Customer Support"
      channels: [discord-server]
      tools:
        profile: "messaging"
      model: claude-haiku-4-5
      classification_ceiling: PUBLIC
```

प्रत्येक agent निर्दिष्ट करता है:

- **id** -- रूटिंग के लिए अद्वितीय पहचानकर्ता।
- **name** -- मानव-पठनीय नाम।
- **channels** -- यह agent कौन से चैनल instances संभालता है।
- **tools** -- Tool profile और स्पष्ट allow/deny सूचियाँ।
- **model** -- कौन सा LLM model उपयोग करना है (प्रति agent अलग हो सकता है)।
- **classification_ceiling** -- यह agent किस अधिकतम classification स्तर तक पहुँच
  सकता है।

## Agent पहचान

प्रत्येक agent का अपना `SPINE.md` होता है जो उसके व्यक्तित्व, मिशन, और सीमाओं
को परिभाषित करता है। SPINE.md फ़ाइलें agent के workspace directory में रहती हैं:

```
~/.triggerfish/
  workspace/
    personal/
      SPINE.md          # व्यक्तिगत सहायक व्यक्तित्व
    work/
      SPINE.md          # कार्य सहायक व्यक्तित्व
    support/
      SPINE.md          # Support bot व्यक्तित्व
```

## अलगाव

Multi-agent रूटिंग agents के बीच सख्त अलगाव प्रवर्तित करती है:

| पहलू        | अलगाव                                                                                       |
| ------------ | -------------------------------------------------------------------------------------------- |
| Sessions     | प्रत्येक agent का स्वतंत्र session स्थान है। Sessions कभी साझा नहीं किए जाते।                 |
| Taint        | Taint प्रति-agent ट्रैक किया जाता है, agents के बीच नहीं। कार्य taint व्यक्तिगत sessions को प्रभावित नहीं करता। |
| Skills       | Skills प्रति-workspace लोड होते हैं। कार्य skill व्यक्तिगत agent को उपलब्ध नहीं है।           |
| Secrets      | Credentials प्रति-agent अलग हैं। Support agent कार्य API keys तक नहीं पहुँच सकता।            |
| Workspaces   | प्रत्येक agent का code execution के लिए अपना filesystem workspace है।                        |

::: warning अंतर-agent संचार `sessions_send` के माध्यम से संभव है लेकिन policy
परत द्वारा gated है। एक agent स्पष्ट policy नियमों के बिना दूसरे agent के डेटा
या sessions तक चुपचाप पहुँच नहीं सकता। :::

::: tip Multi-agent रूटिंग चैनलों और personas में चिंताओं को अलग करने के लिए है।
उन agents के लिए जिन्हें एक साझा कार्य पर सहयोग करने की आवश्यकता है,
[Agent Teams](/hi-IN/features/agent-teams) देखें। :::

## डिफ़ॉल्ट Agent

जब कोई रूटिंग नियम इनबाउंड संदेश से मेल नहीं खाता, यह डिफ़ॉल्ट agent को जाता
है। आप इसे कॉन्फ़िगरेशन में सेट कर सकते हैं:

```yaml
agents:
  default: personal
```

यदि कोई डिफ़ॉल्ट कॉन्फ़िगर नहीं है, सूची में पहला agent डिफ़ॉल्ट के रूप में
उपयोग किया जाता है।
