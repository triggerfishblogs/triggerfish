# Discord

Koble Triggerfish-agenten din til Discord slik at den kan svare i serverkanaler og direktemeldinger. Adapteren bruker [discord.js](https://discord.js.org/) til å koble til Discord Gateway.

## Standard klassifisering

Discord er som standard `PUBLIC`-klassifisert. Discord-servere inkluderer ofte en blanding av betrodde medlemmer og offentlige besøkende, så `PUBLIC` er den trygge standarden. Du kan heve dette hvis serveren din er privat og betrodd.

## Oppsett

### Trinn 1: Opprett en Discord-applikasjon

1. Gå til [Discord Developer Portal](https://discord.com/developers/applications)
2. Klikk **New Application**
3. Navngi applikasjonen din (f.eks. «Triggerfish»)
4. Klikk **Create**

### Trinn 2: Opprett en botbruker

1. I applikasjonen din, naviger til **Bot** i sidefeltet
2. Klikk **Add Bot** (hvis ikke allerede opprettet)
3. Under botens brukernavn, klikk **Reset Token** for å generere et nytt token
4. Kopier **bot-tokenet**

::: warning Hold tokenet ditt hemmelig Bot-tokenet ditt gir full kontroll over boten din. Commit det aldri til kildekontroll eller del det offentlig. :::

### Trinn 3: Konfigurer privilegerte hensikter

Fortsatt på **Bot**-siden, aktiver disse privilegerte gateway-hensiktene:

- **Message Content Intent** — Påkrevd for å lese meldingsinnhold
- **Server Members Intent** — Valgfritt, for medlemsoppslag

### Trinn 4: Finn din Discord bruker-ID

1. Åpne Discord
2. Gå til **Settings** > **Advanced** og aktiver **Developer Mode**
3. Klikk brukernavnet ditt hvor som helst i Discord
4. Klikk **Copy User ID**

Dette er snowflake-ID-en som Triggerfish bruker for å verifisere eieridentitet.

### Trinn 5: Generer en invitasjonslenke

1. I Developer Portal, naviger til **OAuth2** > **URL Generator**
2. Under **Scopes**, velg `bot`
3. Under **Bot Permissions**, velg:
   - Send Messages
   - Read Message History
   - View Channels
4. Kopier den genererte URL-en og åpne den i nettleseren din
5. Velg serveren du vil legge boten til og klikk **Authorize**

### Trinn 6: Konfigurer Triggerfish

Legg til Discord-kanalen i din `triggerfish.yaml`:

```yaml
channels:
  discord:
    # botToken lagret i OS-nøkkelringen
    ownerId: "123456789012345678"
```

| Alternativ       | Type   | Påkrevd  | Beskrivelse                                                        |
| ---------------- | ------ | -------- | ------------------------------------------------------------------ |
| `botToken`       | string | Ja       | Discord bot-token                                                  |
| `ownerId`        | string | Anbefalt | Din Discord bruker-ID (snowflake) for eierverifisering             |
| `classification` | string | Nei      | Klassifiseringsnivå (standard: `PUBLIC`)                           |

### Trinn 7: Start Triggerfish

```bash
triggerfish stop && triggerfish start
```

Send en melding i en kanal der boten er til stede, eller DM den direkte, for å bekrefte tilkoblingen.

## Eieridentitet

Triggerfish bestemmer eierstatus ved å sammenligne avsenderens Discord bruker-ID mot den konfigurerte `ownerId`. Denne sjekken skjer i kode før LLM-en ser meldingen:

- **Samsvar** — Meldingen er en eierkommando
- **Ingen samsvar** — Meldingen er ekstern inndata med `PUBLIC`-taint

Hvis ingen `ownerId` er konfigurert, behandles alle meldinger som om de kommer fra eieren.

::: danger Angi alltid eier-ID Hvis boten din er på en server med andre medlemmer, konfigurer alltid `ownerId`. Uten den kan ethvert servermedlem gi kommandoer til agenten din. :::

## Meldingsdeling

Discord har en 2 000-tegns meldingsgrense. Når agenten genererer et svar som er lengre enn dette, deler Triggerfish det automatisk i flere meldinger. Deleren deler ved linjeskift eller mellomrom for å bevare lesbarhet.

## Botanferd

Discord-adapteren:

- **Ignorerer egne meldinger** — Boten svarer ikke på meldinger den sender
- **Lytter i alle tilgjengelige kanaler** — Guild-kanaler, gruppe-DM-er og direktemeldinger
- **Krever Message Content Intent** — Uten dette mottar boten tomme meldingshendelser

## Skriveindikatorer

Triggerfish sender skriveindikatorer til Discord når agenten behandler en forespørsel. Discord eksponerer ikke skrivebegivenheter fra brukere til bots på en pålitelig måte, så dette er bare-send.

## Gruppechat

Boten kan delta i serverkanaler. Konfigurer gruppeatferd:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Atferd           | Beskrivelse                                      |
| ---------------- | ------------------------------------------------ |
| `mentioned-only` | Svar bare når boten @nevnes                      |
| `always`         | Svar på alle meldinger i kanalen                 |

## Endre klassifisering

```yaml
channels:
  discord:
    # botToken lagret i OS-nøkkelringen
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Gyldige nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
