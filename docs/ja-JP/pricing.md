---
title: 料金
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

# 料金

Triggerfishshはオープンソースであり、今後も変わりません。自分のAPIキーを持ち込み、
すべてをローカルで無料で実行できます。Triggerfish Gatewayは管理型LLMバックエンド、
ウェブ検索、トンネル、アップデートを追加します — これらすべてを自分で管理する必要がなくなります。

::: info アーリーアクセス
Triggerfish Gatewayは現在アーリーアクセス段階です。製品の改善に伴い、料金と機能は
変更される場合があります。アーリーアクセスのサブスクライバーは現在の料金を維持できます。
:::

<div class="pricing-grid">

<div class="pricing-card">
  <h3>オープンソース</h3>
  <div class="price">無料</div>
  <div class="subtitle">永続的に。Apache 2.0。</div>
  <ul>
    <li>フルエージェントプラットフォーム</li>
    <li>全チャンネル（Telegram、Slack、Discord、WhatsAppなど）</li>
    <li>全統合（GitHub、Google、Obsidianなど）</li>
    <li>分類とポリシー適用</li>
    <li>Skill、プラグイン、cron、webhook</li>
    <li>ブラウザ自動化</li>
    <li>独自のLLMキーを持ち込み（Anthropic、OpenAI、Google、Ollamaなど）</li>
    <li>独自の検索キーを持ち込み（Brave、SearXNG）</li>
    <li>自動アップデート</li>
  </ul>
  <a href="/ja-JP/guide/installation" class="cta secondary">今すぐインストール</a>
</div>

<div class="pricing-card featured">
  <h3>Pro</h3>
  <div class="price">$49<span>/月</span></div>
  <div class="subtitle">必要なものすべて。APIキー不要。</div>
  <ul>
    <li>オープンソースのすべての機能</li>
    <li>AI推論込み — 管理型LLMバックエンド、APIキー不要</li>
    <li>ウェブ検索込み</li>
    <li>webhookのクラウドトンネル</li>
    <li>スケジュールジョブ</li>
    <li>2分以内にセットアップ完了</li>
  </ul>
  <a href="https://billing.trigger.fish/b/aFa14m9mobpH0vc4mlao800?locale=en" class="cta primary">サブスクリプション開始</a>
</div>

<div class="pricing-card">
  <h3>Power</h3>
  <div class="price">$199<span>/月</span></div>
  <div class="subtitle">Proの5倍の使用量。大量ワークロード向け。</div>
  <ul>
    <li>Proのすべての機能</li>
    <li>AI推論込み — 高使用量制限</li>
    <li>エージェントチーム — マルチエージェント連携</li>
    <li>より多くの同時セッション</li>
    <li>複数のクラウドトンネル</li>
    <li>無制限のスケジュールジョブ</li>
    <li>より長いAIレスポンス</li>
    <li>優先サポート</li>
  </ul>
  <a href="https://billing.trigger.fish/b/5kQdR89mo2Tb4Lsg53ao802?locale=en" class="cta primary">サブスクリプション開始</a>
</div>

<div class="pricing-card">
  <h3>Enterprise</h3>
  <div class="price">カスタム</div>
  <div class="subtitle">SSOとコンプライアンスを備えたチームデプロイメント。</div>
  <ul>
    <li>Powerのすべての機能</li>
    <li>マルチシートライセンス</li>
    <li>SSO / SAML統合</li>
    <li>カスタム使用量制限</li>
    <li>カスタムモデルルーティング</li>
    <li>専任サポート</li>
    <li>SLA保証</li>
    <li>オンプレミスデプロイオプション</li>
  </ul>
  <a href="mailto:sales@trigger.fish" class="cta secondary">営業に連絡</a>
</div>

</div>

## 機能比較

<table class="comparison-table">
<thead>
<tr>
  <th></th>
  <th>オープンソース</th>
  <th>Pro</th>
  <th>Power</th>
  <th>Enterprise</th>
