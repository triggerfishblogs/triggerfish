---
title: قیمت‌گذاری
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

# قیمت‌گذاری

Triggerfish متن‌باز است و همیشه خواهد بود. کلیدهای API خود را بیاورید و همه چیز را
به‌صورت محلی رایگان اجرا کنید. Triggerfish Gateway یک بک‌اند مدیریت‌شده LLM، جستجوی
وب، تونل‌ها و به‌روزرسانی‌ها اضافه می‌کند — تا نیازی به مدیریت هیچ‌کدام نباشد.

::: info دسترسی زودهنگام
Triggerfish Gateway در حال حاضر در مرحله دسترسی زودهنگام است. قیمت‌گذاری و ویژگی‌ها ممکن
است در حین بهبود محصول تغییر کنند. مشترکان دسترسی زودهنگام نرخ خود را قفل می‌کنند.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>متن‌باز</h3>
  <div class="price">رایگان</div>
  <div class="subtitle">برای همیشه. Apache 2.0.</div>
  <ul>
    <li>پلتفرم کامل عامل</li>
    <li>تمام کانال‌ها (Telegram، Slack، Discord، WhatsApp و غیره)</li>
    <li>تمام یکپارچه‌سازی‌ها (GitHub، Google، Obsidian و غیره)</li>
    <li>طبقه‌بندی و اعمال سیاست</li>
    <li>مهارت‌ها، plugin‌ها، cron، webhook‌ها</li>
    <li>اتوماسیون مرورگر</li>
    <li>کلیدهای LLM خود را بیاورید (Anthropic، OpenAI، Google، Ollama و غیره)</li>
    <li>کلیدهای جستجوی خود را بیاورید (Brave، SearXNG)</li>
    <li>به‌روزرسانی‌های خودکار</li>
  </ul>
  <a href="/fa-IR/guide/installation" class="cta secondary">همین الان نصب کنید</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$۴۹<span>/ماه</span></div>
  <div class="subtitle">هر چه نیاز دارید. بدون نیاز به کلیدهای API.</div>
  <ul>
    <li>همه چیز در نسخه متن‌باز</li>
    <li>استنتاج هوش مصنوعی شامل — بک‌اند مدیریت‌شده LLM، بدون نیاز به کلیدهای API</li>
    <li>جستجوی وب شامل</li>
    <li>تونل ابری برای webhook‌ها</li>
    <li>وظایف زمان‌بندی‌شده</li>
    <li>راه‌اندازی در کمتر از ۲ دقیقه</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=fa" class="cta primary">اشتراک</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$۱۹۹<span>/ماه</span></div>
  <div class="subtitle">۵ برابر مصرف بیشتر از Pro. برای بارهای کاری سنگین.</div>
  <ul>
    <li>همه چیز در Pro</li>
    <li>استنتاج هوش مصنوعی شامل — محدودیت‌های مصرف بالاتر</li>
    <li>تیم‌های عامل — همکاری چند عامله</li>
    <li>نشست‌های هم‌زمان بیشتر</li>
    <li>تونل‌های ابری متعدد</li>
    <li>وظایف زمان‌بندی‌شده نامحدود</li>
    <li>پاسخ‌های هوش مصنوعی طولانی‌تر</li>
    <li>پشتیبانی اولویت‌دار</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=fa" class="cta primary">اشتراک</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">سفارشی</div>
  <div class="subtitle">استقرار تیمی با SSO و انطباق.</div>
  <ul>
    <li>همه چیز در Power</li>
    <li>مجوز چند کاربره</li>
    <li>یکپارچه‌سازی SSO / SAML</li>
    <li>محدودیت‌های مصرف سفارشی</li>
    <li>مسیریابی مدل سفارشی</li>
    <li>پشتیبانی اختصاصی</li>
    <li>تضمین‌های SLA</li>
    <li>گزینه‌های استقرار در محل</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">تماس با فروش</a>
</div>

</div>

## مقایسه ویژگی‌ها

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>متن‌باز</th>
  <th>Pro</th>
  <th>Power</th>
  <th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">پلتفرم</td></tr>
<tr><td>تمام کانال‌ها</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>تمام یکپارچه‌سازی‌ها</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>موتور طبقه‌بندی و سیاست</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>مهارت‌ها، plugin‌ها، webhook‌ها</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>اتوماسیون مرورگر</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>محیط اجرا</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>تیم‌های عامل</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">هوش مصنوعی و جستجو</td></tr>
<tr><td>ارائه‌دهنده LLM</td><td>خودتان بیاورید</td><td>مدیریت‌شده</td><td>مدیریت‌شده</td><td>مدیریت‌شده</td></tr>
<tr><td>جستجوی وب</td><td>خودتان بیاورید</td><td>شامل</td><td>شامل</td><td>شامل</td></tr>
<tr><td>مصرف هوش مصنوعی</td><td>محدودیت‌های API شما</td><td>استاندارد</td><td>توسعه‌یافته</td><td>سفارشی</td></tr>

