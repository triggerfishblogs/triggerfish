# CalDAV Integration

अपने Triggerfish agent को किसी भी CalDAV-संगत calendar server से कनेक्ट करें। यह
CalDAV मानक का समर्थन करने वाले providers में calendar operations सक्षम करता है,
जिसमें iCloud, Fastmail, Nextcloud, Radicale, और कोई भी self-hosted CalDAV server
शामिल है।

## समर्थित Providers

| Provider   | CalDAV URL                                      | नोट्स                          |
| ---------- | ----------------------------------------------- | ------------------------------ |
| iCloud     | `https://caldav.icloud.com`                     | App-specific password आवश्यक    |
| Fastmail   | `https://caldav.fastmail.com/dav/calendars`     | मानक CalDAV                     |
| Nextcloud  | `https://your-server.com/remote.php/dav`        | Self-hosted                     |
| Radicale   | `https://your-server.com`                       | Lightweight self-hosted          |
| Baikal     | `https://your-server.com/dav.php`               | Self-hosted                     |

::: info Google Calendar के लिए, इसके बजाय [Google Workspace](/hi-IN/integrations/google-workspace)
integration उपयोग करें, जो OAuth2 के साथ native Google API उपयोग करता है। CalDAV
गैर-Google calendar providers के लिए है। :::

## सेटअप

### चरण 1: अपने CalDAV Credentials प्राप्त करें

आपको अपने calendar provider से तीन जानकारी चाहिए:

- **CalDAV URL** -- CalDAV server का base URL
- **Username** -- आपका account username या email
- **Password** -- आपका account password या app-specific password

::: warning App-Specific Passwords अधिकांश providers को आपके मुख्य account
password के बजाय app-specific password की आवश्यकता होती है। एक उत्पन्न करने के
लिए अपने provider का दस्तावेज़ जाँचें। :::

### चरण 2: Triggerfish कॉन्फ़िगर करें

```yaml
integrations:
  caldav:
    url: "https://caldav.icloud.com"
    username: "you@icloud.com"
    # password OS keychain में संग्रहीत
    classification: CONFIDENTIAL
```

| विकल्प           | Type   | आवश्यक | विवरण                                              |
| ---------------- | ------ | ------ | -------------------------------------------------- |
| `url`            | string | हाँ    | CalDAV server base URL                              |
| `username`       | string | हाँ    | Account username या email                           |
| `password`       | string | हाँ    | Account password (OS keychain में संग्रहीत)           |
| `classification` | string | नहीं   | Classification स्तर (डिफ़ॉल्ट: `CONFIDENTIAL`)       |

### चरण 3: Calendar Discovery

पहले connection पर, agent सभी उपलब्ध calendars खोजने के लिए CalDAV discovery
चलाता है। Discovered calendars स्थानीय रूप से cached होते हैं।

```bash
triggerfish connect caldav
```

## उपलब्ध Tools

| Tool                | विवरण                                               |
| ------------------- | --------------------------------------------------- |
| `caldav_list`       | Account पर सभी calendars सूचीबद्ध करें                |
| `caldav_events`     | एक या सभी calendars से date range के लिए events fetch करें |
| `caldav_create`     | नया calendar event बनाएँ                             |
| `caldav_update`     | मौजूदा event अपडेट करें                               |
| `caldav_delete`     | Event हटाएँ                                          |
| `caldav_search`     | Text query द्वारा events खोजें                        |
| `caldav_freebusy`   | समय सीमा के लिए free/busy स्थिति जाँचें               |

## Classification

Calendar डेटा डिफ़ॉल्ट रूप से `CONFIDENTIAL` है क्योंकि इसमें नाम, शेड्यूल,
स्थान, और meeting विवरण होते हैं। किसी भी CalDAV tool तक पहुँचने से session taint
कॉन्फ़िगर किए गए classification स्तर तक बढ़ता है।

## प्रमाणीकरण

CalDAV TLS पर HTTP Basic Auth उपयोग करता है। Credentials OS keychain में संग्रहीत
हैं और LLM context के नीचे HTTP परत पर inject किए जाते हैं -- agent कभी raw
password नहीं देखता।

## संबंधित पृष्ठ

- [Google Workspace](/hi-IN/integrations/google-workspace) -- Google Calendar के
  लिए (native API उपयोग करता है)
- [Cron और Triggers](/hi-IN/features/cron-and-triggers) -- Calendar-आधारित agent
  actions शेड्यूल करें
- [Classification Guide](/hi-IN/guide/classification-guide) -- सही classification
  स्तर चुनना
