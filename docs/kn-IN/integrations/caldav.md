# CalDAV Integration

ಯಾವುದೇ CalDAV-compatible calendar server ಗೆ Triggerfish agent ಸಂಪರ್ಕಿಸಿ. ಇದು
iCloud, Fastmail, Nextcloud, Radicale, ಮತ್ತು ಯಾವುದೇ self-hosted CalDAV server
ಸೇರಿದಂತೆ CalDAV standard ಬೆಂಬಲಿಸುವ providers ನ ಎಲ್ಲ calendar operations ಸಾಧ್ಯ
ಮಾಡುತ್ತದೆ.

## ಬೆಂಬಲಿಸಿದ Providers

| Provider   | CalDAV URL                                      | Notes                             |
| ---------- | ----------------------------------------------- | --------------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | App-specific password ಅಗತ್ಯ       |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | Standard CalDAV                   |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | Self-hosted                       |
| Radicale   | `https://your-server.com`                       | Lightweight self-hosted           |
| Baikal     | `https://your-server.com/dav.php`               | Self-hosted                       |

::: info Google Calendar ಗಾಗಿ, native Google API ಬಳಸುವ [Google Workspace](/kn-IN/integrations/google-workspace)
integration ಬಳಸಿ. CalDAV non-Google calendar providers ಗಾಗಿ. :::

## Setup

### Step 1: CalDAV Credentials ಪಡೆಯಿರಿ

Calendar provider ನಿಂದ ಮೂರು ವಿಷಯಗಳು ಬೇಕು:

- **CalDAV URL** -- CalDAV server ಗೆ base URL
- **Username** -- ನಿಮ್ಮ account username ಅಥವಾ email
- **Password** -- ನಿಮ್ಮ account password ಅಥವಾ app-specific password

::: warning App-Specific Passwords ಹೆಚ್ಚಿನ providers ನಿಮ್ಮ main account password
ಬದಲಾಗಿ app-specific password ಅಗತ್ಯಪಡಿಸುತ್ತವೆ. ಒಂದನ್ನು generate ಮಾಡುವ ವಿಧಾನಕ್ಕೆ
ನಿಮ್ಮ provider ನ documentation ಪರಿಶೀಲಿಸಿ. :::

### Step 2: Triggerfish Configure ಮಾಡಿ

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # password stored in OS keychain
    classification: CONFIDENTIAL
```

| Option           | Type   | Required | ವಿವರಣೆ                                            |
| ---------------- | ------ | -------- | -------------------------------------------------- |
| `url`            | string | ಹೌದು     | CalDAV server base URL                             |
| `username`       | string | ಹೌದು     | Account username ಅಥವಾ email                        |
| `password`       | string | ಹೌದು     | Account password (OS keychain ನಲ್ಲಿ store)          |
| `classification` | string | ಇಲ್ಲ     | Classification level (default: `CONFIDENTIAL`)     |

### Step 3: Calendar Discovery

ಮೊದಲ connection ನಲ್ಲಿ, agent ಲಭ್ಯ ಎಲ್ಲ calendars ಕಂಡುಹಿಡಿಯಲು CalDAV discovery
ಚಲಾಯಿಸುತ್ತದೆ. Discovered calendars locally cache ಮಾಡಲ್ಪಡುತ್ತವೆ.

```bash
triggerfish connect caldav
```

## ಲಭ್ಯ Tools

| Tool                | ವಿವರಣೆ                                                        |
| ------------------- | ------------------------------------------------------------- |
| `caldav_list`       | Account ನ ಎಲ್ಲ calendars list ಮಾಡಿ                            |
| `caldav_events`     | ಒಂದು ಅಥವಾ ಎಲ್ಲ calendars ನಿಂದ date range ಗಾಗಿ events fetch   |
| `caldav_create`     | ಹೊಸ calendar event ತಯಾರಿಸಿ                                    |
| `caldav_update`     | Existing event update ಮಾಡಿ                                    |
| `caldav_delete`     | Event delete ಮಾಡಿ                                             |
| `caldav_search`     | Text query ಮೂಲಕ events ಹುಡುಕಿ                                 |
| `caldav_freebusy`   | Time range ಗಾಗಿ free/busy status check ಮಾಡಿ                   |

## Classification

Calendar data names, schedules, locations, ಮತ್ತು meeting details ಒಳಗೊಂಡಿರುವ
ಕಾರಣ default ಆಗಿ `CONFIDENTIAL`. ಯಾವುದೇ CalDAV tool ಪ್ರವೇಶಿಸಿದರೆ session taint
configured classification level ಗೆ escalate ಆಗುತ್ತದೆ.

## Authentication

CalDAV TLS ಮೇಲೆ HTTP Basic Auth ಬಳಸುತ್ತದೆ. Credentials OS keychain ನಲ್ಲಿ store
ಮಾಡಲ್ಪಡುತ್ತವೆ ಮತ್ತು LLM context ಕೆಳಗಿನ HTTP layer ನಲ್ಲಿ inject ಮಾಡಲ್ಪಡುತ್ತವೆ --
agent raw password ನೋಡುವುದಿಲ್ಲ.

## ಸಂಬಂಧಿತ Pages

- [Google Workspace](/kn-IN/integrations/google-workspace) -- Google Calendar ಗಾಗಿ
  (native API ಬಳಸುತ್ತದೆ)
- [Cron and Triggers](/kn-IN/features/cron-and-triggers) -- Calendar-based agent
  actions schedule ಮಾಡಿ
- [Classification Guide](/kn-IN/guide/classification-guide) -- ಸರಿಯಾದ classification
  level ಆಯ್ಕೆ ಮಾಡಿ
