# 知识库：自更新流程

`triggerfish update` 的工作原理、可能出现的问题以及如何恢复。

## 工作原理

更新命令从 GitHub 下载并安装最新版本：

1. **版本检查。** 从 GitHub API 获取最新的发布标签。如果已是最新版本，提前退出：
   ```
   Already up to date (v0.4.2)
   ```
   开发构建（`VERSION=dev`）跳过版本检查并始终继续。

2. **平台检测。** 根据操作系统和架构确定正确的二进制资源名称（linux-x64、linux-arm64、macos-x64、macos-arm64、windows-x64）。

3. **下载。** 从 GitHub release 获取二进制文件和 `SHA256SUMS.txt`。

4. **校验和验证。** 计算下载的二进制文件的 SHA256 并与 `SHA256SUMS.txt` 中的条目比较。如果校验和不匹配，更新将被中止。

5. **停止守护进程。** 在替换二进制文件之前停止运行中的守护进程。

6. **二进制替换。** 因平台而异：
   - **Linux/macOS：** 重命名旧二进制文件，将新文件移到位
   - **macOS 额外步骤：** 使用 `xattr -cr` 清除隔离属性
   - **Windows：** 将旧二进制文件重命名为 `.old`（Windows 无法覆盖正在运行的可执行文件），然后将新二进制文件复制到原始路径

7. **重启守护进程。** 使用新二进制文件启动守护进程。

8. **更新日志。** 获取并显示新版本的发行说明。

## Sudo 权限提升

如果二进制文件安装在需要 root 权限的目录（如 `/usr/local/bin`），更新器会提示输入密码以使用 `sudo` 提升权限。

## 跨文件系统移动

如果下载目录和安装目录在不同的文件系统上（常见于 `/tmp` 在独立分区上），原子重命名将失败。更新器回退到复制后删除，这是安全的但会短暂地在磁盘上同时存在两个二进制文件。

## 可能出现的问题

### "Checksum verification exception"

下载的二进制文件与预期的哈希不匹配。通常意味着：
- 下载损坏（网络问题）
- 发布资源过时或部分上传

**修复方法：** 等几分钟后重试。如果问题持续，从[发布页面](https://github.com/greghavens/triggerfish/releases)手动下载二进制文件。

### "Asset not found in SHA256SUMS.txt"

发布时没有包含您所在平台的校验和。这是发布流水线的问题。

**修复方法：** 提交 [GitHub Issue](https://github.com/greghavens/triggerfish/issues)。

### "Binary replacement failed"

更新器无法将旧二进制文件替换为新的。常见原因：
- 文件权限（二进制文件属于 root 但您以普通用户运行）
- 文件被锁定（Windows：另一个进程打开了二进制文件）
- 只读文件系统

**修复方法：**
1. 手动停止守护进程：`triggerfish stop`
2. 终止所有过期进程
3. 使用适当的权限重试更新

### "Checksum file download failed"

无法从 GitHub release 下载 `SHA256SUMS.txt`。检查您的网络连接并重试。

### Windows `.old` 文件清理

Windows 更新后，旧二进制文件被重命名为 `triggerfish.exe.old`。此文件在下次启动时自动清理。如果未被清理（例如新二进制文件在启动时崩溃），您可以手动删除它。

## 版本比较

更新器使用语义版本比较：
- 去除前导 `v` 前缀（`v0.4.2` 和 `0.4.2` 都被接受）
- 按数值比较主版本号、次版本号和修订号
- 处理预发布版本（如 `v0.4.2-rc.1`）

## 手动更新

如果自动更新器不工作：

1. 从 [GitHub Releases](https://github.com/greghavens/triggerfish/releases) 下载适合您平台的二进制文件
2. 停止守护进程：`triggerfish stop`
3. 替换二进制文件：
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS：清除隔离
   xattr -cr /usr/local/bin/triggerfish
   ```
4. 启动守护进程：`triggerfish start`

## Docker 更新

Docker 部署不使用二进制更新器。更新容器镜像：

```bash
# 使用包装脚本
triggerfish update

# 手动
docker compose pull
docker compose up -d
```

包装脚本拉取最新镜像，如果有正在运行的容器则重启。

## 更新日志

更新后，发行说明会自动显示。您也可以手动查看：

```bash
triggerfish changelog              # 当前版本
triggerfish changelog --latest 5   # 最近 5 个版本
```

如果更新后更新日志获取失败，会被记录但不影响更新本身。
