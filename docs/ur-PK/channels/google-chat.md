# Google Chat

<ComingSoon />

اپنے Triggerfish ایجنٹ کو Google Chat سے جوڑیں تاکہ Google Workspace استعمال کرنے
والی teams اپنے chat interface سے براہ راست اس سے interact کر سکیں۔ Adapter Google
Chat API کو service account یا OAuth credentials کے ساتھ استعمال کرے گا۔

## Planned خصوصیات

- Direct message اور space (room) support
- Google Workspace directory کے ذریعے owner verification
- Typing indicators
- لمبی responses کے لیے message chunking
- دوسرے channels کے مطابق classification enforcement

## Configuration (Planned)

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

موجودہ Google integration کے لیے جو Gmail، Calendar، Tasks، Drive، اور Sheets cover
کرتا ہے [Google Workspace](/ur-PK/integrations/google-workspace) دیکھیں۔
