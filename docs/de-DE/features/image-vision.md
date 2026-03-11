# Bildanalyse und Vision

Triggerfish unterstuetzt Bildeingabe ueber alle Interfaces hinweg. Sie koennen Bilder aus Ihrer Zwischenablage im CLI oder Browser einfuegen, und der Agent kann Bilddateien auf der Festplatte analysieren. Wenn Ihr primaeres Modell Vision nicht unterstuetzt, kann ein separates Vision-Modell Bilder automatisch beschreiben, bevor sie das primaere Modell erreichen.

## Bildeingabe

### CLI: Zwischenablage einfuegen (Strg+V)

Druecken Sie **Strg+V** im CLI-Chat, um ein Bild aus Ihrer System-Zwischenablage einzufuegen. Das Bild wird aus der Betriebssystem-Zwischenablage gelesen, base64-kodiert und zusammen mit Ihrer Textnachricht als multimodaler Inhaltsblock an den Agenten gesendet.

Zwischenablage-Lesen unterstuetzt:

- **Linux** -- `xclip` oder `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- PowerShell-Zwischenablagezugriff

### Tidepool: Browser-Einfuegen

Im Tidepool-Web-Interface fuegen Sie Bilder direkt in die Chat-Eingabe ein, ueber die native Einfuegefunktion Ihres Browsers (Strg+V / Cmd+V). Das Bild wird als Data-URL gelesen und als base64-kodierter Inhaltsblock gesendet.

### `image_analyze`-Tool

Der Agent kann Bilddateien auf der Festplatte mit dem `image_analyze`-Tool analysieren.

| Parameter | Typ    | Erforderlich | Beschreibung                                                                                      |
| --------- | ------ | ------------ | ------------------------------------------------------------------------------------------------- |
| `path`    | string | ja           | Absoluter Pfad zur Bilddatei                                                                      |
| `prompt`  | string | nein         | Frage oder Prompt zum Bild (Standard: "Describe this image in detail")                            |

**Unterstuetzte Formate:** PNG, JPEG, GIF, WebP, BMP, SVG

Das Tool liest die Datei, base64-kodiert sie und sendet sie an einen vision-faehigen LLM-Anbieter zur Analyse.

## Vision-Modell-Fallback

Wenn Ihr primaeres Modell Vision nicht unterstuetzt (z.B. Z.AI `glm-5`), koennen Sie ein separates Vision-Modell konfigurieren, um Bilder automatisch zu beschreiben, bevor sie das primaere Modell erreichen.

### So funktioniert es

1. Sie fuegen ein Bild ein (Strg+V) oder senden multimodalen Inhalt
2. Der Orchestrator erkennt Bild-Inhaltsboecke in der Nachricht
3. Das Vision-Modell beschreibt jedes Bild (Sie sehen einen "Bild wird analysiert..."-Spinner)
4. Bild-Bloecke werden durch Textbeschreibungen ersetzt:
   `[The user shared an image. A vision model described it as follows: ...]`
5. Das primaere Modell erhaelt eine reine Textnachricht mit den Beschreibungen
6. Ein System-Prompt-Hinweis sagt dem primaeren Modell, die Beschreibungen so zu behandeln, als ob es die Bilder sehen koennte

Dies ist vollstaendig transparent -- Sie fuegen ein Bild ein und erhalten eine Antwort, unabhaengig davon, ob das primaere Modell Vision unterstuetzt.

### Konfiguration

Fuegen Sie ein `vision`-Feld zu Ihrer Models-Konfiguration hinzu:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Nicht-Vision primaeres Modell
  vision: glm-4.5v # Vision-Modell fuer Bildbeschreibung
  providers:
    zai:
      model: glm-5
```

Das `vision`-Modell verwendet die Anmeldedaten des primaeren Anbieters aus dem Schluesselbund-Eintrag wieder. In diesem Beispiel ist der primaere Anbieter `zai`, also verwendet `glm-4.5v` denselben API-Schluessel, der im Betriebssystem-Schluesselbund fuer den `zai`-Anbieter gespeichert ist.

| Schluessel      | Typ    | Beschreibung                                                          |
| --------------- | ------ | --------------------------------------------------------------------- |
| `models.vision` | string | Optionaler Vision-Modellname fuer automatische Bildbeschreibung       |

### Wann der Vision-Fallback aktiviert wird

- Nur wenn `models.vision` konfiguriert ist
- Nur wenn die Nachricht Bild-Inhaltsboecke enthaelt
- Reine String-Nachrichten und reine Text-Inhaltsboecke ueberspringen den Fallback vollstaendig
- Wenn der Vision-Anbieter fehlschlaegt, wird der Fehler elegant behandelt und der Agent faehrt fort

### Ereignisse

Der Orchestrator emittiert zwei Ereignisse waehrend der Vision-Verarbeitung:

| Ereignis          | Beschreibung                                          |
| ----------------- | ----------------------------------------------------- |
| `vision_start`    | Bildbeschreibung beginnt (enthaelt `imageCount`)      |
| `vision_complete` | Alle Bilder beschrieben                               |

Diese Ereignisse steuern den "Bild wird analysiert..."-Spinner im CLI und in den Tidepool-Interfaces.

::: tip Wenn Ihr primaeres Modell bereits Vision unterstuetzt (z.B. Anthropic Claude, OpenAI GPT-4o, Google Gemini), muessen Sie `models.vision` nicht konfigurieren. Bilder werden direkt als multimodaler Inhalt an das primaere Modell gesendet. :::
