# 平台说明

各平台特定的行为、要求和注意事项。

## macOS

### 服务管理器：launchd

Triggerfish 注册为 launchd agent：
```
~/Library/LaunchAgents/dev.triggerfish.agent.plist
```

Plist 设置了 `RunAtLoad: true` 和 `KeepAlive: true`，因此守护进程在登录时启动，崩溃后自动重启。

### PATH 捕获

launchd plist 在安装时捕获您的 Shell PATH。这一点很关键，因为 launchd 不会加载您的 Shell 配置文件。如果在安装守护进程后安装了 MCP 服务器依赖（如 `npx`、`python`），这些二进制文件将不在守护进程的 PATH 中。

**修复方法：** 重新安装守护进程以更新捕获的 PATH：

```bash
triggerfish stop
triggerfish dive --install-daemon
```

### 隔离

macOS 对下载的二进制文件应用隔离标志。安装程序使用 `xattr -cr` 清除此标志，但如果您手动下载了二进制文件：

```bash
xattr -cr /usr/local/bin/triggerfish
```

### 密钥链

密钥通过 `security` CLI 存储在 macOS 登录密钥链中。如果 Keychain Access 被锁定，密钥操作将失败，直到您解锁它（通常通过登录）。

### Homebrew Deno

如果从源码构建且 Deno 是通过 Homebrew 安装的，请确保在运行安装脚本之前 Homebrew bin 目录在您的 PATH 中。

---

## Linux

### 服务管理器：systemd（用户模式）

守护进程作为 systemd 用户服务运行：
```
~/.config/systemd/user/triggerfish.service
```

### Linger

默认情况下，systemd 用户服务在用户注销后停止。Triggerfish 在安装时启用 linger：

```bash
loginctl enable-linger $USER
```

如果此操作失败（例如系统管理员禁用了它），守护进程仅在您登录时运行。在需要守护进程持久运行的服务器上，请让管理员为您的账户启用 linger。

### PATH 和环境

systemd 单元捕获您的 PATH 并设置 `DENO_DIR=~/.cache/deno`。与 macOS 类似，安装后对 PATH 的更改需要重新安装守护进程。

单元还显式设置 `Environment=PATH=...`。如果守护进程找不到 MCP 服务器二进制文件，这是最可能的原因。

### Fedora Atomic / Silverblue / Bazzite

Fedora Atomic 桌面将 `/home` 符号链接到 `/var/home`。Triggerfish 在解析主目录时会自动处理这一点，跟随符号链接查找实际路径。

Flatpak 安装的浏览器会通过调用 `flatpak run` 的包装脚本来检测和启动。

### 无头服务器

在没有桌面环境的服务器上，GNOME Keyring / Secret Service 守护进程可能未运行。有关设置说明，请参阅[密钥故障排除](/zh-CN/support/troubleshooting/secrets)。

### SQLite FFI

SQLite 存储后端使用 `@db/sqlite`，通过 FFI 加载原生库。这需要 `--allow-ffi` Deno 权限（已包含在编译后的二进制文件中）。在某些最小化 Linux 发行版上，共享 C 库或相关依赖可能缺失。如果看到 FFI 相关错误，请安装基础开发库。

---

## Windows

### 服务管理器：Windows Service

Triggerfish 作为名为"Triggerfish"的 Windows 服务安装。该服务由安装过程中使用 .NET Framework 4.x 的 `csc.exe` 编译的 C# 包装器实现。

**要求：**
- .NET Framework 4.x（大多数 Windows 10/11 系统已安装）
- 服务安装需要管理员权限
- `csc.exe` 在 .NET Framework 目录中可访问

### 更新期间的二进制替换

Windows 不允许覆盖正在运行的可执行文件。更新器：

1. 将运行中的二进制文件重命名为 `triggerfish.exe.old`
2. 将新二进制文件复制到原始路径
3. 重启服务
4. 下次启动时清理 `.old` 文件

如果重命名或复制失败，请在更新前手动停止服务。

### ANSI 颜色支持

Triggerfish 启用虚拟终端处理以支持彩色控制台输出。在现代 PowerShell 和 Windows Terminal 中可正常工作。旧版 `cmd.exe` 窗口可能无法正确渲染颜色。

### 独占文件锁定

Windows 使用独占文件锁。如果守护进程正在运行而您尝试启动另一个实例，日志文件锁会阻止它：

```
Triggerfish is already running. Stop the existing instance first, or use 'triggerfish status' to check.
```

此检测是 Windows 特有的，基于打开日志文件时的 EBUSY / "os error 32"。

### 密钥存储

