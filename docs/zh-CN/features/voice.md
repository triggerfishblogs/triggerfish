# 语音管线

<ComingSoon />

::: info 下面列出的 STT 和 TTS 提供商是仅接口的存根。提供商接口已定义，但实现尚未连接到实际语音服务。 :::

Triggerfish 支持语音交互，包括唤醒词检测、按键说话和文本转语音响应，跨 macOS、iOS 和 Android。

## 架构

<img src="/diagrams/voice-pipeline.svg" alt="语音管线：唤醒词检测 → STT → 智能体处理 → TTS → 语音输出" style="max-width: 100%;" />

音频通过与文本相同的智能体处理管线流转。语音输入被转录，作为分类消息进入会话，通过策略 hook，响应被合成回语音。

## STT 提供商

语音转文本将你的声音转换为文本供智能体处理。

| 提供商 | 类型 | 备注 |
| ------------------ | ----- | --------------------------------------------------------------- |
| Whisper | 本地 | 默认。在设备上运行，无云依赖。最佳隐私。 |
| Deepgram | 云 | 低延迟流式转录。 |
| OpenAI Whisper API | 云 | 高准确度，需要 API 密钥。 |

## TTS 提供商

文本转语音将智能体响应转换为语音音频。

| 提供商 | 类型 | 备注 |
| ------------- | ----- | ------------------------------------------------------------ |
| ElevenLabs | 云 | 默认。自然的声音，带声音克隆选项。 |
| OpenAI TTS | 云 | 高质量，多种声音选项。 |
| 系统声音 | 本地 | 操作系统原生声音。无云依赖。 |

## 配置

在 `triggerfish.yaml` 中配置语音设置：

```yaml
voice:
  stt:
    provider: whisper # whisper | deepgram | openai
    model: base # Whisper 模型大小（tiny、base、small、medium、large）
  tts:
    provider: elevenlabs # elevenlabs | openai | system
    voice_id: "your-voice" # 提供商特定的声音标识符
  wake_word: "triggerfish" # 自定义唤醒词
  push_to_talk:
    shortcut: "Ctrl+Space" # 键盘快捷键（macOS）
```

## 安全集成

语音数据遵循与文本相同的分类规则：

- **语音输入与文本输入分类相同。** 转录的语音进入会话，可能像输入的消息一样升级 taint。
- **TTS 输出通过 PRE_OUTPUT hook** 后才合成。如果策略引擎阻止响应，它永远不会被朗读。
- **语音会话携带 taint** 就像文本会话一样。在会话中切换到语音不会重置 taint。
- **唤醒词检测在本地运行。** 没有音频被发送到云进行唤醒词匹配。

::: info 语音管线将与 iOS 和 Android 上的 Buoy 配套应用集成，支持从移动设备的按键说话和语音唤醒。Buoy 尚不可用。 :::
