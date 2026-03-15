# Gestructureerde logboekregistratie

Triggerfish gebruikt gestructureerde logboekregistratie met ernstniveaus, bestandsrotatie en configureerbare uitvoer. Elk onderdeel — de gateway, orchestrator, MCP-client, LLM-providers, beleidsengine — registreert via een uniforme logger. Dit betekent dat u één consistente logstroom krijgt, ongeacht waar een gebeurtenis vandaan komt.

## Logniveaus

De instelling `logging.level` bepaalt hoeveel detail wordt vastgelegd:

| Configuratiewaarde | Ernst              | Wat er wordt geregistreerd                                    |
| ------------------ | ------------------ | ------------------------------------------------------------- |
| `quiet`            | Alleen ERROR       | Crashes en kritieke fouten                                    |
| `normal` (standaard) | INFO en hoger    | Opstarten, verbindingen, significante gebeurtenissen          |
| `verbose`          | DEBUG en hoger     | Toolaanroepen, beleidsbeslissingen, providerverzoeken         |
| `debug`            | TRACE (alles)      | Volledige aanvraag-/antwoordpayloads, streaming op tokenniveau |

Elk niveau omvat alles daarboven. Door `verbose` in te stellen krijgt u DEBUG, INFO en ERROR. Door `quiet` in te stellen wordt alles behalve fouten onderdrukt.

## Configuratie

Stel het logniveau in via `triggerfish.yaml`:

```yaml
logging:
  level: normal
```

Dit is de enige vereiste configuratie. De standaardwaarden zijn zinvol voor de meeste gebruikers — `normal` legt voldoende vast om te begrijpen wat de agent doet, zonder het logboek te overspoelen met ruis.

## Loguitvoer

Logboeken worden gelijktijdig naar twee bestemmingen geschreven:

- **stderr** — voor `journalctl`-opname bij uitvoering als een systemd-service, of directe terminaluitvoer tijdens ontwikkeling
- **Bestand** — `~/.triggerfish/logs/triggerfish.log`

Elke logboekregel volgt een gestructureerd formaat:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Componenttags

De tag tussen haakjes geeft aan welk subsysteem de logboekregel heeft uitgestuurd:

| Tag           | Component                                    |
| ------------- | -------------------------------------------- |
| `[gateway]`   | WebSocket-besturingslaag                     |
| `[orch]`      | Agentorchestrator en toolverwerking          |
| `[mcp]`       | MCP-client en gateway-proxy                  |
| `[provider]`  | LLM-provideraanroepen                        |
| `[policy]`    | Beleidsengine en hook-evaluatie              |
| `[session]`   | Sessielevenscyclus en taint-wijzigingen      |
| `[channel]`   | Kanaaladapters (Telegram, Slack, enz.)       |
| `[scheduler]` | Cron-taken, triggers, webhooks               |
| `[memory]`    | Geheugenbewerkingen                          |
| `[browser]`   | Browserautomatisering (CDP)                  |

## Bestandsrotatie

Logbestanden worden automatisch geroteerd om onbeperkt schijfgebruik te voorkomen:

- **Rotatiedrempel:** 1 MB per bestand
- **Bewaarde bestanden:** 10 geroteerde bestanden (totaal ~10 MB maximum)
- **Rotatiecontrole:** bij elke schrijfbewerking
- **Naamgeving:** `triggerfish.1.log`, `triggerfish.2.log`, ..., `triggerfish.10.log`

Wanneer `triggerfish.log` 1 MB bereikt, wordt het hernoemd naar `triggerfish.1.log`, het vorige `triggerfish.1.log` wordt `triggerfish.2.log`, enzovoort. Het oudste bestand (`triggerfish.10.log`) wordt verwijderd.

## Niet-blokkerende schrijfbewerkingen

Bestandsschrijfbewerkingen zijn niet-blokkerend. De logger vertraagt de verwerking van verzoeken nooit om te wachten op het voltooien van een schijfschrijfbewerking. Als een schrijfbewerking mislukt — schijf vol, rechtenprobleem, bestand vergrendeld — wordt de fout stilzwijgend genegeerd.

Dit is opzettelijk. Logboekregistratie mag de applicatie nooit laten crashen of de agent vertragen. De stderr-uitvoer dient als terugval als bestandsschrijfbewerkingen mislukken.

## Log-leestool

De `log_read`-tool geeft de agent directe toegang tot de gestructureerde logboekgeschiedenis. De agent kan recente logboekregistraties lezen, filteren op componenttag of ernst, en problemen diagnosticeren zonder de conversatie te verlaten.

| Parameter   | Type   | Vereist | Beschrijving                                                      |
| ----------- | ------ | ------- | ----------------------------------------------------------------- |
| `lines`     | number | nee     | Aantal recente logboekregels om terug te geven (standaard: 100)   |
| `level`     | string | nee     | Minimumernstfilter (`error`, `warn`, `info`, `debug`)             |
| `component` | string | nee     | Filteren op componenttag (bijv. `gateway`, `orch`, `provider`)    |

::: tip Vraag uw agent "welke fouten zijn er vandaag opgetreden" of "toon recente gateway-logs" — de `log_read`-tool verzorgt het filteren en ophalen. :::

## Logboeken bekijken

### CLI-opdrachten

```bash
# View recent logs
triggerfish logs

# Stream in real time
triggerfish logs --tail

# Direct file access
cat ~/.triggerfish/logs/triggerfish.log
```

### Met journalctl

Wanneer Triggerfish als een systemd-service draait, worden logboeken ook vastgelegd door het journal:

```bash
journalctl --user -u triggerfish -f
```

## Debug versus gestructureerde logboekregistratie

::: info De omgevingsvariabele `TRIGGERFISH_DEBUG=1` wordt nog steeds ondersteund voor achterwaartse compatibiliteit, maar de configuratieoptie `logging.level: debug` heeft de voorkeur. Beide produceren equivalente uitvoer — volledige TRACE-logboekregistratie van alle aanvraag-/antwoordpayloads en interne status. :::

## Zie ook

- [CLI-opdrachten](/nl-NL/guide/commands) — opdrachtverwijzing voor `triggerfish logs`
- [Configuratie](/nl-NL/guide/configuration) — volledig `triggerfish.yaml`-schema
