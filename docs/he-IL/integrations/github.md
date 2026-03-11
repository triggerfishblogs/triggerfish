# אינטגרציית GitHub

Triggerfish משתלב עם GitHub דרך שתי גישות משלימות:

## התקנה מהירה: כלי REST API

הדרך המהירה ביותר לחבר את GitHub. נותנת לסוכן 14 כלים מובנים ל-repos,
PRs, issues, Actions וחיפוש קוד -- הכל עם הפצת זיהום מודעת סיווג.

```bash
triggerfish connect github
```

זה מנחה אתכם ביצירת Personal Access Token מדויק, מאמת אותו ומאחסן אותו
ב-OS keychain. זה הכל -- הסוכן שלכם יכול כעת להשתמש בכל כלי `github_*`.

ראו את [תיעוד המיומנויות](/he-IL/integrations/skills) למידע נוסף על אופן
פעולת מיומנויות, או הריצו `triggerfish skills list` לראות את כל הכלים
הזמינים.

## מתקדם: `gh` CLI + Webhooks

ללולאת משוב פיתוח מלאה (הסוכן יוצר ענפים, פותח PRs, מגיב לסקירות קוד),
Triggerfish תומך גם ב-CLI `gh` דרך exec ומסירת סקירות מונעת webhook.
זה משתמש בשלושה חלקים ניתנים להרכבה:

1. **`gh` CLI דרך exec** -- ביצוע כל פעולות GitHub (יצירת PRs, קריאת
   סקירות, תגובה, מיזוג)
2. **מסירת סקירות** -- שני מצבים: **אירועי webhook** (מיידי, דורש נקודת
   קצה ציבורית) או **סקירה מבוססת טריגר** דרך `gh pr view` (עובד מאחורי
   firewalls)
3. **מיומנות git-branch-management** -- מלמדת את הסוכן את זרימת העבודה
   המלאה של ענפים/PR/סקירה

ביחד, אלה יוצרים לולאת משוב פיתוח מלאה: הסוכן יוצר ענפים, מבצע commit
לקוד, פותח PRs ומגיב למשוב סוקרים -- ללא צורך בקוד GitHub API מותאם.

### דרישות מוקדמות

#### gh CLI

ה-CLI של GitHub (`gh`) חייב להיות מותקן ומאומת בסביבה שבה Triggerfish רץ.

```bash
# התקנת gh (Fedora/RHEL)
sudo dnf install gh

# התקנת gh (macOS)
brew install gh

# התקנת gh (Debian/Ubuntu)
sudo apt install gh

# אימות
gh auth login
```

אימות:

```bash
gh auth status
```

הסוכן משתמש ב-`gh` דרך `exec.run("gh ...")` -- אין צורך בתצורת אסימון
GitHub נפרדת מעבר לכניסה ל-`gh`.

### Git

Git חייב להיות מותקן ומוגדר עם שם משתמש ודוא"ל:

```bash
git config --global user.name "Triggerfish Agent"
git config --global user.email "triggerfish@example.com"
```

### גישה למאגר

מרחב העבודה של הסוכן חייב להיות מאגר git (או להכיל אחד) עם גישת push
למרוחק.

## מסירת סקירות

יש שתי דרכים לסוכן ללמוד על סקירות PR חדשות. בחרו אחת או השתמשו
בשתיהן יחד.

### אפשרות A: סקירה מבוססת טריגר

ללא צורך בקישוריות נכנסת. הסוכן סוקר את GitHub בלוח זמנים באמצעות
`gh pr view`. עובד מאחורי כל firewall, NAT או VPN.

הוסיפו משימת cron ל-`triggerfish.yaml`:

```yaml
scheduler:
  cron:
    jobs:
      - id: pr-review-check
        schedule: "*/15 * * * *"
        task: >
          Check all open PR tracking files in scratch/pr-tracking/.
          For each open PR, query GitHub for new reviews or state changes
          using gh pr view. Address any review feedback, handle merges
          and closures.
        classification: INTERNAL
```

או הוסיפו "check open PRs for review feedback" ל-TRIGGER.md של הסוכן
לביצוע במהלך מחזור ההתעוררות הרגיל של הטריגר.

### אפשרות B: הגדרת Webhook

Webhooks מוסרים אירועי סקירה באופן מיידי. זה דורש שהשער של Triggerfish
יהיה נגיש משרתי GitHub (למשל דרך Tailscale Funnel, reverse proxy או
מנהרה).

### שלב 1: יצירת סוד webhook

```bash
openssl rand -hex 32
```

אחסנו זאת כמשתנה סביבה:

```bash
export GITHUB_WEBHOOK_SECRET="<generated-secret>"
```

