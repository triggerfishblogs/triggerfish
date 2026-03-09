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

Triggerfish es de codigo abierto y siempre lo sera. Utilice sus propias claves
API y ejecute todo localmente de forma gratuita. Triggerfish Gateway anade un
backend LLM gestionado, busqueda web, tuneles y actualizaciones — para que
usted no tenga que gestionar nada de ello.

::: info Acceso anticipado
Triggerfish Gateway se encuentra actualmente en acceso anticipado. Los precios y
las funcionalidades pueden cambiar a medida que perfeccionamos el producto. Los
suscriptores de acceso anticipado fijan su tarifa.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Open Source</h3>
  <div class="price">Gratis</div>
  <div class="subtitle">Para siempre. Apache 2.0.</div>
  <ul>
    <li>Plataforma de agentes completa</li>
    <li>Todos los canales (Telegram, Slack, Discord, WhatsApp, etc.)</li>
    <li>Todas las integraciones (GitHub, Google, Obsidian, etc.)</li>
    <li>Clasificacion y aplicacion de politicas</li>
    <li>Skills, plugins, cron, webhooks</li>
    <li>Automatizacion del navegador</li>
    <li>Traiga sus propias claves LLM (Anthropic, OpenAI, Google, Ollama, etc.)</li>
    <li>Traiga sus propias claves de busqueda (Brave, SearXNG)</li>
    <li>Actualizaciones automaticas</li>
  </ul>
  <a href="/es-ES/guide/installation" class="cta secondary">Instalar ahora</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/mes</span></div>
  <div class="subtitle">Todo lo que necesita. Sin claves API.</div>
  <ul>
    <li>Todo lo de Open Source</li>
    <li>Inferencia de IA incluida — backend LLM gestionado, sin claves API necesarias</li>
    <li>Busqueda web incluida</li>
    <li>Tunel en la nube para webhooks</li>
    <li>Trabajos programados</li>
    <li>Configuracion en menos de 2 minutos</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=es" class="cta primary">Suscribirse</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/mes</span></div>
  <div class="subtitle">5 veces mas uso que Pro. Para cargas de trabajo intensivas.</div>
  <ul>
    <li>Todo lo de Pro</li>
    <li>Inferencia de IA incluida — limites de uso superiores</li>
    <li>Equipos de agentes — colaboracion multiagente</li>
    <li>Mas sesiones concurrentes</li>
    <li>Multiples tuneles en la nube</li>
    <li>Trabajos programados ilimitados</li>
    <li>Respuestas de IA mas largas</li>
    <li>Soporte prioritario</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=es" class="cta primary">Suscribirse</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Personalizado</div>
  <div class="subtitle">Despliegues en equipo con SSO y cumplimiento normativo.</div>
  <ul>
    <li>Todo lo de Power</li>
    <li>Licencias multi-puesto</li>
    <li>Integracion SSO / SAML</li>
    <li>Limites de uso personalizados</li>
    <li>Enrutamiento de modelos personalizado</li>
    <li>Soporte dedicado</li>
    <li>Garantias de SLA</li>
    <li>Opciones de despliegue en sus instalaciones</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Contactar con ventas</a>
</div>

</div>

## Comparativa de funcionalidades

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
<tr><td>Clasificacion y motor de politicas</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skills, plugins, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Automatizacion del navegador</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Entorno de ejecucion</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Equipos de agentes</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">IA y busqueda</td></tr>
<tr><td>Proveedor LLM</td><td>El suyo propio</td><td>Gestionado</td><td>Gestionado</td><td>Gestionado</td></tr>
<tr><td>Busqueda web</td><td>La suya propia</td><td>Incluida</td><td>Incluida</td><td>Incluida</td></tr>
<tr><td>Uso de IA</td><td>Sus limites API</td><td>Estandar</td><td>Ampliado</td><td>Personalizado</td></tr>

<tr class="section-header"><td colspan="5">Infraestructura</td></tr>
<tr><td>Tuneles en la nube</td><td>&mdash;</td><td>&#10003;</td><td>Multiples</td><td>Personalizado</td></tr>
<tr><td>Trabajos programados</td><td>Ilimitados</td><td>&#10003;</td><td>Ilimitados</td><td>Ilimitados</td></tr>
<tr><td>Actualizaciones automaticas</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">Soporte y administracion</td></tr>
<tr><td>Soporte de la comunidad</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Soporte prioritario</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Licencias multi-puesto</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Como funciona Triggerfish Gateway

Triggerfish Gateway no es un producto independiente — es un backend gestionado
para el mismo agente de codigo abierto que ya ejecuta localmente.

1. **Suscribase** arriba — recibira su clave de licencia por correo electronico
   tras completar la compra
2. **Ejecute `triggerfish dive --force`** y seleccione Triggerfish Gateway como
   su proveedor
3. **Introduzca su clave de licencia** o utilice el flujo de magic link para
   activar automaticamente

Ya se ha suscrito en otro ordenador? Ejecute `triggerfish dive --force`,
seleccione Triggerfish Gateway y elija "Ya tengo una cuenta" para iniciar sesion
con su correo electronico.

Su clave de licencia se almacena en el llavero de su sistema operativo. Puede
gestionar su suscripcion en cualquier momento a traves del portal del cliente.

## Preguntas frecuentes {.faq-section}

### Puedo cambiar entre Open Source y Cloud?

Si. La configuracion de su agente es un unico fichero YAML. Ejecute
`triggerfish dive --force` para reconfigurar en cualquier momento. Cambie entre
sus propias claves API y Triggerfish Gateway o viceversa — su SPINE, skills,
canales y datos permanecen exactamente igual.

### Que LLM utiliza Triggerfish Gateway?

Triggerfish Gateway enruta a traves de una infraestructura de modelos optimizada.
La seleccion del modelo se gestiona automaticamente — elegimos el mejor
equilibrio coste/calidad y gestionamos la cache, el failover y la optimizacion
de forma automatica.

### Puedo utilizar mis propias claves API junto con Cloud?

Si. Triggerfish soporta cadenas de failover. Puede configurar Cloud como su
proveedor principal y recurrir a su propia clave de Anthropic u OpenAI como
respaldo, o viceversa.

### Que ocurre si mi suscripcion caduca?

Su agente sigue funcionando. Vuelve al modo solo-local — si tiene sus propias
claves API configuradas, seguiran funcionando. Las funcionalidades Cloud (LLM
gestionado, busqueda, tuneles) se detienen hasta que se vuelva a suscribir. No
se pierde ningun dato.

### Se envian mis datos a traves de sus servidores?

Las solicitudes LLM se envian a traves del gateway en la nube al proveedor del
modelo. No almacenamos el contenido de las conversaciones. Los metadatos de uso
se registran para facturacion. Su agente, datos, SPINE y skills permanecen
enteramente en su ordenador.

### Como gestiono mi suscripcion?

Visite el portal del cliente para actualizar los metodos de pago, cambiar de
plan o cancelar.
