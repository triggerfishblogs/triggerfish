# Session Management

एजंट sessions inspect, communicate, आणि spawn करू शकतो. हे tools cross-session
workflows, background task delegation, आणि cross-channel messaging enable करतात
-- सर्व write-down enforcement खाली.

## Tools

### `sessions_list`

Current session ला दिसणाऱ्या सर्व active sessions ची list करा.

कोणतेही parameters घेत नाही. Results taint level नुसार filter केले जातात --
`PUBLIC` session `CONFIDENTIAL` session metadata पाहू शकत नाही.

### `sessions_history`

ID नुसार session साठी message history मिळवा.

| Parameter    | Type   | Required | वर्णन                                      |
| ------------ | ------ | -------- | ------------------------------------------ |
| `session_id` | string | हो       | History retrieve करायच्या session चा ID   |

Target session चा taint caller च्या taint पेक्षा जास्त असल्यास access denied
आहे.

### `sessions_send`

Current session कडून दुसऱ्या session ला content पाठवा. Write-down enforcement
च्या अधीन.

| Parameter    | Type   | Required | वर्णन                           |
| ------------ | ------ | -------- | ------------------------------- |
| `session_id` | string | हो       | Target session ID               |
| `content`    | string | हो       | पाठवायचा message content        |

**Write-down check:** Caller चा taint target session च्या classification level
ला flow करण्यास सक्षम असणे आवश्यक आहे. `CONFIDENTIAL` session `PUBLIC` session
ला data पाठवू शकत नाही.

### `sessions_spawn`

Autonomous task साठी नवीन background session spawn करा.

| Parameter | Type   | Required | वर्णन                                                              |
| --------- | ------ | -------- | ------------------------------------------------------------------ |
| `task`    | string | हो       | Background session ने काय करावे याचे description                   |

Spawned session independent `PUBLIC` taint आणि स्वतःच्या isolated workspace सह
सुरू होतो. ते autonomously चालते आणि complete झाल्यावर results return करते.

### `session_status`

Specific session साठी metadata आणि status मिळवा.

| Parameter    | Type   | Required | वर्णन                      |
| ------------ | ------ | -------- | -------------------------- |
| `session_id` | string | हो       | Check करायच्या session चा ID |

Session ID, channel, user, taint level, आणि creation time return करतो.
Access taint-gated आहे.

### `message`

Channel आणि recipient ला message पाठवा. Policy hooks द्वारे write-down
enforcement च्या अधीन.

| Parameter   | Type   | Required | वर्णन                                         |
| ----------- | ------ | -------- | --------------------------------------------- |
| `channel`   | string | हो       | Target channel (उदा. `telegram`, `slack`)     |
| `recipient` | string | हो       | Channel मधील Recipient identifier             |
| `text`      | string | हो       | पाठवायचा message text                         |

### `summarize`

Current conversation चा concise summary generate करा. Handoff notes तयार
करण्यासाठी, context compress करण्यासाठी, किंवा दुसऱ्या channel ला delivery साठी
recap तयार करण्यासाठी उपयुक्त.

| Parameter | Type   | Required | वर्णन                                             |
| --------- | ------ | -------- | ------------------------------------------------- |
| `scope`   | string | नाही     | काय summarize करायचे: `session` (default), `topic` |

### `simulate_tool_call`

Tool execute न करता policy engine च्या decision ला preview करण्यासाठी tool call
simulate करा. Hook evaluation result (ALLOW, BLOCK, किंवा REDACT) आणि evaluate
केलेले rules return करतो.

| Parameter   | Type   | Required | वर्णन                                       |
| ----------- | ------ | -------- | ------------------------------------------- |
| `tool_name` | string | हो       | Simulate करायचा tool                        |
| `args`      | object | नाही     | Simulation मध्ये समाविष्ट करायचे Arguments |

::: tip Side effects शिवाय policy वर्तन समजण्यासाठी tool call allowed होईल का
ते check करण्यासाठी execute करण्यापूर्वी `simulate_tool_call` वापरा. :::

## Use Cases

### Background Task Delegation

एजंट current conversation block न करता long-running task handle करण्यासाठी
background session spawn करू शकतो:

```
User: "Research competitor pricing and put together a summary"
Agent: [calls sessions_spawn with the task]
Agent: "I've started a background session to research that. I'll have results shortly."
```

### Cross-Session Communication

Sessions एकमेकांना data पाठवू शकतात, एक session data produce करतो आणि दुसरा
consume करतो असे workflows enable करते:

```
Background session completes research → sessions_send to parent → parent notifies user
```

### Cross-Channel Messaging

`message` tool एजंटला कोणत्याही connected channel वर proactively reach out
करण्यास परवानगी देतो:

```
Agent detects an urgent event → message({ channel: "telegram", recipient: "owner", text: "Alert: ..." })
```

## Security

- सर्व session operations taint-gated आहेत: तुम्ही तुमच्या taint level च्या वर
  असलेल्या sessions पाहू, वाचू किंवा पाठवू शकत नाही
- `sessions_send` write-down prevention enforce करतो: data कमी classification
  ला flow करू शकत नाही
- Spawned sessions independent taint tracking सह `PUBLIC` taint वर सुरू होतात
- `message` tool delivery पूर्वी `PRE_OUTPUT` policy hooks मधून जातो
- Session IDs LLM arguments कडून नाही तर runtime context मधून inject केले
  जातात -- एजंट दुसऱ्या session ची impersonate करू शकत नाही

::: warning SECURITY Write-down prevention सर्व cross-session communication वर
enforce केले जाते. `CONFIDENTIAL` tainted session `PUBLIC` session किंवा channel
ला data पाठवू शकत नाही. हे policy layer द्वारे enforce केलेले hard boundary आहे. :::
