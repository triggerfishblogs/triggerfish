# Discord

Verbind uw Triggerfish-agent met Discord zodat het kan reageren in serverkanalen en directe berichten. De adapter gebruikt [discord.js](https://discord.js.org/) om verbinding te maken met de Discord Gateway.

## Standaardclassificatie

Discord is standaard ingesteld op `PUBLIC`-classificatie. Discord-servers bevatten vaak een mix van vertrouwde leden en publieke bezoekers, dus `PUBLIC` is de veilige standaard. U kunt dit verhogen als uw server privé en vertrouwd is.

## Installatie

### Stap 1: Een Discord-toepassing aanmaken

1. Ga naar het [Discord Developer Portal](https://discord.com/developers/applications)
2. Klik op **New Application**
3. Geef uw toepassing een naam (bijv. "Triggerfish")
4. Klik op **Create**

### Stap 2: Een botgebruiker aanmaken

1. Navigeer in uw toepassing naar **Bot** in de zijbalk
2. Klik op **Add Bot** (als het nog niet is aangemaakt)
3. Klik onder de gebruikersnaam van de bot op **Reset Token** om een nieuw token te genereren
4. Kopieer het **bottoken**

::: warning Houd uw token geheim Uw bottoken geeft volledige controle over uw bot. Sla het nooit op in bronbeheer of deel het publiekelijk. :::

### Stap 3: Geprivilegieerde intents configureren

Schakel op de **Bot**-pagina deze geprivilegieerde gateway-intents in:

- **Message Content Intent** — Vereist om berichtinhoud te lezen
- **Server Members Intent** — Optioneel, voor ledenopzoeken

### Stap 4: Uw Discord-gebruikers-ID ophalen

1. Open Discord
2. Ga naar **Settings** > **Advanced** en schakel **Developer Mode** in
3. Klik op uw gebruikersnaam ergens in Discord
4. Klik op **Copy User ID**

Dit is de snowflake-ID die Triggerfish gebruikt om eigenaaridentiteit te verifiëren.

### Stap 5: Een uitnodigingslink genereren

1. Navigeer in het Developer Portal naar **OAuth2** > **URL Generator**
2. Selecteer onder **Scopes** de optie `bot`
3. Selecteer onder **Bot Permissions**:
   - Send Messages
   - Read Message History
   - View Channels
4. Kopieer de gegenereerde URL en open deze in uw browser
5. Selecteer de server waaraan u de bot wilt toevoegen en klik op **Authorize**

### Stap 6: Triggerfish configureren

Voeg het Discord-kanaal toe aan uw `triggerfish.yaml`:

```yaml
channels:
  discord:
    # botToken opgeslagen in OS-sleutelhanger
    ownerId: "123456789012345678"
```

| Optie            | Type   | Vereist    | Beschrijving                                                         |
| ---------------- | ------ | ---------- | -------------------------------------------------------------------- |
| `botToken`       | string | Ja         | Discord-bottoken                                                     |
| `ownerId`        | string | Aanbevolen | Uw Discord-gebruikers-ID (snowflake) voor eigenaarverificatie        |
| `classification` | string | Nee        | Classificatieniveau (standaard: `PUBLIC`)                            |

### Stap 7: Triggerfish starten

```bash
triggerfish stop && triggerfish start
```

Stuur een bericht in een kanaal waar de bot aanwezig is, of stuur het een DM, om de verbinding te bevestigen.

## Eigenaaridentiteit

Triggerfish bepaalt eigenaarsrol door het Discord-gebruikers-ID van de afzender te vergelijken met de geconfigureerde `ownerId`. Deze controle vindt in code plaats voordat het LLM het bericht ziet:

- **Overeenkomst** — Het bericht is een eigenaarsopdracht
- **Geen overeenkomst** — Het bericht is externe invoer met `PUBLIC`-taint

Als er geen `ownerId` is geconfigureerd, worden alle berichten behandeld als afkomstig van de eigenaar.

::: danger Stel altijd eigenaar-ID in Als uw bot zich in een server bevindt met andere leden, configureer altijd `ownerId`. Zonder dit kan elk serverlid opdrachten geven aan uw agent. :::

## Berichtopsplitsing

Discord heeft een berichtlimiet van 2.000 tekens. Wanneer de agent een langer antwoord genereert, splitst Triggerfish het automatisch in meerdere berichten. De opsplitser splitst op regeleinden of spaties om de leesbaarheid te behouden.

## Botgedrag

De Discord-adapter:

- **Negeert zijn eigen berichten** — De bot reageert niet op berichten die het zelf verzendt
- **Luistert in alle toegankelijke kanalen** — Serverkanalen, groeps-DM's en directe berichten
- **Vereist Message Content Intent** — Zonder dit ontvangt de bot lege berichtgebeurtenissen

## Typaanduidingen

Triggerfish stuurt typaanduidingen naar Discord wanneer de agent een verzoek verwerkt. Discord stelt typgebeurtenissen van gebruikers niet op een betrouwbare manier bloot aan bots, dus dit is alleen verzenden.

## Groepschat

De bot kan deelnemen aan serverkanalen. Configureer groepsgedrag:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Gedrag           | Beschrijving                                      |
| ---------------- | ------------------------------------------------- |
| `mentioned-only` | Alleen reageren wanneer de bot @vermeld is        |
| `always`         | Op alle berichten in het kanaal reageren          |

## Classificatie wijzigen

```yaml
channels:
  discord:
    # botToken opgeslagen in OS-sleutelhanger
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Geldige niveaus: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
