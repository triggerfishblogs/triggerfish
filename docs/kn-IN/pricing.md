---
title: ಬೆಲೆ
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

# ಬೆಲೆ

Triggerfish open source ಆಗಿದೆ ಮತ್ತು ಯಾವಾಗಲೂ ಹಾಗೇ ಇರುತ್ತದೆ. ನಿಮ್ಮ ಸ್ವಂತ API keys ತನ್ನಿ ಮತ್ತು ಎಲ್ಲವನ್ನೂ ಉಚಿತವಾಗಿ locally run ಮಾಡಿ. Triggerfish Gateway managed LLM backend, web search, tunnels, ಮತ್ತು updates add ಮಾಡುತ್ತದೆ — ಇದರಿಂದ ಅದ್ಯಾವುದನ್ನೂ ನೀವು manage ಮಾಡಬೇಕಾಗಿಲ್ಲ.

::: info Early Access
Triggerfish Gateway ಪ್ರಸ್ತುತ early access ನಲ್ಲಿದೆ. ಉತ್ಪನ್ನ ಪರಿಷ್ಕರಿಸುವಾಗ ಬೆಲೆ ಮತ್ತು features ಬದಲಾಗಬಹುದು. Early access subscribers ತಮ್ಮ ದರ lock in ಮಾಡಿಕೊಳ್ಳುತ್ತಾರೆ.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">ಉಚಿತ</div>
  <div class="subtitle">ಶಾಶ್ವತ. Apache 2.0.</div>
  <ul>
    <li>ಸಂಪೂರ್ಣ agent platform</li>
    <li>ಎಲ್ಲ channels (Telegram, Slack, Discord, WhatsApp, ಇತ್ಯಾದಿ)</li>
    <li>ಎಲ್ಲ integrations (GitHub, Google, Obsidian, ಇತ್ಯಾದಿ)</li>
    <li>Classification &amp; policy enforcement</li>
    <li>Skills, plugins, cron, webhooks</li>
    <li>Browser automation</li>
    <li>ನಿಮ್ಮ ಸ್ವಂತ LLM keys ತನ್ನಿ (Anthropic, OpenAI, Google, Ollama, ಇತ್ಯಾದಿ)</li>
    <li>ನಿಮ್ಮ ಸ್ವಂತ search keys ತನ್ನಿ (Brave, SearXNG)</li>
    <li>Automatic updates</li>
  </ul>
  <a href="/kn-IN/guide/installation" class="cta secondary">ಈಗಲೇ Install ಮಾಡಿ</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/ತಿಂಗಳು</span></div>
  <div class="subtitle">ನಿಮಗೆ ಬೇಕಾದ ಎಲ್ಲವೂ. API keys ಬೇಕಾಗಿಲ್ಲ.</div>
  <ul>
    <li>Open Source ನಲ್ಲಿರುವ ಎಲ್ಲವೂ</li>
    <li>AI inference included — managed LLM backend, API keys ಬೇಕಾಗಿಲ್ಲ</li>
    <li>Web search included</li>
    <li>Webhooks ಗಾಗಿ cloud tunnel</li>
    <li>Scheduled jobs</li>
    <li>2 ನಿಮಿಷಗಳಿಗಿಂತ ಕಡಿಮೆ ಸಮಯದಲ್ಲಿ Setup</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=en" class="cta primary">Subscribe ಮಾಡಿ</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/ತಿಂಗಳು</span></div>
  <div class="subtitle">Pro ಗಿಂತ 5x ಹೆಚ್ಚು usage. ಭಾರೀ workloads ಗಾಗಿ.</div>
  <ul>
    <li>Pro ನಲ್ಲಿರುವ ಎಲ್ಲವೂ</li>
    <li>AI inference included — ಹೆಚ್ಚಿನ usage limits</li>
    <li>Agent teams — multi-agent collaboration</li>
    <li>ಹೆಚ್ಚು concurrent sessions</li>
    <li>ಅನೇಕ cloud tunnels</li>
    <li>Unlimited scheduled jobs</li>
    <li>ದೀರ್ಘ AI responses</li>
    <li>Priority support</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=en" class="cta primary">Subscribe ಮಾಡಿ</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Custom</div>
  <div class="subtitle">SSO ಮತ್ತು compliance ಸಹಿತ team deployments.</div>
  <ul>
    <li>Power ನಲ್ಲಿರುವ ಎಲ್ಲವೂ</li>
    <li>Multi-seat licensing</li>
    <li>SSO / SAML integration</li>
    <li>Custom usage limits</li>
    <li>Custom model routing</li>
    <li>Dedicated support</li>
    <li>SLA guarantees</li>
    <li>On-premise deployment options</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Sales ಸಂಪರ್ಕಿಸಿ</a>
</div>

</div>

## Feature ಹೋಲಿಕೆ

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
<tr><td>ಎಲ್ಲ channels</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>ಎಲ್ಲ integrations</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Classification &amp; policy engine</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Browser automation</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Exec environment</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Agent teams</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI &amp; Search</td></tr>
<tr><td>LLM provider</td><td>ನಿಮ್ಮದೇ ತನ್ನಿ</td><td>Managed</td><td>Managed</td><td>Managed</td></tr>
<tr><td>Web search</td><td>ನಿಮ್ಮದೇ ತನ್ನಿ</td><td>Included</td><td>Included</td><td>Included</td></tr>
<tr><td>AI usage</td><td>ನಿಮ್ಮ API limits</td><td>Standard</td><td>Extended</td><td>Custom</td></tr>

<tr class="section-header"><td colspan="5">Infrastructure</td></tr>
<tr><td>Cloud tunnels</td><td>&mdash;</td><td>&#10003;</td><td>ಅನೇಕ</td><td>Custom</td></tr>
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

