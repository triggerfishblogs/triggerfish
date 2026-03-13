# Filesystem आणि Shell Tools

Triggerfish एजंटला files read, write, search, आणि commands execute करण्यासाठी
general-purpose filesystem आणि shell tools प्रदान करतो. हे foundational tools
आहेत ज्यावर इतर capabilities (exec environment, explore, skills) build होतात.

## Tools

### `read_file`

Absolute path वरील file चा contents वाचा.

| Parameter | Type   | Required | वर्णन                   |
| --------- | ------ | -------- | ----------------------- |
| `path`    | string | हो       | Read करायचा absolute file path |

File चा full text content return करतो.

### `write_file`

Workspace-relative path वर content write करा.

| Parameter | Type   | Required | वर्णन                         |
| --------- | ------ | -------- | ----------------------------- |
| `path`    | string | हो       | Workspace मध्ये relative path |
| `content` | string | हो       | Write करायचा file content     |

Writes एजंटच्या workspace directory ला scoped आहेत. एजंट filesystem वर
arbitrary locations वर write करू शकत नाही.

### `edit_file`

File मध्ये unique string replace करा. `old_text` file मध्ये exactly एकदा
appear होणे आवश्यक आहे.

| Parameter  | Type   | Required | वर्णन                                          |
| ---------- | ------ | -------- | ---------------------------------------------- |
| `path`     | string | हो       | Edit करायचा absolute file path                 |
| `old_text` | string | हो       | शोधायचा exact text (file मध्ये unique असणे आवश्यक) |
| `new_text` | string | हो       | Replacement text                               |

हे surgical edit tool आहे -- ते एक exact match शोधते आणि replace करते. Text
एकापेक्षा जास्त वेळा किंवा अजिबात appear होत नसल्यास, operation error सह fail
होते.

### `list_directory`

दिलेल्या absolute path वरील files आणि directories list करा.

| Parameter | Type   | Required | वर्णन                            |
| --------- | ------ | -------- | -------------------------------- |
| `path`    | string | हो       | List करायचा absolute directory path |

Directories साठी `/` suffix सह entries return करतो.

### `search_files`

Glob pattern शी जुळणारे files शोधा, किंवा grep सह file contents search करा.

| Parameter        | Type    | Required | वर्णन                                                                  |
| ---------------- | ------- | -------- | ---------------------------------------------------------------------- |
| `path`           | string  | हो       | Search करायची directory                                                 |
| `pattern`        | string  | हो       | File names साठी glob pattern, किंवा files मध्ये search करण्यासाठी text/regex |
| `content_search` | boolean | नाही     | `true` असल्यास, file names ऐवजी file contents search करा               |

### `run_command`

Agent workspace directory मध्ये shell command run करा.

| Parameter | Type   | Required | वर्णन                      |
| --------- | ------ | -------- | -------------------------- |
| `command` | string | हो       | Execute करायचा shell command |

Stdout, stderr, आणि exit code return करतो. Commands एजंटच्या workspace directory
मध्ये execute केल्या जातात. `PRE_TOOL_CALL` hook execution पूर्वी commands
denylist विरुद्ध check करतो.

## इतर Tools शी Relationship

हे filesystem tools [Exec Environment](../integrations/exec-environment) tools
(`exec.write`, `exec.read`, `exec.run`, `exec.ls`) शी overlap होतात. फरक:

- **Filesystem tools** absolute paths आणि एजंटच्या default workspace वर operate
  करतात. ते नेहमी available असतात.
- **Exec tools** explicit isolation, test runners, आणि package installation सह
  structured workspace मध्ये operate करतात. ते exec environment integration चा
  भाग आहेत.

एजंट general file operations साठी filesystem tools आणि development workflow
(write/run/fix loop) मध्ये काम करताना exec tools वापरतो.

## Security

- `write_file` एजंटच्या workspace directory ला scoped आहे
- `run_command` command context म्हणून `PRE_TOOL_CALL` hook मधून जातो
- Command denylist dangerous operations block करतो (`rm -rf /`, `sudo`, इ.)
- सर्व tool responses classification आणि taint tracking साठी
  `POST_TOOL_RESPONSE` मधून जातात
- Plan mode मध्ये, plan approve होईपर्यंत `write_file` blocked आहे
