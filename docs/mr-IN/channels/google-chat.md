# Google Chat

<ComingSoon />

तुमच्या Triggerfish एजंटला Google Chat शी जोडा जेणेकरून Google Workspace वापरणारे
teams त्यांच्या chat interface वरून थेट त्याच्याशी interact करू शकतात. Adapter
service account किंवा OAuth credentials सह Google Chat API वापरेल.

## Planned Features

- Direct message आणि space (room) support
- Google Workspace directory द्वारे Owner verification
- Typing indicators
- Long responses साठी Message chunking
- इतर channels शी consistent Classification enforcement

## Configuration (Planned)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

Existing Google integration साठी [Google Workspace](/mr-IN/integrations/google-workspace)
पहा जे Gmail, Calendar, Tasks, Drive, आणि Sheets cover करते.