## Triggerfish Gateway ಹೇಗೆ ಕಾರ್ಯ ನಿರ್ವಹಿಸುತ್ತದೆ

Triggerfish Gateway ಪ್ರತ್ಯೇಕ ಉತ್ಪನ್ನವಲ್ಲ — ಇದು ನೀವು locally run ಮಾಡುವ ಅದೇ open-source agent ಗಾಗಿ ಒಂದು managed backend.

1. **Subscribe ಮಾಡಿ** ಮೇಲೆ — checkout ನಂತರ ನಿಮ್ಮ license key email ಮೂಲಕ ಬರುತ್ತದೆ
2. **`triggerfish dive --force` ಚಲಾಯಿಸಿ** ಮತ್ತು Triggerfish Gateway ಅನ್ನು ನಿಮ್ಮ provider ಆಗಿ select ಮಾಡಿ
3. **ನಿಮ್ಮ license key ನಮೂದಿಸಿ** ಅಥವಾ automatically activate ಮಾಡಲು magic link flow ಬಳಸಿ

ಮತ್ತೊಂದು machine ನಲ್ಲಿ ಈಗಾಗಲೇ subscribe ಮಾಡಿದ್ದೀರಾ? `triggerfish dive --force` ಚಲಾಯಿಸಿ, Triggerfish Gateway select ಮಾಡಿ, ಮತ್ತು ನಿಮ್ಮ email ಜೊತೆ sign in ಮಾಡಲು "I already have an account" ಆರಿಸಿ.

ನಿಮ್ಮ license key ನಿಮ್ಮ OS keychain ನಲ್ಲಿ store ಮಾಡಲಾಗುತ್ತದೆ. customer portal ಮೂಲಕ ನೀವು ಯಾವಾಗ ಬೇಕಾದರೂ ನಿಮ್ಮ subscription manage ಮಾಡಬಹುದು.

## FAQ {.faq-section}

### Open Source ಮತ್ತು Cloud ನಡುವೆ switch ಮಾಡಬಹುದೇ?

ಹೌದು. ನಿಮ್ಮ agent config ಒಂದೇ YAML file. ಯಾವ ಸಮಯದಲ್ಲಾದರೂ reconfigure ಮಾಡಲು `triggerfish dive --force` ಚಲಾಯಿಸಿ. ನಿಮ್ಮ ಸ್ವಂತ API keys ನಿಂದ Triggerfish Gateway ಗೆ ಅಥವಾ ಹಿಂದಕ್ಕೆ switch ಮಾಡಿ — ನಿಮ್ಮ SPINE, skills, channels, ಮತ್ತು data ಯಾವಾಗಲೂ ಅದೇ ರೀತಿ ಉಳಿಯುತ್ತದೆ.

### Triggerfish Gateway ಯಾವ LLM ಬಳಸುತ್ತದೆ?

Triggerfish Gateway optimized model infrastructure ಮೂಲಕ route ಮಾಡುತ್ತದೆ. Model selection ನಿಮಗಾಗಿ manage ಮಾಡಲಾಗುತ್ತದೆ — ನಾವು ಅತ್ಯುತ್ತಮ cost/quality tradeoff ಆರಿಸಿ caching, failover, ಮತ್ತು optimization ಸ್ವಯಂಚಾಲಿತವಾಗಿ handle ಮಾಡುತ್ತೇವೆ.

### Cloud ಜೊತೆ ನನ್ನ ಸ್ವಂತ API keys ಬಳಸಬಹುದೇ?

ಹೌದು. Triggerfish failover chains support ಮಾಡುತ್ತದೆ. Cloud ಅನ್ನು ನಿಮ್ಮ primary provider ಆಗಿ configure ಮಾಡಿ ನಿಮ್ಮ ಸ್ವಂತ Anthropic ಅಥವಾ OpenAI key ಗೆ fallback ಮಾಡಬಹುದು, ಅಥವಾ vice versa.

### ನನ್ನ subscription ಮುಗಿದರೆ ಏನಾಗುತ್ತದೆ?

ನಿಮ್ಮ agent ಚಲಿಸುತ್ತಲೇ ಇರುತ್ತದೆ. ಅದು local-only mode ಗೆ fallback ಮಾಡುತ್ತದೆ — ನಿಮ್ಮ ಸ್ವಂತ API keys configure ಮಾಡಿದ್ದರೆ, ಅವು ಇನ್ನೂ ಕಾರ್ಯ ಮಾಡುತ್ತವೆ. ಮತ್ತೆ subscribe ಮಾಡುವವರೆಗೆ Cloud features (managed LLM, search, tunnels) ನಿಲ್ಲುತ್ತವೆ. ಯಾವ data ಕಳೆದುಹೋಗುವುದಿಲ್ಲ.

### ನನ್ನ data ನಿಮ್ಮ servers ಮೂಲಕ ಹೋಗುತ್ತದೆಯೇ?

LLM requests model provider ಗೆ cloud gateway ಮೂಲಕ proxy ಮಾಡಲಾಗುತ್ತದೆ. ನಾವು conversation content store ಮಾಡುವುದಿಲ್ಲ. Billing ಗಾಗಿ Usage metadata log ಮಾಡಲಾಗುತ್ತದೆ. ನಿಮ್ಮ agent, data, SPINE, ಮತ್ತು skills ಸಂಪೂರ್ಣವಾಗಿ ನಿಮ್ಮ machine ನಲ್ಲಿ ಉಳಿಯುತ್ತವೆ.

### ನನ್ನ subscription ಹೇಗೆ manage ಮಾಡಬೇಕು?

Payment methods update ಮಾಡಲು, plans switch ಮಾಡಲು, ಅಥವಾ cancel ಮಾಡಲು customer portal visit ಮಾಡಿ.
