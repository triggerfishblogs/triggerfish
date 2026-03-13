# Google Workspace

Agent ಗೆ Gmail, Calendar, Tasks, Drive, ಮತ್ತು Sheets ಪ್ರವೇಶ ನೀಡಲು Google account
ಸಂಪರ್ಕಿಸಿ.

## Prerequisites

- Google account
- OAuth credentials ಜೊತೆ Google Cloud project

## Setup

### Step 1: Google Cloud Project ತಯಾರಿಸಿ

1. [Google Cloud Console](https://console.cloud.google.com/) ಗೆ ಹೋಗಿ
2. ಮೇಲ್ಭಾಗದ project dropdown ಕ್ಲಿಕ್ ಮಾಡಿ **New Project** ಆಯ್ಕೆ ಮಾಡಿ
3. "Triggerfish" (ಅಥವಾ ನಿಮಗಿಷ್ಟದ ಹೆಸರು) ಇಡಿ ಮತ್ತು **Create** ಕ್ಲಿಕ್ ಮಾಡಿ

### Step 2: APIs Enable ಮಾಡಿ

ನಿಮ್ಮ project ನಲ್ಲಿ ಈ APIs enable ಮಾಡಿ:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

ಪ್ರತಿ page ನಲ್ಲಿ **Enable** ಕ್ಲಿಕ್ ಮಾಡಿ. ಪ್ರತಿ project ಗೆ ಒಮ್ಮೆ ಮಾತ್ರ ಮಾಡಬೇಕು.

### Step 3: OAuth Consent Screen Configure ಮಾಡಿ

Credentials ತಯಾರಿಸುವ ಮೊದಲು Google OAuth consent screen ಅಗತ್ಯ. ಇದು users
access grant ಮಾಡುವಾಗ ನೋಡುವ screen.

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) ಗೆ ಹೋಗಿ
2. User type: **External** ಆಯ್ಕೆ ಮಾಡಿ (ಅಥವಾ Google Workspace organization ನಲ್ಲಿದ್ದರೆ
   ಮತ್ತು org users ಮಾತ್ರ ಬೇಕಾದರೆ **Internal**)
3. **Create** ಕ್ಲಿಕ್ ಮಾಡಿ
4. Required fields fill ಮಾಡಿ:
   - **App name**: "Triggerfish" (ಅಥವಾ ನಿಮಗಿಷ್ಟದ್ದು)
   - **User support email**: ನಿಮ್ಮ email address
   - **Developer contact email**: ನಿಮ್ಮ email address
5. **Save and Continue** ಕ್ಲಿಕ್ ಮಾಡಿ
6. **Scopes** screen ನಲ್ಲಿ **Add or Remove Scopes** ಕ್ಲಿಕ್ ಮಾಡಿ ಮತ್ತು ಸೇರಿಸಿ:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. **Update** ಕ್ಲಿಕ್ ಮಾಡಿ, ನಂತರ **Save and Continue**
8. Left sidebar ನಲ್ಲಿ **Audience** page ಗೆ ಹೋಗಿ -- **Test users** section ಇಲ್ಲಿ ಸಿಗುತ್ತದೆ
9. **+ Add Users** ಕ್ಲಿಕ್ ಮಾಡಿ ನಿಮ್ಮ Google email address ಸೇರಿಸಿ
10. **Save and Continue** ಕ್ಲಿಕ್ ಮಾಡಿ, ನಂತರ **Back to Dashboard**

::: warning App "Testing" status ನಲ್ಲಿ ಇರುವಾಗ, ನೀವು add ಮಾಡಿದ test users ಮಾತ್ರ
authorize ಮಾಡಬಹುದು. Personal use ಗಾಗಿ ಇದು fine. App publish ಮಾಡಿದರೆ test user
restriction ತೆಗೆದು ಹೋಗುತ್ತದೆ ಆದರೆ Google verification ಅಗತ್ಯ. :::

### Step 4: OAuth Credentials ತಯಾರಿಸಿ

