# Session ನಿರ್ವಹಣೆ

Agent sessions ತಪಾಸಣೆ ಮಾಡಬಹುದು, ಸಂವಾದಿಸಬಹುದು, ಮತ್ತು spawn ಮಾಡಬಹುದು. ಈ tools
cross-session workflows, ಹಿನ್ನೆಲೆ task delegation, ಮತ್ತು cross-channel messaging
ಸಕ್ರಿಯಗೊಳಿಸುತ್ತವೆ -- ಎಲ್ಲವೂ write-down enforcement ಅಡಿಯಲ್ಲಿ.

## Tools

### `sessions_list`

ಪ್ರಸ್ತುತ session ಗೆ ಗೋಚರಿಸುವ ಎಲ್ಲ active sessions ಪಟ್ಟಿ ಮಾಡಿ.

ಯಾವ parameters ಇಲ್ಲ. ಫಲಿತಾಂಶಗಳನ್ನು taint ಮಟ್ಟದಿಂದ ಫಿಲ್ಟರ್ ಮಾಡಲಾಗುತ್ತದೆ -- `PUBLIC`
session `CONFIDENTIAL` session metadata ನೋಡಲಾಗದು.

### `sessions_history`

ID ಮೂಲಕ session ಗಾಗಿ message ಇತಿಹಾಸ ತರಿಸಿ.

| Parameter    | Type   | Required | Description                            |
| ------------ | ------ | -------- | -------------------------------------- |
| `session_id` | string | yes      | ಇತಿಹಾಸ ತರಿಸಬೇಕಾದ session ID |

ಗುರಿ session ನ taint caller ನ taint ಗಿಂತ ಹೆಚ್ಚಿದ್ದರೆ access ನಿರಾಕರಿಸಲ್ಪಡುತ್ತದೆ.

### `sessions_send`

ಪ್ರಸ್ತುತ session ನಿಂದ ಇನ್ನೊಂದು session ಗೆ ವಿಷಯ ಕಳುಹಿಸಿ. Write-down
enforcement ಅಧೀನ.

| Parameter    | Type   | Required | Description                 |
| ------------ | ------ | -------- | --------------------------- |
| `session_id` | string | yes      | ಗುರಿ session ID           |
| `content`    | string | yes      | ಕಳುಹಿಸಬೇಕಾದ message ವಿಷಯ |

**Write-down ಪರಿಶೀಲನೆ:** Caller ನ taint ಗುರಿ session ನ classification ಮಟ್ಟಕ್ಕೆ
flow ಮಾಡಬಲ್ಲದ್ದಾಗಿರಬೇಕು. `CONFIDENTIAL` session `PUBLIC` session ಗೆ ಡೇಟಾ ಕಳುಹಿಸಲಾಗದು.

### `sessions_spawn`

ಸ್ವಾಯತ್ತ task ಗಾಗಿ ಹೊಸ ಹಿನ್ನೆಲೆ session spawn ಮಾಡಿ.

| Parameter | Type   | Required | Description                                          |
| --------- | ------ | -------- | ---------------------------------------------------- |
| `task`    | string | yes      | ಹಿನ್ನೆಲೆ session ಏನು ಮಾಡಬೇಕು ಎಂಬ ವಿವರಣೆ |

Spawn ಮಾಡಿದ session ಸ್ವತಂತ್ರ `PUBLIC` taint ಮತ್ತು ತನ್ನದೇ ಪ್ರತ್ಯೇಕ workspace
ಜೊತೆ ಪ್ರಾರಂಭವಾಗುತ್ತದೆ. ಇದು ಸ್ವಾಯತ್ತವಾಗಿ ಚಲಿಸುತ್ತದೆ ಮತ್ತು ಪೂರ್ಣವಾದಾಗ ಫಲಿತಾಂಶಗಳನ್ನು
ಹಿಂದಿರುಗಿಸುತ್ತದೆ.

### `session_status`

ನಿರ್ದಿಷ್ಟ session ಗಾಗಿ metadata ಮತ್ತು status ತರಿಸಿ.

| Parameter    | Type   | Required | Description             |
| ------------ | ------ | -------- | ----------------------- |
| `session_id` | string | yes      | ತಪಾಸಣೆ ಮಾಡಬೇಕಾದ session ID |

Session ID, channel, user, taint ಮಟ್ಟ, ಮತ್ತು creation ಸಮಯ ಹಿಂದಿರುಗಿಸುತ್ತದೆ.
Taint-gated ಪ್ರವೇಶ.

### `message`

Channel ಮತ್ತು ಸ್ವೀಕರಿಸುವವರಿಗೆ message ಕಳುಹಿಸಿ. Policy hooks ಮೂಲಕ write-down
enforcement ಅಧೀನ.

| Parameter   | Type   | Required | Description                               |
| ----------- | ------ | -------- | ----------------------------------------- |
| `channel`   | string | yes      | ಗುರಿ channel (ಉದಾ. `telegram`, `slack`) |
| `recipient` | string | yes      | Channel ಒಳಗಿನ ಸ್ವೀಕರಿಸುವವರ identifier   |
| `text`      | string | yes      | ಕಳುಹಿಸಬೇಕಾದ message ಪಠ್ಯ                |

### `summarize`

