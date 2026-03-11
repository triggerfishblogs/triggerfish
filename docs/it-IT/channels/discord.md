# Discord

Connetta il Suo agente Triggerfish a Discord affinché possa rispondere nei canali
del server e nei messaggi diretti. L'adattatore utilizza
[discord.js](https://discord.js.org/) per connettersi al Gateway Discord.

## Classificazione Predefinita

Discord è predefinito a classificazione `PUBLIC`. I server Discord spesso
includono un mix di membri fidati e visitatori pubblici, quindi `PUBLIC` è il
valore predefinito sicuro. Può alzarlo se il Suo server è privato e fidato.

## Configurazione

### Passaggio 1: Crei un'Applicazione Discord

1. Vada al
   [Portale Sviluppatori Discord](https://discord.com/developers/applications)
2. Clicchi **New Application**
3. Nomini la Sua applicazione (es. "Triggerfish")
4. Clicchi **Create**

### Passaggio 2: Crei un Utente Bot

1. Nella Sua applicazione, navighi su **Bot** nella barra laterale
2. Clicchi **Add Bot** (se non già creato)
3. Sotto lo username del bot, clicchi **Reset Token** per generare un nuovo token
4. Copi il **token bot**

::: warning Mantenga il Suo Token Segreto Il token bot concede il pieno
controllo del Suo bot. Non lo commetta mai nel controllo versione e non lo
condivida pubblicamente. :::

### Passaggio 3: Configuri i Privileged Intent

Sempre nella pagina **Bot**, abiliti questi privileged gateway intent:

- **Message Content Intent** -- Necessario per leggere il contenuto dei messaggi
- **Server Members Intent** -- Opzionale, per la ricerca dei membri

### Passaggio 4: Ottenga il Suo ID Utente Discord

1. Apra Discord
2. Vada su **Impostazioni** > **Avanzate** e abiliti la **Modalità Sviluppatore**
3. Clicchi sul Suo username ovunque in Discord
4. Clicchi **Copia ID Utente**

Questo è l'ID snowflake che Triggerfish usa per verificare l'identità del
proprietario.

### Passaggio 5: Generi un Link di Invito

1. Nel Portale Sviluppatori, navighi su **OAuth2** > **URL Generator**
2. Sotto **Scopes**, selezioni `bot`
3. Sotto **Bot Permissions**, selezioni:
   - Send Messages
   - Read Message History
   - View Channels
4. Copi l'URL generato e lo apra nel browser
5. Selezioni il server a cui aggiungere il bot e clicchi **Authorize**

### Passaggio 6: Configuri Triggerfish

Aggiunga il canale Discord al Suo `triggerfish.yaml`:

```yaml
channels:
  discord:
    # botToken archiviato nel portachiavi del SO
    ownerId: "123456789012345678"
```

| Opzione          | Tipo   | Obbligatorio | Descrizione                                                      |
| ---------------- | ------ | ------------ | ---------------------------------------------------------------- |
| `botToken`       | string | Sì           | Token bot Discord                                                |
| `ownerId`        | string | Consigliato  | Il Suo ID utente Discord (snowflake) per la verifica proprietario |
| `classification` | string | No           | Livello di classificazione (default: `PUBLIC`)                   |

### Passaggio 7: Avvii Triggerfish

```bash
triggerfish stop && triggerfish start
```

Invii un messaggio in un canale dove il bot è presente, o gli scriva direttamente,
per confermare la connessione.

## Identità del Proprietario

Triggerfish determina lo stato di proprietario confrontando l'ID utente Discord
del mittente con il `ownerId` configurato. Questo controllo avviene nel codice
prima che l'LLM veda il messaggio:

- **Corrispondenza** -- Il messaggio è un comando del proprietario
- **Nessuna corrispondenza** -- Il messaggio è input esterno con taint `PUBLIC`

Se nessun `ownerId` è configurato, tutti i messaggi sono trattati come
provenienti dal proprietario.

::: danger Imposti Sempre l'Owner ID Se il Suo bot è in un server con altri
membri, configuri sempre `ownerId`. Senza di esso, qualsiasi membro del server
può impartire comandi al Suo agente. :::

## Suddivisione Messaggi

Discord ha un limite di 2.000 caratteri per messaggio. Quando l'agente genera
una risposta più lunga, Triggerfish la divide automaticamente in più messaggi.
Il suddivisore divide su newline o spazi per preservare la leggibilità.

## Comportamento del Bot

L'adattatore Discord:

- **Ignora i propri messaggi** -- Il bot non risponde ai messaggi che invia
- **Ascolta in tutti i canali accessibili** -- Canali del server, DM di gruppo e
  messaggi diretti
- **Richiede Message Content Intent** -- Senza questo, il bot riceve eventi
  messaggio vuoti

## Indicatori di Digitazione

Triggerfish invia indicatori di digitazione a Discord quando l'agente sta
elaborando una richiesta. Discord non espone gli eventi di digitazione dagli
utenti ai bot in modo affidabile, quindi è solo in invio.

## Chat di Gruppo

Il bot può partecipare ai canali del server. Configuri il comportamento di
gruppo:

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: discord
      behavior: "always"
```

| Comportamento    | Descrizione                                    |
| ---------------- | ---------------------------------------------- |
| `mentioned-only` | Risponde solo quando il bot è @menzionato      |
| `always`         | Risponde a tutti i messaggi nel canale         |

## Cambiare la Classificazione

```yaml
channels:
  discord:
    # botToken archiviato nel portachiavi del SO
    ownerId: "123456789012345678"
    classification: INTERNAL
```

Livelli validi: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
