# Triggerfish Uninstall Script for Windows
#
# Stops the daemon, removes the binary, source, config, and logs.
# Usage: powershell ~/.triggerfish/src/scripts/uninstall.ps1
#   or:  irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.ps1 | iex

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "  Triggerfish Uninstaller" -ForegroundColor Cyan
Write-Host "  ======================"
Write-Host ""

# --- Step 1: Stop the daemon ---

$tf = Get-Command triggerfish -ErrorAction SilentlyContinue
if ($tf) {
    Write-Host "Stopping daemon..."
    try { & triggerfish stop 2>$null } catch {}
    Write-Host "[ok] Daemon stopped" -ForegroundColor Green
}

# --- Step 2: Remove scheduled task (if any) ---

try {
    $task = Get-ScheduledTask -TaskName "Triggerfish" -ErrorAction SilentlyContinue
    if ($task) {
        Write-Host "Removing scheduled task..."
        Unregister-ScheduledTask -TaskName "Triggerfish" -Confirm:$false
        Write-Host "[ok] Scheduled task removed" -ForegroundColor Green
    }
} catch {}

# --- Step 3: Remove binary ---

$InstallDir = Join-Path $env:LOCALAPPDATA "Triggerfish"
$InstallPath = Join-Path $InstallDir "triggerfish.exe"

if (Test-Path $InstallPath) {
    Write-Host "Removing binary..."
    Remove-Item $InstallPath -Force
    Write-Host "[ok] Binary removed" -ForegroundColor Green
}

# Remove install directory if empty
if ((Test-Path $InstallDir) -and ((Get-ChildItem $InstallDir | Measure-Object).Count -eq 0)) {
    Remove-Item $InstallDir -Force
}

# Remove from user PATH
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -like "*$InstallDir*") {
    $NewPath = ($UserPath -split ";" | Where-Object { $_ -ne $InstallDir }) -join ";"
    [Environment]::SetEnvironmentVariable("Path", $NewPath, "User")
    Write-Host "[ok] Removed from user PATH" -ForegroundColor Yellow
}

# --- Step 4: Remove all data ---

$DataDir = Join-Path $env:USERPROFILE ".triggerfish"
if (Test-Path $DataDir) {
    Write-Host "Removing $DataDir (source, config, logs)..."
    Remove-Item $DataDir -Recurse -Force
    Write-Host "[ok] All data removed" -ForegroundColor Green
}

Write-Host ""
Write-Host "Triggerfish has been completely uninstalled." -ForegroundColor Cyan
Write-Host ""
