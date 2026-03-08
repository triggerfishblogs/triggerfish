---
title: Choose a Plan
layout: page
navbar: false
sidebar: false
aside: false
footer: false
editLink: false
lastUpdated: false
---

<style>
.checkout-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 40px 20px;
}

.checkout-header {
  text-align: center;
  margin-bottom: 40px;
}

.checkout-header h1 {
  font-size: 28px;
  margin: 0 0 8px;
}

.checkout-header p {
  color: var(--vp-c-text-2);
  font-size: 15px;
  margin: 0;
}

.checkout-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  max-width: 620px;
  width: 100%;
}

@media (max-width: 560px) {
  .checkout-grid { grid-template-columns: 1fr; }
}

.checkout-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 32px 24px;
  background: var(--vp-c-bg-soft);
  display: flex;
  flex-direction: column;
}

.checkout-card h3 { margin: 0 0 8px; font-size: 22px; }

.checkout-card .price {
  font-size: 36px;
  font-weight: 700;
  margin: 8px 0 4px;
}

.checkout-card .price span {
  font-size: 16px;
  font-weight: 400;
  color: var(--vp-c-text-2);
}

.checkout-card .subtitle {
  color: var(--vp-c-text-2);
  font-size: 14px;
  margin-bottom: 24px;
}

.checkout-card ul {
  list-style: none;
  padding: 0;
  margin: 0 0 24px;
  flex: 1;
}

.checkout-card ul li {
  padding: 6px 0;
  font-size: 14px;
  line-height: 1.5;
}

.checkout-card ul li::before {
  content: "\2713\00a0";
  color: var(--vp-c-brand-1);
  font-weight: 700;
}

.checkout-btn {
  display: block;
  text-align: center;
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  margin-top: auto;
  background: var(--vp-c-brand-2);
  color: var(--vp-c-white);
  border: none;
  width: 100%;
}

.checkout-btn:hover { background: #1a9e4a; }
.checkout-btn:disabled { opacity: 0.6; cursor: not-allowed; }

.checkout-error {
  color: var(--vp-c-danger-1);
  text-align: center;
  margin-top: 24px;
  font-size: 14px;
}

.checkout-missing {
  text-align: center;
  padding: 80px 20px;
}
</style>

<div id="missing-params" class="checkout-missing" style="display:none;">
<h2>Invalid setup link</h2>
<p>This page is opened automatically by <code>triggerfish dive</code>.<br>Run the setup wizard in your terminal to get started.</p>
</div>

<div id="checkout-flow" class="checkout-wrapper" style="display:none;">
<div class="checkout-header">
<h1>Choose your plan</h1>
<p>Your agent is waiting — pick a plan to finish setup.</p>
</div>
<div class="checkout-grid">
<div class="checkout-card">
<h3>Pro</h3>
<div class="price">$49<span>/month</span></div>
<div class="subtitle">Everything you need.</div>
<ul>
<li>AI inference included</li>
<li>Web search included</li>
<li>Cloud tunnel for webhooks</li>
<li>Scheduled jobs</li>
<li>No API keys to manage</li>
</ul>
<button class="checkout-btn" data-plan="pro">Subscribe</button>
</div>
<div class="checkout-card">
<h3>Power</h3>
<div class="price">$199<span>/month</span></div>
<div class="subtitle">5x more usage than Pro.</div>
<ul>
<li>Everything in Pro</li>
<li>Higher usage limits</li>
<li>More concurrent sessions</li>
<li>Multiple cloud tunnels</li>
<li>Longer AI responses</li>
</ul>
<button class="checkout-btn" data-plan="power">Subscribe</button>
</div>
</div>
<div id="checkout-error" class="checkout-error" style="display:none;"></div>
</div>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const params = new URLSearchParams(window.location.search)
  const flowId = params.get('flow_id')
  const port = params.get('port')
  const gateway = params.get('gateway')

  if (!flowId || !port || !gateway) {
    document.getElementById('missing-params').style.display = ''
    return
  }

  document.getElementById('checkout-flow').style.display = ''

  document.querySelectorAll('button.checkout-btn[data-plan]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const plan = btn.dataset.plan
      const errorEl = document.getElementById('checkout-error')
      errorEl.style.display = 'none'

      document.querySelectorAll('button.checkout-btn').forEach(b => {
        b.disabled = true
      })
      btn.textContent = 'Redirecting to checkout...'

      try {
        const resp = await fetch(`${gateway}/v1/setup/checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ flow_id: flowId, port: Number(port), plan }),
        })
        const data = await resp.json()
        if (data.checkout_url) {
          window.location.href = data.checkout_url
        } else {
          showError(btn, plan, errorEl, data.error || 'Checkout session failed')
        }
      } catch (err) {
        showError(btn, plan, errorEl, 'Could not reach the Triggerfish gateway')
      }
    })
  })

  function showError(btn, plan, errorEl, msg) {
    errorEl.textContent = msg
    errorEl.style.display = ''
    document.querySelectorAll('button.checkout-btn').forEach(b => {
      b.disabled = false
    })
    btn.textContent = 'Subscribe'
  }
})
</script>
