# Bildeanalyse og vision

Triggerfish støtter bildeinput på tvers av alle grensesnitt. Du kan lime inn
bilder fra utklippstavlen i CLI eller nettleser, og agenten kan analysere
bildefiler på disk. Når primærmodellen din ikke støtter vision, kan en separat
visjonsmodell automatisk beskrive bilder før de når primærmodellen.

## Bildeinput

### CLI: Utklippstavleliming (Ctrl+V)

Trykk **Ctrl+V** i CLI-chatten for å lime inn et bilde fra systemets
utklippstavle. Bildet leses fra OS-utklippstavlen, base64-kodes og sendes til
agenten som en multimodal innholdsblokk ved siden av tekstmeldingen din.

Utklippstavleavlesning støtter:

- **Linux** — `xclip` eller `xsel`
- **macOS** — `pbpaste` / `osascript`
- **Windows** — PowerShell-utklippstavletilgang

### Tidepool: Nettleserliming

I Tidepool-nettgrensesnittet kan du lime inn bilder direkte i chatinndatafeltet
ved hjelp av nettleserens innebygde lim-funksjonalitet (Ctrl+V / Cmd+V). Bildet
leses som en data-URL og sendes som en base64-kodet innholdsblokk.

### `image_analyze`-verktøy

Agenten kan analysere bildefiler på disk ved hjelp av `image_analyze`-verktøyet.

| Parameter | Type   | Påkrevd | Beskrivelse                                                                        |
| --------- | ------ | ------- | ---------------------------------------------------------------------------------- |
| `path`    | string | Ja      | Absolutt sti til bildefilen                                                        |
| `prompt`  | string | Nei     | Spørsmål eller prompt om bildet (standard: "Describe this image in detail")        |

**Støttede formater:** PNG, JPEG, GIF, WebP, BMP, SVG

Verktøyet leser filen, base64-koder den og sender den til en visjonskapabel
LLM-leverandør for analyse.

## Visjonsmodell-fallback

Når primærmodellen din ikke støtter vision (f.eks. Z.AI `glm-5`), kan du
konfigurere en separat visjonsmodell som automatisk beskriver bilder før de
når primærmodellen.

### Slik fungerer det

1. Du limer inn et bilde (Ctrl+V) eller sender multimodalt innhold
2. Orchestratoren oppdager bildinnholdsblokker i meldingen
3. Visjonsmodellen beskriver hvert bilde (du ser en «Analyserer bilde...»-spinner)
4. Bildeblokker erstattes med tekstbeskrivelser:
   `[The user shared an image. A vision model described it as follows: ...]`
5. Primærmodellen mottar en tekstbasert melding med beskrivelsene
6. Et system-prompt-hint forteller primærmodellen å behandle beskrivelsene som
   om den kan se bildene

Dette er helt gjennomsiktig — du limer inn et bilde og får et svar, uavhengig
av om primærmodellen støtter vision.

### Konfigurasjon

Legg til et `vision`-felt i modellkonfigurasjonen din:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Primærmodell uten vision
  vision: glm-4.5v # Visjonsmodell for bildebeskrivelse
  providers:
    zai:
      model: glm-5
```

`vision`-modellen gjenbruker legitimasjon fra primærleverandørens nøkkelringoppføring.
I dette eksemplet er primærleverandøren `zai`, så `glm-4.5v` bruker den samme
API-nøkkelen lagret i OS-nøkkelringen for `zai`-leverandøren.

| Nøkkel          | Type   | Beskrivelse                                                          |
| --------------- | ------ | -------------------------------------------------------------------- |
| `models.vision` | string | Valgfri visjonsmodell for automatisk bildebeskrivelse                |

### Når visjons-fallback aktiveres

- Bare når `models.vision` er konfigurert
- Bare når meldingen inneholder bildinnholdsblokker
- Kun-streng-meldinger og tekstbaserte innholdsblokker hopper over fallback helt
- Hvis visjonsleveandøren feiler, håndteres feilen på en elegant måte og agenten
  fortsetter

### Hendelser

Orchestratoren sender ut to hendelser under visjonsbehandling:

| Hendelse          | Beskrivelse                                        |
| ----------------- | -------------------------------------------------- |
| `vision_start`    | Bildebeskrivelse starter (inkluderer `imageCount`) |
| `vision_complete` | Alle bilder beskrevet                              |

Disse hendelsene driver «Analyserer bilde...»-spinneren i CLI- og
Tidepool-grensesnittene.

::: tip Hvis primærmodellen allerede støtter vision (f.eks. Anthropic Claude,
OpenAI GPT-4o, Google Gemini), trenger du ikke konfigurere `models.vision`.
Bilder sendes direkte til primærmodellen som multimodalt innhold. :::
