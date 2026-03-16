#!/bin/bash
# Triggerfish Binary Installer
#
# Downloads a pre-built binary from GitHub Releases, verifies its checksum,
# and installs it. No Deno or git required.
#
# Usage: curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
set -e

REPO="greghavens/triggerfish"
INSTALL_NAME="triggerfish"

echo ""
echo "  Triggerfish Installer"
echo "  ====================="
echo ""

# --- Step 1: Detect OS and architecture ---

OS="$(uname -s)"
ARCH="$(uname -m)"

case "${OS}" in
  Linux)  PLATFORM="linux" ;;
  Darwin) PLATFORM="macos" ;;
  *)
    echo "[error] Unsupported OS: ${OS}"
    exit 1
    ;;
esac

case "${ARCH}" in
  x86_64|amd64) ARCH_SUFFIX="x64" ;;
  aarch64|arm64) ARCH_SUFFIX="arm64" ;;
  *)
    echo "[error] Unsupported architecture: ${ARCH}"
    exit 1
    ;;
esac

BINARY_NAME="${INSTALL_NAME}-${PLATFORM}-${ARCH_SUFFIX}"
echo "[ok] Detected platform: ${PLATFORM}-${ARCH_SUFFIX}"

# --- Step 2: Determine latest version ---

if [ -n "${TRIGGERFISH_VERSION}" ]; then
  VERSION="${TRIGGERFISH_VERSION}"
  echo "[ok] Using specified version: ${VERSION}"
else
  echo "Fetching latest version..."
  VERSION="$(curl -sSL -H "Accept: application/vnd.github.v3+json" \
    "https://api.github.com/repos/${REPO}/releases/latest" \
    | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')"

  if [ -z "${VERSION}" ]; then
    echo "[error] Could not determine latest version."
    exit 1
  fi
  echo "[ok] Latest version: ${VERSION}"
fi

# --- Step 3: Download binary and checksum ---

BASE_URL="https://github.com/${REPO}/releases/download/${VERSION}"

echo "Downloading ${BINARY_NAME}..."
curl -fL --connect-timeout 15 --retry 3 \
  -o "/tmp/${BINARY_NAME}" "${BASE_URL}/${BINARY_NAME}"

echo "Downloading checksums..."
curl -fsSL --connect-timeout 15 --retry 3 \
  -o "/tmp/SHA256SUMS.txt" "${BASE_URL}/SHA256SUMS.txt"

# --- Step 4: Verify checksum ---

echo "Verifying checksum..."
EXPECTED="$(grep "${BINARY_NAME}" /tmp/SHA256SUMS.txt | awk '{print $1}')"

if [ -z "${EXPECTED}" ]; then
  echo "[error] Binary '${BINARY_NAME}' not found in SHA256SUMS.txt"
  rm -f "/tmp/${BINARY_NAME}" "/tmp/SHA256SUMS.txt"
  exit 1
fi

if command -v sha256sum &>/dev/null; then
  ACTUAL="$(sha256sum "/tmp/${BINARY_NAME}" | awk '{print $1}')"
elif command -v shasum &>/dev/null; then
  ACTUAL="$(shasum -a 256 "/tmp/${BINARY_NAME}" | awk '{print $1}')"
else
  echo "[warn] No sha256sum or shasum found, skipping verification"
  ACTUAL="${EXPECTED}"
fi

if [ "${ACTUAL}" != "${EXPECTED}" ]; then
  echo "[error] Checksum mismatch!"
  echo "  Expected: ${EXPECTED}"
  echo "  Got:      ${ACTUAL}"
  rm -f "/tmp/${BINARY_NAME}" "/tmp/SHA256SUMS.txt"
  exit 1
fi
echo "[ok] Checksum verified"

# --- Step 5: Install binary ---

if [ -w /usr/local/bin ]; then
  INSTALL_DIR="/usr/local/bin"
else
  INSTALL_DIR="${HOME}/.local/bin"
  mkdir -p "${INSTALL_DIR}"
fi

mv "/tmp/${BINARY_NAME}" "${INSTALL_DIR}/${INSTALL_NAME}"
chmod +x "${INSTALL_DIR}/${INSTALL_NAME}"
rm -f "/tmp/SHA256SUMS.txt"

echo "[ok] Installed to ${INSTALL_DIR}/${INSTALL_NAME}"

# --- Step 5b: Install Tauri native UI binary (optional) ---

TAURI_BINARY_NAME="triggerfish-tidepool-${PLATFORM}-${ARCH_SUFFIX}"
TAURI_INSTALLED=""

