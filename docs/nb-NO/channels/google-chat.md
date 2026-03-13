# Google Chat

<ComingSoon />

Koble Triggerfish-agenten din til Google Chat slik at team som bruker Google Workspace kan samhandle med den direkte fra chat-grensesnittet sitt. Adapteren vil bruke Google Chat API med tjenestekonto eller OAuth-legitimasjon.

## Planlagte funksjoner

- Støtte for direktemeldinger og mellomrom (rom)
- Eierverifisering via Google Workspace-katalog
- Skriveindikatorer
- Meldingsdeling for lange svar
- Klassifiseringshåndhevelse konsistent med andre kanaler

## Konfigurasjon (planlagt)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

Se [Google Workspace](/nb-NO/integrations/google-workspace) for den eksisterende Google-integrasjonen som dekker Gmail, Kalender, Oppgaver, Drive og Sheets.
