# Choosing Classification Levels

Every channel, MCP server, integration, and plugin in Triggerfish must have a classification level. This page helps you choose the right one.

## The Four Levels

| Level | What it means | Data flows to... |
|-------|--------------|------------------|
| **PUBLIC** | Safe for anyone to see | Anywhere |
| **INTERNAL** | For your eyes only — nothing sensitive, but not public | INTERNAL, CONFIDENTIAL, RESTRICTED |
| **CONFIDENTIAL** | Contains sensitive data you'd never want leaked | CONFIDENTIAL, RESTRICTED |
| **RESTRICTED** | Most sensitive — legal, medical, financial, PII | RESTRICTED only |

Data can only flow **up or sideways**, never down. This is the [no-write-down rule](/security/no-write-down) and it cannot be overridden.

## Two Questions to Ask

For any integration you're configuring, ask:

**1. What's the most sensitive data this source could return?**

This determines the **minimum** classification level. If an MCP server could return financial data, it must be at least CONFIDENTIAL — even if most of its tools return harmless metadata.

**2. Would I be comfortable if session data flowed *to* this destination?**

This determines the **maximum** classification level you'd want to assign. A higher classification means the session taint escalates when you use it, which restricts where data can flow afterward.

## Classification by Data Type

| Data type | Recommended level | Why |
|-----------|------------------|-----|
| Weather, public web pages, time zones | **PUBLIC** | Freely available to anyone |
| Your personal notes, bookmarks, task lists | **INTERNAL** | Private but not damaging if exposed |
| Internal wikis, team docs, project boards | **INTERNAL** | Organization-internal information |
| Email, calendar events, contacts | **CONFIDENTIAL** | Contains names, schedules, relationships |
| CRM data, sales pipeline, customer records | **CONFIDENTIAL** | Business-sensitive, customer data |
| Financial records, bank accounts, invoices | **CONFIDENTIAL** | Monetary information |
| Source code repositories (private) | **CONFIDENTIAL** | Intellectual property |
| Medical or health records | **RESTRICTED** | Legally protected (HIPAA, etc.) |
| Government ID numbers, SSNs, passports | **RESTRICTED** | Identity theft risk |
| Legal documents, contracts under NDA | **RESTRICTED** | Legal exposure |
| Encryption keys, credentials, secrets | **RESTRICTED** | System compromise risk |

## MCP Servers

When adding an MCP server to `triggerfish.yaml`, the classification determines two things:

1. **Session taint** — calling any tool on this server escalates the session to this level
2. **Write-down prevention** — a session already tainted above this level cannot send data *to* this server

```yaml
mcp_servers:
  # PUBLIC — open data, no sensitivity
  weather:
    command: npx
    args: ["-y", "@mcp/server-weather"]
    classification: PUBLIC

  # INTERNAL — your own filesystem, private but not secrets
  filesystem:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-filesystem", "/home/you/docs"]
    classification: INTERNAL

  # CONFIDENTIAL — accesses private repos, customer issues
  github:
    command: npx
    args: ["-y", "@modelcontextprotocol/server-github"]
    env:
      GITHUB_PERSONAL_ACCESS_TOKEN: "keychain:github-pat"
    classification: CONFIDENTIAL

  # RESTRICTED — database with PII, medical records, legal docs
  postgres:
    command: npx
    args: ["-y", "@mcp/server-postgres"]
    env:
      DATABASE_URL: "keychain:prod-db-url"
    classification: RESTRICTED
```

::: warning DEFAULT DENY
If you omit `classification`, the server is registered as **UNTRUSTED** and the gateway rejects all tool calls. You must explicitly choose a level.
:::

### Common MCP Server Classifications

