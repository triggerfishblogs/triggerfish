# Session Management

ایجنٹ sessions inspect، communicate، اور spawn کر سکتا ہے۔ یہ tools cross-session
workflows، background task delegation، اور cross-channel messaging ممکن بناتے ہیں
— سب write-down enforcement کے تحت۔

## Tools

### `sessions_list`

موجودہ session کو visible تمام active sessions list کریں۔

کوئی parameters نہیں۔ نتائج taint level سے filter ہوتے ہیں — `PUBLIC` session
`CONFIDENTIAL` session metadata نہیں دیکھ سکتی۔

### `sessions_history`

ID کے ذریعے session کی message history حاصل کریں۔

| Parameter    | Type   | ضروری | تفصیل                                    |
| ------------ | ------ | :---: | ----------------------------------------- |
| `session_id` | string | ہاں   | History retrieve کرنے والی session کا ID |

اگر target session کا taint caller کے taint سے زیادہ ہو تو access denied ہوتا ہے۔

### `sessions_send`

موجودہ session سے دوسری session کو content بھیجیں۔ Write-down enforcement کے تابع۔

| Parameter    | Type   | ضروری | تفصیل                      |
| ------------ | ------ | :---: | --------------------------- |
| `session_id` | string | ہاں   | Target session ID           |
| `content`    | string | ہاں   | بھیجنے والا message content |

**Write-down check:** Caller کا taint target session کے classification level تک flow
کر سکنا چاہیے۔ `CONFIDENTIAL` session `PUBLIC` session کو data نہیں بھیج سکتی۔

### `sessions_spawn`

Autonomous task کے لیے نئی background session spawn کریں۔

| Parameter | Type   | ضروری | تفصیل                                              |
| --------- | ------ | :---: | --------------------------------------------------- |
| `task`    | string | ہاں   | Background session کو کیا کرنا چاہیے اس کی تفصیل |

Spawned session independent `PUBLIC` taint اور اپنی isolated workspace کے ساتھ
شروع ہوتی ہے۔ Autonomously چلتی ہے اور complete ہونے پر results واپس کرتی ہے۔

### `session_status`

مخصوص session کا metadata اور status حاصل کریں۔

| Parameter    | Type   | ضروری | تفصیل                   |
| ------------ | ------ | :---: | ------------------------ |
| `session_id` | string | ہاں   | Check کرنے کی session ID |

Session ID، channel، user، taint level، اور creation time واپس کرتا ہے۔ Access
taint-gated ہے۔

### `message`

Channel اور recipient کو message بھیجیں۔ Policy hooks کے ذریعے write-down
enforcement کے تابع۔

| Parameter   | Type   | ضروری | تفصیل                                             |
| ----------- | ------ | :---: | -------------------------------------------------- |
| `channel`   | string | ہاں   | Target channel (مثلاً `telegram`، `slack`)         |
| `recipient` | string | ہاں   | Channel کے اندر recipient identifier              |
| `text`      | string | ہاں   | بھیجنے کا message text                            |

### `summarize`

موجودہ conversation کا concise summary generate کریں۔ Handoff notes بنانے،
context compress کرنے، یا دوسرے channel کو delivery کے لیے recap produce کرنے
کے لیے مفید۔

| Parameter | Type   | ضروری | تفصیل                                               |
| --------- | ------ | :---: | ---------------------------------------------------- |
| `scope`   | string | نہیں  | کیا summarize کریں: `session` (ڈیفالٹ)، `topic`    |

### `simulate_tool_call`

Tool execute کیے بغیر policy engine کا فیصلہ preview کرنے کے لیے tool call simulate
کریں۔ Hook evaluation result (ALLOW، BLOCK، یا REDACT) اور evaluated rules واپس
کرتا ہے۔

| Parameter   | Type   | ضروری | تفصیل                                    |
| ----------- | ------ | :---: | ----------------------------------------- |
| `tool_name` | string | ہاں   | Simulate کرنے کا tool                    |
| `args`      | object | نہیں  | Simulation میں شامل کرنے کے arguments    |

::: tip `simulate_tool_call` استعمال کریں یہ check کرنے کے لیے کہ آیا tool call
allowed ہوگا اسے execute کرنے سے پہلے۔ یہ side effects کے بغیر policy behavior
سمجھنے کے لیے مفید ہے۔ :::

## Use Cases

### Background Task Delegation

ایجنٹ long-running task handle کرنے کے لیے background session spawn کر سکتا ہے
بغیر current conversation block کیے:

```
User: "Research competitor pricing and put together a summary"
Agent: [sessions_spawn کو task کے ساتھ call کرتا ہے]
Agent: "I've started a background session to research that. I'll have results shortly."
```

### Cross-Session Communication

Sessions ایک دوسرے کو data بھیج سکتی ہیں، ایسے workflows ممکن بناتے ہیں جہاں
ایک session data produce کرتی ہے جو دوسری consume کرتی ہے:

```
Background session research complete کرتی ہے → sessions_send to parent → parent user کو notify کرتا ہے
```

### Cross-Channel Messaging

`message` tool ایجنٹ کو کسی بھی connected channel پر proactively reach out کرنے
دیتا ہے:

```
Agent urgent event detect کرتا ہے → message({ channel: "telegram", recipient: "owner", text: "Alert: ..." })
```

## Security

- تمام session operations taint-gated ہیں: آپ اپنے taint level سے اوپر sessions
  نہیں دیکھ، پڑھ، یا بھیج سکتے
- `sessions_send` write-down prevention enforce کرتا ہے: data lower classification
  کو flow نہیں کر سکتا
- Spawned sessions `PUBLIC` taint سے independent taint tracking کے ساتھ شروع ہوتی ہیں
- `message` tool delivery سے پہلے `PRE_OUTPUT` policy hooks سے گزرتا ہے
- Session IDs runtime context سے inject ہوتے ہیں، LLM arguments سے نہیں — ایجنٹ
  دوسری session impersonate نہیں کر سکتا

::: warning SECURITY Write-down prevention تمام cross-session communication پر
enforce ہوتی ہے۔ `CONFIDENTIAL` پر tainted session `PUBLIC` session یا channel کو
data نہیں بھیج سکتی۔ یہ policy layer کی enforce کی گئی hard boundary ہے۔ :::
