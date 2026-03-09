# 語音管線

<ComingSoon />

::: info 以下列出的 STT 和 TTS 供應商目前僅為介面存根。供應商介面已定義，但實作尚未連接到實際的語音服務。 :::

Triggerfish 支援語音互動，包括喚醒詞偵測、按鍵說話和跨 macOS、iOS 和 Android 的文字轉語音回應。

## 架構

<img src="/diagrams/voice-pipeline.svg" alt="語音管線：喚醒詞偵測 → STT → 代理處理 → TTS → 語音輸出" style="max-width: 100%;" />

音訊流經與文字相同的代理處理管線。語音輸入被轉錄、作為分類訊息進入工作階段、通過策略 hook，然後回應被合成回語音。

## 語音模式

| 模式         | 描述                                          | 平台                           |
| ------------ | --------------------------------------------- | ------------------------------ |
| 語音喚醒     | 始終監聽可配置的喚醒詞                        | macOS、iOS、Android            |
| 按鍵說話     | 透過按鈕或鍵盤快捷鍵手動啟動                  | macOS（選單列）、iOS、Android  |
| 對話模式     | 連續的對話式語音                              | 所有平台                       |

## STT 供應商

語音轉文字將您的語音轉換為文字供代理處理。

| 供應商             | 類型 | 備註                                                            |
| ------------------ | ---- | --------------------------------------------------------------- |
| Whisper            | 本機 | 預設。在裝置上執行，無雲端依賴。最適合隱私保護。                |
| Deepgram           | 雲端 | 低延遲串流轉錄。                                                |
| OpenAI Whisper API | 雲端 | 高準確度，需要 API 金鑰。                                       |

## TTS 供應商

文字轉語音將代理回應轉換為語音音訊。

| 供應商        | 類型 | 備註                                                         |
| ------------- | ---- | ------------------------------------------------------------ |
| ElevenLabs    | 雲端 | 預設。自然的語音，具有語音複製選項。                         |
| OpenAI TTS    | 雲端 | 高品質，多種語音選項。                                       |
| 系統語音      | 本機 | 作業系統原生語音。無雲端依賴。                               |

## 供應商登錄

Triggerfish 對 STT 和 TTS 都使用供應商登錄模式。您可以透過實作對應的介面接入任何相容的供應商：

```typescript
interface SttProvider {
  transcribe(audio: Uint8Array, options?: SttOptions): Promise<string>;
}

interface TtsProvider {
  synthesize(text: string, options?: TtsOptions): Promise<Uint8Array>;
}
```

## 配置

在 `triggerfish.yaml` 中配置語音設定：

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper 模型大小（tiny、base、small、medium、large）
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice" # 供應商特定的語音識別碼
  wake_word: "triggerfish" # 自訂喚醒詞
  push_to_talk:
    shortcut: "Ctrl+Space" # 鍵盤快捷鍵（macOS）
```

## 安全整合

語音資料遵循與文字相同的分類規則：

- **語音輸入的分類與文字輸入相同。** 轉錄的語音進入工作階段，可能像輸入的訊息一樣提升 taint。
- **TTS 輸出在合成前通過 PRE_OUTPUT hook。** 如果策略引擎封鎖回應，它永遠不會被說出。
- **語音工作階段攜帶 taint**，與文字工作階段相同。工作階段中途切換到語音不會重設 taint。
- **喚醒詞偵測在本機執行。** 沒有音訊被傳送到雲端進行喚醒詞匹配。
- **音訊錄製**（如果保留）以工作階段擷取時的 taint 等級分類。

::: info 語音管線將與 iOS 和 Android 上的 Buoy 配套應用程式整合，啟用行動裝置的按鍵說話和語音喚醒。Buoy 尚未推出。 :::
