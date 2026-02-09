# Tide Pool / A2UI

The Tide Pool is an agent-driven visual workspace where Triggerfish renders interactive content: dashboards, charts, forms, code previews, and rich media. Unlike chat, which is a linear conversation, the Tide Pool is a canvas that the agent controls.

## What is A2UI?

A2UI (Agent-to-UI) is the protocol that powers the Tide Pool. It defines how the agent pushes visual content and updates to connected clients in real time. The agent decides what to show; the client renders it.

## Architecture

```
  Agent                    Gateway                    Client
  +-----------+            +-------------+            +-------------+
  | tide_pool |   A2UI     | Tide Pool   |  WebSocket | Tide Pool   |
  | tool      |---push---->| Host        |----------->| Renderer    |
  |           |            |             |            |             |
  | actions:  |            |             |            | Platforms:  |
  | - push    |            |             |            | - WebChat   |
  | - eval    |            |             |            | - macOS     |
  | - reset   |            |             |            | - iOS       |
  | - snap    |            |             |            | - Android   |
  +-----------+            +-------------+            +-------------+
```

The agent uses the `tide_pool` tool to push content to the Tide Pool Host running in the Gateway. The Host relays updates over WebSocket to any connected Tide Pool Renderer on a supported platform.

## Tide Pool Actions

| Action | Description | Use Case |
|--------|-------------|----------|
| `push` | Push HTML/JS content to the Tide Pool | Dashboards, forms, visualizations |
| `eval` | Execute JavaScript in the Tide Pool context | Dynamic updates, data binding |
| `reset` | Clear all Tide Pool content | Session transitions, starting fresh |
| `snapshot` | Capture the Tide Pool as an image | Sharing, audit records |

## Use Cases

The Tide Pool is designed for scenarios where chat alone is insufficient:

- **Dashboards** -- The agent builds a live dashboard showing metrics from your connected integrations.
- **Data Visualization** -- Charts and graphs rendered from query results.
- **Forms and Inputs** -- Interactive forms for structured data collection.
- **Code Previews** -- Syntax-highlighted code with live execution results.
- **Rich Media** -- Images, maps, and embedded content.
- **Collaborative Editing** -- The agent presents a document for you to review and annotate.

## How It Works

1. You ask the agent to visualize something (or the agent decides a visual response is appropriate).
2. The agent uses the `push` action to send HTML and JavaScript to the Tide Pool.
3. The Gateway's Tide Pool Host receives the content and relays it to connected clients.
4. The renderer displays the content in real time.
5. The agent can use `eval` to make incremental updates without replacing the entire view.
6. When the context changes, the agent uses `reset` to clear the workspace.

## Security Integration

Tide Pool content is subject to the same security enforcement as any other output:

- **PRE_OUTPUT hook** -- All content pushed to the Tide Pool passes through the PRE_OUTPUT enforcement hook before rendering. Classified data that violates the output policy is blocked.
- **Session taint** -- Rendered content inherits the session's taint level. A Tide Pool showing `CONFIDENTIAL` data is itself `CONFIDENTIAL`.
- **Snapshot classification** -- Tide Pool snapshots are classified at the session's taint level at the time of capture.
- **JavaScript sandboxing** -- JavaScript executed via `eval` is sandboxed within the Tide Pool context. It has no access to the host system, network, or filesystem.
- **No network access** -- The Tide Pool runtime cannot make network requests. All data flows through the agent and policy layer.

::: tip
Think of the Tide Pool as the agent's whiteboard. While chat is how you talk to the agent, the Tide Pool is where the agent shows you things.
:::
