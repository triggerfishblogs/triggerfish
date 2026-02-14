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
# RuntimeInformation.OSArchitecture requires .NET Core/.NET 5+.
# Windows PowerShell 5.1 (ships with Windows) runs on .NET Framework 4.x
# where this API is unavailable. Fall back to PROCESSOR_ARCHITECTURE env var.

$Arch = $null
try {
    $Arch = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString()
} catch {
    # .NET Framework — API not available
}

if (-not $Arch) {
    $Arch = $env:PROCESSOR_ARCHITECTURE  # AMD64, x86, ARM64
}

switch ($Arch) {
    { $_ -in "X64", "AMD64" }  { $ArchSuffix = "x64" }
    { $_ -in "Arm64", "ARM64" } { $ArchSuffix = "arm64" }
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

$DefaultDir = Join-Path $env:LOCALAPPDATA "Triggerfish"

# Allow TRIGGERFISH_INSTALL_DIR env var to pre-set the directory (for silent installs)
if ($env:TRIGGERFISH_INSTALL_DIR) {
    $InstallDir = $env:TRIGGERFISH_INSTALL_DIR
} else {
    Write-Host ""
    Write-Host "Where should Triggerfish be installed?"
    Write-Host "  Default: $DefaultDir"
    Write-Host ""
    $UserInput = Read-Host "  Install directory (press Enter for default)"

    if ([string]::IsNullOrWhiteSpace($UserInput)) {
        $InstallDir = $DefaultDir
    } else {
        $InstallDir = $UserInput.Trim()
    }
}

# Create directory if needed, then verify we can write to it
try {
    if (-not (Test-Path $InstallDir)) {
        New-Item -ItemType Directory -Path $InstallDir -Force | Out-Null
    }
    $TestFile = Join-Path $InstallDir ".triggerfish-write-test"
    [IO.File]::WriteAllText($TestFile, "test")
    Remove-Item -Path $TestFile -Force
} catch {
    Write-Host "[error] Cannot write to $InstallDir" -ForegroundColor Red
    Write-Host "  Choose a different directory or run as Administrator."
    Remove-Item -Recurse -Force $TempDir
    exit 1
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

# Enable ANSI escape sequences in the console so the dive wizard's
# colored prompts (via Cliffy) render correctly on PowerShell 5.1.
# Windows 10+ supports Virtual Terminal Processing but it must be
# explicitly enabled on the console output handle.
try {
    Add-Type -MemberDefinition @"
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern IntPtr GetStdHandle(int nStdHandle);
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool GetConsoleMode(IntPtr hConsoleHandle, out uint lpMode);
        [DllImport("kernel32.dll", SetLastError = true)]
        public static extern bool SetConsoleMode(IntPtr hConsoleHandle, uint dwMode);
"@ -Namespace Win32 -Name NativeMethods -ErrorAction SilentlyContinue

    $handle = [Win32.NativeMethods]::GetStdHandle(-11)  # STD_OUTPUT_HANDLE
    $mode = [uint32]0
    [Win32.NativeMethods]::GetConsoleMode($handle, [ref]$mode) | Out-Null
    [Win32.NativeMethods]::SetConsoleMode($handle, $mode -bor 0x0004) | Out-Null  # ENABLE_VIRTUAL_TERMINAL_PROCESSING
} catch {
    # Ignore — VT processing not available (very old Windows)
}

Write-Host ""
& $InstallPath dive

Write-Host ""
Write-Host "Triggerfish is ready!" -ForegroundColor Cyan
Write-Host ""
Write-Host "  triggerfish start     # Install and start the daemon"
Write-Host "  triggerfish patrol    # Run health check"
Write-Host "  triggerfish logs      # View logs"
Write-Host ""
