# Persistent Memory

Triggerfish एजंटांकडे persistent cross-session memory आहे. एजंट conversations,
restarts, आणि trigger wakeups मध्ये survive होणाऱ्या facts, preferences, आणि
context save आणि recall करू शकतो. Memory classification-gated आहे -- एजंट
त्याच्या session taint च्या वर read करू शकत नाही किंवा त्याच्या खाली write करू
शकत नाही.

## Tools

### `memory_save`

Persistent memory मध्ये एक fact किंवा माहितीचा भाग save करा.

| Parameter | Type   | Required | वर्णन                                                          |
| --------- | ------ | -------- | -------------------------------------------------------------- |
| `key`     | string | हो       | Unique identifier (उदा. `user-name`, `project-deadline`)       |
| `content` | string | हो       | लक्षात ठेवायचा content                                         |
| `tags`    | array  | नाही     | Categorization साठी tags (उदा. `["personal", "preference"]`)   |

Classification **आपोआप** current session च्या taint level वर set केले जाते.
एजंट memory कोणत्या level वर store केली जाते ते निवडू शकत नाही.

### `memory_get`

Key द्वारे specific memory retrieve करा.

| Parameter | Type   | Required | वर्णन                              |
| --------- | ------ | -------- | ---------------------------------- |
| `key`     | string | हो       | Retrieve करायच्या memory चा key   |

Memory exist असल्यास आणि current security level वर accessible असल्यास memory
content return करतो. Higher-classified versions lower ones ला shadow करतात.

### `memory_search`

Natural language वापरून सर्व accessible memories मध्ये search करा.

| Parameter     | Type   | Required | वर्णन                         |
| ------------- | ------ | -------- | ----------------------------- |
| `query`       | string | हो       | Natural language search query |
| `max_results` | number | नाही     | Maximum results (default: 10) |

Stemming सह SQLite FTS5 full-text search वापरतो. Results current session च्या
security level नुसार filter केले जातात.

### `memory_list`

सर्व accessible memories list करा, optionally tag नुसार filter करा.

| Parameter | Type   | Required | वर्णन            |
| --------- | ------ | -------- | ---------------- |
| `tag`     | string | नाही     | Filter करायचा tag |

### `memory_delete`

Key द्वारे memory delete करा. Record soft-deleted आहे (लपवले पण audit साठी
retained).

| Parameter | Type   | Required | वर्णन                            |
| --------- | ------ | -------- | -------------------------------- |
| `key`     | string | हो       | Delete करायच्या memory चा key   |

फक्त current session च्या security level वरील memories delete करता येतात.

## Memory कसे काम करते

### Auto-Extraction

User share करत असलेले महत्त्वाचे facts एजंट proactively save करतो -- personal
details, project context, preferences -- descriptive keys वापरून. हे SPINE.md
द्वारे guided prompt-level वर्तन आहे. LLM **काय** save करायचे ते निवडतो;
policy layer **कोणत्या level वर** force करतो.

### Classification Gating

प्रत्येक memory record ला save केल्याच्या वेळी session taint च्या बरोबरीचा
classification level असतो:

- `CONFIDENTIAL` session दरम्यान save केलेली memory `CONFIDENTIAL` classified आहे
- `PUBLIC` session `CONFIDENTIAL` memories वाचू शकत नाही
- `CONFIDENTIAL` session `CONFIDENTIAL` आणि `PUBLIC` दोन्ही memories वाचू शकतो

हे प्रत्येक read operation वर `canFlowTo` checks द्वारे enforce केले जाते.
LLM हे bypass करू शकत नाही.

### Memory Shadowing

जेव्हा एकाच key च्या multiple classification levels वर copies असतात, फक्त
current session ला दिसणारी highest-classified version return केली जाते. हे
classification boundaries वर information leakage रोखते.

**Example:** `user-name` `PUBLIC` वर (public chat दरम्यान set) आणि `INTERNAL`
वर (private session दरम्यान updated) दोन्हीवर exist असल्यास, `INTERNAL` session
`INTERNAL` version पाहतो, `PUBLIC` session फक्त `PUBLIC` version पाहतो.

### Storage

Memories `StorageProvider` interface द्वारे stored आहेत (sessions, cron jobs, आणि
todos साठी वापरल्या जाणाऱ्या त्याच abstraction). Full-text search stemming सह
fast natural language queries साठी SQLite FTS5 वापरतो.

## Security

- Classification नेहमी `PRE_TOOL_CALL` hook मध्ये `session.taint` ला force
  केली जाते -- LLM कमी classification निवडू शकत नाही
- सर्व reads `canFlowTo` नुसार filter केले जातात -- session taint च्या वर कोणती
  memory कधीही return केली जात नाही
- Deletes soft-deletes आहेत -- record लपवले जाते पण audit साठी retained
- एजंट high-classified data वाचून lower level वर re-saving करून memory
  classification escalate करू शकत नाही (write-down prevention लागू होते)

::: warning SECURITY LLM कधीही memory classification निवडत नाही. ते नेहमी
policy layer द्वारे current session च्या taint level ला force केले जाते. हे एक
hard boundary आहे जे configure करून दूर केले जाऊ शकत नाही. :::