ಪ್ರಸ್ತುತ conversation ನ ಸಂಕ್ಷಿಪ್ತ ಸಾರಾಂಶ ರಚಿಸಿ. Handoff notes ರಚಿಸಲು, context
ಸಂಕುಚಿಸಲು, ಅಥವಾ ಇನ್ನೊಂದು channel ಗೆ ತಲುಪಿಸಲು recap ತಯಾರಿಸಲು ಉಪಯುಕ್ತ.

| Parameter | Type   | Required | Description                                     |
| --------- | ------ | -------- | ----------------------------------------------- |
| `scope`   | string | no       | ಏನನ್ನು ಸಾರಾಂಶ ಮಾಡಬೇಕು: `session` (ಡಿಫಾಲ್ಟ್), `topic` |

### `simulate_tool_call`

Tool ಚಲಾಯಿಸದೆ policy engine ನ ನಿರ್ಧಾರ preview ಮಾಡಲು tool call simulate ಮಾಡಿ.
Hook evaluation ಫಲಿತಾಂಶ (ALLOW, BLOCK, ಅಥವಾ REDACT) ಮತ್ತು evaluate ಮಾಡಿದ rules
ಹಿಂದಿರುಗಿಸುತ್ತದೆ.

| Parameter   | Type   | Required | Description                              |
| ----------- | ------ | -------- | ---------------------------------------- |
| `tool_name` | string | yes      | Simulate ಮಾಡಬೇಕಾದ tool                 |
| `args`      | object | no       | Simulation ನಲ್ಲಿ ಸೇರಿಸಬೇಕಾದ arguments   |

::: tip Tool call ಅನುಮತಿಸಲ್ಪಡುತ್ತದೆಯೇ ಎಂದು ಚಲಾಯಿಸುವ ಮೊದಲು ಪರಿಶೀಲಿಸಲು
`simulate_tool_call` ಬಳಸಿ. Side effects ಇಲ್ಲದೆ policy ನಡವಳಿಕೆ ಅರ್ಥಮಾಡಿಕೊಳ್ಳಲು ಇದು
ಉಪಯುಕ್ತ. :::

## ಬಳಕೆ ಪ್ರಕರಣಗಳು

### ಹಿನ್ನೆಲೆ Task Delegation

Agent ಪ್ರಸ್ತುತ conversation ನಿಲ್ಲಿಸದೆ ದೀರ್ಘ-ಚಾಲನೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸಲು ಹಿನ್ನೆಲೆ
session spawn ಮಾಡಬಹುದು:

```
User: "Research competitor pricing and put together a summary"
Agent: [calls sessions_spawn with the task]
Agent: "I've started a background session to research that. I'll have results shortly."
```

### Cross-Session ಸಂವಾದ

Sessions ಪರಸ್ಪರ ಡೇಟಾ ಕಳುಹಿಸಬಹುದು, ಒಂದು session ಡೇಟಾ ಉತ್ಪಾದಿಸಿ ಇನ್ನೊಂದು
ಬಳಸುವ workflows ಸಕ್ರಿಯಗೊಳಿಸುತ್ತದೆ:

```
Background session completes research → sessions_send to parent → parent notifies user
```

### Cross-Channel Messaging

`message` tool agent ಅನ್ನು ಯಾವ ಸಂಪರ್ಕಿತ channel ನಲ್ಲಾದರೂ ಸಕ್ರಿಯವಾಗಿ ತಲುಪಲು
ಅನುಮತಿಸುತ್ತದೆ:

```
Agent detects an urgent event → message({ channel: "telegram", recipient: "owner", text: "Alert: ..." })
```

## ಭದ್ರತೆ

- ಎಲ್ಲ session operations taint-gated: ನಿಮ್ಮ taint ಮಟ್ಟಕ್ಕಿಂತ ಮೇಲಿನ sessions
  ನೋಡಲು, ಓದಲು ಅಥವಾ ಕಳುಹಿಸಲಾಗದು
- `sessions_send` write-down prevention ಜಾರಿಗೊಳಿಸುತ್ತದೆ: ಕಡಿಮೆ classification ಗೆ
  ಡೇಟಾ flow ಮಾಡಲಾಗದು
- Spawn ಮಾಡಿದ sessions ಸ್ವತಂತ್ರ taint tracking ಜೊತೆ `PUBLIC` taint ನಲ್ಲಿ ಪ್ರಾರಂಭವಾಗುತ್ತವೆ
- `message` tool ವಿತರಣೆಗೆ ಮೊದಲು `PRE_OUTPUT` policy hooks ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತದೆ
- Session IDs runtime context ನಿಂದ inject ಮಾಡಲ್ಪಡುತ್ತವೆ, LLM arguments ನಿಂದ ಅಲ್ಲ --
  agent ಇನ್ನೊಂದು session ಹೋಲಿಸಲಾಗದು

::: warning SECURITY Write-down prevention ಎಲ್ಲ cross-session communication ನಲ್ಲಿ
ಜಾರಿಗೊಳಿಸಲ್ಪಡುತ್ತದೆ. `CONFIDENTIAL` ನಲ್ಲಿ tainted ಆದ session `PUBLIC` session ಅಥವಾ
channel ಗೆ ಡೇಟಾ ಕಳುಹಿಸಲಾಗದು. ಇದು policy layer ಜಾರಿಗೊಳಿಸುವ ಕಠಿಣ ಗಡಿ. :::
