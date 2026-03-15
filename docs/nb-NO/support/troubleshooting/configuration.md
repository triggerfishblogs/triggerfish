# Feilsøking: Konfigurasjon

## YAML-parserfeil

### «Configuration parse failed»

YAML-filen har en syntaksfeil. Vanlige årsaker:

- **Innrykk-mismatch.** YAML er mellomromsensitivt. Bruk mellomrom, ikke tabulator.
  Hvert nøstingsnivå bør være nøyaktig 2 mellomrom.
- **Uquotede spesialtegn.** Verdier som inneholder `:`, `#`, `{`, `}`, `[`, `]`
  eller `&` må kvoteres.
- **Manglende kolon etter nøkkel.** Hver nøkkel trenger `: ` (kolon etterfulgt av
  mellomrom).

Valider YAML-en din:

```bash
triggerfish config validate
```

Eller bruk en online YAML-validator for å finne den eksakte linjen.

### «Configuration file did not parse to an object»

YAML-filen ble tolket, men resultatet er ikke en YAML-tilordning (objekt). Dette
skjer hvis filen kun inneholder en skalerverdi, en liste, eller er tom.

`triggerfish.yaml` må ha en overordnet tilordning. Som minimum:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"
```

### «Configuration file not found»

Triggerfish leter etter konfigurasjon på disse banene, i rekkefølge:

1. `$TRIGGERFISH_CONFIG`-miljøvariabelen (hvis satt)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (hvis `TRIGGERFISH_DATA_DIR` er satt)
3. `/data/triggerfish.yaml` (Docker-miljøer)
4. `~/.triggerfish/triggerfish.yaml` (standard)

Kjør oppsettveiviseren for å opprette en:

```bash
triggerfish dive
```

---

## Valideringsfeil

### «Configuration validation failed»

Dette betyr at YAML ble tolket, men mislyktes strukturell validering. Spesifikke
meldinger:

**«models is required»** eller **«models.primary is required»**

`models`-seksjonen er obligatorisk. Du trenger minst en primær leverandør og
modell:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**«primary.provider must be non-empty»** eller **«primary.model must be non-empty»**

`primary`-feltet må ha både `provider` og `model` satt til ikke-tomme strenger.

**«Invalid classification level»** i `classification_models`

Gyldige nivåer er: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. Disse er
store/små bokstav-sensitive. Sjekk `classification_models`-nøklene dine.

---

## Feil med hemmelighetreferanser

### Hemmelighet ikke løst ved oppstart

Hvis konfigurasjonen inneholder `secret:noen-nøkkel` og den nøkkelen ikke
eksisterer i nøkkelringen, avsluttes daemonen med en feil som:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Løsning:**

```bash
# List eksisterende hemmeligheter
triggerfish config get-secret --list

# Lagre den manglende hemmeligheten
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Hemmelighetbackend ikke tilgjengelig

På Linux bruker hemmelighetlageret `secret-tool` (libsecret / GNOME Keyring). Hvis
Secret Service D-Bus-grensesnittet ikke er tilgjengelig (hodeløse servere, minimale
containere), vil du se feil ved lagring eller henting av hemmeligheter.

**Løsning for hodeløs Linux:**

1. Installer `gnome-keyring` og `libsecret`:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Start nøkkelringdaemonen:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. Eller bruk den krypterte filerstatningen ved å sette:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Merk: Minnefallback betyr at hemmeligheter går tapt ved restart. Det er kun
   egnet for testing.

---

## Problemer med konfigurasjonsverdier

### Boolsk tvang

Når du bruker `triggerfish config set`, konverteres strengverdiene `"true"` og
`"false"` automatisk til YAML-boolske verdier. Hvis du faktisk trenger den
bokstavelige strengen `"true"`, rediger YAML-filen direkte.

Tilsvarende tvinges strenger som ser ut som heltall (`"8080"`) til tall.

### Punktum-bane-syntaks

`config set`- og `config get`-kommandoene bruker punktum-baner for å navigere
nestet YAML:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Hvis et banesegment inneholder et punktum, er det ingen escape-syntaks. Rediger
YAML-filen direkte.

### Hemmelighetmaskering i `config get`

Når du kjører `triggerfish config get` på en nøkkel som inneholder «key», «secret»
eller «token», maskeres utdataet: `****...****` med bare de første og siste 4
tegnene synlige. Dette er tilsiktet. Bruk `triggerfish config get-secret <nøkkel>`
for å hente den faktiske verdien.

---

## Konfigurasjonssikkerhetskopier

Triggerfish oppretter en tidsstemplet sikkerhetskopi i `~/.triggerfish/backups/`
før hver `config set`-, `config add-channel`- eller `config add-plugin`-operasjon.
Opptil 10 sikkerhetskopier beholdes.

For å gjenopprette en sikkerhetskopi:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Leverandørverifisering

Oppsettveiviseren verifiserer API-nøkler ved å kalle hver leverandørs
modellopplistingsendepunkt (som ikke bruker tokens). Verifiseringsendepunktene er:

| Leverandør | Endepunkt |
|----------|----------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

Hvis verifisering mislykkes, sjekk:
- API-nøkkelen er riktig og ikke utløpt
- Endepunktet er nåbar fra nettverket ditt
- For lokale leverandører (Ollama, LM Studio) at serveren faktisk kjører

### Modell ikke funnet

Hvis verifisering lykkes, men modellen ikke er funnet, advarer veiviseren deg.
Dette betyr vanligvis:

- **Skrivefeil i modellnavnet.** Sjekk leverandørens dokumentasjon for eksakte
  modell-ID-er.
- **Ollama-modell ikke hentet.** Kjør `ollama pull <modell>` først.
- **Leverandøren lister ikke modellen.** Noen leverandører (Fireworks) bruker
  forskjellige navneformater. Veiviseren normaliserer vanlige mønstre, men
  uvanlige modell-ID-er stemmer kanskje ikke.
