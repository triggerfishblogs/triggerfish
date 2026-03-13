# Hvordan rapportere en god sak

En velstrukturert sak løses raskere. En vag sak uten logger og uten
reproduksjonstrinn kan ligge i ukevis fordi ingen kan handle på den. Her er
hva du bør inkludere.

## Før rapportering

1. **Søk etter eksisterende saker.** Noen kan allerede ha rapportert det samme
   problemet. Sjekk [åpne saker](https://github.com/greghavens/triggerfish/issues)
   og [lukkede saker](https://github.com/greghavens/triggerfish/issues?q=is%3Aissue+is%3Aclosed).

2. **Sjekk feilsøkingsveiledningene.** [Feilsøkingsseksjonen](/nb-NO/support/troubleshooting/)
   dekker de fleste vanlige problemer.

3. **Sjekk kjente problemer.** [Kjente problemer](/nb-NO/support/kb/known-issues)-siden
   lister problemer vi allerede er klar over.

4. **Prøv den nyeste versjonen.** Hvis du ikke er på den nyeste utgivelsen,
   oppdater først:
   ```bash
   triggerfish update
   ```

## Hva du bør inkludere

### 1. Miljø

```
Triggerfish-versjon: (kjør `triggerfish version`)
OS: (f.eks. macOS 15.2, Ubuntu 24.04, Windows 11, Docker)
Arkitektur: (x64 eller arm64)
Installasjonsmetode: (binær installatør, fra kildekode, Docker)
```

### 2. Reproduksjonstrinn

Skriv den nøyaktige handlingssekvensen som fører til problemet. Vær spesifikk:

**Dårlig:**
> Boten sluttet å fungere.

**Bra:**
> 1. Startet Triggerfish med Telegram-kanal konfigurert
> 2. Sendte meldingen «check my calendar for tomorrow» i en DM til boten
> 3. Boten svarte med kalenderresultatene
> 4. Sendte «now email those results to alice@example.com»
> 5. Forventet: boten sender e-posten
> 6. Faktisk: boten svarer med «Write-down blocked: CONFIDENTIAL cannot flow to INTERNAL»

### 3. Forventet vs. faktisk atferd

Si hva du forventet skulle skje og hva som faktisk skjedde. Inkluder den nøyaktige
feilmeldingen hvis det finnes en. Kopier og lim inn er bedre enn parafrasering.

### 4. Loggutdata

Legg ved en [loggpakke](/nb-NO/support/guides/collecting-logs):

```bash
triggerfish logs bundle
```

Hvis problemet er sikkerhetssensitivt, kan du redigere deler, men merk i saken
hva du redigerte.

Lim som minimum inn de relevante logglinjene. Inkluder tidsstempler slik at vi
kan korrelere hendelser.

### 5. Konfigurasjon (redigert)

Lim inn den relevante seksjonen av `triggerfish.yaml`. **Rediger alltid hemmeligheter.**
Erstatt faktiske verdier med plassholdere:

```yaml
# Bra - hemmeligheter redigert
models:
  primary:
    provider: anthropic
    model: claude-sonnet-4-20250514
  providers:
    anthropic:
      model: claude-sonnet-4-20250514
      apiKey: "secret:provider:anthropic:apiKey"  # stored in keychain
channels:
  telegram:
    ownerId: "REDACTED"
    classification: INTERNAL
```

### 6. Patrol-utdata

```bash
triggerfish patrol
```

Lim inn utdataet. Dette gir oss et raskt øyeblikksbilde av systemhelse.

## Saktyper

### Feilrapport

Bruk denne malen for ting som er ødelagt:

```markdown
## Bug Report

**Environment:**
- Version:
- OS:
- Install method:

**Steps to reproduce:**
1.
2.
3.

**Expected behavior:**

**Actual behavior:**

**Error message (if any):**

**Patrol output:**

**Relevant config (redacted):**

**Log bundle:** (attach file)
```

### Funksjonsforespørsel

```markdown
## Feature Request

**Problem:** What are you trying to do that you cannot do today?

**Proposed solution:** How do you think it should work?

**Alternatives considered:** What else did you try?
```

### Spørsmål / brukerstøtteforespørsel

Hvis du er usikker på om noe er en feil eller du bare er fast, bruk
[GitHub Discussions](https://github.com/greghavens/triggerfish/discussions) i
stedet for Issues. Diskusjoner er bedre for spørsmål som kanskje ikke har ett
riktig svar.

## Hva du IKKE bør inkludere

- **Rå API-nøkler eller passord.** Rediger alltid.
- **Personlige data fra samtaler.** Rediger navn, e-postadresser, telefonnumre.
- **Hele loggfiler innebygd.** Legg ved loggpakken som en fil i stedet for å
  lime inn tusenvis av linjer.

## Etter rapportering

- **Følg med på oppfølgingsspørsmål.** Vedlikeholderne kan trenge mer informasjon.
- **Test reparasjoner.** Hvis en reparasjon publiseres, kan du bli bedt om å
  verifisere den.
- **Lukk saken** hvis du finner løsningen selv. Publiser løsningen slik at
  andre kan dra nytte av den.
