# Triggerfish Install Script for Windows
#
# Installs Deno (if needed), clones the repo, compiles, and runs first-time setup.
# Usage: irm https://raw.githubusercontent.com/greghavens/triggerfish/master/deploy/scripts/install-from-source.ps1 | iex

$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/greghavens/triggerfish.git"
$SrcDir = Join-Path $env:USERPROFILE ".triggerfish\src"
$Branch = if ($env:TRIGGERFISH_BRANCH) { $env:TRIGGERFISH_BRANCH } else { "master" }
$ServiceName = "Triggerfish"

Write-Host ""
Write-Host "  Triggerfish Installer" -ForegroundColor Cyan
Write-Host "  ====================="
Write-Host ""

# --- Step 1: Ensure Deno is installed ---

$denoCmd = Get-Command deno -ErrorAction SilentlyContinue
if ($denoCmd) {
    Write-Host "[ok] Deno found" -ForegroundColor Green
} else {
    Write-Host "Installing Deno..."
    irm https://deno.land/install.ps1 | iex
    $env:PATH = "$env:USERPROFILE\.deno\bin;$env:PATH"

    $denoCmd = Get-Command deno -ErrorAction SilentlyContinue
    if (-not $denoCmd) {
        Write-Host "[error] Deno installation failed." -ForegroundColor Red
        exit 1
    }
    Write-Host "[ok] Deno installed" -ForegroundColor Green
}

# --- Step 2: Ensure git is available ---

$gitCmd = Get-Command git -ErrorAction SilentlyContinue
if (-not $gitCmd) {
    Write-Host "[error] git is required. Install it and try again." -ForegroundColor Red
    exit 1
}

# --- Step 3: Clone or update source ---

if (Test-Path (Join-Path $SrcDir ".git")) {
    Write-Host "Updating source..."
    git -C $SrcDir fetch origin
    git -C $SrcDir checkout $Branch
    git -C $SrcDir pull origin $Branch
    Write-Host "[ok] Source updated" -ForegroundColor Green
} else {
    Write-Host "Cloning triggerfish..."
    $parentDir = Split-Path $SrcDir -Parent
    if (-not (Test-Path $parentDir)) {
        New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
    }
    git clone --branch $Branch $RepoUrl $SrcDir
    Write-Host "[ok] Source cloned to $SrcDir" -ForegroundColor Green
}

# --- Step 4: Compile ---

Write-Host "Compiling (this may take a minute)..."
Push-Location $SrcDir
deno compile --allow-all --include config/ --include skills/ --include src/tidepool/tmpl_base.html --include src/tidepool/tmpl_styles.html --include src/tidepool/tmpl_chat.html --include src/tidepool/tmpl_canvas.html --include src/tidepool/tmpl_chat_script.html --include src/tidepool/tmpl_canvas_script.html --output=triggerfish src/cli/main.ts
Pop-Location
Write-Host "[ok] Compiled successfully" -ForegroundColor Green

# --- Step 5: Install binary ---

$InstallDir = Join-Path $env:LOCALAPPDATA "Triggerfish"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$InstallPath = Join-Path $InstallDir "triggerfish.exe"
Copy-Item (Join-Path $SrcDir "triggerfish.exe") $InstallPath -Force
Write-Host "[ok] Installed to $InstallPath" -ForegroundColor Green

# Add to PATH if not already present
$UserPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($UserPath -notlike "*$InstallDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$UserPath;$InstallDir", "User")
    $env:PATH = "$InstallDir;$env:PATH"
    Write-Host "[ok] Added $InstallDir to user PATH" -ForegroundColor Yellow
    Write-Host "  Restart your terminal for PATH changes to persist."
}

# --- Step 6: First-time setup ---

Write-Host ""
& $InstallPath dive

# --- Step 7: Install and start daemon (Windows Service) ---

Write-Host ""
Write-Host "Installing Triggerfish daemon..."

$DataDir = Join-Path $env:USERPROFILE ".triggerfish"
$LogDir = Join-Path $DataDir "logs"
$ServiceExe = Join-Path $InstallDir "TriggerFishService.exe"

# Ensure data and log directories exist
New-Item -ItemType Directory -Path $LogDir -Force | Out-Null

# Compile the C# service wrapper
$CsSource = @'
using System;
using System.Diagnostics;
using System.IO;
using System.ServiceProcess;
public class TriggerFishService : ServiceBase
{
    private Process _proc;
    public TriggerFishService() { ServiceName = "Triggerfish"; CanStop = true; CanShutdown = true; }
    protected override void OnStart(string[] args)
    {
        var logDir = @"%%LOGDIR%%";
        var logFile = Path.Combine(logDir, "triggerfish.log");
        Directory.CreateDirectory(logDir);
        _proc = new Process();
        _proc.StartInfo.FileName = @"%%BINPATH%%";
        _proc.StartInfo.Arguments = "run";
        _proc.StartInfo.UseShellExecute = false;
        _proc.StartInfo.RedirectStandardOutput = true;
        _proc.StartInfo.RedirectStandardError = true;
        _proc.StartInfo.CreateNoWindow = true;
        _proc.StartInfo.EnvironmentVariables["TRIGGERFISH_DATA_DIR"] = @"%%DATADIR%%";
        _proc.StartInfo.EnvironmentVariables["PATH"] = @"%%USERPATH%%";
        var w = new StreamWriter(logFile, true) { AutoFlush = true };
        _proc.OutputDataReceived += (s, e) => { if (e.Data != null) try { w.WriteLine(e.Data); } catch {} };
        _proc.ErrorDataReceived += (s, e) => { if (e.Data != null) try { w.WriteLine(e.Data); } catch {} };
        _proc.Start();
        _proc.BeginOutputReadLine();
        _proc.BeginErrorReadLine();
    }
    protected override void OnStop() { Kill(); }
    protected override void OnShutdown() { Kill(); }
    void Kill() { try { if (_proc != null && !_proc.HasExited) { _proc.Kill(); _proc.WaitForExit(5000); } } catch {} }
    public static void Main() { ServiceBase.Run(new TriggerFishService()); }
}
'@

