---
title: قیمتیں
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

# قیمتیں

Triggerfish open source ہے اور ہمیشہ رہے گا۔ اپنی API keys لائیں اور سب کچھ
مفت local طور پر چلائیں۔ Triggerfish Gateway ایک managed LLM backend، web
search، tunnels، اور updates add کرتا ہے — تاکہ آپ کو ان میں سے کچھ بھی manage نہ کرنا پڑے۔

::: info Early Access
Triggerfish Gateway فی الحال early access میں ہے۔ قیمتیں اور features بدل سکتے ہیں
جیسے ہم product کو refine کرتے ہیں۔ Early access subscribers اپنی rate lock in کر لیتے ہیں۔
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">مفت</div>
  <div class="subtitle">ہمیشہ کے لیے۔ Apache 2.0۔</div>
  <ul>
    <li>مکمل agent platform</li>
    <li>تمام channels (Telegram، Slack، Discord، WhatsApp، وغیرہ)</li>
    <li>تمام integrations (GitHub، Google، Obsidian، وغیرہ)</li>
    <li>Classification &amp; policy enforcement</li>
    <li>Skills، plugins، cron، webhooks</li>
    <li>Browser automation</li>
    <li>اپنی LLM keys لائیں (Anthropic، OpenAI، Google، Ollama، وغیرہ)</li>
    <li>اپنی search keys لائیں (Brave، SearXNG)</li>
    <li>Automatic updates</li>
  </ul>
  <a href="/ur-PK/guide/installation" class="cta secondary">ابھی Install کریں</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/ماہ</span></div>
  <div class="subtitle">جو کچھ چاہیے سب یہاں۔ کوئی API keys ضروری نہیں۔</div>
  <ul>
    <li>Open Source میں سب کچھ</li>
    <li>AI inference شامل — managed LLM backend، کوئی API keys ضروری نہیں</li>
    <li>Web search شامل</li>
    <li>Webhooks کے لیے Cloud tunnel</li>
    <li>Scheduled jobs</li>
    <li>2 منٹ سے کم میں Setup</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=en" class="cta primary">Subscribe کریں</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/ماہ</span></div>
  <div class="subtitle">Pro سے 5 گنا زیادہ usage۔ بھاری workloads کے لیے۔</div>
  <ul>
    <li>Pro میں سب کچھ</li>
    <li>AI inference شامل — زیادہ usage limits</li>
    <li>Agent teams — multi-agent collaboration</li>
    <li>زیادہ concurrent sessions</li>
    <li>Multiple cloud tunnels</li>
    <li>Unlimited scheduled jobs</li>
    <li>لمبے AI responses</li>
    <li>Priority support</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=en" class="cta primary">Subscribe کریں</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Custom</div>
  <div class="subtitle">SSO اور compliance کے ساتھ team deployments۔</div>
  <ul>
    <li>Power میں سب کچھ</li>
    <li>Multi-seat licensing</li>
    <li>SSO / SAML integration</li>
    <li>Custom usage limits</li>
    <li>Custom model routing</li>
    <li>Dedicated support</li>
    <li>SLA guarantees</li>
    <li>On-premise deployment options</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Sales سے رابطہ کریں</a>
</div>

</div>

## Feature Comparison

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>Open Source</th>
  <th>Pro</th>
  <th>Power</th>
  <th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">Platform</td></tr>
<tr><td>تمام channels</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>تمام integrations</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Classification &amp; policy engine</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills، plugins، webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Browser automation</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Exec environment</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Agent teams</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI &amp; Search</td></tr>
<tr><td>LLM provider</td><td>اپنی لائیں</td><td>Managed</td><td>Managed</td><td>Managed</td></tr>
<tr><td>Web search</td><td>اپنی لائیں</td><td>شامل</td><td>شامل</td><td>شامل</td></tr>
<tr><td>AI usage</td><td>آپ کی API limits</td><td>Standard</td><td>Extended</td><td>Custom</td></tr>

<tr class="section-header"><td colspan="5">Infrastructure</td></tr>
<tr><td>Cloud tunnels</td><td>&mdash;</td><td>&#10003;</td><td>Multiple</td><td>Custom</td></tr>
<tr><td>Scheduled jobs</td><td>Unlimited</td><td>&#10003;</td><td>Unlimited</td><td>Unlimited</td></tr>
<tr><td>Automatic updates</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">Support &amp; Admin</td></tr>
<tr><td>Community support</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Priority support</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Multi-seat licensing</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Triggerfish Gateway کیسے کام کرتا ہے

Triggerfish Gateway ایک الگ product نہیں — یہ اسی open-source agent کے لیے ایک
managed backend ہے جو آپ پہلے سے locally چلاتے ہیں۔

1. **اوپر Subscribe کریں** — checkout کے بعد آپ کو email میں license key ملے گی
2. **`triggerfish dive --force` چلائیں** اور Triggerfish Gateway کو اپنا provider select کریں
3. **اپنی license key درج کریں** یا automatically activate کرنے کے لیے magic link flow استعمال کریں

کسی دوسری machine پر پہلے سے subscribe ہیں؟ `triggerfish dive --force` چلائیں،
Triggerfish Gateway select کریں، اور اپنے email سے sign in کرنے کے لیے "I already have an account" چنیں۔

آپ کی license key آپ کے OS keychain میں stored ہے۔ آپ customer portal کے ذریعے
کسی بھی وقت اپنی subscription manage کر سکتے ہیں۔

## اکثر پوچھے جانے والے سوالات {.faq-section}

### کیا میں Open Source اور Cloud کے درمیان switch کر سکتا ہوں؟

ہاں۔ آپ کا agent config ایک single YAML file ہے۔ کسی بھی وقت reconfigure کرنے کے لیے `triggerfish dive --force` چلائیں۔ اپنی API keys سے Triggerfish Gateway پر یا واپس switch کریں — آپ کی SPINE، skills، channels، اور data بالکل وہی رہتی ہے۔

### Triggerfish Gateway کون سا LLM استعمال کرتا ہے؟

Triggerfish Gateway optimized model infrastructure کے ذریعے route کرتا ہے۔ Model selection آپ کے لیے manage کیا جاتا ہے — ہم best cost/quality tradeoff چنتے ہیں اور caching، failover، اور optimization خود-بخود handle کرتے ہیں۔

### کیا میں Cloud کے ساتھ اپنی API keys استعمال کر سکتا ہوں؟

ہاں۔ Triggerfish failover chains support کرتا ہے۔ آپ Cloud کو primary provider اور اپنی Anthropic یا OpenAI key کو fallback کے طور پر configure کر سکتے ہیں، یا اس کے برعکس۔

### اگر میری subscription lapse ہو جائے تو کیا ہوگا؟

آپ کا agent چلتا رہتا ہے۔ یہ local-only mode پر fall back کرتا ہے — اگر آپ کی اپنی API keys configure ہیں تو وہ کام کرتی رہتی ہیں۔ Cloud features (managed LLM، search، tunnels) دوبارہ subscribe کرنے تک بند ہو جاتے ہیں۔ کوئی data نہیں جاتا۔

### کیا میرا data آپ کے servers سے گزرتا ہے؟

LLM requests cloud gateway کے ذریعے model provider تک proxy ہوتی ہیں۔ ہم conversation content store نہیں کرتے۔ Usage metadata billing کے لیے log کی جاتی ہے۔ آپ کا agent، data، SPINE، اور skills مکمل طور پر آپ کی machine پر رہتے ہیں۔

### میں اپنی subscription کیسے manage کروں؟

Payment methods update کرنے، plans switch کرنے، یا cancel کرنے کے لیے customer portal visit کریں۔
