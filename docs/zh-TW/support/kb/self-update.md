# KB：自我更新流程

`triggerfish update` 如何運作、可能出什麼問題，以及如何恢復。

## 如何運作

更新命令從 GitHub 下載並安裝最新版本：

1. **版本檢查。** 從 GitHub API 擷取最新的發行標籤。如果您已在最新版本，提前退出：
   ```
   Already up to date (v0.4.2)
   ```
   開發建構（`VERSION=dev`）跳過版本檢查並始終繼續。

2. **平台偵測。** 根據您的作業系統和架構（linux-x64、linux-arm64、macos-x64、macos-arm64、windows-x64）決定正確的二進位資產名稱。

3. **下載。** 從 GitHub 發行中擷取二進位檔和 `SHA256SUMS.txt`。

4. **校驗和驗證。** 計算下載的二進位檔的 SHA256 並與 `SHA256SUMS.txt` 中的條目比較。如果校驗和不匹配，更新將中止。

5. **Daemon 停止。** 在替換二進位檔之前停止執行中的 daemon。

6. **二進位檔替換。** 平台特定：
   - **Linux/macOS：** 重新命名舊二進位檔，將新的移到位置
   - **macOS 額外步驟：** 使用 `xattr -cr` 清除隔離屬性
   - **Windows：** 將舊二進位檔重新命名為 `.old`（Windows 無法覆寫執行中的可執行檔），然後將新二進位檔複製到原始路徑

7. **Daemon 重啟。** 使用新的二進位檔啟動 daemon。

8. **變更日誌。** 擷取並顯示新版本的發行說明。

## Sudo 權限提升

如果二進位檔安裝在需要 root 存取的目錄中（例如 `/usr/local/bin`），更新程式會提示您輸入密碼以使用 `sudo` 提升權限。

## 跨檔案系統移動

如果下載目錄和安裝目錄在不同的檔案系統上（常見的情況是 `/tmp` 在單獨的分區上），原子重新命名會失敗。更新程式退回到複製後移除，這是安全的但短暫地會有兩個二進位檔在磁碟上。

## 可能出什麼問題

### 「Checksum verification exception」

下載的二進位檔與預期的雜湊不匹配。這通常表示：
- 下載被損壞（網路問題）
- 發行資產過時或部分上傳

**修復：** 等幾分鐘然後重試。如果持續出現，從[發行頁面](https://github.com/greghavens/triggerfish/releases)手動下載二進位檔。

### 「Asset not found in SHA256SUMS.txt」

發行版發布時沒有您平台的校驗和。這是發行管線的問題。

**修復：** 提交一個 [GitHub issue](https://github.com/greghavens/triggerfish/issues)。

### 「Binary replacement failed」

更新程式無法用新的替換舊的二進位檔。常見原因：
- 檔案權限（二進位檔由 root 擁有但您以一般使用者執行）
- 檔案被鎖定（Windows：另一個程序開啟了二進位檔）
- 唯讀檔案系統

**修復：**
1. 手動停止 daemon：`triggerfish stop`
2. 終止任何殘留程序
3. 使用適當的權限重試更新

### 「Checksum file download failed」

無法從 GitHub 發行下載 `SHA256SUMS.txt`。檢查您的網路連接並重試。

### Windows `.old` 檔案清理

Windows 更新後，舊的二進位檔被重新命名為 `triggerfish.exe.old`。此檔案在下次啟動時自動清理。如果未被清理（例如新的二進位檔在啟動時崩潰），您可以手動刪除它。

## 版本比較

更新程式使用語意版本比較：
- 去除前導的 `v` 前綴（`v0.4.2` 和 `0.4.2` 都接受）
- 以數字方式比較主版號、次版號和修訂版號
- 處理預發行版本（例如 `v0.4.2-rc.1`）

## 手動更新

如果自動更新程式不起作用：

1. 從 [GitHub Releases](https://github.com/greghavens/triggerfish/releases) 下載您平台的二進位檔
2. 停止 daemon：`triggerfish stop`
3. 替換二進位檔：
   ```bash
   # Linux/macOS
   sudo cp triggerfish-linux-x64 /usr/local/bin/triggerfish
   sudo chmod +x /usr/local/bin/triggerfish

   # macOS: clear quarantine
   xattr -cr /usr/local/bin/triggerfish
   ```
4. 啟動 daemon：`triggerfish start`

## Docker 更新

Docker 部署不使用二進位更新程式。更新容器映像：

```bash
# 使用包裝腳本
triggerfish update

# 手動
docker compose pull
docker compose up -d
```

包裝腳本拉取最新映像，如果有正在執行的容器則重啟。

## 變更日誌

更新後，發行說明會自動顯示。您也可以手動查看：

```bash
triggerfish changelog              # 目前版本
triggerfish changelog --latest 5   # 最近 5 個版本
```

如果更新後變更日誌擷取失敗，它會被記錄但不影響更新本身。
