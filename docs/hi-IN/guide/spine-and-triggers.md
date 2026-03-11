# SPINE और ट्रिगर

Triggerfish आपके एजेंट के व्यवहार को परिभाषित करने के लिए दो मार्कडाउन फ़ाइलों का
उपयोग करता है: **SPINE.md** नियंत्रित करता है कि आपका एजेंट कौन है, और
**TRIGGER.md** नियंत्रित करता है कि आपका एजेंट सक्रिय रूप से क्या करता है। दोनों
फ़्रीफ़ॉर्म मार्कडाउन हैं -- आप उन्हें सामान्य अंग्रेज़ी में लिखते हैं।

## SPINE.md -- एजेंट पहचान

`SPINE.md` आपके एजेंट के सिस्टम प्रॉम्प्ट की नींव है। यह एजेंट का नाम, व्यक्तित्व,
मिशन, ज्ञान डोमेन, और सीमाएँ परिभाषित करता है। Triggerfish इस फ़ाइल को हर बार
लोड करता है जब वह एक संदेश प्रसंस्कृत करता है, इसलिए परिवर्तन तुरंत प्रभावी होते हैं।

### फ़ाइल स्थान

```
~/.triggerfish/SPINE.md
```

बहु-एजेंट सेटअप के लिए, प्रत्येक एजेंट का अपना SPINE.md होता है:

```
~/.triggerfish/workspace/<agent-id>/SPINE.md
```

### प्रभावी SPINE.md लिखना

एक अच्छा SPINE.md विशिष्ट होता है। आप अपने एजेंट की भूमिका के बारे में जितने
ठोस होंगे, वह उतना बेहतर प्रदर्शन करेगा। यहाँ एक अनुशंसित संरचना है:

```markdown
# Identity

You are Reef, a personal AI assistant for Sarah.

# Mission

Help Sarah stay organized, informed, and productive. Prioritize calendar
management, email triage, and task tracking.

# Communication Style

- Be concise and direct. No filler.
- Use bullet points for lists of 3+ items.
- When uncertain, say so rather than guessing.

# Domain Knowledge

- Sarah is a product manager at Acme Corp.
- Key tools: Linear for tasks, Google Calendar, Gmail, Slack.

# Boundaries

- Never send messages to external contacts without explicit approval.
- Never make financial transactions.
- Always confirm before deleting or modifying calendar events.
```

### सर्वोत्तम प्रथाएँ

::: tip **व्यक्तित्व के बारे में विशिष्ट रहें।** "सहायक बनो" के बजाय, "संक्षिप्त,
सीधे, और स्पष्टता के लिए बुलेट पॉइंट का उपयोग करो" लिखें। :::

::: tip **मालिक के बारे में संदर्भ शामिल करें।** एजेंट बेहतर प्रदर्शन करता है जब
उसे आपकी भूमिका, उपकरण, और प्राथमिकताएँ पता होती हैं। :::

::: warning SPINE.md निर्देश LLM के व्यवहार का मार्गदर्शन करते हैं लेकिन सुरक्षा
नियंत्रण नहीं हैं। लागू करने योग्य प्रतिबंधों के लिए, `triggerfish.yaml` में नीति इंजन
का उपयोग करें। नीति इंजन नियतात्मक है और बायपास नहीं किया जा सकता -- SPINE.md
निर्देश बायपास किए जा सकते हैं। :::

## TRIGGER.md -- सक्रिय व्यवहार

`TRIGGER.md` परिभाषित करता है कि आपके एजेंट को समय-समय पर जागने पर क्या
जाँचना, निगरानी करना, और कार्य करना चाहिए।

### फ़ाइल स्थान

```
~/.triggerfish/TRIGGER.md
```

### ट्रिगर कैसे काम करते हैं

1. ट्रिगर लूप एजेंट को कॉन्फ़िगर अंतराल पर जगाता है (`triggerfish.yaml` में सेट)
2. Triggerfish आपकी TRIGGER.md लोड करता है और एजेंट को प्रस्तुत करता है
3. एजेंट प्रत्येक आइटम का मूल्यांकन करता है और आवश्यकता होने पर कार्रवाई करता है
4. सभी ट्रिगर कार्रवाइयाँ सामान्य नीति hook से गुजरती हैं
5. ट्रिगर सत्र एक वर्गीकरण सीमा के साथ चलता है (YAML में भी कॉन्फ़िगर)
6. शांत घंटों का सम्मान किया जाता है

### TRIGGER.md लिखना

अपने ट्रिगर को प्राथमिकता के अनुसार व्यवस्थित करें:

```markdown
# Priority Checks

- Unread messages across all channels older than 1 hour -- summarize and notify
  on primary channel.
- Calendar conflicts in the next 24 hours -- flag and suggest resolution.

# Monitoring

- GitHub: PRs awaiting my review -- notify if older than 4 hours.
- Email: anything from VIP contacts -- flag for immediate notification.

# Proactive

- If morning (7-9am), prepare daily briefing with calendar, weather, and top 3
  priorities.
- If Friday afternoon, draft weekly summary of completed tasks and open items.
```

### ट्रिगर और नीति इंजन

सभी ट्रिगर कार्रवाइयाँ इंटरैक्टिव वार्तालापों के समान नीति प्रवर्तन के अधीन हैं:

- प्रत्येक ट्रिगर जागने पर अपने स्वयं के taint ट्रैकिंग के साथ एक अलग सत्र शुरू होता है
- no write-down नियम लागू होता है
- सभी ट्रिगर कार्रवाइयाँ ऑडिट ट्रेल में लॉग की जाती हैं

## SPINE.md बनाम TRIGGER.md

| पहलू     | SPINE.md                            | TRIGGER.md                     |
| -------- | ----------------------------------- | ------------------------------ |
| उद्देश्य | एजेंट कौन है यह परिभाषित करें       | एजेंट क्या निगरानी करता है     |
| लोड होता | हर संदेश पर                         | प्रत्येक ट्रिगर जागने पर       |
| दायरा    | सभी वार्तालाप                       | केवल ट्रिगर सत्र              |
| प्रभावित | व्यक्तित्व, ज्ञान, सीमाएँ            | सक्रिय जाँच और कार्रवाइयाँ     |
| आवश्यक   | हाँ (dive विज़ार्ड द्वारा उत्पन्न)   | नहीं (लेकिन अनुशंसित)         |

## अगले कदम

- अपने [triggerfish.yaml](./configuration) में ट्रिगर समय और cron जॉब कॉन्फ़िगर करें
- [कमांड संदर्भ](./commands) में सभी उपलब्ध CLI कमांड सीखें
