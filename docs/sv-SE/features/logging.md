# Strukturerad loggning

Triggerfish använder strukturerad loggning med allvarlighetsnivåer, filrotation och konfigurerbar utdata. Varje komponent — gateway, orkestratorn, MCP-klienten, LLM-leverantörer, policymotorn — loggar via en enhetlig loggare. Det innebär att du får en enda, konsekvent loggström oavsett varifrån en händelse härrör.

## Loggnivåer

Inställningen `logging.level` styr hur mycket detaljer som fångas:

| Konfigvärde        | Allvarlighet        | Vad som loggas                                           |
| ------------------ | ------------------- | -------------------------------------------------------- |
| `quiet`            | Bara ERROR          | Krascher och kritiska fel                                |
| `normal` (standard)| INFO och högre      | Uppstart, anslutningar, viktiga händelser                |
| `verbose`          | DEBUG och högre     | Verktygsanrop, policybeslut, leverantörsförfrågningar    |
| `debug`            | TRACE (allt)        | Fullständiga förfrågan/svar-nyttolaster, token-strömmning |

Varje nivå inkluderar allt ovanför den. `verbose` ger dig DEBUG, INFO och ERROR. `quiet` tystas allt utom fel.

## Konfiguration

Ange loggnivå i `triggerfish.yaml`:

```yaml
logging:
  level: normal
```

Det är den enda konfigurationen som krävs. Standardinställningarna är förnuftiga för de flesta användare — `normal` fångar tillräckligt för att förstå vad agenten gör utan att fylla loggen med brus.

## Loggutdata

Loggar skrivs till två destinationer simultant:

- **stderr** — för `journalctl`-fångning när det körs som en systemd-tjänst, eller direkt terminalutdata under utveckling
- **Fil** — `~/.triggerfish/logs/triggerfish.log`

Varje loggpost följer ett strukturerat format:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket-klient ansluten
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Verktygsanrop: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returnerade 529: överbelastad
```

### Komponenttaggar

Taggen inom hakparenteser identifierar vilket undersystem som genererade loggposten:

| Tagg          | Komponent                                    |
| ------------- | -------------------------------------------- |
| `[gateway]`   | WebSocket-kontrollplan                       |
| `[orch]`      | Agentorkestratorern och verktygsutskick      |
| `[mcp]`       | MCP-klient och gateway-proxy                 |
| `[provider]`  | LLM-leverantörsanrop                         |
| `[policy]`    | Policymotor och krokevaluering               |
| `[session]`   | Sessionslivscykel och taint-ändringar        |
| `[channel]`   | Kanaladaptrar (Telegram, Slack, etc.)        |
| `[scheduler]` | Cron-jobb, triggers, webhooks                |
| `[memory]`    | Minneslagringsoperationer                    |
| `[browser]`   | Webbläsarautomatisering (CDP)                |

## Filrotation

Loggfiler roteras automatiskt för att förhindra obegränsad diskanvändning:

- **Rotationströskel:** 1 MB per fil
- **Behållna filer:** 10 roterade filer (totalt ~10 MB max)
- **Rotationskontroll:** vid varje skrivning
- **Namngivning:** `triggerfish.1.log`, `triggerfish.2.log`, ..., `triggerfish.10.log`

När `triggerfish.log` når 1 MB döps den om till `triggerfish.1.log`, den tidigare `triggerfish.1.log` blir `triggerfish.2.log`, och så vidare. Den äldsta filen (`triggerfish.10.log`) tas bort.

## Brandöverförings-skrivningar

Filskrivningar är icke-blockerande. Loggaren fördröjer aldrig förfrågningsbearbetning för att vänta på att en diskskrivning ska slutföras. Om en skrivning misslyckas — disk full, behörighetsfel, fil låst — slukas felet tyst.

Det är avsiktligt. Loggning ska aldrig krascha applikationen eller sakta ner agenten. Stderr-utdatan fungerar som reserv om filskrivningar misslyckas.

## Loggläsningsverktyget

Verktyget `log_read` ger agenten direkt tillgång till strukturerad logghistorik. Agenten kan läsa nyliga loggposter, filtrera efter komponenttagg eller allvarlighet och diagnostisera problem utan att lämna konversationen.

| Parameter   | Typ    | Obligatorisk | Beskrivning                                                         |
| ----------- | ------ | ------------ | ------------------------------------------------------------------- |
| `lines`     | number | Nej          | Antal nyliga loggrader att returnera (standard: 100)                |
| `level`     | string | Nej          | Minsta allvarlighetsfilter (`error`, `warn`, `info`, `debug`)       |
| `component` | string | Nej          | Filtrera efter komponenttagg (t.ex. `gateway`, `orch`, `provider`)  |

::: tip Fråga din agent "vad hände för fel idag" eller "visa mig nyliga gateway-loggar" — verktyget `log_read` hanterar filtrering och hämtning. :::

## Visa loggar

### CLI-kommandon

```bash
# Visa nyliga loggar
triggerfish logs

# Strömmad i realtid
triggerfish logs --tail

# Direkt filåtkomst
cat ~/.triggerfish/logs/triggerfish.log
```

### Med journalctl

När Triggerfish körs som en systemd-tjänst fångas loggar också av journalen:

```bash
journalctl --user -u triggerfish -f
```

## Debug vs strukturerad loggning

::: info Miljövariabeln `TRIGGERFISH_DEBUG=1` stöds fortfarande för bakåtkompatibilitet men `logging.level: debug`-konfigurationen föredras. Båda producerar ekvivalent utdata — fullständig TRACE-nivå-loggning av alla förfrågan/svar-nyttolaster och internt tillstånd. :::

## Relaterat

- [CLI-kommandon](/sv-SE/guide/commands) — `triggerfish logs`-kommandoreferens
- [Konfiguration](/sv-SE/guide/configuration) — fullständigt `triggerfish.yaml`-schema
