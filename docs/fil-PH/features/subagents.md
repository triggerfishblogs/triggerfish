# Sub-Agents at LLM Tasks

Maaaring mag-delegate ng trabaho ang mga Triggerfish agent sa sub-agents at mag-run ng isolated LLM prompts. Nagbibigay-daan ito sa parallel work, focused reasoning, at multi-agent task decomposition.

## Mga Tool

### `subagent`

Mag-spawn ng sub-agent para sa autonomous multi-step task. Ang sub-agent ay nakakakuha ng sariling conversation context at maaaring gumamit ng tools nang independent. Ibinabalik ang final result kapag tapos na.

| Parameter | Type   | Required | Paglalarawan                                                    |
| --------- | ------ | -------- | --------------------------------------------------------------- |
| `task`    | string | yes      | Ano ang dapat makamit ng sub-agent                              |
| `tools`   | string | no       | Comma-separated tool whitelist (default: read-only tools)       |

**Default tools:** Nagsisimula ang sub-agents na may read-only tools (`read_file`, `list_directory`, `search_files`, `run_command`). Eksplisitong mag-specify ng karagdagang tools kung kailangan ng sub-agent ng write access.

**Mga halimbawa ng paggamit:**

- Mag-research ng topic habang nagpapatuloy ang main agent sa ibang trabaho
- Mag-explore ng codebase nang parallel mula sa maramihang anggulo (ito ang ginagawa ng `explore` tool sa internally)
- Mag-delegate ng self-contained implementation task

### `llm_task`

Mag-run ng one-shot LLM prompt para sa isolated reasoning. Tumatakbo ang prompt sa hiwalay na context at hindi dinudumihan ang main conversation history.

| Parameter | Type   | Required | Paglalarawan                                     |
| --------- | ------ | -------- | ------------------------------------------------ |
| `prompt`  | string | yes      | Ang prompt na ipapadala                          |
| `system`  | string | no       | Optional na system prompt                        |
| `model`   | string | no       | Optional na model/provider name override         |

**Mga halimbawa ng paggamit:**

- Mag-summarize ng mahabang dokumento nang hindi pinupuno ang main context
- Mag-classify o mag-extract ng data mula sa structured text
- Kumuha ng second opinion sa isang approach
- Mag-run ng prompt laban sa ibang model kaysa sa primary

### `agents_list`

Mag-list ng configured LLM providers at agents. Walang kinukuhang parameters.

Ibinabalik ang impormasyon tungkol sa available providers, ang mga models nila, at configuration status.

## Paano Gumagana ang Sub-Agents

Kapag tumawag ang agent ng `subagent`, ang Triggerfish ay:

1. Gumagawa ng bagong orchestrator instance na may sariling conversation context
2. Binibigyan ang sub-agent ng specified tools (dina-default sa read-only)
3. Ipinapadala ang task bilang initial user message
4. Tumatakbo nang autonomous ang sub-agent -- tumatawag ng tools, nagpo-process ng results, nag-iterate
5. Kapag nag-produce ang sub-agent ng final response, ibinabalik ito sa parent agent

Ini-inherit ng sub-agents ang taint level at classification constraints ng parent session. Hindi sila maaaring mag-escalate nang lampas sa ceiling ng parent.

## Kailan Gamitin ang Bawat Isa

| Tool       | Gamitin Kapag                                                    |
| ---------- | ---------------------------------------------------------------- |
| `subagent` | Multi-step task na nangangailangan ng tool use at iteration      |
| `llm_task` | Single-shot reasoning, summarization, o classification           |
| `explore`  | Pag-unawa ng codebase (gumagamit ng sub-agents internally)       |

::: tip Ang `explore` tool ay binuo sa ibabaw ng `subagent` -- nagsi-spawn ito ng 2-6 parallel sub-agents depende sa depth level. Kung kailangan mo ng structured codebase exploration, gamitin ang `explore` direkta sa halip na manu-manong mag-spawn ng sub-agents. :::

## Sub-Agents vs Agent Teams

Fire-and-forget ang sub-agents: naghihintay ang parent ng iisang result. Ang [Agent Teams](/fil-PH/features/agent-teams) ay persistent groups ng collaborating agents na may distinct roles, lead coordinator, at inter-member communication. Gumamit ng sub-agents para sa focused single-step delegation. Gumamit ng teams kapag nakikinabang ang task sa maramihang specialized perspectives na nag-iterate sa trabaho ng bawat isa.
