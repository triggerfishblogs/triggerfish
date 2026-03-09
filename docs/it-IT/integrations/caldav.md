# Integrazione CalDAV

Connettere l'agent Triggerfish a qualsiasi server calendario compatibile CalDAV.
Questo abilita le operazioni di calendario tra provider che supportano lo standard
CalDAV, inclusi iCloud, Fastmail, Nextcloud, Radicale e qualsiasi server CalDAV
self-hosted.

## Provider Supportati

| Provider   | URL CalDAV                                      | Note                          |
| ---------- | ----------------------------------------------- | ----------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | Richiede password specifica per app |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | CalDAV standard               |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | Self-hosted                   |
| Radicale   | `https://your-server.com`                       | Self-hosted leggero           |
| Baikal     | `https://your-server.com/dav.php`               | Self-hosted                   |

::: info Per Google Calendar, utilizzare l'integrazione
[Google Workspace](/it-IT/integrations/google-workspace) che usa l'API nativa
Google con OAuth2. CalDAV è per provider di calendario non-Google. :::

## Configurazione

### Passo 1: Ottenere le Credenziali CalDAV

Servono tre informazioni dal proprio provider di calendario:

- **URL CalDAV** -- L'URL base del server CalDAV
- **Nome utente** -- Il nome utente o email dell'account
- **Password** -- La password dell'account o una password specifica per app

::: warning Password Specifiche per App La maggior parte dei provider richiede una
password specifica per app anziché la password principale dell'account. Consultare
la documentazione del proprio provider per sapere come generarne una. :::

### Passo 2: Configurare Triggerfish

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # la password è archiviata nel portachiavi del SO
    classification: CONFIDENTIAL
```

| Opzione          | Tipo   | Obbligatorio | Descrizione                                          |
| ---------------- | ------ | ------------ | ---------------------------------------------------- |
| `url`            | string | Sì           | URL base del server CalDAV                           |
| `username`       | string | Sì           | Nome utente o email dell'account                     |
| `password`       | string | Sì           | Password dell'account (archiviata nel portachiavi del SO) |
| `classification` | string | No           | Livello di classificazione (predefinito: `CONFIDENTIAL`) |

### Passo 3: Scoperta dei Calendari

Alla prima connessione, l'agent esegue la scoperta CalDAV per trovare tutti i
calendari disponibili. I calendari scoperti vengono memorizzati localmente.

```bash
triggerfish connect caldav
```

## Tool Disponibili

| Tool                | Descrizione                                               |
| ------------------- | --------------------------------------------------------- |
| `caldav_list`       | Elencare tutti i calendari dell'account                   |
| `caldav_events`     | Recuperare eventi per un intervallo di date da uno o tutti i calendari |
| `caldav_create`     | Creare un nuovo evento del calendario                     |
| `caldav_update`     | Aggiornare un evento esistente                            |
| `caldav_delete`     | Eliminare un evento                                       |
| `caldav_search`     | Cercare eventi per query testuale                         |
| `caldav_freebusy`   | Verificare lo stato libero/occupato per un intervallo di tempo |

## Classificazione

I dati del calendario hanno classificazione predefinita `CONFIDENTIAL` perché
contengono nomi, orari, luoghi e dettagli delle riunioni. L'accesso a qualsiasi
tool CalDAV aumenta il taint della sessione al livello di classificazione
configurato.

## Autenticazione

CalDAV utilizza HTTP Basic Auth su TLS. Le credenziali sono archiviate nel
portachiavi del SO e iniettate a livello HTTP sotto il contesto del LLM --
l'agent non vede mai la password in chiaro.

## Pagine Correlate

- [Google Workspace](/it-IT/integrations/google-workspace) -- Per Google Calendar
  (usa l'API nativa)
- [Cron e Trigger](/it-IT/features/cron-and-triggers) -- Programmare azioni
  dell'agent basate sul calendario
- [Guida alla Classificazione](/it-IT/guide/classification-guide) -- Scegliere il
  livello di classificazione giusto
