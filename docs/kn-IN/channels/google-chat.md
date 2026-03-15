# Google Chat

<ComingSoon />

ನಿಮ್ಮ Triggerfish agent ಅನ್ನು Google Chat ಗೆ ಸಂಪರ್ಕಿಸಿ Google Workspace ಬಳಸುವ teams
ತಮ್ಮ chat interface ನಿಂದ ನೇರವಾಗಿ ಅದರೊಂದಿಗೆ ಸಂವಾದಿಸಲು. Adapter service account ಅಥವಾ
OAuth credentials ನೊಂದಿಗೆ Google Chat API ಬಳಸುತ್ತದೆ.

## ಯೋಜಿಸಲ್ಪಟ್ಟ ವೈಶಿಷ್ಟ್ಯಗಳು

- Direct message ಮತ್ತು space (room) ಬೆಂಬಲ
- Google Workspace directory ಮೂಲಕ owner verification
- Typing indicators
- ಉದ್ದ responses ಗಾಗಿ message chunking
- ಇತರ channels ನೊಂದಿಗೆ consistent classification enforcement

## Configuration (ಯೋಜಿಸಲ್ಪಟ್ಟಿದೆ)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

Gmail, Calendar, Tasks, Drive, ಮತ್ತು Sheets ಒಳಗೊಂಡ ಅಸ್ತಿತ್ವದಲ್ಲಿರುವ Google integration
ಗಾಗಿ [Google Workspace](/kn-IN/integrations/google-workspace) ನೋಡಿ.
