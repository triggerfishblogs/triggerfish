# Beeldanalyse en visie

Triggerfish ondersteunt beeldinvoer via alle interfaces. U kunt afbeeldingen van uw klembord plakken in de CLI of browser, en de agent kan afbeeldingsbestanden op schijf analyseren. Wanneer uw primaire model geen visie ondersteunt, kan een apart visiemodel afbeeldingen automatisch beschrijven voordat ze het primaire model bereiken.

## Beeldinvoer

### CLI: Klembord plakken (Ctrl+V)

Druk op **Ctrl+V** in de CLI-chat om een afbeelding van uw systeemklembord te plakken. De afbeelding wordt gelezen van het OS-klembord, base64-gecodeerd en als een multimodale inhoudsblok samen met uw tekstbericht naar de agent gestuurd.

Klembordlezen ondersteunt:

- **Linux** — `xclip` of `xsel`
- **macOS** — `pbpaste` / `osascript`
- **Windows** — PowerShell-klemborddtoegang

### Tidepool: Browser plakken

Plak in de Tidepool-webinterface afbeeldingen direct in de chatinvoer met behulp van de native plakfunctionaliteit van uw browser (Ctrl+V / Cmd+V). De afbeelding wordt gelezen als een data-URL en verzonden als een base64-gecodeerd inhoudsblok.

### `image_analyze`-tool

De agent kan afbeeldingsbestanden op schijf analyseren met behulp van de `image_analyze`-tool.

| Parameter | Type   | Vereist | Beschrijving                                                                          |
| --------- | ------ | ------- | ------------------------------------------------------------------------------------- |
| `path`    | string | ja      | Absoluut pad naar het afbeeldingsbestand                                              |
| `prompt`  | string | nee     | Vraag of prompt over de afbeelding (standaard: "Beschrijf deze afbeelding in detail") |

**Ondersteunde formaten:** PNG, JPEG, GIF, WebP, BMP, SVG

De tool leest het bestand, codeert het in base64 en stuurt het naar een visie-capable LLM-provider voor analyse.

## Visiemodel-terugval

Wanneer uw primaire model geen visie ondersteunt (bijv. Z.AI `glm-5`), kunt u een apart visiemodel configureren om afbeeldingen automatisch te beschrijven voordat ze het primaire model bereiken.

### Hoe het werkt

1. U plakt een afbeelding (Ctrl+V) of stuurt multimodale inhoud
2. De orchestrator detecteert afbeeldingsinhoudsblokken in het bericht
3. Het visiemodel beschrijft elke afbeelding (u ziet een "Afbeelding analyseren..."-spinner)
4. Afbeeldingsblokken worden vervangen door tekstbeschrijvingen:
   `[De gebruiker deelde een afbeelding. Een visiemodel beschreef het als volgt: ...]`
5. Het primaire model ontvangt een tekst-only bericht met de beschrijvingen
6. Een systeempromptaanwijzing vertelt het primaire model de beschrijvingen te behandelen alsof het de afbeeldingen kan zien

Dit is volledig transparant — u plakt een afbeelding en krijgt een antwoord, ongeacht of het primaire model visie ondersteunt.

### Configuratie

Voeg een `vision`-veld toe aan uw modelconfiguratie:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Niet-visie primair model
  vision: glm-4.5v # Visiemodel voor afbeeldingsbeschrijving
  providers:
    zai:
      model: glm-5
```

Het `vision`-model hergebruikt inloggegevens van de sleutelhangervermeldingen van de primaire provider. In dit voorbeeld is de primaire provider `zai`, dus `glm-4.5v` gebruikt dezelfde API-sleutel opgeslagen in de OS-sleutelhanger voor de `zai`-provider.

| Sleutel         | Type   | Beschrijving                                                       |
| --------------- | ------ | ------------------------------------------------------------------ |
| `models.vision` | string | Optioneel visiemodel voor automatische afbeeldingsbeschrijving     |

### Wanneer visie-terugval activeert

- Alleen wanneer `models.vision` is geconfigureerd
- Alleen wanneer het bericht afbeeldingsinhoudsblokken bevat
- Tekst-only berichten en tekst-only inhoudsblokken slaan de terugval volledig over
- Als de visieprovider mislukt, wordt de fout gracieus afgehandeld en gaat de agent door

### Evenementen

De orchestrator geeft twee evenementen uit tijdens visieверwerking:

| Evenement         | Beschrijving                                          |
| ----------------- | ----------------------------------------------------- |
| `vision_start`    | Afbeeldingsbeschrijving begint (bevat `imageCount`)   |
| `vision_complete` | Alle afbeeldingen beschreven                          |

Deze evenementen besturen de "Afbeelding analyseren..."-spinner in de CLI- en Tidepool-interfaces.

::: tip Als uw primaire model al visie ondersteunt (bijv. Anthropic Claude, OpenAI GPT-4o, Google Gemini), hoeft u `models.vision` niet te configureren. Afbeeldingen worden direct als multimodale inhoud naar het primaire model gestuurd. :::
