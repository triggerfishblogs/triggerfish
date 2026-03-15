# Google Workspace

உங்கள் agent க்கு Gmail, Calendar, Tasks, Drive, மற்றும் Sheets access கொடுக்க உங்கள் Google account connect செய்யவும்.

## Prerequisites

- ஒரு Google account
- OAuth credentials உடன் ஒரு Google Cloud project

## Setup

### படி 1: Google Cloud Project உருவாக்கவும்

1. [Google Cloud Console](https://console.cloud.google.com/) க்கு செல்லவும்
2. மேலே project dropdown click செய்து **New Project** தேர்வு செய்யவும்
3. "Triggerfish" (அல்லது விரும்பும் எதையாவது) என்று பெயரிட்டு **Create** click செய்யவும்

### படி 2: APIs Enable செய்யவும்

உங்கள் project இல் இந்த APIs ஒவ்வொன்றும் enable செய்யவும்:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

ஒவ்வொரு page இலும் **Enable** click செய்யவும். இது project ஒன்றிற்கு ஒரு முறை மட்டுமே செய்ய வேண்டும்.

### படி 3: OAuth Consent Screen கட்டமைக்கவும்

Credentials உருவாக்குவதற்கு முன்பு, Google ஒரு OAuth consent screen தேவைப்படுகிறது. Access கொடுக்கும்போது users பார்க்கும் screen இது.

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) க்கு செல்லவும்
2. User type: **External** தேர்வு செய்யவும் (அல்லது Google Workspace organization இல் இருந்தால் மற்றும் org users மட்டும் வேண்டுமென்றால் **Internal**)
3. **Create** click செய்யவும்
4. Required fields fill செய்யவும்:
   - **App name**: "Triggerfish" (அல்லது விரும்பும் எதையாவது)
   - **User support email**: உங்கள் email address
   - **Developer contact email**: உங்கள் email address
5. **Save and Continue** click செய்யவும்
6. **Scopes** screen இல், **Add or Remove Scopes** click செய்து சேர்க்கவும்:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. **Update**, பின்னர் **Save and Continue** click செய்யவும்
8. Left sidebar இல் "OAuth consent screen" இல் **Audience** page க்கு செல்லவும் -- இங்கே **Test users** section இருக்கும்
9. **+ Add Users** click செய்து உங்கள் Google email address சேர்க்கவும்
10. **Save and Continue**, பின்னர் **Back to Dashboard** click செய்யவும்

::: warning உங்கள் app "Testing" நிலையில் இருக்கும்போது, நீங்கள் சேர்த்த test users மட்டுமே authorize செய்யலாம். Personal use க்கு இது சரியானது. App publish செய்வது test user restriction நீக்குகிறது ஆனால் Google verification தேவை. :::

### படி 4: OAuth Credentials உருவாக்கவும்

