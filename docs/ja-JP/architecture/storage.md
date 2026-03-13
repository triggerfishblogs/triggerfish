# ストレージ

Triggerfishのすべてのステートフルデータは統一された`StorageProvider`抽象化を通じて
流れます。どのモジュールも独自のストレージメカニズムを作成しません — 永続化が必要な
すべてのコンポーネントは依存関係として`StorageProvider`を受け取ります。この設計に
より、ビジネスロジックに触れることなくバックエンドを交換でき、すべてのテストを
高速で決定論的に保てます。

## StorageProviderインターフェース

```typescript
interface StorageProvider {
  /** キーで値を取得。見つからない場合はnullを返す。 */
  get(key: string): Promise<StorageValue | null>;

  /** キーに値を保存。既存の値は上書き。 */
  set(key: string, value: StorageValue): Promise<void>;

  /** キーを削除。キーが存在しない場合はno-op。 */
  delete(key: string): Promise<void>;

  /** オプションのプレフィックスに一致するすべてのキーをリスト。 */
  list(prefix?: string): Promise<string[]>;

  /** すべてのキーを削除。注意して使用。 */
  clear(): Promise<void>;
}
```

::: info `StorageValue`は文字列です。すべての構造化データ（セッション、系譜レコード、
設定）はストレージ前にJSONにシリアライズされ、読み取り時にデシリアライズされます。
これによりインターフェースがシンプルでバックエンドに依存しない状態を保ちます。 :::

## 実装

| バックエンド              | ユースケース                | 永続性                                             | 設定                              |
| ------------------------- | --------------------------- | -------------------------------------------------- | --------------------------------- |
| `MemoryStorageProvider`   | テスト、エフェメラルセッション | なし（再起動で失われる）                        | 設定不要                          |
| `SqliteStorageProvider`   | 個人ティアのデフォルト      | `~/.triggerfish/data/triggerfish.db`のSQLite WAL   | ゼロ設定                          |
| エンタープライズバックエンド | エンタープライズティア    | 顧客管理                                           | Postgres、S3、またはその他のバックエンド |

### MemoryStorageProvider

速度と決定論のためにすべてのテストで使用されます。データはメモリにのみ存在し、
プロセスが終了すると失われます。すべてのテストスイートは新鮮な
`MemoryStorageProvider`を作成し、テストが分離されて再現可能であることを保証します。

### SqliteStorageProvider

個人ティアデプロイメントのデフォルト。同時読み取りアクセスとクラッシュセーフのために
SQLiteをWAL（Write-Ahead Logging）モードで使用します。データベースは以下に置かれます：

```
~/.triggerfish/data/triggerfish.db
```

SQLiteは設定不要、サーバープロセス不要、ネットワーク不要です。単一のファイルが
すべてのTriggerfishの状態を保存します。`@db/sqlite` DenoパッケージがバインディングTo
提供し、`--allow-ffi`権限が必要です。

::: tip SQLite WALモードは単一のライターで複数のリーダーがデータベースに同時アクセス
できます。これはGatewayにとって重要で、エージェントがツール結果を書き込んでいる間も
セッション状態を読み取れます。 :::

### エンタープライズバックエンド

エンタープライズデプロイメントはコード変更なしに外部ストレージバックエンド（Postgres、
S3など）をプラグインできます。`StorageProvider`インターフェースの任意の実装が機能します。
バックエンドは`triggerfish.yaml`で設定されます。

## 名前空間付きキー

ストレージシステムのすべてのキーはデータタイプを識別するプレフィックスで名前空間
付けされています。これにより衝突を防ぎ、カテゴリーでデータをクエリ、保持、削除
することが可能になります。

| 名前空間          | キーパターン                                 | 説明                                           |
| ----------------- | -------------------------------------------- | ---------------------------------------------- |
| `sessions:`       | `sessions:sess_abc123`                       | セッション状態（会話履歴、メタデータ）         |
| `taint:`          | `taint:sess_abc123`                          | セッションtaintレベル                          |
| `lineage:`        | `lineage:lin_789xyz`                         | データ系譜レコード（プロベナンス追跡）         |
| `audit:`          | `audit:2025-01-29T10:23:45Z:hook_pre_output` | 監査ログエントリ                               |
| `cron:`           | `cron:job_daily_report`                      | Cronジョブの状態と実行履歴                     |
| `notifications:`  | `notifications:notif_456`                    | 通知キュー                                     |
| `exec:`           | `exec:run_789`                               | エージェント実行環境の履歴                     |
| `skills:`         | `skills:skill_weather`                       | インストール済みSkillのメタデータ              |
| `config:`         | `config:v3`                                  | 設定スナップショット                           |

