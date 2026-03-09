# Pagpapatakbo ng Diagnostics

May dalawang built-in diagnostic tools ang Triggerfish: `patrol` (external health check) at ang `healthcheck` tool (internal system probe).

## Patrol

Ang Patrol ay isang CLI command na tine-check kung operational ang mga core systems:

```bash
triggerfish patrol
```

### Ano ang Tine-check

| Check | Status | Ibig Sabihin |
|-------|--------|---------|
| Gateway running | CRITICAL kung down | Hindi tumutugon ang WebSocket control plane |
| LLM connected | CRITICAL kung down | Hindi maabot ang primary LLM provider |
| Channels active | WARNING kung 0 | Walang channel adapters na naka-connect |
| Policy rules loaded | WARNING kung 0 | Walang policy rules na naka-load |
| Skills installed | WARNING kung 0 | Walang skills na na-discover |

### Overall status

- **HEALTHY** - lahat ng checks ay pumasa
- **WARNING** - ilang non-critical checks ang naka-flag (hal., walang naka-install na skills)
- **CRITICAL** - hindi bababa sa isang critical check ang nabigo (gateway o LLM hindi maabot)

### Kailan gamitin ang patrol

- Pagkatapos ng installation, para i-verify na gumagana ang lahat
- Pagkatapos ng config changes, para i-confirm na nag-restart nang maayos ang daemon
- Kapag tumigil sa pagtugon ang bot, para malaman kung aling component ang nabigo
- Bago mag-file ng bug report, para isama ang patrol output

### Halimbawang output

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

Ang healthcheck tool ay isang internal agent tool na nagpo-probe ng system components mula sa loob ng tumatakbong gateway. Available ito sa agent sa mga conversations.

### Ano ang Tine-check

**Providers:**
- Nag-e-exist at maabot ang default provider
- Binibalik ang pangalan ng provider

**Storage:**
- Round-trip test: nagsusulat ng key, binabasa ito pabalik, dine-delete ito
- Bine-verify na functional ang storage layer

**Skills:**
- Binibilang ang mga na-discover na skills ayon sa source (bundled, installed, workspace)

**Config:**
- Basic config validation

### Mga Status Level

Bawat component ay nagre-report ng isa sa:
- `healthy` - ganap na operational
- `degraded` - partially working (maaaring may ilang features na hindi gumana)
- `error` - sira ang component

### Classification requirement

Ang healthcheck tool ay nangangailangan ng minimum INTERNAL classification dahil nagre-reveal ito ng system internals (provider names, skill counts, storage status). Hindi ito magagamit ng PUBLIC session.

### Paggamit ng healthcheck

Tanungin ang iyong agent:

> Run a healthcheck

O kung ginagamit nang direkta ang tool:

```
tool: healthcheck
```

Ang response ay isang structured report:

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

## Pagsasama ng Diagnostics

Para sa masusing diagnostic session:

1. **Patakbuhin ang patrol** mula sa CLI:
   ```bash
   triggerfish patrol
   ```

2. **Tingnan ang logs** para sa mga kamakailang errors:
   ```bash
   triggerfish logs --level ERROR
   ```

3. **Tanungin ang agent** na mag-run ng healthcheck (kung tumutugon ang agent):
   > Run a system healthcheck and tell me about any issues

4. **Kolektahin ang log bundle** kung kailangan mong mag-file ng issue:
   ```bash
   triggerfish logs bundle
   ```

---

## Startup Diagnostics

Kung hindi nagsisimula ang daemon, suriin ang mga ito nang sunud-sunod:

1. **Nag-e-exist at valid ang config:**
   ```bash
   triggerfish config validate
   ```

2. **Maaaring ma-resolve ang secrets:**
   ```bash
   triggerfish config get-secret --list
   ```

3. **Walang port conflicts:**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **Walang ibang instance na tumatakbo:**
   ```bash
   triggerfish status
   ```

5. **Tingnan ang system journal (Linux):**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **Tingnan ang launchd (macOS):**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Tingnan ang Windows Event Log (Windows):**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