Windows 使用加密文件存储（AES-256-GCM），位于 `~/.triggerfish/secrets.json`。没有 Windows Credential Manager 集成。请将 `secrets.key` 文件视为敏感数据。

### PowerShell 安装程序说明

PowerShell 安装程序（`install.ps1`）：
- 检测处理器架构（x64/arm64）
- 安装到 `%LOCALAPPDATA%\Triggerfish`
- 通过注册表将安装目录添加到用户 PATH
- 编译 C# 服务包装器
- 注册并启动 Windows Service

如果安装程序在服务编译步骤失败，您仍可手动运行 Triggerfish：

```powershell
triggerfish run    # 前台模式
```

---

## Docker

### 容器运行时

Docker 部署同时支持 Docker 和 Podman。检测是自动的，或显式设置：

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman
```

### 镜像详情

- 基础镜像：`gcr.io/distroless/cc-debian12`（最小化，无 Shell）
- 调试变体：`distroless:debug`（包含 Shell 用于故障排除）
- 以 UID 65534（nonroot）运行
- Init：`true`（通过 `tini` 进行 PID 1 信号转发）
- 重启策略：`unless-stopped`

### 数据持久化

所有持久化数据在容器内的 `/data` 目录中，由 Docker 命名卷支持：

```
/data/
  triggerfish.yaml        # 配置
  secrets.json            # 加密的密钥
  secrets.key             # 加密密钥
  SPINE.md                # Agent 身份
  TRIGGER.md              # 触发器行为
  data/triggerfish.db     # SQLite 数据库
  logs/                   # 日志文件
  skills/                 # 已安装的技能
  workspace/              # Agent 工作区
  .deno/                  # Deno FFI 插件缓存
```

### 环境变量

| 变量 | 默认值 | 用途 |
|------|--------|------|
| `TRIGGERFISH_DATA_DIR` | `/data` | 基础数据目录 |
| `TRIGGERFISH_CONFIG` | `/data/triggerfish.yaml` | 配置文件路径 |
| `TRIGGERFISH_DOCKER` | `true` | 启用 Docker 特定行为 |
| `DENO_DIR` | `/data/.deno` | Deno 缓存（FFI 插件） |
| `HOME` | `/data` | nonroot 用户的主目录 |

### Docker 中的密钥

Docker 容器无法访问宿主机操作系统的密钥链。加密文件存储会自动使用。加密密钥（`secrets.key`）和加密数据（`secrets.json`）存储在 `/data` 卷中。

**安全注意：** 任何能访问 Docker 卷的人都可以读取加密密钥。请妥善保护该卷。在生产环境中，考虑使用 Docker secrets 或密钥管理服务在运行时注入密钥。

### 端口

Compose 文件映射：
- `18789` - Gateway WebSocket
- `18790` - Tidepool A2UI

如果启用了 WebChat（8765）或 WhatsApp Webhook（8443），需要将额外端口添加到 Compose 文件中。

### 在 Docker 中运行安装向导

```bash
# 如果容器正在运行
docker exec -it triggerfish triggerfish dive

# 如果容器未运行（一次性执行）
docker run -it -v triggerfish-data:/data ghcr.io/greghavens/triggerfish:latest dive
```

### 更新

```bash
# 使用包装脚本
triggerfish update

# 手动
docker compose pull
docker compose up -d
```

### 调试

使用镜像的调试变体进行故障排除：

```yaml
# 在 docker-compose.yml 中
image: ghcr.io/greghavens/triggerfish:debug
```

这包含一个 Shell，您可以 exec 进入容器：

```bash
docker exec -it triggerfish /busybox/sh
```

---

## Flatpak（仅浏览器）

Triggerfish 本身不作为 Flatpak 运行，但可以使用 Flatpak 安装的浏览器进行浏览器自动化。

### 检测到的 Flatpak 浏览器

- `com.google.Chrome`
- `org.chromium.Chromium`
- `com.brave.Browser`

### 工作原理

Triggerfish 创建一个临时包装脚本，使用无头模式标志调用 `flatpak run`，然后通过该脚本启动 Chrome。包装器写入临时目录。

### 常见问题

- **Flatpak 未安装。** 二进制文件必须位于 `/usr/bin/flatpak` 或 `/usr/local/bin/flatpak`。
- **临时目录不可写。** 包装脚本需要在执行前写入磁盘。
- **Flatpak 沙盒冲突。** 某些 Flatpak Chrome 构建限制了 `--remote-debugging-port`。如果 CDP 连接失败，请尝试使用非 Flatpak 的 Chrome 安装。
