# WhatsApp

Koble Triggerfish-agenten din til WhatsApp slik at du kan samhandle med den fra telefonen din. Adapteren bruker **WhatsApp Business Cloud API** (den offisielle Meta-hostede HTTP-API-en), mottar meldinger via webhook og sender via REST.

## Standard klassifisering

WhatsApp er som standard `PUBLIC`-klassifisert. WhatsApp-kontakter kan inkludere alle med telefonnummeret ditt, så `PUBLIC` er den trygge standarden.

## Oppsett

### Trinn 1: Opprett en Meta Business-konto

1. Gå til [Meta for Developers](https://developers.facebook.com/)-portalen
2. Opprett en utviklerkonto hvis du ikke har en
3. Opprett en ny app og velg **Business** som apptype
4. I appens dashboard, legg til **WhatsApp**-produktet

### Trinn 2: Hent legitimasjonen din

Fra WhatsApp-delen av appens dashboard, samle disse verdiene:

- **Access Token** — Et permanent tilgangstoken (eller generer et midlertidig for testing)
- **Phone Number ID** — ID-en til telefonnummeret registrert med WhatsApp Business
- **Verify Token** — En streng du velger, brukt til å verifisere webhook-registrering

### Trinn 3: Konfigurer webhooks

1. I WhatsApp-produktinnstillingene, naviger til **Webhooks**
2. Angi tilbakekallingsURL-en til serverens offentlige adresse (f.eks. `https://din-server.com:8443/webhook`)
3. Angi **Verify Token** til samme verdi du vil bruke i Triggerfish-konfigurasjonen din
4. Abonner på `messages` webhook-feltet

::: info Offentlig URL påkrevd WhatsApp webhooks krever et offentlig tilgjengelig HTTPS-endepunkt. Hvis du kjører Triggerfish lokalt, trenger du en tunneltjeneste (f.eks. ngrok, Cloudflare Tunnel) eller en server med en offentlig IP. :::

### Trinn 4: Konfigurer Triggerfish

Legg til WhatsApp-kanalen i din `triggerfish.yaml`:

```yaml
channels:
  whatsapp:
    # accessToken lagret i OS-nøkkelringen
    phoneNumberId: "ditt-telefonnummer-id"
    # verifyToken lagret i OS-nøkkelringen
    ownerPhone: "15551234567"
```

| Alternativ       | Type   | Påkrevd  | Beskrivelse                                                          |
| ---------------- | ------ | -------- | -------------------------------------------------------------------- |
| `accessToken`    | string | Ja       | WhatsApp Business API tilgangstoken                                  |
| `phoneNumberId`  | string | Ja       | Telefonnummer-ID fra Meta Business Dashboard                         |
| `verifyToken`    | string | Ja       | Token for webhook-verifisering (du velger dette)                     |
| `webhookPort`    | number | Nei      | Port for å lytte på webhooks (standard: `8443`)                      |
| `ownerPhone`     | string | Anbefalt | Telefonnummeret ditt for eierverifisering (f.eks. `"15551234567"`)   |
| `classification` | string | Nei      | Klassifiseringsnivå (standard: `PUBLIC`)                             |

::: warning Lagre hemmeligheter sikkert Commit aldri tilgangstokener til kildekontroll. Bruk miljøvariabler eller OS-nøkkelringen din. :::

### Trinn 5: Start Triggerfish

```bash
triggerfish stop && triggerfish start
```

Send en melding fra telefonen til WhatsApp Business-nummeret for å bekrefte tilkoblingen.

## Eieridentitet

Triggerfish bestemmer eierstatus ved å sammenligne avsenderens telefonnummer mot den konfigurerte `ownerPhone`. Denne sjekken skjer i kode før LLM-en ser meldingen:

- **Samsvar** — Meldingen er en eierkommando
- **Ingen samsvar** — Meldingen er ekstern inndata med `PUBLIC`-taint

Hvis ingen `ownerPhone` er konfigurert, behandles alle meldinger som om de kommer fra eieren.

::: tip Angi alltid eier-telefon Hvis andre kan sende melding til WhatsApp Business-nummeret ditt, konfigurer alltid `ownerPhone` for å forhindre uautorisert kommandoutføring. :::

## Hvordan webhook fungerer

Adapteren starter en HTTP-server på den konfigurerte porten (standard `8443`) som håndterer to typer forespørsler:

1. **GET /webhook** — Meta sender dette for å verifisere webhook-endepunktet ditt. Triggerfish svarer med utfordringstokenet hvis verifiseringstokenet samsvarer.
2. **POST /webhook** — Meta sender innkommende meldinger her. Triggerfish analyserer Cloud API webhook-nyttelasten, trekker ut tekstmeldinger og videresender dem til meldingshåndtereren.

## Meldingsgrenser

WhatsApp støtter meldinger opptil 4 096 tegn. Meldinger som overskrider denne grensen deles i flere meldinger før sending.

## Skriveindikatorer

Triggerfish sender og mottar skriveindikatorer på WhatsApp. Når agenten behandler en forespørsel, viser chatten en skriveindikator. Lesebekreftelser støttes også.

## Endre klassifisering

```yaml
channels:
  whatsapp:
    # accessToken lagret i OS-nøkkelringen
    phoneNumberId: "ditt-telefonnummer-id"
    # verifyToken lagret i OS-nøkkelringen
    classification: INTERNAL
```

Gyldige nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
