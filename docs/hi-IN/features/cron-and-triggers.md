# Cron और Triggers

Triggerfish agents केवल प्रतिक्रियात्मक प्रश्न-और-उत्तर तक सीमित नहीं हैं। Cron
और trigger प्रणाली सक्रिय व्यवहार सक्षम करती है: शेड्यूल किए गए कार्य, आवधिक
चेक-इन, सुबह की ब्रीफिंग, पृष्ठभूमि निगरानी, और स्वायत्त बहु-चरण workflows।

## Cron Jobs

Cron jobs निश्चित निर्देशों, एक डिलीवरी चैनल, और एक classification ceiling वाले
शेड्यूल किए गए कार्य हैं। ये मानक cron expression सिंटैक्स का उपयोग करते हैं।

### कॉन्फ़िगरेशन

`triggerfish.yaml` में cron jobs परिभाषित करें या agent को cron tool के माध्यम से
runtime पर उन्हें प्रबंधित करने दें:

```yaml
scheduler:
  cron:
    jobs:
      - id: morning-briefing
        schedule: "0 7 * * *" # प्रतिदिन सुबह 7 बजे
        task: "Prepare morning briefing with calendar,
          unread emails, and weather"
        channel: telegram # कहाँ डिलीवर करना है
        classification: INTERNAL # इस job के लिए अधिकतम taint

      - id: pipeline-check
        schedule: "0 */4 * * *" # हर 4 घंटे
        task: "Check Salesforce pipeline for changes"
        channel: slack
        classification: CONFIDENTIAL
```

### यह कैसे काम करता है

1. **CronManager** मानक cron expressions पार्स करता है और एक स्थायी job रजिस्ट्री
   बनाए रखता है जो पुनरारंभ के बाद भी बची रहती है।
2. जब कोई job फायर होती है, **OrchestratorFactory** उस निष्पादन के लिए विशेष रूप
   से एक अलग orchestrator और session बनाता है।
3. Job एक **पृष्ठभूमि session workspace** में अपनी taint ट्रैकिंग के साथ चलती है।
4. आउटपुट कॉन्फ़िगर किए गए चैनल पर डिलीवर किया जाता है, उस चैनल के
   classification नियमों के अधीन।
5. निष्पादन इतिहास ऑडिट के लिए रिकॉर्ड किया जाता है।

### Agent-प्रबंधित Cron

Agent `cron` tool के माध्यम से अपनी cron jobs बना और प्रबंधित कर सकता है:

| क्रिया         | विवरण                          | सुरक्षा                                      |
| -------------- | ------------------------------ | --------------------------------------------- |
| `cron.list`    | सभी शेड्यूल किए गए jobs सूचीबद्ध करें | केवल Owner                                    |
| `cron.create`  | नई job शेड्यूल करें                | केवल Owner, classification ceiling प्रवर्तित   |
| `cron.delete`  | शेड्यूल की गई job हटाएँ            | केवल Owner                                    |
| `cron.history` | पिछले निष्पादन देखें                | ऑडिट ट्रेल संरक्षित                           |

::: warning Cron job निर्माण के लिए owner प्रमाणीकरण आवश्यक है। Agent बाहरी
उपयोगकर्ताओं की ओर से jobs शेड्यूल नहीं कर सकता या कॉन्फ़िगर किए गए
classification ceiling से अधिक नहीं जा सकता। :::

### CLI Cron प्रबंधन

Cron jobs को सीधे कमांड लाइन से भी प्रबंधित किया जा सकता है:

```bash
triggerfish cron add "0 9 * * *" morning briefing
triggerfish cron add "0 */4 * * *" check pipeline --classification=CONFIDENTIAL
triggerfish cron list
triggerfish cron history <job-id>
triggerfish cron delete <job-id>
```

