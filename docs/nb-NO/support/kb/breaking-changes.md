# KB: Brytende endringer

En versjon-for-versjon liste over endringer som kan kreve handling ved oppgradering.

## Notion: `client_secret` fjernet

**Commit:** 6d876c3

`client_secret`-feltet ble fjernet fra Notion-integrasjonskonfigurasjonen som et
sikkerhetsherdingstiltak. Notion bruker nå kun OAuth-tokenet lagret i OS-nøkkelringen.

**Nødvendig handling:** Hvis `triggerfish.yaml` har et `notion.client_secret`-felt,
fjern det. Det vil bli ignorert, men kan skape forvirring.

**Ny oppsettflyt:**

```bash
triggerfish connect notion
```

Dette lagrer integrasjonstokenet i nøkkelringen. Ingen klienthemmelighet er
nødvendig.

---

## Verktøynavn: Punktum til understrek

**Commit:** 505a443

Alle verktøynavn ble endret fra punktum-notasjon (`foo.bar`) til
understrek-notasjon (`foo_bar`). Noen LLM-leverandører støtter ikke punktum i
verktøynavn, noe som forårsaket verktøykallet feil.

**Nødvendig handling:** Hvis du har egendefinerte policyreg­ler eller
ferdighetdefinisjoner som refererer til verktøynavn med punktum, oppdater dem
til å bruke understrek:

```yaml
# Før
- tool: notion.search

# Etter
- tool: notion_search
```

---

## Windows-installasjon: Move-Item til Copy-Item

**Commit:** 5e0370f

Windows PowerShell-installasjonsprogrammet ble endret fra `Move-Item -Force` til
`Copy-Item -Force` for binærfilerstatning under oppgraderinger. `Move-Item`
overskriver ikke filer pålitelig på Windows.

**Nødvendig handling:** Ingen hvis du installerer fra bunnen av. Hvis du er på en
eldre versjon og `triggerfish update` mislykkes på Windows, stopp tjenesten
manuelt før oppdatering:

```powershell
Stop-Service Triggerfish
# Kjør deretter installasjonsprogrammet eller triggerfish update på nytt
```

---

## Versjonsstempel: Fra kjøretid til byggetid

**Commits:** e8b0c8c, eae3930, 6ce0c25

Versjonsinformasjon ble flyttet fra kjøretidsdeteksjon (sjekke `deno.json`) til
byggetidsstempel fra git-tagger. CLI-banneret viser ikke lenger en hardkodet
versjonsstreng.

**Nødvendig handling:** Ingen. `triggerfish version` fortsetter å fungere.
Utviklingsbygg viser `dev` som versjon.

---

## Signal: JRE 21 til JRE 25

**Commit:** e5b1047

Signal-kanalens auto-installasjonsprogram ble oppdatert for å laste ned JRE 25
(fra Adoptium) i stedet for JRE 21. Signal-cli-versjonen ble også fastlåst til
v0.14.0.

**Nødvendig handling:** Hvis du har en eksisterende signal-cli-installasjon med
en eldre JRE, kjør Signal-oppsettet på nytt:

```bash
triggerfish config add-channel signal
```

Dette laster ned den oppdaterte JRE og signal-cli.

---

## Hemmeligheter: Klartekst til kryptert

Hemmelighetlagringsformatet ble endret fra klartekst-JSON til AES-256-GCM-kryptert
JSON.

**Nødvendig handling:** Ingen. Migrasjonen er automatisk. Se
[Hemmelighetmigrasjon](/nb-NO/support/kb/secrets-migration) for detaljer.

Etter migrasjonen anbefales det å rotere hemmelighetene dine fordi
klartekstversjonene tidligere var lagret på disk.

---

## Tidepool: Fra callback til canvas-protokoll

Tidepool (A2UI)-grensesnittet migrerte fra et callback-basert `TidepoolTools`-grensesnitt
til et canvas-basert protokoll.

**Berørte filer:**
- `src/tools/tidepool/tools/tools_legacy.ts` (gammelt grensesnitt, beholdt for
  kompatibilitet)
- `src/tools/tidepool/tools/tools_canvas.ts` (nytt grensesnitt)

**Nødvendig handling:** Hvis du har egendefinerte ferdigheter som bruker det
gamle Tidepool callback-grensesnittet, vil de fortsette å fungere via den eldre
shimmen. Nye ferdigheter bør bruke canvas-protokollen.

---

## Konfig: Eldre `primary` strengformat

`models.primary`-feltet aksepterte tidligere en vanlig streng
(`"anthropic/claude-sonnet-4-20250514"`). Det krever nå et objekt:

```yaml
# Eldre (fortsatt akseptert for bakoverkompatibilitet)
models:
  primary: "anthropic/claude-sonnet-4-20250514"

# Gjeldende (foretrukket)
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**Nødvendig handling:** Oppdater til objektformatet. Strengformatet er fortsatt
tolket, men kan bli fjernet i en fremtidig versjon.

---

## Konsolllogging: Fjernet

**Commit:** 9ce1ce5

Alle rå `console.log`, `console.warn` og `console.error`-kall ble migrert til
den strukturerte loggeren (`createLogger()`). Siden Triggerfish kjører som en
daemon, er stdout/stderr-utdata ikke synlig for brukere. All logging går nå
gjennom filskriveren.

**Nødvendig handling:** Ingen. Hvis du var avhengig av konsollutdata for feilsøking
(f.eks. leding av stdout), bruk `triggerfish logs` i stedet.

---

## Estimere påvirkning

Når du oppgraderer på tvers av flere versjoner, sjekk hver oppføring ovenfor. De
fleste endringer er bakoverkompatible med automatisk migrasjon. De eneste endringene
som krever manuell handling er:

1. **Notion client_secret-fjerning** (fjern feltet fra konfigurasjonen)
2. **Verktøynavn formatendring** (oppdater egendefinerte policyregler)
3. **Signal JRE-oppdatering** (kjør Signal-oppsett på nytt hvis du bruker Signal)

Alt annet håndteres automatisk.
