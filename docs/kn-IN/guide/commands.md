# CLI ಆಜ್ಞೆಗಳು

Triggerfish ನಿಮ್ಮ ಏಜೆಂಟ್, ಡೀಮನ್, ಚಾನೆಲ್‌ಗಳು ಮತ್ತು sessions ನಿರ್ವಹಿಸಲು CLI ಒದಗಿಸುತ್ತದೆ.
ಈ ಪುಟ ಪ್ರತಿ ಲಭ್ಯ ಆಜ್ಞೆ ಮತ್ತು ಇನ್-ಚಾಟ್ ಶಾರ್ಟ್‌ಕಟ್ ಅನ್ನು ಒಳಗೊಂಡಿದೆ.

## ಮುಖ್ಯ ಆಜ್ಞೆಗಳು

### `triggerfish dive`

ಸಂವಾದಾತ್ಮಕ ಸೆಟಪ್ ವಿಝಾರ್ಡ್ ಚಲಾಯಿಸಿ. ಸ್ಥಾಪನೆಯ ನಂತರ ನೀವು ಮೊದಲ ಬಾರಿ ಚಲಾಯಿಸುವ ಆಜ್ಞೆ.

```bash
triggerfish dive
```

### `triggerfish chat`

ನಿಮ್ಮ ಟರ್ಮಿನಲ್‌ನಲ್ಲಿ ಸಂವಾದಾತ್ಮಕ ಚಾಟ್ ಸೆಷನ್ ಪ್ರಾರಂಭಿಸಿ.

```bash
triggerfish chat
```

ಚಾಟ್ ಇಂಟರ್‌ಫೇಸ್ ವೈಶಿಷ್ಟ್ಯಗಳು:
- ಟರ್ಮಿನಲ್ ತಳಭಾಗದಲ್ಲಿ ಪೂರ್ಣ-ಅಗಲ ಇನ್‌ಪುಟ್ ಬಾರ್
- ನೈಜ-ಸಮಯ token ಪ್ರದರ್ಶನದೊಂದಿಗೆ streaming responses
- Compact tool call ಪ್ರದರ್ಶನ (Ctrl+O ನೊಂದಿಗೆ ಟಾಗಲ್ ಮಾಡಿ)
- ಇನ್‌ಪುಟ್ ಇತಿಹಾಸ (sessions ನಾದ್ಯಂತ ಉಳಿಸಲಾಗಿದೆ)
- ಚಾಲೂ ಇರುವ response ನಿಲ್ಲಿಸಲು ESC

### `triggerfish start`

Triggerfish ಅನ್ನು OS service manager ಬಳಸಿ ಹಿನ್ನೆಲೆ ಡೀಮನ್‌ಆಗಿ ಸ್ಥಾಪಿಸಿ ಮತ್ತು ಪ್ರಾರಂಭಿಸಿ.

```bash
triggerfish start
```

### `triggerfish stop`

ಚಾಲೂ ಇರುವ ಡೀಮನ್ ನಿಲ್ಲಿಸಿ.

```bash
triggerfish stop
```

### `triggerfish status`

ಡೀಮನ್ ಚಾಲೂ ಆಗಿದೆಯೇ ಮತ್ತು ಮೂಲ ಸ್ಥಿತಿ ಮಾಹಿತಿ ಪ್ರದರ್ಶಿಸಿ.

```bash
triggerfish status
```

### `triggerfish logs`

ಡೀಮನ್ ಲಾಗ್ ಔಟ್‌ಪುಟ್ ನೋಡಿ.

```bash
triggerfish logs
triggerfish logs --tail
```

### `triggerfish patrol`

ನಿಮ್ಮ Triggerfish ಸ್ಥಾಪನೆಯ ಆರೋಗ್ಯ ಪರಿಶೀಲನೆ ಚಲಾಯಿಸಿ.

```bash
triggerfish patrol
```

### `triggerfish config`

ನಿಮ್ಮ ಕಾನ್ಫಿಗರೇಶನ್ ಫೈಲ್ ನಿರ್ವಹಿಸಿ.

