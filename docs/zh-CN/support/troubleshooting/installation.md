# 故障排除：安装

## 二进制安装程序问题

### 校验和验证失败

安装程序会在下载二进制文件的同时下载 `SHA256SUMS.txt` 文件，并在安装前验证哈希值。如果验证失败：

- **网络中断了下载。** 删除部分下载的文件后重试。
- **镜像或 CDN 提供了过时的内容。** 等几分钟后重试。安装程序从 GitHub Releases 获取文件。
- **在 SHA256SUMS.txt 中未找到资源。** 这意味着发布时没有包含您所在平台的校验和。请提交 [GitHub Issue](https://github.com/greghavens/triggerfish/issues)。

安装程序在 Linux 上使用 `sha256sum`，在 macOS 上使用 `shasum -a 256`。如果两者都不可用，则无法验证下载。

### 写入 `/usr/local/bin` 权限被拒绝

安装程序首先尝试 `/usr/local/bin`，然后回退到 `~/.local/bin`。如果两者都不行：

```bash
# 选项 1：使用 sudo 进行系统级安装
sudo bash -c "$(curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh)"

# 选项 2：创建 ~/.local/bin 并添加到 PATH
mkdir -p ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"
# 然后重新运行安装程序
```

### macOS 隔离警告

macOS 会阻止从互联网下载的二进制文件。安装程序会运行 `xattr -cr` 清除隔离属性，但如果您手动下载了二进制文件，请运行：

```bash
xattr -cr /usr/local/bin/triggerfish
```

或者在 Finder 中右键点击二进制文件，选择"打开"，然后确认安全提示。

### 安装后 PATH 未更新

安装程序会将安装目录添加到您的 Shell 配置文件（`.zshrc`、`.bashrc` 或 `.bash_profile`）。如果安装后找不到 `triggerfish` 命令：

1. 打开新的终端窗口（当前 Shell 不会自动加载配置文件更改）
2. 或手动加载配置文件：`source ~/.zshrc`（或您的 Shell 使用的配置文件）

如果安装程序跳过了 PATH 更新，说明安装目录已在您的 PATH 中。

---

## 从源码构建

### Deno 未找到

从源码安装的脚本（`deploy/scripts/install-from-source.sh`）会在 Deno 不存在时自动安装。如果安装失败：

```bash
# 手动安装 Deno
curl -fsSL https://deno.land/install.sh | sh

# 验证
deno --version   # 应为 2.x
```

### 编译时出现权限错误

`deno compile` 命令需要 `--allow-all`，因为编译后的二进制文件需要完整的系统访问权限（网络、文件系统、SQLite 的 FFI、子进程创建）。如果在编译过程中看到权限错误，请确保您以具有目标目录写入权限的用户身份运行安装脚本。

### 指定分支或版本

设置 `TRIGGERFISH_BRANCH` 以克隆特定分支：

```bash
TRIGGERFISH_BRANCH=feat/my-feature bash deploy/scripts/install-from-source.sh
```

对于二进制安装程序，设置 `TRIGGERFISH_VERSION`：

```bash
TRIGGERFISH_VERSION=v0.4.0 bash scripts/install.sh
```

---

## Windows 特定问题

### PowerShell 执行策略阻止安装程序

以管理员身份运行 PowerShell 并允许脚本执行：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

然后重新运行安装程序。

### Windows 服务编译失败

Windows 安装程序使用 .NET Framework 4.x 的 `csc.exe` 即时编译 C# 服务包装器。如果编译失败：

1. **验证 .NET Framework 是否已安装。** 在命令提示符中运行 `where csc.exe`。安装程序在 `%WINDIR%\Microsoft.NET\Framework64\` 下的 .NET Framework 目录中查找。
2. **以管理员身份运行。** 服务安装需要提升权限。
3. **备选方案。** 如果服务编译失败，您仍可手动运行 Triggerfish：`triggerfish run`（前台模式）。需要保持终端打开。

### 升级时 `Move-Item` 失败

旧版本的 Windows 安装程序使用 `Move-Item -Force`，当目标二进制文件正在使用时会失败。此问题已在 0.3.4+ 版本中修复。如果在旧版本上遇到此问题，请先手动停止服务：

```powershell
Stop-Service Triggerfish
# 然后重新运行安装程序
```

---

## Docker 问题

### 容器立即退出

检查容器日志：

```bash
docker logs triggerfish
```

常见原因：

- **缺少配置文件。** 将 `triggerfish.yaml` 挂载到 `/data/`：
  ```bash
  docker run -v ./triggerfish.yaml:/data/triggerfish.yaml ...
  ```
- **端口冲突。** 如果端口 18789 或 18790 被占用，Gateway 无法启动。
- **卷权限被拒绝。** 容器以 UID 65534（nonroot）运行。确保该用户可写入卷。

### 无法从宿主机访问 Triggerfish

Gateway 默认在容器内绑定到 `127.0.0.1`。要从宿主机访问，Docker compose 文件映射端口 `18789` 和 `18790`。如果直接使用 `docker run`，请添加：

```bash
-p 18789:18789 -p 18790:18790
```

### 使用 Podman 代替 Docker

Docker 安装脚本会自动检测 `podman` 作为容器运行时。您也可以显式设置：

```bash
TRIGGERFISH_CONTAINER_RUNTIME=podman bash deploy/docker/install.sh
```

Docker 安装程序安装的 `triggerfish` 包装脚本也会自动检测 podman。

### 自定义镜像或注册表

使用 `TRIGGERFISH_IMAGE` 覆盖镜像：

```bash
TRIGGERFISH_IMAGE=my-registry.example.com/triggerfish:custom docker compose up -d
```

---

## 安装后

### 安装向导未启动

二进制安装后，安装程序运行 `triggerfish dive --install-daemon` 以启动安装向导。如果未启动：

1. 手动运行：`triggerfish dive`
2. 如果看到"Terminal requirement not met"，表示向导需要交互式 TTY。SSH 会话、CI 流水线和管道输入将无法使用。请改为手动配置 `triggerfish.yaml`。

### Signal 通道自动安装失败

Signal 需要 `signal-cli`，这是一个 Java 应用程序。自动安装程序会下载预编译的 `signal-cli` 二进制文件和 JRE 25 运行时。失败可能的原因：

- **安装目录无写入权限。** 检查 `~/.triggerfish/signal-cli/` 的权限。
- **JRE 下载失败。** 安装程序从 Adoptium 获取。网络限制或企业代理可能阻止此操作。
- **架构不支持。** JRE 自动安装仅支持 x64 和 aarch64。

如果自动安装失败，请手动安装 `signal-cli` 并确保它在您的 PATH 中。有关手动设置步骤，请参阅 [Signal 通道文档](/channels/signal)。
