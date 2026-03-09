---
title: תמחור
---

<style>
.pricing-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 24px;
  margin: 32px 0;
}

.pricing-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 32px 24px;
  background: var(--vp-c-bg-soft);
  display: flex;
  flex-direction: column;
}

.pricing-card.featured {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 0 0 1px var(--vp-c-brand-1);
}

.pricing-card h3 {
  margin: 0 0 8px;
  font-size: 22px;
}

.pricing-card .price {
  font-size: 36px;
  font-weight: 700;
  margin: 8px 0 4px;
}

.pricing-card .price span {
  font-size: 16px;
  font-weight: 400;
  color: var(--vp-c-text-2);
}

.pricing-card .subtitle {
  color: var(--vp-c-text-2);
  font-size: 14px;
  margin-bottom: 24px;
}

.pricing-card ul {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  flex: 1;
}

.pricing-card ul li {
  padding: 6px 0;
  font-size: 14px;
  line-height: 1.5;
}

.pricing-card ul li::before {
  content: "\2713\00a0";
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.pricing-card ul li.excluded::before {
  content: "\2014\00a0";
  color: var(--vp-c-text-3);
}

.pricing-card .cta {
  display: block;
  text-align: center;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  text-decoration: none;
  margin-top: auto;
}

.pricing-card .cta.primary {
  background: #16a34a;
  color: var(--vp-c-white);
}

.pricing-card .cta.primary:hover {
  background: #15803d;
}

.pricing-card .cta.secondary {
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}

.pricing-card .cta.secondary:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  margin: 32px 0;
  font-size: 14px;
}

.comparison-table th,
.comparison-table td {
  padding: 12px 16px;
  text-align: left;
  border-bottom: 1px solid var(--vp-c-divider);
}

.comparison-table th {
  font-weight: 600;
  background: var(--vp-c-bg-soft);
}

.comparison-table td:not(:first-child) {
  text-align: center;
}

.comparison-table th:not(:first-child) {
  text-align: center;
}

.comparison-table .section-header {
  font-weight: 700;
  background: var(--vp-c-bg-alt);
  color: var(--vp-c-text-1);
}

.faq-section h3 {
  margin-top: 32px;
}
</style>

# תמחור

Triggerfish הוא קוד פתוח ותמיד יהיה. הביאו את מפתחות ה-API שלכם והריצו הכול
באופן מקומי בחינם. Triggerfish Gateway מוסיפה תשתית LLM מנוהלת, חיפוש אינטרנט,
מנהרות ועדכונים — כך שלא תצטרכו לנהל שום דבר מזה.

::: info גישה מוקדמת
Triggerfish Gateway נמצא כעת בגישה מוקדמת. התמחור והתכונות עשויים להשתנות
תוך כדי שיפור המוצר. מנויי גישה מוקדמת נועלים את התעריף שלהם.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>קוד פתוח</h3>
  <div class="price">חינם</div>
  <div class="subtitle">לתמיד. רישיון Apache 2.0.</div>
  <ul>
    <li>פלטפורמת סוכן מלאה</li>
    <li>כל הערוצים (Telegram, Slack, Discord, WhatsApp ועוד)</li>
    <li>כל האינטגרציות (GitHub, Google, Obsidian ועוד)</li>
    <li>סיווג ואכיפת מדיניות</li>
    <li>Skills, plugins, cron, webhooks</li>
    <li>אוטומציית דפדפן</li>
    <li>הביאו מפתחות LLM משלכם (Anthropic, OpenAI, Google, Ollama ועוד)</li>
    <li>הביאו מפתחות חיפוש משלכם (Brave, SearXNG)</li>
    <li>עדכונים אוטומטיים</li>
  </ul>
  <a href="/he-IL/guide/installation" class="cta secondary">התקינו עכשיו</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/חודש</span></div>
  <div class="subtitle">כל מה שאתם צריכים. ללא צורך במפתחות API.</div>
  <ul>
    <li>הכול מגרסת קוד פתוח</li>
    <li>הסקת AI כלולה — תשתית LLM מנוהלת, ללא צורך במפתחות API</li>
    <li>חיפוש אינטרנט כלול</li>
    <li>מנהרת ענן ל-webhooks</li>
    <li>משימות מתוזמנות</li>
    <li>הגדרה תוך פחות מ-2 דקות</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=he" class="cta primary">הרשמה</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/חודש</span></div>
  <div class="subtitle">פי 5 יותר שימוש מ-Pro. לעומסי עבודה כבדים.</div>
  <ul>
    <li>הכול מתוכנית Pro</li>
    <li>הסקת AI כלולה — מגבלות שימוש גבוהות יותר</li>
    <li>צוותי סוכנים — שיתוף פעולה רב-סוכני</li>
    <li>יותר סשנים במקביל</li>
    <li>מנהרות ענן מרובות</li>
    <li>משימות מתוזמנות ללא הגבלה</li>
    <li>תגובות AI ארוכות יותר</li>
    <li>תמיכה עדיפה</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=he" class="cta primary">הרשמה</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">מותאם אישית</div>
  <div class="subtitle">פריסות צוות עם SSO ותאימות.</div>
  <ul>
    <li>הכול מתוכנית Power</li>
    <li>רישוי רב-משתמשים</li>
    <li>אינטגרציית SSO / SAML</li>
    <li>מגבלות שימוש מותאמות אישית</li>
    <li>ניתוב מודלים מותאם אישית</li>
    <li>תמיכה ייעודית</li>
    <li>התחייבויות SLA</li>
    <li>אפשרויות פריסה מקומית (On-premise)</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">צרו קשר עם המכירות</a>
