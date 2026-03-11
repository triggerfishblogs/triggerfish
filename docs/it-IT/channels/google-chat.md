# Google Chat

<ComingSoon />

Connetta il Suo agente Triggerfish a Google Chat affinché i team che usano Google
Workspace possano interagire con esso direttamente dalla loro interfaccia di
chat. L'adattatore utilizzerà l'API Google Chat con account di servizio o
credenziali OAuth.

## Funzionalità Previste

- Supporto messaggi diretti e space (stanze)
- Verifica del proprietario tramite directory Google Workspace
- Indicatori di digitazione
- Suddivisione messaggi per risposte lunghe
- Applicazione della classificazione coerente con gli altri canali

## Configurazione (Prevista)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

Veda [Google Workspace](/it-IT/integrations/google-workspace) per l'integrazione
Google esistente che copre Gmail, Calendar, Tasks, Drive e Sheets.
