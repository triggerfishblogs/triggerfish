---
title: Prezzi
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

# Prezzi

Triggerfish è open source e lo sarà sempre. Porti le Sue chiavi API e gestisca
tutto localmente gratuitamente. Triggerfish Gateway aggiunge un backend LLM
gestito, ricerca web, tunnel e aggiornamenti — così non deve gestire nulla di
tutto ciò.

::: info Accesso anticipato
Triggerfish Gateway è attualmente in accesso anticipato. Prezzi e funzionalità
potrebbero cambiare man mano che perfezioniamo il prodotto. Gli abbonati in
accesso anticipato mantengono la loro tariffa bloccata.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">Gratuito</div>
  <div class="subtitle">Per sempre. Apache 2.0.</div>
  <ul>
    <li>Piattaforma agente completa</li>
    <li>Tutti i canali (Telegram, Slack, Discord, WhatsApp, ecc.)</li>
    <li>Tutte le integrazioni (GitHub, Google, Obsidian, ecc.)</li>
    <li>Classificazione e applicazione delle policy</li>
    <li>Skill, plugin, cron, webhook</li>
    <li>Automazione browser</li>
    <li>Porti le Sue chiavi LLM (Anthropic, OpenAI, Google, Ollama, ecc.)</li>
    <li>Porti le Sue chiavi di ricerca (Brave, SearXNG)</li>
    <li>Aggiornamenti automatici</li>
  </ul>
  <a href="/it-IT/guide/installation" class="cta secondary">Installa ora</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/mese</span></div>
  <div class="subtitle">Tutto ciò che serve. Nessuna chiave API necessaria.</div>
  <ul>
    <li>Tutto ciò che è nell'Open Source</li>
    <li>Inferenza IA inclusa — backend LLM gestito, nessuna chiave API necessaria</li>
    <li>Ricerca web inclusa</li>
    <li>Tunnel cloud per webhook</li>
    <li>Job pianificati</li>
    <li>Configurazione in meno di 2 minuti</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=it" class="cta primary">Abbonati</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/mese</span></div>
  <div class="subtitle">5 volte più utilizzo rispetto a Pro. Per carichi pesanti.</div>
  <ul>
    <li>Tutto ciò che è in Pro</li>
    <li>Inferenza IA inclusa — limiti di utilizzo maggiori</li>
    <li>Team di agenti — collaborazione multi-agente</li>
    <li>Più sessioni simultanee</li>
    <li>Tunnel cloud multipli</li>
    <li>Job pianificati illimitati</li>
    <li>Risposte IA più lunghe</li>
    <li>Supporto prioritario</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=it" class="cta primary">Abbonati</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Personalizzato</div>
  <div class="subtitle">Distribuzioni per team con SSO e conformità.</div>
  <ul>
    <li>Tutto ciò che è in Power</li>
    <li>Licenze multi-utente</li>
    <li>Integrazione SSO / SAML</li>
    <li>Limiti di utilizzo personalizzati</li>
    <li>Routing modelli personalizzato</li>
    <li>Supporto dedicato</li>
    <li>Garanzie SLA</li>
    <li>Opzioni di distribuzione on-premise</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Contatti il reparto vendite</a>
</div>

</div>

## Confronto funzionalità

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
<tr class="section-header"><td colspan="5">Piattaforma</td></tr>
<tr><td>Tutti i canali</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Tutte le integrazioni</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Classificazione e motore policy</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skill, plugin, webhook</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Automazione browser</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Ambiente di esecuzione</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Team di agenti</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">IA e ricerca</td></tr>
<tr><td>Provider LLM</td><td>Proprio</td><td>Gestito</td><td>Gestito</td><td>Gestito</td></tr>
<tr><td>Ricerca web</td><td>Propria</td><td>Inclusa</td><td>Inclusa</td><td>Inclusa</td></tr>
<tr><td>Utilizzo IA</td><td>Limiti propri</td><td>Standard</td><td>Esteso</td><td>Personalizzato</td></tr>

<tr class="section-header"><td colspan="5">Infrastruttura</td></tr>
<tr><td>Tunnel cloud</td><td>&mdash;</td><td>&#10003;</td><td>Multipli</td><td>Personalizzato</td></tr>
<tr><td>Job pianificati</td><td>Illimitati</td><td>&#10003;</td><td>Illimitati</td><td>Illimitati</td></tr>
<tr><td>Aggiornamenti automatici</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">Supporto e amministrazione</td></tr>
<tr><td>Supporto community</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Supporto prioritario</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Licenze multi-utente</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Come funziona Triggerfish Gateway

Triggerfish Gateway non è un prodotto separato — è un backend gestito per lo
stesso agente open source che già esegue localmente.

1. **Si abboni** sopra — riceverà la Sua chiave di licenza via email dopo il checkout
2. **Esegua `triggerfish dive --force`** e selezioni Triggerfish Gateway come provider
3. **Inserisca la Sua chiave di licenza** o utilizzi il flusso magic link per l'attivazione automatica

Già abbonato su un'altra macchina? Esegua `triggerfish dive --force`, selezioni
Triggerfish Gateway e scelga "Ho già un account" per accedere con la Sua email.

La Sua chiave di licenza viene memorizzata nel portachiavi del sistema operativo.
Può gestire il Suo abbonamento in qualsiasi momento attraverso il portale
clienti.

## FAQ {.faq-section}

### Posso passare da Open Source a Cloud?

Sì. La configurazione del Suo agente è un singolo file YAML. Esegua
`triggerfish dive --force` per riconfigurare in qualsiasi momento. Passi dalle
Sue chiavi API a Triggerfish Gateway o viceversa — il Suo SPINE, le Skill, i
canali e i dati rimangono esattamente gli stessi.

### Quale LLM utilizza Triggerfish Gateway?

Triggerfish Gateway instrada attraverso un'infrastruttura modelli ottimizzata. La
selezione del modello è gestita per Lei — scegliamo il miglior compromesso
costo/qualità e gestiamo caching, failover e ottimizzazione automaticamente.

### Posso usare le mie chiavi API insieme a Cloud?

Sì. Triggerfish supporta catene di failover. Può configurare Cloud come provider
primario e ricadere sulla Sua chiave Anthropic o OpenAI, o viceversa.

### Cosa succede se il mio abbonamento scade?

Il Suo agente continua a funzionare. Ricade in modalità solo locale — se ha le
Sue chiavi API configurate, quelle funzionano ancora. Le funzionalità Cloud (LLM
gestito, ricerca, tunnel) si fermano fino a quando non si riabbona. Nessun dato
viene perso.

### I miei dati passano attraverso i vostri server?

Le richieste LLM vengono inoltrate attraverso il gateway cloud al provider del
modello. Non memorizziamo il contenuto delle conversazioni. I metadati di
utilizzo vengono registrati per la fatturazione. Il Suo agente, i dati, il SPINE
e le Skill rimangono interamente sulla Sua macchina.

### Come gestisco il mio abbonamento?

Visiti il portale clienti per aggiornare i metodi di pagamento, cambiare piano o
annullare.
