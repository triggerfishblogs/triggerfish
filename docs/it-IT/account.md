---
title: Gestione abbonamento
layout: page
---

<style>
.account-wrapper {
  max-width: 440px;
  margin: 60px auto;
  padding: 0 20px;
  text-align: center;
}

.account-wrapper h1 {
  font-size: 24px;
  margin-bottom: 8px;
}

.account-wrapper .subtitle {
  color: var(--vp-c-text-2);
  font-size: 15px;
  margin-bottom: 32px;
}

.account-form {
  display: flex;
  gap: 8px;
}

.account-form input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
  font-size: 14px;
  outline: none;
}

.account-form input:focus {
  border-color: var(--vp-c-brand-2);
}

.account-form button {
  padding: 10px 20px;
  border: none;
  border-radius: 8px;
  background: var(--vp-c-brand-2);
  color: var(--vp-c-white);
  font-weight: 600;
  font-size: 14px;
  cursor: pointer;
  white-space: nowrap;
}

.account-form button:hover {
  background: #1a9e4a;
}

.account-form button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.account-message {
  margin-top: 20px;
  font-size: 14px;
  line-height: 1.6;
}

.account-message.error {
  color: var(--vp-c-danger-1);
}

.account-message.success {
  color: var(--vp-c-brand-2);
}

.usage-wrapper {
  max-width: 900px;
  margin: 40px auto;
  padding: 0 20px;
}

.usage-iframe {
  width: 100%;
  border: none;
  border-radius: 12px;
  min-height: 500px;
  background: transparent;
  display: block;
}
</style>

<div class="account-wrapper" id="account-form-section">
<h1>Gestisca il Suo abbonamento</h1>
<p class="subtitle">Inserisca la Sua email per ricevere un link di accesso.</p>
<div class="account-form">
<input type="email" id="account-email" placeholder="lei@esempio.com" />
<button id="account-btn">Invia link</button>
</div>
<div id="account-message" class="account-message" style="display:none;"></div>
</div>

<div class="usage-wrapper" id="usage-section" style="display:none;">
<iframe id="usage-iframe" class="usage-iframe" allowtransparency="true"></iframe>
</div>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  const isSandbox = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const GATEWAY = isSandbox ? 'https://api-sandbox.trigger.fish' : 'https://api.trigger.fish'

  const params = new URLSearchParams(window.location.search)
  const token = params.get('token')

  if (token) {
    const formSection = document.getElementById('account-form-section')
    const usageSection = document.getElementById('usage-section')
    const iframe = document.getElementById('usage-iframe')

    formSection.style.display = 'none'
    usageSection.style.display = ''
    iframe.src = `${GATEWAY}/v1/account/usage?token=${encodeURIComponent(token)}`

    window.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'tf-resize' && typeof event.data.height === 'number') {
        iframe.style.height = `${event.data.height}px`
      }
    })

    return
  }

  const input = document.getElementById('account-email')
  const btn = document.getElementById('account-btn')
  const msg = document.getElementById('account-message')

  btn.addEventListener('click', async () => {
    const email = input.value.trim()
    if (!email) return

    btn.disabled = true
    btn.textContent = 'Invio in corso...'
    msg.style.display = 'none'

    try {
      const resp = await fetch(`${GATEWAY}/v1/setup/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, portal: true }),
      })

      if (resp.ok) {
        msg.className = 'account-message success'
        msg.textContent = 'Controlli la Sua email per un link di accesso. La porterà al portale di fatturazione dove potrà aggiornare il Suo piano, metodo di pagamento o cancellare.'
      } else {
        const data = await resp.json().catch(() => ({}))
        msg.className = 'account-message error'
        msg.textContent = data.error || 'Si è verificato un errore. La preghiamo di riprovare.'
      }
    } catch {
      msg.className = 'account-message error'
      msg.textContent = 'Impossibile raggiungere il server. La preghiamo di riprovare.'
    }

    msg.style.display = ''
    btn.disabled = false
    btn.textContent = 'Invia link'
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click()
  })
})
</script>
