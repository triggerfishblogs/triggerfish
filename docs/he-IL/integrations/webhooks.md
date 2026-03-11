# Webhooks

Triggerfish יכול לקבל אירועים נכנסים משירותים חיצוניים, ולאפשר תגובות
בזמן אמת לדוא"ל, התראות שגיאה, אירועי CI/CD, שינויי לוח שנה ועוד.
Webhooks הופכים את הסוכן ממערכת תגובתית למענה על שאלות למשתתף יזום
בזרימות העבודה שלכם.

## כיצד Webhooks עובדים

שירותים חיצוניים שולחים בקשות HTTP POST לנקודות קצה webhook רשומות בשער
Triggerfish. כל אירוע נכנס מאומת לאותנטיות, מסווג ומנותב לסוכן לעיבוד.

<img src="/diagrams/webhook-pipeline.svg" alt="צינור Webhook: שירותים חיצוניים שולחים HTTP POST דרך אימות HMAC, סיווג, בידוד סשן וווי מדיניות לעיבוד הסוכן" style="max-width: 100%;" />

## מקורות אירועים נתמכים

Triggerfish יכול לקבל webhooks מכל שירות התומך בהעברת webhook ב-HTTP.
אינטגרציות נפוצות כוללות:

| מקור     | מנגנון                      | דוגמאות אירועים                        |
| -------- | -------------------------- | ------------------------------------- |
| Gmail    | התראות דחיפה Pub/Sub       | דוא"ל חדש, שינוי תווית                |
| GitHub   | Webhook                    | PR נפתח, תגובה ל-issue, כשל CI       |
| Sentry   | Webhook                    | התראת שגיאה, רגרסיה שזוהתה            |
| Stripe   | Webhook                    | תשלום התקבל, שינוי מנוי               |
| Calendar | סקירה או דחיפה             | תזכורת אירוע, התנגשות שזוהתה          |
| מותאם    | נקודת קצה webhook כללית    | כל עומס JSON                          |

## תצורה

נקודות קצה webhook מוגדרות ב-`triggerfish.yaml`:

```yaml
webhooks:
  endpoints:
    - id: github-events
      path: /webhook/github
      # סוד מאוחסן ב-OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request.opened"
          task: "Review PR and post summary"
        - event: "issues.opened"
          task: "Triage new issue"

    - id: sentry-alerts
      path: /webhook/sentry
      # סוד מאוחסן ב-OS keychain
      classification: CONFIDENTIAL
      actions:
        - event: "error"
          task: "Investigate error and create fix PR if possible"

    - id: stripe-payments
      path: /webhook/stripe
      # סוד מאוחסן ב-OS keychain
      classification: CONFIDENTIAL
      actions:
        - event: "payment_intent.succeeded"
          task: "Log payment and update customer record"
        - event: "charge.failed"
          task: "Alert owner about failed charge"
```

### שדות תצורה

| שדה               | נדרש | תיאור                                                    |
| ----------------- | :--: | -------------------------------------------------------- |
| `id`              |  כן  | מזהה ייחודי לנקודת קצה webhook זו                         |
| `path`            |  כן  | נתיב URL שבו נקודת הקצה רשומה                             |
| `secret`          |  כן  | סוד משותף לאימות חתימת HMAC                               |
| `classification`  |  כן  | רמת סיווג שמוקצית לאירועים ממקור זה                       |
| `actions`         |  כן  | רשימת מיפויי אירוע-למשימה                                 |
| `actions[].event` |  כן  | דפוס סוג אירוע להתאמה                                     |
| `actions[].task`  |  כן  | משימה בשפה טבעית שהסוכן יבצע                               |

::: tip סודות webhook מאוחסנים ב-OS keychain. הריצו `triggerfish dive` או
הגדירו webhooks באופן אינטראקטיבי כדי להזין אותם בצורה מאובטחת. :::

## אימות חתימת HMAC

כל בקשת webhook נכנסת מאומתת לאותנטיות באמצעות אימות חתימת HMAC לפני
שהעומס מעובד.

### כיצד האימות עובד

1. שירות חיצוני שולח webhook עם כותרת חתימה (לדוגמה,
   `X-Hub-Signature-256` עבור GitHub)
