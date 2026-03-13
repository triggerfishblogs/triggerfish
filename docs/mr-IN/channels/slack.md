# Slack

तुमच्या Triggerfish एजंटला Slack शी जोडा जेणेकरून तुमचा एजंट workspace conversations
मध्ये सहभागी होऊ शकेल. Adapter [Bolt](https://slack.dev/bolt-js/) framework Socket
Mode सह वापरतो, याचा अर्थ कोणतेही public URL किंवा webhook endpoint आवश्यक नाही.

## Default वर्गीकरण

Slack default वर `PUBLIC` वर्गीकरण आहे. Slack workspaces मध्ये अनेकदा external guests
आणि shared channels असतात.

## सेटअप

### पायरी 1: Slack App तयार करा

1. [api.slack.com/apps](https://api.slack.com/apps) वर जा
2. **Create New App** > **From scratch** क्लिक करा
3. तुमच्या app ला नाव द्या आणि workspace निवडा

### पायरी 2: Bot Token Scopes कॉन्फिगर करा

**OAuth & Permissions** मध्ये हे **Bot Token Scopes** जोडा:

| Scope              | उद्देश                             |
| ------------------ | ----------------------------------- |
| `chat:write`       | Messages पाठवा                      |
| `channels:history` | Public channels मध्ये messages वाचा |
| `groups:history`   | Private channels मध्ये messages वाचा |
| `im:history`       | Direct messages वाचा                |
| `users:read`       | User माहिती lookup करा              |

### पायरी 3: Socket Mode सक्षम करा

1. **Socket Mode** ला navigate करा
2. **Enable Socket Mode** toggle करा
3. **App-Level Token** तयार करा (`connections:write` scope सह)
4. Generated **App Token** copy करा (starts with `xapp-`)

### पायरी 4: Events सक्षम करा

**Event Subscriptions** मध्ये bot events जोडा:
- `message.channels`, `message.groups`, `message.im`, `message.mpim`

### पायरी 5: Credentials मिळवा

- **Bot Token** (`xoxb-` ने सुरू)
- **App Token** (`xapp-` ने सुरू)
- **Signing Secret** (**Basic Information** मधून)

### पायरी 6: Triggerfish कॉन्फिगर करा

```yaml
channels:
  slack:
    # botToken, appToken, signingSecret OS keychain मध्ये stored
    ownerId: "U01234ABC"
```

| Option           | Type   | Required     | वर्णन                                       |
| ---------------- | ------ | ------------ | -------------------------------------------- |
| `ownerId`        | string | शिफारस केलेले | Owner verification साठी तुमचा Slack member ID |
| `classification` | string | नाही         | वर्गीकरण स्तर (default: `PUBLIC`)             |

### पायरी 7: Bot Invite करा

Channel मध्ये bot invite करण्यासाठी: `/invite @Triggerfish`

## Group Chat

```yaml
groups:
  default_behavior: "mentioned-only"
  overrides:
    - channel: slack
      channel_name: "#ai-assistant"
      behavior: "always"
```

## वर्गीकरण बदलणे

Valid levels: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, `RESTRICTED`.
