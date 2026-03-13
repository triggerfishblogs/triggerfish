---
title: Priser
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

# Priser

Triggerfish er åpen kildekode og vil alltid være det. Ta med dine egne API-nøkler og kjør
alt lokalt gratis. Triggerfish Gateway legger til en administrert LLM-backend, nettsøk,
tunneler og oppdateringer — slik at du ikke trenger å administrere noe av det selv.

::: info Tidlig tilgang
Triggerfish Gateway er for øyeblikket i tidlig tilgang. Priser og funksjoner kan endres
etter hvert som vi forbedrer produktet. Abonnenter med tidlig tilgang låser inn prisen sin.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Åpen kildekode</h3>
  <div class="price">Gratis</div>
  <div class="subtitle">For alltid. Apache 2.0.</div>
  <ul>
    <li>Full agentplattform</li>
    <li>Alle kanaler (Telegram, Slack, Discord, WhatsApp, osv.)</li>
    <li>Alle integrasjoner (GitHub, Google, Obsidian, osv.)</li>
    <li>Klassifisering &amp; policyhåndhevelse</li>
    <li>Ferdigheter, plugins, cron, webhooks</li>
    <li>Nettleserautomatisering</li>
    <li>Ta med dine egne LLM-nøkler (Anthropic, OpenAI, Google, Ollama, osv.)</li>
    <li>Ta med dine egne søkenøkler (Brave, SearXNG)</li>
    <li>Automatiske oppdateringer</li>
  </ul>
  <a href="/nb-NO/guide/installation" class="cta secondary">Installer nå</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/måned</span></div>
  <div class="subtitle">Alt du trenger. Ingen API-nøkler påkrevd.</div>
  <ul>
    <li>Alt i Åpen kildekode</li>
    <li>AI-inferens inkludert — administrert LLM-backend, ingen API-nøkler nødvendig</li>
    <li>Nettsøk inkludert</li>
    <li>Skytunnel for webhooks</li>
    <li>Planlagte jobber</li>
    <li>Oppsett på under 2 minutter</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=en" class="cta primary">Abonner</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/måned</span></div>
  <div class="subtitle">5x mer bruk enn Pro. For tunge arbeidsbelastninger.</div>
  <ul>
    <li>Alt i Pro</li>
    <li>AI-inferens inkludert — høyere bruksgrenser</li>
    <li>Agentteam — samarbeid mellom flere agenter</li>
    <li>Flere samtidige sesjoner</li>
    <li>Flere skytunneler</li>
    <li>Ubegrensede planlagte jobber</li>
    <li>Lengre AI-svar</li>
    <li>Prioritert støtte</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=en" class="cta primary">Abonner</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Tilpasset</div>
  <div class="subtitle">Teamdistribusjoner med SSO og samsvar.</div>
  <ul>
    <li>Alt i Power</li>
    <li>Lisensiering for flere brukere</li>
    <li>SSO / SAML-integrasjon</li>
    <li>Tilpassede bruksgrenser</li>
    <li>Tilpasset modellruting</li>
    <li>Dedikert støtte</li>
    <li>SLA-garantier</li>
    <li>Alternativer for on-premise-distribusjon</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Kontakt salg</a>
</div>

</div>

## Funksjonssammenligning

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>Åpen kildekode</th>
  <th>Pro</th>
  <th>Power</th>
  <th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">Plattform</td></tr>
<tr><td>Alle kanaler</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Alle integrasjoner</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Klassifisering &amp; policymotor</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Ferdigheter, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Nettleserautomatisering</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Exec-miljø</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Agentteam</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI &amp; søk</td></tr>
<tr><td>LLM-leverandør</td><td>Ta med din egen</td><td>Administrert</td><td>Administrert</td><td>Administrert</td></tr>
<tr><td>Nettsøk</td><td>Ta med din egen</td><td>Inkludert</td><td>Inkludert</td><td>Inkludert</td></tr>
<tr><td>AI-bruk</td><td>Dine API-grenser</td><td>Standard</td><td>Utvidet</td><td>Tilpasset</td></tr>

<tr class="section-header"><td colspan="5">Infrastruktur</td></tr>
<tr><td>Skytunneler</td><td>&mdash;</td><td>&#10003;</td><td>Flere</td><td>Tilpasset</td></tr>
<tr><td>Planlagte jobber</td><td>Ubegrenset</td><td>&#10003;</td><td>Ubegrenset</td><td>Ubegrenset</td></tr>
<tr><td>Automatiske oppdateringer</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">Støtte &amp; administrasjon</td></tr>
<tr><td>Fellesskapsstøtte</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Prioritert støtte</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Lisensiering for flere brukere</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Slik fungerer Triggerfish Gateway

Triggerfish Gateway er ikke et separat produkt — det er en administrert backend for den
samme åpen kildekode-agenten du allerede kjører lokalt.

1. **Abonner** ovenfor — du mottar lisensnøkkelen din på e-post etter betaling
2. **Kjør `triggerfish dive --force`** og velg Triggerfish Gateway som leverandør
3. **Skriv inn lisensnøkkelen din** eller bruk magic link-flyten for å aktivere automatisk

Har du allerede abonnert på en annen maskin? Kjør `triggerfish dive --force`, velg
Triggerfish Gateway, og velg «Jeg har allerede en konto» for å logge inn med e-posten din.

Lisensnøkkelen din lagres i OS-nøkkelringen din. Du kan administrere abonnementet ditt
når som helst gjennom kundeportalen.

## Vanlige spørsmål {.faq-section}

### Kan jeg bytte mellom Åpen kildekode og Sky?

Ja. Agentkonfigurasjonen din er én enkelt YAML-fil. Kjør `triggerfish dive --force` for å
rekonfigurere når som helst. Bytt fra dine egne API-nøkler til Triggerfish Gateway eller
tilbake — SPINE, ferdigheter, kanaler og data forblir nøyaktig det samme.

### Hvilken LLM bruker Triggerfish Gateway?

Triggerfish Gateway ruter gjennom optimalisert modellinfrastruktur. Modellvalget
administreres for deg — vi velger den beste avveiningen mellom kostnad og kvalitet og håndterer
caching, failover og optimalisering automatisk.

### Kan jeg bruke mine egne API-nøkler sammen med Sky?

Ja. Triggerfish støtter failover-kjeder. Du kan konfigurere Sky som primærleverandør og
falle tilbake til din egen Anthropic- eller OpenAI-nøkkel, eller omvendt.

### Hva skjer hvis abonnementet mitt utløper?

Agenten din fortsetter å kjøre. Den faller tilbake til kun lokal modus — hvis du har
dine egne API-nøkler konfigurert, fungerer disse fortsatt. Sky-funksjoner (administrert LLM, søk,
tunneler) stopper til du abonnerer på nytt. Ingen data går tapt.

### Sendes dataene mine gjennom serverne deres?

LLM-forespørsler proxies gjennom sky-gatewayen til modelleverandøren.
Vi lagrer ikke samtaleinnhold. Bruksmetadata logges for fakturering.
Agenten din, data, SPINE og ferdigheter forblir helt på maskinen din.

### Hvordan administrerer jeg abonnementet mitt?

Besøk kundeportalen for å oppdatere betalingsmetoder, bytte planer eller si opp.
