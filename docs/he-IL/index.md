---
layout: home

hero:
  name: Triggerfish
  text: סוכני AI מאובטחים
  tagline: אכיפת מדיניות דטרמיניסטית מתחת לשכבת ה-LLM. כל ערוץ. ללא יוצאים מן הכלל.
  image:
    src: /triggerfish.png
    alt: Triggerfish — שוטט בים הדיגיטלי
  actions:
    - theme: brand
      text: התחלה מהירה
      link: /he-IL/guide/
    - theme: alt
      text: תמחור
      link: /he-IL/pricing
    - theme: alt
      text: צפייה ב-GitHub
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: אבטחה מתחת ל-LLM
    details: אכיפת מדיניות דטרמיניסטית מתחת לשכבת ה-LLM. Hook-ים של קוד טהור שה-AI אינו יכול לעקוף, לדרוס או להשפיע עליהם. אותו קלט — אותה החלטה, בכל פעם.
  - icon: "\U0001F4AC"
    title: כל ערוץ שאתם משתמשים בו
    details: Telegram, Slack, Discord, WhatsApp, דוא"ל, WebChat, CLI — הכול עם סיווג לפי ערוץ ומעקב Taint אוטומטי.
  - icon: "\U0001F528"
    title: בנו כל דבר
    details: סביבת הרצה של סוכן עם לולאת כתיבה/הרצה/תיקון. מיומנויות (Skills) שנכתבות עצמאית. שוק The Reef לגילוי ושיתוף יכולות.
  - icon: "\U0001F916"
    title: כל ספק LLM
    details: Anthropic, OpenAI, Google Gemini, מודלים מקומיים דרך Ollama, OpenRouter. שרשראות failover אוטומטיות. או בחרו ב-Triggerfish Gateway — ללא צורך במפתחות API.
  - icon: "\U0001F3AF"
    title: פרואקטיבי כברירת מחדל
    details: משימות מתוזמנות (Cron), טריגרים ו-webhooks. הסוכן שלכם בודק, מנטר ופועל באופן אוטונומי — בתוך גבולות מדיניות מחמירים.
  - icon: "\U0001F310"
    title: קוד פתוח
    details: רישיון Apache 2.0. רכיבי אבטחה קריטיים פתוחים לחלוטין לביקורת. אל תסמכו עלינו — בדקו את הקוד.
---

<LatestRelease />

## התקנה בפקודה אחת

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

תוכניות ההתקנה הבינאריות מורידות גרסה מוכנה מראש, מאמתות את סכום הביקורת
(checksum) ומריצות את אשף ההגדרה. ראו את [מדריך ההתקנה](/he-IL/guide/installation)
להגדרת Docker, בנייה מקוד מקור ותהליך השחרור.

לא רוצים לנהל מפתחות API? [ראו תמחור](/he-IL/pricing) עבור Triggerfish Gateway —
תשתית LLM וחיפוש מנוהלת, מוכנה תוך דקות.

## איך זה עובד

Triggerfish מציבה שכבת מדיניות דטרמיניסטית בין סוכן ה-AI שלכם לבין כל דבר
שהוא נוגע בו. ה-LLM מציע פעולות — Hook-ים של קוד טהור מחליטים אם הן מותרות.

- **מדיניות דטרמיניסטית** — החלטות אבטחה הן קוד טהור. ללא אקראיות, ללא
  השפעת LLM, ללא חריגים. אותו קלט, אותה החלטה, בכל פעם.
- **בקרת זרימת מידע** — ארבע רמות סיווג (PUBLIC, INTERNAL, CONFIDENTIAL,
  RESTRICTED) מתפשטות אוטומטית דרך Taint של הסשן. מידע לעולם לא יכול לזרום
  כלפי מטה להקשר פחות מאובטח.
- **שישה Hook-ים לאכיפה** — כל שלב בצינור הנתונים מוגן: מה נכנס להקשר ה-LLM,
  אילו כלים נקראים, אילו תוצאות חוזרות ומה יוצא מהמערכת. כל החלטה נרשמת ביומן
  הביקורת.
- **דחייה כברירת מחדל** — שום דבר לא מאושר בשקט. כלים, אינטגרציות ומקורות מידע
  ללא סיווג נדחים עד שהם מוגדרים במפורש.
- **זהות הסוכן** — המשימה של הסוכן שלכם מוגדרת ב-SPINE.md, התנהגויות
  פרואקטיביות ב-TRIGGER.md. מיומנויות (Skills) מרחיבות יכולות דרך מוסכמות
  תיקיות פשוטות. שוק The Reef מאפשר לגלות ולשתף אותן.

[למידע נוסף על הארכיטקטורה.](/he-IL/architecture/)
