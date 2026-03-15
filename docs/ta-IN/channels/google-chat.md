# Google Chat

<ComingSoon />

Google Workspace பயன்படுத்தும் teams அவர்களின் chat interface இலிருந்து நேரடியாக interact செய்ய உங்கள் Triggerfish agent ஐ Google Chat உடன் இணைக்கவும். Adapter service account அல்லது OAuth credentials உடன் Google Chat API பயன்படுத்தும்.

## திட்டமிடப்பட்ட Features

- Direct message மற்றும் space (room) support
- Google Workspace directory மூலம் Owner verification
- Typing indicators
- நீண்ட responses க்கு Message chunking
- மற்ற சேனல்களுடன் consistent Classification enforcement

## கட்டமைப்பு (திட்டமிடப்பட்டது)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

Gmail, Calendar, Tasks, Drive, மற்றும் Sheets உள்ள existing Google integration க்கு [Google Workspace](/ta-IN/integrations/google-workspace) பாருங்கள்.
