# Probleemoplossing: Configuratie

## YAML-parseerfouten

### "Configuration parse failed"

Het YAML-bestand heeft een syntaxisfout. Veelvoorkomende oorzaken:

- **Inspringing komt niet overeen.** YAML is gevoelig voor witruimte. Gebruik spaties, geen tabs. Elk nestniveau moet precies 2 spaties zijn.
- **Niet-geciteerde speciale tekens.** Waarden met `:`, `#`, `{`, `}`, `[`, `]` of `&` moeten worden geciteerd.
- **Ontbrekende dubbele punt na sleutel.** Elke sleutel heeft `: ` nodig (dubbele punt gevolgd door een spatie).

Valideer uw YAML:

```bash
triggerfish config validate
```

Of gebruik een online YAML-validator om de exacte regel te vinden.

### "Configuration file did not parse to an object"

Het YAML-bestand is succesvol geparseerd maar het resultaat is geen YAML-mapping (object). Dit gebeurt als uw bestand alleen een scalaire waarde, een lijst bevat of leeg is.

Uw `triggerfish.yaml` moet een mapping op het hoogste niveau hebben. Minimaal:

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

### "Configuration file not found"

Triggerfish zoekt naar configuratie op deze paden, in volgorde:

1. `$TRIGGERFISH_CONFIG`-omgevingsvariabele (indien ingesteld)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (indien `TRIGGERFISH_DATA_DIR` is ingesteld)
3. `/data/triggerfish.yaml` (Docker-omgevingen)
4. `~/.triggerfish/triggerfish.yaml` (standaard)

Voer de installatiewizard uit om er een aan te maken:

```bash
triggerfish dive
```

---

## Validatiefouten

### "Configuration validation failed"

Dit betekent dat de YAML is geparseerd maar structurele validatie niet heeft doorstaan. Specifieke meldingen:

**"models is required"** of **"models.primary is required"**

De sectie `models` is verplicht. U hebt minimaal een primaire provider en model nodig:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** of **"primary.model must be non-empty"**

Het veld `primary` moet zowel `provider` als `model` hebben ingesteld op niet-lege tekenreeksen.

**"Invalid classification level"** in `classification_models`

Geldige niveaus zijn: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. Dit zijn hoofdlettergevoelig. Controleer uw `classification_models`-sleutels.

---

## Geheimreferentiefouten

### Geheim niet opgelost bij opstarten

Als uw configuratie `secret:some-key` bevat en die sleutel niet bestaat in de sleutelhanger, verlaat de daemon met een fout zoals:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Oplossing:**

```bash
# Welke geheimen bestaan, weergeven
triggerfish config get-secret --list

# Het ontbrekende geheim opslaan
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Geheimensbackend niet beschikbaar

Op Linux gebruikt de geheimensopslag `secret-tool` (libsecret / GNOME Keyring). Als de Secret Service D-Bus-interface niet beschikbaar is (servers zonder desktop, minimale containers), ziet u fouten bij het opslaan of ophalen van geheimen.

**Tijdelijke oplossing voor Linux zonder desktop:**

1. Installeer `gnome-keyring` en `libsecret`:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Start de sleutelringdaemon:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. Of gebruik de versleutelde bestandsfallback door in te stellen:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Opmerking: de geheugen-fallback betekent dat geheimen verloren gaan bij herstart. Deze modus is alleen geschikt voor testen.

---

## Configuratiewaardefout

### Booleaanse dwang

Bij gebruik van `triggerfish config set` worden tekenreekswaarden `"true"` en `"false"` automatisch omgezet naar YAML-booleans. Als u de letterlijke tekenreeks `"true"` nodig heeft, bewerk het YAML-bestand dan rechtstreeks.

Op dezelfde manier worden tekenreeksen die eruitzien als gehele getallen (`"8080"`) omgezet naar getallen.

### Syntaxis met punten

De opdrachten `config set` en `config get` gebruiken padden met punten om geneste YAML te navigeren:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Als een padsegment een punt bevat, is er geen escapesyntaxis. Bewerk het YAML-bestand dan rechtstreeks.

### Geheimmasking in `config get`

Wanneer u `triggerfish config get` uitvoert op een sleutel die "key", "secret" of "token" bevat, wordt de uitvoer gemaskeerd: `****...****` met alleen de eerste en laatste 4 tekens zichtbaar. Dit is opzettelijk. Gebruik `triggerfish config get-secret <sleutel>` om de werkelijke waarde op te halen.

---

## Configuratieback-ups

Triggerfish maakt een tijdgestempelde back-up in `~/.triggerfish/backups/` vóór elke `config set`-, `config add-channel`- of `config add-plugin`-bewerking. Tot 10 back-ups worden bewaard.

Om een back-up te herstellen:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Providerverificatie

De installatiewizard verifieert API-sleutels door het modellenlijstingseindpunt van elke provider aan te roepen (wat geen tokens verbruikt). De verificatie-eindpunten zijn:

| Provider | Eindpunt |
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

Als verificatie mislukt, controleer dan nogmaals:
- De API-sleutel is correct en niet verlopen
- Het eindpunt is bereikbaar vanuit uw netwerk
- Voor lokale providers (Ollama, LM Studio): de server is daadwerkelijk actief

### Model niet gevonden

Als verificatie slaagt maar het model niet wordt gevonden, waarschuwt de wizard. Dit betekent doorgaans:

- **Typefout in de modelnaam.** Controleer de documentatie van de provider voor exacte model-ID's.
- **Ollama-model niet opgehaald.** Voer eerst `ollama pull <model>` uit.
- **Provider vermeldt het model niet.** Sommige providers (Fireworks) gebruiken verschillende naamgevingsformaten. De wizard normaliseert veelgebruikte patronen, maar ongebruikelijke model-ID's komen mogelijk niet overeen.
