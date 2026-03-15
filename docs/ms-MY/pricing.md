---
title: Harga
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

# Harga

Triggerfish adalah sumber terbuka dan akan sentiasa begitu. Bawa kunci API anda sendiri dan jalankan semua secara tempatan secara percuma. Triggerfish Gateway menambah backend LLM yang diuruskan, carian web, terowong, dan kemas kini — supaya anda tidak perlu mengurus mana-mana daripada itu.

::: info Akses Awal
Triggerfish Gateway sedang dalam akses awal. Harga dan ciri mungkin berubah semasa kami memperhalusi produk. Pelanggan akses awal mengunci kadar mereka.
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>Sumber Terbuka</h3>
  <div class="price">Percuma</div>
  <div class="subtitle">Selamanya. Apache 2.0.</div>
  <ul>
    <li>Platform ejen penuh</li>
    <li>Semua saluran (Telegram, Slack, Discord, WhatsApp, dll.)</li>
    <li>Semua integrasi (GitHub, Google, Obsidian, dll.)</li>
    <li>Pengkelasan &amp; penguatkuasaan dasar</li>
    <li>Kemahiran, plugin, cron, webhooks</li>
    <li>Automasi penyemak imbas</li>
    <li>Bawa kunci LLM anda sendiri (Anthropic, OpenAI, Google, Ollama, dll.)</li>
    <li>Bawa kunci carian anda sendiri (Brave, SearXNG)</li>
    <li>Kemas kini automatik</li>
  </ul>
  <a href="/ms-MY/guide/installation" class="cta secondary">Pasang Sekarang</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/bulan</span></div>
  <div class="subtitle">Semua yang anda perlukan. Tiada kunci API diperlukan.</div>
  <ul>
    <li>Semua dalam Sumber Terbuka</li>
    <li>Inferens AI disertakan — backend LLM yang diuruskan, tiada kunci API diperlukan</li>
    <li>Carian web disertakan</li>
    <li>Terowong awan untuk webhooks</li>
    <li>Kerja berjadual</li>
    <li>Persediaan dalam masa kurang 2 minit</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=en" class="cta primary">Langgan</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/bulan</span></div>
  <div class="subtitle">Penggunaan 5x lebih banyak daripada Pro. Untuk beban kerja berat.</div>
  <ul>
    <li>Semua dalam Pro</li>
    <li>Inferens AI disertakan — had penggunaan yang lebih tinggi</li>
    <li>Pasukan ejen — kerjasama berbilang ejen</li>
    <li>Lebih banyak sesi serentak</li>
    <li>Pelbagai terowong awan</li>
    <li>Kerja berjadual tanpa had</li>
    <li>Respons AI yang lebih panjang</li>
    <li>Sokongan keutamaan</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=en" class="cta primary">Langgan</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">Tersuai</div>
  <div class="subtitle">Penyebaran pasukan dengan SSO dan pematuhan.</div>
  <ul>
    <li>Semua dalam Power</li>
    <li>Pelesenan berbilang tempat duduk</li>
    <li>Integrasi SSO / SAML</li>
    <li>Had penggunaan tersuai</li>
    <li>Penghalaan model tersuai</li>
    <li>Sokongan berdedikasi</li>
    <li>Jaminan SLA</li>
    <li>Pilihan penyebaran di premis</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">Hubungi Jualan</a>
</div>

</div>

## Perbandingan Ciri

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>Sumber Terbuka</th>
  <th>Pro</th>
  <th>Power</th>
  <th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">Platform</td></tr>
<tr><td>Semua saluran</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Semua integrasi</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Enjin pengkelasan &amp; dasar</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Kemahiran, plugin, webhooks</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Automasi penyemak imbas</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Persekitaran exec</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Pasukan ejen</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI &amp; Carian</td></tr>
<tr><td>Pembekal LLM</td><td>Bawa sendiri</td><td>Diuruskan</td><td>Diuruskan</td><td>Diuruskan</td></tr>
<tr><td>Carian web</td><td>Bawa sendiri</td><td>Disertakan</td><td>Disertakan</td><td>Disertakan</td></tr>
<tr><td>Penggunaan AI</td><td>Had API anda</td><td>Standard</td><td>Dilanjutkan</td><td>Tersuai</td></tr>

