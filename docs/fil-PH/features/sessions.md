# Session Management

Maaaring mag-inspect, mag-communicate, at mag-spawn ng sessions ang agent. Ang mga tools na ito ay nagbibigay-daan sa cross-session workflows, background task delegation, at cross-channel messaging -- lahat sa ilalim ng write-down enforcement.

## Mga Tool

### `sessions_list`

Mag-list ng lahat ng active sessions na visible sa kasalukuyang session.

Walang kinukuhang parameters. Ang results ay nifi-filter ayon sa taint level -- hindi makikita ng `PUBLIC` session ang `CONFIDENTIAL` session metadata.

### `sessions_history`

Kunin ang message history para sa isang session ayon sa ID.

| Parameter    | Type   | Required | Paglalarawan                                    |
| ------------ | ------ | -------- | ----------------------------------------------- |
| `session_id` | string | yes      | Ang session ID kung saan kukuha ng history      |

Dine-deny ang access kung mas mataas ang taint ng target session kaysa sa taint ng caller.

### `sessions_send`

Magpadala ng content mula sa kasalukuyang session patungo sa ibang session. Subject sa write-down enforcement.

| Parameter    | Type   | Required | Paglalarawan                       |
| ------------ | ------ | -------- | ---------------------------------- |
| `session_id` | string | yes      | Target session ID                  |
| `content`    | string | yes      | Ang message content na ipapadala   |

**Write-down check:** Kailangang maaaring dumaloy ang taint ng caller sa classification level ng target session. Hindi maaaring magpadala ng data ang `CONFIDENTIAL` session sa `PUBLIC` session.

### `sessions_spawn`

Mag-spawn ng bagong background session para sa autonomous task.

| Parameter | Type   | Required | Paglalarawan                                                |
| --------- | ------ | -------- | ----------------------------------------------------------- |
| `task`    | string | yes      | Paglalarawan kung ano ang dapat gawin ng background session |

Nagsisimula ang spawned session na may independent `PUBLIC` taint at sariling isolated workspace. Tumatakbo ito nang autonomous at nagbabalik ng results kapag tapos na.

### `session_status`

Kunin ang metadata at status para sa isang specific session.

| Parameter    | Type   | Required | Paglalarawan                       |
| ------------ | ------ | -------- | ---------------------------------- |
| `session_id` | string | yes      | Ang session ID na iche-check       |

Ibinabalik ang session ID, channel, user, taint level, at creation time. Taint-gated ang access.

### `message`

Magpadala ng mensahe sa isang channel at recipient. Subject sa write-down enforcement sa pamamagitan ng policy hooks.

| Parameter   | Type   | Required | Paglalarawan                                       |
| ----------- | ------ | -------- | -------------------------------------------------- |
| `channel`   | string | yes      | Target channel (hal. `telegram`, `slack`)           |
| `recipient` | string | yes      | Recipient identifier sa loob ng channel            |
| `text`      | string | yes      | Message text na ipapadala                          |

### `summarize`

Mag-generate ng concise summary ng kasalukuyang conversation. Kapaki-pakinabang para sa paggawa ng handoff notes, pag-compress ng context, o pag-produce ng recap para sa delivery sa ibang channel.

| Parameter | Type   | Required | Paglalarawan                                            |
| --------- | ------ | -------- | ------------------------------------------------------- |
| `scope`   | string | no       | Ano ang susumarize: `session` (default), `topic`        |

### `simulate_tool_call`

Mag-simulate ng tool call para ma-preview ang desisyon ng policy engine nang hindi ine-execute ang tool. Ibinabalik ang hook evaluation result (ALLOW, BLOCK, o REDACT) at ang mga rules na na-evaluate.

| Parameter   | Type   | Required | Paglalarawan                                    |
| ----------- | ------ | -------- | ----------------------------------------------- |
| `tool_name` | string | yes      | Ang tool na si-simulate ang pagtawag            |
| `args`      | object | no       | Mga arguments na isasama sa simulation          |

::: tip Gamitin ang `simulate_tool_call` para i-check kung papayagan ang isang tool call bago ito i-execute. Kapaki-pakinabang ito para sa pag-unawa ng policy behavior nang walang side effects. :::

## Mga Use Case

### Background Task Delegation

Maaaring mag-spawn ng background session ang agent para mag-handle ng long-running task nang hindi bina-block ang kasalukuyang conversation:

```
User: "Research competitor pricing and put together a summary"
Agent: [tumatawag ng sessions_spawn na may task]
Agent: "Nagsimula na ako ng background session para mag-research niyan. Magkakaroon tayo ng results sa ilang sandali."
```

### Cross-Session Communication

Maaaring magpadala ng data ang sessions sa isa't isa, na nagbibigay-daan sa workflows kung saan nag-produce ng data ang isang session na kinokonsume ng iba:

```
Natatapos ang background session sa research → sessions_send sa parent → ina-notify ng parent ang user
```

### Cross-Channel Messaging

Pinapayagan ng `message` tool ang agent na proactively na mag-reach out sa anumang connected channel:

```
Nakaka-detect ang agent ng urgent event → message({ channel: "telegram", recipient: "owner", text: "Alert: ..." })
```

## Security

- Lahat ng session operations ay taint-gated: hindi ka maaaring makakita, makabasa, o makapagpadala sa sessions na mas mataas sa iyong taint level
- Ine-enforce ng `sessions_send` ang write-down prevention: hindi maaaring dumaloy ang data sa mas mababang classification
- Nagsisimula ang spawned sessions sa `PUBLIC` taint na may independent taint tracking
- Dumadaan ang `message` tool sa `PRE_OUTPUT` policy hooks bago ang delivery
- Ang session IDs ay ini-inject mula sa runtime context, hindi mula sa LLM arguments -- hindi maaaring mag-impersonate ng ibang session ang agent

::: warning SECURITY Ine-enforce ang write-down prevention sa lahat ng cross-session communication. Ang session na tainted sa `CONFIDENTIAL` ay hindi maaaring magpadala ng data sa `PUBLIC` session o channel. Ito ay hard boundary na ine-enforce ng policy layer. :::
