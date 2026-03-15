# CalDAV Integration

اپنے Triggerfish ایجنٹ کو کسی بھی CalDAV-compatible calendar server سے جوڑیں۔ یہ
CalDAV standard support کرنے والے providers میں calendar operations ممکن بناتا ہے،
جن میں iCloud، Fastmail، Nextcloud، Radicale، اور کوئی بھی self-hosted CalDAV
server شامل ہیں۔

## Support کردہ Providers

| Provider   | CalDAV URL                                      | نوٹس                              |
| ---------- | ----------------------------------------------- | ---------------------------------- |
| iCloud     | `https://caldav.icloud.com`                     | App-specific password درکار ہے     |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | Standard CalDAV                    |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | Self-hosted                        |
| Radicale   | `https://your-server.com`                       | Lightweight self-hosted            |
| Baikal     | `https://your-server.com/dav.php`               | Self-hosted                        |

::: info Google Calendar کے لیے [Google Workspace](/ur-PK/integrations/google-workspace)
integration استعمال کریں جو native Google API اور OAuth2 کے ساتھ ہے۔ CalDAV
non-Google calendar providers کے لیے ہے۔ :::

## Setup

### قدم 1: اپنی CalDAV Credentials حاصل کریں

آپ کو اپنے calendar provider سے تین چیزیں چاہیے:

- **CalDAV URL** -- CalDAV server کا base URL
- **Username** -- آپ کا account username یا email
- **Password** -- آپ کا account password یا app-specific password

::: warning App-Specific Passwords زیادہ تر providers main account password کی بجائے
app-specific password require کرتے ہیں۔ اسے generate کرنے کے لیے اپنے provider کی
documentation چیک کریں۔ :::

### قدم 2: Triggerfish Configure کریں

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # password OS keychain میں محفوظ
    classification: CONFIDENTIAL
```

| Option           | Type   | ضروری | تفصیل                                                  |
| ---------------- | ------ | :---: | ------------------------------------------------------- |
| `url`            | string | ہاں   | CalDAV server base URL                                  |
| `username`       | string | ہاں   | Account username یا email                               |
| `password`       | string | ہاں   | Account password (OS keychain میں محفوظ)                |
| `classification` | string | نہیں  | Classification level (ڈیفالٹ: `CONFIDENTIAL`)           |

### قدم 3: Calendar Discovery

پہلے connection پر، ایجنٹ تمام دستیاب calendars تلاش کرنے کے لیے CalDAV discovery
چلاتا ہے۔ دریافت شدہ calendars locally cached ہو جاتی ہیں۔

```bash
triggerfish connect caldav
```

## Available Tools

| Tool                | تفصیل                                                     |
| ------------------- | ---------------------------------------------------------- |
| `caldav_list`       | Account پر تمام calendars list کریں                       |
| `caldav_events`     | ایک یا تمام calendars سے date range کے events fetch کریں  |
| `caldav_create`     | نئی calendar event بنائیں                                 |
| `caldav_update`     | موجودہ event اپ ڈیٹ کریں                                  |
| `caldav_delete`     | Event delete کریں                                         |
| `caldav_search`     | Text query سے events تلاش کریں                            |
| `caldav_freebusy`   | Time range کے لیے free/busy status چیک کریں               |

## Classification

Calendar data ڈیفالٹ طور پر `CONFIDENTIAL` ہے کیونکہ اس میں names، schedules،
locations، اور meeting details ہوتی ہیں۔ کوئی بھی CalDAV tool استعمال کرنے سے
session taint configured classification level تک escalate ہو جاتا ہے۔

## Authentication

CalDAV TLS پر HTTP Basic Auth استعمال کرتا ہے۔ Credentials OS keychain میں محفوظ
ہوتی ہیں اور HTTP layer پر LLM context سے نیچے inject ہوتی ہیں — ایجنٹ کبھی raw
password نہیں دیکھتا۔

## متعلقہ Pages

- [Google Workspace](/ur-PK/integrations/google-workspace) -- Google Calendar کے لیے
  (native API استعمال کرتا ہے)
- [Cron اور Triggers](/ur-PK/features/cron-and-triggers) -- Calendar-based agent
  actions schedule کریں
- [Classification Guide](/ur-PK/guide/classification-guide) -- صحیح classification
  level منتخب کرنا
