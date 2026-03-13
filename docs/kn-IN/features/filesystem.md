# Filesystem ಮತ್ತು Shell Tools

Triggerfish agent ಗೆ ಫೈಲ್‌ಗಳನ್ನು ಓದಲು, ಬರೆಯಲು, ಹುಡುಕಲು, ಮತ್ತು commands
ಚಲಾಯಿಸಲು general-purpose filesystem ಮತ್ತು shell tools ಒದಗಿಸುತ್ತದೆ. ಇವು ಇತರ
capabilities (exec environment, explore, skills) ನಿರ್ಮಿಸುವ ಮೂಲಭೂತ tools.

## Tools

### `read_file`

Absolute path ನಲ್ಲಿ ಫೈಲ್ ವಿಷಯ ಓದಿ.

| Parameter | Type   | Required | Description                |
| --------- | ------ | -------- | -------------------------- |
| `path`    | string | yes      | ಓದಬೇಕಾದ absolute file path |

ಫೈಲ್ ನ ಪೂರ್ಣ text ವಿಷಯ ಹಿಂದಿರುಗಿಸುತ್ತದೆ.

### `write_file`

Workspace-relative path ನಲ್ಲಿ ಫೈಲ್ ಗೆ ವಿಷಯ ಬರೆಯಿರಿ.

| Parameter | Type   | Required | Description                    |
| --------- | ------ | -------- | ------------------------------ |
| `path`    | string | yes      | Workspace ನಲ್ಲಿ relative path  |
| `content` | string | yes      | ಬರೆಯಬೇಕಾದ ಫೈಲ್ ವಿಷಯ          |

Writes agent ನ workspace directory ಗೆ scope ಮಾಡಲ್ಪಡುತ್ತವೆ. Agent filesystem ನಲ್ಲಿ
arbitrary ಸ್ಥಳಗಳಿಗೆ ಬರೆಯಲಾಗದು.

### `edit_file`

ಫೈಲ್ ನಲ್ಲಿ ಅನನ್ಯ string ಬದಲಾಯಿಸಿ. `old_text` ಫೈಲ್ ನಲ್ಲಿ ನಿಖರವಾಗಿ ಒಮ್ಮೆ ಕಾಣಿಸಿಕೊಳ್ಳಬೇಕು.

| Parameter  | Type   | Required | Description                                 |
| ---------- | ------ | -------- | ------------------------------------------- |
| `path`     | string | yes      | Edit ಮಾಡಬೇಕಾದ absolute file path           |
| `old_text` | string | yes      | ಹುಡುಕಬೇಕಾದ ನಿಖರ ಪಠ್ಯ (ಫೈಲ್ ನಲ್ಲಿ ಅನನ್ಯವಾಗಿರಬೇಕು) |
| `new_text` | string | yes      | ಬದಲಿ ಪಠ್ಯ                                  |

ಇದು surgical edit tool -- ಒಂದು ನಿಖರ match ಹುಡುಕಿ ಬದಲಾಯಿಸುತ್ತದೆ. ಪಠ್ಯ ಒಂದಕ್ಕಿಂತ
ಹೆಚ್ಚು ಬಾರಿ ಅಥವಾ ಒಮ್ಮೆಯೂ ಕಾಣಿಸಿಕೊಳ್ಳದಿದ್ದರೆ, operation error ಜೊತೆ ವಿಫಲವಾಗುತ್ತದೆ.

### `list_directory`

ನೀಡಿದ absolute path ನಲ್ಲಿ ಫೈಲ್‌ಗಳು ಮತ್ತು directories ಪಟ್ಟಿ ಮಾಡಿ.

| Parameter | Type   | Required | Description                     |
| --------- | ------ | -------- | ------------------------------- |
| `path`    | string | yes      | List ಮಾಡಬೇಕಾದ absolute directory path |

Directories ಗಾಗಿ `/` suffix ಜೊತೆ entries ಹಿಂದಿರುಗಿಸುತ್ತದೆ.

