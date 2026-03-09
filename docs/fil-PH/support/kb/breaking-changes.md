# KB: Mga Breaking Change

Isang listahan ng mga pagbabago ayon sa version na maaaring mangailangan ng aksyon kapag nag-upgrade.

## Notion: Inalis ang `client_secret`

**Commit:** 6d876c3

Inalis ang `client_secret` field mula sa Notion integration configuration bilang security hardening measure. Ginagamit na lang ng Notion ang OAuth token na naka-store sa OS keychain.

**Kailangang aksyon:** Kung may `notion.client_secret` field sa iyong `triggerfish.yaml`, alisin ito. Hindi na ito papansinin pero maaaring magdulot ng kalituhan.

**Bagong setup flow:**

```bash
triggerfish connect notion
```

Sino-store nito ang integration token sa keychain. Hindi na kailangan ng client secret.

---

## Tool Names: Dots sa Underscores

**Commit:** 505a443

Lahat ng tool names ay binago mula sa dotted notation (`foo.bar`) patungong underscore notation (`foo_bar`). Hindi sinusuportahan ng ilang LLM providers ang dots sa tool names, na nagdudulot ng tool call failures.

**Kailangang aksyon:** Kung may custom policy rules o skill definitions ka na nagre-reference ng tool names na may dots, i-update ang mga ito para gumamit ng underscores:

```yaml
# Dati
- tool: notion.search

# Ngayon
- tool: notion_search
```

---

## Windows Installer: Move-Item sa Copy-Item

**Commit:** 5e0370f

Binago ang Windows PowerShell installer mula sa `Move-Item -Force` patungong `Copy-Item -Force` para sa binary replacement sa mga upgrades. Hindi reliable ang `Move-Item` sa pag-overwrite ng files sa Windows.

**Kailangang aksyon:** Wala kung fresh install. Kung nasa mas lumang version ka at nabigo ang `triggerfish update` sa Windows, i-stop nang manual ang service bago mag-update:

```powershell
Stop-Service Triggerfish
# Pagkatapos ay patakbuhin ulit ang installer o triggerfish update
```

---

## Version Stamping: Runtime sa Build-Time

**Commits:** e8b0c8c, eae3930, 6ce0c25

Inilipat ang version information mula sa runtime detection (tine-check ang `deno.json`) sa build-time stamping mula sa git tags. Hindi na nagpapakita ng hardcoded version string ang CLI banner.

**Kailangang aksyon:** Wala. Patuloy na gumagana ang `triggerfish version`. Nagpapakita ng `dev` bilang version ang development builds.

---

## Signal: JRE 21 sa JRE 25

**Commit:** e5b1047

Na-update ang auto-installer ng Signal channel para mag-download ng JRE 25 (mula sa Adoptium) sa halip na JRE 21. Naka-pin din ang signal-cli version sa v0.14.0.

**Kailangang aksyon:** Kung may existing signal-cli installation ka na may mas lumang JRE, patakbuhin ulit ang Signal setup:

```bash
triggerfish config add-channel signal
```

Dina-download nito ang updated JRE at signal-cli.

---

## Secrets: Plaintext sa Encrypted

Binago ang secrets storage format mula sa plaintext JSON patungong AES-256-GCM encrypted JSON.

**Kailangang aksyon:** Wala. Automatic ang migration. Tingnan ang [Secrets Migration](/fil-PH/support/kb/secrets-migration) para sa mga detalye.

Pagkatapos ng migration, inirerekomenda ang pag-rotate ng iyong secrets dahil dating naka-store sa disk ang plaintext versions.

---

## Tidepool: Callback sa Canvas Protocol

Na-migrate ang Tidepool (A2UI) interface mula sa callback-based na `TidepoolTools` interface patungong canvas-based protocol.

**Mga apektadong files:**
- `src/tools/tidepool/tools/tools_legacy.ts` (lumang interface, pinanatili para sa compatibility)
- `src/tools/tidepool/tools/tools_canvas.ts` (bagong interface)

**Kailangang aksyon:** Kung may custom skills ka na gumagamit ng lumang Tidepool callback interface, patuloy silang gagana sa pamamagitan ng legacy shim. Ang mga bagong skills ay dapat gumamit ng canvas protocol.

---

## Config: Legacy `primary` String Format

Dati, tumatanggap ang `models.primary` field ng plain string (`"anthropic/claude-sonnet-4-20250514"`). Kailangan na ngayon ng object:

```yaml
# Legacy (tinatanggap pa rin para sa backward compatibility)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Kasalukuyan (preferred)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Kailangang aksyon:** I-update sa object format. Pine-parse pa rin ang string format pero maaaring alisin sa hinaharap na version.

---

## Console Logging: Inalis

**Commit:** 9ce1ce5

Lahat ng raw `console.log`, `console.warn`, at `console.error` calls ay na-migrate sa structured logger (`createLogger()`). Dahil tumatakbo ang Triggerfish bilang daemon, hindi nakikita ng mga users ang stdout/stderr output. Lahat ng logging ay dumadaan na sa file writer.

**Kailangang aksyon:** Wala. Kung umaasa ka sa console output para sa debugging (hal., pina-pipe ang stdout), gamitin ang `triggerfish logs` sa halip.

---

## Pag-estimate ng Impact

Kapag nag-upgrade sa maraming versions, tingnan ang bawat entry sa itaas. Karamihan sa mga pagbabago ay backward-compatible na may automatic migration. Ang mga pagbabagong nangangailangan lamang ng manual na aksyon ay:

1. **Pag-alis ng Notion client_secret** (alisin ang field mula sa config)
2. **Pagbabago ng tool name format** (i-update ang custom policy rules)
3. **Signal JRE update** (patakbuhin ulit ang Signal setup kung gumagamit ng Signal)

Lahat ng iba pa ay awtomatikong hina-handle.