2. Triggerfish מחשב את ה-HMAC של גוף הבקשה באמצעות הסוד המשותף המוגדר
3. החתימה המחושבת מושווית לחתימה בכותרת הבקשה
4. אם החתימות אינן תואמות, הבקשה **נדחית** באופן מיידי
5. אם מאומתת, העומס ממשיך לסיווג ועיבוד

<img src="/diagrams/hmac-verification.svg" alt="זרימת אימות HMAC: בדיקת נוכחות חתימה, חישוב HMAC, השוואת חתימות, דחייה או המשך" style="max-width: 100%;" />

::: warning אבטחה בקשות webhook ללא חתימות HMAC תקפות נדחות לפני כל
עיבוד. זה מונע מאירועים מזויפים להפעיל פעולות סוכן. לעולם אל תשביתו
אימות חתימה בסביבת ייצור. :::

## צינור עיבוד אירועים

ברגע שאירוע webhook עובר אימות חתימה, הוא זורם דרך צינור האבטחה
הסטנדרטי:

### 1. סיווג

עומס האירוע מסווג ברמה המוגדרת לנקודת קצה ה-webhook. נקודת קצה webhook
המוגדרת כ-`CONFIDENTIAL` מייצרת אירועים מסווגים ב-`CONFIDENTIAL`.

### 2. בידוד סשן

כל אירוע webhook יוצר סשן מבודד משלו. משמעות הדבר:

- האירוע מעובד באופן עצמאי מכל שיחה מתמשכת
- זיהום הסשן מתחיל מחדש (ברמת הסיווג של ה-webhook)
- ללא דליפת נתונים בין סשנים שמופעלים על ידי webhook לסשני משתמשים
- כל סשן מקבל מעקב זיהום ושושלת משלו

### 3. וו PRE_CONTEXT_INJECTION

עומס האירוע עובר דרך וו `PRE_CONTEXT_INJECTION` לפני שנכנס להקשר הסוכן.
וו זה:

- מאמת את מבנה העומס
- מחיל סיווג על כל שדות הנתונים
- יוצר רשומת שושלת לנתונים הנכנסים
- סורק דפוסי הזרקה בשדות מחרוזת
- יכול לחסום את האירוע אם כללי מדיניות מכתיבים זאת

### 4. עיבוד הסוכן

הסוכן מקבל את האירוע המסווג ומבצע את המשימה המוגדרת. המשימה היא הוראה
בשפה טבעית -- הסוכן משתמש ביכולותיו המלאות (כלים, מיומנויות, דפדפן,
סביבת ביצוע) להשלמתה בתוך מגבלות המדיניות.

### 5. מסירת פלט

כל פלט מהסוכן (הודעות, התראות, פעולות) עובר דרך וו `PRE_OUTPUT`. כלל
אין-כתיבה-למטה חל: פלט מסשן שהופעל על ידי webhook `CONFIDENTIAL` אינו
יכול להישלח לערוץ `PUBLIC`.

### 6. ביקורת

מחזור החיים המלא של האירוע מתועד: קבלה, אימות, סיווג, יצירת סשן, פעולות
סוכן והחלטות פלט.

## שילוב עם המתזמן

Webhooks משתלבים באופן טבעי עם [מערכת ה-cron והטריגרים](/he-IL/features/cron-and-triggers)
של Triggerfish. אירוע webhook יכול:

- **להפעיל משימת cron קיימת** לפני הזמן (לדוגמה, webhook פריסה מפעיל
  בדיקת תקינות מיידית)
- **ליצור משימה מתוזמנת חדשה** (לדוגמה, webhook לוח שנה מתזמן תזכורת)
- **לעדכן עדיפויות טריגר** (לדוגמה, התראת Sentry גורמת לסוכן לתעדף
  חקירת שגיאות בהתעוררות הטריגר הבאה)

```yaml
webhooks:
  endpoints:
    - id: deploy-notify
      path: /webhook/deploy
      # סוד מאוחסן ב-OS keychain
      classification: INTERNAL
      actions:
        - event: "deployment.completed"
          task: "Run health check on the deployed service and report results"
          # הסוכן עשוי להשתמש ב-cron.create לתזמון בדיקות המשך
```