<tr class="section-header"><td colspan="5">Infrastruktur</td></tr>
<tr><td>Terowong awan</td><td>&mdash;</td><td>&#10003;</td><td>Pelbagai</td><td>Tersuai</td></tr>
<tr><td>Kerja berjadual</td><td>Tanpa had</td><td>&#10003;</td><td>Tanpa had</td><td>Tanpa had</td></tr>
<tr><td>Kemas kini automatik</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">Sokongan &amp; Pentadbiran</td></tr>
<tr><td>Sokongan komuniti</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Sokongan keutamaan</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Pelesenan berbilang tempat duduk</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Cara Triggerfish Gateway Berfungsi

Triggerfish Gateway bukan produk yang berasingan — ia adalah backend yang diuruskan untuk ejen sumber terbuka yang sama yang anda jalankan secara tempatan.

1. **Langgan** di atas — anda akan menerima kunci lesen anda melalui e-mel selepas pembayaran
2. **Jalankan `triggerfish dive --force`** dan pilih Triggerfish Gateway sebagai pembekal anda
3. **Masukkan kunci lesen anda** atau gunakan aliran pautan ajaib untuk mengaktifkan secara automatik

Sudah melanggan pada mesin lain? Jalankan `triggerfish dive --force`, pilih Triggerfish Gateway, dan pilih "Saya sudah mempunyai akaun" untuk log masuk dengan e-mel anda.

Kunci lesen anda disimpan dalam keychain OS anda. Anda boleh mengurus langganan anda pada bila-bila masa melalui portal pelanggan.

## Soalan Lazim {.faq-section}

### Bolehkah saya bertukar antara Sumber Terbuka dan Awan?

Ya. Konfigurasi ejen anda adalah satu fail YAML. Jalankan `triggerfish dive --force` untuk mengkonfigurasi semula pada bila-bila masa. Beralih daripada kunci API anda sendiri ke Triggerfish Gateway atau sebaliknya — SPINE, kemahiran, saluran, dan data anda kekal sama.

### LLM apakah yang digunakan oleh Triggerfish Gateway?

Triggerfish Gateway menghalakan melalui infrastruktur model yang dioptimumkan. Pemilihan model diuruskan untuk anda — kami memilih pertukaran kos/kualiti terbaik dan mengendalikan caching, failover, dan pengoptimuman secara automatik.

### Bolehkah saya menggunakan kunci API saya sendiri bersama-sama dengan Awan?

Ya. Triggerfish menyokong rantaian failover. Anda boleh mengkonfigurasi Awan sebagai pembekal utama anda dan jatuh semula ke kunci Anthropic atau OpenAI anda sendiri, atau sebaliknya.

### Apa yang berlaku jika langganan saya tamat?

Ejen anda terus berjalan. Ia jatuh semula ke mod tempatan sahaja — jika anda mempunyai kunci API anda sendiri yang dikonfigurasi, ia masih berfungsi. Ciri Awan (LLM yang diuruskan, carian, terowong) berhenti sehingga anda melanggan semula. Tiada data yang hilang.

### Adakah data saya dihantar melalui pelayan anda?

Permintaan LLM diproksikan melalui gateway awan ke pembekal model. Kami tidak menyimpan kandungan perbualan. Metadata penggunaan dilog untuk pengebilan. Ejen, data, SPINE, dan kemahiran anda kekal sepenuhnya pada mesin anda.

### Bagaimana saya mengurus langganan saya?

Lawati portal pelanggan untuk mengemas kini kaedah pembayaran, menukar pelan, atau membatalkan.
