# Bildanalys och vision

Triggerfish stöder bildinmatning över alla gränssnitt. Du kan klistra in bilder från ditt urklipp i CLI eller webbläsare, och agenten kan analysera bildfiler på disk. När din primärmodell inte stöder vision kan en separat visionsmodell automatiskt beskriva bilder innan de når primärmodellen.

## Bildinmatning

### CLI: Urklippsklistring (Ctrl+V)

Tryck **Ctrl+V** i CLI-chatten för att klistra in en bild från ditt systemurklipp. Bilden läses från OS-urklippet, base64-kodas och skickas till agenten som ett multimodalt innehållsblock bredvid ditt textmeddelande.

Urklippsläsning stöder:

- **Linux** — `xclip` eller `xsel`
- **macOS** — `pbpaste` / `osascript`
- **Windows** — PowerShell-urklippsåtkomst

### Tidepool: Webbläsarklistring

I Tidepool-webbgränssnittet kan du klistra in bilder direkt i chatinmatningen med webbläsarens inbyggda klistringsfunktionalitet (Ctrl+V / Cmd+V). Bilden läses som en data-URL och skickas som ett base64-kodat innehållsblock.

### `image_analyze`-verktyget

Agenten kan analysera bildfiler på disk med verktyget `image_analyze`.

| Parameter | Typ    | Obligatorisk | Beskrivning                                                                           |
| --------- | ------ | ------------ | ------------------------------------------------------------------------------------- |
| `path`    | string | Ja           | Absolut sökväg till bildfilen                                                         |
| `prompt`  | string | Nej          | Fråga eller prompt om bilden (standard: "Beskriv den här bilden i detalj")            |

**Stödda format:** PNG, JPEG, GIF, WebP, BMP, SVG

Verktyget läser filen, base64-kodar den och skickar den till en visionsduglig LLM-leverantör för analys.

## Visionsmodell-reserv

När din primärmodell inte stöder vision (t.ex. Z.AI `glm-5`) kan du konfigurera en separat visionsmodell för att automatiskt beskriva bilder innan de når primärmodellen.

### Hur det fungerar

1. Du klistrar in en bild (Ctrl+V) eller skickar multimodalt innehåll
2. Orkestratorn identifierar bildinnehållsblock i meddelandet
3. Visionsmodellen beskriver varje bild (du ser en "Analyserar bild..."-spinner)
4. Bildblock ersätts med textbeskrivningar: `[Användaren delade en bild. En visionsmodell beskrev den som: ...]`
5. Primärmodellen tar emot ett textbaserat meddelande med beskrivningarna
6. En systempromptiledtråd talar om för primärmodellen att behandla beskrivningarna som om den kan se bilderna

Det här är helt transparent — du klistrar in en bild och får ett svar, oavsett om primärmodellen stöder vision.

### Konfiguration

Lägg till ett `vision`-fält i dina modellkonfigurationer:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Icke-vision primärmodell
  vision: glm-4.5v # Visionsmodell för bildbeskrivning
  providers:
    zai:
      model: glm-5
```

`vision`-modellen återanvänder uppgifter från primärleverantörens nyckelringspost. I det här exemplet är primärleverantören `zai`, så `glm-4.5v` använder samma API-nyckel lagrad i OS-nyckelringen för `zai`-leverantören.

| Nyckel          | Typ    | Beskrivning                                                               |
| --------------- | ------ | ------------------------------------------------------------------------- |
| `models.vision` | string | Valfri visionsmodellnamn för automatisk bildbeskrivning                   |

### När visionsreserven aktiveras

- Bara när `models.vision` är konfigurerat
- Bara när meddelandet innehåller bildinnehållsblock
- Strängbaserade meddelanden och enbart textbaserade innehållsblock hoppar över reserven helt
- Om visionsleverantören misslyckas hanteras felet graciöst och agenten fortsätter

### Händelser

Orkestratorn sänder ut två händelser under visionsbearbetning:

| Händelse          | Beskrivning                                           |
| ----------------- | ----------------------------------------------------- |
| `vision_start`    | Bildbeskrivning börjar (inkluderar `imageCount`)      |
| `vision_complete` | Alla bilder beskrivna                                 |

Dessa händelser driver "Analyserar bild..."-spinnern i CLI och Tidepool-gränssnitt.

::: tip Om din primärmodell redan stöder vision (t.ex. Anthropic Claude, OpenAI GPT-4o, Google Gemini) behöver du inte konfigurera `models.vision`. Bilder skickas direkt till primärmodellen som multimodalt innehåll. :::
