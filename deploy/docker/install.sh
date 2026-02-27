#!/bin/sh
# Triggerfish Docker Installer
#
# Installs the host-side CLI wrapper, compose file, pulls the image,
# and runs first-time setup (dive).
#
# Works both as:
#   curl -sSL .../install.sh | sh          (downloads companion files)
#   ./deploy/docker/install.sh             (uses local files)
set -e

IMAGE="${TRIGGERFISH_IMAGE:-ghcr.io/greghavens/triggerfish:latest}"
BRANCH="${TRIGGERFISH_BRANCH:-master}"
BASE_URL="https://raw.githubusercontent.com/greghavens/triggerfish/${BRANCH}/deploy/docker"
CONFIG_DIR="${HOME}/.triggerfish/docker"

echo ""
echo "  Triggerfish Docker Installer"
echo "  ============================"
echo ""

# --- Step 1: Detect container runtime ---

if [ -n "${TRIGGERFISH_CONTAINER_RUNTIME}" ]; then
  RT="${TRIGGERFISH_CONTAINER_RUNTIME}"
elif command -v podman >/dev/null 2>&1; then
  RT="podman"
elif command -v docker >/dev/null 2>&1; then
  RT="docker"
else
  echo "[error] Neither podman nor docker found. Install one and try again."
  exit 1
fi
echo "[ok] Container runtime: ${RT}"

# --- Step 2: Resolve source files ---
# When run via curl|sh there's no script directory — download from GitHub.

SCRIPT_DIR="$(cd "$(dirname "$0" 2>/dev/null)" 2>/dev/null && pwd 2>/dev/null)" || SCRIPT_DIR=""

fetch_file() {
  # Usage: fetch_file <local_name> <dest_path>
  # Try local copy first, fall back to downloading from GitHub.
  if [ -n "${SCRIPT_DIR}" ] && [ -f "${SCRIPT_DIR}/$1" ]; then
    cp "${SCRIPT_DIR}/$1" "$2"
  elif command -v curl >/dev/null 2>&1; then
    curl -fsSL "${BASE_URL}/$1" -o "$2"
  elif command -v wget >/dev/null 2>&1; then
    wget -qO "$2" "${BASE_URL}/$1"
  else
    echo "[error] curl or wget required to download files." >&2
    exit 1
  fi
}

# --- Step 3: Install wrapper script ---

if [ -w /usr/local/bin ]; then
  INSTALL_DIR="/usr/local/bin"
else
  INSTALL_DIR="${HOME}/.local/bin"
  mkdir -p "${INSTALL_DIR}"
fi

fetch_file "triggerfish" "${INSTALL_DIR}/triggerfish"
chmod +x "${INSTALL_DIR}/triggerfish"
echo "[ok] Wrapper installed to ${INSTALL_DIR}/triggerfish"

# --- Step 4: Copy compose file ---

mkdir -p "${CONFIG_DIR}"
fetch_file "docker-compose.yml" "${CONFIG_DIR}/docker-compose.yml"
fetch_file ".env.example" "${CONFIG_DIR}/.env.example" 2>/dev/null || true
echo "[ok] Compose file installed to ${CONFIG_DIR}/docker-compose.yml"

# --- Step 5: Pull image (skip if already available locally) ---

image_exists() {
  if [ "${RT}" = "podman" ]; then
    ${RT} image exists "$1" 2>/dev/null
  else
    ${RT} image inspect "$1" >/dev/null 2>&1
  fi
}

if image_exists "${IMAGE}"; then
  echo "[ok] Image already available: ${IMAGE}"
else
  echo "Pulling image (this may take a minute)..."
  ${RT} pull "${IMAGE}"
  echo "[ok] Image pulled: ${IMAGE}"
fi

# --- Step 6: Check PATH ---

# Save the user's original PATH before modifying it
ORIGINAL_PATH="${PATH}"

case ":${ORIGINAL_PATH}:" in
  *":${INSTALL_DIR}:"*) ;;
  *)
    echo ""
    echo "[warn] ${INSTALL_DIR} is not in your PATH."
    echo "  Add this to your shell profile (~/.bashrc or ~/.zshrc):"
    echo "    export PATH=\"${INSTALL_DIR}:\$PATH\""
    echo ""
    ;;
esac

export PATH="${INSTALL_DIR}:${PATH}"

# --- Step 7: First-time setup ---

echo ""
echo "Running first-time setup..."

# Dive runs as a one-shot container (service not started yet).
# Redirect from /dev/tty so the wizard can read input even when
# this script is piped via curl|sh.
if [ -t 0 ]; then
  ${RT} run --rm -it --network=host -v triggerfish-data:/data "${IMAGE}" dive
else
  ${RT} run --rm -it --network=host -v triggerfish-data:/data "${IMAGE}" dive </dev/tty
fi

# Start the service after dive completes
echo ""
echo "Starting triggerfish..."
"${INSTALL_DIR}/triggerfish" start

echo ""
echo "  Setup complete! Triggerfish is running."
echo ""
echo "  triggerfish status    # Check container status"
echo "  triggerfish chat      # Interactive chat"
echo "  triggerfish logs      # View logs"
echo "  triggerfish patrol    # Run health check"
echo "  triggerfish stop      # Stop the container"
echo "  triggerfish update    # Pull latest image and restart"
echo ""
