# WhatsApp

Verbind uw Triggerfish-agent met WhatsApp zodat u er vanaf uw telefoon mee kunt communiceren. De adapter gebruikt de **WhatsApp Business Cloud API** (de officiële door Meta gehoste HTTP API), ontvangt berichten via webhook en verzendt via REST.

## Standaardclassificatie

WhatsApp is standaard ingesteld op `PUBLIC`-classificatie. WhatsApp-contacten kunnen iedereen zijn met uw telefoonnummer, dus `PUBLIC` is de veilige standaard.

## Installatie

### Stap 1: Een Meta Business-account aanmaken

1. Ga naar het [Meta for Developers](https://developers.facebook.com/)-portaal
2. Maak een ontwikkelaarsaccount aan als u dat nog niet heeft
3. Maak een nieuwe app aan en selecteer **Business** als het apptype
4. Voeg in uw app-dashboard het **WhatsApp**-product toe

### Stap 2: Uw inloggegevens ophalen

Verzamel vanuit het WhatsApp-gedeelte van uw app-dashboard deze waarden:

- **Access Token** — Een permanent toegangstoken (of genereer een tijdelijk voor testen)
- **Phone Number ID** — Het ID van het telefoonnummer geregistreerd bij WhatsApp Business
- **Verify Token** — Een tekenreeks die u kiest, gebruikt om webhookregistratie te verifiëren

### Stap 3: Webhooks configureren

1. Navigeer in de WhatsApp-productinstellingen naar **Webhooks**
2. Stel de callback-URL in op het publieke adres van uw server (bijv. `https://uw-server.com:8443/webhook`)
3. Stel het **Verify Token** in op dezelfde waarde die u in uw Triggerfish-configuratie gebruikt
4. Abonneer op het `messages`-webhookveld

::: info Publieke URL vereist WhatsApp-webhooks vereisen een publiek toegankelijk HTTPS-eindpunt. Als u Triggerfish lokaal uitvoert, heeft u een tunnelservice nodig (bijv. ngrok, Cloudflare Tunnel) of een server met een publiek IP-adres. :::

### Stap 4: Triggerfish configureren

Voeg het WhatsApp-kanaal toe aan uw `triggerfish.yaml`:

```yaml
channels:
  whatsapp:
    # accessToken opgeslagen in OS-sleutelhanger
    phoneNumberId: "uw-telefoonnummer-id"
    # verifyToken opgeslagen in OS-sleutelhanger
    ownerPhone: "15551234567"
```

| Optie            | Type   | Vereist    | Beschrijving                                                          |
| ---------------- | ------ | ---------- | --------------------------------------------------------------------- |
| `accessToken`    | string | Ja         | WhatsApp Business API-toegangstoken                                   |
| `phoneNumberId`  | string | Ja         | Telefoonnummer-ID van Meta Business Dashboard                         |
| `verifyToken`    | string | Ja         | Token voor webhookverificatie (u kiest dit)                           |
| `webhookPort`    | number | Nee        | Poort voor webhooks (standaard: `8443`)                               |
| `ownerPhone`     | string | Aanbevolen | Uw telefoonnummer voor eigenaarverificatie (bijv. `"15551234567"`)    |
| `classification` | string | Nee        | Classificatieniveau (standaard: `PUBLIC`)                             |

::: warning Sla geheimen veilig op Sla toegangstokens nooit op in bronbeheer. Gebruik omgevingsvariabelen of uw OS-sleutelhanger. :::

### Stap 5: Triggerfish starten

```bash
triggerfish stop && triggerfish start
```

Stuur een bericht van uw telefoon naar het WhatsApp Business-nummer om de verbinding te bevestigen.

## Eigenaaridentiteit

Triggerfish bepaalt eigenaarsrol door het telefoonnummer van de afzender te vergelijken met de geconfigureerde `ownerPhone`. Deze controle vindt in code plaats voordat het LLM het bericht ziet:

- **Overeenkomst** — Het bericht is een eigenaarsopdracht
- **Geen overeenkomst** — Het bericht is externe invoer met `PUBLIC`-taint

Als er geen `ownerPhone` is geconfigureerd, worden alle berichten behandeld als afkomstig van de eigenaar.

::: tip Stel altijd eigenaar-telefoon in Als anderen uw WhatsApp Business-nummer kunnen berichten, configureer altijd `ownerPhone` om ongeautoriseerde opdrachtuitvoering te voorkomen. :::

## Hoe de webhook werkt

De adapter start een HTTP-server op de geconfigureerde poort (standaard `8443`) die twee soorten verzoeken verwerkt:

1. **GET /webhook** — Meta stuurt dit om uw webhookendpoint te verifiëren. Triggerfish antwoordt met het challengetoken als het verify-token overeenkomt.
2. **POST /webhook** — Meta stuurt inkomende berichten hier naartoe. Triggerfish parseert de Cloud API webhook-payload, extraheert tekstberichten en stuurt ze door naar de berichtenhandler.

## Berichtlimieten

WhatsApp ondersteunt berichten tot 4.096 tekens. Berichten die deze limiet overschrijden, worden opgesplitst in meerdere berichten voor verzending.

## Typaanduidingen

Triggerfish stuurt en ontvangt typaanduidingen op WhatsApp. Wanneer uw agent een verzoek verwerkt, toont de chat een typaanduiding. Leesbevestigingen worden ook ondersteund.

## Classificatie wijzigen

```yaml
channels:
  whatsapp:
    # accessToken opgeslagen in OS-sleutelhanger
    phoneNumberId: "uw-telefoonnummer-id"
    # verifyToken opgeslagen in OS-sleutelhanger
    classification: INTERNAL
```

Geldige niveaus: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