install_tauri_binary() {
  echo ""
  echo "Installing Tidepool native UI..."

  # On Linux, ensure WebKit2GTK is available
  if [ "${PLATFORM}" = "linux" ]; then
    install_linux_webkit_deps
  fi

  # Download Tauri binary (may not exist in older releases)
  if curl -fL --connect-timeout 15 --retry 3 \
    -o "/tmp/${TAURI_BINARY_NAME}" "${BASE_URL}/${TAURI_BINARY_NAME}" 2>/dev/null; then

    # Verify checksum if available in the Tauri checksums file
    if curl -fsSL --connect-timeout 15 --retry 3 \
      -o "/tmp/SHA256SUMS-tauri.txt" "${BASE_URL}/SHA256SUMS-tauri.txt" 2>/dev/null; then
      TAURI_EXPECTED="$(grep "${TAURI_BINARY_NAME}" /tmp/SHA256SUMS-tauri.txt | awk '{print $1}')"
      if [ -n "${TAURI_EXPECTED}" ]; then
        if command -v sha256sum &>/dev/null; then
          TAURI_ACTUAL="$(sha256sum "/tmp/${TAURI_BINARY_NAME}" | awk '{print $1}')"
        elif command -v shasum &>/dev/null; then
          TAURI_ACTUAL="$(shasum -a 256 "/tmp/${TAURI_BINARY_NAME}" | awk '{print $1}')"
        else
          echo "[warn] No sha256sum or shasum found — cannot verify Tauri binary integrity"
          echo "[warn] Skipping Tidepool native UI install (unverified binary)"
          rm -f "/tmp/${TAURI_BINARY_NAME}" "/tmp/SHA256SUMS-tauri.txt"
          return
        fi
        if [ "${TAURI_ACTUAL}" != "${TAURI_EXPECTED}" ]; then
          echo "[warn] Tauri binary checksum mismatch, skipping native UI"
          rm -f "/tmp/${TAURI_BINARY_NAME}" "/tmp/SHA256SUMS-tauri.txt"
          return
        fi
      fi
      rm -f "/tmp/SHA256SUMS-tauri.txt"
    fi

    mv "/tmp/${TAURI_BINARY_NAME}" "${INSTALL_DIR}/triggerfish-tidepool"
    chmod +x "${INSTALL_DIR}/triggerfish-tidepool"
    echo "[ok] Installed Tidepool native UI to ${INSTALL_DIR}/triggerfish-tidepool"
    TAURI_INSTALLED="true"
  else
    echo "[info] Tidepool native UI binary not available for this release"
    echo "       Use 'triggerfish tidepool' to open in browser instead"
  fi
}

install_linux_webkit_deps() {
  # Detect if this is an immutable distro (rpm-ostree based)
  if command -v rpm-ostree &>/dev/null && rpm-ostree status &>/dev/null 2>&1; then
    echo "[info] Immutable distro detected — WebKit2GTK included via Flatpak runtime"
    echo "       Consider installing via: flatpak install dev.triggerfish.tidepool"
    return
  fi

  # Check if WebKit2GTK 4.1 is already available
  if pkg-config --exists webkit2gtk-4.1 2>/dev/null; then
    echo "[ok] WebKit2GTK 4.1 already installed"
    return
  fi

  echo "[info] Installing WebKit2GTK 4.1 (required for native UI)..."
  if command -v apt-get &>/dev/null; then
    sudo apt-get update -qq && sudo apt-get install -y -qq libwebkit2gtk-4.1-0
  elif command -v dnf &>/dev/null; then
    sudo dnf install -y webkit2gtk4.1
  elif command -v pacman &>/dev/null; then
    sudo pacman -S --noconfirm webkit2gtk-4.1
  else
    echo "[warn] Cannot auto-install WebKit2GTK — install manually for native UI"
  fi
}

install_tauri_binary

# Save original PATH before modifying, so persistent PATH check is accurate
ORIGINAL_PATH="${PATH}"

# Ensure it's on PATH for this session (so 'triggerfish dive' below can find the binary)
export PATH="${INSTALL_DIR}:${PATH}"

# Ensure install dir is in user's persistent PATH
PATH_MODIFIED=""
add_to_path() {
  local dir="$1"
  local line="export PATH=\"${dir}:\$PATH\""

  # Determine the correct shell profile
  local shell_name
  shell_name="$(basename "${SHELL:-/bin/zsh}")"

  local profile=""
  case "${shell_name}" in
    zsh)
      profile="${HOME}/.zshrc"
      ;;
    bash)
      # macOS bash reads .bash_profile for login shells, .bashrc for non-login
      if [ -f "${HOME}/.bash_profile" ]; then
        profile="${HOME}/.bash_profile"
      elif [ -f "${HOME}/.bashrc" ]; then
        profile="${HOME}/.bashrc"
      else
        profile="${HOME}/.bash_profile"
      fi
      ;;
    *)
      profile="${HOME}/.profile"
      ;;
  esac

  # Skip if the line already exists in the profile
  if [ -f "${profile}" ] && grep -qF "${dir}" "${profile}" 2>/dev/null; then
    return 0
  fi

  # Create the file if it doesn't exist (handles fresh macOS with no .zshrc)
  touch "${profile}"

  echo "" >> "${profile}"
  echo "# Added by Triggerfish installer" >> "${profile}"
  echo "${line}" >> "${profile}"
  echo "[ok] Added ${dir} to PATH in ${profile}"
  PATH_MODIFIED="${profile}"
}

case ":${ORIGINAL_PATH}:" in
  *":${INSTALL_DIR}:"*) ;;
  *)
    add_to_path "${INSTALL_DIR}"
    ;;
esac

# --- Step 6: First-time setup ---

echo ""
"${INSTALL_DIR}/${INSTALL_NAME}" dive --install-daemon </dev/tty

echo ""
if [ -n "${PATH_MODIFIED}" ]; then
  echo "  Restart your terminal or run:  source ${PATH_MODIFIED}"
  echo ""
fi
echo "  triggerfish status    # Check daemon status"
echo "  triggerfish tidepool  # Open Tidepool UI"
echo "  triggerfish logs      # View logs"
echo "  triggerfish patrol    # Run health check"
echo "  triggerfish stop      # Stop the daemon"
echo ""