`--classification` flag job के लिए classification ceiling सेट करता है। मान्य
स्तर `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, और `RESTRICTED` हैं। यदि छोड़ दिया
जाए, तो डिफ़ॉल्ट `INTERNAL` है।

## Trigger प्रणाली

Triggers आवधिक "चेक-इन" loops हैं जहाँ agent यह मूल्यांकन करने के लिए जागता है
कि क्या कोई सक्रिय कार्रवाई आवश्यक है। निश्चित कार्यों वाली cron jobs के विपरीत,
triggers agent को यह तय करने का विवेकाधिकार देते हैं कि किस पर ध्यान देने की
आवश्यकता है।

### TRIGGER.md

`TRIGGER.md` परिभाषित करता है कि agent को प्रत्येक wakeup के दौरान क्या जाँचना
चाहिए। यह `~/.triggerfish/config/TRIGGER.md` पर रहता है और एक freeform markdown
फ़ाइल है जहाँ आप निगरानी प्राथमिकताएँ, एस्केलेशन नियम, और सक्रिय व्यवहार निर्दिष्ट
करते हैं।

यदि `TRIGGER.md` अनुपस्थित है, तो agent अपने सामान्य ज्ञान का उपयोग करता है यह
तय करने के लिए कि किस पर ध्यान देने की आवश्यकता है।

**उदाहरण TRIGGER.md:**

```markdown
# TRIGGER.md -- प्रत्येक wakeup पर क्या जाँचना है

## प्राथमिकता जाँच

- सभी चैनलों में 1 घंटे से पुराने अपठित संदेश
- अगले 24 घंटों में कैलेंडर विवाद
- Linear या Jira में अतिदेय कार्य

## निगरानी

- GitHub: मेरी समीक्षा की प्रतीक्षा कर रहे PRs
- Email: VIP संपर्कों से कुछ भी (तत्काल notification के लिए flag करें)
- Slack: #incidents चैनल में mentions

## सक्रिय

- यदि सुबह (7-9 बजे), दैनिक ब्रीफिंग तैयार करें
- यदि शुक्रवार दोपहर, साप्ताहिक सारांश ड्राफ्ट करें
```

### Trigger कॉन्फ़िगरेशन

Trigger समय और बाधाएँ `triggerfish.yaml` में सेट की जाती हैं:

```yaml
scheduler:
  trigger:
    enabled: true # Triggers अक्षम करने के लिए false सेट करें (डिफ़ॉल्ट: true)
    interval_minutes: 30 # हर 30 मिनट में जाँचें (डिफ़ॉल्ट: 30)
    # कॉन्फ़िग हटाए बिना triggers अक्षम करने के लिए 0 सेट करें
    classification_ceiling: CONFIDENTIAL # अधिकतम taint ceiling (डिफ़ॉल्ट: CONFIDENTIAL)
    quiet_hours:
      start: 22 # रात 10 बजे से न जगाएँ...
      end: 7 # ... सुबह 7 बजे तक
