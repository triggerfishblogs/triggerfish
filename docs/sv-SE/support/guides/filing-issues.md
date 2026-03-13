# Hur man rapporterar ett bra ärende

Ett välstrukturerat ärende löses snabbare. Ett vagt ärende utan loggar och reproduktionssteg sitter ofta i veckor eftersom ingen kan agera på det. Här är vad som bör ingå.

## Innan du rapporterar

1. **Sök befintliga ärenden.** Någon kan redan ha rapporterat samma problem. Kontrollera [öppna ärenden](https://github.com/greghavens/triggerfish/issues) och [stängda ärenden](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed).

2. **Kontrollera felsökningsguiderna.** [Felsökningsavsnittet](/sv-SE/support/troubleshooting/) täcker de flesta vanliga problem.

3. **Kontrollera kända problem.** Sidan [Kända problem](/sv-SE/support/kb/known-issues) listar problem vi redan känner till.

4. **Prova den senaste versionen.** Om du inte har den senaste utgåvan, uppdatera först:
   ```bash
   triggerfish update
   ```

## Vad man ska inkludera

### 1. Miljö

```
Triggerfish-version: (kör `triggerfish version`)
OS: (t.ex. macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Arkitektur: (x64 eller arm64)
Installationsmetod: (binärinstallationsverktyg, från källkod, Docker)
```

### 2. Reproduktionssteg

Skriv den exakta sekvensen av åtgärder som leder till problemet. Var specifik:

**Dåligt:**
> Boten slutade fungera.

**Bra:**
> 1. Startade Triggerfish med Telegram-kanal konfigurerad
> 2. Skickade meddelandet "kontrollera min kalender för imorgon" i en DM till boten
> 3. Boten svarade med kalenderresultaten
> 4. Skickade "nu maila de resultaten till alice@example.com"
> 5. Förväntat: boten skickar e-posten
> 6. Faktiskt: boten svarar med "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL"

### 3. Förväntat kontra faktiskt beteende

Beskriv vad du förväntade dig skulle hända och vad som faktiskt hände. Inkludera det exakta felmeddelandet om det finns ett. Kopiera-klistra är bättre än att omformulera.

### 4. Loggutdata

Bifoga ett [loggpaket](/sv-SE/support/guides/collecting-logs):

```bash
triggerfish logs bundle
```

Om problemet är säkerhetskänsligt kan du redigera delar, men notera i ärendet vad du redigerade.

Som minimum, klistra in de relevanta loggraders. Inkludera tidsstämplar så att vi kan korrelera händelser.

### 5. Konfiguration (redigerad)

Klistra in det relevanta avsnittet av din `triggerfish.yaml`. **Redigera alltid hemligheter.** Ersätt faktiska värden med platshållare:

```yaml
# Bra - hemligheter redigerade
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # lagras i nyckelring
channels:
  telegram:
    ownerId: "REDACTED"
    classification: INTERNAL
```

### 6. Patrol-utdata

```bash
triggerfish patrol
```

Klistra in utdata. Det ger oss en snabb ögonblicksbild av systemets hälsa.

## Ärendetyper

### Buggrapport

Använd den här mallen för saker som är trasiga:

```markdown
## Buggrapport

**Miljö:**
- Version:
- OS:
- Installationsmetod:

**Reproduktionssteg:**
1.
2.
3.

**Förväntat beteende:**

**Faktiskt beteende:**

**Felmeddelande (om något):**

**Patrol-utdata:**

**Relevant konfiguration (redigerad):**

**Loggpaket:** (bifoga fil)
```

### Funktionsförfrågan

```markdown
## Funktionsförfrågan

**Problem:** Vad försöker du göra som du inte kan göra idag?

**Föreslagen lösning:** Hur tror du det borde fungera?

**Övervägda alternativ:** Vad annat provade du?
```

### Fråga / Supportförfrågan

Om du inte är säker på om något är en bugg eller om du bara är fast, använd [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) istället för Issues. Diskussioner är bättre för frågor som kanske inte har ett enda rätt svar.

## Vad man INTE ska inkludera

- **Råa API-nycklar eller lösenord.** Redigera alltid.
- **Personliga data från konversationer.** Redigera namn, e-postadresser, telefonnummer.
- **Hela loggfiler inline.** Bifoga loggpaketet som en fil istället för att klistra in tusentals rader.

## Efter rapportering

- **Håll utkik efter uppföljningsfrågor.** Underhållare kan behöva mer information.
- **Testa korrigeringar.** Om en korrigering publiceras kan du bli ombedd att verifiera den.
- **Stäng ärendet** om du hittar lösningen själv. Posta lösningen så att andra kan dra nytta av den.
