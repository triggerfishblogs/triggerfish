# Running Diagnostics

Triggerfish ला दोन built-in diagnostic tools आहेत: `patrol` (external health check)
आणि `healthcheck` tool (internal system probe).

## Patrol

Patrol एक CLI command आहे जो core systems operational आहेत का check करतो:

```bash
triggerfish patrol
```

### ते काय check करतो

| Check | Status | अर्थ |
|-------|--------|------|
| Gateway running | CRITICAL if down | WebSocket control plane respond करत नाही |
| LLM connected | CRITICAL if down | Primary LLM provider ला reach करू शकत नाही |
| Channels active | WARNING if 0 | कोणतेही channel adapters connected नाहीत |
| Policy rules loaded | WARNING if 0 | कोणतेही policy rules loaded नाहीत |
| Skills installed | WARNING if 0 | कोणतेही skills discovered नाहीत |

### Overall status

- **HEALTHY** - सर्व checks pass
- **WARNING** - काही non-critical checks flagged आहेत (उदा. skills installed नाहीत)
- **CRITICAL** - कमीत कमी एक critical check fail झाला (gateway किंवा LLM unreachable)

### Patrol कधी वापरायचे

- Installation नंतर, सर्वकाही working आहे verify करण्यासाठी
- Config changes नंतर, daemon cleanly restart झाला confirm करण्यासाठी
- Bot respond थांबल्यावर, कोणता component fail झाला narrow down करण्यासाठी
- Bug report file करण्यापूर्वी, patrol output include करण्यासाठी

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

Healthcheck tool एक internal agent tool आहे जो running gateway च्या आत system
components probe करतो. Conversations दरम्यान agent ला available आहे.

### ते काय check करतो

**Providers:**
- Default provider exist आणि reachable आहे
- Provider name return करतो

**Storage:**
- Round-trip test: key writes, reads it back, delete करतो
- Storage layer functional आहे verify करतो

**Skills:**
- Source नुसार discovered skills count करतो (bundled, installed, workspace)

**Config:**
- Basic config validation

### Status levels

प्रत्येक component यापैकी एक report करतो:
- `healthy` - fully operational
- `degraded` - partially working (काही features काम करू शकत नाहीत)
- `error` - component broken आहे

### Classification requirement

Healthcheck tool ला minimum INTERNAL classification आवश्यक आहे कारण ते system
internals (provider names, skill counts, storage status) reveal करते. PUBLIC session
ते वापरू शकत नाही.

### Healthcheck वापरणे

तुमच्या agent ला विचारा:

> Run a healthcheck

किंवा tool directly वापरत असल्यास:

```
tool: healthcheck
```

Response एक structured report आहे:

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

## Diagnostics Combine करणे

Thorough diagnostic session साठी:

1. **Patrol run करा** CLI मधून:
   ```bash
   triggerfish patrol
   ```

2. **Recent errors साठी logs check करा:**
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Agent ला विचारा** healthcheck run करण्यासाठी (agent responsive असल्यास):
   > Run a system healthcheck and tell me about any issues

4. **Log bundle collect करा** issue file करणे आवश्यक असल्यास:
   ```bash
   triggerfish logs bundle
   ```

---

## Startup Diagnostics

Daemon अजिबात start नाही होत असल्यास, या order मध्ये check करा:

1. **Config exist आणि valid आहे:**
   ```bash
   triggerfish config validate
   ```

2. **Secrets resolve होऊ शकतात:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **Port conflicts नाहीत:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **दुसरा instance running नाही:**
   ```bash
   triggerfish status
   ```

5. **System journal check करा (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **launchd check करा (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Windows Event Log check करा (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
