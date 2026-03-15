# Persistent Memory

Triggerfish agents க்கு persistent cross-session memory உள்ளது. Agent conversations, restarts, மற்றும் trigger wakeups முழுவதும் survive ஆகும் facts, preferences, மற்றும் context சேமிக்கலாம். Memory classification-gated -- agent அதன் session taint க்கு மேல் படிக்கவோ கீழ் எழுதவோ முடியாது.

## Tools

### `memory_save`

Persistent memory இல் ஒரு fact அல்லது தகவல் சேமிக்கவும்.

| Parameter | Type   | Required | விளக்கம்                                                           |
| --------- | ------ | -------- | -------------------------------------------------------------------- |
| `key`     | string | ஆம்      | Unique identifier (உதா. `user-name`, `project-deadline`)            |
| `content` | string | ஆம்      | நினைவில் வைக்க வேண்டிய content                                     |
| `tags`    | array  | இல்லை   | Categorization க்கான tags (உதா. `["personal", "preference"]`)       |

Classification **தானாக** தற்போதைய session இன் taint நிலைக்கு அமைக்கப்படுகிறது. Memory எந்த நிலையில் சேமிக்கப்படுகிறது என்று agent தேர்வு செய்ய முடியாது.

### `memory_get`

அதன் key மூலம் ஒரு specific memory retrieve செய்யவும்.

| Parameter | Type   | Required | விளக்கம்                          |
| --------- | ------ | -------- | ----------------------------------- |
| `key`     | string | ஆம்      | Retrieve செய்ய memory இன் key      |

Memory exist ஆகி தற்போதைய பாதுகாப்பு நிலையில் accessible ஆக இருந்தால் memory content return செய்கிறது. அதிக-classified versions குறைந்தவற்றை shadow செய்கின்றன.

### `memory_search`

Natural language பயன்படுத்தி அனைத்து accessible memories முழுவதும் search செய்யவும்.

| Parameter     | Type   | Required | விளக்கம்                              |
| ------------- | ------ | -------- | --------------------------------------- |
| `query`       | string | ஆம்      | Natural language search query           |
| `max_results` | number | இல்லை   | அதிகபட்ச results (default: 10)         |

Stemming உடன் SQLite FTS5 full-text search பயன்படுத்துகிறது. Results தற்போதைய session இன் பாதுகாப்பு நிலையால் filtered ஆகின்றன.

### `memory_list`

Tag மூலம் விரும்பினால் filtered, அனைத்து accessible memories பட்டியலிடவும்.

| Parameter | Type   | Required | விளக்கம்        |
| --------- | ------ | -------- | ----------------- |
| `tag`     | string | இல்லை   | Filter செய்ய tag |

### `memory_delete`

Key மூலம் ஒரு memory நீக்கவும். Record soft-deleted (மறைக்கப்பட்டது ஆனால் audit க்காக retain செய்யப்பட்டது).

| Parameter | Type   | Required | விளக்கம்                       |
| --------- | ------ | -------- | -------------------------------- |
| `key`     | string | ஆம்      | நீக்க வேண்டிய memory இன் key   |

தற்போதைய session இன் பாதுகாப்பு நிலையில் memories மட்டும் நீக்க முடியும்.

## Memory எவ்வாறு செயல்படுகிறது

### Auto-Extraction

Agent பயனர் share செய்யும் முக்கியமான facts ஐ -- personal details, project context, preferences -- descriptive keys பயன்படுத்தி proactively சேமிக்கிறது. இது SPINE.md மூலம் guide ஆகும் prompt-level நடத்தை. LLM **என்ன** சேமிக்க வேண்டும் என்று தேர்வு செய்கிறது; policy layer **எந்த நிலையில்** என்று force செய்கிறது.

### Classification Gating

ஒவ்வொரு memory record உம் சேமிக்கப்பட்ட நேரத்தில் session taint க்கு சம classification நிலை கொண்டிருக்கிறது:

- ஒரு `CONFIDENTIAL` session போது சேமிக்கப்பட்ட memory `CONFIDENTIAL` என்று classify ஆகிறது
- ஒரு `PUBLIC` session `CONFIDENTIAL` memories படிக்க முடியாது
- ஒரு `CONFIDENTIAL` session `CONFIDENTIAL` மற்றும் `PUBLIC` memories இரண்டும் படிக்க முடியும்

இது ஒவ்வொரு read operation இலும் `canFlowTo` checks மூலம் enforce ஆகிறது. LLM இதை bypass செய்ய முடியாது.

### Memory Shadowing

ஒரே key பல classification நிலைகளில் exist ஆகும்போது, தற்போதைய session க்கு visible ஆன highest-classified version மட்டும் return ஆகிறது. இது classification boundaries முழுவதும் information leakage தடுக்கிறது.

**எடுத்துக்காட்டு:** `user-name` `PUBLIC` இல் (public chat போது அமைக்கப்பட்டது) மற்றும் `INTERNAL` இல் (private session போது updated) இரண்டிலும் exist ஆனால், ஒரு `INTERNAL` session `INTERNAL` version பாருகிறது, ஒரு `PUBLIC` session `PUBLIC` version மட்டும் பாருகிறது.

### Storage

Memories `StorageProvider` interface மூலம் stored ஆகின்றன (sessions, cron jobs, மற்றும் todos க்கு பயன்படுத்தப்படும் அதே abstraction). Full-text search stemming உடன் fast natural language queries க்கு SQLite FTS5 பயன்படுத்துகிறது.

## பாதுகாப்பு

- `PRE_TOOL_CALL` hook இல் Classification எப்போதும் `session.taint` க்கு force ஆகிறது -- LLM குறைந்த classification தேர்வு செய்ய முடியாது
- அனைத்து reads உம் `canFlowTo` மூலம் filtered -- session taint க்கு மேல் எந்த memory உம் return ஆவதில்லை
- Deletes soft-deletes -- record மறைக்கப்படுகிறது ஆனால் audit க்காக retain செய்யப்படுகிறது
- Agent high-classified data படித்து குறைந்த நிலையில் re-save செய்து memory classification escalate செய்ய முடியாது (write-down prevention பொருந்துகிறது)

::: warning SECURITY LLM memory classification தேர்வு செய்வதில்லை. இது எப்போதும் policy layer மூலம் தற்போதைய session இன் taint நிலைக்கு force ஆகிறது. இது configure செய்து அகற்ற முடியாத ஒரு hard boundary. :::
