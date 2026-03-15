# Google Workspace

اپنا Google account جوڑیں تاکہ آپ کے ایجنٹ کو Gmail، Calendar، Tasks، Drive، اور Sheets
تک رسائی ملے۔

## Prerequisites

- ایک Google account
- OAuth credentials کے ساتھ ایک Google Cloud project

## Setup

### قدم 1: Google Cloud Project بنائیں

1. [Google Cloud Console](https://console.cloud.google.com/) پر جائیں
2. اوپر project dropdown کلک کریں اور **New Project** منتخب کریں
3. اسے "Triggerfish" نام دیں (یا کوئی بھی پسند) اور **Create** کلک کریں

### قدم 2: APIs فعال کریں

اپنے project میں ہر یہ API فعال کریں:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

ہر page پر **Enable** کلک کریں۔ یہ ہر project کے لیے صرف ایک بار کرنا ضروری ہے۔

### قدم 3: OAuth Consent Screen Configure کریں

Credentials بنانے سے پہلے، Google کو OAuth consent screen چاہیے۔

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) پر جائیں
2. User type: **External** منتخب کریں
3. **Create** کلک کریں
4. ضروری fields fill کریں:
   - **App name**: "Triggerfish"
   - **User support email**: آپ کا email address
   - **Developer contact email**: آپ کا email address
5. **Save and Continue** کلک کریں
6. **Scopes** screen پر، **Add or Remove Scopes** کلک کریں اور شامل کریں:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. **Update** کلک کریں، پھر **Save and Continue**
8. **Audience** page پر جائیں — یہ وہ جگہ ہے جہاں **Test users** section ملے گا
9. **+ Add Users** کلک کریں اور اپنا Google email address شامل کریں
10. **Save and Continue** کلک کریں، پھر **Back to Dashboard**

::: warning جب آپ کی app "Testing" status میں ہو، صرف آپ کے شامل کردہ test users authorize
کر سکتے ہیں۔ ذاتی استعمال کے لیے یہ ٹھیک ہے۔ :::

### قدم 4: OAuth Credentials بنائیں

1. [Credentials](https://console.cloud.google.com/apis/credentials) پر جائیں
2. اوپر **+ CREATE CREDENTIALS** کلک کریں
3. **OAuth client ID** منتخب کریں
4. Application type: **Desktop app**
5. Name: "Triggerfish"
6. **Create** کلک کریں
7. **Client ID** اور **Client Secret** copy کریں

### قدم 5: Connect کریں

```bash
triggerfish connect google
```

آپ سے پوچھا جائے گا:

1. آپ کی **Client ID**
2. آپ کی **Client Secret**

Access grant کرنے کے لیے browser window کھلے گی۔ Authorization کے بعد، tokens آپ کے
OS keychain میں محفوظ ہو جاتے ہیں۔ کوئی credentials config files یا environment variables
میں stored نہیں ہوتیں۔

### Disconnect کریں

```bash
triggerfish disconnect google
```

آپ کے keychain سے تمام Google tokens ہٹاتا ہے۔ آپ `connect` دوبارہ چلا کر کسی بھی
وقت reconnect کر سکتے ہیں۔

## Available Tools

Connect ہونے کے بعد، آپ کے ایجنٹ کے پاس 14 tools تک رسائی ہے:

| Tool              | تفصیل                                                        |
| ----------------- | ------------------------------------------------------------- |
| `gmail_search`    | Query سے emails تلاش کریں (Gmail search syntax support)       |
| `gmail_read`      | ID سے مخصوص email پڑھیں                                       |
| `gmail_send`      | Email compose اور send کریں                                   |
| `gmail_label`     | Message پر labels شامل یا ہٹائیں                              |
| `calendar_list`   | آنے والے calendar events list کریں                            |
| `calendar_create` | نیا calendar event بنائیں                                     |
| `calendar_update` | موجودہ event اپ ڈیٹ کریں                                     |
| `tasks_list`      | Google Tasks سے tasks list کریں                               |
| `tasks_create`    | نئی task بنائیں                                               |
| `tasks_complete`  | Task مکمل mark کریں                                           |
| `drive_search`    | Google Drive میں files تلاش کریں                              |
| `drive_read`      | File contents پڑھیں (Google Docs کو text کے طور پر export کرتا ہے) |
| `sheets_read`     | Spreadsheet سے range پڑھیں                                   |
| `sheets_write`    | Spreadsheet range میں values لکھیں                           |

## مثالی Interactions

اپنے ایجنٹ سے پوچھیں:

- "آج میرے calendar میں کیا ہے؟"
- "alice@example.com سے میری emails میں تلاش کریں"
- "bob@example.com کو 'Meeting notes' subject کے ساتھ email بھیجیں"
- "Drive میں Q4 budget spreadsheet تلاش کریں"
- "'Buy groceries' میری task list میں شامل کریں"
- "Sales spreadsheet سے cells A1:D10 پڑھیں"

## OAuth Scopes

Triggerfish authorization کے دوران یہ scopes request کرتا ہے:

| Scope            | Access Level                                  |
| ---------------- | ----------------------------------------------- |
| `gmail.modify`   | Email اور labels پڑھنا، بھیجنا، اور manage کرنا |
| `calendar`       | Google Calendar تک مکمل read/write رسائی        |
| `tasks`          | Google Tasks تک مکمل read/write رسائی           |
| `drive.readonly` | Google Drive files تک read-only رسائی           |
| `spreadsheets`   | Google Sheets تک read اور write رسائی           |

::: tip Drive رسائی read-only ہے۔ Triggerfish آپ کی files تلاش اور پڑھ سکتا ہے لیکن
بنا، modify، یا delete نہیں کر سکتا۔ Spreadsheet cell updates کے لیے Sheets کی الگ
write access ہے۔ :::

## Security

- تمام Google Workspace data کم از کم **INTERNAL** classified ہے
- Email content، calendar details، اور document contents عموماً **CONFIDENTIAL** ہیں
- Tokens OS keychain میں محفوظ ہوتے ہیں
- Client credentials tokens کے ساتھ keychain میں محفوظ، environment variables یا config
  files میں کبھی نہیں
- [No Write-Down قاعدہ](/ur-PK/security/no-write-down) لاگو ہوتا ہے: CONFIDENTIAL
  Google data PUBLIC channels کی طرف نہیں بہہ سکتا
- تمام tool calls مکمل classification context کے ساتھ audit trail میں logged ہوتی ہیں

## Troubleshooting

### "No Google tokens found"

Authentication کے لیے `triggerfish connect google` چلائیں۔

### "Google refresh token revoked or expired"

آپ کا refresh token invalidate ہو گیا (مثلاً، آپ نے Google Account settings میں
رسائی revoke کی)۔ Reconnect کرنے کے لیے `triggerfish connect google` چلائیں۔

### "Access blocked: has not completed the Google verification process"

اس کا مطلب ہے آپ کا Google account app کے لیے test user کے طور پر listed نہیں ہے۔

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) پر جائیں
2. **Audience** page پر جائیں
3. **Test users** section میں، **+ Add Users** کلک کریں اور اپنا Google email شامل کریں
4. Save کریں اور `triggerfish connect google` دوبارہ آزمائیں

### "Token exchange failed"

اپنے Client ID اور Client Secret دوبارہ چیک کریں۔ یقینی بنائیں:

- OAuth client type "Desktop app" ہے
- آپ کے Google Cloud project میں تمام required APIs فعال ہیں
- آپ کا Google account test user کے طور پر listed ہے