```

| सेटिंग                                  | विवरण                                                                                                                                  |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `enabled`                               | क्या आवधिक trigger wakeups सक्रिय हैं। अक्षम करने के लिए `false` सेट करें।                                                             |
| `interval_minutes`                      | agent कितनी बार (मिनटों में) triggers जाँचने के लिए जागता है। डिफ़ॉल्ट: `30`। कॉन्फ़िग ब्लॉक हटाए बिना triggers अक्षम करने के लिए `0` सेट करें। |
| `classification_ceiling`                | Trigger session जिस अधिकतम classification स्तर तक पहुँच सकता है। डिफ़ॉल्ट: `CONFIDENTIAL`।                                              |
| `quiet_hours.start` / `quiet_hours.end` | घंटे की सीमा (24 घंटे की घड़ी) जिसके दौरान triggers दबाए जाते हैं।                                                                     |

::: tip अस्थायी रूप से triggers अक्षम करने के लिए, `interval_minutes: 0` सेट
करें। यह `enabled: false` के समकक्ष है और आपको अपनी अन्य trigger सेटिंग्स बनाए
रखने देता है ताकि आप आसानी से पुनः सक्षम कर सकें। :::

### Trigger निष्पादन

प्रत्येक trigger wakeup इस क्रम का पालन करता है:

1. Scheduler कॉन्फ़िगर किए गए अंतराल पर फायर होता है।
2. `PUBLIC` taint के साथ एक नया पृष्ठभूमि session बनाया जाता है।
3. Agent अपने निगरानी निर्देशों के लिए `TRIGGER.md` पढ़ता है।
4. Agent उपलब्ध tools और MCP servers का उपयोग करके प्रत्येक जाँच का मूल्यांकन
   करता है।
5. यदि कार्रवाई आवश्यक है, agent कार्य करता है -- notifications भेजना, कार्य
   बनाना, या सारांश डिलीवर करना।
6. Session का taint वर्गीकृत डेटा तक पहुँचने पर बढ़ सकता है, लेकिन यह कॉन्फ़िगर
   किए गए ceiling से अधिक नहीं हो सकता।
7. पूर्णता के बाद session संग्रहीत किया जाता है।

::: tip Triggers और cron jobs एक-दूसरे के पूरक हैं। उन कार्यों के लिए cron
उपयोग करें जो स्थितियों की परवाह किए बिना सटीक समय पर चलने चाहिए (सुबह 7 बजे
ब्रीफिंग)। उस निगरानी के लिए triggers उपयोग करें जिसमें निर्णय की आवश्यकता होती
है (हर 30 मिनट में जाँचें कि क्या किसी चीज़ पर ध्यान देने की आवश्यकता है)। :::

## Trigger Context Tool

Agent `trigger_add_to_context` tool का उपयोग करके trigger परिणामों को अपने
वर्तमान वार्तालाप में लोड कर सकता है। यह तब उपयोगी है जब कोई उपयोगकर्ता
अंतिम trigger wakeup के दौरान जाँची गई किसी चीज़ के बारे में पूछता है।

### उपयोग

| Parameter | डिफ़ॉल्ट    | विवरण                                                                                            |
| --------- | ----------- | ------------------------------------------------------------------------------------------------ |
| `source`  | `"trigger"` | कौन सा trigger आउटपुट लोड करना है: `"trigger"` (आवधिक), `"cron:<job-id>"`, या `"webhook:<source>"` |

Tool निर्दिष्ट स्रोत के लिए सबसे हाल का निष्पादन परिणाम लोड करता है और इसे
वार्तालाप संदर्भ में जोड़ता है।

### Write-Down प्रवर्तन

Trigger context injection no-write-down नियम का सम्मान करता है:

- यदि trigger का classification session taint से **अधिक** है, session taint मिलान
  के लिए **बढ़ता** है
- यदि session taint trigger के classification से **अधिक** है, injection **अनुमत**
  है -- निम्न-classification डेटा हमेशा उच्च-classification session में प्रवाहित
  हो सकता है (सामान्य `canFlowTo` व्यवहार)। Session taint अपरिवर्तित रहता है।

::: info एक CONFIDENTIAL session बिना किसी समस्या के PUBLIC trigger परिणाम लोड कर
सकता है -- डेटा ऊपर की ओर प्रवाहित होता है। इसका उल्टा (CONFIDENTIAL trigger
डेटा को PUBLIC ceiling वाले session में इंजेक्ट करना) session taint को CONFIDENTIAL
तक बढ़ा देगा। :::

### स्थायित्व

Trigger परिणाम `StorageProvider` के माध्यम से `trigger:last:<source>` प्रारूप में
keys के साथ संग्रहीत होते हैं। प्रति स्रोत केवल सबसे हाल का परिणाम रखा जाता है।

## सुरक्षा एकीकरण

सभी शेड्यूल किया गया निष्पादन मूल सुरक्षा मॉडल के साथ एकीकृत होता है:

- **अलग sessions** -- प्रत्येक cron job और trigger wakeup अपने session में
  स्वतंत्र taint ट्रैकिंग के साथ चलता है।
- **Classification ceiling** -- पृष्ठभूमि कार्य अपने कॉन्फ़िगर किए गए
  classification स्तर से अधिक नहीं हो सकते, भले ही वे जिन tools को invoke करते हैं
  वे उच्च-वर्गीकृत डेटा लौटाएँ।
- **Policy hooks** -- शेड्यूल किए गए कार्यों के भीतर सभी क्रियाएँ इंटरैक्टिव
  sessions के समान प्रवर्तन hooks (PRE_TOOL_CALL, POST_TOOL_RESPONSE, PRE_OUTPUT)
  से गुज़रती हैं।
- **चैनल classification** -- आउटपुट डिलीवरी लक्ष्य चैनल के classification स्तर
  का सम्मान करती है। `CONFIDENTIAL` परिणाम `PUBLIC` चैनल पर नहीं भेजा जा सकता।
- **ऑडिट ट्रेल** -- प्रत्येक शेड्यूल किया गया निष्पादन पूर्ण संदर्भ के साथ लॉग
  किया जाता है: job ID, session ID, taint इतिहास, की गई क्रियाएँ, और डिलीवरी स्थिति।
- **स्थायित्व** -- Cron jobs `StorageProvider` (namespace: `cron:`) के माध्यम से
  संग्रहीत हैं और gateway पुनरारंभ के बाद भी बची रहती हैं।