</tr>
</thead>
<tbody>
<tr class="section-header"><td colspan="5">プラットフォーム</td></tr>
<tr><td>全チャンネル</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>全統合</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>分類とポリシーエンジン</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>Skill、プラグイン、webhook</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>ブラウザ自動化</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>実行環境</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>エージェントチーム</td><td>&#10003;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">AIと検索</td></tr>
<tr><td>LLMプロバイダー</td><td>持ち込み</td><td>管理型</td><td>管理型</td><td>管理型</td></tr>
<tr><td>ウェブ検索</td><td>持ち込み</td><td>込み</td><td>込み</td><td>込み</td></tr>
<tr><td>AI使用量</td><td>自分のAPIの制限</td><td>標準</td><td>拡張</td><td>カスタム</td></tr>

<tr class="section-header"><td colspan="5">インフラ</td></tr>
<tr><td>クラウドトンネル</td><td>&mdash;</td><td>&#10003;</td><td>複数</td><td>カスタム</td></tr>
<tr><td>スケジュールジョブ</td><td>無制限</td><td>&#10003;</td><td>無制限</td><td>無制限</td></tr>
<tr><td>自動アップデート</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>

<tr class="section-header"><td colspan="5">サポートと管理</td></tr>
<tr><td>コミュニティサポート</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>優先サポート</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td><td>&#10003;</td></tr>
<tr><td>マルチシートライセンス</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SSO / SAML</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
<tr><td>SLA</td><td>&mdash;</td><td>&mdash;</td><td>&mdash;</td><td>&#10003;</td></tr>
</tbody>
</table>

## Triggerfish Gatewayの仕組み

Triggerfish Gatewayは別製品ではありません — ローカルで既に実行している同じオープン
ソースエージェントの管理型バックエンドです。

1. **上記でサブスクリプション** — チェックアウト後にメールでライセンスキーが届きます
2. **`triggerfish dive --force`を実行**して、プロバイダーとしてTriggerfish Gatewayを選択します
3. **ライセンスキーを入力**するか、マジックリンクフローで自動的にアクティベートします

別のマシンですでにサブスクライブしている場合は、`triggerfish dive --force`を実行し、
Triggerfish Gatewayを選択して「すでにアカウントをお持ちの方」を選んでメールでサインインしてください。

ライセンスキーはOSキーチェーンに保存されます。カスタマーポータルからいつでも
サブスクリプションを管理できます。

## FAQ {.faq-section}

### オープンソースとクラウドの切り替えはできますか？

はい。エージェントの設定は1つのYAMLファイルです。いつでも`triggerfish dive --force`を
実行して再設定できます。独自のAPIキーからTriggerfish Gatewayへ、またはその逆に切り替えても
— SPINE、skill、チャンネル、データはまったく同じ状態を保ちます。

### Triggerfish GatewayはどのLLMを使用しますか？

Triggerfish Gatewayは最適化されたモデルインフラを通じてルーティングします。モデルの
選択は自動管理されます — 最良のコスト/品質のトレードオフを選択し、キャッシュ、failover、
最適化を自動的に処理します。

### クラウドと一緒に独自のAPIキーを使用できますか？

はい。Triggerfishshはfailoverチェーンをサポートしています。クラウドをプライマリ
プロバイダーとして設定し、独自のAnthropicまたはOpenAIキーにフォールバックすることも、
またその逆も可能です。

### サブスクリプションが切れた場合はどうなりますか？

エージェントは引き続き動作します。ローカルのみのモードにフォールバックします — 独自のAPIキーが
設定されている場合は引き続き機能します。クラウド機能（管理型LLM、検索、トンネル）は
再サブスクリプションまで停止します。データは失われません。

### データはサーバーを通じて送信されますか？

LLMリクエストはクラウドゲートウェイを経由してモデルプロバイダーにプロキシされます。
会話コンテンツは保存されません。使用量のメタデータは請求のためにログに記録されます。
エージェント、データ、SPINE、skillはすべてお客様のマシン上に残ります。

### サブスクリプションはどのように管理しますか？

カスタマーポータルにアクセスして、支払い方法の更新、プランの変更、またはキャンセルを
行ってください。