```bash
triggerfish config set <key> <value>
triggerfish config get <key>
triggerfish config validate
triggerfish config add-channel [type]
```

ಉದಾಹರಣೆಗಳು:

```bash
triggerfish config set models.primary.provider anthropic
triggerfish config set models.primary.model claude-sonnet-4-5
triggerfish config set web.search.provider brave
triggerfish config get models.primary.model
triggerfish config add-channel telegram
```

#### `triggerfish config migrate-secrets`

`triggerfish.yaml` ನಿಂದ plaintext ರುಜುವಾತುಗಳನ್ನು OS keychain ಗೆ ವಲಸೆ ಮಾಡಿ.

```bash
triggerfish config migrate-secrets
```

### `triggerfish connect`

Triggerfish ಗೆ ಬಾಹ್ಯ ಸೇವೆ ಸಂಪರ್ಕಿಸಿ.

```bash
triggerfish connect google    # Google Workspace (OAuth2 ಹರಿವು)
triggerfish connect github    # GitHub (Personal Access Token)
```

### `triggerfish update`

ಲಭ್ಯ ಅಪ್‌ಡೇಟ್‌ಗಳು ಪರಿಶೀಲಿಸಿ ಮತ್ತು ಸ್ಥಾಪಿಸಿ.

```bash
triggerfish update
```

### `triggerfish version`

ಪ್ರಸ್ತುತ Triggerfish ಆವೃತ್ತಿ ಪ್ರದರ್ಶಿಸಿ.

```bash
triggerfish version
```

## Skill ಆಜ್ಞೆಗಳು

The Reef marketplace ಮತ್ತು ನಿಮ್ಮ ಸ್ಥಳೀಯ workspace ನಿಂದ skills ನಿರ್ವಹಿಸಿ.

```bash
triggerfish skill search "calendar"     # The Reef ನಲ್ಲಿ skills ಹುಡುಕಿ
triggerfish skill install google-cal    # skill ಸ್ಥಾಪಿಸಿ
triggerfish skill list                  # ಸ್ಥಾಪಿಸಲಾದ skills ಪಟ್ಟಿ
triggerfish skill update --all          # ಎಲ್ಲ skills ಅಪ್‌ಡೇಟ್ ಮಾಡಿ
triggerfish skill publish               # The Reef ಗೆ skill ಪ್ರಕಟಿಸಿ
triggerfish skill create                # ಹೊಸ skill ರಚಿಸಿ
```

## Session ಆಜ್ಞೆಗಳು

ಸಕ್ರಿಯ sessions ಪರೀಕ್ಷಿಸಿ ಮತ್ತು ನಿರ್ವಹಿಸಿ.

```bash
triggerfish session list                # ಸಕ್ರಿಯ sessions ಪಟ್ಟಿ
triggerfish session history             # Session ಪ್ರತಿಲೇಖ ನೋಡಿ
triggerfish session spawn               # ಹಿನ್ನೆಲೆ session ರಚಿಸಿ
```

## ಇನ್-ಚಾಟ್ ಆಜ್ಞೆಗಳು

ಈ ಆಜ್ಞೆಗಳು ಸಂವಾದಾತ್ಮಕ ಚಾಟ್ ಸೆಷನ್‌ನಲ್ಲಿ ಲಭ್ಯ. ಅವು ಮಾಲೀಕರಿಗೆ ಮಾತ್ರ.

