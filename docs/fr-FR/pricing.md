---
title: Tarifs
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

# Tarifs

Triggerfish est open source et le restera toujours. Apportez vos propres clés
API et exécutez tout localement gratuitement. Triggerfish Gateway ajoute un
backend LLM géré, la recherche web, les tunnels et les mises à jour — pour que
vous n'ayez rien à gérer.

::: info Accès anticipé
Triggerfish Gateway est actuellement en accès anticipé. Les tarifs et
fonctionnalités peuvent évoluer au fil du développement du produit. Les
abonné·e·s en accès anticipé bénéficient du tarif garanti.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">Gratuit</div>
  <div class="subtitle">Pour toujours. Apache 2.0.</div>
  <ul>
    <li>Plateforme d'agent complète</li>
    <li>Tous les canaux (Telegram, Slack, Discord, WhatsApp, etc.)</li>
    <li>Toutes les intégrations (GitHub, Google, Obsidian, etc.)</li>
    <li>Classification et application des politiques</li>
    <li>Skills, plugins, cron, webhooks</li>
    <li>Automatisation du navigateur</li>
    <li>Apportez vos propres clés LLM (Anthropic, OpenAI, Google, Ollama, etc.)</li>
    <li>Apportez vos propres clés de recherche (Brave, SearXNG)</li>
    <li>Mises à jour automatiques</li>
  </ul>
  <a href="/fr-FR/guide/installation" class="cta secondary">Installer maintenant</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">49 $<span>/mois</span></div>
  <div class="subtitle">Tout ce dont vous avez besoin. Aucune clé API requise.</div>
  <ul>
    <li>Tout ce qui est dans Open Source</li>
    <li>Inférence IA incluse — backend LLM géré, aucune clé API nécessaire</li>
    <li>Recherche web incluse</li>
    <li>Tunnel cloud pour les webhooks</li>
    <li>Tâches planifiées</li>
    <li>Configuration en moins de 2 minutes</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=fr" class="cta primary">S'abonner</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">199 $<span>/mois</span></div>
  <div class="subtitle">5x plus d'utilisation que Pro. Pour les charges lourdes.</div>
  <ul>
    <li>Tout ce qui est dans Pro</li>
    <li>Inférence IA incluse — limites d'utilisation plus élevées</li>
    <li>Équipes d'agents — collaboration multi-agents</li>
    <li>Plus de sessions simultanées</li>
    <li>Tunnels cloud multiples</li>
    <li>Tâches planifiées illimitées</li>
    <li>Réponses IA plus longues</li>
    <li>Support prioritaire</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=fr" class="cta primary">S'abonner</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Sur mesure</div>
  <div class="subtitle">Déploiements en équipe avec SSO et conformité.</div>
  <ul>
    <li>Tout ce qui est dans Power</li>
    <li>Licences multi-postes</li>
    <li>Intégration SSO / SAML</li>
    <li>Limites d'utilisation personnalisées</li>
    <li>Routage de modèles personnalisé</li>
    <li>Support dédié</li>
    <li>Garanties SLA</li>
    <li>Options de déploiement sur site</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Contacter les ventes</a>
</div>

</div>

## Comparaison des fonctionnalités

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
<tr class="section-header"><td colspan="5">Plateforme</td></tr>
<tr><td>Tous les canaux</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Toutes les intégrations</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Classification et moteur de politiques</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Automatisation du navigateur</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Environnement d'exécution</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Équipes d'agents</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">IA et recherche</td></tr>
<tr><td>Fournisseur LLM</td><td>Le vôtre</td><td>Géré</td><td>Géré</td><td>Géré</td></tr>
<tr><td>Recherche web</td><td>La vôtre</td><td>Incluse</td><td>Incluse</td><td>Incluse</td></tr>
<tr><td>Utilisation IA</td><td>Vos limites API</td><td>Standard</td><td>Étendue</td><td>Sur mesure</td></tr>

<tr class="section-header"><td colspan="5">Infrastructure</td></tr>
<tr><td>Tunnels cloud</td><td>&mdash;</td><td>&#10003;</td><td>Multiples</td><td>Sur mesure</td></tr>
<tr><td>Tâches planifiées</td><td>Illimitées</td><td>&#10003;</td><td>Illimitées</td><td>Illimitées</td></tr>
<tr><td>Mises à jour automatiques</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">Support et administration</td></tr>
<tr><td>Support communautaire</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Support prioritaire</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Licences multi-postes</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Comment fonctionne Triggerfish Gateway

Triggerfish Gateway n'est pas un produit séparé — c'est un backend géré pour le
même agent open source que vous exécutez déjà localement.

1. **Abonnez-vous** ci-dessus — vous recevrez votre clé de licence par e-mail après le paiement
2. **Exécutez `triggerfish dive --force`** et sélectionnez Triggerfish Gateway comme fournisseur
3. **Entrez votre clé de licence** ou utilisez le flux de lien magique pour l'activation automatique

Déjà abonné·e sur une autre machine ? Exécutez `triggerfish dive --force`,
sélectionnez Triggerfish Gateway et choisissez « J'ai déjà un compte » pour
vous connecter avec votre adresse e-mail.

Votre clé de licence est stockée dans le trousseau de clés de votre OS. Vous
pouvez gérer votre abonnement à tout moment via le portail client.

## FAQ {.faq-section}

### Puis-je basculer entre Open Source et Cloud ?

Oui. La configuration de votre agent est un seul fichier YAML. Exécutez
`triggerfish dive --force` pour reconfigurer à tout moment. Passez de vos
propres clés API à Triggerfish Gateway ou inversement — votre SPINE, vos
skills, vos canaux et vos données restent exactement les mêmes.

### Quel LLM utilise Triggerfish Gateway ?

Triggerfish Gateway route via une infrastructure de modèles optimisée. La
sélection du modèle est gérée pour vous — nous choisissons le meilleur
compromis coût/qualité et gérons automatiquement la mise en cache, le
basculement et l'optimisation.

### Puis-je utiliser mes propres clés API en parallèle du Cloud ?

Oui. Triggerfish prend en charge les chaînes de basculement. Vous pouvez
configurer le Cloud comme fournisseur principal et basculer vers votre propre
clé Anthropic ou OpenAI, ou inversement.

### Que se passe-t-il si mon abonnement expire ?

Votre agent continue de fonctionner. Il revient au mode local uniquement — si
vous avez vos propres clés API configurées, elles fonctionnent toujours. Les
fonctionnalités Cloud (LLM géré, recherche, tunnels) s'arrêtent jusqu'au
réabonnement. Aucune donnée n'est perdue.

### Mes données passent-elles par vos serveurs ?

Les requêtes LLM sont transmises via le gateway cloud au fournisseur de
modèles. Nous ne stockons pas le contenu des conversations. Les métadonnées
d'utilisation sont journalisées pour la facturation. Votre agent, vos données,
votre SPINE et vos skills restent entièrement sur votre machine.

### Comment gérer mon abonnement ?

Visitez le portail client pour mettre à jour vos moyens de paiement, changer
de forfait ou annuler.
