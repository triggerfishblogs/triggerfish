<p align="center">
  <img src="https://img.shields.io/badge/🐠_Triggerfish-AI_Agent_Platform-0077B6?style=for-the-badge&labelColor=023E8A" alt="Triggerfish" />
</p>

<h1 align="center">🐠 Triggerfish</h1>

<p align="center">
  <strong>A secure, multi-channel AI agent platform with deterministic policy enforcement below the LLM layer.</strong>
</p>

<p align="center">
  Your data stays classified. Your policies stay enforced. No exceptions.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="MIT License" />
  <img src="https://img.shields.io/badge/Runtime-Deno_2.x-000000?style=for-the-badge&logo=deno&logoColor=white" alt="Deno" />
  <img src="https://img.shields.io/badge/LLM-Claude_%7C_GPT_%7C_Gemini-8A2BE2?style=for-the-badge" alt="LLMs" />
</p>

---

## 🌊 Quick Install

One command. That's it.

```bash
curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
```

This will:
1. Install the runtime if not already present
2. Clone and compile Triggerfish
3. Run the setup wizard (`dive`)
4. Install and start the background daemon

**Windows:**
```powershell
irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex
```

---

## 🐚 Commands

| Command | Description |
|---------|-------------|
| `triggerfish dive` | 🤿 First-run setup wizard |
| `triggerfish run` | 🏄 Run gateway in foreground |
| `triggerfish start` | 🚀 Install and start the daemon |
| `triggerfish stop` | 🛑 Stop the daemon |
| `triggerfish status` | 📡 Check if the daemon is running |
| `triggerfish logs` | 📜 View daemon logs (`--tail` to follow) |
| `triggerfish patrol` | 🔍 Run health diagnostics |
| `triggerfish version` | 🏷️ Show version |

---

## 🏗️ How It Works

```
                          🪸 The Reef
                       (Skill Marketplace)
                              |
   Telegram  Slack  Discord  WhatsApp  WebChat  Email  CLI
      |        |       |        |         |       |     |
      +--------+-------+--------+---------+-------+-----+
                              |
                        Channel Router
                     (classification gate)
                              |
                        Gateway Server
                     (WebSocket control plane)
                              |
                  +-----------+-----------+
                  |                       |
            Policy Engine            Agent Loop
           (deterministic)          (LLM provider)
                  |                       |
            +-----+-----+          +-----+-----+
            |     |     |          |     |     |
          Hooks Taint  Audit    Claude  GPT  Gemini
                Track   Log    OAuth   API   API
```

---

## 🔒 Security Model

Triggerfish enforces security **below** the LLM layer. The AI cannot bypass, modify, or influence policy decisions.

| Principle | How It Works |
|-----------|-------------|
| 🏷️ **Classification** | Every piece of data carries a sensitivity label: `PUBLIC`, `INTERNAL`, `CONFIDENTIAL`, or `RESTRICTED` |
| 🎨 **Taint Propagation** | Sessions absorb the classification of data they touch. Taint only escalates, never decreases |
| 🚫 **No Write-Down** | `CONFIDENTIAL` data can never flow to a `PUBLIC` channel. The policy engine blocks it before the LLM sees it |
| ⚙️ **Deterministic Hooks** | Policy decisions are pure functions. No LLM calls, no randomness. Same input → same decision |
| 📋 **Audit Trail** | Every policy decision is logged with full context: timestamp, hook, session, input, result |

---

## 💬 Channels

Triggerfish connects to your existing messaging platforms. Each channel has its own classification level and owner settings.

| Channel | Default Classification |
|---------|:---------------------:|
| 💻 CLI | `INTERNAL` |
| ✈️ Telegram | `INTERNAL` |
| 💼 Slack | `PUBLIC` |
| 🎮 Discord | `PUBLIC` |
| 📱 WhatsApp | `PUBLIC` |
| 🌐 WebChat | `PUBLIC` |
| 📧 Email | `PUBLIC` |

> **Note:** All classifications are configurable. Set any channel to any level in your `triggerfish.yaml`.

---

## ⚙️ Configuration

After running `triggerfish dive`, your config lives at `~/.triggerfish/triggerfish.yaml`:

```yaml
models:
  primary: claude-sonnet-4-5
  providers:
    anthropic:
      model: claude-sonnet-4-5

channels:
  telegram:
    botToken: "your-bot-token"
    ownerId: 123456789
  slack:
    botToken: "xoxb-..."
    appToken: "xapp-..."
    signingSecret: "..."
  discord:
    botToken: "your-discord-bot-token"
    ownerId: "your-discord-user-id"

classification:
  mode: personal
```

---

## 🧠 LLM Providers

Switch between providers or configure failover chains.

| Provider | Auth | Models |
|----------|------|--------|
| 🟠 **Anthropic** | OAuth token (Claude Pro/Max) or API key | Claude Opus, Sonnet, Haiku |
| 🟢 **OpenAI** | API key | GPT-4o, o1, o3 |
| 🔵 **Google** | API key | Gemini Pro, Flash |
| 🏠 **Local** | None (OpenAI-compatible) | Llama, Mistral, etc. via Ollama |
| 🌐 **OpenRouter** | API key | Any model on OpenRouter |

> **💡 Tip:** If you have a Claude Pro or Max subscription, Triggerfish uses your existing `CLAUDE_CODE_OAUTH_TOKEN` — no separate API key needed.

---

## 🐠 Key Concepts

| Concept | Description |
|---------|-------------|
| 🦴 **SPINE.md** | Agent identity and mission file — your system prompt foundation |
| 🤿 **Dive** | First-run setup wizard that creates your `triggerfish.yaml` |
| 🔍 **Patrol** | Health check — verifies gateway, LLM, channels, and policies |
| 🌊 **Ripple** | Typing indicators and online status signals |
| 🎯 **Skill** | A folder with `SKILL.md` that gives the agent new capabilities |
| ⏰ **Trigger** | Periodic agent wakeup for proactive autonomous behavior |
| 🏖️ **Tide Pool** | Visual workspace rendered via Agent-to-UI protocol |
| 🪸 **The Reef** | Skill marketplace for discovering, installing, and publishing skills *(coming soon)* |
| 🛟 **Buoy** | Companion app providing device capabilities (camera, location, etc.) *(coming soon)* |

---

## 📄 License

MIT

---

<p align="center">
  <sub>🐠 Secured by design. Powered by the ocean. 🌊</sub>
</p>
