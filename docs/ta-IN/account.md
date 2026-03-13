---
title: Subscription நிர்வகிக்கவும்
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
<h1>உங்கள் subscription நிர்வகிக்கவும்</h1>
<p class="subtitle">Sign-in link பெற உங்கள் email உள்ளிடவும்.</p>
<div class="account-form">
<input type="email" id="account-email" placeholder="you@example.com" />
<button id="account-btn">Link அனுப்பவும்</button>
</div>
<div id="account-message" class="account-message" style="display:none;"></div>
</div>

<div class="usage-wrapper" id="usage-section" style="display:none;">
<iframe id="usage-iframe" class="usage-iframe" allowtransparency="true"></iframe>
</div>

<script setup>
import { onMounted } from 'vue'

onMounted(() => {
  // Derive gateway from current hostname (no hardcoded URLs)
  const isSandbox = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  const GATEWAY = isSandbox ? 'https://api-sandbox.trigger.fish' : 'https://api.trigger.fish'

  // Check for token param — if present, show usage dashboard instead of email form
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
    btn.textContent = 'அனுப்புகிறோம்...'
    msg.style.display = 'none'

    try {
      const resp = await fetch(`${GATEWAY}/v1/setup/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, portal: true }),
      })

      if (resp.ok) {
        msg.className = 'account-message success'
        msg.textContent = 'Sign-in link க்கு email சரிபார்க்கவும். உங்கள் plan, payment method update செய்ய அல்லது cancel செய்ய billing portal க்கு அழைத்துச் செல்லும்.'
      } else {
        const data = await resp.json().catch(() => ({}))
        msg.className = 'account-message error'
        msg.textContent = data.error || 'ஏதோ தவறாகியது. மீண்டும் try செய்யவும்.'
      }
    } catch {
      msg.className = 'account-message error'
      msg.textContent = 'Server reach செய்ய முடியவில்லை. மீண்டும் try செய்யவும்.'
    }

    msg.style.display = ''
    btn.disabled = false
    btn.textContent = 'Link அனுப்பவும்'
  })

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btn.click()
  })
})
</script>
