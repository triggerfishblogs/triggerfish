---
title: Prijzen
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

# Prijzen

Triggerfish is open source en zal dat altijd blijven. Breng uw eigen API-sleutels mee en
voer alles lokaal gratis uit. Triggerfish Gateway voegt een beheerde LLM-backend, webzoeken,
tunnels en updates toe — zodat u dat allemaal zelf niet hoeft te beheren.

::: info Vroege toegang
Triggerfish Gateway bevindt zich momenteel in vroege toegang. Prijzen en functies kunnen
veranderen naarmate we het product verfijnen. Vroege-toegangabonnees vergrendelen hun tarief.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">Gratis</div>
  <div class="subtitle">Voor altijd. Apache 2.0.</div>
  <ul>
    <li>Volledig agentplatform</li>
    <li>Alle kanalen (Telegram, Slack, Discord, WhatsApp, enz.)</li>
    <li>Alle integraties (GitHub, Google, Obsidian, enz.)</li>
    <li>Classificatie en beleidshandhaving</li>
    <li>Skills, plugins, cron, webhooks</li>
    <li>Browserautomatisering</li>
    <li>Breng uw eigen LLM-sleutels mee (Anthropic, OpenAI, Google, Ollama, enz.)</li>
    <li>Breng uw eigen zoeksleutels mee (Brave, SearXNG)</li>
    <li>Automatische updates</li>
  </ul>
  <a href="/nl-NL/guide/installation" class="cta secondary">Nu installeren</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/maand</span></div>
  <div class="subtitle">Alles wat u nodig heeft. Geen API-sleutels vereist.</div>
  <ul>
    <li>Alles in Open Source</li>
    <li>AI-inferentie inbegrepen — beheerde LLM-backend, geen API-sleutels nodig</li>
    <li>Webzoeken inbegrepen</li>
    <li>Cloudtunnel voor webhooks</li>
    <li>Geplande taken</li>
    <li>Instellen in minder dan 2 minuten</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=nl" class="cta primary">Abonneren</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/maand</span></div>
  <div class="subtitle">5x meer gebruik dan Pro. Voor zware werklasten.</div>
  <ul>
    <li>Alles in Pro</li>
    <li>AI-inferentie inbegrepen — hogere gebruikslimieten</li>
    <li>Agent Teams — samenwerking tussen meerdere agents</li>
    <li>Meer gelijktijdige sessies</li>
    <li>Meerdere cloudtunnels</li>
    <li>Onbeperkte geplande taken</li>
    <li>Langere AI-reacties</li>
    <li>Prioritaire ondersteuning</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=nl" class="cta primary">Abonneren</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Op maat</div>
  <div class="subtitle">Teamimplementaties met SSO en compliance.</div>
  <ul>
    <li>Alles in Power</li>
    <li>Multi-seat licenties</li>
    <li>SSO / SAML-integratie</li>
    <li>Aangepaste gebruikslimieten</li>
    <li>Aangepaste modelrouting</li>
    <li>Toegewijde ondersteuning</li>
    <li>SLA-garanties</li>
    <li>On-premise implementatieopties</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Contact verkoop</a>
</div>

</div>

## Functievergelijking

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
<tr><td>Alle kanalen</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Alle integraties</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Classificatie en beleidsmotor</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Browserautomatisering</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Uitvoeringsomgeving</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Agent Teams</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI en zoeken</td></tr>
<tr><td>LLM-provider</td><td>Eigen sleutels</td><td>Beheerd</td><td>Beheerd</td><td>Beheerd</td></tr>
<tr><td>Webzoeken</td><td>Eigen sleutels</td><td>Inbegrepen</td><td>Inbegrepen</td><td>Inbegrepen</td></tr>
<tr><td>AI-gebruik</td><td>Uw API-limieten</td><td>Standaard</td><td>Uitgebreid</td><td>Op maat</td></tr>

<tr class="section-header"><td colspan="5">Infrastructuur</td></tr>
<tr><td>Cloudtunnels</td><td>&mdash;</td><td>&#10003;</td><td>Meerdere</td><td>Op maat</td></tr>
<tr><td>Geplande taken</td><td>Onbeperkt</td><td>&#10003;</td><td>Onbeperkt</td><td>Onbeperkt</td></tr>
<tr><td>Automatische updates</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">Ondersteuning en beheer</td></tr>
<tr><td>Community-ondersteuning</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Prioritaire ondersteuning</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Multi-seat licenties</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Hoe Triggerfish Gateway werkt

Triggerfish Gateway is geen apart product — het is een beheerde backend voor
dezelfde open-source agent die u al lokaal gebruikt.

1. **Abonneer** hierboven — u ontvangt uw licentiesleutel per e-mail na de afrekening
2. **Voer `triggerfish dive --force` uit** en selecteer Triggerfish Gateway als uw provider
3. **Voer uw licentiesleutel in** of gebruik de magic link-stroom om automatisch te activeren

Al geabonneerd op een andere machine? Voer `triggerfish dive --force` uit, selecteer
Triggerfish Gateway en kies "I already have an account" om in te loggen met uw e-mailadres.

Uw licentiesleutel wordt opgeslagen in uw OS-sleutelhanger. U kunt uw abonnement
op elk moment beheren via het klantenportaal.

## Veelgestelde vragen {.faq-section}

### Kan ik schakelen tussen Open Source en Cloud?

Ja. Uw agentconfiguratie is een enkel YAML-bestand. Voer `triggerfish dive --force` uit om
op elk moment opnieuw te configureren. Schakel van uw eigen API-sleutels naar Triggerfish Gateway of
terug — uw SPINE, skills, kanalen en gegevens blijven exact hetzelfde.

### Welk LLM gebruikt Triggerfish Gateway?

Triggerfish Gateway routeert via geoptimaliseerde modelinfrastructuur. De model-
selectie wordt voor u beheerd — wij kiezen de beste kosten/kwaliteitsverhouding en verwerken
caching, failover en optimalisatie automatisch.

### Kan ik mijn eigen API-sleutels naast Cloud gebruiken?

Ja. Triggerfish ondersteunt failover-ketens. U kunt Cloud configureren als uw
primaire provider en terugvallen op uw eigen Anthropic- of OpenAI-sleutel, of andersom.

### Wat gebeurt er als mijn abonnement verloopt?

Uw agent blijft actief. Het valt terug op alleen-lokale modus — als u uw
eigen API-sleutels heeft geconfigureerd, werken die nog steeds. Cloudfuncties (beheerde LLM, zoeken,
tunnels) stoppen totdat u opnieuw abonneert. Er gaan geen gegevens verloren.

### Worden mijn gegevens via uw servers verstuurd?

LLM-verzoeken worden via de cloudgateway geproxyd naar de modelprovider.
We slaan geen gespreksinhoud op. Gebruiksmetagegevens worden gelogd voor facturering.
Uw agent, gegevens, SPINE en skills blijven volledig op uw machine.

### Hoe beheer ik mijn abonnement?

Bezoek het klantenportaal om betaalmethoden bij te werken, van abonnement te wisselen of op te zeggen.
