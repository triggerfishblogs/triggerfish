---
title: 定价
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

# 定价

Triggerfish 是开源的，并且将永远如此。使用您自己的 API 密钥，完全免费地在本地运行一切。Triggerfish Gateway 添加了托管的 LLM 后端、网页搜索、隧道和更新 —— 让您无需自行管理这些。

::: info 抢先体验
Triggerfish Gateway 目前处于抢先体验阶段。随着产品的完善，定价和功能可能会有所变化。抢先体验订阅者将锁定其费率。
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>开源版</h3>
  <div class="price">免费</div>
  <div class="subtitle">永久免费。Apache 2.0 许可证。</div>
  <ul>
    <li>完整的智能体平台</li>
    <li>所有渠道（Telegram、Slack、Discord、WhatsApp 等）</li>
    <li>所有集成（GitHub、Google、Obsidian 等）</li>
    <li>分类和策略执行</li>
    <li>技能、plugin、cron、webhook</li>
    <li>浏览器自动化</li>
    <li>自带 LLM 密钥（Anthropic、OpenAI、Google、Ollama 等）</li>
    <li>自带搜索密钥（Brave、SearXNG）</li>
    <li>自动更新</li>
  </ul>
  <a href="/zh-CN/guide/installation" class="cta secondary">立即安装</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/月</span></div>
  <div class="subtitle">您所需的一切。无需 API 密钥。</div>
  <ul>
    <li>开源版的所有功能</li>
    <li>包含 AI 推理 —— 托管 LLM 后端，无需 API 密钥</li>
    <li>包含网页搜索</li>
    <li>用于 webhook 的云隧道</li>
    <li>定时任务</li>
    <li>2 分钟内完成设置</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=zh" class="cta primary">订阅</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/月</span></div>
  <div class="subtitle">比 Pro 多 5 倍用量。适合重度工作负载。</div>
  <ul>
    <li>Pro 版的所有功能</li>
    <li>包含 AI 推理 —— 更高的使用限额</li>
    <li>智能体团队 —— 多智能体协作</li>
    <li>更多并发会话</li>
    <li>多个云隧道</li>
    <li>无限定时任务</li>
    <li>更长的 AI 响应</li>
    <li>优先支持</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=zh" class="cta primary">订阅</a>
</div>

<div class="pricing-card">
  <h3>企业版</h3>
  <div class="price">定制</div>
  <div class="subtitle">支持 SSO 和合规的团队部署。</div>
  <ul>
    <li>Power 版的所有功能</li>
    <li>多席位许可</li>
    <li>SSO / SAML 集成</li>
    <li>自定义使用限额</li>
    <li>自定义模型路由</li>
    <li>专属支持</li>
    <li>SLA 保障</li>
    <li>本地部署选项</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">联系销售</a>
</div>

</div>

## 功能对比

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>开源版</th>
  <th>Pro</th>
  <th>Power</th>
  <th>企业版</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">平台</td></tr>
<tr><td>所有渠道</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>所有集成</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>分类和策略引擎</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>技能、plugin、webhook</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>浏览器自动化</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>执行环境</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>智能体团队</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AI 和搜索</td></tr>
<tr><td>LLM 提供商</td><td>自带</td><td>托管</td><td>托管</td><td>托管</td></tr>
<tr><td>网页搜索</td><td>自带</td><td>包含</td><td>包含</td><td>包含</td></tr>
<tr><td>AI 用量</td><td>您的 API 限额</td><td>标准</td><td>扩展</td><td>定制</td></tr>

<tr class="section-header"><td colspan="5">基础设施</td></tr>
<tr><td>云隧道</td><td>&mdash;</td><td>&#10003;</td><td>多个</td><td>定制</td></tr>
<tr><td>定时任务</td><td>无限</td><td>&#10003;</td><td>无限</td><td>无限</td></tr>
<tr><td>自动更新</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">支持和管理</td></tr>
<tr><td>社区支持</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>优先支持</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>多席位许可</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Triggerfish Gateway 如何运作

Triggerfish Gateway 不是一个独立的产品 —— 它是您已经在本地运行的同一个开源智能体的托管后端。

1. **订阅**上方的方案 —— 结账后您将通过电子邮件收到许可证密钥
2. **运行 `triggerfish dive --force`** 并选择 Triggerfish Gateway 作为提供商
3. **输入您的许可证密钥**或使用魔法链接流程自动激活

已在另一台机器上订阅？运行 `triggerfish dive --force`，选择 Triggerfish Gateway，然后选择"我已有账户"来使用您的电子邮件登录。

您的许可证密钥存储在操作系统密钥链中。您可以随时通过客户门户管理您的订阅。

## 常见问题 {.faq-section}

### 我可以在开源版和云端之间切换吗？

可以。您的智能体配置是一个 YAML 文件。随时运行 `triggerfish dive --force` 重新配置。从您自己的 API 密钥切换到 Triggerfish Gateway 或切换回来 —— 您的 SPINE、技能、渠道和数据保持完全不变。

### Triggerfish Gateway 使用什么 LLM？

Triggerfish Gateway 通过优化的模型基础设施进行路由。模型选择由我们为您管理 —— 我们选择最佳的成本/质量平衡，并自动处理缓存、故障转移和优化。

### 我可以在使用云端的同时使用自己的 API 密钥吗？

可以。Triggerfish 支持故障转移链。您可以将云端配置为主提供商，并回退到您自己的 Anthropic 或 OpenAI 密钥，反之亦然。

### 如果我的订阅过期会怎样？

您的智能体会继续运行。它会回退到仅本地模式 —— 如果您配置了自己的 API 密钥，那些仍然有效。云端功能（托管 LLM、搜索、隧道）在您重新订阅之前停止。不会丢失任何数据。

### 我的数据会通过你们的服务器发送吗？

LLM 请求通过云 Gateway 代理到模型提供商。我们不存储对话内容。使用元数据会记录以用于计费。您的智能体、数据、SPINE 和技能完全保留在您的机器上。

### 如何管理我的订阅？

访问客户门户更新支付方式、切换方案或取消。
