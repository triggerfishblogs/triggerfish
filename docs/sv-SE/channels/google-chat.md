# Google Chat

<ComingSoon />

Anslut din Triggerfish-agent till Google Chat så att team som använder Google Workspace kan interagera med den direkt från sitt chattgränssnitt. Adaptern kommer att använda Google Chat API med tjänstkonto eller OAuth-uppgifter.

## Planerade funktioner

- Stöd för direktmeddelanden och utrymmen (rum)
- Ägarverifiering via Google Workspace-katalogen
- Skrivindiktatorer
- Meddelandechunkning för långa svar
- Klassificeringstillämpning i linje med andra kanaler

## Konfiguration (planerad)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

Se [Google Workspace](/sv-SE/integrations/google-workspace) för den befintliga Google-integrationen som täcker Gmail, Kalender, Uppgifter, Drive och Kalkylark.
