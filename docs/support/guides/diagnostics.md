# Running Diagnostics

Triggerfish has two built-in diagnostic tools: `patrol` (external health check) and the `healthcheck` tool (internal system probe).

## Patrol

Patrol is a CLI command that checks whether the core systems are operational:

```bash
triggerfish patrol
```

### What it checks

| Check | Status | Meaning |
|-------|--------|---------|
| Gateway running | CRITICAL if down | The WebSocket control plane is not responding |
| LLM connected | CRITICAL if down | Cannot reach the primary LLM provider |
| Channels active | WARNING if 0 | No channel adapters are connected |
| Policy rules loaded | WARNING if 0 | No policy rules are loaded |
| Skills installed | WARNING if 0 | No skills are discovered |

### Overall status

- **HEALTHY** - all checks pass
- **WARNING** - some non-critical checks are flagged (e.g., no skills installed)
- **CRITICAL** - at least one critical check failed (gateway or LLM unreachable)

### When to use patrol

- After installation, to verify everything is working
- After config changes, to confirm the daemon restarted cleanly
- When the bot stops responding, to narrow down which component failed
- Before filing a bug report, to include the patrol output

### Example output

```
Triggerfish Patrol Report
=========================
Overall: HEALTHY

[OK]      Gateway running
[OK]      LLM connected (anthropic)
[OK]      Channels active (3)
[OK]      Policy rules loaded (12)
[WARNING] Skills installed (0)
```

---

## Healthcheck Tool

The healthcheck tool is an internal agent tool that probes system components from inside the running gateway. It is available to the agent during conversations.

### What it checks

**Providers:**
- Default provider exists and is reachable
- Returns the provider name

**Storage:**
- Round-trip test: writes a key, reads it back, deletes it
- Verifies the storage layer is functional

**Skills:**
- Counts discovered skills by source (bundled, installed, workspace)

**Config:**
- Basic config validation

### Status levels

Each component reports one of:
- `healthy` - fully operational
- `degraded` - partially working (some features may not work)
- `error` - component is broken

### Classification requirement

The healthcheck tool requires minimum INTERNAL classification because it reveals system internals (provider names, skill counts, storage status). A PUBLIC session cannot use it.

### Using healthcheck

Ask your agent:

> Run a healthcheck

Or if using the tool directly:

```
tool: healthcheck
```

The response is a structured report:

```
Overall: healthy

Providers: healthy
  Default provider: anthropic

Storage: healthy
  Round-trip test passed

Skills: healthy
  12 skills discovered

Config: healthy
```

---

## Combining Diagnostics

For a thorough diagnostic session:

1. **Run patrol** from the CLI:
   ```bash
   triggerfish patrol
   ```

2. **Check the logs** for recent errors:
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Ask the agent** to run a healthcheck (if the agent is responsive):
   > Run a system healthcheck and tell me about any issues

4. **Collect a log bundle** if you need to file an issue:
   ```bash
   triggerfish logs --bundle
   ```

---

## Startup Diagnostics

If the daemon is not starting at all, check these in order:

1. **Config exists and is valid:**
   ```bash
   triggerfish config validate
   ```

2. **Secrets can be resolved:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **No port conflicts:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **No other instance running:**
   ```bash
   triggerfish status
   ```

5. **Check the system journal (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **Check launchd (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Check Windows Event Log (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
