# Google Chat

<ComingSoon />

Ikonekta ang iyong Triggerfish agent sa Google Chat para ang mga team na
gumagamit ng Google Workspace ay maka-interact dito nang direkta mula sa
kanilang chat interface. Gagamit ang adapter ng Google Chat API na may service
account o OAuth credentials.

## Mga Nakaplanong Feature

- Direct message at space (room) support
- Owner verification sa pamamagitan ng Google Workspace directory
- Typing indicators
- Message chunking para sa mahabang responses
- Classification enforcement na consistent sa ibang channels

## Configuration (Nakaplano)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

Tingnan ang [Google Workspace](/fil-PH/integrations/google-workspace) para sa
existing Google integration na sumasaklaw sa Gmail, Calendar, Tasks, Drive, at
Sheets.
