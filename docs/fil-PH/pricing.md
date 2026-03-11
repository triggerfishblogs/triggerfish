---
title: Presyo
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

# Presyo

Ang Triggerfish ay open source at palaging magiging ganoon. Magdala ng sarili mong API keys at
patakbuhin ang lahat nang lokal nang libre. Ang Triggerfish Gateway ay nagdadagdag ng managed LLM backend,
web search, tunnels, at updates — para hindi mo na kailangang i-manage ang lahat ng iyon.

::: info Early Access
Ang Triggerfish Gateway ay kasalukuyang nasa early access. Ang presyo at features ay maaaring magbago
habang pino-polish namin ang produkto. Ang mga early access subscriber ay naka-lock sa kanilang rate.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">Libre</div>
  <div class="subtitle">Magpakailanman. Apache 2.0.</div>
  <ul>
    <li>Buong agent platform</li>
    <li>Lahat ng channels (Telegram, Slack, Discord, WhatsApp, atbp.)</li>
    <li>Lahat ng integrations (GitHub, Google, Obsidian, atbp.)</li>
    <li>Classification at policy enforcement</li>
    <li>Skills, plugins, cron, webhooks</li>
    <li>Browser automation</li>
    <li>Dalhin ang sarili mong LLM keys (Anthropic, OpenAI, Google, Ollama, atbp.)</li>
    <li>Dalhin ang sarili mong search keys (Brave, SearXNG)</li>
    <li>Awtomatikong updates</li>
  </ul>
  <a href="/fil-PH/guide/installation" class="cta secondary">I-install Ngayon</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/buwan</span></div>
  <div class="subtitle">Lahat ng kailangan mo. Walang API keys na kailangan.</div>
  <ul>
    <li>Lahat ng nasa Open Source</li>
    <li>Kasama ang AI inference — managed LLM backend, walang API keys na kailangan</li>
    <li>Kasama ang web search</li>
    <li>Cloud tunnel para sa webhooks</li>
    <li>Scheduled jobs</li>
    <li>Setup sa loob ng 2 minuto</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=fil" class="cta primary">Mag-subscribe</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/buwan</span></div>
  <div class="subtitle">5x na mas maraming usage kaysa Pro. Para sa mabibigat na workloads.</div>
  <ul>
    <li>Lahat ng nasa Pro</li>
    <li>Kasama ang AI inference — mas mataas na usage limits</li>
    <li>Agent teams — multi-agent collaboration</li>
    <li>Mas maraming concurrent sessions</li>
    <li>Maramihang cloud tunnels</li>
    <li>Walang limitasyong scheduled jobs</li>
    <li>Mas mahabang AI responses</li>
    <li>Priority support</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=fil" class="cta primary">Mag-subscribe</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Custom</div>
  <div class="subtitle">Team deployments na may SSO at compliance.</div>
  <ul>
    <li>Lahat ng nasa Power</li>
    <li>Multi-seat licensing</li>
    <li>SSO / SAML integration</li>
    <li>Custom na usage limits</li>
    <li>Custom na model routing</li>
    <li>Dedicated support</li>
    <li>SLA guarantees</li>
    <li>On-premise deployment options</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Makipag-ugnayan sa Sales</a>
</div>

</div>

## Paghahambing ng Features

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
<tr><td>Lahat ng channels</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Lahat ng integrations</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Classification at policy engine</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Browser automation</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Exec environment</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Agent teams</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI at Search</td></tr>
<tr><td>LLM provider</td><td>Dalhin ang sarili mo</td><td>Managed</td><td>Managed</td><td>Managed</td></tr>
<tr><td>Web search</td><td>Dalhin ang sarili mo</td><td>Kasama</td><td>Kasama</td><td>Kasama</td></tr>
<tr><td>AI usage</td><td>Iyong API limits</td><td>Standard</td><td>Extended</td><td>Custom</td></tr>

<tr class="section-header"><td colspan="5">Infrastructure</td></tr>
<tr><td>Cloud tunnels</td><td>&mdash;</td><td>&#10003;</td><td>Marami</td><td>Custom</td></tr>
<tr><td>Scheduled jobs</td><td>Walang limitasyon</td><td>&#10003;</td><td>Walang limitasyon</td><td>Walang limitasyon</td></tr>
<tr><td>Awtomatikong updates</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">Support at Admin</td></tr>
<tr><td>Community support</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Priority support</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Multi-seat licensing</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Paano Gumagana ang Triggerfish Gateway

Ang Triggerfish Gateway ay hindi isang hiwalay na produkto — ito ay isang managed backend para sa
parehong open-source agent na pinapatakbo mo na sa lokal.

1. **Mag-subscribe** sa itaas — matatanggap mo ang iyong license key sa email pagkatapos ng checkout
2. **Patakbuhin ang `triggerfish dive --force`** at piliin ang Triggerfish Gateway bilang iyong provider
3. **Ilagay ang iyong license key** o gamitin ang magic link flow para ma-activate nang awtomatiko

Naka-subscribe na sa ibang machine? Patakbuhin ang `triggerfish dive --force`, piliin ang
Triggerfish Gateway, at piliin ang "Mayroon na akong account" para mag-sign in gamit ang iyong
email.

Ang iyong license key ay nakalagak sa iyong OS keychain. Maaari mong i-manage ang iyong subscription
anumang oras sa pamamagitan ng customer portal.

## FAQ {.faq-section}

### Maaari ba akong mag-switch sa pagitan ng Open Source at Cloud?

Oo. Ang iyong agent config ay isang YAML file. Patakbuhin ang `triggerfish dive --force` para
mag-reconfigure anumang oras. Mag-switch mula sa iyong sariling API keys papuntang Triggerfish Gateway o
pabalik — ang iyong SPINE, skills, channels, at data ay mananatiling pareho.

### Anong LLM ang ginagamit ng Triggerfish Gateway?

Ang Triggerfish Gateway ay nagro-route sa pamamagitan ng optimized na model infrastructure. Ang model
selection ay managed para sa iyo — pinipili namin ang pinakamabuting cost/quality tradeoff at hinahawakan
ang caching, failover, at optimization nang awtomatiko.

### Maaari ko bang gamitin ang sarili kong API keys kasama ng Cloud?

Oo. Sinusuportahan ng Triggerfish ang failover chains. Maaari mong i-configure ang Cloud bilang iyong
primary provider at mag-fall back sa iyong sariling Anthropic o OpenAI key, o vice
versa.

### Ano ang mangyayari kung mawala ang aking subscription?

Patuloy na tumatakbo ang iyong agent. Nagfa-fall back ito sa local-only mode — kung mayroon kang sarili
mong API keys na naka-configure, gumagana pa rin ang mga iyon. Humihinto ang mga Cloud features (managed LLM, search,
tunnels) hanggang mag-resubscribe ka. Walang data na mawawala.

### Ipinapadala ba ang aking data sa inyong mga servers?

Ang mga LLM request ay naka-proxy sa pamamagitan ng cloud gateway papunta sa model provider.
Hindi kami nag-iimbak ng conversation content. Ang usage metadata ay nilo-log para sa billing.
Ang iyong agent, data, SPINE, at skills ay nananatiling ganap na nasa iyong machine.

### Paano ko i-manage ang aking subscription?

Bisitahin ang customer portal para i-update ang payment methods, mag-switch ng plans, o mag-cancel.
