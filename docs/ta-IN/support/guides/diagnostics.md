# Diagnostics இயக்கவும்

Triggerfish இரண்டு built-in diagnostic tools கொண்டுள்ளது: `patrol` (external health check) மற்றும் `healthcheck` tool (internal system probe).

## Patrol

Patrol என்பது core systems operational ஆ என்று சரிபார்க்கும் CLI command:

```bash
triggerfish patrol
```

### என்ன சரிபார்க்கிறது

| Check | Status | பொருள் |
|-------|--------|---------|
| Gateway running | CRITICAL if down | WebSocket control plane respond செய்வதில்லை |
| LLM connected | CRITICAL if down | Primary LLM provider reach செய்ய முடியவில்லை |
| Channels active | WARNING if 0 | Channel adapters connected ஆகவில்லை |
| Policy rules loaded | WARNING if 0 | Policy rules loaded ஆகவில்லை |
| Skills installed | WARNING if 0 | Skills discovered ஆகவில்லை |

### Overall status

- **HEALTHY** - அனைத்து checks pass
- **WARNING** - சில non-critical checks flagged (உதா., skills installed இல்லை)
- **CRITICAL** - குறைந்தது ஒரு critical check fail (gateway அல்லது LLM unreachable)

### Patrol எப்போது பயன்படுத்துவது

- Installation க்கு பிறகு, எல்லாம் working என்று verify செய்ய
- Config changes க்கு பிறகு, daemon cleanly restarted என்று confirm செய்ய
- Bot respond செய்வதில்லையென்றால், எந்த component fail ஆனது என்று narrow down செய்ய
- Bug report file செய்வதற்கு முன்பு, patrol output include செய்ய

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

Healthcheck tool என்பது running gateway இல் இருந்து system components probe செய்யும் internal agent tool. Conversations போது agent க்கு available.

### என்ன சரிபார்க்கிறது

**Providers:**
- Default provider exist மற்றும் reachable
- Provider name return செய்கிறது

**Storage:**
- Round-trip test: key write செய்கிறது, திரும்ப read செய்கிறது, delete செய்கிறது
- Storage layer functional என்று verify செய்கிறது

**Skills:**
- Source மூலம் discovered skills count செய்கிறது (bundled, installed, workspace)

**Config:**
- Basic config validation

### Status levels

ஒவ்வொரு component உம் இவற்றில் ஒன்று report செய்கிறது:
- `healthy` - fully operational
- `degraded` - partially working (சில features வேலை செய்யாமல் போகலாம்)
- `error` - component broken

### Classification requirement

Healthcheck tool minimum INTERNAL classification தேவைப்படுகிறது -- ஏனெனில் system internals (provider names, skill counts, storage status) reveal செய்கிறது. PUBLIC session அதை பயன்படுத்த முடியாது.

### Healthcheck பயன்படுத்துவது

உங்கள் agent க்கு கேளுங்கள்:

> Run a healthcheck

அல்லது tool நேரடியாக பயன்படுத்தினால்:

```
tool: healthcheck
```

Response ஒரு structured report:

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

## Diagnostics Combine செய்யவும்

Thorough diagnostic session க்கு:

1. **Patrol இயக்கவும்** CLI இலிருந்து:
   ```bash
   triggerfish patrol
   ```

2. **Logs சரிபார்க்கவும்** recent errors க்கு:
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Agent க்கு கேளுங்கள்** healthcheck இயக்க (agent responsive ஆனால்):
   > Run a system healthcheck and tell me about any issues

4. **Log bundle collect செய்யவும்** issue file செய்ய வேண்டுமென்றால்:
   ```bash
   triggerfish logs bundle
   ```

---

## Startup Diagnostics

Daemon தொடங்கவே இல்லையென்றால், இவற்றை order இல் சரிபார்க்கவும்:

1. **Config exist மற்றும் valid:**
   ```bash
   triggerfish config validate
   ```

2. **Secrets resolve ஆகலாம்:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **Port conflicts இல்லை:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **மற்றொரு instance இயங்கவில்லை:**
   ```bash
   triggerfish status
   ```

5. **System journal சரிபார்க்கவும் (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **launchd சரிபார்க்கவும் (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Windows Event Log சரிபார்க்கவும் (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
