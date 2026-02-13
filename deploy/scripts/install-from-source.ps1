# Triggerfish Install Script for Windows
#
# Installs Deno (if needed), clones the repo, compiles, and runs first-time setup.
# Usage: irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex

$ErrorActionPreference = "Stop"

$RepoUrl = "https://github.com/greghavens/triggerfish.git"
$SrcDir = Join-Path $env:USERPROFILE ".triggerfish\src"
$Branch = if ($env:TRIGGERFISH_BRANCH) { $env:TRIGGERFISH_BRANCH } else { "master" }

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
deno compile --allow-all --output=triggerfish src/cli/main.ts
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

Write-Host ""
Write-Host "Triggerfish is ready!" -ForegroundColor Cyan
Write-Host ""
Write-Host "  triggerfish start     # Install and start the daemon"
Write-Host "  triggerfish patrol    # Run health check"
Write-Host "  triggerfish logs      # View logs"
Write-Host ""
