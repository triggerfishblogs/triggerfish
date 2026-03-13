# Slack

Verbind uw Triggerfish-agent met Slack zodat uw agent kan deelnemen aan werkruimtegesprekken. De adapter gebruikt het [Bolt](https://slack.dev/bolt-js/)-framework met Socket Mode, wat betekent dat er geen publieke URL of webhookendpoint vereist is.

## Standaardclassificatie

Slack is standaard ingesteld op `PUBLIC`-classificatie. Dit weerspiegelt de werkelijkheid dat Slack-werkruimten vaak externe gasten, Slack Connect-gebruikers en gedeelde kanalen bevatten. U kunt dit verhogen naar `INTERNAL` of hoger als uw werkruimte strikt intern is.

## Installatie

### Stap 1: Een Slack-app aanmaken

1. Ga naar [api.slack.com/apps](https://api.slack.com/apps)
2. Klik op **Create New App**
3. Kies **From scratch**
4. Geef uw app een naam (bijv. "Triggerfish") en selecteer uw werkruimte
5. Klik op **Create App**

### Stap 2: Bottoken-scopes configureren

Navigeer naar **OAuth & Permissions** in de zijbalk en voeg de volgende **Bot Token Scopes** toe:

| Scope              | Doel                                       |
| ------------------ | ------------------------------------------ |
| `chat:write`       | Berichten verzenden                        |
| `channels:history` | Berichten lezen in openbare kanalen        |
| `groups:history`   | Berichten lezen in privékanalen            |
| `im:history`       | Directe berichten lezen                    |
| `mpim:history`     | Groepsdirecte berichten lezen              |
| `channels:read`    | Openbare kanalen weergeven                 |
| `groups:read`      | Privékanalen weergeven                     |
| `im:read`          | Directeberichtgesprekken weergeven         |
| `users:read`       | Gebruikersinformatie opzoeken              |

### Stap 3: Socket Mode inschakelen

1. Navigeer naar **Socket Mode** in de zijbalk
2. Zet **Enable Socket Mode** aan
3. U wordt gevraagd een **App-Level Token** aan te maken — geef het een naam (bijv. "triggerfish-socket") en voeg de scope `connections:write` toe
4. Kopieer het gegenereerde **App Token** (begint met `xapp-`)

### Stap 4: Evenementen inschakelen

1. Navigeer naar **Event Subscriptions** in de zijbalk
2. Zet **Enable Events** aan
3. Voeg onder **Subscribe to bot events** de volgende toe:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Stap 5: Uw inloggegevens ophalen

U hebt drie waarden nodig:

- **Bot Token** — Ga naar **OAuth & Permissions**, klik op **Install to Workspace** en kopieer vervolgens het **Bot User OAuth Token** (begint met `xoxb-`)
- **App Token** — Het token dat u in stap 3 heeft aangemaakt (begint met `xapp-`)
- **Signing Secret** — Ga naar **Basic Information**, scroll naar **App Credentials** en kopieer het **Signing Secret**

### Stap 6: Uw Slack-gebruikers-ID ophalen

Om eigenaaridentiteit te configureren:

1. Open Slack
2. Klik op uw profielfoto rechtsboven
3. Klik op **Profile**
4. Klik op het driepuntsmenu en selecteer **Copy member ID**

### Stap 7: Triggerfish configureren

Voeg het Slack-kanaal toe aan uw `triggerfish.yaml`:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret opgeslagen in OS-sleutelhanger
    ownerId: "U01234ABC"
```

Geheimen (bottoken, apptoken, ondertekeningsgeheim) worden ingevoerd tijdens `triggerfish config add-channel slack` en opgeslagen in de OS-sleutelhanger.

| Optie            | Type   | Vereist      | Beschrijving                                        |
| ---------------- | ------ | ------------ | --------------------------------------------------- |
| `ownerId`        | string | Aanbevolen   | Uw Slack-lid-ID voor eigenaarverificatie            |
| `classification` | string | Nee          | Classificatieniveau (standaard: `PUBLIC`)           |

::: warning Sla geheimen veilig op Sla tokens of geheimen nooit op in bronbeheer. Gebruik omgevingsvariabelen of uw OS-sleutelhanger. Zie [Geheimenbeheer](/nl-NL/security/secrets) voor details. :::

### Stap 8: De bot uitnodigen

Voordat de bot berichten in een kanaal kan lezen of verzenden, moet u het uitnodigen:

1. Open het Slack-kanaal waar u de bot wilt hebben
2. Typ `/invite @Triggerfish` (of hoe u uw app ook hebt genoemd)

De bot kan ook directe berichten ontvangen zonder in een kanaal te worden uitgenodigd.

### Stap 9: Triggerfish starten

```bash
triggerfish stop && triggerfish start
```

Stuur een bericht in een kanaal waar de bot aanwezig is, of stuur het een DM, om de verbinding te bevestigen.

## Eigenaaridentiteit

Triggerfish gebruikt de Slack OAuth-stroom voor eigenaarverificatie. Wanneer een bericht aankomt, vergelijkt de adapter het gebruikers-ID van de afzender met de geconfigureerde `ownerId`:

- **Overeenkomst** — Eigenaarsopdracht
- **Geen overeenkomst** — Externe invoer met `PUBLIC`-taint

### Werkruimtelidmaatschap

Voor ontvangerclassificatie bepaalt het Slack-werkruimtelidmaatschap of een gebruiker `INTERNAL` of `EXTERNAL` is:

- Gewone werkruimteleden zijn `INTERNAL`
- Externe Slack Connect-gebruikers zijn `EXTERNAL`
- Gastgebruikers zijn `EXTERNAL`

## Berichtlimieten

Slack ondersteunt berichten tot 40.000 tekens. Berichten die deze limiet overschrijden, worden afgekapt. Voor de meeste agentantwoorden wordt deze limiet nooit bereikt.

## Typaanduidingen

Triggerfish stuurt typaanduidingen naar Slack wanneer de agent een verzoek verwerkt. Slack stelt inkomende typgebeurtenissen niet bloot aan bots, dus dit is alleen verzenden.

## Groepschat

De bot kan deelnemen aan groepskanalen. Configureer groepsgedrag in uw `triggerfish.yaml`:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistent"
      behavior: "always"
```

| Gedrag           | Beschrijving                                      |
| ---------------- | ------------------------------------------------- |
| `mentioned-only` | Alleen reageren wanneer de bot @vermeld is        |
| `always`         | Op alle berichten in het kanaal reageren          |

## Classificatie wijzigen

```yaml
channels:
  slack:
    classification: INTERNAL
```

Geldige niveaus: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
