# Google Chat

<ComingSoon />

將您的 Triggerfish 代理連接到 Google Chat，讓使用 Google Workspace 的團隊可以直接從聊天介面與它互動。轉接器將使用 Google Chat API 搭配服務帳號或 OAuth 憑證。

## 計畫中的功能

- 私訊和空間（聊天室）支援
- 透過 Google Workspace 目錄進行擁有者驗證
- 輸入指示器
- 長回應的訊息分塊
- 與其他頻道一致的分類執行

## 設定（計畫中）

```yaml
channels:
  google-chat:
    classification: INTERNAL
```

請參閱 [Google Workspace](/zh-TW/integrations/google-workspace) 了解現有的 Google 整合，涵蓋 Gmail、Calendar、Tasks、Drive 和 Sheets。
