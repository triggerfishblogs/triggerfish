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

Triggerfish is open source and always will be. Bring your own API keys and run
everything locally for free. Triggerfish Gateway adds a managed LLM backend, web
search, tunnels, and updates — so you don't have to manage any of it.

::: info Early Access
Triggerfish Gateway is currently in early access. Pricing and features may change
as we refine the product. Early access subscribers lock in their rate.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">Free</div>
  <div class="subtitle">Forever. Apache 2.0.</div>
  <ul>
    <li>Full agent platform</li>
    <li>All channels (Telegram, Slack, Discord, WhatsApp, etc.)</li>
    <li>All integrations (GitHub, Google, Obsidian, etc.)</li>
    <li>Classification &amp; policy enforcement</li>
    <li>Skills, plugins, cron, webhooks</li>
    <li>Browser automation</li>
    <li>Bring your own LLM keys (Anthropic, OpenAI, Google, Ollama, etc.)</li>
    <li>Bring your own search keys (Brave, SearXNG)</li>
    <li>Automatic updates</li>
  </ul>
  <a href="/guide/installation" class="cta secondary">Install Now</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/month</span></div>
  <div class="subtitle">Everything you need. No API keys required.</div>
  <ul>
    <li>Everything in Open Source</li>
    <li>AI inference included — managed LLM backend, no API keys needed</li>
    <li>Web search included</li>
    <li>Cloud tunnel for webhooks</li>
    <li>Scheduled jobs</li>
    <li>Setup in under 2 minutes</li>
  </ul>
  <a href="https://buy.stripe.com/aFa14m9mobpH0vc4mlao800" class="cta primary">Subscribe</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/month</span></div>
  <div class="subtitle">5x more usage than Pro. For heavy workloads.</div>
  <ul>
    <li>Everything in Pro</li>
    <li>AI inference included — higher usage limits</li>
    <li>Agent teams — multi-agent collaboration</li>
    <li>More concurrent sessions</li>
    <li>Multiple cloud tunnels</li>
    <li>Unlimited scheduled jobs</li>
    <li>Longer AI responses</li>
    <li>Priority support</li>
  </ul>
  <a href="https://buy.stripe.com/5kQdR89mo2Tb4Lsg53ao802" class="cta primary">Subscribe</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Custom</div>
  <div class="subtitle">Team deployments with SSO and compliance.</div>
  <ul>
    <li>Everything in Power</li>
    <li>Multi-seat licensing</li>
    <li>SSO / SAML integration</li>
    <li>Custom usage limits</li>
    <li>Custom model routing</li>
    <li>Dedicated support</li>
    <li>SLA guarantees</li>
    <li>On-premise deployment options</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Contact Sales</a>
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
<tr><td>All channels</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>All integrations</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Classification &amp; policy engine</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Browser automation</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Exec environment</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Agent teams</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI &amp; Search</td></tr>
<tr><td>LLM provider</td><td>Bring your own</td><td>Managed</td><td>Managed</td><td>Managed</td></tr>
<tr><td>Web search</td><td>Bring your own</td><td>Included</td><td>Included</td><td>Included</td></tr>
<tr><td>AI usage</td><td>Your API limits</td><td>Standard</td><td>Extended</td><td>Custom</td></tr>

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

## How Triggerfish Gateway Works

Triggerfish Gateway is not a separate product — it's a managed backend for the
same open-source agent you already run locally.

1. **Subscribe** above — you'll receive your license key by email after checkout
2. **Run `triggerfish dive --force`** and select Triggerfish Gateway as your provider
3. **Enter your license key** or use the magic link flow to activate automatically

Already subscribed on another machine? Run `triggerfish dive --force`, select
Triggerfish Gateway, and choose "I already have an account" to sign in with your
email.

Your license key is stored in your OS keychain. You can manage your subscription
anytime through the customer portal.

## FAQ {.faq-section}

### Can I switch between Open Source and Cloud?

Yes. Your agent config is a single YAML file. Run `triggerfish dive --force` to
reconfigure at any time. Switch from your own API keys to Triggerfish Gateway or
back — your SPINE, skills, channels, and data stay exactly the same.

### What LLM does Triggerfish Gateway use?

Triggerfish Gateway routes through optimized model infrastructure. The model
selection is managed for you — we pick the best cost/quality tradeoff and handle
caching, failover, and optimization automatically.

### Can I use my own API keys alongside Cloud?

Yes. Triggerfish supports failover chains. You can configure Cloud as your
primary provider and fall back to your own Anthropic or OpenAI key, or vice
versa.

### What happens if my subscription lapses?

Your agent keeps running. It falls back to local-only mode — if you have your
own API keys configured, those still work. Cloud features (managed LLM, search,
tunnels) stop until you resubscribe. No data is lost.

### Is my data sent through your servers?

LLM requests are proxied through the cloud gateway to the model provider.
We do not store conversation content. Usage metadata is logged for billing.
Your agent, data, SPINE, and skills remain entirely on your machine.

### How do I manage my subscription?

Visit the customer portal to update payment methods, switch plans, or cancel.
