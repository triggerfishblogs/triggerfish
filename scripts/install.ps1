# Triggerfish Binary Installer for Windows
#
# Downloads a pre-built binary from GitHub Releases, verifies its checksum,
# and installs it. No Deno or git required.
#
# Usage: irm https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.ps1 | iex

$ErrorActionPreference = "Stop"

$Repo = "greghavens/triggerfish"
$InstallName = "triggerfish"

Write-Host ""
Write-Host "  Triggerfish Installer" -ForegroundColor Cyan
Write-Host "  ====================="
Write-Host ""

# --- Step 1: Detect architecture ---

$Arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
switch ($Arch) {
    "X64"   { $ArchSuffix = "x64" }
    "Arm64" { $ArchSuffix = "arm64" }
    default {
        Write-Host "[error] Unsupported architecture: $Arch" -ForegroundColor Red
        exit 1
    }
}

$BinaryName = "${InstallName}-windows-${ArchSuffix}.exe"
Write-Host "[ok] Detected platform: windows-${ArchSuffix}" -ForegroundColor Green

# --- Step 2: Determine latest version ---

if ($env:TRIGGERFISH_VERSION) {
    $Version = $env:TRIGGERFISH_VERSION
    Write-Host "[ok] Using specified version: $Version" -ForegroundColor Green
} else {
    Write-Host "Fetching latest version..."
    $Release = Invoke-RestMethod -Uri "https://api.github.com/repos/$Repo/releases/latest"
    $Version = $Release.tag_name

    if (-not $Version) {
        Write-Host "[error] Could not determine latest version." -ForegroundColor Red
        exit 1
    }
    Write-Host "[ok] Latest version: $Version" -ForegroundColor Green
}

# --- Step 3: Download binary and checksum ---

$BaseUrl = "https://github.com/$Repo/releases/download/$Version"
$TempDir = Join-Path $env:TEMP "triggerfish-install"
New-Item -ItemType Directory -Path $TempDir -Force | Out-Null

$BinaryPath = Join-Path $TempDir $BinaryName
$ChecksumPath = Join-Path $TempDir "SHA256SUMS.txt"

Write-Host "Downloading $BinaryName..."
Invoke-WebRequest -Uri "$BaseUrl/$BinaryName" -OutFile $BinaryPath

Write-Host "Downloading checksums..."
Invoke-WebRequest -Uri "$BaseUrl/SHA256SUMS.txt" -OutFile $ChecksumPath

# --- Step 4: Verify checksum ---

Write-Host "Verifying checksum..."
$Expected = (Get-Content $ChecksumPath | Where-Object { $_ -match $BinaryName } | ForEach-Object { ($_ -split '\s+')[0] })

if (-not $Expected) {
    Write-Host "[error] Binary '$BinaryName' not found in SHA256SUMS.txt" -ForegroundColor Red
    Remove-Item -Recurse -Force $TempDir
    exit 1
}

$Actual = (Get-FileHash -Path $BinaryPath -Algorithm SHA256).Hash.ToLower()

if ($Actual -ne $Expected) {
    Write-Host "[error] Checksum mismatch!" -ForegroundColor Red
    Write-Host "  Expected: $Expected"
    Write-Host "  Got:      $Actual"
    Remove-Item -Recurse -Force $TempDir
    exit 1
}
Write-Host "[ok] Checksum verified" -ForegroundColor Green

# --- Step 5: Install binary ---

$InstallDir = Join-Path $env:LOCALAPPDATA "Triggerfish"
if (-not (Test-Path $InstallDir)) {
    New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
}

$InstallPath = Join-Path $InstallDir "${InstallName}.exe"
Move-Item -Path $BinaryPath -Destination $InstallPath -Force
Remove-Item -Recurse -Force $TempDir

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
