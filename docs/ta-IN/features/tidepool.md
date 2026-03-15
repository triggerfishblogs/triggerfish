# Tide Pool / A2UI

Tide Pool என்பது Triggerfish interactive content render செய்யும் agent-driven visual workspace: dashboards, charts, forms, code previews, மற்றும் rich media. Chat போலில்லாமல், இது linear conversation, Tide Pool என்பது agent கட்டுப்படுத்தும் ஒரு canvas.

## A2UI என்றால் என்ன?

A2UI (Agent-to-UI) என்பது Tide Pool ஐ power செய்யும் protocol. Agent visual content மற்றும் updates ஐ real time இல் connected clients க்கு எவ்வாறு push செய்கிறது என்று வரையறுக்கிறது. Agent என்ன காட்ட வேண்டும் என்று தீர்மானிக்கிறது; client அதை render செய்கிறது.

## Architecture

<img src="/diagrams/tidepool-architecture.svg" alt="Tide Pool A2UI architecture: Agent pushes content through Gateway to Tide Pool Renderer on connected clients" style="max-width: 100%;" />

Agent Gateway இல் இயங்கும் Tide Pool Host க்கு content push செய்ய `tide_pool` tool பயன்படுத்துகிறது. Host supported platform இல் connected Tide Pool Renderer க்கு WebSocket மூலம் updates relay செய்கிறது.

## Tide Pool Tools

Agent இந்த tools மூலம் Tide Pool உடன் interact செய்கிறது:

| Tool              | விளக்கம்                                        | பயன்பாடு                                              |
| ----------------- | ------------------------------------------------- | ------------------------------------------------------- |
| `tidepool_render` | Workspace இல் ஒரு component tree render செய்யவும் | Dashboards, forms, visualizations, rich content        |
| `tidepool_update` | ID மூலம் single component இன் props update செய்யவும் | முழு view மாற்றாமல் Incremental updates             |
| `tidepool_clear`  | Workspace clear செய்து அனைத்து components நீக்கவும் | Session transitions, fresh தொடங்கவும்                |

### Legacy Actions

Underlying host backward compatibility க்கு lower-level actions ஐயும் support செய்கிறது:

| Action     | விளக்கம்                            |
| ---------- | ------------------------------------- |
| `push`     | Raw HTML/JS content push செய்யவும்   |
| `eval`     | Sandbox இல் JavaScript execute செய்யவும் |
| `reset`    | அனைத்து content clear செய்யவும்     |
| `snapshot` | Image ஆக capture செய்யவும்          |

## பயன்பாட்டு வழிகள்

Chat மட்டும் போதுமான இல்லாத scenarios க்கு Tide Pool வடிவமைக்கப்பட்டுள்ளது:

- **Dashboards** -- Agent connected integrations இலிருந்து metrics காட்டும் live dashboard உருவாக்குகிறது.
- **Data Visualization** -- Query results இலிருந்து render ஆகும் Charts மற்றும் graphs.
- **Forms மற்றும் Inputs** -- Structured data collection க்கான Interactive forms.
- **Code Previews** -- Live execution results உடன் Syntax-highlighted code.
- **Rich Media** -- Images, maps, மற்றும் embedded content.
- **Collaborative Editing** -- Agent review மற்றும் annotate செய்ய ஒரு document present செய்கிறது.

## எவ்வாறு செயல்படுகிறது

1. நீங்கள் agent ஐ ஒன்றை visualize செய்யுமாறு கேட்கிறீர்கள் (அல்லது agent ஒரு visual response பொருத்தமானது என்று தீர்மானிக்கிறது).
2. Agent Tide Pool க்கு HTML மற்றும் JavaScript அனுப்ப `push` action பயன்படுத்துகிறது.
3. Gateway இன் Tide Pool Host content பெற்று connected clients க்கு relay செய்கிறது.
4. Renderer real time இல் content display செய்கிறது.
5. Agent முழு view மாற்றாமல் incremental updates செய்ய `eval` பயன்படுத்தலாம்.
6. Context மாறும்போது, agent workspace clear செய்ய `reset` பயன்படுத்துகிறது.

## பாதுகாப்பு Integration

Tide Pool content மற்ற எந்த output போலவும் அதே பாதுகாப்பு enforcement க்கு உட்பட்டது:

- **PRE_OUTPUT hook** -- Tide Pool க்கு pushed அனைத்து content உம் rendering க்கு முன்பு PRE_OUTPUT enforcement hook மூலம் செல்கிறது. Output policy ஐ மீறும் classified data block ஆகிறது.
- **Session taint** -- Rendered content session இன் taint நிலையை inherit செய்கிறது. `CONFIDENTIAL` data காட்டும் ஒரு Tide Pool தானே `CONFIDENTIAL`.
- **Snapshot classification** -- Tide Pool snapshots capture நேரத்தில் session இன் taint நிலையில் classified ஆகின்றன.
- **JavaScript sandboxing** -- `eval` மூலம் execute ஆகும் JavaScript Tide Pool context க்குள் sandboxed. Host system, network, அல்லது filesystem அணுகல் இல்லை.
- **Network access இல்லை** -- Tide Pool runtime network requests செய்ய முடியாது. அனைத்து data உம் agent மற்றும் policy layer மூலம் flow ஆகிறது.

## Status Indicators

Tidepool web interface real-time status indicators சேர்க்கிறது:

### Context Length Bar

LLM இன் context window எவ்வளவு consume ஆகியுள்ளது என்று காட்டும் styled progress bar. Bar ஒவ்வொரு செய்திக்கும் பிறகும் compaction க்கும் பிறகும் update ஆகிறது.

### MCP Server Status

கட்டமைக்கப்பட்ட MCP servers இன் connection status காட்டுகிறது (உதா., "MCP 3/3"). Color-coded: அனைத்தும் connected க்கு green, partial க்கு yellow, none க்கு red.

### Secure Secret Input

Agent ஒரு secret உள்ளிட வேண்டும்போது (`secret_save` tool மூலம்), Tidepool ஒரு secure input popup display செய்கிறது. Enter செய்யப்பட்ட மதிப்பு நேரடியாக keychain க்கு செல்கிறது -- அது chat மூலம் அனுப்பப்படுவதில்லை அல்லது conversation history இல் visible இல்லை.

::: tip Tide Pool ஐ agent இன் whiteboard என்று நினைக்கவும். Chat agent உடன் பேசும் விதமென்றால், Tide Pool agent உங்களுக்கு things காட்டும் இடம். :::
