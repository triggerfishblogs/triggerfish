# Google Workspace

Connettere il proprio account Google per dare all'agent accesso a Gmail,
Calendar, Tasks, Drive e Sheets.

## Prerequisiti

- Un account Google
- Un progetto Google Cloud con credenziali OAuth

## Configurazione

### Passo 1: Creare un Progetto Google Cloud

1. Andare alla [Google Cloud Console](https://console.cloud.google.com/)
2. Cliccare sul menu a tendina del progetto in alto e selezionare **New Project**
3. Denominarlo "Triggerfish" (o qualsiasi nome si preferisca) e cliccare **Create**

### Passo 2: Abilitare le API

Abilitare ciascuna di queste API nel progetto:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

Cliccare **Enable** su ogni pagina. Questo deve essere fatto una sola volta per
progetto.

### Passo 3: Configurare la Schermata di Consenso OAuth

Prima di poter creare le credenziali, Google richiede una schermata di consenso
OAuth. Questa è la schermata che gli utenti vedono quando concedono l'accesso.

1. Andare alla
   [Schermata di consenso OAuth](https://console.cloud.google.com/apis/credentials/consent)
2. Tipo utente: selezionare **External** (o **Internal** se si è in
   un'organizzazione Google Workspace e si vogliono solo utenti dell'organizzazione)
3. Cliccare **Create**
4. Compilare i campi obbligatori:
   - **App name**: "Triggerfish" (o qualsiasi nome si preferisca)
   - **User support email**: il proprio indirizzo email
   - **Developer contact email**: il proprio indirizzo email
5. Cliccare **Save and Continue**
6. Nella schermata **Scopes**, cliccare **Add or Remove Scopes** e aggiungere:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. Cliccare **Update**, poi **Save and Continue**
8. Andare alla pagina **Audience** (nella barra laterale sinistra sotto "OAuth
   consent screen") -- qui si troverà la sezione **Test users**
9. Cliccare **+ Add Users** e aggiungere il proprio indirizzo email Google
10. Cliccare **Save and Continue**, poi **Back to Dashboard**

::: warning Mentre l'app è in stato "Testing", solo gli utenti di test aggiunti
possono autorizzare. Questo va bene per uso personale. Pubblicare l'app rimuove
la restrizione sugli utenti di test ma richiede la verifica di Google. :::

### Passo 4: Creare le Credenziali OAuth

1. Andare a [Credentials](https://console.cloud.google.com/apis/credentials)
2. Cliccare **+ CREATE CREDENTIALS** in alto
3. Selezionare **OAuth client ID**
4. Tipo di applicazione: **Desktop app**
5. Nome: "Triggerfish" (o qualsiasi nome si preferisca)
6. Cliccare **Create**
7. Copiare il **Client ID** e il **Client Secret**

### Passo 5: Connettere

```bash
triggerfish connect google
```

Verranno richiesti:

1. Il proprio **Client ID**
2. Il proprio **Client Secret**

Si aprirà una finestra del browser per concedere l'accesso. Dopo l'autorizzazione,
i token vengono archiviati in modo sicuro nel portachiavi del SO (macOS Keychain
o Linux libsecret). Nessuna credenziale viene archiviata in file di
configurazione o variabili d'ambiente.

### Disconnettere

```bash
triggerfish disconnect google
```

Rimuove tutti i token Google dal portachiavi. È possibile riconnettersi in
qualsiasi momento eseguendo di nuovo `connect`.

## Tool Disponibili

Una volta connesso, l'agent ha accesso a 14 tool:

| Tool              | Descrizione                                                  |
| ----------------- | ------------------------------------------------------------ |
| `gmail_search`    | Cercare email per query (supporta la sintassi di ricerca Gmail) |
| `gmail_read`      | Leggere un'email specifica per ID                            |
| `gmail_send`      | Comporre e inviare un'email                                  |
| `gmail_label`     | Aggiungere o rimuovere etichette da un messaggio             |
| `calendar_list`   | Elencare i prossimi eventi del calendario                    |
| `calendar_create` | Creare un nuovo evento del calendario                        |
| `calendar_update` | Aggiornare un evento esistente                               |
| `tasks_list`      | Elencare le attività da Google Tasks                         |
| `tasks_create`    | Creare una nuova attività                                    |
| `tasks_complete`  | Contrassegnare un'attività come completata                   |
| `drive_search`    | Cercare file in Google Drive                                 |
| `drive_read`      | Leggere il contenuto dei file (esporta Google Docs come testo) |
| `sheets_read`     | Leggere un intervallo da un foglio di calcolo                |
| `sheets_write`    | Scrivere valori in un intervallo del foglio di calcolo       |

## Esempi di Interazione

Chiedere all'agent cose come:

- "Cosa c'è nel mio calendario oggi?"
- "Cerca nelle mie email i messaggi da alice@example.com"
- "Invia un'email a bob@example.com con oggetto 'Note della riunione'"
- "Trova il foglio di calcolo del budget Q4 in Drive"
- "Aggiungi 'Comprare la spesa' alla mia lista di attività"
- "Leggi le celle A1:D10 dal foglio di calcolo Vendite"

## Ambiti OAuth

Triggerfish richiede questi ambiti durante l'autorizzazione:

| Ambito           | Livello di Accesso                              |
| ---------------- | ----------------------------------------------- |
| `gmail.modify`   | Leggere, inviare e gestire email ed etichette   |
| `calendar`       | Accesso completo in lettura/scrittura a Google Calendar |
| `tasks`          | Accesso completo in lettura/scrittura a Google Tasks    |
| `drive.readonly` | Accesso in sola lettura ai file di Google Drive |
| `spreadsheets`   | Accesso in lettura e scrittura a Google Sheets  |

::: tip L'accesso a Drive è in sola lettura. Triggerfish può cercare e leggere i
file ma non può crearli, modificarli o eliminarli. Sheets ha un accesso in
scrittura separato per gli aggiornamenti delle celle dei fogli di calcolo. :::

## Sicurezza

- Tutti i dati di Google Workspace sono classificati almeno come **INTERNAL**
- Il contenuto delle email, i dettagli del calendario e il contenuto dei documenti
  sono tipicamente **CONFIDENTIAL**
- I token sono archiviati nel portachiavi del SO (macOS Keychain / Linux libsecret)
- Le credenziali del client sono archiviate insieme ai token nel portachiavi, mai
  in variabili d'ambiente o file di configurazione
- La [Regola No Write-Down](/it-IT/security/no-write-down) si applica: i dati
  Google CONFIDENTIAL non possono fluire verso canali PUBLIC
- Tutte le chiamate ai tool sono registrate nella traccia di audit con contesto
  di classificazione completo

## Risoluzione dei Problemi

### "No Google tokens found"

Eseguire `triggerfish connect google` per autenticarsi.

### "Google refresh token revoked or expired"

Il refresh token è stato invalidato (es. è stato revocato l'accesso nelle
impostazioni dell'Account Google). Eseguire `triggerfish connect google` per
riconnettersi.

### "Access blocked: has not completed the Google verification process"

Questo significa che l'account Google non è elencato come utente di test per
l'app. Mentre l'app è in stato "Testing" (l'impostazione predefinita), solo gli
account esplicitamente aggiunti come utenti di test possono autorizzare.

1. Andare alla
   [Schermata di consenso OAuth](https://console.cloud.google.com/apis/credentials/consent)
2. Andare alla pagina **Audience** (nella barra laterale sinistra)
3. Nella sezione **Test users**, cliccare **+ Add Users** e aggiungere il
   proprio indirizzo email Google
4. Salvare e riprovare `triggerfish connect google`

### "Token exchange failed"

Ricontrollare il Client ID e il Client Secret. Assicurarsi che:

- Il tipo di client OAuth sia "Desktop app"
- Tutte le API richieste siano abilitate nel progetto Google Cloud
- L'account Google sia elencato come utente di test (se l'app è in modalità test)

### API non abilitate

Se si vedono errori 403 per servizi specifici, assicurarsi che l'API
corrispondente sia abilitata nella
[Libreria API di Google Cloud Console](https://console.cloud.google.com/apis/library).
