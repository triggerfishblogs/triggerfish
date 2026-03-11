---
title: Precios
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

# Precios

Triggerfish es código abierto y siempre lo será. Usa tus propias API keys y
ejecuta todo localmente de forma gratuita. Triggerfish Gateway agrega un backend
de LLM administrado, búsqueda web, túneles y actualizaciones — para que no
tengas que administrar nada de eso.

::: info Acceso anticipado
Triggerfish Gateway está actualmente en acceso anticipado. Los precios y
características pueden cambiar mientras perfeccionamos el producto. Los
suscriptores de acceso anticipado mantienen su tarifa fija.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">Gratis</div>
  <div class="subtitle">Para siempre. Apache 2.0.</div>
  <ul>
    <li>Plataforma completa de agentes</li>
    <li>Todos los canales (Telegram, Slack, Discord, WhatsApp, etc.)</li>
    <li>Todas las integraciones (GitHub, Google, Obsidian, etc.)</li>
    <li>Clasificación y aplicación de políticas</li>
    <li>Skills, plugins, cron, webhooks</li>
    <li>Automatización del navegador</li>
    <li>Usa tus propias keys de LLM (Anthropic, OpenAI, Google, Ollama, etc.)</li>
    <li>Usa tus propias keys de búsqueda (Brave, SearXNG)</li>
    <li>Actualizaciones automáticas</li>
  </ul>
  <a href="/es-419/guide/installation" class="cta secondary">Instalar ahora</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/mes</span></div>
  <div class="subtitle">Todo lo que necesitas. Sin API keys requeridas.</div>
  <ul>
    <li>Todo lo de Open Source</li>
    <li>Inferencia de IA incluida — backend de LLM administrado, sin API keys necesarias</li>
    <li>Búsqueda web incluida</li>
    <li>Túnel en la nube para webhooks</li>
    <li>Trabajos programados</li>
    <li>Configuración en menos de 2 minutos</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=es" class="cta primary">Suscribirse</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/mes</span></div>
  <div class="subtitle">5x más uso que Pro. Para cargas de trabajo intensivas.</div>
  <ul>
    <li>Todo lo de Pro</li>
    <li>Inferencia de IA incluida — límites de uso más altos</li>
    <li>Equipos de agentes — colaboración multi-agente</li>
    <li>Más sesiones concurrentes</li>
    <li>Múltiples túneles en la nube</li>
    <li>Trabajos programados ilimitados</li>
    <li>Respuestas de IA más largas</li>
    <li>Soporte prioritario</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=es" class="cta primary">Suscribirse</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Personalizado</div>
  <div class="subtitle">Despliegues para equipos con SSO y cumplimiento normativo.</div>
  <ul>
    <li>Todo lo de Power</li>
    <li>Licencias multi-usuario</li>
    <li>Integración SSO / SAML</li>
    <li>Límites de uso personalizados</li>
    <li>Enrutamiento de modelos personalizado</li>
    <li>Soporte dedicado</li>
    <li>Garantías de SLA</li>
    <li>Opciones de despliegue on-premise</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Contactar a ventas</a>
</div>

</div>

## Comparación de características

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
<tr class="section-header"><td colspan="5">Plataforma</td></tr>
<tr><td>Todos los canales</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Todas las integraciones</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Motor de clasificación y políticas</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Automatización del navegador</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Entorno de ejecución</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Equipos de agentes</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">IA y búsqueda</td></tr>
<tr><td>Proveedor de LLM</td><td>Usa el tuyo</td><td>Administrado</td><td>Administrado</td><td>Administrado</td></tr>
<tr><td>Búsqueda web</td><td>Usa el tuyo</td><td>Incluida</td><td>Incluida</td><td>Incluida</td></tr>
<tr><td>Uso de IA</td><td>Tus límites de API</td><td>Estándar</td><td>Extendido</td><td>Personalizado</td></tr>

<tr class="section-header"><td colspan="5">Infraestructura</td></tr>
<tr><td>Túneles en la nube</td><td>&mdash;</td><td>&#10003;</td><td>Múltiples</td><td>Personalizado</td></tr>
<tr><td>Trabajos programados</td><td>Ilimitados</td><td>&#10003;</td><td>Ilimitados</td><td>Ilimitados</td></tr>
<tr><td>Actualizaciones automáticas</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">Soporte y administración</td></tr>
<tr><td>Soporte de la comunidad</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Soporte prioritario</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Licencias multi-usuario</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Cómo funciona Triggerfish Gateway

Triggerfish Gateway no es un producto separado — es un backend administrado para
el mismo agente de código abierto que ya ejecutas localmente.

1. **Suscríbete** arriba — recibirás tu clave de licencia por correo
   electrónico después del pago
2. **Ejecuta `triggerfish dive --force`** y selecciona Triggerfish Gateway como
   tu proveedor
3. **Ingresa tu clave de licencia** o usa el flujo de enlace mágico para
   activarla automáticamente

¿Ya te suscribiste en otra computadora? Ejecuta `triggerfish dive --force`,
selecciona Triggerfish Gateway y elige "Ya tengo una cuenta" para iniciar sesión
con tu correo electrónico.

Tu clave de licencia se almacena en el llavero de tu sistema operativo. Puedes
administrar tu suscripción en cualquier momento a través del portal del cliente.

## Preguntas frecuentes {.faq-section}

### ¿Puedo cambiar entre Open Source y Cloud?

Sí. La configuración de tu agente es un solo archivo YAML. Ejecuta
`triggerfish dive --force` para reconfigurar en cualquier momento. Cambia de tus
propias API keys a Triggerfish Gateway o viceversa — tu SPINE, skills, canales y
datos se mantienen exactamente iguales.

### ¿Qué LLM usa Triggerfish Gateway?

Triggerfish Gateway enruta a través de infraestructura de modelos optimizada. La
selección de modelos se administra por ti — elegimos la mejor relación
costo/calidad y manejamos el almacenamiento en caché, failover y optimización
automáticamente.

### ¿Puedo usar mis propias API keys junto con Cloud?

Sí. Triggerfish soporta cadenas de failover. Puedes configurar Cloud como tu
proveedor principal y recurrir a tu propia key de Anthropic u OpenAI, o
viceversa.

### ¿Qué pasa si mi suscripción vence?

Tu agente sigue funcionando. Vuelve al modo solo local — si tienes tus propias
API keys configuradas, esas siguen funcionando. Las funciones de Cloud (LLM
administrado, búsqueda, túneles) se detienen hasta que te vuelvas a suscribir.
No se pierden datos.

### ¿Mis datos se envían a través de sus servidores?

Las solicitudes de LLM se envían a través del gateway en la nube al proveedor
del modelo. No almacenamos el contenido de las conversaciones. Los metadatos de
uso se registran para facturación. Tu agente, datos, SPINE y skills permanecen
completamente en tu computadora.

### ¿Cómo administro mi suscripción?

Visita el portal del cliente para actualizar métodos de pago, cambiar de plan o
cancelar.
