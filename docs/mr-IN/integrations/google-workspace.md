# Google Workspace

तुमच्या एजंटला Gmail, Calendar, Tasks, Drive, आणि Sheets ला access देण्यासाठी
तुमचे Google account connect करा.

## Prerequisites

- Google account
- OAuth credentials सह Google Cloud project

## सेटअप

### पायरी 1: Google Cloud Project तयार करा

1. [Google Cloud Console](https://console.cloud.google.com/) ला जा
2. Top वरील project dropdown click करा आणि **New Project** निवडा
3. त्याला "Triggerfish" (किंवा तुम्हाला आवडेल ते काहीही) नाव द्या आणि **Create**
   क्लिक करा

### पायरी 2: APIs Enable करा

तुमच्या project मध्ये या प्रत्येक APIs enable करा:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

प्रत्येक page वर **Enable** click करा. हे per project फक्त एकदा करणे आवश्यक आहे.

### पायरी 3: OAuth Consent Screen Configure करा

Credentials create करण्यापूर्वी, Google ला OAuth consent screen आवश्यक आहे.
Access grant करताना users हे screen पाहतात.

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
   ला जा
2. User type: **External** निवडा (किंवा **Internal** जर तुम्ही Google Workspace
   organization वर असाल आणि फक्त org users हवे असतील)
3. **Create** क्लिक करा
4. Required fields fill in करा:
   - **App name**: "Triggerfish" (किंवा तुम्हाला आवडेल ते काहीही)
   - **User support email**: तुमचा email address
   - **Developer contact email**: तुमचा email address
5. **Save and Continue** क्लिक करा
6. **Scopes** screen वर, **Add or Remove Scopes** क्लिक करा आणि जोडा:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. **Update** क्लिक करा, नंतर **Save and Continue**
8. **Audience** page ला जा (left sidebar मध्ये "OAuth consent screen" खाली) --
   येथे तुम्हाला **Test users** section सापडेल
9. **+ Add Users** क्लिक करा आणि तुमचा स्वतःचा Google email address जोडा
10. **Save and Continue** क्लिक करा, नंतर **Back to Dashboard**

::: warning तुमचा app "Testing" status मध्ये असताना, फक्त तुम्ही जोडलेले test
users authorize करू शकतात. Personal use साठी हे ठीक आहे. App publish केल्याने
test user restriction remove होते पण Google verification आवश्यक आहे. :::

### पायरी 4: OAuth Credentials तयार करा

1. [Credentials](https://console.cloud.google.com/apis/credentials) ला जा
2. Top वर **+ CREATE CREDENTIALS** क्लिक करा
3. **OAuth client ID** निवडा
4. Application type: **Desktop app**
5. Name: "Triggerfish" (किंवा तुम्हाला आवडेल ते काहीही)
6. **Create** क्लिक करा
7. **Client ID** आणि **Client Secret** copy करा

### पायरी 5: Connect करा

```bash
triggerfish connect google
```

तुम्हाला prompt केले जाईल:

1. तुमचा **Client ID**
2. तुमचा **Client Secret**

Access grant करण्यासाठी browser window उघडेल. Authorization नंतर, tokens तुमच्या
OS keychain मध्ये securely stored आहेत (macOS Keychain किंवा Linux libsecret).
Config files किंवा environment variables मध्ये कोणतेही credentials stored नाहीत.

### Disconnect करा

```bash
triggerfish disconnect google
```

तुमच्या keychain मधून सर्व Google tokens remove करतो. `connect` पुन्हा run करून
कोणत्याही वेळी reconnect करू शकता.

## Available Tools

Connected झाल्यावर, तुमच्या एजंटला 14 tools उपलब्ध आहेत:

| Tool              | वर्णन                                                     |
| ----------------- | --------------------------------------------------------- |
| `gmail_search`    | Query नुसार emails search करा (Gmail search syntax support करतो) |
| `gmail_read`      | ID नुसार specific email वाचा                              |
| `gmail_send`      | Email compose आणि send करा                                |
| `gmail_label`     | Message वर labels जोडा किंवा remove करा                   |
| `calendar_list`   | Upcoming calendar events list करा                         |
| `calendar_create` | नवीन calendar event create करा                            |
| `calendar_update` | Existing event update करा                                 |
| `tasks_list`      | Google Tasks मधील tasks list करा                          |
| `tasks_create`    | नवीन task create करा                                      |
| `tasks_complete`  | Task completed म्हणून mark करा                            |
| `drive_search`    | Google Drive मध्ये files search करा                       |
| `drive_read`      | File contents वाचा (Google Docs text म्हणून export करतो) |
| `sheets_read`     | Spreadsheet मधून range वाचा                               |
| `sheets_write`    | Spreadsheet range ला values लिहा                          |

## Example Interactions

तुमच्या एजंटला विचारा:

- "आज माझ्या calendar वर काय आहे?"
- "alice@example.com कडील messages साठी माझ्या email मध्ये शोधा"
- "bob@example.com ला 'Meeting notes' subject सह email पाठवा"
- "Drive मध्ये Q4 budget spreadsheet शोधा"
- "माझ्या task list मध्ये 'Buy groceries' जोडा"
- "Sales spreadsheet मधील cells A1:D10 वाचा"

## OAuth Scopes

Authorization दरम्यान Triggerfish हे scopes request करतो:

| Scope            | Access Level                              |
| ---------------- | ----------------------------------------- |
| `gmail.modify`   | Email आणि labels read, send, आणि manage   |
| `calendar`       | Google Calendar ला Full read/write access |
| `tasks`          | Google Tasks ला Full read/write access    |
| `drive.readonly` | Google Drive files ला Read-only access    |
| `spreadsheets`   | Google Sheets ला Read आणि write access    |

::: tip Drive access read-only आहे. Triggerfish तुमच्या files search आणि read
करू शकतो पण create, modify, किंवा delete करू शकत नाही. Sheets ला spreadsheet
cell updates साठी separate write access आहे. :::

## Security

- सर्व Google Workspace data कमीत कमी **INTERNAL** म्हणून classified आहे
- Email content, calendar details, आणि document contents सहसा **CONFIDENTIAL**
  आहेत
- Tokens OS keychain मध्ये stored आहेत (macOS Keychain / Linux libsecret)
- Client credentials tokens सोबत keychain मध्ये stored आहेत, environment
  variables किंवा config files मध्ये नाहीत
- [No Write-Down rule](/mr-IN/security/no-write-down) लागू होतो: CONFIDENTIAL
  Google data PUBLIC channels ला flow करू शकत नाही
- सर्व tool calls full classification context सह audit trail मध्ये logged आहेत

## Troubleshooting

### "No Google tokens found"

Authenticate करण्यासाठी `triggerfish connect google` run करा.

### "Google refresh token revoked or expired"

तुमचा refresh token invalidated झाला (उदा., तुम्ही Google Account settings मध्ये
access revoke केला). Reconnect करण्यासाठी `triggerfish connect google` run करा.

### "Access blocked: has not completed the Google verification process"

याचा अर्थ तुमचे Google account app साठी test user म्हणून listed नाही. App
"Testing" status मध्ये असताना (default), फक्त explicitly test users म्हणून
added accounts authorize करू शकतात.

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
   ला जा
2. **Audience** page ला जा (left sidebar मध्ये)
3. **Test users** section मध्ये, **+ Add Users** click करा आणि तुमचा Google
   email address जोडा
4. Save करा आणि पुन्हा `triggerfish connect google` try करा

### "Token exchange failed"

तुमचे Client ID आणि Client Secret double-check करा. Ensure करा:

- OAuth client type "Desktop app" आहे
- तुमच्या Google Cloud project मध्ये सर्व required APIs enabled आहेत
- App testing mode मध्ये असल्यास तुमचे Google account test user म्हणून listed
  आहे

### APIs enabled नाहीत

Specific services साठी 403 errors दिसत असल्यास, [Google Cloud Console API
Library](https://console.cloud.google.com/apis/library) मध्ये corresponding API
enabled आहे ते ensure करा.
