---
title: Preise
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

# Preise

Triggerfish ist Open Source und wird es immer bleiben. Bringen Sie Ihre eigenen API-Schluessel mit und fuehren Sie alles lokal kostenlos aus. Triggerfish Gateway bietet ein verwaltetes LLM-Backend, Websuche, Tunnel und Updates — damit Sie sich um nichts davon kuemmern muessen.

::: info Frueher Zugang
Triggerfish Gateway befindet sich derzeit im fruehen Zugang. Preise und Funktionen koennen sich aendern, waehrend wir das Produkt verfeinern. Abonnenten im fruehen Zugang sichern sich ihren Tarif.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">Kostenlos</div>
  <div class="subtitle">Fuer immer. Apache 2.0.</div>
  <ul>
    <li>Vollstaendige Agenten-Plattform</li>
    <li>Alle Kanaele (Telegram, Slack, Discord, WhatsApp usw.)</li>
    <li>Alle Integrationen (GitHub, Google, Obsidian usw.)</li>
    <li>Klassifizierung &amp; Policy-Durchsetzung</li>
    <li>Skills, Plugins, Cron, Webhooks</li>
    <li>Browser-Automatisierung</li>
    <li>Eigene LLM-Schluessel mitbringen (Anthropic, OpenAI, Google, Ollama usw.)</li>
    <li>Eigene Such-Schluessel mitbringen (Brave, SearXNG)</li>
    <li>Automatische Updates</li>
  </ul>
  <a href="/de-DE/guide/installation" class="cta secondary">Jetzt installieren</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/Monat</span></div>
  <div class="subtitle">Alles, was Sie brauchen. Keine API-Schluessel erforderlich.</div>
  <ul>
    <li>Alles aus Open Source</li>
    <li>KI-Inferenz inklusive — verwaltetes LLM-Backend, keine API-Schluessel noetig</li>
    <li>Websuche inklusive</li>
    <li>Cloud-Tunnel fuer Webhooks</li>
    <li>Geplante Aufgaben</li>
    <li>Einrichtung in unter 2 Minuten</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=de" class="cta primary">Abonnieren</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/Monat</span></div>
  <div class="subtitle">5x mehr Nutzung als Pro. Fuer intensive Workloads.</div>
  <ul>
    <li>Alles aus Pro</li>
    <li>KI-Inferenz inklusive — hoehere Nutzungslimits</li>
    <li>Agent-Teams — Multi-Agent-Zusammenarbeit</li>
    <li>Mehr gleichzeitige Sessions</li>
    <li>Mehrere Cloud-Tunnel</li>
    <li>Unbegrenzte geplante Aufgaben</li>
    <li>Laengere KI-Antworten</li>
    <li>Prioritaets-Support</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=de" class="cta primary">Abonnieren</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Individuell</div>
  <div class="subtitle">Team-Deployments mit SSO und Compliance.</div>
  <ul>
    <li>Alles aus Power</li>
    <li>Multi-Seat-Lizenzierung</li>
    <li>SSO / SAML-Integration</li>
    <li>Individuelle Nutzungslimits</li>
    <li>Individuelles Model-Routing</li>
    <li>Dedizierter Support</li>
    <li>SLA-Garantien</li>
    <li>On-Premise-Bereitstellungsoptionen</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Vertrieb kontaktieren</a>
</div>

</div>

## Funktionsvergleich

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
<tr class="section-header"><td colspan="5">Plattform</td></tr>
<tr><td>Alle Kanaele</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Alle Integrationen</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Klassifizierung &amp; Policy-Engine</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills, Plugins, Webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Browser-Automatisierung</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Exec-Umgebung</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Agent-Teams</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">KI &amp; Suche</td></tr>
<tr><td>LLM-Anbieter</td><td>Eigene mitbringen</td><td>Verwaltet</td><td>Verwaltet</td><td>Verwaltet</td></tr>
<tr><td>Websuche</td><td>Eigene mitbringen</td><td>Inklusive</td><td>Inklusive</td><td>Inklusive</td></tr>
<tr><td>KI-Nutzung</td><td>Ihre API-Limits</td><td>Standard</td><td>Erweitert</td><td>Individuell</td></tr>

