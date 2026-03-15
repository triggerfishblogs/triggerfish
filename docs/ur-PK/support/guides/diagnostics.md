# Diagnostics چلانا

Triggerfish کے پاس دو built-in diagnostic tools ہیں: `patrol` (external health check) اور `healthcheck` tool (internal system probe)۔

## Patrol

Patrol ایک CLI command ہے جو check کرتا ہے کہ آیا core systems operational ہیں:

```bash
triggerfish patrol
```

### یہ کیا check کرتا ہے

| Check | Status | مطلب |
|-------|--------|---------|
| Gateway running | CRITICAL اگر down | WebSocket control plane respond نہیں کر رہا |
| LLM connected | CRITICAL اگر down | Primary LLM provider تک نہیں پہنچ سکتا |
| Channels active | WARNING اگر 0 | کوئی channel adapters connected نہیں |
| Policy rules loaded | WARNING اگر 0 | کوئی policy rules load نہیں |
| Skills installed | WARNING اگر 0 | کوئی skills discover نہیں ہوئیں |

### Overall status

- **HEALTHY** - تمام checks pass ہوتے ہیں
- **WARNING** - کچھ non-critical checks flagged ہیں (مثلاً، کوئی skills install نہیں)
- **CRITICAL** - کم از کم ایک critical check fail ہوا (gateway یا LLM unreachable)

### Patrol کب استعمال کریں

- Installation کے بعد، verify کرنے کے لیے کہ سب کچھ کام کر رہا ہے
- Config changes کے بعد، confirm کرنے کے لیے کہ daemon cleanly restart ہوا
- جب bot respond کرنا بند کر دے، narrow down کرنے کے لیے کہ کون سا component fail ہوا
- Bug report file کرنے سے پہلے، patrol output include کرنے کے لیے

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

Healthcheck tool ایک internal agent tool ہے جو running gateway کے اندر سے system components probe کرتا ہے۔ یہ conversations کے دوران agent کو دستیاب ہے۔

### یہ کیا check کرتا ہے

**Providers:**
- Default provider exist کرتا ہے اور reachable ہے
- Provider کا نام واپس کرتا ہے

**Storage:**
- Round-trip test: ایک key لکھتا ہے، واپس پڑھتا ہے، delete کرتا ہے
- Storage layer functional ہے verify کرتا ہے

**Skills:**
- Source کے مطابق discovered skills count کرتا ہے (bundled، installed، workspace)

**Config:**
- Basic config validation

### Status levels

ہر component ان میں سے ایک report کرتا ہے:
- `healthy` - پوری طرح operational
- `degraded` - جزوی طور پر کام کر رہا ہے (کچھ features کام نہ کریں)
- `error` - component خراب ہے

### Classification requirement

Healthcheck tool کو minimum INTERNAL classification چاہیے کیونکہ یہ system internals (provider names، skill counts، storage status) ظاہر کرتا ہے۔ PUBLIC session اسے استعمال نہیں کر سکتا۔

### Healthcheck استعمال کرنا

اپنے agent سے پوچھیں:

> Run a healthcheck

یا tool براہ راست استعمال کریں:

```
tool: healthcheck
```

Response ایک structured report ہے:

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

## Diagnostics کو Combine کرنا

ایک thorough diagnostic session کے لیے:

1. **Patrol چلائیں** CLI سے:
   ```bash
   triggerfish patrol
   ```

2. **Recent errors کے لیے logs check کریں:**
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Agent سے کہیں** healthcheck چلائے (اگر agent responsive ہو):
   > Run a system healthcheck and tell me about any issues

4. **Log bundle collect کریں** اگر issue file کرنی ہو:
   ```bash
   triggerfish logs bundle
   ```

---

## Startup Diagnostics

اگر daemon بالکل start نہیں ہو رہا تو یہ order میں check کریں:

1. **Config موجود ہے اور valid ہے:**
   ```bash
   triggerfish config validate
   ```

2. **Secrets resolve ہو سکتے ہیں:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **کوئی port conflicts نہیں:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **کوئی دوسری instance نہیں چل رہی:**
   ```bash
   triggerfish status
   ```

5. **System journal check کریں (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **launchd check کریں (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Windows Event Log check کریں (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
