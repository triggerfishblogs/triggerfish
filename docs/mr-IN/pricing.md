---
title: किंमत
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

# किंमत

Triggerfish open source आहे आणि नेहमीच राहील. तुमच्या स्वतःच्या API keys आणा आणि
सर्वकाही locally free मध्ये run करा. Triggerfish Gateway managed LLM backend, web
search, tunnels, आणि updates add करतो — जेणेकरून तुम्हाला ते manage करायला नको.

::: info Early Access
Triggerfish Gateway सध्या early access मध्ये आहे. Product refine होत असताना किंमत आणि features बदलू शकतात. Early access subscribers त्यांची rate lock in करतात.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">मोफत</div>
  <div class="subtitle">कायमचे. Apache 2.0.</div>
  <ul>
    <li>संपूर्ण agent platform</li>
    <li>सर्व channels (Telegram, Slack, Discord, WhatsApp, इ.)</li>
    <li>सर्व integrations (GitHub, Google, Obsidian, इ.)</li>
    <li>Classification &amp; policy enforcement</li>
    <li>Skills, plugins, cron, webhooks</li>
    <li>Browser automation</li>
    <li>स्वतःच्या LLM keys आणा (Anthropic, OpenAI, Google, Ollama, इ.)</li>
    <li>स्वतःच्या search keys आणा (Brave, SearXNG)</li>
    <li>Automatic updates</li>
  </ul>
  <a href="/mr-IN/guide/installation" class="cta secondary">आत्ता Install करा</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/महिना</span></div>
  <div class="subtitle">तुम्हाला हवे ते सर्वकाही. API keys आवश्यक नाहीत.</div>
  <ul>
    <li>Open Source मधील सर्व काही</li>
    <li>AI inference समाविष्ट — managed LLM backend, API keys आवश्यक नाहीत</li>
    <li>Web search समाविष्ट</li>
    <li>Webhooks साठी Cloud tunnel</li>
    <li>Scheduled jobs</li>
    <li>2 मिनिटांत setup</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=en" class="cta primary">Subscribe करा</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/महिना</span></div>
  <div class="subtitle">Pro पेक्षा 5 पट जास्त usage. Heavy workloads साठी.</div>
  <ul>
    <li>Pro मधील सर्व काही</li>
    <li>AI inference समाविष्ट — higher usage limits</li>
    <li>Agent teams — multi-agent collaboration</li>
    <li>जास्त concurrent sessions</li>
    <li>Multiple cloud tunnels</li>
    <li>Unlimited scheduled jobs</li>
    <li>लांब AI responses</li>
    <li>Priority support</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=en" class="cta primary">Subscribe करा</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Custom</div>
  <div class="subtitle">SSO आणि compliance सह Team deployments.</div>
  <ul>
    <li>Power मधील सर्व काही</li>
    <li>Multi-seat licensing</li>
    <li>SSO / SAML integration</li>
    <li>Custom usage limits</li>
    <li>Custom model routing</li>
    <li>Dedicated support</li>
    <li>SLA guarantees</li>
    <li>On-premise deployment options</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Sales शी संपर्क करा</a>
</div>

</div>

## Feature तुलना

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
<tr><td>सर्व channels</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>सर्व integrations</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Classification &amp; policy engine</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Browser automation</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Exec environment</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Agent teams</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI &amp; Search</td></tr>
<tr><td>LLM provider</td><td>स्वतःचा आणा</td><td>Managed</td><td>Managed</td><td>Managed</td></tr>
<tr><td>Web search</td><td>स्वतःचा आणा</td><td>समाविष्ट</td><td>समाविष्ट</td><td>समाविष्ट</td></tr>
<tr><td>AI usage</td><td>तुमच्या API limits</td><td>Standard</td><td>Extended</td><td>Custom</td></tr>

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

## Triggerfish Gateway कसे काम करते

Triggerfish Gateway हे वेगळे product नाही — हे त्याच open-source agent साठी managed backend आहे जे तुम्ही आधीच locally run करता.

1. **वरील Subscribe करा** — checkout नंतर तुमची license key email द्वारे मिळेल
2. **`triggerfish dive --force` run करा** आणि तुमचा provider म्हणून Triggerfish Gateway निवडा
3. **तुमची license key टाका** किंवा automatically activate करण्यासाठी magic link flow वापरा

दुसऱ्या machine वर आधीच subscribed आहात? `triggerfish dive --force` run करा, Triggerfish Gateway निवडा, आणि तुमच्या email ने sign in करण्यासाठी "I already have an account" निवडा.

तुमची license key तुमच्या OS keychain मध्ये stored आहे. तुम्ही customer portal द्वारे कधीही तुमची subscription manage करू शकता.

## वारंवार विचारले जाणारे प्रश्न {.faq-section}

### मी Open Source आणि Cloud मध्ये switch करू शकतो का?

होय. तुमची agent config एकच YAML file आहे. कधीही reconfigure करण्यासाठी `triggerfish dive --force` run करा. तुमच्या स्वतःच्या API keys पासून Triggerfish Gateway कडे किंवा परत switch करा — तुमचे SPINE, skills, channels, आणि data exactly तेच राहतात.

### Triggerfish Gateway कोणता LLM वापरतो?

Triggerfish Gateway optimized model infrastructure द्वारे route करतो. Model selection तुमच्यासाठी managed आहे — आम्ही सर्वोत्तम cost/quality tradeoff निवडतो आणि caching, failover, आणि optimization automatically handle करतो.

### मी Cloud सोबत माझ्या स्वतःच्या API keys वापरू शकतो का?

होय. Triggerfish failover chains support करतो. तुम्ही Cloud primary provider म्हणून configure करू शकता आणि तुमच्या स्वतःच्या Anthropic किंवा OpenAI key कडे fall back करू शकता, किंवा उलट.

### माझी subscription lapse झाल्यास काय होते?

तुमचा agent running राहतो. तो local-only mode कडे fall back होतो — तुमच्याकडे स्वतःच्या API keys configured असल्यास, त्या अजूनही काम करतात. Cloud features (managed LLM, search, tunnels) तुम्ही resubscribe करेपर्यंत थांबतात. कोणताही data lost होत नाही.

### माझा data तुमच्या servers मधून जातो का?

LLM requests cloud gateway द्वारे model provider कडे proxied केल्या जातात.
आम्ही conversation content store करत नाही. Billing साठी usage metadata logged केले जाते.
तुमचा agent, data, SPINE, आणि skills संपूर्णपणे तुमच्या machine वर राहतात.

### मी माझी subscription कशी manage करू?

Payment methods update करण्यासाठी, plans switch करण्यासाठी, किंवा cancel करण्यासाठी customer portal ला भेट द्या.
