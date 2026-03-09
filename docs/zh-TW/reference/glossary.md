# 詞彙表

| 術語                         | 定義                                                                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Agent Team**               | 由協作代理工作階段組成的持久群組，各自具有不同角色。一個成員是負責協調工作的領導者。透過 `team_create` 建立，透過生命週期檢查監控。                              |
| **A2UI**                     | Agent-to-UI 協定，用於從代理即時推送視覺內容到 Tide Pool 工作區。                                                                                              |
| **Background Session**       | 為自主任務（cron、觸發器）產生的工作階段，以全新的 PUBLIC taint 開始並在隔離的工作區中執行。                                                                    |
| **Buoy**                     | 伴侶原生應用程式（iOS、Android），為代理提供裝置功能，如相機、位置、螢幕錄製和推播通知。（即將推出。）                                                          |
| **Classification**           | 指派給資料、通道和收件者的敏感度標籤。四個等級：RESTRICTED、CONFIDENTIAL、INTERNAL、PUBLIC。                                                                    |
| **Cron**                     | 由代理在指定時間使用標準 cron 表達式語法執行的排程循環任務。                                                                                                    |
| **Dive**                     | 首次執行設定精靈（`triggerfish dive`），建構 `triggerfish.yaml`、SPINE.md 和初始配置。                                                                          |
| **Effective Classification** | 用於輸出決策的分類等級，計算為 `min(channel_classification, recipient_classification)`。                                                                        |
| **Exec Environment**         | 代理的程式碼工作區，用於在緊密的寫入-執行-修復回饋循環中撰寫、執行和除錯程式碼，與 Plugin Sandbox 不同。                                                        |
| **Failover**                 | 當目前提供者因速率限制、伺服器錯誤或逾時而不可用時，自動切換到備用 LLM 提供者。                                                                                |
| **Gateway**                  | 長時間執行的本地控制平面，透過 WebSocket JSON-RPC 端點管理工作階段、通道、工具、事件和代理程序。                                                                |
| **Hook**                     | 資料流中的確定性執行點，策略引擎在此評估規則並決定是否允許、封鎖或編輯操作。                                                                                    |
| **Lineage**                  | 來源中繼資料，追蹤 Triggerfish 處理的每個資料元素的起源、轉換和目前位置。                                                                                      |
| **LlmProvider**              | LLM 完成的介面，由每個支援的提供者（Anthropic、OpenAI、Google、Local、OpenRouter）實作。                                                                        |
| **MCP**                      | Model Context Protocol，代理-工具通訊的標準。Triggerfish 的 MCP Gateway 為任何 MCP 伺服器新增分類控制。                                                         |
| **No Write-Down**            | 固定的、不可配置的規則，資料只能流向等於或更高分類等級的通道或收件者。                                                                                          |
| **NotificationService**      | 統一的抽象，用於跨所有已連接通道交付擁有者通知，具有優先順序、佇列和去重複功能。                                                                                |
| **Patrol**                   | 診斷健康檢查命令（`triggerfish patrol`），驗證 gateway、LLM 提供者、通道和策略配置。                                                                            |
| **Reef (The)**               | 社群 skill 市場，用於探索、安裝、發布和管理 Triggerfish skill。                                                                                                 |
| **Ripple**                    | 在支援的通道間傳遞的即時打字指示器和上線狀態訊號。                                                                                                              |
| **Session**                  | 對話狀態的基本單位，具有獨立的 taint 追蹤。每個工作階段有唯一 ID、使用者、通道、taint 等級和歷史記錄。                                                          |
| **Skill**                    | 包含 `SKILL.md` 檔案和可選支援檔案的資料夾，無需撰寫 plugin 即可賦予代理新能力。                                                                                |
| **SPINE.md**                 | 代理身分和使命檔案，作為系統提示的基礎載入。定義個性、規則和邊界。Triggerfish 相當於 CLAUDE.md。                                                                 |
| **StorageProvider**          | 統一的持久化抽象（鍵值介面），所有有狀態資料都透過它流動。實作包括 Memory、SQLite 和企業後端。                                                                   |
| **Taint**                    | 根據工作階段存取的資料附加到工作階段的分類等級。Taint 在工作階段內只能提升，永遠不能降低。                                                                      |
| **Tide Pool**                | 代理驅動的視覺工作區，Triggerfish 使用 A2UI 協定在此渲染互動內容（儀表板、圖表、表單）。                                                                         |
| **TRIGGER.md**               | 代理的主動行為定義檔案，指定在週期性觸發器喚醒期間要檢查、監控和執行的內容。                                                                                    |
| **Webhook**                  | 入站 HTTP 端點，接受來自外部服務（GitHub、Sentry 等）的事件並觸發代理動作。                                                                                     |
| **Team Lead**                | 代理團隊中指定的協調者。接收團隊目標、分解工作、指派任務給成員，並決定團隊何時完成。                                                                             |
| **Workspace**                | 每個代理的檔案系統目錄，代理在此撰寫和執行自己的程式碼，與其他代理隔離。                                                                                        |
| **Write-Down**               | 禁止的資料從較高分類等級流向較低分類等級的行為（例如，CONFIDENTIAL 資料傳送到 PUBLIC 通道）。                                                                    |
