# Filesystem और Shell Tools

Triggerfish agent को पढ़ने, लिखने, खोजने, और कमांड निष्पादित करने के लिए
सामान्य-उद्देश्य filesystem और shell tools प्रदान करता है। ये वे आधारभूत tools हैं
जिन पर अन्य क्षमताएँ (exec environment, explore, skills) निर्मित हैं।

## Tools

### `read_file`

एक absolute path पर फ़ाइल की सामग्री पढ़ें।

| Parameter | Type   | आवश्यक | विवरण                        |
| --------- | ------ | ------ | ---------------------------- |
| `path`    | string | हाँ    | पढ़ने के लिए absolute फ़ाइल पथ  |

फ़ाइल की पूर्ण text सामग्री लौटाता है।

### `write_file`

Workspace-relative path पर फ़ाइल में सामग्री लिखें।

| Parameter | Type   | आवश्यक | विवरण                       |
| --------- | ------ | ------ | --------------------------- |
| `path`    | string | हाँ    | Workspace में relative path   |
| `content` | string | हाँ    | लिखने के लिए फ़ाइल सामग्री    |

Writes agent के workspace directory तक सीमित हैं। Agent filesystem पर मनमाने
स्थानों पर नहीं लिख सकता।

### `edit_file`

फ़ाइल में एक अद्वितीय string बदलें। `old_text` फ़ाइल में बिल्कुल एक बार दिखना
चाहिए।

| Parameter  | Type   | आवश्यक | विवरण                                         |
| ---------- | ------ | ------ | --------------------------------------------- |
| `path`     | string | हाँ    | संपादित करने के लिए absolute फ़ाइल पथ             |
| `old_text` | string | हाँ    | खोजने के लिए सटीक text (फ़ाइल में अद्वितीय होना चाहिए) |
| `new_text` | string | हाँ    | प्रतिस्थापन text                                |

यह एक सर्जिकल edit tool है -- यह एक सटीक मिलान खोजता है और उसे बदलता है। यदि
text एक से अधिक बार या बिल्कुल न दिखाई दे, तो ऑपरेशन एक error के साथ विफल
होता है।

### `list_directory`

दिए गए absolute path पर फ़ाइलों और directories की सूची बनाएँ।

| Parameter | Type   | आवश्यक | विवरण                            |
| --------- | ------ | ------ | -------------------------------- |
| `path`    | string | हाँ    | सूचीबद्ध करने के लिए absolute directory path |

Directories के लिए `/` प्रत्यय के साथ entries लौटाता है।

### `search_files`

Glob pattern से मेल खाने वाली फ़ाइलें खोजें, या grep से फ़ाइल सामग्री में खोजें।

| Parameter        | Type    | आवश्यक | विवरण                                                             |
| ---------------- | ------- | ------ | ----------------------------------------------------------------- |
| `path`           | string  | हाँ    | खोज करने के लिए directory                                          |
| `pattern`        | string  | हाँ    | फ़ाइल नामों के लिए glob pattern, या फ़ाइलों में खोजने के लिए text/regex |
| `content_search` | boolean | नहीं   | यदि `true`, फ़ाइल नामों के बजाय फ़ाइल सामग्री में खोजें              |

### `run_command`

Agent workspace directory में shell कमांड चलाएँ।

| Parameter | Type   | आवश्यक | विवरण                       |
| --------- | ------ | ------ | --------------------------- |
| `command` | string | हाँ    | निष्पादित करने के लिए shell कमांड |

stdout, stderr, और exit code लौटाता है। कमांड agent के workspace directory में
निष्पादित होते हैं। `PRE_TOOL_CALL` hook निष्पादन से पहले कमांड को denylist के
विरुद्ध जाँचता है।

## अन्य Tools से संबंध

ये filesystem tools [Exec Environment](../integrations/exec-environment) tools
(`exec.write`, `exec.read`, `exec.run`, `exec.ls`) के साथ ओवरलैप करते हैं। अंतर:

- **Filesystem tools** absolute paths और agent के डिफ़ॉल्ट workspace पर काम करते
  हैं। ये हमेशा उपलब्ध हैं।
- **Exec tools** स्पष्ट अलगाव, test runners, और package स्थापना के साथ एक
  संरचित workspace में काम करते हैं। ये exec environment एकीकरण का हिस्सा हैं।

Agent सामान्य फ़ाइल संचालन के लिए filesystem tools और विकास workflow
(लिखें/चलाएँ/ठीक करें loop) में काम करते समय exec tools का उपयोग करता है।

## सुरक्षा

- `write_file` agent के workspace directory तक सीमित है
- `run_command` कमांड को संदर्भ के रूप में `PRE_TOOL_CALL` hook से गुज़रता है
- एक कमांड denylist खतरनाक संचालन (`rm -rf /`, `sudo`, आदि) को अवरुद्ध करती है
- सभी tool प्रतिक्रियाएँ classification और taint ट्रैकिंग के लिए
  `POST_TOOL_RESPONSE` से गुज़रती हैं
- Plan mode में, `write_file` तब तक अवरुद्ध है जब तक योजना स्वीकृत नहीं हो जाती
