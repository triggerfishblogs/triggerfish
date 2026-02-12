# Google Workspace

Connect your Google account to give your agent access to Gmail, Calendar, Tasks, Drive, and Sheets.

## Prerequisites

- A Google account
- A Google Cloud project with OAuth credentials

## Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top and select **New Project**
3. Name it "Triggerfish" (or anything you prefer) and click **Create**

### Step 2: Enable APIs

Enable each of these APIs in your project:

- [Gmail API](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
- [Google Calendar API](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
- [Google Tasks API](https://console.cloud.google.com/apis/library/tasks.googleapis.com)
- [Google Drive API](https://console.cloud.google.com/apis/library/drive.googleapis.com)
- [Google Sheets API](https://console.cloud.google.com/apis/library/sheets.googleapis.com)

Click **Enable** on each page. This only needs to be done once per project.

### Step 3: Configure the OAuth Consent Screen

Before you can create credentials, Google requires an OAuth consent screen. This is the screen users see when granting access.

1. Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. User type: select **External** (or **Internal** if you're on a Google Workspace organization and only want org users)
3. Click **Create**
4. Fill in the required fields:
   - **App name**: "Triggerfish" (or anything you like)
   - **User support email**: your email address
   - **Developer contact email**: your email address
5. Click **Save and Continue**
6. On the **Scopes** screen, click **Add or Remove Scopes** and add:
   - `https://www.googleapis.com/auth/gmail.modify`
   - `https://www.googleapis.com/auth/calendar`
   - `https://www.googleapis.com/auth/tasks`
   - `https://www.googleapis.com/auth/drive.readonly`
   - `https://www.googleapis.com/auth/spreadsheets`
7. Click **Update**, then **Save and Continue**
8. On the **Test users** screen, click **+ Add Users** and add your own Google email address
9. Click **Save and Continue**, then **Back to Dashboard**

::: warning
While your app is in "Testing" status, only test users you've added can authorize. This is fine for personal use. Publishing the app removes the test user restriction but requires Google verification.
:::

### Step 4: Create OAuth Credentials

1. Go to [Credentials](https://console.cloud.google.com/apis/credentials)
2. Click **+ CREATE CREDENTIALS** at the top
3. Select **OAuth client ID**
4. Application type: **Desktop app**
5. Name: "Triggerfish" (or anything you like)
6. Click **Create**
7. Copy the **Client ID** and **Client Secret**

### Step 5: Connect

```bash
triggerfish connect google
```

You'll be prompted for:
1. Your **Client ID**
2. Your **Client Secret**

A browser window will open for you to grant access. After authorization, tokens are stored securely in your OS keychain (macOS Keychain or Linux libsecret). No credentials are stored in config files or environment variables.

### Disconnect

```bash
triggerfish disconnect google
```

Removes all Google tokens from your keychain. You can reconnect at any time by running `connect` again.

## Available Tools

Once connected, your agent has access to 14 tools:

| Tool | Description |
|------|-------------|
| `gmail_search` | Search emails by query (supports Gmail search syntax) |
| `gmail_read` | Read a specific email by ID |
| `gmail_send` | Compose and send an email |
| `gmail_label` | Add or remove labels on a message |
| `calendar_list` | List upcoming calendar events |
| `calendar_create` | Create a new calendar event |
| `calendar_update` | Update an existing event |
| `tasks_list` | List tasks from Google Tasks |
| `tasks_create` | Create a new task |
| `tasks_complete` | Mark a task as completed |
| `drive_search` | Search files in Google Drive |
| `drive_read` | Read file contents (exports Google Docs as text) |
| `sheets_read` | Read a range from a spreadsheet |
| `sheets_write` | Write values to a spreadsheet range |

## Example Interactions

Ask your agent things like:

- "What's on my calendar today?"
- "Search my email for messages from alice@example.com"
- "Send an email to bob@example.com with the subject 'Meeting notes'"
- "Find the Q4 budget spreadsheet in Drive"
- "Add 'Buy groceries' to my task list"
- "Read cells A1:D10 from the Sales spreadsheet"

## OAuth Scopes

Triggerfish requests these scopes during authorization:

| Scope | Access Level |
|-------|-------------|
| `gmail.modify` | Read, send, and manage email and labels |
| `calendar` | Full read/write access to Google Calendar |
| `tasks` | Full read/write access to Google Tasks |
| `drive.readonly` | Read-only access to Google Drive files |
| `spreadsheets` | Read and write access to Google Sheets |

::: tip
Drive access is read-only. Triggerfish can search and read your files but cannot create, modify, or delete them. Sheets has separate write access for spreadsheet cell updates.
:::

## Security

- All Google Workspace data is classified as at least **INTERNAL**
- Email content, calendar details, and document contents are typically **CONFIDENTIAL**
- Tokens are stored in the OS keychain (macOS Keychain / Linux libsecret)
- Client credentials are stored alongside tokens in the keychain, never in environment variables or config files
- The [No Write-Down rule](/security/no-write-down) applies: CONFIDENTIAL Google data cannot flow to PUBLIC channels
- All tool calls are logged in the audit trail with full classification context

## Troubleshooting

### "No Google tokens found"

Run `triggerfish connect google` to authenticate.

### "Google refresh token revoked or expired"

Your refresh token was invalidated (e.g., you revoked access in Google Account settings). Run `triggerfish connect google` to reconnect.

### "Access blocked: has not completed the Google verification process"

This means your Google account is not listed as a test user for the app. While the app is in "Testing" status (the default), only accounts explicitly added as test users can authorize.

1. Go to [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent)
2. Click **Edit App**
3. Click through to the **Test users** screen
4. Click **+ Add Users** and add your Google email address
5. Save and try `triggerfish connect google` again

### "Token exchange failed"

Double-check your Client ID and Client Secret. Make sure:
- The OAuth client type is "Desktop app"
- All required APIs are enabled in your Google Cloud project
- Your Google account is listed as a test user (if the app is in testing mode)

### APIs not enabled

If you see 403 errors for specific services, ensure the corresponding API is enabled in your [Google Cloud Console API Library](https://console.cloud.google.com/apis/library).