### `search_files`

Glob pattern ಹೊಂದಿಸುವ ಫೈಲ್‌ಗಳನ್ನು ಹುಡುಕಿ, ಅಥವಾ grep ಜೊತೆ ಫೈಲ್ ವಿಷಯ ಹುಡುಕಿ.

| Parameter        | Type    | Required | Description                                                       |
| ---------------- | ------- | -------- | ----------------------------------------------------------------- |
| `path`           | string  | yes      | ಹುಡುಕಬೇಕಾದ directory                                             |
| `pattern`        | string  | yes      | ಫೈಲ್ ಹೆಸರುಗಳಿಗಾಗಿ Glob pattern, ಅಥವಾ ಫೈಲ್ ಒಳಗೆ search text/regex |
| `content_search` | boolean | no       | `true` ಆದರೆ ಫೈಲ್ ಹೆಸರುಗಳ ಬದಲು ಫೈಲ್ ವಿಷಯ ಹುಡುಕಿ             |

### `run_command`

Agent workspace directory ನಲ್ಲಿ shell command ಚಲಾಯಿಸಿ.

| Parameter | Type   | Required | Description              |
| --------- | ------ | -------- | ------------------------ |
| `command` | string | yes      | ಚಲಾಯಿಸಬೇಕಾದ shell command |

Stdout, stderr, ಮತ್ತು exit code ಹಿಂದಿರುಗಿಸುತ್ತದೆ. Commands agent ನ workspace
directory ನಲ್ಲಿ execute ಮಾಡಲ್ಪಡುತ್ತವೆ. Execution ಮೊದಲು `PRE_TOOL_CALL` hook
commands ಅನ್ನು denylist ವಿರುದ್ಧ ತಪಾಸಿಸುತ್ತದೆ.

## ಇತರ Tools ಜೊತೆ ಸಂಬಂಧ

ಈ filesystem tools [Exec Environment](../integrations/exec-environment) tools
(`exec.write`, `exec.read`, `exec.run`, `exec.ls`) ಜೊತೆ overlap ಆಗುತ್ತವೆ. ವ್ಯತ್ಯಾಸ:

- **Filesystem tools** absolute paths ಮತ್ತು agent ನ default workspace ನಲ್ಲಿ
  operate ಮಾಡುತ್ತವೆ. ಇವು ಯಾವಾಗಲೂ ಲಭ್ಯ.
- **Exec tools** ಸ್ಪಷ್ಟ isolation, test runners, ಮತ್ತು package installation ಜೊತೆ
  ರಚನಾತ್ಮಕ workspace ಒಳಗೆ operate ಮಾಡುತ್ತವೆ. ಇವು exec environment integration
  ಭಾಗ.

Agent ಸಾಮಾನ್ಯ ಫೈಲ್ operations ಗಾಗಿ filesystem tools ಮತ್ತು development workflow
(write/run/fix loop) ನಲ್ಲಿ ಕೆಲಸ ಮಾಡುವಾಗ exec tools ಬಳಸುತ್ತದೆ.

## ಭದ್ರತೆ

- `write_file` agent ನ workspace directory ಗೆ scope ಮಾಡಲ್ಪಟ್ಟಿದೆ
- `run_command` command ಅನ್ನು context ಆಗಿ `PRE_TOOL_CALL` hook ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತದೆ
- Command denylist ಅಪಾಯಕರ operations block ಮಾಡುತ್ತದೆ (`rm -rf /`, `sudo`, ಇತ್ಯಾದಿ)
- ಎಲ್ಲ tool responses classification ಮತ್ತು taint tracking ಗಾಗಿ `POST_TOOL_RESPONSE`
  ಮೂಲಕ ಹಾದು ಹೋಗುತ್ತವೆ
- Plan mode ನಲ್ಲಿ, plan approve ಆಗುವ ತನಕ `write_file` blocked
