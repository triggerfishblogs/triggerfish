# Felsökning: Konfiguration

## YAML-tolkningsfel

### "Configuration parse failed"

YAML-filen innehåller ett syntaxfel. Vanliga orsaker:

- **Indragningsmismatch.** YAML är känsligt för blanksteg. Använd mellanslag, inte tabulatorer. Varje kapslingsnivå ska vara exakt 2 mellanslag.
- **Ociterade specialtecken.** Värden som innehåller `:`, `#`, `{`, `}`, `[`, `]` eller `&` måste citeras.
- **Saknat kolon efter nyckel.** Varje nyckel behöver ett `: ` (kolon följt av ett mellanslag).

Validera din YAML:

```bash
triggerfish config validate
```

Eller använd en online-YAML-validerare för att hitta exakt rad.

### "Configuration file did not parse to an object"

YAML-filen tolkades korrekt men resultatet är inte en YAML-mappning (objekt). Det här händer om din fil bara innehåller ett skalärvärde, en lista eller är tom.

Din `triggerfish.yaml` måste ha en mappning på toppnivå. Som minst:

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

Triggerfish söker efter konfiguration på dessa sökvägar, i ordning:

1. `$TRIGGERFISH_CONFIG`-miljövariabeln (om inställd)
2. `$TRIGGERFISH_DATA_DIR/triggerfish.yaml` (om `TRIGGERFISH_DATA_DIR` är inställd)
3. `/data/triggerfish.yaml` (Docker-miljöer)
4. `~/.triggerfish/triggerfish.yaml` (standard)

Kör installationsguiden för att skapa en:

```bash
triggerfish dive
```

---

## Valideringsfel

### "Configuration validation failed"

Det innebär att YAML tolkades men misslyckades med strukturell validering. Specifika meddelanden:

**"models is required"** eller **"models.primary is required"**

Avsnittet `models` är obligatoriskt. Du behöver minst en primär leverantör och modell:

```yaml
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
```

**"primary.provider must be non-empty"** eller **"primary.model must be non-empty"**

Fältet `primary` måste ha både `provider` och `model` inställda till icke-tomma strängar.

**"Invalid classification level"** i `classification_models`

Giltiga nivåer är: `RESTRICTED`, `CONFIDENTIAL`, `INTERNAL`, `PUBLIC`. Dessa är skiftlägeskänsliga. Kontrollera dina `classification_models`-nycklar.

---

## Hemlighetshänvisningsfel

### Hemlighet löses inte upp vid start

Om din konfiguration innehåller `secret:some-key` och den nyckeln inte finns i nyckelringen avslutas daemonen med ett fel som:

```
Secret resolution failed: key "provider:anthropic:apiKey" not found
```

**Åtgärd:**

```bash
# Lista vilka hemligheter som finns
triggerfish config get-secret --list

# Lagra den saknade hemligheten
triggerfish config set-secret provider:anthropic:apiKey sk-ant-...
```

### Hemlighetsbakänd inte tillgänglig

På Linux använder hemlighetarlagraget `secret-tool` (libsecret / GNOME Keyring). Om Secret Service D-Bus-gränssnittet inte är tillgängligt (headless-servrar, minimala containers) ser du fel när hemligheter lagras eller hämtas.

**Lösning för headless Linux:**

1. Installera `gnome-keyring` och `libsecret`:
   ```bash
   # Debian/Ubuntu
   sudo apt install gnome-keyring libsecret-tools

   # Fedora
   sudo dnf install gnome-keyring libsecret
   ```

2. Starta nyckelrings-daemonen:
   ```bash
   eval $(gnome-keyring-daemon --start --components=secrets)
   export GNOME_KEYRING_CONTROL
   ```

3. Eller använd det krypterade filreservalternativet genom att ange:
   ```bash
   export TRIGGERFISH_SECRETS_MEMORY_FALLBACK=true
   ```
   Obs: minnesfallback innebär att hemligheter förloras vid omstart. Det är bara lämpligt för testning.

---

## Konfigurationsvärdesproblem

### Boolesk konvertering

När du använder `triggerfish config set` konverteras strängvärden `"true"` och `"false"` automatiskt till YAML-booleaner. Om du faktiskt behöver den bokstavliga strängen `"true"`, redigera YAML-filen direkt.

På samma sätt konverteras strängar som ser ut som heltal (`"8080"`) till siffror.

### Prickad sökvägssyntax

Kommandona `config set` och `config get` använder prickade sökvägar för att navigera i kapslad YAML:

```bash
triggerfish config set models.primary.provider openai
triggerfish config get channels.telegram.ownerId
triggerfish config set scheduler.trigger.interval "30m"
```

Om ett sökvägssegment innehåller en prick finns det ingen escape-syntax. Redigera YAML-filen direkt.

### Hemlighetsmaskning i `config get`

När du kör `triggerfish config get` på en nyckel som innehåller "key", "secret" eller "token" maskeras utdata: `****...****` med bara de första och sista 4 tecknen synliga. Det är avsiktligt. Använd `triggerfish config get-secret <nyckel>` för att hämta det faktiska värdet.

---

## Konfigurationssäkerhetskopior

Triggerfish skapar en tidsstämplad säkerhetskopia i `~/.triggerfish/backups/` innan varje `config set`-, `config add-channel`- eller `config add-plugin`-operation. Upp till 10 säkerhetskopior behålls.

Så här återställer du en säkerhetskopia:

```bash
ls ~/.triggerfish/backups/
cp ~/.triggerfish/backups/triggerfish.yaml.2026-02-15T10-30-00Z ~/.triggerfish/triggerfish.yaml
triggerfish stop && triggerfish start
```

---

## Leverantörsverifiering

Installationsguiden verifierar API-nycklar genom att anropa varje leverantörs modell-listningsendpoint (vilket inte förbrukar tokens). Verifieringsendpoints är:

| Leverantör | Endpoint |
|------------|----------|
| Anthropic | `https://api.anthropic.com/v1/models` |
| OpenAI | `https://api.openai.com/v1/models` |
| Google | `https://generativelanguage.googleapis.com/v1beta/models` |
| Fireworks | `https://api.fireworks.ai/v1/accounts/fireworks/models` |
| OpenRouter | `https://openrouter.ai/api/v1/models` |
| ZenMux | `https://zenmux.ai/api/v1/models` |
| Z.AI | `https://api.z.ai/api/coding/paas/v4/models` |
| Ollama | `http://localhost:11434/v1/models` |
| LM Studio | `http://localhost:1234/v1/models` |

Om verifieringen misslyckas, dubbelkontrollera:
- API-nyckeln är korrekt och inte utgången
- Endpoint:en är nåbar från ditt nätverk
- För lokala leverantörer (Ollama, LM Studio) att servern faktiskt körs

### Modellen hittades ej

Om verifieringen lyckas men modellen inte hittas varnar guiden dig. Det innebär vanligtvis:

- **Stavfel i modellnamnet.** Kontrollera leverantörens dokumentation för exakta modell-ID:n.
- **Ollama-modell ej hämtad.** Kör `ollama pull <modell>` först.
- **Leverantören listar inte modellen.** Vissa leverantörer (Fireworks) använder olika namnformat. Guiden normaliserar vanliga mönster, men ovanliga modell-ID:n kanske inte matchar.
