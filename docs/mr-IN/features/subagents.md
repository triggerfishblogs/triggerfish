# Sub-Agents आणि LLM Tasks

Triggerfish एजंट sub-agents ला काम delegate करू शकतात आणि isolated LLM prompts
run करू शकतात. हे parallel work, focused reasoning, आणि multi-agent task
decomposition enable करते.

## Tools

### `subagent`

Autonomous multi-step task साठी sub-agent spawn करा. Sub-agent ला स्वतःचा
conversation context मिळतो आणि ते independently tools वापरू शकते. Complete
झाल्यावर final result return करते.

| Parameter | Type   | Required | वर्णन                                                     |
| --------- | ------ | -------- | --------------------------------------------------------- |
| `task`    | string | हो       | Sub-agent ने काय accomplish करावे                         |
| `tools`   | string | नाही     | Comma-separated tool whitelist (default: read-only tools) |

**Default tools:** Sub-agents read-only tools (`read_file`, `list_directory`,
`search_files`, `run_command`) सह सुरू होतात. Sub-agent ला write access आवश्यक
असल्यास explicitly additional tools specify करा.

**Example uses:**

- Main agent इतर काम continue करत असताना topic research करा
- Codebase parallel मध्ये multiple angles वरून explore करा (हे `explore` tool
  internally करते)
- Self-contained implementation task delegate करा

### `llm_task`

Isolated reasoning साठी one-shot LLM prompt run करा. Prompt स्वतंत्र context
मध्ये run होतो आणि main conversation history pollute करत नाही.

| Parameter | Type   | Required | वर्णन                             |
| --------- | ------ | -------- | --------------------------------- |
| `prompt`  | string | हो       | पाठवायचा prompt                   |
| `system`  | string | नाही     | Optional system prompt            |
| `model`   | string | नाही     | Optional model/provider name override |

**Example uses:**

- Main context न भरता long document summarize करा
- Structured text मधून data classify किंवा extract करा
- Approach वर second opinion मिळवा
- Primary पेक्षा वेगळ्या model विरुद्ध prompt run करा

### `agents_list`

Configured LLM providers आणि agents list करा. कोणतेही parameters घेत नाही.

Available providers, त्यांचे models, आणि configuration status बद्दल माहिती
return करतो.

## Sub-Agents कसे काम करतात

एजंट `subagent` call करतो तेव्हा, Triggerfish:

1. स्वतःच्या conversation context सह नवीन orchestrator instance तयार करतो
2. Sub-agent ला specified tools प्रदान करतो (default read-only)
3. Task initial user message म्हणून पाठवतो
4. Sub-agent autonomously run होतो -- tools calling, results processing, iterating
5. Sub-agent final response produce करतो तेव्हा, ते parent agent ला return
   केले जाते

Sub-agents parent session चा taint level आणि classification constraints inherit
करतात. ते parent च्या ceiling च्या पलीकडे escalate करू शकत नाहीत.

## प्रत्येक केव्हा वापरायचे

| Tool       | केव्हा वापरायचे                                         |
| ---------- | ------------------------------------------------------- |
| `subagent` | Tool use आणि iteration आवश्यक असलेला multi-step task   |
| `llm_task` | Single-shot reasoning, summarization, किंवा classification |
| `explore`  | Codebase understanding (internally sub-agents वापरतो)   |

::: tip `explore` tool `subagent` वर built आहे -- depth level नुसार 2-6 parallel
sub-agents spawn करतो. Structured codebase exploration आवश्यक असल्यास, manually
sub-agents spawn करण्याऐवजी `explore` थेट वापरा. :::

## Sub-Agents vs Agent Teams

Sub-agents fire-and-forget आहेत: parent single result साठी wait करतो.
[Agent Teams](./agent-teams) distinct roles, lead coordinator, आणि inter-member
communication सह collaborating agents चे persistent groups आहेत. Focused
single-step delegation साठी sub-agents वापरा. Task multiple specialized
perspectives एकमेकांच्या कामावर iterate करण्याचा फायदा घेते तेव्हा teams वापरा.