הוסיפו לפרופיל ה-shell שלכם או למנהל הסודות כדי שישרוד אתחולים מחדש.

### שלב 2: הגדרת Triggerfish

הוסיפו את נקודת קצה ה-webhook ל-`triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # סוד מאוחסן ב-OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: >
            A PR review was submitted. Read the PR tracking file from
            scratch/pr-tracking/ to recover context. Check out the branch,
            read the review, address any requested changes, commit, push,
            and comment on the PR with a summary of changes made.
        - event: "pull_request_review_comment"
          task: >
            An inline review comment was posted on a PR. Read the PR
            tracking file, check out the branch, address the specific
            comment, commit, push.
        - event: "issue_comment"
          task: >
            A comment was posted on a PR or issue. Check if this is a
            tracked PR by looking up tracking files in scratch/pr-tracking/.
            If tracked, check out the branch and address the feedback.
        - event: "pull_request.closed"
          task: >
            A PR was closed or merged. Read the tracking file. If merged,
            clean up: delete local branch, archive tracking file to
            completed/. Notify the owner of the merge. If closed without
            merge, archive and notify.
```

### שלב 3: חשיפת נקודת קצה ה-webhook

שער Triggerfish חייב להיות נגיש משרתי GitHub. אפשרויות:

**Tailscale Funnel (מומלץ לשימוש אישי):**

```yaml
# ב-triggerfish.yaml
remote:
  tailscale:
    serve: true
    funnel:
      enabled: true
      paths: ["/webhook/*"]
```

זה חושף את `https://<your-machine>.ts.net/webhook/github` לאינטרנט.

**Reverse proxy (nginx, Caddy):**

העבירו `/webhook/github` לפורט המקומי של השער שלכם.

**ngrok (פיתוח/בדיקות):**

```bash
ngrok http 8080
```

השתמשו ב-URL שנוצר כיעד ה-webhook.

### שלב 4: הגדרת ה-webhook ב-GitHub

במאגר GitHub שלכם (או בארגון):

1. לכו ל-**Settings** > **Webhooks** > **Add webhook**
2. הגדירו את **Payload URL** לנקודת הקצה החשופה שלכם:
   ```
   https://<your-host>/webhook/github
   ```
3. הגדירו **Content type** ל-`application/json`
4. הגדירו **Secret** לאותו ערך כמו `GITHUB_WEBHOOK_SECRET`
5. תחת **Which events would you like to trigger this webhook?**, בחרו
   **Let me select individual events** וסמנו:
   - **Pull requests** (מכסה `pull_request.opened`, `pull_request.closed`)
   - **Pull request reviews** (מכסה `pull_request_review`)
   - **Pull request review comments** (מכסה `pull_request_review_comment`)
   - **Issue comments** (מכסה `issue_comment` על PRs ו-issues)
6. לחצו **Add webhook**

GitHub ישלח אירוע ping לאימות החיבור. בדקו ביומני Triggerfish כדי לאשר
קבלה:

```bash
triggerfish logs --tail
```

## כיצד לולאת המשוב עובדת

### עם webhooks (מיידי)

<img src="/diagrams/github-webhook-review.svg" alt="לולאת סקירה GitHub webhook: הסוכן פותח PR, מחכה, מקבל webhook על סקירה, קורא קובץ מעקב, מטפל במשוב, מבצע commit ודוחף" style="max-width: 100%;" />

### עם סקירה מבוססת טריגר (מאחורי firewall)

<img src="/diagrams/github-trigger-review.svg" alt="סקירה מבוססת טריגר GitHub: הסוכן פותח PR, כותב קובץ מעקב, מחכה להתעוררות טריגר, סוקר סקירות, מטפל במשוב" style="max-width: 100%;" />

שני הנתיבים משתמשים באותם קובצי מעקב. הסוכן משחזר הקשר על ידי קריאת
קובץ המעקב של ה-PR מ-
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`.

## קובצי מעקב PR

הסוכן כותב קובץ מעקב לכל PR שהוא יוצר:

```
~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/<branch-name>.json
```

סכמה:

```json
{
  "branch": "triggerfish/agent-1/fix-auth-timeout",
  "prNumber": 42,
  "prUrl": "https://github.com/owner/repo/pull/42",
  "task": "Fix authentication timeout when token expires during long requests",
  "repository": "owner/repo",
  "createdAt": "2025-01-15T10:30:00Z",
  "updatedAt": "2025-01-15T10:30:00Z",
  "lastCheckedAt": "2025-01-15T10:30:00Z",
  "lastReviewId": "",
  "status": "open",
  "commits": [
    "feat: add token refresh before expiry",
    "test: add timeout edge case coverage"
  ]
}
```

לאחר מיזוג, קובצי מעקב מועברים לארכיון `completed/`.

## מדיניות מיזוג

כברירת מחדל, הסוכן **אינו** ממזג אוטומטית PRs מאושרים. כאשר סקירה
מאושרת, הסוכן מודיע לבעלים וממתין להוראת מיזוג מפורשת.

לאפשור מיזוג אוטומטי, הוסיפו ל-`triggerfish.yaml`:

```yaml
github:
  auto_merge: true
