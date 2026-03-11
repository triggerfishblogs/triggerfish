---
title: الأسعار
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
  text-align: right;
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

# الأسعار

Triggerfish مفتوح المصدر وسيبقى كذلك دائمًا. أحضر مفاتيح API الخاصة بك وشغّل
كل شيء محليًا مجانًا. يضيف Triggerfish Gateway واجهة خلفية مُدارة لـ LLM، وبحث
الويب، والأنفاق، والتحديثات — حتى لا تحتاج لإدارة أي من ذلك.

::: info وصول مبكر
Triggerfish Gateway حاليًا في مرحلة الوصول المبكر. قد تتغير الأسعار والميزات
أثناء تحسين المنتج. المشتركون في الوصول المبكر يحتفظون بسعرهم.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>مفتوح المصدر</h3>
  <div class="price">مجاني</div>
  <div class="subtitle">للأبد. Apache 2.0.</div>
  <ul>
    <li>منصة وكيل كاملة</li>
    <li>جميع القنوات (Telegram، Slack، Discord، WhatsApp، إلخ.)</li>
    <li>جميع التكاملات (GitHub، Google، Obsidian، إلخ.)</li>
    <li>التصنيف وتطبيق السياسات</li>
    <li>المهارات، الإضافات، المهام المجدولة، webhooks</li>
    <li>أتمتة المتصفح</li>
    <li>أحضر مفاتيح LLM الخاصة بك (Anthropic، OpenAI، Google، Ollama، إلخ.)</li>
    <li>أحضر مفاتيح البحث الخاصة بك (Brave، SearXNG)</li>
    <li>تحديثات تلقائية</li>
  </ul>
  <a href="/ar-SA/guide/installation" class="cta secondary">ثبّت الآن</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/شهر</span></div>
  <div class="subtitle">كل ما تحتاجه. بدون الحاجة لمفاتيح API.</div>
  <ul>
    <li>كل ما في النسخة المفتوحة المصدر</li>
    <li>استدلال AI مضمّن — واجهة خلفية مُدارة لـ LLM، بدون مفاتيح API</li>
    <li>بحث الويب مضمّن</li>
    <li>نفق سحابي لـ webhooks</li>
    <li>مهام مجدولة</li>
    <li>إعداد في أقل من دقيقتين</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=ar" class="cta primary">اشترك</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/شهر</span></div>
  <div class="subtitle">5 أضعاف استخدام Pro. لأحمال العمل الثقيلة.</div>
  <ul>
    <li>كل ما في Pro</li>
    <li>استدلال AI مضمّن — حدود استخدام أعلى</li>
    <li>فرق الوكلاء — تعاون متعدد الوكلاء</li>
    <li>جلسات متزامنة أكثر</li>
    <li>أنفاق سحابية متعددة</li>
    <li>مهام مجدولة غير محدودة</li>
    <li>ردود AI أطول</li>
    <li>دعم ذو أولوية</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=ar" class="cta primary">اشترك</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">مخصص</div>
  <div class="subtitle">نشر فرق العمل مع SSO والامتثال.</div>
  <ul>
    <li>كل ما في Power</li>
    <li>ترخيص متعدد المقاعد</li>
    <li>تكامل SSO / SAML</li>
    <li>حدود استخدام مخصصة</li>
    <li>توجيه نماذج مخصص</li>
    <li>دعم مخصص</li>
    <li>ضمانات SLA</li>
    <li>خيارات نشر محلي</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">تواصل مع المبيعات</a>
</div>

</div>

## مقارنة الميزات

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>مفتوح المصدر</th>
  <th>Pro</th>
  <th>Power</th>
  <th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">المنصة</td></tr>
<tr><td>جميع القنوات</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>جميع التكاملات</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>محرك التصنيف والسياسات</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>المهارات، الإضافات، webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>أتمتة المتصفح</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>بيئة التنفيذ</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>فرق الوكلاء</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI والبحث</td></tr>
<tr><td>مزوّد LLM</td><td>أحضر مفتاحك</td><td>مُدار</td><td>مُدار</td><td>مُدار</td></tr>
<tr><td>بحث الويب</td><td>أحضر مفتاحك</td><td>مضمّن</td><td>مضمّن</td><td>مضمّن</td></tr>
<tr><td>استخدام AI</td><td>حدود API الخاصة بك</td><td>قياسي</td><td>ممتد</td><td>مخصص</td></tr>

