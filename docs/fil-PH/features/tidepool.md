# Tide Pool / A2UI

Ang Tide Pool ay isang agent-driven visual workspace kung saan nagre-render ang Triggerfish ng interactive content: dashboards, charts, forms, code previews, at rich media. Hindi tulad ng chat, na linear conversation, ang Tide Pool ay isang canvas na kinokontrol ng agent.

## Ano ang A2UI?

A2UI (Agent-to-UI) ang protocol na nagpo-power sa Tide Pool. Dine-define nito kung paano nagpu-push ang agent ng visual content at updates sa mga connected clients nang real time. Dine-decide ng agent kung ano ang ipapakita; nire-render ito ng client.

## Architecture

<img src="/diagrams/tidepool-architecture.svg" alt="Tide Pool A2UI architecture: nagpu-push ang Agent ng content sa pamamagitan ng Gateway sa Tide Pool Renderer sa mga connected clients" style="max-width: 100%;" />

Ginagamit ng agent ang `tide_pool` tool para mag-push ng content sa Tide Pool Host na tumatakbo sa Gateway. Nire-relay ng Host ang updates sa pamamagitan ng WebSocket sa anumang connected Tide Pool Renderer sa supported platform.

## Mga Tide Pool Tool

Nakikipag-interact ang agent sa Tide Pool sa pamamagitan ng mga tools na ito:

| Tool              | Paglalarawan                                        | Use Case                                                    |
| ----------------- | --------------------------------------------------- | ----------------------------------------------------------- |
| `tidepool_render` | Mag-render ng component tree sa workspace           | Dashboards, forms, visualizations, rich content             |
| `tidepool_update` | Mag-update ng props ng isang component ayon sa ID   | Incremental updates nang hindi pinapalitan ang buong view   |
| `tidepool_clear`  | I-clear ang workspace, inaalis ang lahat ng components | Session transitions, pagsisimula muli                    |

### Mga Legacy Action

Sinusuportahan din ng underlying host ang lower-level actions para sa backward compatibility:

| Action     | Paglalarawan                             |
| ---------- | ---------------------------------------- |
| `push`     | Mag-push ng raw HTML/JS content          |
| `eval`     | Mag-execute ng JavaScript sa sandbox     |
| `reset`    | I-clear ang lahat ng content             |
| `snapshot` | Mag-capture bilang image                 |

## Mga Use Case

Ang Tide Pool ay dine-design para sa mga scenario kung saan hindi sapat ang chat:

- **Dashboards** -- Nagbu-build ang agent ng live dashboard na nagpapakita ng metrics mula sa mga connected integrations mo.
- **Data Visualization** -- Charts at graphs na nire-render mula sa query results.
- **Forms at Inputs** -- Interactive forms para sa structured data collection.
- **Code Previews** -- Syntax-highlighted code na may live execution results.
- **Rich Media** -- Images, maps, at embedded content.
- **Collaborative Editing** -- Nagpre-present ang agent ng document para sa review at annotation mo.

## Paano Gumagana

1. Hilingin mo sa agent na mag-visualize ng isang bagay (o dine-decide ng agent na naaangkop ang visual response).
2. Ginagamit ng agent ang `push` action para magpadala ng HTML at JavaScript sa Tide Pool.
3. Tinatanggap ng Tide Pool Host ng Gateway ang content at nire-relay ito sa mga connected clients.
4. Dine-display ng renderer ang content nang real time.
5. Maaaring gumamit ng `eval` ang agent para gumawa ng incremental updates nang hindi pinapalitan ang buong view.
6. Kapag nagbago ang context, ginagamit ng agent ang `reset` para i-clear ang workspace.

## Security Integration

Ang Tide Pool content ay subject sa parehong security enforcement tulad ng anumang ibang output:

- **PRE_OUTPUT hook** -- Lahat ng content na pinu-push sa Tide Pool ay dumadaan sa PRE_OUTPUT enforcement hook bago i-render. Bina-block ang classified data na lumalabag sa output policy.
- **Session taint** -- Ini-inherit ng rendered content ang taint level ng session. Ang Tide Pool na nagpapakita ng `CONFIDENTIAL` data ay `CONFIDENTIAL` mismo.
- **Snapshot classification** -- Ang Tide Pool snapshots ay classified sa taint level ng session sa oras ng capture.
- **JavaScript sandboxing** -- Ang JavaScript na ine-execute sa pamamagitan ng `eval` ay naka-sandbox sa loob ng Tide Pool context. Walang access ito sa host system, network, o filesystem.
- **Walang network access** -- Hindi maaaring gumawa ng network requests ang Tide Pool runtime. Lahat ng data ay dumadaloy sa pamamagitan ng agent at policy layer.

## Mga Status Indicator

May mga real-time status indicators ang Tidepool web interface:

### Context Length Bar

Isang styled progress bar na nagpapakita ng context window usage -- gaano karami ng context window ng LLM ang nagamit na. Nag-u-update ang bar pagkatapos ng bawat message at pagkatapos ng compaction.

### MCP Server Status

Ipinapakita ang connection status ng configured MCP servers (hal., "MCP 3/3"). Color-coded: berde kung lahat ay connected, dilaw kung partial, pula kung wala.

### Secure Secret Input

Kapag kailangan mong magpasok ng secret (sa pamamagitan ng `secret_save` tool), nagdi-display ang Tidepool ng secure input popup. Ang inilagay na value ay direktang napupunta sa keychain -- hindi ito ipinapadala sa chat o nakikita sa conversation history.

::: tip Isipin ang Tide Pool bilang whiteboard ng agent. Habang ang chat ang paraan ng pakikipag-usap mo sa agent, ang Tide Pool ang lugar kung saan nagpapakita sa iyo ng mga bagay ang agent. :::
