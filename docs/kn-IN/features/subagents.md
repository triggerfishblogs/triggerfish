# Sub-Agents ಮತ್ತು LLM Tasks

Triggerfish agents sub-agents ಗೆ ಕೆಲಸ ಒಪ್ಪಿಸಬಹುದು ಮತ್ತು ಪ್ರತ್ಯೇಕ LLM prompts
ಚಲಾಯಿಸಬಹುದು. ಇದು ಸಮಾನಾಂತರ ಕೆಲಸ, ಕೇಂದ್ರೀಕೃತ reasoning, ಮತ್ತು ಮಲ್ಟಿ-agent
task decomposition ಸಕ್ರಿಯಗೊಳಿಸುತ್ತದೆ.

## Tools

### `subagent`

ಸ್ವಾಯತ್ತ ಮಲ್ಟಿ-ಸ್ಟೆಪ್ ಕಾರ್ಯಕ್ಕಾಗಿ sub-agent spawn ಮಾಡಿ. Sub-agent ತನ್ನದೇ
conversation context ಪಡೆಯುತ್ತದೆ ಮತ್ತು ಸ್ವತಂತ್ರವಾಗಿ tools ಬಳಸಬಹುದು. ಪೂರ್ಣವಾದಾಗ
ಅಂತಿಮ ಫಲಿತಾಂಶ ಹಿಂದಿರುಗಿಸುತ್ತದೆ.

| Parameter | Type   | Required | Description                                               |
| --------- | ------ | -------- | --------------------------------------------------------- |
| `task`    | string | yes      | Sub-agent ಏನನ್ನು ಸಾಧಿಸಬೇಕು                              |
| `tools`   | string | no       | Comma-separated tool whitelist (ಡಿಫಾಲ್ಟ್: read-only tools) |

**ಡಿಫಾಲ್ಟ್ tools:** Sub-agents read-only tools (`read_file`, `list_directory`,
`search_files`, `run_command`) ಜೊತೆ ಪ್ರಾರಂಭವಾಗುತ್ತವೆ. Sub-agent ಗೆ write access
ಅಗತ್ಯವಿದ್ದರೆ ಹೆಚ್ಚಿನ tools ಸ್ಪಷ್ಟವಾಗಿ ನಿರ್ಧರಿಸಿ.

**ಉದಾಹರಣೆ ಬಳಕೆಗಳು:**

- Main agent ಬೇರೆ ಕೆಲಸ ಮುಂದುವರೆಸುವಾಗ topic ಸಂಶೋಧಿಸಿ
- ಬಹು ಕೋನಗಳಿಂದ ಸಮಾನಾಂತರವಾಗಿ codebase ಅನ್ವೇಷಿಸಿ (ಇದನ್ನೇ `explore` tool
  ಆಂತರಿಕವಾಗಿ ಮಾಡುತ್ತದೆ)
- Self-contained implementation task ಒಪ್ಪಿಸಿ

### `llm_task`

ಪ್ರತ್ಯೇಕ reasoning ಗಾಗಿ one-shot LLM prompt ಚಲಾಯಿಸಿ. Prompt ಪ್ರತ್ಯೇಕ context
ನಲ್ಲಿ ಚಲಿಸುತ್ತದೆ ಮತ್ತು ಮುಖ್ಯ conversation ಇತಿಹಾಸ ಕಲುಷಿತಗೊಳಿಸುವುದಿಲ್ಲ.

| Parameter | Type   | Required | Description                           |
| --------- | ------ | -------- | ------------------------------------- |
| `prompt`  | string | yes      | ಕಳುಹಿಸಬೇಕಾದ prompt                   |
| `system`  | string | no       | ಐಚ್ಛಿಕ system prompt                  |
| `model`   | string | no       | ಐಚ್ಛಿಕ model/provider ಹೆಸರಿನ override |

**ಉದಾಹರಣೆ ಬಳಕೆಗಳು:**

- Main context ತುಂಬಿಸದೆ ದೀರ್ಘ ದಾಖಲೆ ಸಾರಾಂಶ ಮಾಡಿ
- ರಚನಾತ್ಮಕ ಪಠ್ಯದಿಂದ ಡೇಟಾ classify ಅಥವಾ ಹೊರಡಿಸಿ
- ಒಂದು approach ಮೇಲೆ ಎರಡನೇ ಅಭಿಪ್ರಾಯ ತರಿಸಿ
- Primary ಭಿನ್ನ model ವಿರುದ್ಧ prompt ಚಲಾಯಿಸಿ

