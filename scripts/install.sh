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
curl -sSL -o "/tmp/${BINARY_NAME}" "${BASE_URL}/${BINARY_NAME}"

echo "Downloading checksums..."
curl -sSL -o "/tmp/SHA256SUMS.txt" "${BASE_URL}/SHA256SUMS.txt"

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

# Ensure it's on PATH
export PATH="${INSTALL_DIR}:${PATH}"

case ":${PATH}:" in
  *":${INSTALL_DIR}:"*) ;;
  *)
    echo ""
    echo "[warn] ${INSTALL_DIR} is not in your PATH."
    echo "  Add this to your shell profile (~/.bashrc or ~/.zshrc):"
    echo "    export PATH=\"${INSTALL_DIR}:\$PATH\""
    echo ""
    ;;
esac

# --- Step 6: First-time setup ---

echo ""
"${INSTALL_DIR}/${INSTALL_NAME}" dive --install-daemon </dev/tty

echo ""
echo "  triggerfish status    # Check daemon status"
echo "  triggerfish logs      # View logs"
echo "  triggerfish patrol    # Run health check"
echo "  triggerfish stop      # Stop the daemon"
echo ""
