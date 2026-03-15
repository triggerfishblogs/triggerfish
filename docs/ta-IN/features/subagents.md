# Sub-Agents மற்றும் LLM Tasks

Triggerfish agents sub-agents க்கு work delegate செய்யலாம் மற்றும் isolated LLM prompts இயக்கலாம். இது parallel work, focused reasoning, மற்றும் multi-agent task decomposition enable செய்கிறது.

## Tools

### `subagent`

ஒரு autonomous multi-step task க்கு ஒரு sub-agent spawn செய்யவும். Sub-agent தன்னுடைய சொந்த conversation context பெறுகிறது மற்றும் tools ஐ independently பயன்படுத்தலாம். Complete ஆகும்போது final result return செய்கிறது.

| Parameter | Type   | Required | விளக்கம்                                                        |
| --------- | ------ | -------- | ----------------------------------------------------------------- |
| `task`    | string | ஆம்      | Sub-agent என்ன accomplish செய்ய வேண்டும்                        |
| `tools`   | string | இல்லை   | Comma-separated tool whitelist (default: read-only tools)        |

**Default tools:** Sub-agents read-only tools உடன் தொடங்குகின்றன (`read_file`, `list_directory`, `search_files`, `run_command`). Sub-agent write access தேவைப்பட்டால் கூடுதல் tools வெளிப்படையாக குறிப்பிடவும்.

**Example பயன்பாடுகள்:**

- Main agent மற்ற வேலை தொடர்கையில் ஒரு topic ஆராய்ச்சி செய்யவும்
- Multiple angles இலிருந்து parallel ஆக ஒரு codebase explore செய்யவும் (இதுதான் `explore` tool internally செய்கிறது)
- ஒரு self-contained implementation task delegate செய்யவும்

### `llm_task`

Isolated reasoning க்கு ஒரு one-shot LLM prompt இயக்கவும். Prompt ஒரு separate context இல் இயங்குகிறது மற்றும் main conversation history ஐ மாசுபடுத்துவதில்லை.

| Parameter | Type   | Required | விளக்கம்                                   |
| --------- | ------ | -------- | -------------------------------------------- |
| `prompt`  | string | ஆம்      | அனுப்ப prompt                               |
| `system`  | string | இல்லை   | Optional system prompt                       |
| `model`   | string | இல்லை   | Optional model/provider name override        |

**Example பயன்பாடுகள்:**

- Main context நிரப்பாமல் ஒரு நீண்ட document summarize செய்யவும்
- Structured text இலிருந்து data classify அல்லது extract செய்யவும்
- ஒரு approach பற்றிய second opinion பெறவும்
- Primary க்கு வேறு model க்கு எதிராக ஒரு prompt இயக்கவும்

### `agents_list`

கட்டமைக்கப்பட்ட LLM providers மற்றும் agents பட்டியலிடவும். Parameters இல்லை.

Available providers, அவற்றின் models, மற்றும் configuration status பற்றிய தகவல் return செய்கிறது.

## Sub-Agents எவ்வாறு செயல்படுகின்றன

Agent `subagent` அழைக்கும்போது, Triggerfish:

1. அதன் சொந்த conversation context உடன் ஒரு புதிய orchestrator instance உருவாக்குகிறது
2. குறிப்பிட்ட tools உடன் sub-agent க்கு வழங்குகிறது (default: read-only)
3. Task ஐ initial user செய்தியாக அனுப்புகிறது
4. Sub-agent தன்னிச்சையாக இயங்குகிறது -- tools அழைக்கிறது, results செயலாக்குகிறது, iterate செய்கிறது
5. Sub-agent ஒரு final response produce செய்யும்போது, அது parent agent க்கு return ஆகிறது

Sub-agents parent session இன் taint நிலை மற்றும் classification constraints inherit செய்கின்றன. அவை parent இன் ceiling க்கு மேல் escalate செய்ய முடியாது.

## ஒவ்வொன்றையும் எப்போது பயன்படுத்துவது

| Tool       | எப்போது பயன்படுத்துவது                                   |
| ---------- | ---------------------------------------------------------- |
| `subagent` | Tool use மற்றும் iteration தேவைப்படும் Multi-step task    |
| `llm_task` | Single-shot reasoning, summarization, அல்லது classification |
| `explore`  | Codebase புரிதல் (internally sub-agents பயன்படுத்துகிறது) |

::: tip `explore` tool `subagent` மேல் built -- depth நிலையை பொறுத்து 2-6 parallel sub-agents spawn செய்கிறது. கட்டமைக்கப்பட்ட codebase exploration தேவையென்றால், manually sub-agents spawn செய்வதற்கு பதிலாக நேரடியாக `explore` பயன்படுத்தவும். :::

## Sub-Agents vs Agent Teams

Sub-agents fire-and-forget: parent ஒரு single result க்காக காத்திருக்கிறது. [Agent Teams](./agent-teams) என்பது distinct roles, ஒரு lead coordinator, மற்றும் inter-member communication உடன் collaborating agents இன் persistent groups. Focused single-step delegation க்கு sub-agents பயன்படுத்தவும். Task multiple specialized perspectives ஒன்றின் வேலையை மற்றொன்று iterate செய்வதிலிருந்து பயனடையும்போது teams பயன்படுத்தவும்.
