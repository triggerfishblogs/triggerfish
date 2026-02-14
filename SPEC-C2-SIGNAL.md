# Phase C2: Signal Channel Adapter

## Overview

Signal is the privacy-focused messaging platform. It's expected by security-conscious users — exactly Triggerfish's target audience. This adapter bridges Triggerfish to Signal via signal-cli, a mature third-party CLI tool that provides a JSON-RPC interface to the Signal protocol.

This is a **channel adapter** in `src/channels/signal/`, implementing the `ChannelAdapter` interface alongside WhatsApp, Telegram, Slack, Discord, etc.

**Prerequisites:** Phases 0–16 complete (channel router, typing indicators, group chat). signal-cli installed on the host system.

---

## Architectural Classification

| Category | What it is | Location | Example |
|----------|-----------|----------|---------|
| Integration | First-party code connecting to an external product | `src/<n>/` | Google, Notion |
| Plugin | Our code built to plugin contract | `skills/bundled/<n>/` with code | Obsidian |
| Skill | SKILL.md teaching agent behaviors | `skills/bundled/<n>/` | weather, maps |
| **Channel adapter** ← this | Messaging platform bridge | `src/channels/<n>/` | **Signal**, WhatsApp, Telegram |
| LLM tool | Built-in agent capability | `src/tools/` | summarize, healthcheck |

**Boundary guidance:** All Signal code in `src/channels/signal/`. No Signal code in `src/cli/`, `src/gateway/`, or anywhere else. The adapter implements the standard `ChannelAdapter` interface — the channel router doesn't know or care that it's Signal underneath.

---

## Dependencies & Existing Infrastructure

- **ChannelAdapter interface** (Phase 15) — `connect()`, `disconnect()`, `send()`, `onMessage()`, `status()`
- **Channel router** (Phase 15) — routes inbound/outbound messages
- **PRE_CONTEXT_INJECTION hook** — classification on inbound messages
- **PRE_OUTPUT hook** — write-down check on outbound messages
- **Ripple** (Phase 16) — typing indicators, read receipts where supported
- **Group chat** (Phase 16) — group modes: always, mentioned-only, owner-only
- **signal-cli** — external dependency, must be installed separately

---

## File Structure

```
src/channels/signal/
  adapter.ts          # ChannelAdapter implementation
  client.ts           # signal-cli JSON-RPC client (TCP socket or stdin/stdout)
  types.ts            # Signal-specific types
  mod.ts              # Barrel exports

tests/
  channels/signal/
    adapter_test.ts
    client_test.ts
```

---

## signal-cli Integration

### Architecture

signal-cli runs as a separate daemon process alongside Triggerfish. Triggerfish communicates with it via JSON-RPC over either:

1. **TCP socket** (preferred) — `signal-cli daemon --tcp localhost:7583`
2. **Unix socket** — `signal-cli daemon --socket /tmp/signal-cli.sock`

Triggerfish does NOT spawn or manage the signal-cli process. The user starts it independently (or via systemd/Docker). Triggerfish connects as a client.

### JSON-RPC Protocol

Requests follow JSON-RPC 2.0:

```json
{
  "jsonrpc": "2.0",
  "method": "send",
  "params": {
    "recipient": ["+15551234567"],
    "message": "Hello from Triggerfish"
  },
  "id": "req-1"
}
```

Responses:

```json
{
  "jsonrpc": "2.0",
  "result": { "timestamp": 1234567890 },
  "id": "req-1"
}
```

Incoming messages arrive as JSON-RPC notifications (no `id` field):

```json
{
  "jsonrpc": "2.0",
  "method": "receive",
  "params": {
    "envelope": {
      "source": "+15559876543",
      "sourceDevice": 1,
      "timestamp": 1234567891,
      "dataMessage": {
        "message": "Hi there",
        "timestamp": 1234567891,
        "groupInfo": null
      }
    }
  }
}
```

---

## Registration & Pairing

### Linked Device (Recommended)

The simplest setup. signal-cli links to an existing Signal account on the user's phone:

```bash
# 1. Start signal-cli in link mode
signal-cli link -n "Triggerfish"
# Outputs a tsdevice:// URI — encode as QR code

# 2. User scans QR code with Signal mobile app
# 3. signal-cli confirms link, saves keys to ~/.local/share/signal-cli/

# 4. Start daemon
signal-cli -a +15551234567 daemon --tcp localhost:7583
```

### Primary Device (Alternative)

Register a new phone number directly:

```bash
signal-cli -a +15551234567 register
# SMS verification code sent
signal-cli -a +15551234567 verify 123-456
signal-cli -a +15551234567 daemon --tcp localhost:7583
```

### Triggerfish Setup

```bash
triggerfish connect signal
# Prompts:
#   signal-cli endpoint: tcp://localhost:7583  (or unix:///tmp/signal-cli.sock)
#   Your Signal phone number: +15551234567
```

---

## Owner Verification

Same pairing mechanism as other channels:

1. `triggerfish connect signal` stores the configured phone number as expected owner
2. On first inbound message, Triggerfish verifies the sender matches the configured owner phone
3. Alternatively, pairing codes: unknown senders receive a 6-digit code, owner approves via CLI

```yaml
channels:
  signal:
    owner_phone: "+15551234567"
    dm_policy: pairing         # "pairing" | "allowlist" | "open" | "owner-only"
    allow_from: []             # additional allowed numbers
```

---

## ChannelAdapter Implementation

