# Google Workspace

अपने agent को Gmail, Calendar, Tasks, Drive, और Sheets तक पहुँच देने के लिए
अपना Google account कनेक्ट करें।

## पूर्वापेक्षाएँ

- एक Google account
- OAuth credentials के साथ एक Google Cloud project

## सेटअप

### चरण 1: Google Cloud Project बनाएँ

1. [Google Cloud Console](https://console.cloud.google.com/) पर जाएँ
2. ऊपर project dropdown क्लिक करें और **New Project** चुनें
3. इसे "Triggerfish" (या जो आप पसंद करें) नाम दें और **Create** क्लिक करें

### चरण 2: APIs सक्षम करें

अपने project में इनमें से प्रत्येक API सक्षम करें:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

प्रत्येक पृष्ठ पर **Enable** क्लिक करें। यह प्रति project केवल एक बार करना होगा।

### चरण 3: OAuth Consent Screen कॉन्फ़िगर करें

Credentials बनाने से पहले, Google को OAuth consent screen की आवश्यकता है।

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) पर जाएँ
2. User type: **External** चुनें (या **Internal** यदि आप Google Workspace
   organization पर हैं और केवल org users चाहते हैं)
3. **Create** क्लिक करें
4. आवश्यक fields भरें:
   - **App name**: "Triggerfish" (या जो आप पसंद करें)
   - **User support email**: आपका email पता
   - **Developer contact email**: आपका email पता
5. **Save and Continue** क्लिक करें
6. **Scopes** screen पर, **Add or Remove Scopes** क्लिक करें और जोड़ें:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. **Update** क्लिक करें, फिर **Save and Continue**
8. **Audience** पृष्ठ पर जाएँ (बाएँ sidebar में) -- यहाँ **Test users** अनुभाग है
9. **+ Add Users** क्लिक करें और अपना Google email पता जोड़ें
10. **Save and Continue** क्लिक करें, फिर **Back to Dashboard**

::: warning जब आपका app "Testing" स्थिति में है, केवल आपके द्वारा जोड़े गए test
users authorize कर सकते हैं। व्यक्तिगत उपयोग के लिए यह ठीक है। App publish
करने से test user प्रतिबंध हटता है लेकिन Google verification आवश्यक है। :::

### चरण 4: OAuth Credentials बनाएँ

1. [Credentials](https://console.cloud.google.com/apis/credentials) पर जाएँ
2. ऊपर **+ CREATE CREDENTIALS** क्लिक करें
3. **OAuth client ID** चुनें
4. Application type: **Desktop app**
5. Name: "Triggerfish" (या जो आप पसंद करें)
6. **Create** क्लिक करें
7. **Client ID** और **Client Secret** कॉपी करें

### चरण 5: कनेक्ट करें

```bash
triggerfish connect google
```

आपसे माँगा जाएगा:

1. आपकी **Client ID**
2. आपकी **Client Secret**

पहुँच प्रदान करने के लिए एक browser window खुलेगी। Authorization के बाद, tokens
सुरक्षित रूप से आपके OS keychain (macOS Keychain या Linux libsecret) में संग्रहीत
होते हैं। Config files या environment variables में कोई credentials संग्रहीत नहीं
होतीं।

### डिस्कनेक्ट करें

```bash
triggerfish disconnect google
```

आपके keychain से सभी Google tokens हटाता है। आप कभी भी `connect` फिर से
चलाकर पुनः कनेक्ट कर सकते हैं।

## उपलब्ध Tools

कनेक्ट होने पर, आपके agent के पास 14 tools तक पहुँच है:

| Tool              | विवरण                                                    |
| ----------------- | -------------------------------------------------------- |
| `gmail_search`    | Query द्वारा emails खोजें (Gmail search syntax समर्थित)    |
| `gmail_read`      | ID द्वारा विशिष्ट email पढ़ें                               |
| `gmail_send`      | Email compose और भेजें                                    |
| `gmail_label`     | Message पर labels जोड़ें या हटाएँ                           |
| `calendar_list`   | आगामी calendar events सूचीबद्ध करें                        |
| `calendar_create` | नया calendar event बनाएँ                                  |
| `calendar_update` | मौजूदा event अपडेट करें                                    |
| `tasks_list`      | Google Tasks से tasks सूचीबद्ध करें                         |
| `tasks_create`    | नया task बनाएँ                                            |
| `tasks_complete`  | Task को completed चिह्नित करें                              |
| `drive_search`    | Google Drive में files खोजें                               |
| `drive_read`      | File सामग्री पढ़ें (Google Docs को text के रूप में export करता है) |
| `sheets_read`     | Spreadsheet से range पढ़ें                                  |
| `sheets_write`    | Spreadsheet range में values लिखें                          |

## OAuth Scopes

Triggerfish authorization के दौरान ये scopes अनुरोध करता है:

| Scope            | पहुँच स्तर                                     |
| ---------------- | ---------------------------------------------- |
| `gmail.modify`   | Email और labels पढ़ें, भेजें, और प्रबंधित करें    |
| `calendar`       | Google Calendar तक पूर्ण read/write पहुँच         |
| `tasks`          | Google Tasks तक पूर्ण read/write पहुँच            |
| `drive.readonly` | Google Drive files तक read-only पहुँच            |
| `spreadsheets`   | Google Sheets तक read और write पहुँच             |

::: tip Drive access read-only है। Triggerfish आपकी files खोज और पढ़ सकता है
लेकिन बना, संशोधित, या हटा नहीं सकता। Sheets की spreadsheet cell अपडेट के लिए
अलग write access है। :::

## सुरक्षा

- सभी Google Workspace डेटा कम से कम **INTERNAL** वर्गीकृत है
- Email सामग्री, calendar विवरण, और document contents आमतौर पर **CONFIDENTIAL** हैं
- Tokens OS keychain (macOS Keychain / Linux libsecret) में संग्रहीत हैं
- Client credentials tokens के साथ keychain में संग्रहीत हैं, कभी environment
  variables या config files में नहीं
- [No Write-Down नियम](/hi-IN/security/no-write-down) लागू होता है: CONFIDENTIAL
  Google डेटा PUBLIC channels पर प्रवाहित नहीं हो सकता
- सभी tool calls पूर्ण classification संदर्भ के साथ ऑडिट trail में लॉग होते हैं

## समस्या निवारण

### "No Google tokens found"

Authenticate करने के लिए `triggerfish connect google` चलाएँ।

### "Google refresh token revoked or expired"

आपका refresh token अमान्य कर दिया गया (जैसे Google Account settings में access
revoke किया)। पुनः कनेक्ट करने के लिए `triggerfish connect google` चलाएँ।

### "Access blocked: has not completed the Google verification process"

इसका अर्थ है कि आपका Google account app के लिए test user के रूप में सूचीबद्ध
नहीं है।

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent) पर जाएँ
2. **Audience** पृष्ठ पर जाएँ (बाएँ sidebar में)
3. **Test users** अनुभाग में, **+ Add Users** क्लिक करें और अपना Google email जोड़ें
4. Save करें और `triggerfish connect google` फिर से आज़माएँ

### "Token exchange failed"

अपनी Client ID और Client Secret दोबारा जाँचें। सुनिश्चित करें:

- OAuth client type "Desktop app" है
- सभी आवश्यक APIs आपके Google Cloud project में सक्षम हैं
- आपका Google account test user के रूप में सूचीबद्ध है (यदि app testing mode में है)
