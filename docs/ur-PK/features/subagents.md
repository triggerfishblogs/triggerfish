# Sub-Agents اور LLM Tasks

Triggerfish ایجنٹس sub-agents کو کام delegate اور isolated LLM prompts چلا سکتے
ہیں۔ یہ parallel work، focused reasoning، اور multi-agent task decomposition ممکن
بناتا ہے۔

## Tools

### `subagent`

Autonomous multi-step task کے لیے sub-agent spawn کریں۔ Sub-agent کو اپنا
conversation context ملتا ہے اور وہ آزادانہ tools استعمال کر سکتا ہے۔ Complete
ہونے پر final result واپس کرتا ہے۔

| Parameter | Type   | ضروری | تفصیل                                                          |
| --------- | ------ | :---: | --------------------------------------------------------------- |
| `task`    | string | ہاں   | Sub-agent کو کیا accomplish کرنا چاہیے                         |
| `tools`   | string | نہیں  | Comma-separated tool whitelist (ڈیفالٹ: read-only tools)       |

**ڈیفالٹ tools:** Sub-agents read-only tools کے ساتھ شروع ہوتے ہیں (`read_file`،
`list_directory`، `search_files`، `run_command`)۔ اگر sub-agent کو write access
درکار ہو تو additional tools explicitly specify کریں۔

**مثالی uses:**

- Main agent دوسرے کام جاری رکھتے ہوئے topic research کریں
- Codebase کو multiple angles سے parallel میں explore کریں (یہی وہ چیز ہے جو
  `explore` tool internally کرتا ہے)
- Self-contained implementation task delegate کریں

### `llm_task`

Isolated reasoning کے لیے one-shot LLM prompt چلائیں۔ Prompt الگ context میں
چلتا ہے اور main conversation history کو pollute نہیں کرتا۔

| Parameter | Type   | ضروری | تفصیل                                  |
| --------- | ------ | :---: | --------------------------------------- |
| `prompt`  | string | ہاں   | بھیجنے کا prompt                       |
| `system`  | string | نہیں  | Optional system prompt                  |
| `model`   | string | نہیں  | Optional model/provider name override   |

**مثالی uses:**

- Main context fill کیے بغیر long document summarize کریں
- Structured text سے data classify یا extract کریں
- Approach پر دوسری رائے لیں
- Primary سے مختلف model کے خلاف prompt چلائیں

### `agents_list`

Configured LLM providers اور agents list کریں۔ کوئی parameters نہیں۔

Available providers، ان کے models، اور configuration status کے بارے میں معلومات
واپس کرتا ہے۔

## Sub-Agents کیسے کام کرتے ہیں

جب ایجنٹ `subagent` call کرتا ہے، Triggerfish:

1. اپنے conversation context کے ساتھ نیا orchestrator instance بناتا ہے
2. Sub-agent کو specified tools دیتا ہے (ڈیفالٹ read-only)
3. Task بطور initial user message بھیجتا ہے
4. Sub-agent autonomously چلتا ہے — tools call کرتا ہے، results process کرتا ہے،
   iterate کرتا ہے
5. جب sub-agent final response produce کرے، وہ parent agent کو واپس کیا جاتا ہے

Sub-agents parent session کا taint level اور classification constraints inherit
کرتے ہیں۔ وہ parent کے ceiling سے آگے escalate نہیں کر سکتے۔

## ہر ایک کب استعمال کریں

| Tool       | کب استعمال کریں                                            |
| ---------- | ----------------------------------------------------------- |
| `subagent` | Multi-step task جس میں tool use اور iteration درکار ہو     |
| `llm_task` | Single-shot reasoning، summarization، یا classification    |
| `explore`  | Codebase understanding (internally sub-agents استعمال کرتا ہے) |

::: tip `explore` tool `subagent` کے اوپر built ہے — یہ depth level کے مطابق 2-6
parallel sub-agents spawn کرتا ہے۔ اگر آپ کو structured codebase exploration
درکار ہو تو manually sub-agents spawn کرنے کی بجائے directly `explore` استعمال
کریں۔ :::

## Sub-Agents بمقابلہ Agent Teams

Sub-agents fire-and-forget ہیں: parent ایک result کا انتظار کرتا ہے۔
[Agent Teams](/ur-PK/features/agent-teams) مختلف roles، lead coordinator، اور
inter-member communication والے agents کے persistent groups ہیں۔ Focused
single-step delegation کے لیے sub-agents استعمال کریں۔ Teams تب استعمال کریں
جب task multiple specialized perspectives سے benefit کرے جو ایک دوسرے کے کام
پر iterate کریں۔
