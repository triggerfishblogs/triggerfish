# Slack

Connetta il Suo agente Triggerfish a Slack affinché possa partecipare alle
conversazioni del workspace. L'adattatore utilizza il framework
[Bolt](https://slack.dev/bolt-js/) con Socket Mode, il che significa che non è
richiesto un URL pubblico o un endpoint webhook.

## Classificazione Predefinita

Slack è predefinito a classificazione `PUBLIC`. Questo riflette la realtà che i
workspace Slack spesso includono ospiti esterni, utenti Slack Connect e canali
condivisi. Può alzarlo a `INTERNAL` o superiore se il Suo workspace è
strettamente interno.

## Configurazione

### Passaggio 1: Crei un'App Slack

1. Vada su [api.slack.com/apps](https://api.slack.com/apps)
2. Clicchi **Create New App**
3. Scelga **From scratch**
4. Nomini la Sua app (es. "Triggerfish") e selezioni il Suo workspace
5. Clicchi **Create App**

### Passaggio 2: Configuri gli Scope del Token Bot

Navighi su **OAuth & Permissions** nella barra laterale e aggiunga i seguenti
**Bot Token Scopes**:

| Scope              | Scopo                                   |
| ------------------ | --------------------------------------- |
| `chat:write`       | Inviare messaggi                        |
| `channels:history` | Leggere messaggi nei canali pubblici    |
| `groups:history`   | Leggere messaggi nei canali privati     |
| `im:history`       | Leggere messaggi diretti                |
| `mpim:history`     | Leggere messaggi diretti di gruppo      |
| `channels:read`    | Elencare i canali pubblici              |
| `groups:read`      | Elencare i canali privati               |
| `im:read`          | Elencare le conversazioni dirette       |
| `users:read`       | Cercare informazioni sugli utenti       |

### Passaggio 3: Abiliti Socket Mode

1. Navighi su **Socket Mode** nella barra laterale
2. Attivi **Enable Socket Mode**
3. Le verrà chiesto di creare un **App-Level Token** -- lo nomini (es.
   "triggerfish-socket") e aggiunga lo scope `connections:write`
4. Copi il **Token App** generato (inizia con `xapp-`)

### Passaggio 4: Abiliti gli Eventi

1. Navighi su **Event Subscriptions** nella barra laterale
2. Attivi **Enable Events**
3. Sotto **Subscribe to bot events**, aggiunga:
   - `message.channels`
   - `message.groups`
   - `message.im`
   - `message.mpim`

### Passaggio 5: Ottenga le Sue Credenziali

Servono tre valori:

- **Token Bot** -- Vada su **OAuth & Permissions**, clicchi **Install to
  Workspace**, poi copi il **Bot User OAuth Token** (inizia con `xoxb-`)
- **Token App** -- Il token creato nel Passaggio 3 (inizia con `xapp-`)
- **Signing Secret** -- Vada su **Basic Information**, scorra fino a **App
  Credentials** e copi il **Signing Secret**

### Passaggio 6: Ottenga il Suo ID Utente Slack

Per configurare l'identità del proprietario:

1. Apra Slack
2. Clicchi sulla Sua immagine profilo in alto a destra
3. Clicchi **Profile**
4. Clicchi il menu a tre punti e selezioni **Copy member ID**

### Passaggio 7: Configuri Triggerfish

Aggiunga il canale Slack al Suo `triggerfish.yaml`:

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret archiviati nel portachiavi del SO
    ownerId: "U01234ABC"
```

I secret (token bot, token app, signing secret) vengono inseriti durante
`triggerfish config add-channel slack` e archiviati nel portachiavi del SO.

| Opzione          | Tipo   | Obbligatorio | Descrizione                                          |
| ---------------- | ------ | ------------ | ---------------------------------------------------- |
| `ownerId`        | string | Consigliato  | Il Suo member ID Slack per la verifica proprietario  |
| `classification` | string | No           | Livello di classificazione (default: `PUBLIC`)       |

::: warning Archivi i Secret in Modo Sicuro Non commetta mai token o secret nel
controllo versione. Utilizzi variabili d'ambiente o il portachiavi del SO. Veda
[Gestione dei Secret](/it-IT/security/secrets) per i dettagli. :::

### Passaggio 8: Inviti il Bot

Prima che il bot possa leggere o inviare messaggi in un canale, deve invitarlo:

1. Apra il canale Slack dove desidera il bot
2. Digiti `/invite @Triggerfish` (o il nome che ha dato alla Sua app)

Il bot può anche ricevere messaggi diretti senza essere invitato in un canale.

### Passaggio 9: Avvii Triggerfish

```bash
triggerfish stop && triggerfish start
```

Invii un messaggio in un canale dove il bot è presente, o gli scriva direttamente,
per confermare la connessione.

## Identità del Proprietario

Triggerfish utilizza il flusso OAuth di Slack per la verifica del proprietario.
Quando arriva un messaggio, l'adattatore confronta l'ID utente Slack del
mittente con il `ownerId` configurato:

- **Corrispondenza** -- Comando del proprietario
- **Nessuna corrispondenza** -- Input esterno con taint `PUBLIC`

### Appartenenza al Workspace

Per la classificazione dei destinatari, l'appartenenza al workspace Slack
determina se un utente è `INTERNAL` o `EXTERNAL`:

- I membri regolari del workspace sono `INTERNAL`
- Gli utenti esterni Slack Connect sono `EXTERNAL`
- Gli utenti ospiti sono `EXTERNAL`

## Limiti dei Messaggi

Slack supporta messaggi fino a 40.000 caratteri. I messaggi che superano questo
limite vengono troncati. Per la maggior parte delle risposte dell'agente, questo
limite non viene mai raggiunto.

## Indicatori di Digitazione

Triggerfish invia indicatori di digitazione a Slack quando l'agente sta
elaborando una richiesta. Slack non espone gli eventi di digitazione in entrata
ai bot, quindi è solo in invio.

## Chat di Gruppo

Il bot può partecipare ai canali di gruppo. Configuri il comportamento di gruppo
nel Suo `triggerfish.yaml`:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

| Comportamento    | Descrizione                                    |
| ---------------- | ---------------------------------------------- |
| `mentioned-only` | Risponde solo quando il bot è @menzionato      |
| `always`         | Risponde a tutti i messaggi nel canale         |

## Cambiare la Classificazione

```yaml
channels:
  slack:
    classification: INTERNAL
```

Livelli validi: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
