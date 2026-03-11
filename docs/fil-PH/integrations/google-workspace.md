# Google Workspace

I-connect ang iyong Google account para bigyan ang iyong agent ng access sa Gmail, Calendar, Tasks, Drive, at Sheets.

## Mga Prerequisites

- Isang Google account
- Isang Google Cloud project na may OAuth credentials

## Setup

### Step 1: Gumawa ng Google Cloud Project

1. Pumunta sa [Google Cloud Console](https://console.cloud.google.com/)
2. I-click ang project dropdown sa itaas at piliin ang **New Project**
3. Pangalanan itong "Triggerfish" (o anumang gusto mo) at i-click ang **Create**

### Step 2: I-enable ang mga API

I-enable ang bawat isa sa mga API na ito sa iyong project:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

I-click ang **Enable** sa bawat page. Isang beses lang ito kailangang gawin bawat project.

### Step 3: I-configure ang OAuth Consent Screen

Bago ka makagawa ng credentials, kailangan ng Google ng OAuth consent screen. Ito ang screen na makikita ng users kapag nagbibigay ng access.

1. Pumunta sa [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. User type: piliin ang **External** (o **Internal** kung nasa Google Workspace organization ka at gusto mong org users lang)
3. I-click ang **Create**
4. I-fill in ang required fields:
   - **App name**: "Triggerfish" (o anumang gusto mo)
   - **User support email**: iyong email address
   - **Developer contact email**: iyong email address
5. I-click ang **Save and Continue**
6. Sa **Scopes** screen, i-click ang **Add or Remove Scopes** at idagdag ang:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. I-click ang **Update**, pagkatapos **Save and Continue**
8. Pumunta sa **Audience** page (sa left sidebar sa ilalim ng "OAuth consent screen") -- dito mo mahahanap ang **Test users** section
9. I-click ang **+ Add Users** at idagdag ang iyong Google email address
10. I-click ang **Save and Continue**, pagkatapos **Back to Dashboard**

::: warning Habang ang iyong app ay nasa "Testing" status, ang test users lang na idinagdag mo ang maaaring mag-authorize. Okay ito para sa personal use. Ang pag-publish ng app ay nag-aalis ng test user restriction pero nangangailangan ng Google verification. :::

### Step 4: Gumawa ng OAuth Credentials

1. Pumunta sa [Credentials](https://console.cloud.google.com/apis/credentials)
2. I-click ang **+ CREATE CREDENTIALS** sa itaas
3. Piliin ang **OAuth client ID**
4. Application type: **Desktop app**
5. Name: "Triggerfish" (o anumang gusto mo)
6. I-click ang **Create**
7. Kopyahin ang **Client ID** at **Client Secret**

### Step 5: Mag-connect

```bash
triggerfish connect google
```

Magpo-prompt para sa:

1. Iyong **Client ID**
2. Iyong **Client Secret**

Magbubukas ang browser window para bigyan ng access. Pagkatapos ng authorization, ligtas na ini-store ang tokens sa iyong OS keychain (macOS Keychain o Linux libsecret). Walang credentials na naka-store sa config files o environment variables.

### Mag-disconnect

```bash
triggerfish disconnect google
```

Inaalis ang lahat ng Google tokens mula sa iyong keychain. Maaari kang mag-reconnect anumang oras sa pamamagitan ng pagpapatakbo ulit ng `connect`.

## Mga Available Tool

Kapag connected na, may access ang iyong agent sa 14 tools:

| Tool              | Paglalarawan                                                     |
| ----------------- | ---------------------------------------------------------------- |
| `gmail_search`    | Maghanap ng emails ayon sa query (sumusuporta sa Gmail search syntax) |
| `gmail_read`      | Basahin ang specific email ayon sa ID                            |
| `gmail_send`      | Mag-compose at magpadala ng email                                |
| `gmail_label`     | Magdagdag o mag-alis ng labels sa message                        |
| `calendar_list`   | Ilista ang mga upcoming calendar events                          |
| `calendar_create` | Gumawa ng bagong calendar event                                  |
| `calendar_update` | Mag-update ng existing event                                     |
| `tasks_list`      | Ilista ang tasks mula sa Google Tasks                            |
| `tasks_create`    | Gumawa ng bagong task                                            |
| `tasks_complete`  | I-mark ang task bilang completed                                 |
| `drive_search`    | Maghanap ng files sa Google Drive                                |
| `drive_read`      | Basahin ang file contents (nag-e-export ng Google Docs bilang text) |
| `sheets_read`     | Basahin ang range mula sa spreadsheet                            |
| `sheets_write`    | Magsulat ng values sa spreadsheet range                          |

## Mga Halimbawa ng Interaction

Magtanong sa iyong agent ng mga tulad nito:

- "What's on my calendar today?"
- "Search my email for messages from alice@example.com"
- "Send an email to bob@example.com with the subject 'Meeting notes'"
- "Find the Q4 budget spreadsheet in Drive"
- "Add 'Buy groceries' to my task list"
- "Read cells A1:D10 from the Sales spreadsheet"

## Mga OAuth Scope

Hinihiling ng Triggerfish ang mga scope na ito sa authorization:

| Scope            | Access Level                                     |
| ---------------- | ------------------------------------------------ |
| `gmail.modify`   | Basahin, magpadala, at i-manage ang email at labels |
| `calendar`       | Buong read/write access sa Google Calendar       |
| `tasks`          | Buong read/write access sa Google Tasks          |
| `drive.readonly` | Read-only access sa Google Drive files           |
| `spreadsheets`   | Read at write access sa Google Sheets            |

::: tip Read-only ang Drive access. Maaaring maghanap at magbasa ng files ang Triggerfish pero hindi maaaring gumawa, mag-modify, o mag-delete ng mga ito. May hiwalay na write access ang Sheets para sa spreadsheet cell updates. :::

## Security

- Lahat ng Google Workspace data ay classified na hindi bababa sa **INTERNAL**
- Ang email content, calendar details, at document contents ay karaniwang **CONFIDENTIAL**
- Ang tokens ay naka-store sa OS keychain (macOS Keychain / Linux libsecret)
- Ang client credentials ay naka-store kasama ng tokens sa keychain, hindi kailanman sa environment variables o config files
- Naa-apply ang [No Write-Down rule](/fil-PH/security/no-write-down): hindi maaaring dumaloy ang CONFIDENTIAL Google data sa PUBLIC channels
- Lahat ng tool calls ay nilo-log sa audit trail na may buong classification context

## Troubleshooting

### "No Google tokens found"

Patakbuhin ang `triggerfish connect google` para mag-authenticate.

### "Google refresh token revoked or expired"

Ang iyong refresh token ay na-invalidate (hal., nag-revoke ka ng access sa Google Account settings). Patakbuhin ang `triggerfish connect google` para mag-reconnect.

### "Access blocked: has not completed the Google verification process"

Ibig sabihin nito hindi nakalista ang iyong Google account bilang test user para sa app. Habang ang app ay nasa "Testing" status (ang default), ang mga accounts lang na eksplisitong idinagdag bilang test users ang maaaring mag-authorize.

1. Pumunta sa [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Pumunta sa **Audience** page (sa left sidebar)
3. Sa **Test users** section, i-click ang **+ Add Users** at idagdag ang iyong Google email address
4. I-save at subukan ulit ang `triggerfish connect google`

### "Token exchange failed"

I-double-check ang iyong Client ID at Client Secret. Siguraduhing:

- Ang OAuth client type ay "Desktop app"
- Lahat ng required APIs ay naka-enable sa iyong Google Cloud project
- Nakalista ang iyong Google account bilang test user (kung nasa testing mode ang app)

### Hindi naka-enable ang APIs

Kung makakita ka ng 403 errors para sa specific services, siguraduhing naka-enable ang kaukulang API sa iyong [Google Cloud Console API Library](https://console.cloud.google.com/apis/library).
