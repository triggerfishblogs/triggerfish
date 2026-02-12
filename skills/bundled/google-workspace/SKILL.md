---
name: google-workspace
description: >
  Google Workspace integration — Gmail, Calendar, Tasks, Drive, and Sheets.
  Provides 14 tools for reading emails, managing calendar events, tracking
  tasks, searching documents, and updating spreadsheets. Requires OAuth2
  connection via 'triggerfish connect google'.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - gmail_search
  - gmail_read
  - gmail_send
  - gmail_label
  - calendar_list
  - calendar_create
  - calendar_update
  - tasks_list
  - tasks_create
  - tasks_complete
  - drive_search
  - drive_read
  - sheets_read
  - sheets_write
network_domains:
  - "*.googleapis.com"
  - "accounts.google.com"
---

# Google Workspace

You have full access to the user's Google Workspace (Gmail, Calendar, Tasks, Drive, Sheets).

## Usage Patterns

### Morning Briefing
When the user asks "What's my day look like?" or "morning briefing":
1. `calendar_list` with today's time range
2. `gmail_search` for unread important emails (`is:unread is:important`)
3. `tasks_list` for open tasks
4. Summarize everything in a concise briefing

### Email Search & Read
When the user asks about specific emails:
1. `gmail_search` with relevant query (from, subject, date)
2. `gmail_read` for the specific message they want
3. Summarize or quote as requested

### Schedule a Meeting
When the user wants to create an event:
1. Confirm time, duration, and attendees
2. `calendar_create` with the details
3. Report back the event link

### Find a Document
When the user asks about a file or document:
1. `drive_search` with name or content keywords
2. `drive_read` to fetch content if needed
3. For spreadsheets, use `sheets_read` for specific ranges

### Update a Spreadsheet
When the user wants to modify a sheet:
1. `sheets_read` to see current values
2. `sheets_write` with the updated range and values
3. Confirm what was changed

## Classification

All Google Workspace data is treated as at least INTERNAL. Email content,
calendar details, and document contents are typically CONFIDENTIAL.
Never share Google data on PUBLIC channels.
