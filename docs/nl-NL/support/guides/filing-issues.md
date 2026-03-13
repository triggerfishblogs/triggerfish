# Hoe een goede issue in te dienen

Een goed gestructureerde issue wordt sneller opgelost. Een vage issue zonder logboeken en zonder reproductiestappen ligt vaak wekenlang stil omdat niemand er actie op kan ondernemen. Dit is wat u moet opnemen.

## Vóór het indienen

1. **Zoek bestaande issues.** Iemand anders heeft het probleem mogelijk al gemeld. Controleer [openstaande issues](https://github.com/greghavens/triggerfish/issues) en [gesloten issues](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed).

2. **Raadpleeg de probleemoplossingsgidsen.** De [probleemoplossingssectie](/nl-NL/support/troubleshooting/) behandelt de meest voorkomende problemen.

3. **Controleer bekende problemen.** De pagina [Bekende problemen](/nl-NL/support/kb/known-issues) vermeldt problemen waarvan we al op de hoogte zijn.

4. **Probeer de nieuwste versie.** Als u niet de nieuwste release gebruikt, werk dan eerst bij:
   ```bash
   triggerfish update
   ```

## Wat u moet opnemen

### 1. Omgeving

```
Triggerfish-versie: (voer `triggerfish version` uit)
Besturingssysteem: (bijv. macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Architectuur: (x64 of arm64)
Installatiemethode: (binaire installatie, vanuit broncode, Docker)
```

### 2. Reproductiestappen

Schrijf de exacte reeks handelingen die tot het probleem leidt. Wees specifiek:

**Slecht:**
> De bot werkt niet meer.

**Goed:**
> 1. Triggerfish gestart met Telegram-kanaal geconfigureerd
> 2. Het bericht "check my calendar for tomorrow" als DM naar de bot gestuurd
> 3. De bot reageerde met de kalenderresultaten
> 4. "now email those results to alice@example.com" gestuurd
> 5. Verwacht: bot stuurt de e-mail
> 6. Werkelijk: bot reageert met "Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL"

### 3. Verwacht versus werkelijk gedrag

Geef aan wat u verwachtte dat er zou gebeuren en wat er daadwerkelijk is gebeurd. Voeg de exacte foutmelding toe als die er is. Kopiëren en plakken is beter dan parafraseren.

### 4. Logboekuitvoer

Voeg een [logboekbundel](/nl-NL/support/guides/collecting-logs) toe:

```bash
triggerfish logs bundle
```

Als het probleem beveiligingsgevoelig is, kunt u gedeelten redigeren, maar vermeld dan in de issue wat u hebt geredigeerd.

Plak minimaal de relevante logboekregels. Voeg tijdstempels toe zodat we gebeurtenissen kunnen correleren.

### 5. Configuratie (geredigeerd)

Plak het relevante gedeelte van uw `triggerfish.yaml`. **Verwijder altijd geheimen.** Vervang werkelijke waarden door plaatshouders:

```yaml
# Goed — geheimen geredigeerd
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # opgeslagen in sleutelhanger
channels:
  telegram:
    ownerId: "GEREDIGEERD"
    classification: INTERNAL
```

### 6. Patrol-uitvoer

```bash
triggerfish patrol
```

Plak de uitvoer. Dit geeft ons een snel overzicht van de systeemgezondheid.

## Issuetypen

### Bugrapport

Gebruik deze sjabloon voor zaken die defect zijn:

```markdown
## Bugrapport

**Omgeving:**
- Versie:
- Besturingssysteem:
- Installatiemethode:

**Reproductiestappen:**
1.
2.
3.

**Verwacht gedrag:**

**Werkelijk gedrag:**

**Foutmelding (indien aanwezig):**

**Patrol-uitvoer:**

**Relevante configuratie (geredigeerd):**

**Logboekbundel:** (bestand bijvoegen)
```

### Functieverzoek

```markdown
## Functieverzoek

**Probleem:** Wat probeert u te doen wat u vandaag niet kunt doen?

**Voorgestelde oplossing:** Hoe denkt u dat het zou moeten werken?

**Overwogen alternatieven:** Wat heeft u nog meer geprobeerd?
```

### Vraag / ondersteuningsverzoek

Als u niet zeker weet of iets een bug is of als u gewoon vastloopt, gebruik dan [GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) in plaats van Issues. Discussies zijn beter voor vragen die mogelijk niet één correct antwoord hebben.

## Wat u NIET moet opnemen

- **Onbewerkte API-sleutels of wachtwoorden.** Verwijder deze altijd.
- **Persoonlijke gegevens uit gesprekken.** Verwijder namen, e-mailadressen en telefoonnummers.
- **Volledige logboekbestanden inline.** Voeg de logboekbundel als bestand bij in plaats van duizenden regels te plakken.

## Na het indienen

- **Houd follow-upvragen in de gaten.** Beheerders hebben mogelijk meer informatie nodig.
- **Test oplossingen.** Als er een oplossing wordt ingediend, kan u worden gevraagd deze te verifiëren.
- **Sluit de issue** als u de oplossing zelf vindt. Plaats de oplossing zodat anderen er baat bij kunnen hebben.
