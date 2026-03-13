# Diagnostics ಚಲಾಯಿಸುವುದು

Triggerfish ಎರಡು built-in diagnostic tools ಹೊಂದಿದೆ: `patrol` (external health check)
ಮತ್ತು `healthcheck` tool (internal system probe).

## Patrol

Patrol core systems operational ಆಗಿದೆಯೇ ಎಂದು check ಮಾಡುವ CLI command:

```bash
triggerfish patrol
```

### ಏನನ್ನು check ಮಾಡುತ್ತದೆ

| Check | Status | ಅರ್ಥ |
|-------|--------|------|
| Gateway running | CRITICAL if down | WebSocket control plane respond ಮಾಡುತ್ತಿಲ್ಲ |
| LLM connected | CRITICAL if down | Primary LLM provider ತಲುಪಲಾಗುತ್ತಿಲ್ಲ |
| Channels active | WARNING if 0 | Channel adapters connected ಆಗಿಲ್ಲ |
| Policy rules loaded | WARNING if 0 | Policy rules load ಮಾಡಲ್ಪಟ್ಟಿಲ್ಲ |
| Skills installed | WARNING if 0 | Skills discover ಮಾಡಲ್ಪಟ್ಟಿಲ್ಲ |

### Overall status

- **HEALTHY** - ಎಲ್ಲ checks pass
- **WARNING** - ಕೆಲವು non-critical checks flagged (ಉದಾ., skills install ಮಾಡಿಲ್ಲ)
- **CRITICAL** - ಕನಿಷ್ಠ ಒಂದು critical check fail (gateway ಅಥವಾ LLM reachable ಅಲ್ಲ)

### Patrol ಯಾವಾಗ ಬಳಸಬೇಕು

- Installation ನಂತರ, ಎಲ್ಲ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತಿದೆ ಎಂದು verify ಮಾಡಲು
- Config changes ನಂತರ, daemon cleanly restart ಮಾಡಿದ್ದನ್ನು confirm ಮಾಡಲು
- Bot respond ಮಾಡುವುದನ್ನು ನಿಲ್ಲಿಸಿದಾಗ, ಯಾವ component fail ಆಯಿತು ಎಂದು narrow down ಮಾಡಲು
- Bug report file ಮಾಡುವ ಮೊದಲು, patrol output include ಮಾಡಲು

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

Healthcheck tool running gateway ನ ಒಳಗಿನಿಂದ system components probe ಮಾಡುವ internal
agent tool. Conversations ಸಮಯದಲ್ಲಿ agent ಗೆ ಲಭ್ಯ.

### ಏನನ್ನು check ಮಾಡುತ್ತದೆ

**Providers:**
- Default provider exist ಮತ್ತು reachable ಆಗಿದೆ
- Provider name return ಮಾಡುತ್ತದೆ

**Storage:**
- Round-trip test: key write ಮಾಡಿ, ಮತ್ತೆ read ಮಾಡಿ, delete ಮಾಡುತ್ತದೆ
- Storage layer functional ಎಂದು verify ಮಾಡುತ್ತದೆ

**Skills:**
- Source ಮೂಲಕ discovered skills count ಮಾಡುತ್ತದೆ (bundled, installed, workspace)

**Config:**
- Basic config validation

### Status levels

ಪ್ರತಿ component ಇವುಗಳಲ್ಲಿ ಒಂದನ್ನು report ಮಾಡುತ್ತದೆ:
- `healthy` - ಸಂಪೂರ್ಣ operational
- `degraded` - ಭಾಗಶಃ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತಿದೆ (ಕೆಲವು features ಕಾರ್ಯ ನಿರ್ವಹಿಸದಿರಬಹುದು)
- `error` - component broken

### Classification requirement

Healthcheck tool ಗೆ minimum INTERNAL classification ಅಗತ್ಯ ಏಕೆಂದರೆ ಇದು system
internals (provider names, skill counts, storage status) reveal ಮಾಡುತ್ತದೆ. PUBLIC
session ಇದನ್ನು ಬಳಸಲಾಗದು.

### Healthcheck ಬಳಸುವ ವಿಧಾನ

ನಿಮ್ಮ agent ಗೆ ಕೇಳಿ:

> Run a healthcheck

ಅಥವಾ tool ನೇರ ಬಳಸಿದರೆ:

```
tool: healthcheck
```

Response structured report:

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

## Diagnostics Combine ಮಾಡುವುದು

ಸಂಪೂರ್ಣ diagnostic session ಗಾಗಿ:

1. **Patrol ಚಲಾಯಿಸಿ** CLI ನಿಂದ:
   ```bash
   triggerfish patrol
   ```

2. **Recent errors ಗಾಗಿ logs check ಮಾಡಿ:**
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Agent ಗೆ healthcheck ಚಲಾಯಿಸಲು ಕೇಳಿ** (agent responsive ಆಗಿದ್ದರೆ):
   > Run a system healthcheck and tell me about any issues

4. **Issue file ಮಾಡಬೇಕಾದರೆ log bundle collect ಮಾಡಿ:**
   ```bash
   triggerfish logs bundle
   ```

---

## Startup Diagnostics

Daemon start ಮಾಡದಿದ್ದರೆ, ಈ ಕ್ರಮದಲ್ಲಿ check ಮಾಡಿ:

1. **Config exist ಮತ್ತು valid ಆಗಿದೆ:**
   ```bash
   triggerfish config validate
   ```

2. **Secrets resolve ಮಾಡಬಹುದು:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **Port conflicts ಇಲ್ಲ:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **ಬೇರೆ instance ಚಲಿಸುತ್ತಿಲ್ಲ:**
   ```bash
   triggerfish status
   ```

5. **System journal check ಮಾಡಿ (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **launchd check ಮಾಡಿ (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Windows Event Log check ಮಾಡಿ (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
