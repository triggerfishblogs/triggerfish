# CalDAV Integration

Connect your Triggerfish agent to any CalDAV-compatible calendar server. This
enables calendar operations across providers that support the CalDAV standard,
including iCloud, Fastmail, Nextcloud, Radicale, and any self-hosted CalDAV
server.

## Supported Providers

| Provider   | CalDAV URL                                      | Notes                       |
| ---------- | ----------------------------------------------- | --------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | Requires app-specific password |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | Standard CalDAV              |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | Self-hosted                  |
| Radicale   | `https://your-server.com`                       | Lightweight self-hosted      |
| Baikal     | `https://your-server.com/dav.php`               | Self-hosted                  |

::: info For Google Calendar, use the [Google Workspace](/integrations/google-workspace)
integration instead, which uses the native Google API with OAuth2. CalDAV is for
non-Google calendar providers. :::

## Setup

### Step 1: Get Your CalDAV Credentials

You need three pieces of information from your calendar provider:

- **CalDAV URL** -- The base URL for the CalDAV server
- **Username** -- Your account username or email
- **Password** -- Your account password or an app-specific password

::: warning App-Specific Passwords Most providers require an app-specific
password rather than your main account password. Check your provider's
documentation for how to generate one. :::

### Step 2: Configure Triggerfish

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # password stored in OS keychain
    classification: CONFIDENTIAL
```

| Option           | Type   | Required | Description                                         |
| ---------------- | ------ | -------- | --------------------------------------------------- |
| `url`            | string | Yes      | CalDAV server base URL                              |
| `username`       | string | Yes      | Account username or email                           |
| `password`       | string | Yes      | Account password (stored in OS keychain)            |
| `classification` | string | No       | Classification level (default: `CONFIDENTIAL`)      |

### Step 3: Calendar Discovery

On first connection, the agent runs CalDAV discovery to find all available
calendars. The discovered calendars are cached locally.

```bash
triggerfish connect caldav
```

## Available Tools

| Tool                | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `caldav_list`       | List all calendars on the account                    |
| `caldav_events`     | Fetch events for a date range from one or all calendars |
| `caldav_create`     | Create a new calendar event                          |
| `caldav_update`     | Update an existing event                             |
| `caldav_delete`     | Delete an event                                      |
| `caldav_search`     | Search events by text query                          |
| `caldav_freebusy`   | Check free/busy status for a time range              |

## Classification

Calendar data defaults to `CONFIDENTIAL` because it contains names, schedules,
locations, and meeting details. Accessing any CalDAV tool escalates the session
taint to the configured classification level.

## Authentication

CalDAV uses HTTP Basic Auth over TLS. Credentials are stored in the OS keychain
and injected at the HTTP layer below the LLM context -- the agent never sees
the raw password.

## Related Pages

- [Google Workspace](/integrations/google-workspace) -- For Google Calendar
  (uses native API)
- [Cron and Triggers](/features/cron-and-triggers) -- Schedule calendar-based
  agent actions
- [Classification Guide](/guide/classification-guide) -- Choosing the right
  classification level