</div>

</div>

## השוואת תכונות

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>קוד פתוח</th>
  <th>Pro</th>
  <th>Power</th>
  <th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">פלטפורמה</td></tr>
<tr><td>כל הערוצים</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>כל האינטגרציות</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>סיווג ומנוע מדיניות</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>אוטומציית דפדפן</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>סביבת הרצה</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>צוותי סוכנים</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI וחיפוש</td></tr>
<tr><td>ספק LLM</td><td>הביאו משלכם</td><td>מנוהל</td><td>מנוהל</td><td>מנוהל</td></tr>
<tr><td>חיפוש אינטרנט</td><td>הביאו משלכם</td><td>כלול</td><td>כלול</td><td>כלול</td></tr>
<tr><td>שימוש ב-AI</td><td>מגבלות ה-API שלכם</td><td>רגיל</td><td>מורחב</td><td>מותאם אישית</td></tr>

<tr class="section-header"><td colspan="5">תשתית</td></tr>
<tr><td>מנהרות ענן</td><td>&mdash;</td><td>&#10003;</td><td>מרובות</td><td>מותאם אישית</td></tr>
<tr><td>משימות מתוזמנות</td><td>ללא הגבלה</td><td>&#10003;</td><td>ללא הגבלה</td><td>ללא הגבלה</td></tr>
<tr><td>עדכונים אוטומטיים</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">תמיכה וניהול</td></tr>
<tr><td>תמיכה קהילתית</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>תמיכה עדיפה</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>רישוי רב-משתמשים</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## כיצד Triggerfish Gateway עובד

Triggerfish Gateway אינו מוצר נפרד — זוהי תשתית מנוהלת עבור אותו סוכן
קוד פתוח שאתם כבר מריצים באופן מקומי.

1. **הירשמו** למעלה — תקבלו את מפתח הרישיון שלכם בדוא"ל לאחר התשלום
2. **הריצו `triggerfish dive --force`** ובחרו ב-Triggerfish Gateway כספק שלכם
3. **הזינו את מפתח הרישיון שלכם** או השתמשו בזרימת קישור קסם להפעלה אוטומטית

כבר נרשמתם במכשיר אחר? הריצו `triggerfish dive --force`, בחרו ב-Triggerfish
Gateway ובחרו "יש לי כבר חשבון" כדי להיכנס עם הדוא"ל שלכם.

מפתח הרישיון שלכם מאוחסן ב-keychain של מערכת ההפעלה. תוכלו לנהל את המנוי
שלכם בכל עת דרך פורטל הלקוחות.

## שאלות נפוצות {.faq-section}

### האם ניתן לעבור בין קוד פתוח לענן?

כן. הגדרות הסוכן שלכם הן קובץ YAML יחיד. הריצו `triggerfish dive --force`
כדי להגדיר מחדש בכל עת. עברו ממפתחות API משלכם ל-Triggerfish Gateway או חזרה
— ה-SPINE, המיומנויות, הערוצים והנתונים שלכם נשארים בדיוק אותו דבר.

### באיזה LLM משתמש Triggerfish Gateway?

Triggerfish Gateway מנתב דרך תשתית מודלים מותאמת. בחירת המודל מנוהלת עבורכם —
אנו בוחרים את האיזון הטוב ביותר בין עלות לאיכות ומטפלים ב-caching, failover
ואופטימיזציה באופן אוטומטי.

### האם ניתן להשתמש במפתחות API משלי לצד ענן?

כן. Triggerfish תומכת בשרשראות failover. תוכלו להגדיר ענן כספק הראשי שלכם
ולחזור למפתח Anthropic או OpenAI שלכם, או להיפך.

### מה קורה אם המנוי שלי פג?

הסוכן שלכם ממשיך לפעול. הוא חוזר למצב מקומי בלבד — אם יש לכם מפתחות API
מוגדרים, הם עדיין עובדים. תכונות ענן (LLM מנוהל, חיפוש, מנהרות) מפסיקות עד
שתחדשו את המנוי. שום מידע לא אובד.

### האם הנתונים שלי נשלחים דרך השרתים שלכם?

בקשות LLM מועברות דרך שער הענן לספק המודל. אנו לא מאחסנים תוכן שיחות.
מטא-נתונים של שימוש נרשמים לצורכי חיוב. הסוכן, הנתונים, ה-SPINE והמיומנויות
שלכם נשארים לחלוטין על המכשיר שלכם.

### כיצד אני מנהל את המנוי שלי?

בקרו בפורטל הלקוחות כדי לעדכן אמצעי תשלום, להחליף תוכניות או לבטל.
