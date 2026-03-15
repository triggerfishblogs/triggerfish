---
title: Prissättning
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

# Prissättning

Triggerfish är öppen källkod och kommer alltid att vara det. Ta med dina egna API-nycklar och kör allt lokalt gratis. Triggerfish Gateway lägger till en hanterad LLM-bakänd, webbsökning, tunnlar och uppdateringar — så att du inte behöver hantera något av det.

::: info Tidig åtkomst
Triggerfish Gateway är för närvarande i tidig åtkomst. Prissättning och funktioner kan förändras när vi förfinar produkten. Tidiga åtkomstprenumeranter låser in sin priskurs.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Öppen källkod</h3>
  <div class="price">Gratis</div>
  <div class="subtitle">För alltid. Apache 2.0.</div>
  <ul>
    <li>Full agentplattform</li>
    <li>Alla kanaler (Telegram, Slack, Discord, WhatsApp, m.fl.)</li>
    <li>Alla integrationer (GitHub, Google, Obsidian, m.fl.)</li>
    <li>Klassificering &amp; policytillämpning</li>
    <li>Kunskaper, plugins, cron, webhooks</li>
    <li>Webbläsarautomatisering</li>
    <li>Ta med dina egna LLM-nycklar (Anthropic, OpenAI, Google, Ollama, m.fl.)</li>
    <li>Ta med dina egna söknycklar (Brave, SearXNG)</li>
    <li>Automatiska uppdateringar</li>
  </ul>
  <a href="/sv-SE/guide/installation" class="cta secondary">Installera nu</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/månad</span></div>
  <div class="subtitle">Allt du behöver. Inga API-nycklar krävs.</div>
  <ul>
    <li>Allt i Öppen källkod</li>
    <li>AI-inferens ingår — hanterad LLM-bakänd, inga API-nycklar behövs</li>
    <li>Webbsökning ingår</li>
    <li>Molntunnel för webhooks</li>
    <li>Schemalagda jobb</li>
    <li>Inställning på under 2 minuter</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=en" class="cta primary">Prenumerera</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/månad</span></div>
  <div class="subtitle">5x mer användning än Pro. För tunga arbetsbelastningar.</div>
  <ul>
    <li>Allt i Pro</li>
    <li>AI-inferens ingår — högre användningsgränser</li>
    <li>Agentteam — multi-agentsamarbete</li>
    <li>Fler samtidiga sessioner</li>
    <li>Flera molntunnlar</li>
    <li>Obegränsade schemalagda jobb</li>
    <li>Längre AI-svar</li>
    <li>Prioriterat stöd</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=en" class="cta primary">Prenumerera</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Anpassat</div>
  <div class="subtitle">Teamdriftsättningar med SSO och efterlevnad.</div>
  <ul>
    <li>Allt i Power</li>
    <li>Flersäteslicensiering</li>
    <li>SSO / SAML-integration</li>
    <li>Anpassade användningsgränser</li>
    <li>Anpassad modellroutning</li>
    <li>Dedikerat stöd</li>
    <li>SLA-garantier</li>
    <li>Alternativ för driftsättning på plats</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Kontakta sälj</a>
</div>

</div>

## Funktionsjämförelse

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>Öppen källkod</th>
  <th>Pro</th>
  <th>Power</th>
  <th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">Plattform</td></tr>
<tr><td>Alla kanaler</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Alla integrationer</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Klassificering &amp; policymotor</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Kunskaper, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Webbläsarautomatisering</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Exec-miljö</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Agentteam</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI &amp; sökning</td></tr>
<tr><td>LLM-leverantör</td><td>Ta med din egen</td><td>Hanterad</td><td>Hanterad</td><td>Hanterad</td></tr>
<tr><td>Webbsökning</td><td>Ta med din egen</td><td>Ingår</td><td>Ingår</td><td>Ingår</td></tr>
<tr><td>AI-användning</td><td>Dina API-gränser</td><td>Standard</td><td>Utökad</td><td>Anpassad</td></tr>

<tr class="section-header"><td colspan="5">Infrastruktur</td></tr>
<tr><td>Molntunnlar</td><td>&mdash;</td><td>&#10003;</td><td>Flera</td><td>Anpassad</td></tr>
<tr><td>Schemalagda jobb</td><td>Obegränsade</td><td>&#10003;</td><td>Obegränsade</td><td>Obegränsade</td></tr>
<tr><td>Automatiska uppdateringar</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">Stöd &amp; administration</td></tr>
<tr><td>Communitystöd</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Prioriterat stöd</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Flersäteslicensiering</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Hur Triggerfish Gateway fungerar

Triggerfish Gateway är inte en separat produkt — det är en hanterad bakänd för samma öppen källkod-agent som du redan kör lokalt.

1. **Prenumerera** ovan — du får din licensnyckel via e-post efter utcheckning
2. **Kör `triggerfish dive --force`** och välj Triggerfish Gateway som din leverantör
3. **Ange din licensnyckel** eller använd magic link-flödet för att aktivera automatiskt

Redan prenumererad på en annan maskin? Kör `triggerfish dive --force`, välj Triggerfish Gateway och välj "I already have an account" för att logga in med din e-post.

Din licensnyckel lagras i ditt OS-nyckelring. Du kan hantera din prenumeration när som helst via kundportalen.

## FAQ {.faq-section}

### Kan jag byta mellan Öppen källkod och Cloud?

Ja. Din agentkonfiguration är en enda YAML-fil. Kör `triggerfish dive --force` för att konfigurera om när som helst. Byt från dina egna API-nycklar till Triggerfish Gateway eller tillbaka — din SPINE, kunskaper, kanaler och data förblir exakt desamma.

### Vilken LLM använder Triggerfish Gateway?

Triggerfish Gateway dirigerar via optimerad modellinfrastruktur. Modellvalet hanteras åt dig — vi väljer den bästa kostnad-/kvalitetsavvägningen och hanterar cachning, failover och optimering automatiskt.

### Kan jag använda mina egna API-nycklar tillsammans med Cloud?

Ja. Triggerfish stöder failover-kedjor. Du kan konfigurera Cloud som din primära leverantör och falla tillbaka till din egna Anthropic- eller OpenAI-nyckel, eller vice versa.

### Vad händer om min prenumeration löper ut?

Din agent fortsätter att köra. Den faller tillbaka till lokalt läge — om du har dina egna API-nycklar konfigurerade fungerar de fortfarande. Molnfunktioner (hanterad LLM, sökning, tunnlar) stannar tills du återprenumererar. Inga data förloras.

### Skickas mina data via era servrar?

LLM-förfrågningar proxieras via molngatewayen till modelleverantören. Vi lagrar inte konversationsinnehåll. Användningsmetadata loggas för fakturering. Din agent, data, SPINE och kunskaper förblir helt på din maskin.

### Hur hanterar jag min prenumeration?

Besök kundportalen för att uppdatera betalningsmetoder, byta plan eller avbryta.