| ಆಜ್ಞೆ                    | ವಿವರಣೆ                                                        |
| ------------------------ | ------------------------------------------------------------- |
| `/help`                  | ಲಭ್ಯ ಇನ್-ಚಾಟ್ ಆಜ್ಞೆಗಳು ತೋರಿಸಿ                                  |
| `/status`                | Session ಸ್ಥಿತಿ ಪ್ರದರ್ಶಿಸಿ: model, token count, cost, taint level |
| `/reset`                 | Session taint ಮತ್ತು ಸಂಭಾಷಣೆ ಇತಿಹಾಸ ಮರುಹೊಂದಿಸಿ                  |
| `/compact`               | LLM ಸಾರಾಂಶೀಕರಣ ಬಳಸಿ ಸಂಭಾಷಣೆ ಇತಿಹಾಸ ಸಂಕ್ಷಿಪ್ತಗೊಳಿಸಿ               |
| `/model <name>`          | ಪ್ರಸ್ತುತ session ಗಾಗಿ LLM model ಬದಲಾಯಿಸಿ                       |
| `/skill install <name>`  | The Reef ನಿಂದ skill ಸ್ಥಾಪಿಸಿ                                  |
| `/cron list`             | ನಿಗದಿತ cron ಕೆಲಸಗಳ ಪಟ್ಟಿ                                      |

## ಕೀಬೋರ್ಡ್ ಶಾರ್ಟ್‌ಕಟ್‌ಗಳು

ಈ ಶಾರ್ಟ್‌ಕಟ್‌ಗಳು CLI ಚಾಟ್ ಇಂಟರ್‌ಫೇಸ್‌ನಲ್ಲಿ ಕಾರ್ಯನಿರ್ವಹಿಸುತ್ತವೆ:

| ಶಾರ್ಟ್‌ಕಟ್ | ಕ್ರಿಯೆ                                                              |
| --------- | ------------------------------------------------------------------- |
| ESC       | ಪ್ರಸ್ತುತ LLM response ಅಡ್ಡಿಪಡಿಸಿ                                    |
| Ctrl+V    | ಕ್ಲಿಪ್‌ಬೋರ್ಡ್‌ನಿಂದ image ಅಂಟಿಸಿ ([Image and Vision](/kn-IN/features/image-vision) ನೋಡಿ) |
| Ctrl+O    | Compact/expanded tool call ಪ್ರದರ್ಶನ ಟಾಗಲ್ ಮಾಡಿ                     |
| Ctrl+C    | ಚಾಟ್ ಸೆಷನ್‌ನಿಂದ ಹೊರನಡೆ                                              |
| Up/Down   | ಇನ್‌ಪುಟ್ ಇತಿಹಾಸ ನ್ಯಾವಿಗೇಟ್ ಮಾಡಿ                                     |

## ತ್ವರಿತ ಉಲ್ಲೇಖ

```bash
# ಸೆಟಪ್ ಮತ್ತು ನಿರ್ವಹಣೆ
triggerfish dive              # ಸೆಟಪ್ ವಿಝಾರ್ಡ್
triggerfish start             # ಡೀಮನ್ ಪ್ರಾರಂಭಿಸಿ
triggerfish stop              # ಡೀಮನ್ ನಿಲ್ಲಿಸಿ
triggerfish status            # ಸ್ಥಿತಿ ಪರಿಶೀಲಿಸಿ
triggerfish logs --tail       # ಲಾಗ್‌ಗಳು stream ಮಾಡಿ
triggerfish patrol            # ಆರೋಗ್ಯ ಪರಿಶೀಲನೆ
triggerfish update            # ಅಪ್‌ಡೇಟ್‌ಗಳು ಪರಿಶೀಲಿಸಿ
triggerfish version           # ಆವೃತ್ತಿ ತೋರಿಸಿ

# ದಿನನಿತ್ಯ ಬಳಕೆ
triggerfish chat              # ಸಂವಾದಾತ್ಮಕ ಚಾಟ್
triggerfish run               # ಮುನ್ನೆಲೆ ಮೋಡ್

# Skills
triggerfish skill search      # The Reef ಹುಡುಕಿ
triggerfish skill install     # skill ಸ್ಥಾಪಿಸಿ
triggerfish skill list        # ಸ್ಥಾಪಿಸಲಾದ ಪಟ್ಟಿ
triggerfish skill create      # ಹೊಸ skill ರಚಿಸಿ

# Sessions
triggerfish session list      # Sessions ಪಟ್ಟಿ
triggerfish session history   # ಪ್ರತಿಲೇಖ ನೋಡಿ
```
