# Troubleshooting

Start here when something is not working. Follow the steps in order.

## First Steps

### 1. Check if the daemon is running

```bash
triggerfish status
```

If the daemon is not running, start it:

```bash
triggerfish start
```

### 2. Check the logs

```bash
triggerfish logs
```

This tails the log file in real time. Use a level filter to cut through the noise:

```bash
triggerfish logs --level ERROR
triggerfish logs --level WARN
```

### 3. Run diagnostics

```bash
triggerfish patrol
```

Patrol checks whether the gateway is reachable, the LLM provider responds, channels are connected, policy rules are loaded, and skills are discovered. Any check marked `CRITICAL` or `WARNING` tells you where to focus.

### 4. Validate your config

```bash
triggerfish config validate
```

This parses `triggerfish.yaml`, checks required fields, validates classification levels, and resolves secret references.

## Troubleshooting by Area

If the first steps above did not point you to the problem, pick the area that matches your symptoms:

- [Installation](/en-GB/support/troubleshooting/installation) - install script failures, build-from-source issues, platform problems
- [Daemon](/en-GB/support/troubleshooting/daemon) - service will not start, port conflicts, "already running" errors
- [Configuration](/en-GB/support/troubleshooting/configuration) - YAML parse errors, missing fields, secret resolution failures
- [Channels](/en-GB/support/troubleshooting/channels) - bot not responding, auth failures, message delivery issues
- [LLM Providers](/en-GB/support/troubleshooting/providers) - API errors, model not found, streaming failures
- [Integrations](/en-GB/support/troubleshooting/integrations) - Google OAuth, GitHub PAT, Notion API, CalDAV, MCP servers
- [Browser Automation](/en-GB/support/troubleshooting/browser) - Chrome not found, launch failures, navigation blocked
- [Security & Classification](/en-GB/support/troubleshooting/security) - write-down blocks, taint issues, SSRF, policy denials
- [Secrets & Credentials](/en-GB/support/troubleshooting/secrets) - keychain errors, encrypted file store, permission problems

## Still Stuck?

If none of the guides above resolved your issue:

1. Collect a [log bundle](/en-GB/support/guides/collecting-logs)
2. Read the [filing issues guide](/en-GB/support/guides/filing-issues)
3. Open an issue on [GitHub](https://github.com/greghavens/triggerfish/issues/new)
