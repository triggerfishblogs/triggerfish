# Google Chat

<ComingSoon />

Connect your Triggerfish agent to Google Chat so teams using Google Workspace can
interact with it directly from their chat interface. The adapter will use the
Google Chat API with service account or OAuth credentials.

## Planned Features

- Direct message and space (room) support
- Owner verification via Google Workspace directory
- Typing indicators
- Message chunking for long responses
- Classification enforcement consistent with other channels

## Configuration (Planned)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

See [Google Workspace](/en-GB/integrations/google-workspace) for the existing Google
integration that covers Gmail, Calendar, Tasks, Drive, and Sheets.