<tr class="section-header"><td colspan="5">Infrastruktur</td></tr>
<tr><td>Cloud-Tunnel</td><td>&mdash;</td><td>&#10003;</td><td>Mehrere</td><td>Individuell</td></tr>
<tr><td>Geplante Aufgaben</td><td>Unbegrenzt</td><td>&#10003;</td><td>Unbegrenzt</td><td>Unbegrenzt</td></tr>
<tr><td>Automatische Updates</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">Support &amp; Verwaltung</td></tr>
<tr><td>Community-Support</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Prioritaets-Support</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Multi-Seat-Lizenzierung</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## So funktioniert Triggerfish Gateway

Triggerfish Gateway ist kein separates Produkt — es ist ein verwaltetes Backend fuer denselben Open-Source-Agenten, den Sie bereits lokal ausfuehren.

1. **Abonnieren** Sie oben — Sie erhalten Ihren Lizenzschluessel nach dem Checkout per E-Mail
2. **Fuehren Sie `triggerfish dive --force` aus** und waehlen Sie Triggerfish Gateway als Ihren Anbieter
3. **Geben Sie Ihren Lizenzschluessel ein** oder verwenden Sie den Magic-Link-Flow zur automatischen Aktivierung

Bereits auf einem anderen Rechner abonniert? Fuehren Sie `triggerfish dive --force` aus, waehlen Sie Triggerfish Gateway und waehlen Sie "Ich habe bereits ein Konto", um sich mit Ihrer E-Mail-Adresse anzumelden.

Ihr Lizenzschluessel wird in Ihrem Betriebssystem-Schluesselbund gespeichert. Sie koennen Ihr Abonnement jederzeit ueber das Kundenportal verwalten.

## FAQ {.faq-section}

### Kann ich zwischen Open Source und Cloud wechseln?

Ja. Ihre Agent-Konfiguration ist eine einzelne YAML-Datei. Fuehren Sie `triggerfish dive --force` aus, um jederzeit neu zu konfigurieren. Wechseln Sie von Ihren eigenen API-Schluesseln zu Triggerfish Gateway oder zurueck — Ihr SPINE, Ihre Skills, Kanaele und Daten bleiben genau gleich.

### Welches LLM verwendet Triggerfish Gateway?

Triggerfish Gateway leitet ueber optimierte Modell-Infrastruktur weiter. Die Modellauswahl wird fuer Sie verwaltet — wir waehlen den besten Kosten-/Qualitaetskompromiss und uebernehmen Caching, Failover und Optimierung automatisch.

### Kann ich meine eigenen API-Schluessel neben Cloud verwenden?

Ja. Triggerfish unterstuetzt Failover-Ketten. Sie koennen Cloud als Ihren primaeren Anbieter konfigurieren und auf Ihren eigenen Anthropic- oder OpenAI-Schluessel zurueckfallen oder umgekehrt.

### Was passiert, wenn mein Abonnement ablaeuft?

Ihr Agent laeuft weiter. Er faellt auf den Nur-Lokal-Modus zurueck — wenn Sie Ihre eigenen API-Schluessel konfiguriert haben, funktionieren diese weiterhin. Cloud-Funktionen (verwaltetes LLM, Suche, Tunnel) werden bis zur erneuten Anmeldung eingestellt. Keine Daten gehen verloren.

### Werden meine Daten ueber Ihre Server gesendet?

LLM-Anfragen werden ueber das Cloud-Gateway zum Modellanbieter weitergeleitet. Wir speichern keine Gespraechsinhalte. Nutzungsmetadaten werden fuer die Abrechnung protokolliert. Ihr Agent, Ihre Daten, SPINE und Skills verbleiben vollstaendig auf Ihrem Rechner.

### Wie verwalte ich mein Abonnement?

Besuchen Sie das Kundenportal, um Zahlungsmethoden zu aktualisieren, den Tarif zu wechseln oder zu kuendigen.
