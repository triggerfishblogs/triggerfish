# 診断の実行

Triggerfishには2つの組み込み診断ツールがあります：`patrol`（外部ヘルスチェック）と`healthcheck`ツール（内部システムプローブ）。

## Patrol

PatrolはコアシステムがOperationalかどうかを確認するCLIコマンドです：

```bash
triggerfish patrol
```

### チェック内容

| チェック | ステータス | 意味 |
|----------|----------|------|
| Gateway running | ダウン時CRITICAL | WebSocket制御プレーンが応答していない |
| LLM connected | ダウン時CRITICAL | プライマリLLMプロバイダーに到達できない |
| Channels active | 0の場合WARNING | チャンネルアダプターが接続されていない |
| Policy rules loaded | 0の場合WARNING | ポリシールールが読み込まれていない |
| Skills installed | 0の場合WARNING | スキルが検出されていない |

### 全体ステータス

- **HEALTHY** - すべてのチェックが通過
- **WARNING** - 一部の重要でないチェックがフラグされている（例：スキルがインストールされていない）
- **CRITICAL** - 少なくとも1つの重要なチェックが失敗している（GatewayまたはLLMに到達不可）

### Patrolを使うタイミング

- インストール後、すべてが動作していることを確認するため
- 設定変更後、デーモンがクリーンに再起動したことを確認するため
- ボットが応答しなくなったとき、どのコンポーネントが失敗したかを絞り込むため
- バグ報告を提出する前に、patrol出力を含めるため

### 出力例

```
Triggerfish Patrol Report
=========================
Overall: HEALTHY

[OK]      Gateway running
[OK]      LLM connected (anthropic)
[OK]      Channels active (3)
[OK]      Policy rules loaded (12)
[WARNING] Skills installed (0)
```

---

## Healthcheckツール

Healthcheckツールは、実行中のGateway内部からシステムコンポーネントをプローブする内部エージェントツールです。会話中にエージェントが使用できます。

### チェック内容

**Providers:**
- デフォルトプロバイダーが存在し到達可能か
- プロバイダー名を返す

**Storage:**
- ラウンドトリップテスト：キーを書き込み、読み返し、削除
- ストレージレイヤーが機能していることを確認

**Skills:**
- ソース別（bundled、installed、workspace）の検出スキル数をカウント

**Config:**
- 基本的な設定検証

### ステータスレベル

各コンポーネントは以下のいずれかを報告します：
- `healthy` - 完全に動作中
- `degraded` - 部分的に動作中（一部の機能が動作しない可能性がある）
- `error` - コンポーネントが壊れている

### 分類要件

Healthcheckツールはシステム内部（プロバイダー名、スキル数、ストレージステータス）を公開するため、最低INTERNAL分類が必要です。PUBLICセッションはこれを使用できません。

### Healthcheckの使用方法

エージェントに尋ねます：

> Run a healthcheck

またはツールを直接使用する場合：

```
tool: healthcheck
```

レスポンスは構造化されたレポートです：

```
Overall: healthy

Providers: healthy
  Default provider: anthropic

Storage: healthy
  Round-trip test passed

Skills: healthy
  12 skills discovered

Config: healthy
```

---

## 診断の組み合わせ

徹底的な診断セッションのために：

1. **CLIからpatrolを実行する：**
   ```bash
   triggerfish patrol
   ```

2. **最近のエラーのログを確認する：**
   ```bash
   triggerfish logs --level ERROR
   ```

3. **エージェントが応答している場合は、healthcheckを実行するよう依頼する：**
   > Run a system healthcheck and tell me about any issues

4. **課題を提出する必要がある場合は、ログバンドルを収集する：**
   ```bash
   triggerfish logs bundle
   ```

---

## 起動時の診断

デーモンがまったく起動しない場合は、この順序で確認します：

1. **設定が存在し有効である：**
   ```bash
   triggerfish config validate
   ```

2. **シークレットが解決できる：**
   ```bash
   triggerfish config get-secret --list
   ```

3. **ポートの競合がない：**
   ```bash
   # Linux
   ss -tlnp | grep -E '18789|18790'
   # macOS
   lsof -i :18789 -i :18790
   ```

4. **別のインスタンスが実行されていない：**
   ```bash
   triggerfish status
   ```

5. **システムジャーナルを確認する（Linux）：**
   ```bash
   journalctl --user -u triggerfish.service --no-pager -n 50
   ```

6. **launchdを確認する（macOS）：**
   ```bash
   launchctl print gui/$(id -u)/dev.triggerfish.agent
   ```

7. **Windowsイベントログを確認する（Windows）：**
   ```powershell
   Get-EventLog -LogName Application -Source Triggerfish -Newest 10
   ```
