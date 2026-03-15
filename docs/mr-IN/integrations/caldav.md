# CalDAV Integration

तुमच्या Triggerfish एजंटला कोणत्याही CalDAV-compatible calendar server शी connect
करा. हे iCloud, Fastmail, Nextcloud, Radicale, आणि कोणत्याही self-hosted CalDAV
server सह CalDAV standard support करणाऱ्या providers वर calendar operations
enable करते.

## Supported Providers

| Provider   | CalDAV URL                                      | Notes                         |
| ---------- | ----------------------------------------------- | ----------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | App-specific password आवश्यक  |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | Standard CalDAV               |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | Self-hosted                   |
| Radicale   | `https://your-server.com`                       | Lightweight self-hosted       |
| Baikal     | `https://your-server.com/dav.php`               | Self-hosted                   |

::: info Google Calendar साठी, [Google Workspace](/mr-IN/integrations/google-workspace)
integration वापरा, जे native Google API OAuth2 सह वापरतो. CalDAV non-Google
calendar providers साठी आहे. :::

## सेटअप

### पायरी 1: CalDAV Credentials मिळवा

तुमच्या calendar provider कडून तुम्हाला तीन pieces of information आवश्यक आहेत:

- **CalDAV URL** -- CalDAV server साठी base URL
- **Username** -- तुमचा account username किंवा email
- **Password** -- तुमचा account password किंवा app-specific password

::: warning App-Specific Passwords बहुतेक providers तुमच्या main account password
ऐवजी app-specific password आवश्यक करतात. एक generate कसे करायचे यासाठी
तुमच्या provider चे documentation check करा. :::

### पायरी 2: Triggerfish कॉन्फिगर करा

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # password OS keychain मध्ये stored
    classification: CONFIDENTIAL
```

| Option           | Type   | Required | वर्णन                                                |
| ---------------- | ------ | -------- | ---------------------------------------------------- |
| `url`            | string | हो       | CalDAV server base URL                               |
| `username`       | string | हो       | Account username किंवा email                         |
| `password`       | string | हो       | Account password (OS keychain मध्ये stored)          |
| `classification` | string | नाही     | Classification level (default: `CONFIDENTIAL`)       |

### पायरी 3: Calendar Discovery

पहिल्या connection वर, एजंट सर्व available calendars शोधण्यासाठी CalDAV discovery
run करतो. Discovered calendars locally cached आहेत.

```bash
triggerfish connect caldav
```

## Available Tools

| Tool                | वर्णन                                                   |
| ------------------- | ------------------------------------------------------- |
| `caldav_list`       | Account वरील सर्व calendars list करा                    |
| `caldav_events`     | एक किंवा सर्व calendars मधून date range साठी events fetch करा |
| `caldav_create`     | नवीन calendar event create करा                          |
| `caldav_update`     | Existing event update करा                               |
| `caldav_delete`     | Event delete करा                                        |
| `caldav_search`     | Text query नुसार events search करा                      |
| `caldav_freebusy`   | Time range साठी free/busy status check करा              |

## Classification

Calendar data default वर `CONFIDENTIAL` आहे कारण त्यात names, schedules,
locations, आणि meeting details असतात. कोणताही CalDAV tool access केल्याने session
taint configured classification level ला escalate होते.

## Authentication

CalDAV TLS वर HTTP Basic Auth वापरतो. Credentials OS keychain मध्ये stored आहेत
आणि LLM context खाली HTTP layer वर inject केले जातात -- एजंट raw password कधीही
पाहत नाही.

## Related Pages

- [Google Workspace](/mr-IN/integrations/google-workspace) -- Google Calendar
  साठी (native API वापरतो)
- [Cron आणि Triggers](/mr-IN/features/cron-and-triggers) -- Calendar-based agent
  actions schedule करा
- [Classification Guide](/mr-IN/guide/classification-guide) -- योग्य classification
  level निवडणे
