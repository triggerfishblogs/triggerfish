---
title: वर्कफ़्लो
description: Triggerfish में अंतर्निहित CNCF Serverless Workflow DSL इंजन के साथ बहु-चरणीय कार्यों को स्वचालित करें।
---

# वर्कफ़्लो

Triggerfish में [CNCF Serverless Workflow DSL 1.0](https://github.com/serverlessworkflow/specification) के लिए एक अंतर्निहित निष्पादन इंजन शामिल है।
वर्कफ़्लो आपको YAML में नियतात्मक, बहु-चरणीय स्वचालन परिभाषित करने देते हैं जो निष्पादन के दौरान **LLM की भागीदारी के बिना** चलते हैं। एजेंट वर्कफ़्लो बनाता और ट्रिगर करता है, लेकिन वास्तविक कार्य प्रेषण, शाखाकरण, लूपिंग और डेटा प्रवाह इंजन द्वारा संभाला जाता है।

## वर्कफ़्लो का उपयोग कब करें

**वर्कफ़्लो का उपयोग करें** — दोहराने योग्य, नियतात्मक अनुक्रमों के लिए जहाँ आप पहले से चरण जानते हैं: API से डेटा प्राप्त करना, उसे रूपांतरित करना, मेमोरी में सहेजना, सूचना भेजना। समान इनपुट हमेशा समान आउटपुट उत्पन्न करता है।

**एजेंट का सीधे उपयोग करें** — खुले अंत वाले तर्क, अन्वेषण, या ऐसे कार्यों के लिए जहाँ अगला कदम निर्णय पर निर्भर करता है: किसी विषय पर शोध, कोड लेखन, समस्या निवारण।

एक अच्छा नियम: यदि आप एजेंट से बार-बार वही बहु-चरणीय अनुक्रम करने के लिए कह रहे हैं, तो उसे वर्कफ़्लो में बदल दें।

::: info उपलब्धता
वर्कफ़्लो सभी प्लान पर उपलब्ध हैं। अपनी API कुंजियाँ चलाने वाले ओपन सोर्स उपयोगकर्ताओं के पास वर्कफ़्लो इंजन तक पूर्ण पहुँच है — वर्कफ़्लो के भीतर प्रत्येक `triggerfish:llm` या `triggerfish:agent` कॉल आपके कॉन्फ़िगर किए गए प्रदाता से अनुमान का उपभोग करता है।
:::

## उपकरण

### `workflow_save`

वर्कफ़्लो परिभाषा को पार्स, सत्यापित और संग्रहीत करता है। वर्कफ़्लो वर्तमान सत्र के वर्गीकरण स्तर पर सहेजा जाता है।

| Parameter     | Type   | Required | विवरण                              |
| ------------- | ------ | -------- | ---------------------------------- |
| `name`        | string | yes      | वर्कफ़्लो का नाम                  |
| `yaml`        | string | yes      | YAML वर्कफ़्लो परिभाषा            |
| `description` | string | no       | वर्कफ़्लो क्या करता है            |

### `workflow_run`

नाम या इनलाइन YAML द्वारा वर्कफ़्लो निष्पादित करता है। निष्पादन आउटपुट और स्थिति लौटाता है।

| Parameter | Type   | Required | विवरण                                              |
| --------- | ------ | -------- | -------------------------------------------------- |
| `name`    | string | no       | निष्पादित करने के लिए सहेजे गए वर्कफ़्लो का नाम   |
| `yaml`    | string | no       | इनलाइन YAML परिभाषा (सहेजे गए का उपयोग न करते समय)|
| `input`   | string | no       | वर्कफ़्लो के लिए इनपुट डेटा JSON स्ट्रिंग        |

`name` या `yaml` में से एक आवश्यक है।

### `workflow_list`

वर्तमान वर्गीकरण स्तर पर सुलभ सभी सहेजे गए वर्कफ़्लो की सूची देता है। कोई पैरामीटर नहीं लेता।

### `workflow_get`

नाम से सहेजी गई वर्कफ़्लो परिभाषा प्राप्त करता है।

| Parameter | Type   | Required | विवरण                             |
| --------- | ------ | -------- | --------------------------------- |
| `name`    | string | yes      | प्राप्त करने के लिए वर्कफ़्लो का नाम |

### `workflow_delete`

नाम से सहेजे गए वर्कफ़्लो को हटाता है। वर्कफ़्लो वर्तमान सत्र के वर्गीकरण स्तर पर सुलभ होना चाहिए।

| Parameter | Type   | Required | विवरण                            |
| --------- | ------ | -------- | -------------------------------- |
| `name`    | string | yes      | हटाने के लिए वर्कफ़्लो का नाम   |

### `workflow_history`

पिछले वर्कफ़्लो निष्पादन परिणाम देखता है, वैकल्पिक रूप से वर्कफ़्लो नाम से फ़िल्टर करता है।

| Parameter       | Type   | Required | विवरण                                  |
| --------------- | ------ | -------- | -------------------------------------- |
| `workflow_name` | string | no       | वर्कफ़्लो नाम से परिणाम फ़िल्टर करें |
| `limit`         | string | no       | अधिकतम परिणाम संख्या (डिफ़ॉल्ट 10)   |

## कार्य प्रकार

वर्कफ़्लो `do:` ब्लॉक में कार्यों से बने होते हैं। प्रत्येक कार्य एक प्रकार-विशिष्ट बॉडी वाली नामित प्रविष्टि है। Triggerfish 8 कार्य प्रकारों का समर्थन करता है।

### `call` — बाहरी कॉल

HTTP एंडपॉइंट या Triggerfish सेवाओं को प्रेषित करता है।

```yaml
- fetch_issue:
    call: http
    with:
      endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
      method: GET
      headers:
        Authorization: "Bearer ${ .github_token }"
```

`call` फ़ील्ड प्रेषण लक्ष्य निर्धारित करता है। पूर्ण मैपिंग के लिए [कॉल डिस्पैच](#कॉल-डिस्पैच) देखें।

### `run` — शेल, स्क्रिप्ट, या उप-वर्कफ़्लो

शेल कमांड, इनलाइन स्क्रिप्ट, या अन्य सहेजा गया वर्कफ़्लो निष्पादित करता है।

**शेल कमांड:**

```yaml
- list_files:
    run:
      shell:
        command: "ls -la /tmp/workspace"
```

**उप-वर्कफ़्लो:**

```yaml
- cleanup:
    run:
      workflow:
        name: cleanup-temp-files
        input:
          directory: "${ .workspace }"
```

::: warning
शेल और स्क्रिप्ट निष्पादन के लिए वर्कफ़्लो टूल संदर्भ में `allowShellExecution` फ़्लैग सक्षम होना आवश्यक है। अक्षम होने पर, `shell` या `script` लक्ष्य वाले run कार्य विफल हो जाएँगे।
:::

### `set` — डेटा संदर्भ परिवर्तन

वर्कफ़्लो के डेटा संदर्भ में मान असाइन करता है। अभिव्यक्तियों का समर्थन करता है।

```yaml
- prepare_prompt:
    set:
      summary_prompt: "Summarize the following GitHub issue: ${ .fetch_issue.title } — ${ .fetch_issue.body }"
      issue_url: "https://github.com/${ .repo }/issues/${ .issue_number }"
```

### `switch` — सशर्त शाखाकरण

शर्तों के आधार पर शाखा करता है। प्रत्येक केस में एक `when` अभिव्यक्ति और एक `then` प्रवाह निर्देश होता है। बिना `when` वाला केस डिफ़ॉल्ट के रूप में कार्य करता है।

```yaml
- check_priority:
    switch:
      - high_priority:
          when: "${ .fetch_issue.labels }"
          then: notify_team
      - default:
          then: continue
```

### `for` — पुनरावृत्ति

एक संग्रह पर लूप करता है, प्रत्येक आइटम के लिए नेस्टेड `do:` ब्लॉक निष्पादित करता है।

```yaml
- process_items:
    for:
      each: item
      in: "${ .items }"
      at: index
    do:
      - log_item:
          set:
            current: "${ .item }"
```

`each` फ़ील्ड लूप वेरिएबल का नाम देता है, `in` संग्रह को संदर्भित करता है, और वैकल्पिक `at` फ़ील्ड वर्तमान इंडेक्स प्रदान करता है।

### `raise` — त्रुटि के साथ रुकें

संरचित त्रुटि के साथ निष्पादन रोकता है।

```yaml
- fail_if_missing:
    if: "${ .result == null }"
    raise:
      error:
        status: 404
        type: "not-found"
        title: "Resource not found"
        detail: "The requested item does not exist"
```

### `emit` — इवेंट रिकॉर्ड करें

वर्कफ़्लो इवेंट रिकॉर्ड करता है। इवेंट रन परिणाम में कैप्चर किए जाते हैं और `workflow_history` के माध्यम से समीक्षा की जा सकती है।

```yaml
- log_completion:
    emit:
      event:
        type: "issue.summarized"
        source: "workflow/summarize-issue"
        data:
          issue_number: "${ .issue_number }"
          summary_length: "${ .summary.length }"
```

### `wait` — प्रतीक्षा

ISO 8601 अवधि के लिए निष्पादन रोकता है।

```yaml
- rate_limit_pause:
    wait: PT2S
```

## कॉल डिस्पैच

कॉल कार्य में `call` फ़ील्ड यह निर्धारित करता है कि कौन सा Triggerfish टूल इनवोक किया जाता है।

| कॉल प्रकार            | Triggerfish टूल  | आवश्यक `with:` फ़ील्ड                 |
| ---------------------- | ---------------- | -------------------------------------- |
| `http`                 | `web_fetch`      | `endpoint` (या `url`), `method`        |
| `triggerfish:llm`      | `llm_task`       | `prompt` (या `task`)                   |
| `triggerfish:agent`    | `subagent`       | `prompt` (या `task`)                   |
| `triggerfish:memory`   | `memory_*`       | `operation` + ऑपरेशन-विशिष्ट फ़ील्ड  |
| `triggerfish:web_search` | `web_search`   | `query`                                |
| `triggerfish:web_fetch`  | `web_fetch`    | `url`                                  |
| `triggerfish:mcp`      | `mcp__<server>__<tool>` | `server`, `tool`, `arguments`   |
| `triggerfish:message`  | `send_message`   | `channel`, `text`                      |

**मेमोरी ऑपरेशन:** `triggerfish:memory` कॉल प्रकार के लिए `operation` फ़ील्ड `save`, `search`, `get`, `list`, या `delete` में से एक पर सेट होना आवश्यक है। शेष `with:` फ़ील्ड सीधे संबंधित मेमोरी टूल को पास किए जाते हैं।

```yaml
- save_summary:
    call: triggerfish:memory
    with:
      operation: save
      content: "${ .summary }"
      tags: ["github", "issue-summary"]
```

**MCP कॉल:** `triggerfish:mcp` कॉल प्रकार किसी भी कनेक्टेड MCP सर्वर टूल पर रूट करता है। `server` नाम, `tool` नाम, और `arguments` ऑब्जेक्ट निर्दिष्ट करें।

```yaml
- run_lint:
    call: triggerfish:mcp
    with:
      server: eslint
      tool: lint-files
      arguments:
        paths: ["src/"]
```

## अभिव्यक्तियाँ

वर्कफ़्लो अभिव्यक्तियाँ वर्कफ़्लो के डेटा संदर्भ के विरुद्ध डॉट-पाथ रिज़ॉल्यूशन के साथ `${ }` सिंटैक्स का उपयोग करती हैं।

```yaml
# सरल मान संदर्भ
url: "${ .config.api_url }"

# ऐरे इंडेक्सिंग
first_item: "${ .results[0].name }"

# स्ट्रिंग इंटरपोलेशन (एक स्ट्रिंग में कई अभिव्यक्तियाँ)
message: "Found ${ .count } issues in ${ .repo }"

# तुलना (बूलियन लौटाता है)
if: "${ .status == 'open' }"

# अंकगणित
total: "${ .price * .quantity }"
```

**समर्थित ऑपरेटर:**

- तुलना: `==`, `!=`, `>`, `<`, `>=`, `<=`
- अंकगणित: `+`, `-`, `*`, `/`, `%`

**लिटरल:** स्ट्रिंग (`"value"` या `'value'`), संख्या (`42`, `3.14`), बूलियन (`true`, `false`), null (`null`).

जब एक `${ }` अभिव्यक्ति पूरा मान है, तो कच्चा प्रकार संरक्षित रहता है (संख्या, बूलियन, ऑब्जेक्ट)। टेक्स्ट के साथ मिश्रित होने पर, परिणाम हमेशा स्ट्रिंग होता है।

## पूर्ण उदाहरण

यह वर्कफ़्लो GitHub इश्यू प्राप्त करता है, LLM से सारांशित करता है, सारांश को मेमोरी में सहेजता है, और सूचना भेजता है।

```yaml
document:
  dsl: "1.0"
  namespace: examples
  name: summarize-github-issue
  version: "1.0.0"
  description: Fetch a GitHub issue, summarize it, and notify the team.
classification_ceiling: INTERNAL
do:
  - fetch_issue:
      call: http
      with:
        endpoint: "https://api.github.com/repos/${ .repo }/issues/${ .issue_number }"
        method: GET
        headers:
          Authorization: "Bearer ${ .github_token }"
          Accept: application/vnd.github+json
  - prepare_context:
      set:
        issue_title: "${ .fetch_issue.title }"
        issue_body: "${ .fetch_issue.body }"
  - summarize:
      call: triggerfish:llm
      with:
        task: "Summarize this GitHub issue in 2-3 sentences:\n\nTitle: ${ .issue_title }\n\nBody: ${ .issue_body }"
  - save_to_memory:
      call: triggerfish:memory
      with:
        operation: save
        content: "Issue #${ .issue_number } (${ .issue_title }): ${ .summarize }"
        tags: ["github", "issue-summary", "${ .repo }"]
  - notify:
      call: triggerfish:message
      with:
        channel: telegram
        text: "Issue #${ .issue_number } summarized: ${ .summarize }"
```

**इसे चलाएँ:**

```
workflow_run with name: "summarize-github-issue" and input:
  {"repo": "myorg/myrepo", "issue_number": 42, "github_token": "ghp_..."}
```

## इनपुट और आउटपुट ट्रांसफ़ॉर्म

कार्य निष्पादन से पहले अपने इनपुट को और परिणाम संग्रहीत करने से पहले अपने आउटपुट को रूपांतरित कर सकते हैं।

```yaml
- fetch_data:
    call: http
    with:
      endpoint: "${ .api_url }"
    input:
      from: "${ .config }"
    output:
      from:
        items: "${ .fetch_data.data.results }"
        total: "${ .fetch_data.data.count }"
```

- **`input.from`** — कार्य निष्पादन से पहले कार्य के इनपुट संदर्भ को प्रतिस्थापित करने वाली अभिव्यक्ति या ऑब्जेक्ट मैपिंग।
- **`output.from`** — डेटा संदर्भ में संग्रहीत करने से पहले कार्य परिणाम को पुनर्आकार देने वाली अभिव्यक्ति या ऑब्जेक्ट मैपिंग।

## प्रवाह नियंत्रण

प्रत्येक कार्य में एक `then` निर्देश शामिल हो सकता है जो नियंत्रित करता है कि आगे क्या होता है:

- **`continue`** (डिफ़ॉल्ट) — अनुक्रम में अगले कार्य पर जाएँ
- **`end`** — वर्कफ़्लो तुरंत रोकें (स्थिति: completed)
- **नामित कार्य** — नाम से किसी विशिष्ट कार्य पर जाएँ

```yaml
- validate:
    switch:
      - invalid:
          when: "${ .input.email == null }"
          then: handle_error
      - valid:
          then: continue
- process:
    call: triggerfish:llm
    with:
      task: "Process ${ .input.email }"
    then: end
- handle_error:
    raise:
      error:
        status: 400
        type: "validation-error"
        title: "Missing email"
```

## सशर्त निष्पादन

किसी भी कार्य में `if` फ़ील्ड शामिल हो सकता है। शर्त के असत्य होने पर कार्य छोड़ दिया जाता है।

```yaml
- send_alert:
    if: "${ .severity == 'critical' }"
    call: triggerfish:message
    with:
      channel: telegram
      text: "CRITICAL: ${ .alert_message }"
```

## उप-वर्कफ़्लो

`workflow` लक्ष्य वाला `run` कार्य किसी अन्य सहेजे गए वर्कफ़्लो को निष्पादित करता है। उप-वर्कफ़्लो अपने स्वयं के संदर्भ के साथ चलता है और अपना आउटपुट पैरेंट को लौटाता है।

```yaml
- enrich_data:
    run:
      workflow:
        name: data-enrichment-pipeline
        input:
          raw_data: "${ .fetched_data }"
```

उप-वर्कफ़्लो अधिकतम **5 स्तर** गहरे तक नेस्ट हो सकते हैं। इस सीमा से अधिक होने पर त्रुटि उत्पन्न होती है और निष्पादन रुक जाता है।

## वर्गीकरण और सुरक्षा

वर्कफ़्लो अन्य सभी Triggerfish डेटा के समान वर्गीकरण प्रणाली में भाग लेते हैं।

**भंडारण वर्गीकरण।** जब आप `workflow_save` से वर्कफ़्लो सहेजते हैं, तो यह वर्तमान सत्र के taint स्तर पर संग्रहीत होता है। `CONFIDENTIAL` सत्र के दौरान सहेजा गया वर्कफ़्लो केवल `CONFIDENTIAL` या उच्चतर सत्रों द्वारा लोड किया जा सकता है।

**वर्गीकरण सीमा।** वर्कफ़्लो अपने YAML में `classification_ceiling` घोषित कर सकते हैं। प्रत्येक कार्य निष्पादित होने से पहले, इंजन जाँचता है कि सत्र का वर्तमान taint सीमा से अधिक नहीं है। यदि निष्पादन के दौरान सत्र taint सीमा से आगे बढ़ जाता है (उदा., टूल कॉल के माध्यम से वर्गीकृत डेटा एक्सेस करके), तो वर्कफ़्लो सीमा उल्लंघन त्रुटि के साथ रुक जाता है।

```yaml
classification_ceiling: INTERNAL
```

मान्य मान: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.

**रन इतिहास।** निष्पादन परिणाम पूर्ण होने के समय सत्र के वर्गीकरण के साथ संग्रहीत होते हैं। `workflow_history` `canFlowTo` द्वारा परिणामों को फ़िल्टर करता है, इसलिए आप केवल वे रन देख सकते हैं जो आपके वर्तमान सत्र taint पर या उससे नीचे हैं।

::: danger सुरक्षा
वर्कफ़्लो हटाने के लिए आवश्यक है कि वर्कफ़्लो आपके वर्तमान सत्र के वर्गीकरण स्तर पर सुलभ हो। आप `PUBLIC` सत्र से `CONFIDENTIAL` पर संग्रहीत वर्कफ़्लो नहीं हटा सकते। `workflow_delete` टूल पहले वर्कफ़्लो लोड करता है और वर्गीकरण जाँच विफल होने पर "नहीं मिला" लौटाता है।
:::

## स्व-उपचार

वर्कफ़्लो में वैकल्पिक रूप से एक स्वायत्त उपचार एजेंट हो सकता है जो वास्तविक समय में निष्पादन की निगरानी करता है, विफलताओं का निदान करता है, और सुधार प्रस्तावित करता है। जब स्व-उपचार सक्षम होता है, तो वर्कफ़्लो रन के साथ एक लीड एजेंट उत्पन्न होता है। यह हर चरण इवेंट का अवलोकन करता है, विफलताओं को वर्गीकृत करता है, और समस्याओं को हल करने के लिए विशेषज्ञ टीमों का समन्वय करता है।

### स्व-उपचार सक्षम करना

वर्कफ़्लो के `metadata.triggerfish` अनुभाग में एक `self_healing` ब्लॉक जोड़ें:

```yaml
document:
  dsl: "1.0"
  namespace: ops
  name: data-pipeline
metadata:
  triggerfish:
    self_healing:
      enabled: true
      retry_budget: 3
      approval_required: true
      pause_on_intervention: blocking_only
do:
  - fetch-data:
      call: http
      with:
        endpoint: "https://api.example.com/data"
      metadata:
        description: "Fetch raw invoice data from billing API"
        expects: "API returns JSON array of invoice objects"
        produces: "Array of {id, amount, status, date} objects"
```

जब `enabled: true` होता है, तो हर चरण में तीन metadata फ़ील्ड **अनिवार्य** हैं:

| Field         | विवरण                                          |
| ------------- | ---------------------------------------------- |
| `description` | चरण क्या करता है और यह क्यों मौजूद है         |
| `expects`     | चरण को आवश्यक इनपुट आकार या पूर्व शर्तें     |
| `produces`    | चरण द्वारा उत्पन्न आउटपुट आकार               |

पार्सर उन वर्कफ़्लो को अस्वीकार करता है जहाँ किसी भी चरण में ये फ़ील्ड गायब हैं।

### कॉन्फ़िगरेशन विकल्प

| Option                    | Type    | Default              | विवरण |
| ------------------------- | ------- | -------------------- | ----- |
| `enabled`                 | boolean | —                    | आवश्यक। उपचार एजेंट सक्षम करता है। |
| `retry_budget`            | number  | `3`                  | अनसुलझे के रूप में आगे बढ़ाने से पहले अधिकतम हस्तक्षेप प्रयास। |
| `approval_required`       | boolean | `true`               | क्या प्रस्तावित वर्कफ़्लो सुधारों के लिए मानव अनुमोदन आवश्यक है। |
| `pause_on_intervention`   | string  | `"blocking_only"`    | डाउनस्ट्रीम कार्य कब रोकें: `always`, `never`, या `blocking_only`। |
| `pause_timeout_seconds`   | number  | `300`                | टाइमआउट नीति ट्रिगर होने से पहले रुकने के सेकंड। |
| `pause_timeout_policy`    | string  | `"escalate_and_halt"`| टाइमआउट पर क्या होता है: `escalate_and_halt`, `escalate_and_skip`, या `escalate_and_fail`। |
| `notify_on`               | array   | `[]`                 | सूचना ट्रिगर करने वाले इवेंट: `intervention`, `escalation`, `approval_required`। |

### यह कैसे काम करता है

1. **अवलोकन।** उपचार लीड एजेंट वर्कफ़्लो निष्पादन के दौरान चरण इवेंट (started, completed, failed, skipped) की वास्तविक-समय स्ट्रीम प्राप्त करता है।

2. **वर्गीकरण।** जब कोई चरण विफल होता है, तो लीड विफलता को पाँच श्रेणियों में से एक में वर्गीकृत करता है:

   | श्रेणी                | अर्थ                                            |
   | --------------------- | ------------------------------------------------ |
   | `transient_retry`     | अस्थायी समस्या (नेटवर्क त्रुटि, दर सीमा, 503) |
   | `runtime_workaround`  | पहली बार अज्ञात त्रुटि, समाधान संभव हो सकता है |
   | `structural_fix`      | बार-बार विफलता जिसके लिए वर्कफ़्लो परिभाषा परिवर्तन आवश्यक |
   | `plugin_gap`          | प्रमाणीकरण/क्रेडेंशियल समस्या जिसके लिए नए एकीकरण की आवश्यकता |
   | `unresolvable`        | पुनः प्रयास बजट समाप्त या मूल रूप से टूटा हुआ   |

3. **विशेषज्ञ टीमें।** वर्गीकरण श्रेणी के आधार पर, लीड विशेषज्ञ एजेंटों की एक टीम (निदानकर्ता, पुनः प्रयास समन्वयक, परिभाषा फ़िक्सर, प्लगइन लेखक, आदि) उत्पन्न करता है जो समस्या की जाँच और समाधान करती है।

4. **संस्करण प्रस्ताव।** जब संरचनात्मक सुधार आवश्यक होता है, तो टीम एक नया वर्कफ़्लो संस्करण प्रस्तावित करती है। यदि `approval_required` सत्य है, तो प्रस्ताव `workflow_version_approve` या `workflow_version_reject` के माध्यम से मानव समीक्षा की प्रतीक्षा करता है।

5. **स्कोप्ड विराम।** जब `pause_on_intervention` सक्षम होता है, तो केवल डाउनस्ट्रीम कार्य रोके जाते हैं — स्वतंत्र शाखाएँ निष्पादित होती रहती हैं।

### उपचार उपकरण

उपचार स्थिति प्रबंधित करने के लिए चार अतिरिक्त उपकरण उपलब्ध हैं:

| Tool                       | विवरण                                      |
| -------------------------- | ------------------------------------------ |
| `workflow_version_list`    | प्रस्तावित/अनुमोदित/अस्वीकृत संस्करणों की सूची |
| `workflow_version_approve` | प्रस्तावित संस्करण को अनुमोदित करें       |
| `workflow_version_reject`  | कारण सहित प्रस्तावित संस्करण अस्वीकार करें |
| `workflow_healing_status`  | वर्कफ़्लो रन की वर्तमान उपचार स्थिति     |

### सुरक्षा

- उपचार एजेंट **अपने स्वयं के `self_healing` कॉन्फ़िग को संशोधित नहीं कर सकता**। कॉन्फ़िग ब्लॉक को बदलने वाले प्रस्तावित संस्करण अस्वीकार किए जाते हैं।
- लीड एजेंट और सभी टीम सदस्य वर्कफ़्लो के taint स्तर को विरासत में लेते हैं और समकालिक रूप से आगे बढ़ते हैं।
- सभी एजेंट क्रियाएँ मानक नीति हुक श्रृंखला से गुज़रती हैं — कोई बाईपास नहीं।
- प्रस्तावित संस्करण वर्कफ़्लो के वर्गीकरण स्तर पर संग्रहीत होते हैं।
