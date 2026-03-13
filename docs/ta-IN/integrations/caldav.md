# CalDAV Integration

CalDAV standard support செய்யும் எந்த calendar server உடனும் உங்கள் Triggerfish agent ஐ connect செய்யவும். iCloud, Fastmail, Nextcloud, Radicale, மற்றும் எந்த self-hosted CalDAV server உம் உட்பட CalDAV standard support செய்யும் providers க்கு calendar operations enable செய்கிறது.

## Supported Providers

| Provider   | CalDAV URL                                      | குறிப்புகள்                       |
| ---------- | ----------------------------------------------- | --------------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | App-specific password தேவை       |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | Standard CalDAV                   |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | Self-hosted                       |
| Radicale   | `https://your-server.com`                       | Lightweight self-hosted           |
| Baikal     | `https://your-server.com/dav.php`               | Self-hosted                       |

::: info Google Calendar க்கு, native Google API OAuth2 பயன்படுத்தும் [Google Workspace](/ta-IN/integrations/google-workspace) integration பயன்படுத்தவும். CalDAV non-Google calendar providers க்கானது. :::

## Setup

### படி 1: CalDAV Credentials பெறவும்

உங்கள் calendar provider இலிருந்து மூன்று pieces of information தேவை:

- **CalDAV URL** -- CalDAV server இன் base URL
- **Username** -- உங்கள் account username அல்லது email
- **Password** -- உங்கள் account password அல்லது app-specific password

::: warning App-Specific Passwords பெரும்பாலான providers உங்கள் main account password க்கு பதிலாக app-specific password தேவைப்படுகின்றன. Generate செய்வது எவ்வாறு என்று உங்கள் provider இன் documentation சரிபார்க்கவும். :::

### படி 2: Triggerfish கட்டமைக்கவும்

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # password OS keychain இல் stored
    classification: CONFIDENTIAL
```

| Option           | Type   | Required | விளக்கம்                                              |
| ---------------- | ------ | -------- | ------------------------------------------------------- |
| `url`            | string | ஆம்      | CalDAV server base URL                                  |
| `username`       | string | ஆம்      | Account username அல்லது email                          |
| `password`       | string | ஆம்      | Account password (OS keychain இல் stored)              |
| `classification` | string | இல்லை   | Classification level (default: `CONFIDENTIAL`)          |

### படி 3: Calendar Discovery

First connection போது, agent available அனைத்து calendars கண்டுபிடிக்க CalDAV discovery இயக்குகிறது. Discovered calendars locally cached ஆகின்றன.

```bash
triggerfish connect caldav
```

## Available Tools

| Tool                | விளக்கம்                                                    |
| ------------------- | ------------------------------------------------------------- |
| `caldav_list`       | Account இல் அனைத்து calendars பட்டியலிடவும்               |
| `caldav_events`     | ஒரு அல்லது அனைத்து calendars இலிருந்து date range க்கான events fetch செய்யவும் |
| `caldav_create`     | புதிய calendar event உருவாக்கவும்                          |
| `caldav_update`     | Existing event update செய்யவும்                             |
| `caldav_delete`     | Event delete செய்யவும்                                      |
| `caldav_search`     | Text query மூலம் events தேடவும்                            |
| `caldav_freebusy`   | ஒரு time range க்கான free/busy status சரிபார்க்கவும்      |

## Classification

Calendar data default ஆக `CONFIDENTIAL` -- ஏனெனில் அதில் names, schedules, locations, மற்றும் meeting details உள்ளன. எந்த CalDAV tool அணுகினாலும் session taint configured classification level க்கு escalate ஆகிறது.

## Authentication

CalDAV TLS மேல் HTTP Basic Auth பயன்படுத்துகிறது. Credentials OS keychain இல் stored மற்றும் LLM context க்கு கீழ் HTTP layer இல் inject ஆகின்றன -- agent raw password பார்ப்பதில்லை.

## தொடர்புடையவை

- [Google Workspace](/ta-IN/integrations/google-workspace) -- Google Calendar க்கு (native API பயன்படுத்துகிறது)
- [Cron and Triggers](/ta-IN/features/cron-and-triggers) -- Calendar-based agent actions schedule செய்யவும்
- [Classification Guide](/ta-IN/guide/classification-guide) -- சரியான classification level தேர்வு செய்யவும்
