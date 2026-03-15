# WhatsApp

Anslut din Triggerfish-agent till WhatsApp så att du kan interagera med den från din telefon. Adaptern använder **WhatsApp Business Cloud API** (det officiella Meta-värdade HTTP-API:t), tar emot meddelanden via webhook och skickar via REST.

## Standardklassificering

WhatsApp standard till `PUBLIC`-klassificering. WhatsApp-kontakter kan inkludera vem som helst med ditt telefonnummer, så `PUBLIC` är säkerhetsstandarden.

## Installation

### Steg 1: Skapa ett Meta Business-konto

1. Gå till [Meta for Developers](https://developers.facebook.com/)-portalen
2. Skapa ett utvecklarkonto om du inte redan har ett
3. Skapa en ny app och välj **Business** som apptyp
4. I din app-instrumentpanel, lägg till **WhatsApp**-produkten

### Steg 2: Hämta dina uppgifter

Från WhatsApp-sektionen i din app-instrumentpanel, samla in dessa värden:

- **Access Token** — En permanent åtkomsttoken (eller generera en temporär för testning)
- **Phone Number ID** — ID:t för telefonnumret registrerat med WhatsApp Business
- **Verify Token** — En sträng du väljer, används för att verifiera webhook-registrering

### Steg 3: Konfigurera webhooks

1. I WhatsApp-produktinställningarna, navigera till **Webhooks**
2. Ange callback-URL:en till din servers offentliga adress (t.ex. `https://din-server.com:8443/webhook`)
3. Ange **Verify Token** till samma värde du kommer att använda i din Triggerfish-konfiguration
4. Prenumerera på `messages`-webhook-fältet

::: info Offentlig URL krävs WhatsApp-webhooks kräver en offentligt tillgänglig HTTPS-endpoint. Om du kör Triggerfish lokalt behöver du en tunneltjänst (t.ex. ngrok, Cloudflare Tunnel) eller en server med en offentlig IP. :::

### Steg 4: Konfigurera Triggerfish

Lägg till WhatsApp-kanalen i din `triggerfish.yaml`:

```yaml
channels:
  whatsapp:
    # accessToken lagras i OS-nyckelringen
    phoneNumberId: "ditt-telefonnummer-id"
    # verifyToken lagras i OS-nyckelringen
    ownerPhone: "15551234567"
```

| Alternativ       | Typ    | Obligatorisk  | Beskrivning                                                          |
| ---------------- | ------ | ------------- | -------------------------------------------------------------------- |
| `accessToken`    | string | Ja            | WhatsApp Business API-åtkomsttoken                                   |
| `phoneNumberId`  | string | Ja            | Telefonnummer-ID från Meta Business Dashboard                        |
| `verifyToken`    | string | Ja            | Token för webhook-verifiering (du väljer detta)                      |
| `webhookPort`    | number | Nej           | Port för webhook-lyssnande (standard: `8443`)                        |
| `ownerPhone`     | string | Rekommenderad | Ditt telefonnummer för ägarverifiering (t.ex. `"15551234567"`)       |
| `classification` | string | Nej           | Klassificeringsnivå (standard: `PUBLIC`)                             |

::: warning Lagra hemligheter säkert Committa aldrig åtkomsttoken till versionskontroll. Använd miljövariabler eller din OS-nyckelring. :::

### Steg 5: Starta Triggerfish

```bash
triggerfish stop && triggerfish start
```

Skicka ett meddelande från din telefon till WhatsApp Business-numret för att bekräfta anslutningen.

## Ägaridentitet

Triggerfish bestämmer ägarstatus genom att jämföra avsändarens telefonnummer mot det konfigurerade `ownerPhone`. Den här kontrollen sker i kod innan LLM:en ser meddelandet:

- **Matchning** — Meddelandet är ett ägarkommando
- **Ingen matchning** — Meddelandet är extern indata med `PUBLIC` taint

Om inget `ownerPhone` konfigureras behandlas alla meddelanden som kommande från ägaren.

::: tip Ange alltid ägartelefon Om andra kan meddela ditt WhatsApp Business-nummer, konfigurera alltid `ownerPhone` för att förhindra obehörig kommandoutförande. :::

## Hur webhooken fungerar

Adaptern startar en HTTP-server på den konfigurerade porten (standard `8443`) som hanterar två typer av förfrågningar:

1. **GET /webhook** — Meta skickar detta för att verifiera din webhook-endpoint. Triggerfish svarar med utmaningstoken om verifieringstoken matchar.
2. **POST /webhook** — Meta skickar inkommande meddelanden hit. Triggerfish tolkar Cloud API webhook-nyttolasten, extraherar textmeddelanden och vidarebefordrar dem till meddelandehanteraren.

## Meddelandegränser

WhatsApp stöder meddelanden upp till 4 096 tecken. Meddelanden som överstiger den här gränsen delas upp i flera meddelanden innan de skickas.

## Skrivindiktatorer

Triggerfish skickar och tar emot skrivindiktatorer på WhatsApp. När din agent bearbetar en förfrågan visar chatten en skrivindikator. Läskvittenser stöds också.

## Ändra klassificering

```yaml
channels:
  whatsapp:
    # accessToken lagras i OS-nyckelringen
    phoneNumberId: "ditt-telefonnummer-id"
    # verifyToken lagras i OS-nyckelringen
    classification: INTERNAL
```

Giltiga nivåer: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
