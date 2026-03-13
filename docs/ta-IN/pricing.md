---
title: Pricing
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

# Pricing

Triggerfish open source மற்றும் எப்போதும் அப்படியே இருக்கும். உங்கள் own API keys கொண்டு வந்து எல்லாவற்றையும் local ஆக இலவசமாக இயக்கவும். Triggerfish Gateway managed LLM backend, web search, tunnels, மற்றும் updates சேர்க்கிறது — இவற்றை நீங்கள் manage செய்ய வேண்டியதில்லை.

::: info Early Access
Triggerfish Gateway தற்போது early access இல் உள்ளது. Product refine ஆகும்போது pricing மற்றும் features மாறலாம். Early access subscribers தங்கள் rate lock in செய்கிறார்கள்.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">இலவசம்</div>
  <div class="subtitle">எப்போதும். Apache 2.0.</div>
  <ul>
    <li>முழு agent platform</li>
    <li>அனைத்து channels (Telegram, Slack, Discord, WhatsApp, போன்றவை)</li>
    <li>அனைத்து integrations (GitHub, Google, Obsidian, போன்றவை)</li>
    <li>Classification &amp; policy enforcement</li>
    <li>Skills, plugins, cron, webhooks</li>
    <li>Browser automation</li>
    <li>உங்கள் own LLM keys கொண்டு வாருங்கள் (Anthropic, OpenAI, Google, Ollama, போன்றவை)</li>
    <li>உங்கள் own search keys கொண்டு வாருங்கள் (Brave, SearXNG)</li>
    <li>Automatic updates</li>
  </ul>
  <a href="/ta-IN/guide/installation" class="cta secondary">இப்போது Install செய்யவும்</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/மாதம்</span></div>
  <div class="subtitle">தேவையான எல்லாம். API keys தேவையில்லை.</div>
  <ul>
    <li>Open Source இல் உள்ள எல்லாம்</li>
    <li>AI inference included — managed LLM backend, API keys தேவையில்லை</li>
    <li>Web search included</li>
    <li>Webhooks க்கு cloud tunnel</li>
    <li>Scheduled jobs</li>
    <li>2 நிமிடத்திற்கும் குறைவாக Setup</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=en" class="cta primary">Subscribe செய்யவும்</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/மாதம்</span></div>
  <div class="subtitle">Pro விட 5x அதிக usage. Heavy workloads க்கு.</div>
  <ul>
    <li>Pro இல் உள்ள எல்லாம்</li>
    <li>AI inference included — higher usage limits</li>
    <li>Agent teams — multi-agent collaboration</li>
    <li>More concurrent sessions</li>
    <li>Multiple cloud tunnels</li>
    <li>Unlimited scheduled jobs</li>
    <li>நீண்ட AI responses</li>
    <li>Priority support</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=en" class="cta primary">Subscribe செய்யவும்</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Custom</div>
  <div class="subtitle">SSO மற்றும் compliance உடன் team deployments.</div>
  <ul>
    <li>Power இல் உள்ள எல்லாம்</li>
    <li>Multi-seat licensing</li>
    <li>SSO / SAML integration</li>
    <li>Custom usage limits</li>
    <li>Custom model routing</li>
    <li>Dedicated support</li>
    <li>SLA guarantees</li>
    <li>On-premise deployment options</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Sales ஐ Contact செய்யவும்</a>
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
<tr><td>அனைத்து channels</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>அனைத்து integrations</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Classification &amp; policy engine</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Browser automation</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Exec environment</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Agent teams</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI &amp; Search</td></tr>
<tr><td>LLM provider</td><td>உங்களிடம் இருப்பதை கொண்டு வாருங்கள்</td><td>Managed</td><td>Managed</td><td>Managed</td></tr>
<tr><td>Web search</td><td>உங்களிடம் இருப்பதை கொண்டு வாருங்கள்</td><td>Included</td><td>Included</td><td>Included</td></tr>
<tr><td>AI usage</td><td>உங்கள் API limits</td><td>Standard</td><td>Extended</td><td>Custom</td></tr>

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

## Triggerfish Gateway எவ்வாறு வேலை செய்கிறது

Triggerfish Gateway separate product இல்லை — இது நீங்கள் locally இயக்கும் same open-source agent க்கான managed backend.

1. **மேலே Subscribe செய்யவும்** — checkout க்கு பிறகு email மூலம் license key கிடைக்கும்
2. **`triggerfish dive --force` இயக்கவும்** மற்றும் Triggerfish Gateway ஐ provider ஆக select செய்யவும்
3. **License key உள்ளிடவும்** அல்லது automatically activate செய்ய magic link flow பயன்படுத்தவும்

மற்றொரு machine இல் subscribe செய்தீர்களா? `triggerfish dive --force` இயக்கவும், Triggerfish Gateway select செய்யவும், email உடன் sign in செய்ய "I already have an account" choose செய்யவும்.

License key உங்கள் OS keychain இல் stored. Customer portal மூலம் எப்போதும் subscription manage செய்யலாம்.

## FAQ {.faq-section}

### Open Source மற்றும் Cloud இடையே switch செய்யலாமா?

ஆம். உங்கள் agent config ஒரே ஒரு YAML file. எப்போதும் reconfigure செய்ய `triggerfish dive --force` இயக்கவும். உங்கள் own API keys இலிருந்து Triggerfish Gateway க்கு அல்லது மீண்டும் switch செய்யவும் — உங்கள் SPINE, skills, channels, மற்றும் data exactly same ஆக இருக்கும்.

### Triggerfish Gateway என்ன LLM பயன்படுத்துகிறது?

Triggerfish Gateway optimized model infrastructure மூலம் route செய்கிறது. Model selection உங்களுக்காக manage ஆகிறது — சிறந்த cost/quality tradeoff pick செய்கிறோம் மற்றும் caching, failover, மற்றும் optimization automatically handle செய்கிறோம்.

### Cloud உடன் சேர்த்து என் own API keys பயன்படுத்தலாமா?

ஆம். Triggerfish failover chains support செய்கிறது. Cloud ஐ primary provider ஆக configure செய்து உங்கள் own Anthropic அல்லது OpenAI key க்கு fall back செய்யலாம், அல்லது vice versa.

### Subscription lapse ஆனால் என்ன நடக்கும்?

Agent தொடர்ந்து இயங்கும். Local-only mode க்கு fall back ஆகும் — உங்கள் own API keys configure செய்திருந்தால், அவை still வேலை செய்யும். Cloud features (managed LLM, search, tunnels) resubscribe செய்யும் வரை stop ஆகும். Data இழக்கப்படாது.

### என் data உங்கள் servers மூலம் அனுப்பப்படுகிறதா?

LLM requests cloud gateway மூலம் model provider க்கு proxied ஆகின்றன. Conversation content store செய்வதில்லை. Billing க்கு usage metadata logged ஆகிறது. உங்கள் agent, data, SPINE, மற்றும் skills முழுவதும் உங்கள் machine இல் இருக்கும்.

### Subscription எவ்வாறு manage செய்வது?

Payment methods update செய்ய, plans switch செய்ய, அல்லது cancel செய்ய customer portal visit செய்யவும்.