```

כאשר מופעל, הסוכן יריץ `gh pr merge --squash --delete-branch` לאחר קבלת
סקירה מאשרת.

::: warning מיזוג אוטומטי מושבת כברירת מחדל למען בטיחות. הפעילו אותו
רק אם אתם סומכים על שינויי הסוכן ויש לכם כללי הגנת ענף (סוקרים נדרשים,
בדיקות CI) מוגדרים ב-GitHub. :::

## אופציונלי: שרת MCP של GitHub

לגישת GitHub API עשירה יותר מעבר למה ש-CLI `gh` והכלים המובנים מספקים,
ניתן גם להגדיר את שרת ה-MCP של GitHub:

```yaml
mcp_servers:
  - id: github
    command: "npx"
    args: ["-y", "@modelcontextprotocol/server-github"]
    # אסימון GitHub נקרא מ-OS keychain
    classification: CONFIDENTIAL
```

זה אינו נדרש לרוב זרימות העבודה -- כלי `github_*` המובנים (מוגדרים דרך
`triggerfish connect github`) ו-CLI `gh` מכסים את כל הפעולות הנפוצות.
שרת ה-MCP שימושי לשאילתות מתקדמות שאינן מכוסות על ידי הכלים המובנים.

## שיקולי אבטחה

| בקרה                    | פרט                                                                                                   |
| ----------------------- | ----------------------------------------------------------------------------------------------------- |
| **אימות HMAC**          | כל webhooks מ-GitHub מאומתים עם HMAC-SHA256 לפני עיבוד (מצב webhook)                                  |
| **סיווג**               | נתוני GitHub מסווגים כ-`INTERNAL` כברירת מחדל -- קוד ונתוני PR אינם דולפים לערוצים ציבוריים           |
| **בידוד סשן**           | כל אירוע webhook או התעוררות טריגר יוצרים סשן מבודד חדש                                               |
| **אין כתיבה-למטה**      | תגובות הסוכן לאירועי PR בסיווג INTERNAL אינן יכולות להישלח לערוצים PUBLIC                             |
| **טיפול באישורים**      | CLI `gh` מנהל אסימון אימות משלו; אין אסימוני GitHub מאוחסנים ב-triggerfish.yaml                       |
| **שמות ענפים**          | קידומת `triggerfish/` הופכת ענפי סוכן לניתנים לזיהוי ולסינון בקלות                                    |

::: tip אם המאגר שלכם מכיל קוד רגיש (קנייני, קריטי לאבטחה), שקלו להגדיר
את סיווג ה-webhook ל-`CONFIDENTIAL` במקום `INTERNAL`. :::

## פתרון בעיות

### Webhook אינו מקבל אירועים

1. בדקו שכתובת ה-webhook נגישה מהאינטרנט (השתמשו ב-`curl` ממכונה חיצונית)
2. ב-GitHub, לכו ל-**Settings** > **Webhooks** ובדקו את לשונית **Recent
   Deliveries** לשגיאות
3. ודאו שהסוד תואם בין GitHub ל-`GITHUB_WEBHOOK_SECRET`
4. בדקו ביומני Triggerfish: `triggerfish logs --tail`

### סקירות PR אינן נקלטות (מצב סקירה)

1. בדקו שמשימת cron `pr-review-check` מוגדרת ב-`triggerfish.yaml`
2. ודאו שה-daemon רץ: `triggerfish status`
3. בדקו שקובצי מעקב קיימים ב-
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`
4. בדקו ידנית: `gh pr view <number> --json reviews`
5. בדקו ביומני Triggerfish: `triggerfish logs --tail`

### gh CLI לא מאומת

```bash
gh auth status
# אם לא מאומת:
gh auth login
```

### הסוכן אינו יכול לדחוף למרוחק

ודאו git remote ואישורים:

```bash
git remote -v
gh auth status
```

ודאו שלחשבון GitHub המאומת יש גישת push למאגר.

### קובץ מעקב לא נמצא במהלך סקירה

הסוכן מחפש קובצי מעקב ב-
`~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/`. אם הקובץ חסר,
ה-PR ייתכן שנוצר מחוץ ל-Triggerfish, או שמרחב העבודה נוקה. הסוכן צריך
להודיע לבעלים ולדלג על טיפול אוטומטי.