<tr class="section-header"><td colspan="5">زیرساخت</td></tr>
<tr><td>تونل‌های ابری</td><td>&mdash;</td><td>&#10003;</td><td>متعدد</td><td>سفارشی</td></tr>
<tr><td>وظایف زمان‌بندی‌شده</td><td>نامحدود</td><td>&#10003;</td><td>نامحدود</td><td>نامحدود</td></tr>
<tr><td>به‌روزرسانی‌های خودکار</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">پشتیبانی و مدیریت</td></tr>
<tr><td>پشتیبانی انجمن</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>پشتیبانی اولویت‌دار</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>مجوز چند کاربره</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## نحوه کار Triggerfish Gateway

Triggerfish Gateway یک محصول جداگانه نیست — یک بک‌اند مدیریت‌شده برای همان
عامل متن‌بازی است که قبلاً به‌صورت محلی اجرا می‌کنید.

۱. **اشتراک بگیرید** — کلید مجوز خود را پس از خرید از طریق ایمیل دریافت خواهید کرد
۲. **`triggerfish dive --force` را اجرا کنید** و Triggerfish Gateway را به‌عنوان ارائه‌دهنده انتخاب کنید
۳. **کلید مجوز خود را وارد کنید** یا از جریان لینک جادویی برای فعال‌سازی خودکار استفاده کنید

قبلاً در دستگاه دیگری اشتراک گرفته‌اید؟ `triggerfish dive --force` را اجرا کنید،
Triggerfish Gateway را انتخاب کنید و «من قبلاً حساب دارم» را برای ورود با ایمیل
انتخاب کنید.

کلید مجوز شما در کلیدزنجیر سیستم‌عامل ذخیره می‌شود. می‌توانید اشتراک خود را هر زمان
از طریق پرتال مشتری مدیریت کنید.

## سؤالات متداول {.faq-section}

### آیا می‌توانم بین متن‌باز و ابری جابجا شوم؟

بله. پیکربندی عامل شما یک فایل YAML واحد است. `triggerfish dive --force` را برای
پیکربندی مجدد در هر زمان اجرا کنید. از کلیدهای API خود به Triggerfish Gateway یا
برعکس جابجا شوید — SPINE، مهارت‌ها، کانال‌ها و داده‌های شما دقیقاً همان‌طور باقی می‌مانند.

### Triggerfish Gateway از چه LLM استفاده می‌کند؟

Triggerfish Gateway از طریق زیرساخت مدل بهینه‌شده مسیریابی می‌کند. انتخاب مدل
برای شما مدیریت می‌شود — ما بهترین تعادل هزینه/کیفیت را انتخاب می‌کنیم و ذخیره‌سازی،
جایگزینی و بهینه‌سازی را به‌صورت خودکار مدیریت می‌کنیم.

### آیا می‌توانم کلیدهای API خودم را در کنار ابری استفاده کنم؟

بله. Triggerfish از زنجیره‌های جایگزینی پشتیبانی می‌کند. می‌توانید ابری را به‌عنوان
ارائه‌دهنده اصلی پیکربندی کنید و در صورت خرابی به کلید Anthropic یا OpenAI خود
بازگردید، یا برعکس.

### اگر اشتراک من منقضی شود چه اتفاقی می‌افتد؟

عامل شما به کار خود ادامه می‌دهد. به حالت فقط محلی بازمی‌گردد — اگر کلیدهای API
خود را پیکربندی کرده باشید، آن‌ها همچنان کار می‌کنند. ویژگی‌های ابری (LLM مدیریت‌شده،
جستجو، تونل‌ها) تا زمان تمدید اشتراک متوقف می‌شوند. هیچ داده‌ای از بین نمی‌رود.

### آیا داده‌های من از طریق سرورهای شما ارسال می‌شود؟

درخواست‌های LLM از طریق Gateway ابری به ارائه‌دهنده مدل پراکسی می‌شوند.
ما محتوای مکالمه را ذخیره نمی‌کنیم. متادیتای مصرف برای صورتحساب ثبت می‌شود.
عامل، داده‌ها، SPINE و مهارت‌های شما کاملاً روی دستگاه شما باقی می‌مانند.

### چگونه اشتراک خود را مدیریت کنم؟

از پرتال مشتری برای به‌روزرسانی روش‌های پرداخت، تغییر طرح یا لغو بازدید کنید.