1. [Credentials](https://console.cloud.google.com/apis/credentials) ಗೆ ಹೋಗಿ
2. ಮೇಲ್ಭಾಗದಲ್ಲಿ **+ CREATE CREDENTIALS** ಕ್ಲಿಕ್ ಮಾಡಿ
3. **OAuth client ID** ಆಯ್ಕೆ ಮಾಡಿ
4. Application type: **Desktop app**
5. Name: "Triggerfish" (ಅಥವಾ ನಿಮಗಿಷ್ಟದ್ದು)
6. **Create** ಕ್ಲಿಕ್ ಮಾಡಿ
7. **Client ID** ಮತ್ತು **Client Secret** copy ಮಾಡಿ

### Step 5: Connect ಮಾಡಿ

```bash
triggerfish connect google
```

ಇವನ್ನು ಕೇಳಲ್ಪಡುತ್ತದೆ:

1. ನಿಮ್ಮ **Client ID**
2. ನಿಮ್ಮ **Client Secret**

Access grant ಮಾಡಲು browser window ತೆರೆಯುತ್ತದೆ. Authorization ನಂತರ, tokens OS
keychain ನಲ್ಲಿ ಸುರಕ್ಷಿತವಾಗಿ store ಮಾಡಲ್ಪಡುತ್ತವೆ (macOS Keychain ಅಥವಾ Linux libsecret).
Config files ಅಥವಾ environment variables ನಲ್ಲಿ credentials store ಮಾಡಲ್ಪಡುವುದಿಲ್ಲ.

### Disconnect ಮಾಡಿ

```bash
triggerfish disconnect google
```

ನಿಮ್ಮ keychain ನಿಂದ ಎಲ್ಲ Google tokens ತೆಗೆಯುತ್ತದೆ. ಯಾವ ಸಮಯದಲ್ಲಾದರೂ `connect`
ಚಲಾಯಿಸಿ reconnect ಮಾಡಬಹುದು.

## ಲಭ್ಯ Tools

Connect ಆದ ನಂತರ, agent ಗೆ 14 tools ಪ್ರವೇಶ ಸಿಗುತ್ತದೆ:

| Tool              | ವಿವರಣೆ                                                   |
| ----------------- | --------------------------------------------------------- |
| `gmail_search`    | Query ಮೂಲಕ emails ಹುಡುಕಿ (Gmail search syntax ಬೆಂಬಲ)    |
| `gmail_read`      | ID ಮೂಲಕ specific email ಓದಿ                               |
| `gmail_send`      | Email compose ಮತ್ತು send ಮಾಡಿ                             |
| `gmail_label`     | Message ನಲ್ಲಿ labels add ಅಥವಾ remove ಮಾಡಿ               |
| `calendar_list`   | Upcoming calendar events list ಮಾಡಿ                        |
| `calendar_create` | ಹೊಸ calendar event ತಯಾರಿಸಿ                               |
| `calendar_update` | Existing event update ಮಾಡಿ                               |
| `tasks_list`      | Google Tasks ನಿಂದ tasks list ಮಾಡಿ                        |
| `tasks_create`    | ಹೊಸ task ತಯಾರಿಸಿ                                         |
| `tasks_complete`  | Task completed ಎಂದು mark ಮಾಡಿ                            |
| `drive_search`    | Google Drive ನಲ್ಲಿ files ಹುಡುಕಿ                          |
| `drive_read`      | File contents ಓದಿ (Google Docs text ಆಗಿ export ಮಾಡಲ್ಪಡುತ್ತದೆ) |
| `sheets_read`     | Spreadsheet ನ range ಓದಿ                                   |
| `sheets_write`    | Spreadsheet range ಗೆ values write ಮಾಡಿ                   |

## Example Interactions

ನಿಮ್ಮ agent ಗೆ ಇಂತಹ ವಿಷಯಗಳನ್ನು ಕೇಳಿ:

- "ಇಂದು ನನ್ನ calendar ನಲ್ಲಿ ಏನಿದೆ?"
- "alice@example.com ನಿಂದ messages ಗಾಗಿ ನನ್ನ email ಹುಡುಕಿ"
- "bob@example.com ಗೆ 'Meeting notes' subject ಜೊತೆ email ಕಳಿಸಿ"
- "Drive ನಲ್ಲಿ Q4 budget spreadsheet ಹುಡುಕಿ"
- "ನನ್ನ task list ಗೆ 'Buy groceries' ಸೇರಿಸಿ"
- "Sales spreadsheet ನ A1:D10 cells ಓದಿ"

## OAuth Scopes

Authorization ಸಮಯದಲ್ಲಿ Triggerfish ಈ scopes request ಮಾಡುತ್ತದೆ:

| Scope            | Access Level                                |
| ---------------- | ------------------------------------------- |
| `gmail.modify`   | Email ಮತ್ತು labels read, send, ಮತ್ತು manage |
| `calendar`       | Google Calendar ಗೆ full read/write access   |
| `tasks`          | Google Tasks ಗೆ full read/write access      |
| `drive.readonly` | Google Drive files ಗೆ read-only access      |
| `spreadsheets`   | Google Sheets ಗೆ read ಮತ್ತು write access    |

::: tip Drive access read-only. Triggerfish ನಿಮ್ಮ files search ಮತ್ತು read ಮಾಡಬಹುದು
ಆದರೆ create, modify, ಅಥವಾ delete ಮಾಡಲಾಗದು. Sheets ಗೆ spreadsheet cell updates
ಗಾಗಿ separate write access ಇದೆ. :::

## Security

- ಎಲ್ಲ Google Workspace data ಕನಿಷ್ಠ **INTERNAL** ಆಗಿ classify ಮಾಡಲ್ಪಡುತ್ತದೆ
- Email content, calendar details, ಮತ್ತು document contents ಸಾಮಾನ್ಯವಾಗಿ **CONFIDENTIAL**
- Tokens OS keychain ನಲ್ಲಿ store ಮಾಡಲ್ಪಡುತ್ತವೆ (macOS Keychain / Linux libsecret)
- Client credentials tokens ಜೊತೆ keychain ನಲ್ಲಿ store ಮಾಡಲ್ಪಡುತ್ತವೆ, environment
  variables ಅಥವಾ config files ನಲ್ಲಿ ಅಲ್ಲ
- [No Write-Down rule](/kn-IN/security/no-write-down) ಅನ್ವಯಿಸುತ್ತದೆ: CONFIDENTIAL
  Google data PUBLIC channels ಗೆ flow ಮಾಡಲಾಗದು
- ಎಲ್ಲ tool calls audit trail ನಲ್ಲಿ full classification context ಜೊತೆ log ಮಾಡಲ್ಪಡುತ್ತವೆ

## Troubleshooting

### "No Google tokens found"

Authenticate ಮಾಡಲು `triggerfish connect google` ಚಲಾಯಿಸಿ.

### "Google refresh token revoked or expired"

ನಿಮ್ಮ refresh token invalidate ಮಾಡಲ್ಪಟ್ಟಿದೆ (ಉದಾ. Google Account settings ನಲ್ಲಿ
access revoke ಮಾಡಿದ್ದೀರಿ). Reconnect ಮಾಡಲು `triggerfish connect google` ಚಲಾಯಿಸಿ.

### "Access blocked: has not completed the Google verification process"

ನಿಮ್ಮ Google account app ಗಾಗಿ test user ಆಗಿ listed ಆಗಿಲ್ಲ. App "Testing" status
ನಲ್ಲಿ ಇರುವಾಗ (default), explicitly test users ಆಗಿ add ಮಾಡಿದ accounts ಮಾತ್ರ authorize
ಮಾಡಬಹುದು.

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) ಗೆ ಹೋಗಿ
2. Left sidebar ನಲ್ಲಿ **Audience** page ಗೆ ಹೋಗಿ
3. **Test users** section ನಲ್ಲಿ **+ Add Users** ಕ್ಲಿಕ್ ಮಾಡಿ ನಿಮ್ಮ Google email
   address ಸೇರಿಸಿ
4. Save ಮಾಡಿ `triggerfish connect google` ಮತ್ತೆ try ಮಾಡಿ

### "Token exchange failed"

Client ID ಮತ್ತು Client Secret double-check ಮಾಡಿ. ಖಾತರಿ ಮಾಡಿ:

- OAuth client type "Desktop app" ಆಗಿದೆ
- Google Cloud project ನಲ್ಲಿ ಎಲ್ಲ required APIs enable ಮಾಡಲ್ಪಟ್ಟಿವೆ
- App testing mode ನಲ್ಲಿ ಇದ್ದರೆ ನಿಮ್ಮ Google account test user ಆಗಿ listed ಆಗಿದೆ

### APIs enable ಮಾಡಲ್ಪಟ್ಟಿಲ್ಲ

Specific services ಗಾಗಿ 403 errors ಬಂದರೆ, [Google Cloud Console API Library](https://console.cloud.google.com/apis/library)
ನಲ್ಲಿ corresponding API enable ಮಾಡಲ್ಪಟ್ಟಿದೆಯೇ ಖಾತರಿ ಮಾಡಿ.
