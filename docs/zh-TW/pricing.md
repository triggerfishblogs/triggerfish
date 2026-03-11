---
title: 價格方案
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

# 價格方案

Triggerfish 是開放原始碼的，永遠如此。使用您自己的 API 金鑰，在本機免費執行
一切。Triggerfish Gateway 提供管理式 LLM 後端、網頁搜尋、通道及更新——
讓您不必自行管理這些。

::: info 搶先體驗
Triggerfish Gateway 目前處於搶先體驗階段。價格和功能可能會在
產品完善過程中調整。搶先體驗訂閱者將鎖定其費率。
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>開放原始碼</h3>
  <div class="price">免費</div>
  <div class="subtitle">永久免費。Apache 2.0 授權。</div>
  <ul>
    <li>完整代理平台</li>
    <li>所有頻道（Telegram、Slack、Discord、WhatsApp 等）</li>
    <li>所有整合（GitHub、Google、Obsidian 等）</li>
    <li>分類與策略執行</li>
    <li>技能、plugin、定時任務、webhook</li>
    <li>瀏覽器自動化</li>
    <li>自備 LLM 金鑰（Anthropic、OpenAI、Google、Ollama 等）</li>
    <li>自備搜尋金鑰（Brave、SearXNG）</li>
    <li>自動更新</li>
  </ul>
  <a href="/zh-TW/guide/installation" class="cta secondary">立即安裝</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/月</span></div>
  <div class="subtitle">您所需的一切。無需 API 金鑰。</div>
  <ul>
    <li>包含開放原始碼版的所有功能</li>
    <li>AI 推論已含——管理式 LLM 後端，無需 API 金鑰</li>
    <li>網頁搜尋已含</li>
    <li>雲端通道（用於 webhook）</li>
    <li>排程任務</li>
    <li>2 分鐘內完成設定</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=zh" class="cta primary">訂閱</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/月</span></div>
  <div class="subtitle">Pro 的 5 倍使用量。適用於高負載工作。</div>
  <ul>
    <li>包含 Pro 的所有功能</li>
    <li>AI 推論已含——更高使用限制</li>
    <li>代理團隊——多代理協作</li>
    <li>更多並行工作階段</li>
    <li>多個雲端通道</li>
    <li>無限排程任務</li>
    <li>更長的 AI 回應</li>
    <li>優先支援</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=zh" class="cta primary">訂閱</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">自訂</div>
  <div class="subtitle">團隊部署，支援 SSO 與合規。</div>
  <ul>
    <li>包含 Power 的所有功能</li>
    <li>多使用者授權</li>
    <li>SSO / SAML 整合</li>
    <li>自訂使用限制</li>
    <li>自訂模型路由</li>
    <li>專屬支援</li>
    <li>SLA 保證</li>
    <li>地端部署選項</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">聯繫銷售</a>
</div>

</div>

## 功能比較

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>開放原始碼</th>
  <th>Pro</th>
  <th>Power</th>
  <th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">平台</td></tr>
<tr><td>所有頻道</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>所有整合</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>分類與策略引擎</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>技能、plugin、webhook</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>瀏覽器自動化</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>執行環境</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>代理團隊</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI 與搜尋</td></tr>
<tr><td>LLM 提供者</td><td>自備</td><td>管理式</td><td>管理式</td><td>管理式</td></tr>
<tr><td>網頁搜尋</td><td>自備</td><td>已含</td><td>已含</td><td>已含</td></tr>
<tr><td>AI 使用量</td><td>您的 API 限制</td><td>標準</td><td>擴展</td><td>自訂</td></tr>

<tr class="section-header"><td colspan="5">基礎設施</td></tr>
<tr><td>雲端通道</td><td>&mdash;</td><td>&#10003;</td><td>多個</td><td>自訂</td></tr>
<tr><td>排程任務</td><td>無限</td><td>&#10003;</td><td>無限</td><td>無限</td></tr>
<tr><td>自動更新</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">支援與管理</td></tr>
<tr><td>社群支援</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>優先支援</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>多使用者授權</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Triggerfish Gateway 的運作方式

Triggerfish Gateway 不是一個獨立產品——它是您已在本機執行的同一個開放原始碼代理的
管理式後端。

1. **訂閱**上方方案——結帳後您將透過電子郵件收到授權金鑰
2. **執行 `triggerfish dive --force`** 並選擇 Triggerfish Gateway 作為您的提供者
3. **輸入您的授權金鑰**或使用魔術連結流程自動啟用

已在其他機器上訂閱？執行 `triggerfish dive --force`，選擇
Triggerfish Gateway，然後選擇「我已有帳號」以使用您的電子郵件登入。

您的授權金鑰儲存在作業系統鑰匙圈中。您可以隨時透過客戶入口網站管理您的訂閱。

## 常見問題 {.faq-section}

### 我可以在開放原始碼和雲端之間切換嗎？

可以。您的代理設定是一個單一 YAML 檔案。隨時執行 `triggerfish dive --force`
重新設定。從您自己的 API 金鑰切換到 Triggerfish Gateway 或反向操作——您的
SPINE、技能、頻道和資料完全不變。

### Triggerfish Gateway 使用什麼 LLM？

Triggerfish Gateway 透過最佳化的模型基礎設施進行路由。模型選擇為您管理——
我們挑選最佳的成本/品質權衡，並自動處理快取、故障轉移和最佳化。

### 我可以同時使用自己的 API 金鑰和雲端嗎？

可以。Triggerfish 支援故障轉移鏈。您可以將雲端設定為主要提供者，並使用您自己的
Anthropic 或 OpenAI 金鑰作為備用，反之亦然。

### 如果我的訂閱過期會怎樣？

您的代理會繼續執行。它會退回到僅本機模式——如果您有設定自己的 API 金鑰，
那些金鑰仍然有效。雲端功能（管理式 LLM、搜尋、通道）會暫停直到您重新訂閱。
不會遺失任何資料。

### 我的資料會通過你們的伺服器嗎？

LLM 請求會透過雲端閘道代理到模型提供者。我們不會儲存對話內容。使用中繼資料
會記錄用於計費。您的代理、資料、SPINE 和技能完全保留在您的機器上。

### 如何管理我的訂閱？

請造訪客戶入口網站來更新付款方式、切換方案或取消。
