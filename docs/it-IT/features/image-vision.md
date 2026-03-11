# Analisi Immagini e Visione

Triggerfish supporta l'input di immagini attraverso tutte le interfacce. Può
incollare immagini dagli appunti nella CLI o nel browser, e l'agente può
analizzare file immagine su disco. Quando il Suo modello primario non supporta
la visione, un modello vision separato può descrivere automaticamente le
immagini prima che raggiungano il modello primario.

## Input Immagini

### CLI: Incolla dagli Appunti (Ctrl+V)

Prema **Ctrl+V** nella chat CLI per incollare un'immagine dagli appunti di
sistema. L'immagine viene letta dagli appunti del sistema operativo, codificata
in base64 e inviata all'agente come blocco di contenuto multimodale insieme al
Suo messaggio di testo.

La lettura degli appunti supporta:

- **Linux** -- `xclip` o `xsel`
- **macOS** -- `pbpaste` / `osascript`
- **Windows** -- Accesso agli appunti tramite PowerShell

### Tidepool: Incolla nel Browser

Nell'interfaccia web Tidepool, incolli le immagini direttamente nell'input della
chat usando la funzionalità nativa di incolla del browser (Ctrl+V / Cmd+V).
L'immagine viene letta come data URL e inviata come blocco di contenuto
codificato in base64.

### Strumento `image_analyze`

L'agente può analizzare file immagine su disco usando lo strumento
`image_analyze`.

| Parametro | Tipo   | Obbligatorio | Descrizione                                                                              |
| --------- | ------ | ------------ | ---------------------------------------------------------------------------------------- |
| `path`    | string | sì           | Percorso assoluto del file immagine                                                      |
| `prompt`  | string | no           | Domanda o prompt sull'immagine (default: "Describe this image in detail")                |

**Formati supportati:** PNG, JPEG, GIF, WebP, BMP, SVG

Lo strumento legge il file, lo codifica in base64 e lo invia a un provider LLM
con capacità vision per l'analisi.

## Fallback del Modello Vision

Quando il Suo modello primario non supporta la visione (es. Z.AI `glm-5`), può
configurare un modello vision separato per descrivere automaticamente le
immagini prima che raggiungano il modello primario.

### Come Funziona

1. Lei incolla un'immagine (Ctrl+V) o invia contenuto multimodale
2. L'orchestrator rileva blocchi di contenuto immagine nel messaggio
3. Il modello vision descrive ogni immagine (Lei vede uno spinner "Analyzing
   image...")
4. I blocchi immagine vengono sostituiti con descrizioni testuali:
   `[The user shared an image. A vision model described it as follows: ...]`
5. Il modello primario riceve un messaggio di solo testo con le descrizioni
6. Un suggerimento nel system prompt dice al modello primario di trattare le
   descrizioni come se potesse vedere le immagini

Questo è completamente trasparente -- Lei incolla un'immagine e ottiene una
risposta, indipendentemente dal fatto che il modello primario supporti la
visione.

### Configurazione

Aggiunga un campo `vision` alla configurazione dei Suoi modelli:

```yaml
models:
  primary:
    provider: zai
    model: glm-5 # Modello primario senza visione
  vision: glm-4.5v # Modello vision per la descrizione delle immagini
  providers:
    zai:
      model: glm-5
```

Il modello `vision` riutilizza le credenziali dalla voce del portachiavi del
provider primario. In questo esempio, il provider primario è `zai`, quindi
`glm-4.5v` usa la stessa chiave API archiviata nel portachiavi del sistema
operativo per il provider `zai`.

| Chiave          | Tipo   | Descrizione                                                         |
| --------------- | ------ | ------------------------------------------------------------------- |
| `models.vision` | string | Nome del modello vision opzionale per la descrizione automatica delle immagini |

### Quando il Fallback Vision si Attiva

- Solo quando `models.vision` è configurato
- Solo quando il messaggio contiene blocchi di contenuto immagine
- I messaggi di solo testo e i blocchi di contenuto testuale saltano il fallback
  interamente
- Se il provider vision fallisce, l'errore viene gestito con grazia e l'agente
  continua

### Eventi

L'orchestrator emette due eventi durante l'elaborazione vision:

| Evento            | Descrizione                                            |
| ----------------- | ------------------------------------------------------ |
| `vision_start`    | Inizia la descrizione dell'immagine (include `imageCount`) |
| `vision_complete` | Tutte le immagini descritte                            |

Questi eventi guidano lo spinner "Analyzing image..." nelle interfacce CLI e
Tidepool.

::: tip Se il Suo modello primario supporta già la visione (es. Anthropic
Claude, OpenAI GPT-4o, Google Gemini), non ha bisogno di configurare
`models.vision`. Le immagini verranno inviate direttamente al modello primario
come contenuto multimodale. :::
