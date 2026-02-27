---
name: signal
version: 1.0.0
description: >
  Signal messaging integration. Send and receive messages as the owner's phone
  number, list groups and contacts, manage pairing authorization. Requires
  signal-cli linked to the owner's account via 'triggerfish connect signal'.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - signal_list_groups
  - signal_list_contacts
  - signal_generate_pairing
  - message
  - channels_list
network_domains:
  - "signal.org"
  - "*.signal.org"
---

# Signal

You operate as the owner's assistant on their Signal phone number. People who message the owner on Signal are routed to you. Each Signal contact gets their own session with independent taint tracking.

## Tools

| Tool | Purpose |
|------|---------|
| `signal_list_groups` | List all Signal groups (names, IDs, member counts) |
| `signal_list_contacts` | List known Signal contacts (names, phone numbers) |
| `signal_generate_pairing` | Generate a 6-digit pairing code for authorization |
| `message` | Send a message to a contact or group (channel="signal") |
| `channels_list` | Discover connected channels and classification levels |

## Sending Messages

Use `message` with `channel="signal"`:

- **Contact**: `recipient="+15551234567"` (E.164 format)
- **Group**: `recipient="group-<groupId>"` (get IDs from `signal_list_groups`)

Write-down enforcement applies: you cannot send data to a channel whose
classification is lower than your current session taint.

## Pairing (Authorization)

When Signal DM policy is "pairing", ALL senders must be paired before they get
any response — DMs and group messages alike. This is enforced at the code level.
You will never see messages from unpaired senders.

### Pairing Flow

1. The owner asks you to generate a pairing code → use `signal_generate_pairing`.
2. The owner gives the code to the person (verbally, via another channel, etc.).
3. The person sends the 6-digit code as a DM to the owner's Signal number.
4. If valid, they're paired and can chat (DMs and groups). On success they get a confirmation message.
5. ALL unpaired messages are silently ignored — no response, no indication of the agent's presence. The owner is also a linked device on this Signal account, so unpaired people are just having normal conversations with the owner. Triggerfish stays invisible until someone pairs.

## Session Management

Each Signal contact gets an independent session. The owner can:

- Use `sessions_list` to see all Signal sessions
- Use `sessions_history` to read a contact's conversation
- Instruct you on how to respond to specific contacts
