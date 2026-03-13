---
layout: home

hero:
  name: Triggerfish
  text: セキュアなAIエージェント
  tagline: LLMレイヤー下の決定論的なポリシー適用。あらゆるチャンネル。例外なし。
  image:
    src: /triggerfish.png
    alt: Triggerfish — デジタルの海を泳ぐ
  actions:
    - theme: brand
      text: はじめる
      link: /ja-JP/guide/
    - theme: alt
      text: 料金
      link: /ja-JP/pricing
    - theme: alt
      text: GitHubで見る
      link: https://github.com/greghavens/triggerfish

features:
  - icon: "\U0001F512"
    title: LLM下のセキュリティ
    details: 決定論的なLLMサブレイヤーのポリシー適用。AIが回避・上書き・影響を与えることができない純粋なコードhook。同じ入力は常に同じ決定を生成します。
  - icon: "\U0001F4AC"
    title: あらゆるチャンネルに対応
    details: Telegram、Slack、Discord、WhatsApp、Email、WebChat、CLI — すべてチャンネル別分類とtaint自動追跡に対応しています。
  - icon: "\U0001F528"
    title: 何でも構築可能
    details: 書き込み/実行/修正のフィードバックループを備えたエージェント実行環境。自己作成skill。機能を検索・共有できるThe Reefマーケットプレイス。
  - icon: "\U0001F916"
    title: あらゆるLLMプロバイダーに対応
    details: Anthropic、OpenAI、Google Gemini、Ollamaによるローカルモデル、OpenRouter。自動failoverチェーン。またはTriggerfish Gatewayを選択すればAPIキー不要です。
  - icon: "\U0001F3AF"
    title: デフォルトでプロアクティブ
    details: Cronジョブ、トリガー、webhook。エージェントは厳格なポリシー境界内で自律的に確認・監視・行動します。
  - icon: "\U0001F310"
    title: オープンソース
    details: Apache 2.0ライセンス。セキュリティ重要コンポーネントが監査のために完全公開されています。信頼するだけでなく — コードを直接確認してください。
---

<LatestRelease />

## 1つのコマンドでインストール

::: code-group

```bash [macOS / Linux]
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

```powershell [Windows]
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

```bash [Docker]
docker run -v ./triggerfish.yaml:/data/triggerfish.yaml \
  -p 18789:18789 -p 18790:18790 \
  ghcr.io/greghavens/triggerfish:latest
```

:::

バイナリインストーラーはビルド済みリリースをダウンロードし、チェックサムを検証して、
セットアップウィザードを実行します。Dockerセットアップ、ソースからのビルド、リリース
プロセスについては[インストールガイド](/ja-JP/guide/installation)をご参照ください。

APIキーを管理したくない場合は、数分で利用可能な管理型LLMおよび検索インフラである
Triggerfish Gatewayの[料金](/ja-JP/pricing)をご確認ください。

## 仕組み

TriggerfishshはAIエージェントとエージェントが触れるすべてのものの間に決定論的な
ポリシーレイヤーを配置します。LLMはアクションを提案し — 純粋なコードhookが許可
するかどうかを決定します。

- **決定論的ポリシー** — セキュリティ決定は純粋なコードです。ランダム性なし、LLM
  の影響なし、例外なし。同じ入力、同じ決定、毎回。
- **情報フロー制御** — 4つの分類レベル（PUBLIC、INTERNAL、CONFIDENTIAL、
  RESTRICTED）がセッションtaintを通じて自動的に伝播します。データはより安全性の低い
  コンテキストに絶対に流れません。
- **6つの適用Hook** — データパイプラインのすべての段階がゲートされます：LLMコン
  テキストに入るもの、呼び出されるツール、返される結果、システムを離れるもの。すべて
  の決定が監査ログに記録されます。
- **デフォルト拒否** — 何も暗黙的に許可されません。未分類のツール、統合、データ
  ソースは明示的に設定されるまで拒否されます。
- **エージェントアイデンティティ** — エージェントのミッションはSPINE.mdに、プロ
  アクティブな行動はTRIGGER.mdにあります。Skillはシンプルなフォルダ規約を通じて
  機能を拡張します。The Reefマーケットプレイスで検索・共有できます。

[アーキテクチャについて詳しく知る。](/ja-JP/architecture/)
