---
name: browser-automation
description: >
  Browser automation via Chromium CDP. Navigate websites, take screenshots,
  click elements, fill forms, and extract page content. Supports Flatpak
  Chrome and direct Chromium installs. Auto-launches on first use.
classification_ceiling: CONFIDENTIAL
requires_tools:
  - browser_navigate
  - browser_snapshot
  - browser_describe
  - browser_click
  - browser_type
  - browser_select
  - browser_scroll
  - browser_wait
network_domains:
  - "*"
---

# Browser Automation

You have access to a Chromium browser for web interaction. The browser launches automatically on first use — just call the tools directly.

## Tools

| Tool | Purpose |
|------|---------|
| `browser_navigate` | Go to a URL (http/https only) |
| `browser_snapshot` | Screenshot + extract visible text |
| `browser_describe` | Send the screenshot to a vision model for a visual description |
| `browser_click` | Click an element by CSS selector |
| `browser_type` | Type text into an input field |
| `browser_select` | Select a dropdown option |
| `browser_scroll` | Scroll up/down/left/right |
| `browser_wait` | Wait for an element or a duration |

## Usage Patterns

### Visit a Website
When the user asks to go to a website:
1. `browser_navigate` with the URL
2. `browser_snapshot` to see the page and extract text
3. Report what you see

### Get a Visual Description
When text extraction isn't enough (complex layouts, images, charts):
1. `browser_snapshot` to capture the page
2. `browser_describe` to get a vision model's description of the screenshot
3. You can pass a `prompt` to guide the description (e.g., "What error is shown?")

### Fill Out a Form
When the user wants to interact with a web form:
1. `browser_navigate` to the page
2. `browser_snapshot` to identify form fields
3. `browser_type` to fill text inputs
4. `browser_select` for dropdowns
5. `browser_click` on the submit button
6. `browser_snapshot` to confirm result

### Read Page Content
When the user wants to know what's on a page:
1. `browser_navigate` to the URL
2. `browser_snapshot` to get text content
3. `browser_scroll` down + `browser_snapshot` to get more content if needed

### Wait for Dynamic Content
When a page loads content asynchronously:
1. `browser_wait` with a CSS selector for the expected element
2. Then `browser_snapshot` to read the loaded content

## Important Notes

- The browser auto-launches when you call any browser tool. You do not need to start it manually.
- Only http and https URLs are allowed. Private/reserved IPs are blocked (SSRF prevention).
- Some domains may be blocked by policy. If navigation fails, tell the user.
- The browser profile is classification-aware — visiting classified domains escalates the watermark.
- Always use `browser_snapshot` after navigation to see what loaded.
- Use `browser_describe` when you need to understand visual elements that text extraction misses.
- CSS selectors: use `#id`, `.class`, `button[type="submit"]`, etc.