| MCP Server | Suggested level | Reasoning |
|-----------|----------------|-----------|
| Filesystem (public docs) | PUBLIC | Only exposes publicly available files |
| Filesystem (home directory) | INTERNAL | Personal files, nothing secret |
| Filesystem (work projects) | CONFIDENTIAL | May contain proprietary code or data |
| GitHub (public repos only) | INTERNAL | Code is public but usage patterns are private |
| GitHub (private repos) | CONFIDENTIAL | Proprietary source code |
| Slack | CONFIDENTIAL | Workplace conversations, possibly sensitive |
| Database (analytics/reporting) | CONFIDENTIAL | Aggregated business data |
| Database (production with PII) | RESTRICTED | Contains personally identifiable information |
| Weather / time / calculator | PUBLIC | No sensitive data |
| Web search | PUBLIC | Returns publicly available information |
| Email | CONFIDENTIAL | Names, conversations, attachments |
| Google Drive | CONFIDENTIAL | Documents may contain sensitive business data |

## Channels

Channel classification determines the **ceiling** — the maximum sensitivity of data that can be delivered to that channel.

```yaml
channels:
  cli:
    classification: INTERNAL     # Your local terminal — safe for internal data
  telegram:
    classification: INTERNAL     # Your private bot — same as CLI for the owner
  webchat:
    classification: PUBLIC       # Anonymous visitors — public data only
  email:
    classification: CONFIDENTIAL # Email is private but could be forwarded
```

::: tip OWNER vs. NON-OWNER
For the **owner**, all channels have the same trust level — you're you, regardless of which app you use. Channel classification matters most for **non-owner users** (visitors on webchat, members in a Slack channel, etc.) where it gates what data can flow to them.
:::

### Choosing Channel Classification

| Question | If yes... | If no... |
|----------|-----------|----------|
| Could a stranger see messages on this channel? | **PUBLIC** | Keep reading |
| Is this channel only for you personally? | **INTERNAL** or higher | Keep reading |
| Could messages be forwarded, screenshotted, or logged by a third party? | Cap at **CONFIDENTIAL** | Could be **RESTRICTED** |
| Is the channel end-to-end encrypted and under your full control? | Could be **RESTRICTED** | Cap at **CONFIDENTIAL** |

## What Happens When You Get It Wrong

**Too low (e.g., CONFIDENTIAL server marked PUBLIC):**
- Data from this server won't escalate session taint
- Session could flow classified data to public channels — **data leak risk**
- This is the dangerous direction

**Too high (e.g., PUBLIC server marked CONFIDENTIAL):**
- Session taint escalates unnecessarily when using this server
- You'll get blocked from sending to lower-classified channels afterward
- Annoying but **safe** — err on the side of too high

::: danger
When in doubt, **classify higher**. You can always lower it later after reviewing what data the server actually returns. Under-classifying is a security risk; over-classifying is just an inconvenience.
:::

## The Taint Cascade

Understanding the practical impact helps you choose wisely. Here's what happens in a session:

```
1. Session starts at PUBLIC
2. You ask about the weather (PUBLIC server)     → taint stays PUBLIC
3. You check your notes (INTERNAL filesystem)    → taint escalates to INTERNAL
4. You query GitHub issues (CONFIDENTIAL)        → taint escalates to CONFIDENTIAL
5. You try to post to webchat (PUBLIC channel)   → BLOCKED (write-down violation)
6. You reset the session                         → taint returns to PUBLIC
7. You post to webchat                           → allowed
```

If you frequently use a CONFIDENTIAL tool followed by a PUBLIC channel, you'll be resetting often. Consider whether the tool really needs CONFIDENTIAL, or whether the channel could be reclassified.

## Filesystem Paths

You can also classify individual filesystem paths, which is useful when your agent has access to directories with mixed sensitivity:

```yaml
filesystem:
  default: INTERNAL
  paths:
    "/home/you/public": PUBLIC
    "/home/you/work/clients": CONFIDENTIAL
    "/home/you/legal": RESTRICTED
```

## Review Checklist

Before going live with a new integration:

- [ ] What's the worst data this source could return? Classify at that level.
- [ ] Is the classification at least as high as the data type table suggests?
- [ ] If this is a channel, is the classification appropriate for all possible recipients?
- [ ] Have you tested that the taint cascade works for your typical workflow?
- [ ] When in doubt, did you classify higher rather than lower?

## Related Pages

- [No Write-Down Rule](/security/no-write-down) — the fixed data flow rule
- [Configuration](/guide/configuration) — full YAML reference
- [MCP Gateway](/integrations/mcp-gateway) — MCP server security model