## סיכום אבטחה

| בקרה                    | תיאור                                                                        |
| ----------------------- | ---------------------------------------------------------------------------- |
| אימות HMAC              | כל webhooks נכנסים מאומתים לפני עיבוד                                        |
| סיווג                   | עומסי webhook מסווגים ברמה המוגדרת                                            |
| בידוד סשן               | כל אירוע מקבל סשן מבודד משלו                                                |
| `PRE_CONTEXT_INJECTION` | עומס נסרק ומסווג לפני כניסה להקשר                                            |
| אין כתיבה-למטה          | פלט מאירועים בסיווג גבוה אינו יכול להגיע לערוצים בסיווג נמוך                 |
| תיעוד ביקורת            | מחזור חיים מלא של האירוע מתועד                                                |
| לא חשוף לציבור          | נקודות קצה webhook אינן חשופות לאינטרנט הציבורי כברירת מחדל                  |

## דוגמה: לולאת סקירת PR ב-GitHub

דוגמה מהעולם האמיתי של webhooks בפעולה: הסוכן פותח PR, ואז אירועי
webhook מ-GitHub מניעים את לולאת משוב סקירת הקוד ללא כל סקירה.

### כיצד זה עובד

1. הסוכן יוצר ענף feature, מבצע commit לקוד ופותח PR דרך
   `gh pr create`
2. הסוכן כותב קובץ מעקב ל-
   `~/.triggerfish/workspace/<agent-id>/scratch/pr-tracking/` עם שם הענף,
   מספר ה-PR והקשר המשימה
3. הסוכן עוצר ומחכה -- ללא סקירה

כאשר סוקר מפרסם משוב:

4. GitHub שולח webhook של `pull_request_review` ל-Triggerfish
5. Triggerfish מאמת את חתימת ה-HMAC, מסווג את האירוע ויוצר סשן מבודד
6. הסוכן קורא את קובץ המעקב לשחזור הקשר, עובר לענף, מטפל בסקירה, מבצע
   commit, דוחף ומגיב על ה-PR
7. שלבים 4-6 חוזרים עד שהסקירה מאושרת

כאשר ה-PR ממוזג:

8. GitHub שולח webhook של `pull_request.closed` עם `merged: true`
9. הסוכן מנקה: מוחק את הענף המקומי, מעביר את קובץ המעקב לארכיון

### תצורה

```yaml
webhooks:
  endpoints:
    - id: github
      path: /webhook/github
      # סוד מאוחסן ב-OS keychain
      classification: INTERNAL
      actions:
        - event: "pull_request_review"
          task: "A PR review was submitted. Read the tracking file, address feedback, commit, push."
        - event: "pull_request_review_comment"
          task: "An inline review comment was posted. Read the tracking file, address the comment."
        - event: "issue_comment"
          task: "A comment was posted on a PR. If tracked, address the feedback."
        - event: "pull_request.closed"
          task: "A PR was closed or merged. Clean up branches and archive tracking file."
```

ה-webhook של GitHub חייב לשלוח: `Pull requests`, `Pull request reviews`,
`Pull request review comments` ו-`Issue comments`.

ראו את מדריך [אינטגרציית GitHub](/he-IL/integrations/github) המלא להוראות
הגדרה ואת מיומנות `git-branch-management` המובנית לזרימת העבודה המלאה של
הסוכן.

### בקרות ארגוניות

- **רשימת היתר webhooks** מנוהלת על ידי מנהל -- רק מקורות חיצוניים מאושרים
  יכולים לרשום נקודות קצה
- **הגבלת קצב** לכל נקודת קצה למניעת שימוש לרעה
- **מגבלות גודל עומס** למניעת מיצוי זיכרון
- **רשימת היתר IP** לאימות מקור נוסף
- **מדיניות שמירה** ליומני אירועי webhook

::: info נקודות קצה webhook אינן חשופות לאינטרנט הציבורי כברירת מחדל.
כדי ששירותים חיצוניים יגיעו למופע Triggerfish שלכם, עליכם להגדיר
העברת פורטים, reverse proxy או מנהרה. מקטע [גישה מרחוק](/he-IL/reference/)
בתיעוד מכסה אפשרויות חשיפה מאובטחות. :::