1. [Credentials](https://console.cloud.google.com/apis/credentials) க்கு செல்லவும்
2. மேலே **+ CREATE CREDENTIALS** click செய்யவும்
3. **OAuth client ID** தேர்வு செய்யவும்
4. Application type: **Desktop app**
5. Name: "Triggerfish" (அல்லது விரும்பும் எதையாவது)
6. **Create** click செய்யவும்
7. **Client ID** மற்றும் **Client Secret** copy செய்யவும்

### படி 5: Connect செய்யவும்

```bash
triggerfish connect google
```

இதற்கு prompt ஆகும்:

1. உங்கள் **Client ID**
2. உங்கள் **Client Secret**

Access கொடுக்க browser window திறக்கும். Authorization க்கு பிறகு, tokens OS keychain இல் securely stored ஆகின்றன (macOS Keychain அல்லது Linux libsecret). Config files அல்லது environment variables இல் credentials stored ஆவதில்லை.

### Disconnect

```bash
triggerfish disconnect google
```

Keychain இலிருந்து அனைத்து Google tokens நீக்குகிறது. மீண்டும் `connect` இயக்கி எந்த நேரத்திலும் reconnect செய்யலாம்.

## Available Tools

Connect ஆன பிறகு, உங்கள் agent க்கு 14 tools access இருக்கும்:

| Tool              | விளக்கம்                                                    |
| ----------------- | ------------------------------------------------------------- |
| `gmail_search`    | Query மூலம் emails தேடவும் (Gmail search syntax support செய்கிறது) |
| `gmail_read`      | ID மூலம் specific email படிக்கவும்                          |
| `gmail_send`      | Email compose மற்றும் send செய்யவும்                        |
| `gmail_label`     | Message இல் labels சேர்க்கவும் அல்லது நீக்கவும்            |
| `calendar_list`   | Upcoming calendar events பட்டியலிடவும்                      |
| `calendar_create` | புதிய calendar event உருவாக்கவும்                          |
| `calendar_update` | Existing event update செய்யவும்                             |
| `tasks_list`      | Google Tasks இலிருந்து tasks பட்டியலிடவும்                  |
| `tasks_create`    | புதிய task உருவாக்கவும்                                    |
| `tasks_complete`  | Task ஐ completed என்று mark செய்யவும்                       |
| `drive_search`    | Google Drive இல் files தேடவும்                              |
| `drive_read`      | File contents படிக்கவும் (Google Docs ஐ text ஆக export செய்கிறது) |
| `sheets_read`     | Spreadsheet இலிருந்து range படிக்கவும்                     |
| `sheets_write`    | Spreadsheet range க்கு values எழுதவும்                     |

## Example Interactions

உங்கள் agent க்கு இப்படி கேளுங்கள்:

- "இன்று என் calendar இல் என்ன இருக்கிறது?"
- "alice@example.com இலிருந்து messages க்கு என் email தேடவும்"
- "bob@example.com க்கு 'Meeting notes' subject உடன் email அனுப்பவும்"
- "Drive இல் Q4 budget spreadsheet கண்டுபிடிக்கவும்"
- "என் task list இல் 'Buy groceries' சேர்க்கவும்"
- "Sales spreadsheet இலிருந்து cells A1:D10 படிக்கவும்"

## OAuth Scopes

Authorization போது Triggerfish இந்த scopes request செய்கிறது:

| Scope            | Access Level                                      |
| ---------------- | ------------------------------------------------- |
| `gmail.modify`   | Email மற்றும் labels படிக்கவும், அனுப்பவும், manage செய்யவும் |
| `calendar`       | Google Calendar க்கு Full read/write access       |
| `tasks`          | Google Tasks க்கு Full read/write access          |
| `drive.readonly` | Google Drive files க்கு Read-only access          |
| `spreadsheets`   | Google Sheets க்கு Read மற்றும் write access      |

::: tip Drive access read-only. Triggerfish உங்கள் files search மற்றும் read செய்யலாம் ஆனால் create, modify, அல்லது delete செய்ய முடியாது. Sheets க்கு spreadsheet cell updates க்கு separate write access உள்ளது. :::

## Security

- அனைத்து Google Workspace data உம் குறைந்தது **INTERNAL** ஆக classified
- Email content, calendar details, மற்றும் document contents பொதுவாக **CONFIDENTIAL**
- Tokens OS keychain இல் stored (macOS Keychain / Linux libsecret)
- Client credentials tokens உடன் keychain இல் stored, environment variables அல்லது config files இல் ஒருபோதும் அல்ல
- [No Write-Down விதி](/ta-IN/security/no-write-down) பொருந்துகிறது: CONFIDENTIAL Google data PUBLIC channels க்கு flow ஆக முடியாது
- அனைத்து tool calls உம் full classification context உடன் audit trail இல் logged

## Troubleshooting

### "No Google tokens found"

Authenticate செய்ய `triggerfish connect google` இயக்கவும்.

### "Google refresh token revoked or expired"

உங்கள் refresh token invalidated ஆனது (உதா., Google Account settings இல் access revoke செய்தீர்கள்). Reconnect செய்ய `triggerfish connect google` இயக்கவும்.

### "Access blocked: has not completed the Google verification process"

உங்கள் Google account app க்கு test user ஆக listed இல்லை என்று அர்த்தம். App "Testing" நிலையில் இருக்கும்போது (default), explicitly test users ஆக சேர்க்கப்பட்ட accounts மட்டுமே authorize செய்யலாம்.

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) க்கு செல்லவும்
2. Left sidebar இல் **Audience** page க்கு செல்லவும்
3. **Test users** section இல், **+ Add Users** click செய்து உங்கள் Google email address சேர்க்கவும்
4. Save செய்து மீண்டும் `triggerfish connect google` try செய்யவும்

### "Token exchange failed"

உங்கள் Client ID மற்றும் Client Secret double-check செய்யவும். உறுதிப்படுத்தவும்:

- OAuth client type "Desktop app"
- உங்கள் Google Cloud project இல் அனைத்து required APIs enabled
- App testing mode இல் இருந்தால் உங்கள் Google account test user ஆக listed

### APIs enabled ஆகவில்லை

Specific services க்கு 403 errors பார்த்தால், corresponding API உங்கள் [Google Cloud Console API Library](https://console.cloud.google.com/apis/library) இல் enabled என்று உறுதிப்படுத்தவும்.
