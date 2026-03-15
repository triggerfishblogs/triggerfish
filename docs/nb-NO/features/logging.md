# Strukturert logging

Triggerfish bruker strukturert logging med alvorlighetsnivåer, filrotasjon og
konfigurerbart utdata. Alle komponenter — gateway-en, orchestratoren, MCP-klienten,
LLM-leverandørene, policy-motoren — logger gjennom en samlet logger. Dette betyr
at du får en enkelt, konsistent loggstrøm uavhengig av hvor en hendelse oppstår.

## Loggnivåer

`logging.level`-innstillingen kontrollerer hvor mye detaljer som registreres:

| Konfigverdi        | Alvorlighet        | Hva logges                                                        |
| ------------------ | ------------------ | ----------------------------------------------------------------- |
| `quiet`            | Bare ERROR         | Krasj og kritiske feil                                            |
| `normal` (standard)| INFO og over       | Oppstart, tilkoblinger, viktige hendelser                         |
| `verbose`          | DEBUG og over      | Verktøykall, policy-beslutninger, leverandørforespørsler          |
| `debug`            | TRACE (alt)        | Full forespørsels-/svarbelastning, token-nivå strømming           |

Hvert nivå inkluderer alt over det. Å sette `verbose` gir deg DEBUG, INFO og
ERROR. Å sette `quiet` slår av alt unntatt feil.

## Konfigurasjon

Sett loggnivå i `triggerfish.yaml`:

```yaml
logging:
  level: normal
```

Det er den eneste nødvendige konfigurasjonen. Standardene er fornuftige for de
fleste brukere — `normal` registrerer nok til å forstå hva agenten gjør uten å
flomme loggen med støy.

## Loggutdata

Logger skrives til to destinasjoner simultant:

- **stderr** — for `journalctl`-fangst når det kjøres som en systemd-tjeneste,
  eller direkte terminalutdata under utvikling
- **Fil** — `~/.triggerfish/logs/triggerfish.log`

Hver logglinje følger et strukturert format:

```
[2026-02-17T14:30:45.123Z] [INFO] [gateway] WebSocket client connected
[2026-02-17T14:30:45.456Z] [DEBUG] [orch] Tool call: web_search {query: "deno sqlite"}
[2026-02-17T14:30:46.789Z] [ERROR] [provider] Anthropic API returned 529: overloaded
```

### Komponenttagger

Taggen i parenteser identifiserer hvilket delsystem som sendte loggoppføringen:

| Tagg          | Komponent                                   |
| ------------- | ------------------------------------------- |
| `[gateway]`   | WebSocket-kontrollplan                      |
| `[orch]`      | Agent-orchestrator og verktøysdispatch      |
| `[mcp]`       | MCP-klient og gateway-proxy                 |
| `[provider]`  | LLM-leverandørkall                          |
| `[policy]`    | Policy-motor og hook-evaluering             |
| `[session]`   | Sesjonens livssyklus og taint-endringer     |
| `[channel]`   | Kanaladaptere (Telegram, Slack, osv.)       |
| `[scheduler]` | Cron-jobber, triggers, webhooks             |
| `[memory]`    | Minnelagringsoperasjoner                    |
| `[browser]`   | Nettleserautomatisering (CDP)               |

## Filrotasjon

Loggfiler roteres automatisk for å forhindre ubegrenset diskbruk:

- **Rotasjonsterskel:** 1 MB per fil
- **Beholdte filer:** 10 roterte filer (totalt ~10 MB maks)
- **Rotasjonssjekk:** ved hvert skript
- **Navngivning:** `triggerfish.1.log`, `triggerfish.2.log`, ..., `triggerfish.10.log`

Når `triggerfish.log` når 1 MB, omdøpes den til `triggerfish.1.log`, den
forrige `triggerfish.1.log` blir `triggerfish.2.log` og så videre. Den eldste
filen (`triggerfish.10.log`) slettes.

## Brann-og-glem-skrivinger

Filskrivinger er ikke-blokkerende. Loggeren forsinker aldri forespørselsbehandling
for å vente på at en diskskriving fullføres. Hvis en skriving feiler — disk full,
tillatelsefeil, fil låst — svelges feilen stille.

Dette er tilsiktet. Logging bør aldri krasje applikasjonen eller bremse agenten.
Stderr-utdataet fungerer som reserve hvis filskrivinger feiler.

## Log Read-verktøy

`log_read`-verktøyet gir agenten direkte tilgang til strukturert logghistorikk.
Agenten kan lese nylige loggoppføringer, filtrere etter komponenttag eller
alvorlighet, og diagnostisere problemer uten å forlate samtalen.

| Parameter   | Type   | Påkrevd | Beskrivelse                                                            |
| ----------- | ------ | ------- | ---------------------------------------------------------------------- |
| `lines`     | number | Nei     | Antall nylige logglinjer å returnere (standard: 100)                   |
| `level`     | string | Nei     | Minimum alvorlighetsfilter (`error`, `warn`, `info`, `debug`)          |
| `component` | string | Nei     | Filtrer etter komponenttag (f.eks. `gateway`, `orch`, `provider`)      |

::: tip Spør agenten din «hvilke feil skjedde i dag» eller «vis meg nylige
gateway-logger» — `log_read`-verktøyet håndterer filtrering og henting. :::

## Vise logger

### CLI-kommandoer

```bash
# Vis nylige logger
triggerfish logs

# Strøm i sanntid
triggerfish logs --tail

# Direkte filtilgang
cat ~/.triggerfish/logs/triggerfish.log
```

### Med journalctl

Når Triggerfish kjøres som en systemd-tjeneste, fanges logger også av journalen:

```bash
journalctl --user -u triggerfish -f
```

## Debug vs. strukturert logging

::: info `TRIGGERFISH_DEBUG=1`-miljøvariabelen støttes fortsatt for
bakoverkompatibilitet, men `logging.level: debug`-konfigurasjonen er foretrukket.
Begge produserer ekvivalent utdata — full TRACE-nivå logging av alle
forespørsels-/svarbelastninger og intern tilstand. :::

## Relatert

- [CLI-kommandoer](/nb-NO/guide/commands) — `triggerfish logs`-kommandoreferanse
- [Konfigurasjon](/nb-NO/guide/configuration) — fullstendig `triggerfish.yaml`-skjema
