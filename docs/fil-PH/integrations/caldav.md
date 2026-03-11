# CalDAV Integration

I-connect ang iyong Triggerfish agent sa anumang CalDAV-compatible calendar server. Nag-e-enable ito ng calendar operations sa mga providers na sumusuporta sa CalDAV standard, kasama ang iCloud, Fastmail, Nextcloud, Radicale, at anumang self-hosted CalDAV server.

## Mga Supported Provider

| Provider   | CalDAV URL                                      | Mga Tala                          |
| ---------- | ----------------------------------------------- | --------------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | Nangangailangan ng app-specific password |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | Standard CalDAV                   |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | Self-hosted                       |
| Radicale   | `https://your-server.com`                       | Lightweight self-hosted           |
| Baikal     | `https://your-server.com/dav.php`               | Self-hosted                       |

::: info Para sa Google Calendar, gamitin ang [Google Workspace](/fil-PH/integrations/google-workspace) integration sa halip, na gumagamit ng native Google API na may OAuth2. Ang CalDAV ay para sa non-Google calendar providers. :::

## Setup

### Step 1: Kunin ang Iyong CalDAV Credentials

Kailangan mo ng tatlong piraso ng impormasyon mula sa iyong calendar provider:

- **CalDAV URL** -- Ang base URL para sa CalDAV server
- **Username** -- Ang iyong account username o email
- **Password** -- Ang iyong account password o app-specific password

::: warning App-Specific Passwords Karamihan ng providers ay nangangailangan ng app-specific password sa halip na iyong main account password. I-check ang documentation ng iyong provider kung paano gumawa nito. :::

### Step 2: I-configure ang Triggerfish

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # password na naka-store sa OS keychain
    classification: CONFIDENTIAL
```

| Option           | Type   | Required | Paglalarawan                                          |
| ---------------- | ------ | -------- | ----------------------------------------------------- |
| `url`            | string | Oo       | CalDAV server base URL                                |
| `username`       | string | Oo       | Account username o email                              |
| `password`       | string | Oo       | Account password (naka-store sa OS keychain)          |
| `classification` | string | Hindi    | Classification level (default: `CONFIDENTIAL`)        |

### Step 3: Calendar Discovery

Sa unang connection, nagpa-patakbo ang agent ng CalDAV discovery para hanapin ang lahat ng available calendars. Naka-cache nang lokal ang discovered calendars.

```bash
triggerfish connect caldav
```

## Mga Available Tool

| Tool                | Paglalarawan                                               |
| ------------------- | ---------------------------------------------------------- |
| `caldav_list`       | Ilista ang lahat ng calendars sa account                   |
| `caldav_events`     | Kunin ang events para sa date range mula sa isa o lahat ng calendars |
| `caldav_create`     | Gumawa ng bagong calendar event                            |
| `caldav_update`     | Mag-update ng existing event                               |
| `caldav_delete`     | Mag-delete ng event                                        |
| `caldav_search`     | Maghanap ng events ayon sa text query                      |
| `caldav_freebusy`   | I-check ang free/busy status para sa time range            |

## Classification

Ang calendar data ay dina-default sa `CONFIDENTIAL` dahil naglalaman ito ng mga pangalan, schedules, locations, at meeting details. Ang pag-access sa anumang CalDAV tool ay nag-e-escalate ng session taint sa configured classification level.

## Authentication

Gumagamit ang CalDAV ng HTTP Basic Auth sa TLS. Ang credentials ay naka-store sa OS keychain at ini-inject sa HTTP layer sa ibaba ng LLM context -- hindi nakikita ng agent ang raw password.

## Mga Kaugnay na Pahina

- [Google Workspace](/fil-PH/integrations/google-workspace) -- Para sa Google Calendar (gumagamit ng native API)
- [Cron and Triggers](/fil-PH/features/cron-and-triggers) -- I-schedule ang calendar-based agent actions
- [Classification Guide](/fil-PH/guide/classification-guide) -- Pagpili ng tamang classification level