```typescript
interface SignalConfig {
  /** signal-cli endpoint: "tcp://host:port" or "unix:///path/to/socket" */
  readonly endpoint: string;
  /** The Signal account phone number (E.164 format). */
  readonly account: string;
  /** Classification level for this channel. */
  readonly classification?: ClassificationLevel;
  /** Owner's phone number for isOwner checks. */
  readonly ownerPhone?: string;
  /** DM policy. */
  readonly dmPolicy?: "pairing" | "allowlist" | "open" | "owner-only";
  /** Allowed phone numbers (for allowlist policy). */
  readonly allowFrom?: readonly string[];
  /** Group chat configuration. */
  readonly groups?: Record<string, SignalGroupConfig>;
}

interface SignalGroupConfig {
  readonly mode: "always" | "mentioned-only" | "owner-only";
  readonly classification?: ClassificationLevel;
}
```

The adapter:

- **connect()** — opens TCP/Unix socket to signal-cli, subscribes to receive notifications, verifies connectivity with a ping
- **disconnect()** — closes socket connection
- **send()** — sends JSON-RPC `send` request with message text, handles auto-chunking at 4000 chars
- **onMessage()** — registers handler called when JSON-RPC notifications arrive with `dataMessage`
- **status()** — returns `{ connected, channelType: "signal" }`

---

## JSON-RPC Client

`client.ts` handles the low-level signal-cli communication:

```typescript
interface SignalClient {
  connect(): Promise<Result<void, string>>;
  disconnect(): Promise<void>;
  sendMessage(recipient: string, message: string): Promise<Result<{ timestamp: number }, string>>;
  sendGroupMessage(groupId: string, message: string): Promise<Result<{ timestamp: number }, string>>;
  sendTyping(recipient: string): Promise<Result<void, string>>;
  sendTypingStop(recipient: string): Promise<Result<void, string>>;
  onNotification(handler: (notification: SignalNotification) => void): void;
  ping(): Promise<Result<void, string>>;
}
```

The client:
- Maintains a persistent TCP/Unix socket connection
- Multiplexes requests via JSON-RPC `id` matching
- Handles reconnection with exponential backoff
- Parses incoming notifications and dispatches to registered handler
- Auto-subscribes to receive mode on connection (`subscribeReceive`)

---

## Message Handling

### Inbound

1. signal-cli JSON-RPC notification arrives with `envelope.dataMessage`
2. Client parses sender phone, message text, group info, timestamp
3. Adapter creates `ChannelMessage` with:
   - `senderId`: sender phone number
   - `isOwner`: matches configured `ownerPhone`
   - `sessionId`: `signal-{senderPhone}` for DMs, `signal-group-{groupId}` for groups
   - `content`: message text
4. DM policy check: pairing/allowlist/open/owner-only
5. Group mode check: always/mentioned-only/owner-only
6. If allowed, invokes registered message handler

### Outbound

1. Orchestrator calls `adapter.send(message)`
2. Text auto-chunked at 4000 characters
3. Each chunk sent via JSON-RPC `send` method
4. Typing indicator sent before first chunk, cleared after last

### Attachments

Inbound attachments arrive as file paths in signal-cli's data directory. The adapter:
- Reads attachment metadata (type, size, filename)
- Includes metadata in message
- Does NOT send attachments outbound (text-only for MVP)

### Group Messages

- Group messages include `groupInfo.groupId` in the notification
- Per-group configuration via `channels.signal.groups` in YAML
- Default group mode configurable
- Mention detection: Signal mentions are structured data in the notification

---

## Security

### Classification

```yaml
channels:
  signal:
    classification: INTERNAL
    groups:
      "group-abc123":
        classification: CONFIDENTIAL
```

- Owner DMs: classified at channel level (default INTERNAL)
- Non-owner DMs: UNTRUSTED until pairing approved
- Group messages: per-group classification or channel default
- PRE_OUTPUT enforces write-down on all outbound

### signal-cli Security

- Keys stored locally at `~/.local/share/signal-cli/`
- Triggerfish connects over local socket — no credentials traverse the network
- TCP connections should be localhost-only or tunneled

---

## Configuration

```yaml
channels:
  signal:
    enabled: true
    endpoint: "tcp://localhost:7583"
    account: "+15551234567"
    classification: INTERNAL
    owner_phone: "+15551234567"
    dm_policy: pairing
    allow_from: []
    default_group_mode: mentioned-only
    groups: {}
```

---

## CLI Commands

```bash
triggerfish connect signal             # Guided setup
triggerfish disconnect signal          # Remove configuration
triggerfish status signal              # Check signal-cli connectivity
triggerfish channels list              # Shows signal alongside other channels
```

---

## Test Scenarios

1. **Connection** — connects to TCP socket, Unix socket, reconnects on disconnect
2. **Send** — sends DM, sends group message, auto-chunks long messages
3. **Receive** — parses DM notification, group notification, handles attachments
4. **Owner verification** — owner phone matches, non-owner blocked by owner-only
5. **DM policy** — pairing code flow, allowlist, open mode
6. **Group modes** — always responds, mentioned-only, owner-only
7. **Typing indicators** — sent before response, cleared after
8. **Classification** — channel classification applied, per-group override, write-down enforced
9. **Reconnection** — recovers from signal-cli restart, exponential backoff

---

## Exit Criteria

- Signal adapter implements `ChannelAdapter` interface completely
- Connects to signal-cli daemon via TCP and Unix socket
- Sends and receives DM messages end-to-end
- Group messages work with mentioned-only and owner-only modes
- Auto-chunks at 4000 characters
- Typing indicators sent during response generation
- DM policy enforced
- Classification applied per channel and per group
- Reconnection handles signal-cli restarts
- All tests in `tests/channels/signal/` pass