### `agents_list`

Configure ಮಾಡಿದ LLM providers ಮತ್ತು agents ಪಟ್ಟಿ ಮಾಡಿ. ಯಾವ parameters ಇಲ್ಲ.

ಲಭ್ಯ providers, ಅವುಗಳ models, ಮತ್ತು configuration status ಬಗ್ಗೆ ಮಾಹಿತಿ
ಹಿಂದಿರುಗಿಸುತ್ತದೆ.

## Sub-Agents ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ತವೆ

Agent `subagent` call ಮಾಡಿದಾಗ, Triggerfish:

1. ತನ್ನದೇ conversation context ಜೊತೆ ಹೊಸ orchestrator instance ರಚಿಸುತ್ತದೆ
2. Sub-agent ಗೆ ನಿರ್ಧರಿಸಿದ tools ಒದಗಿಸುತ್ತದೆ (read-only ಗೆ ಡಿಫಾಲ್ಟ್)
3. Task ಅನ್ನು initial user message ಆಗಿ ಕಳುಹಿಸುತ್ತದೆ
4. Sub-agent ಸ್ವಾಯತ್ತವಾಗಿ ಚಲಿಸುತ್ತದೆ -- tools call ಮಾಡಿ, ಫಲಿತಾಂಶ process ಮಾಡಿ,
   iterate ಮಾಡಿ
5. Sub-agent ಅಂತಿಮ response ತಯಾರಿಸಿದಾಗ, ಅದನ್ನು parent agent ಗೆ ಹಿಂದಿರುಗಿಸಲ್ಪಡುತ್ತದೆ

Sub-agents parent session ನ taint ಮಟ್ಟ ಮತ್ತು classification ನಿರ್ಬಂಧಗಳನ್ನು ಆನುವಂಶಿಕ
ಪಡೆಯುತ್ತವೆ. ಇವು parent ನ ceiling ಮೀರಿ escalate ಮಾಡಲಾಗದು.

## ಯಾವುದನ್ನು ಯಾವಾಗ ಬಳಸಬೇಕು

| Tool       | ಯಾವಾಗ ಬಳಸಬೇಕು                                                |
| ---------- | ------------------------------------------------------------ |
| `subagent` | Tool use ಮತ್ತು iteration ಅಗತ್ಯವಿರುವ ಮಲ್ಟಿ-ಸ್ಟೆಪ್ ಕಾರ್ಯ    |
| `llm_task` | Single-shot reasoning, summarization, ಅಥವಾ classification   |
| `explore`  | Codebase ತಿಳಿವಳಿಕೆ (ಆಂತರಿಕವಾಗಿ sub-agents ಬಳಸುತ್ತದೆ)     |

::: tip `explore` tool `subagent` ಮೇಲೆ ನಿರ್ಮಿಸಲ್ಪಟ್ಟಿದೆ -- depth ಮಟ್ಟ ಆಧಾರದ
ಮೇಲೆ 2-6 ಸಮಾನಾಂತರ sub-agents spawn ಮಾಡುತ್ತದೆ. ರಚನಾತ್ಮಕ codebase ಅನ್ವೇಷಣೆ
ಅಗತ್ಯವಿದ್ದರೆ ಹಸ್ತಚಾಲಿತವಾಗಿ sub-agents spawn ಮಾಡುವ ಬದಲು ನೇರವಾಗಿ `explore`
ಬಳಸಿ. :::

## Sub-Agents vs Agent Teams

Sub-agents fire-and-forget ಆಗಿವೆ: parent ಒಂದೇ ಫಲಿತಾಂಶಕ್ಕಾಗಿ ಕಾಯುತ್ತದೆ.
[Agent Teams](./agent-teams) ವಿಭಿನ್ನ ಪಾತ್ರಗಳು, lead coordinator, ಮತ್ತು
inter-member communication ಇರುವ collaborating agents ನ ಶಾಶ್ವತ ಗುಂಪುಗಳಾಗಿವೆ.
ಕೇಂದ್ರೀಕೃತ single-step delegation ಗಾಗಿ sub-agents ಬಳಸಿ. ಕಾರ್ಯ ಬಹು ವಿಶೇಷ
perspectives ಪರಸ್ಪರ ಕೆಲಸದ ಮೇಲೆ iterate ಮಾಡುವುದರಿಂದ ಪ್ರಯೋಜನ ಪಡೆಯುವಾಗ teams
ಬಳಸಿ.
