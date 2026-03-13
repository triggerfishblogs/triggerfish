# Filesystem மற்றும் Shell Tools

Triggerfish agent க்கு reading, writing, searching, மற்றும் commands executing க்கான general-purpose filesystem மற்றும் shell tools வழங்குகிறது. மற்ற capabilities (exec environment, explore, skills) build on செய்யும் foundational tools இவை.

## Tools

### `read_file`

Absolute path இல் ஒரு file இன் contents படிக்கவும்.

| Parameter | Type   | Required | விளக்கம்                   |
| --------- | ------ | -------- | ---------------------------- |
| `path`    | string | ஆம்      | படிக்க Absolute file path   |

File இன் முழு text content return செய்கிறது.

### `write_file`

Workspace-relative path இல் ஒரு file க்கு content எழுதவும்.

| Parameter | Type   | Required | விளக்கம்                        |
| --------- | ------ | -------- | --------------------------------- |
| `path`    | string | ஆம்      | Workspace இல் Relative path      |
| `content` | string | ஆம்      | எழுத File content                |

Writes agent இன் workspace directory க்கு scoped. Agent filesystem இல் arbitrary locations க்கு எழுத முடியாது.

### `edit_file`

ஒரு file இல் ஒரு unique string மாற்றவும். `old_text` file இல் சரியாக ஒருமுறை தோன்ற வேண்டும்.

| Parameter  | Type   | Required | விளக்கம்                                         |
| ---------- | ------ | -------- | -------------------------------------------------- |
| `path`     | string | ஆம்      | திருத்த Absolute file path                       |
| `old_text` | string | ஆம்      | கண்டுபிடிக்க Exact text (file இல் unique ஆக இருக்க வேண்டும்) |
| `new_text` | string | ஆம்      | Replacement text                                  |

இது ஒரு surgical edit tool -- ஒரு exact match கண்டுபிடித்து மாற்றுகிறது. Text ஒன்றுக்கு மேல் தோன்றினால் அல்லது இல்லையென்றால், operation error உடன் தோல்வியடைகிறது.

### `list_directory`

கொடுக்கப்பட்ட absolute path இல் files மற்றும் directories பட்டியலிடவும்.

| Parameter | Type   | Required | விளக்கம்                          |
| --------- | ------ | -------- | ----------------------------------- |
| `path`    | string | ஆம்      | பட்டியலிட Absolute directory path |

Directories க்கு `/` suffix உடன் entries return செய்கிறது.

### `search_files`

Glob pattern உடன் files தேடவும், அல்லது grep உடன் file contents தேடவும்.

| Parameter        | Type    | Required | விளக்கம்                                                         |
| ---------------- | ------- | -------- | ------------------------------------------------------------------ |
| `path`           | string  | ஆம்      | தேட Directory                                                     |
| `pattern`        | string  | ஆம்      | File names க்கான Glob pattern, அல்லது files க்குள் தேட text/regex |
| `content_search` | boolean | இல்லை   | `true` ஆனால், file names க்கு பதிலாக file contents தேடவும்       |

### `run_command`

Agent workspace directory இல் ஒரு shell command இயக்கவும்.

| Parameter | Type   | Required | விளக்கம்              |
| --------- | ------ | -------- | ----------------------- |
| `command` | string | ஆம்      | Execute செய்ய Shell command |

stdout, stderr, மற்றும் exit code return செய்கிறது. Commands agent இன் workspace directory இல் execute ஆகின்றன. `PRE_TOOL_CALL` hook execution க்கு முன்பு commands ஐ denylist க்கு எதிராக சரிபார்க்கிறது.

## மற்ற Tools உடன் தொடர்பு

இந்த filesystem tools [Exec Environment](../integrations/exec-environment) tools (`exec.write`, `exec.read`, `exec.run`, `exec.ls`) உடன் overlap ஆகின்றன. வேறுபாடு:

- **Filesystem tools** absolute paths மற்றும் agent இன் default workspace இல் operate செய்கின்றன. அவை எப்போதும் available.
- **Exec tools** explicit isolation, test runners, மற்றும் package installation உடன் ஒரு structured workspace க்குள் operate செய்கின்றன. அவை exec environment integration இன் பகுதி.

Agent general file operations க்கு filesystem tools பயன்படுத்துகிறது மற்றும் development workflow இல் (write/run/fix loop) வேலை செய்யும்போது exec tools பயன்படுத்துகிறது.

## பாதுகாப்பு

- `write_file` agent இன் workspace directory க்கு scoped
- `run_command` command ஐ context ஆக `PRE_TOOL_CALL` hook மூலம் செல்கிறது
- ஒரு command denylist dangerous operations (`rm -rf /`, `sudo`, போன்றவை) block செய்கிறது
- அனைத்து tool responses உம் classification மற்றும் taint tracking க்கு `POST_TOOL_RESPONSE` மூலம் செல்கின்றன
- Plan mode இல், plan approve ஆகும் வரை `write_file` block ஆகிறது
