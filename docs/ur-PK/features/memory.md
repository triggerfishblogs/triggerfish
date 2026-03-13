# Persistent Memory

Triggerfish ایجنٹس کو persistent cross-session memory ہے۔ ایجنٹ ایسے facts،
preferences، اور context save کر سکتا ہے جو conversations، restarts، اور trigger
wakeups کے پار بچے رہیں۔ Memory classification-gated ہے — ایجنٹ اپنے session
taint سے اوپر نہیں پڑھ سکتا یا نیچے نہیں لکھ سکتا۔

## Tools

### `memory_save`

Persistent memory میں کوئی fact یا معلومات save کریں۔

| Parameter | Type   | ضروری | تفصیل                                                           |
| --------- | ------ | :---: | ---------------------------------------------------------------- |
| `key`     | string | ہاں   | منفرد identifier (مثلاً `user-name`، `project-deadline`)        |
| `content` | string | ہاں   | یاد رکھنے والا content                                          |
| `tags`    | array  | نہیں  | Categorization کے لیے tags (مثلاً `["personal", "preference"]`) |

Classification **automatically** موجودہ session کے taint level پر set ہوتی ہے۔
ایجنٹ نہیں چن سکتا کہ memory کس level پر store ہو۔

### `memory_get`

Key کے ذریعے مخصوص memory retrieve کریں۔

| Parameter | Type   | ضروری | تفصیل                              |
| --------- | ------ | :---: | ----------------------------------- |
| `key`     | string | ہاں   | Retrieve کرنے والی memory کی key   |

اگر memory موجود ہو اور موجودہ security level پر accessible ہو تو content واپس
کرتا ہے۔ Higher-classified versions lower ones کو shadow کرتے ہیں۔

### `memory_search`

Natural language استعمال کر کے تمام accessible memories میں تلاش کریں۔

| Parameter     | Type   | ضروری | تفصیل                          |
| ------------- | ------ | :---: | ------------------------------- |
| `query`       | string | ہاں   | Natural language search query   |
| `max_results` | number | نہیں  | زیادہ سے زیادہ نتائج (ڈیفالٹ: 10) |

Stemming کے ساتھ SQLite FTS5 full-text search استعمال کرتا ہے۔ نتائج موجودہ
session کے security level سے filter ہوتے ہیں۔

### `memory_list`

تمام accessible memories list کریں، اختیاری طور پر tag سے filter کریں۔

| Parameter | Type   | ضروری | تفصیل             |
| --------- | ------ | :---: | ------------------ |
| `tag`     | string | نہیں  | Filter کرنے کا tag |

### `memory_delete`

Key سے memory delete کریں۔ Record soft-deleted ہوتا ہے (hidden لیکن audit کے لیے
retain)۔

| Parameter | Type   | ضروری | تفصیل                            |
| --------- | ------ | :---: | --------------------------------- |
| `key`     | string | ہاں   | Delete کرنے والی memory کی key   |

صرف موجودہ session کے security level پر memories delete کر سکتا ہے۔

## Memory کیسے کام کرتی ہے

### Auto-Extraction

ایجنٹ proactively وہ important facts save کرتا ہے جو user share کرتا ہے — personal
details، project context، preferences — descriptive keys استعمال کر کے۔ یہ
SPINE.md کی رہنمائی میں prompt-level behavior ہے۔ LLM **کیا** save کرنا ہے چنتا
ہے؛ policy layer **کس level پر** force کرتی ہے۔

### Classification Gating

ہر memory record وہ classification level carry کرتا ہے جو save کے وقت session
taint تھی:

- `CONFIDENTIAL` session کے دوران save ہونے والی memory `CONFIDENTIAL` classified ہے
- `PUBLIC` session `CONFIDENTIAL` memories نہیں پڑھ سکتی
- `CONFIDENTIAL` session `CONFIDENTIAL` اور `PUBLIC` دونوں memories پڑھ سکتی ہے

یہ ہر read operation پر `canFlowTo` checks سے enforce ہوتا ہے۔ LLM اسے bypass
نہیں کر سکتا۔

### Memory Shadowing

جب ایک ہی key multiple classification levels پر موجود ہو، تو صرف موجودہ session
کو visible highest-classified version واپس آتا ہے۔ یہ classification boundaries
کے پار information leakage روکتا ہے۔

**مثال:** اگر `user-name` دونوں `PUBLIC` (public chat کے دوران set) اور `INTERNAL`
(private session کے دوران update) پر موجود ہو، تو `INTERNAL` session `INTERNAL`
version دیکھتی ہے، جبکہ `PUBLIC` session صرف `PUBLIC` version دیکھتی ہے۔

### Storage

Memories `StorageProvider` interface کے ذریعے store ہوتی ہیں (وہی abstraction جو
sessions، cron jobs، اور todos کے لیے استعمال ہوتی ہے)۔ Full-text search stemming
کے ساتھ fast natural language queries کے لیے SQLite FTS5 استعمال کرتا ہے۔

## Security

- Classification `PRE_TOOL_CALL` hook میں ہمیشہ `session.taint` پر force ہوتی ہے
  — LLM کوئی lower classification نہیں چن سکتا
- تمام reads `canFlowTo` سے filter ہوتے ہیں — session taint سے اوپر کوئی memory
  کبھی واپس نہیں آتی
- Deletes soft-deletes ہیں — record hidden لیکن audit کے لیے retain ہوتا ہے
- ایجنٹ high-classified data پڑھ کر اسے lower level پر re-save کر کے memory
  classification escalate نہیں کر سکتا (write-down prevention لاگو ہے)

::: warning SECURITY LLM کبھی memory classification نہیں چنتا۔ یہ policy layer
کے ذریعے ہمیشہ موجودہ session کے taint level پر force ہوتی ہے۔ یہ hard boundary ہے
جسے configure کر کے ختم نہیں کیا جا سکتا۔ :::