<tr class="section-header"><td colspan="5">البنية التحتية</td></tr>
<tr><td>أنفاق سحابية</td><td>&mdash;</td><td>&#10003;</td><td>متعددة</td><td>مخصص</td></tr>
<tr><td>مهام مجدولة</td><td>غير محدودة</td><td>&#10003;</td><td>غير محدودة</td><td>غير محدودة</td></tr>
<tr><td>تحديثات تلقائية</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">الدعم والإدارة</td></tr>
<tr><td>دعم المجتمع</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>دعم ذو أولوية</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>ترخيص متعدد المقاعد</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## كيف يعمل Triggerfish Gateway

Triggerfish Gateway ليس منتجًا منفصلًا — إنه واجهة خلفية مُدارة لنفس الوكيل
مفتوح المصدر الذي تشغّله بالفعل محليًا.

1. **اشترك** أعلاه — ستتلقى مفتاح الترخيص عبر البريد الإلكتروني بعد الدفع
2. **شغّل `triggerfish dive --force`** واختر Triggerfish Gateway كمزوّد
3. **أدخل مفتاح الترخيص** أو استخدم الرابط السحري للتفعيل التلقائي

هل اشتركت بالفعل على جهاز آخر؟ شغّل `triggerfish dive --force`، اختر
Triggerfish Gateway، واختر "لديّ حساب بالفعل" لتسجيل الدخول بالبريد الإلكتروني.

يُخزَّن مفتاح الترخيص في سلسلة مفاتيح نظام التشغيل. يمكنك إدارة اشتراكك
في أي وقت من خلال بوابة العملاء.

## الأسئلة الشائعة {.faq-section}

### هل يمكنني التبديل بين المفتوح المصدر والسحابي؟

نعم. تهيئة وكيلك هي ملف YAML واحد. شغّل `triggerfish dive --force` لإعادة
التهيئة في أي وقت. بدّل من مفاتيح API الخاصة بك إلى Triggerfish Gateway أو
العكس — تبقى SPINE والمهارات والقنوات والبيانات كما هي تمامًا.

### ما LLM الذي يستخدمه Triggerfish Gateway؟

يوجّه Triggerfish Gateway عبر بنية تحتية محسّنة للنماذج. يُدار اختيار
النموذج لك — نختار أفضل موازنة بين التكلفة والجودة ونتعامل مع التخزين المؤقت
وتجاوز الأعطال والتحسين تلقائيًا.

### هل يمكنني استخدام مفاتيح API الخاصة بي إلى جانب السحابي؟

نعم. يدعم Triggerfish سلاسل تجاوز الأعطال. يمكنك تهيئة السحابي كمزوّد
أساسي والرجوع إلى مفتاح Anthropic أو OpenAI الخاص بك، أو العكس.

### ماذا يحدث إذا انتهى اشتراكي؟

يستمر وكيلك في العمل. يعود إلى الوضع المحلي فقط — إذا كانت لديك مفاتيح
API خاصة بك مهيأة، فهي لا تزال تعمل. تتوقف ميزات السحابة (LLM المُدار، البحث،
الأنفاق) حتى تعيد الاشتراك. لا تُفقد أي بيانات.

### هل تُرسل بياناتي عبر خوادمكم؟

تُمرَّر طلبات LLM عبر بوابة السحابة إلى مزوّد النموذج.
لا نخزّن محتوى المحادثات. تُسجَّل بيانات الاستخدام الوصفية للفوترة.
وكيلك وبياناتك وSPINE ومهاراتك تبقى بالكامل على جهازك.

### كيف أدير اشتراكي؟

زُر بوابة العملاء لتحديث طرق الدفع أو تغيير الخطط أو الإلغاء.
