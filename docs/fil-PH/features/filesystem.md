# Filesystem at Shell Tools

Nagbibigay ang Triggerfish sa agent ng general-purpose filesystem at shell tools para sa pagbasa, pagsulat, paghahanap, at pag-execute ng commands. Ito ang foundational tools na binubuo ng ibang capabilities (exec environment, explore, skills).

## Mga Tool

### `read_file`

Basahin ang contents ng isang file sa absolute path.

| Parameter | Type   | Required | Paglalarawan                      |
| --------- | ------ | -------- | --------------------------------- |
| `path`    | string | yes      | Absolute file path na babasahin   |

Ibinabalik ang buong text content ng file.

### `write_file`

Magsulat ng content sa isang file sa workspace-relative path.

| Parameter | Type   | Required | Paglalarawan                        |
| --------- | ------ | -------- | ----------------------------------- |
| `path`    | string | yes      | Relative path sa workspace          |
| `content` | string | yes      | File content na isusulat            |

Ang writes ay naka-scope sa workspace directory ng agent. Hindi maaaring magsulat ang agent sa arbitrary locations sa filesystem.

### `edit_file`

Palitan ang isang unique string sa isang file. Ang `old_text` ay kailangang lumabas nang eksaktong isang beses sa file.

| Parameter  | Type   | Required | Paglalarawan                                          |
| ---------- | ------ | -------- | ----------------------------------------------------- |
| `path`     | string | yes      | Absolute file path na ie-edit                         |
| `old_text` | string | yes      | Eksaktong text na hahanapin (kailangang unique sa file) |
| `new_text` | string | yes      | Pamalit na text                                       |

Ito ay surgical edit tool -- naghahanap ng isang eksaktong match at pinapalitan ito. Kung lumabas ang text nang higit sa isang beses o hindi lumabas, mafa-fail ang operation na may error.

### `list_directory`

Mag-list ng files at directories sa isang ibinigay na absolute path.

| Parameter | Type   | Required | Paglalarawan                        |
| --------- | ------ | -------- | ----------------------------------- |
| `path`    | string | yes      | Absolute directory path na ili-list |

Nagbabalik ng entries na may `/` suffix para sa directories.

### `search_files`

Maghanap ng files na tumutugma sa glob pattern, o maghanap sa file contents gamit ang grep.

| Parameter        | Type    | Required | Paglalarawan                                                          |
| ---------------- | ------- | -------- | --------------------------------------------------------------------- |
| `path`           | string  | yes      | Directory kung saan maghahanap                                        |
| `pattern`        | string  | yes      | Glob pattern para sa file names, o text/regex para maghanap sa loob ng files |
| `content_search` | boolean | no       | Kung `true`, maghahanap sa file contents sa halip na file names       |

### `run_command`

Mag-run ng shell command sa workspace directory ng agent.

| Parameter | Type   | Required | Paglalarawan                    |
| --------- | ------ | -------- | ------------------------------- |
| `command` | string | yes      | Shell command na ie-execute     |

Ibinabalik ang stdout, stderr, at exit code. Ang commands ay ine-execute sa workspace directory ng agent. Chine-check ng `PRE_TOOL_CALL` hook ang commands laban sa denylist bago i-execute.

## Relasyon sa Ibang Tools

Ang mga filesystem tools na ito ay nag-o-overlap sa [Exec Environment](../integrations/exec-environment) tools (`exec.write`, `exec.read`, `exec.run`, `exec.ls`). Ang pagkakaiba:

- Ang **Filesystem tools** ay gumagana sa absolute paths at default workspace ng agent. Palaging available ang mga ito.
- Ang **Exec tools** ay gumagana sa loob ng structured workspace na may explicit isolation, test runners, at package installation. Bahagi sila ng exec environment integration.

Ginagamit ng agent ang filesystem tools para sa general file operations at exec tools kapag nagtatrabaho sa development workflow (write/run/fix loop).

## Security

- Naka-scope ang `write_file` sa workspace directory ng agent
- Dumadaan ang `run_command` sa `PRE_TOOL_CALL` hook na may command bilang context
- Bina-block ng command denylist ang mga mapanganib na operations (`rm -rf /`, `sudo`, atbp.)
- Lahat ng tool responses ay dumadaan sa `POST_TOOL_RESPONSE` para sa classification at taint tracking
- Sa plan mode, bina-block ang `write_file` hangga't hindi na-approve ang plan