# Capture the user's PATH at install time so MCP subprocess spawning
# can find npx, node, deno, python, etc.
$FullUserPath = $env:PATH

$CsSource = $CsSource.Replace('%%LOGDIR%%', $LogDir)
$CsSource = $CsSource.Replace('%%BINPATH%%', $InstallPath)
$CsSource = $CsSource.Replace('%%DATADIR%%', $DataDir)
$CsSource = $CsSource.Replace('%%USERPATH%%', $FullUserPath)

# Stop existing service if running (to release lock on TriggerFishService.exe)
$existingSvc = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
if ($existingSvc -and $existingSvc.Status -eq 'Running') {
    Write-Host "  Stopping existing Triggerfish service..."
    try {
        Stop-Service -Name $ServiceName -Force -ErrorAction Stop
        Start-Sleep -Seconds 2
    } catch {
        Write-Host "[warn] Could not stop existing service. The service exe may be locked." -ForegroundColor Yellow
    }
}

$TempCs = Join-Path $env:TEMP "TriggerFishService.cs"
Set-Content -Path $TempCs -Value $CsSource -Encoding UTF8

$csc = Join-Path $env:windir "Microsoft.NET\Framework64\v4.0.30319\csc.exe"
if (-not (Test-Path $csc)) { $csc = Join-Path $env:windir "Microsoft.NET\Framework\v4.0.30319\csc.exe" }

$DaemonInstalled = $false
if (-not (Test-Path $csc)) {
    Write-Host "[warn] C# compiler not found. Daemon will not auto-start." -ForegroundColor Yellow
    Write-Host "  Run 'triggerfish start' manually after installing .NET Framework."
} else {
    $cscOutput = & $csc /nologo /target:exe /reference:System.ServiceProcess.dll "/out:$ServiceExe" $TempCs 2>&1
    if ($LASTEXITCODE -ne 0 -or -not (Test-Path $ServiceExe)) {
        Write-Host "[warn] Failed to compile service wrapper:" -ForegroundColor Yellow
        Write-Host "  $cscOutput"
        Write-Host "  Run 'triggerfish start' manually to retry."
    } else {
        Write-Host "[ok] Service wrapper compiled" -ForegroundColor Green

        # Register and start the service (requires admin — elevate via UAC)
        $RegScript = @"
`$ErrorActionPreference = 'Stop'
`$svc = Get-Service -Name '$ServiceName' -ErrorAction SilentlyContinue
if (`$svc) {
    Stop-Service -Name '$ServiceName' -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2
    sc.exe delete '$ServiceName' | Out-Null
    Start-Sleep -Seconds 1
}
New-Service -Name '$ServiceName' -BinaryPathName '$ServiceExe' -DisplayName 'Triggerfish AI Agent' -Description 'Triggerfish AI Agent daemon' -StartupType Automatic
Start-Service -Name '$ServiceName'
"@
        $RegScriptPath = Join-Path $env:TEMP "triggerfish-register-service.ps1"
        Set-Content -Path $RegScriptPath -Value $RegScript -Encoding UTF8

        Write-Host "  Requesting administrator privileges to register service..."
        try {
            Start-Process powershell -Verb RunAs -Wait -ArgumentList "-NoProfile -NonInteractive -ExecutionPolicy Bypass -File `"$RegScriptPath`""
            Remove-Item $RegScriptPath -Force -ErrorAction SilentlyContinue
        } catch {
            Remove-Item $RegScriptPath -Force -ErrorAction SilentlyContinue
            Write-Host "[warn] UAC elevation failed or was declined." -ForegroundColor Yellow
            Write-Host "  Run 'triggerfish start' from an admin terminal to install the daemon."
        }

        # Verify
        $svcCheck = Get-Service -Name $ServiceName -ErrorAction SilentlyContinue
        if ($svcCheck -and $svcCheck.Status -eq 'Running') {
            Write-Host "[ok] Daemon installed and running" -ForegroundColor Green
            $DaemonInstalled = $true
        } else {
            Write-Host "[warn] Service not running. Run 'triggerfish start' from an admin terminal." -ForegroundColor Yellow
        }
    }
}

Remove-Item $TempCs -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Triggerfish is ready!" -ForegroundColor Cyan
Write-Host ""
if ($DaemonInstalled) {
    Write-Host "  triggerfish status    # Check daemon status"
} else {
    Write-Host "  triggerfish start     # Install and start the daemon"
}
Write-Host "  triggerfish patrol    # Run health check"
Write-Host "  triggerfish logs      # View logs"
Write-Host ""