## 保持ポリシー

各名前空間にはデフォルトの保持ポリシーがあります。エンタープライズデプロイメントは
これらをカスタマイズできます。

| 名前空間          | デフォルト保持期間        | 理由                                     |
| ----------------- | ------------------------- | ---------------------------------------- |
| `sessions:`       | 30日                      | 会話履歴は期限切れになる                 |
| `taint:`          | セッション保持に一致      | taintはセッションなしでは意味がない      |
| `lineage:`        | 90日                      | コンプライアンス主導、監査証跡           |
| `audit:`          | 1年                       | コンプライアンス主導、法律・規制対応     |
| `cron:`           | 30日                      | デバッグ用の実行履歴                     |
| `notifications:`  | 配信後 + 7日              | 未配信の通知は永続化する必要がある       |
| `exec:`           | 30日                      | デバッグ用の実行アーティファクト         |
| `skills:`         | 永続                      | インストール済みSkillメタデータは期限切れにならない |
| `config:`         | 10バージョン              | ロールバック用のローリング設定履歴       |

## 設計原則

### すべてのモジュールがStorageProviderを使用

Triggerfishのどのモジュールも独自のストレージメカニズムを作成しません。セッション
管理、taint追跡、系譜記録、監査ログ、cronの状態、通知キュー、実行履歴、設定 —
すべてが`StorageProvider`を通じて流れます。

これが意味すること：

- バックエンドの交換には依存性注入ポイントを1つ変更するだけ
- テストは速度のために`MemoryStorageProvider`を使用 — SQLiteのセットアップ不要、
  ファイルシステム不要
- 保存時の暗号化、バックアップ、またはレプリケーションを実装する場所が正確に1つある

### シリアライゼーション

すべての構造化データはストレージ前にJSON文字列にシリアライズされます。
シリアライズ/デシリアライズレイヤーは以下を処理します：

- `Date`オブジェクト（`toISOString()`でISO 8601文字列にシリアライズ、`new Date()`で
  デシリアライズ）
- ブランデッド型（基礎となる文字列値としてシリアライズ）
- ネストされたオブジェクトと配列

```typescript
// セッションを保存
const session = {
  id: "sess_abc",
  taint: "CONFIDENTIAL",
  createdAt: new Date(),
};
await storage.set("sessions:sess_abc", JSON.stringify(session));

// セッションを取得
const raw = await storage.get("sessions:sess_abc");
if (raw) {
  const session = JSON.parse(raw);
  session.createdAt = new Date(session.createdAt); // Dateを復元
}
```

### イミュータビリティ

セッション操作はイミュータブルです。セッションを読み取り、変更し、書き戻すと
常に新しいオブジェクトが生成されます。関数は格納されたオブジェクトをインプレースで
変更しません。これはTriggerfishの広いggg原則、つまり関数は新しいオブジェクトを返し、
変更しないというものと一致します。

## ディレクトリ構造

```
~/.triggerfish/
  config/          # エージェント設定、SPINE.md、TRIGGER.md
  data/            # triggerfish.db（SQLite）
  workspace/       # エージェントexec環境
    <agent-id>/    # エージェントごとのワークスペース（永続）
    background/    # バックグラウンドセッションのワークスペース
  skills/          # インストール済みSkill
  logs/            # 監査ログ
  secrets/         # 暗号化された認証情報ストア
```

::: warning セキュリティ `secrets/`ディレクトリにはOSキーチェーン統合によって管理
される暗号化された認証情報が含まれています。設定ファイルや`StorageProvider`に
シークレットを保存しないでください。OSキーチェーン（個人ティア）またはvault統合
（エンタープライズティア）を使用してください。 :::
