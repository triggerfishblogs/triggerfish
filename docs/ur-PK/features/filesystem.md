# Filesystem اور Shell Tools

Triggerfish ایجنٹ کو files پڑھنے، لکھنے، تلاش کرنے، اور commands execute کرنے
کے لیے general-purpose filesystem اور shell tools فراہم کرتا ہے۔ یہ وہ foundational
tools ہیں جن پر دیگر capabilities (exec environment، explore، skills) build ہوتی ہیں۔

## Tools

### `read_file`

Absolute path پر file کا content پڑھیں۔

| Parameter | Type   | ضروری | تفصیل                      |
| --------- | ------ | :---: | --------------------------- |
| `path`    | string | ہاں   | پڑھنے کا absolute file path |

File کا مکمل text content واپس کرتا ہے۔

### `write_file`

Workspace-relative path پر file میں content لکھیں۔

| Parameter | Type   | ضروری | تفصیل                            |
| --------- | ------ | :---: | --------------------------------- |
| `path`    | string | ہاں   | Workspace میں relative path       |
| `content` | string | ہاں   | لکھنے کا file content            |

Writes agent کی workspace directory تک scoped ہیں۔ ایجنٹ filesystem پر arbitrary
locations میں نہیں لکھ سکتا۔

### `edit_file`

File میں unique string replace کریں۔ `old_text` file میں exactly ایک بار appear
ہونی چاہیے۔

| Parameter  | Type   | ضروری | تفصیل                                          |
| ---------- | ------ | :---: | ----------------------------------------------- |
| `path`     | string | ہاں   | Edit کرنے کا absolute file path                |
| `old_text` | string | ہاں   | Exact text جو تلاش کریں (file میں unique ہونی چاہیے) |
| `new_text` | string | ہاں   | Replacement text                               |

یہ surgical edit tool ہے — ایک exact match تلاش کرتا ہے اور replace کرتا ہے۔ اگر
text ایک سے زیادہ بار یا بالکل نہ ملے، تو operation error کے ساتھ fail ہوتا ہے۔

### `list_directory`

دیے گئے absolute path پر files اور directories list کریں۔

| Parameter | Type   | ضروری | تفصیل                              |
| --------- | ------ | :---: | ----------------------------------- |
| `path`    | string | ہاں   | List کرنے کا absolute directory path |

Directories کے لیے `/` suffix کے ساتھ entries واپس کرتا ہے۔

### `search_files`

Glob pattern سے matching files تلاش کریں، یا grep کے ساتھ file contents search
کریں۔

| Parameter        | Type    | ضروری | تفصیل                                                           |
| ---------------- | ------- | :---: | ---------------------------------------------------------------- |
| `path`           | string  | ہاں   | Search کرنے کی directory                                        |
| `pattern`        | string  | ہاں   | File names کے لیے glob pattern، یا files کے اندر تلاش کے لیے text/regex |
| `content_search` | boolean | نہیں  | `true` ہو تو file names کی بجائے file contents search کریں     |

### `run_command`

Agent workspace directory میں shell command چلائیں۔

| Parameter | Type   | ضروری | تفصیل                        |
| --------- | ------ | :---: | ----------------------------- |
| `command` | string | ہاں   | Execute کرنے کا shell command |

stdout، stderr، اور exit code واپس کرتا ہے۔ Commands agent کی workspace directory
میں execute ہوتے ہیں۔ `PRE_TOOL_CALL` hook execution سے پہلے commands کو denylist
کے خلاف check کرتا ہے۔

## دیگر Tools سے تعلق

یہ filesystem tools [Exec Environment](../integrations/exec-environment) tools
(`exec.write`، `exec.read`، `exec.run`، `exec.ls`) کے ساتھ overlap کرتے ہیں۔
فرق:

- **Filesystem tools** absolute paths اور agent کے default workspace پر کام کرتے
  ہیں۔ یہ ہمیشہ available ہیں۔
- **Exec tools** explicit isolation، test runners، اور package installation کے ساتھ
  structured workspace میں کام کرتے ہیں۔ یہ exec environment integration کا حصہ ہیں۔

ایجنٹ general file operations کے لیے filesystem tools اور development workflow
(write/run/fix loop) میں کام کرتے وقت exec tools استعمال کرتا ہے۔

## Security

- `write_file` agent کی workspace directory تک scoped ہے
- `run_command` command context کے ساتھ `PRE_TOOL_CALL` hook سے گزرتا ہے
- Command denylist dangerous operations block کرتی ہے (`rm -rf /`، `sudo`، وغیرہ)
- تمام tool responses classification اور taint tracking کے لیے `POST_TOOL_RESPONSE`
  سے گزرتے ہیں
- Plan mode میں، `write_file` plan approve ہونے تک blocked رہتا ہے
