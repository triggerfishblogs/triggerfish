# Webhooks

Triggerfish बाहरी सेवाओं से inbound events स्वीकार कर सकता है, emails, error
alerts, CI/CD events, calendar परिवर्तन, और अधिक पर वास्तविक समय प्रतिक्रियाएँ
सक्षम करता है। Webhooks आपके agent को प्रतिक्रियात्मक प्रश्न-उत्तर प्रणाली से
आपके workflows में सक्रिय भागीदार में बदलते हैं।

## Webhooks कैसे काम करते हैं

बाहरी सेवाएँ Triggerfish gateway पर पंजीकृत webhook endpoints को HTTP POST
अनुरोध भेजती हैं। प्रत्येक आने वाला event प्रामाणिकता के लिए सत्यापित, वर्गीकृत,
और processing के लिए agent को रूट किया जाता है।

<img src="/diagrams/webhook-pipeline.svg" alt="Webhook pipeline: बाहरी सेवाएँ HMAC सत्यापन, classification, session अलगाव, और policy hooks के माध्यम से HTTP POST agent processing तक भेजती हैं" style="max-width: 100%;" />

## कॉन्फ़िगरेशन

Webhook endpoints `triggerfish.yaml` में कॉन्फ़िगर किए जाते हैं:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # secret OS keychain में संग्रहीत
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # secret OS keychain में संग्रहीत
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"
```

### कॉन्फ़िगरेशन Fields

| Field             | आवश्यक | विवरण                                                  |
| ----------------- | :----: | ------------------------------------------------------ |
| `id`              |  हाँ   | इस webhook endpoint के लिए अद्वितीय पहचानकर्ता          |
| `path`            |  हाँ   | URL path जहाँ endpoint पंजीकृत है                        |
| `secret`          |  हाँ   | HMAC signature सत्यापन के लिए साझा secret                |
| `classification`  |  हाँ   | इस स्रोत से events को assigned classification स्तर       |
| `actions`         |  हाँ   | Event-to-task mappings की सूची                           |
| `actions[].event` |  हाँ   | मिलान करने के लिए event type pattern                      |
| `actions[].task`  |  हाँ   | Agent के निष्पादन के लिए प्राकृतिक भाषा कार्य              |

::: tip Webhook secrets OS keychain में संग्रहीत हैं। इन्हें सुरक्षित रूप से दर्ज
करने के लिए `triggerfish dive` चलाएँ या webhooks interactively कॉन्फ़िगर करें। :::

## HMAC Signature सत्यापन

प्रत्येक inbound webhook अनुरोध payload processed होने से पहले HMAC signature
validation का उपयोग करके प्रामाणिकता के लिए सत्यापित किया जाता है।

::: warning सुरक्षा मान्य HMAC signatures के बिना webhook अनुरोध किसी भी processing
से पहले अस्वीकार कर दिए जाते हैं। यह spoofed events को agent actions ट्रिगर
करने से रोकता है। Production में कभी signature verification अक्षम न करें। :::

## Event Processing Pipeline

### 1. Classification

Event payload webhook endpoint के लिए कॉन्फ़िगर किए गए स्तर पर वर्गीकृत होता है।

### 2. Session अलगाव

प्रत्येक webhook event अपना अलग session spawn करता है।

### 3. PRE_CONTEXT_INJECTION Hook

Event payload agent context में प्रवेश करने से पहले `PRE_CONTEXT_INJECTION` hook
से गुज़रता है।

### 4. Agent Processing

Agent classified event प्राप्त करता है और कॉन्फ़िगर किया गया कार्य निष्पादित करता
है।

### 5. Output Delivery

Agent का कोई भी आउटपुट `PRE_OUTPUT` hook से गुज़रता है। No Write-Down नियम लागू
होता है।

### 6. ऑडिट

पूर्ण event lifecycle लॉग किया जाता है।

## Scheduler के साथ एकीकरण

Webhooks Triggerfish की [cron और trigger प्रणाली](/hi-IN/features/cron-and-triggers)
के साथ स्वाभाविक रूप से एकीकृत होते हैं।

## सुरक्षा सारांश

| नियंत्रण                 | विवरण                                                                     |
| ------------------------ | ------------------------------------------------------------------------- |
| HMAC सत्यापन              | सभी inbound webhooks processing से पहले सत्यापित                           |
| Classification            | Webhook payloads कॉन्फ़िगर किए गए स्तर पर वर्गीकृत                         |
| Session अलगाव             | प्रत्येक event को अपना अलग session मिलता है                                |
| `PRE_CONTEXT_INJECTION`   | Payload context में प्रवेश से पहले स्कैन और वर्गीकृत                        |
| No Write-Down             | उच्च-classification events का आउटपुट निम्न-classification channels तक नहीं पहुँच सकता |
| ऑडिट logging              | पूर्ण event lifecycle रिकॉर्ड                                              |
| सार्वजनिक रूप से exposed नहीं | Webhook endpoints डिफ़ॉल्ट रूप से public internet पर exposed नहीं हैं       |

::: info Webhook endpoints डिफ़ॉल्ट रूप से public internet पर exposed नहीं हैं।
बाहरी सेवाओं को आपके Triggerfish instance तक पहुँचने के लिए, आपको port forwarding,
reverse proxy, या tunnel कॉन्फ़िगर करना होगा। Docs का [Remote Access](/hi-IN/reference/)
अनुभाग सुरक्षित exposure विकल्प कवर करता है। :::
