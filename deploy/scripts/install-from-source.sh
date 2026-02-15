#!/bin/bash
# Triggerfish Install Script
#
# Installs Deno (if needed), clones the repo, compiles, and runs first-time setup.
# Usage: curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/install.sh | bash
set -e

REPO_URL="https://github.com/greghavens/triggerfish.git"
SRC_DIR="${HOME}/.triggerfish/src"
BRANCH="${TRIGGERFISH_BRANCH:-master}"

echo ""
echo "  Triggerfish Installer"
echo "  ====================="
echo ""

# --- Step 1: Ensure Deno is installed ---

if command -v deno &>/dev/null; then
  echo "[ok] Deno found: $(deno --version | head -1)"
else
  echo "Installing Deno..."
  curl -fsSL https://deno.land/install.sh | sh
  export DENO_INSTALL="${HOME}/.deno"
  export PATH="${DENO_INSTALL}/bin:${PATH}"

  if ! command -v deno &>/dev/null; then
    echo "[error] Deno installation failed."
    exit 1
  fi
  echo "[ok] Deno installed: $(deno --version | head -1)"
fi

# --- Step 2: Ensure git is available ---

if ! command -v git &>/dev/null; then
  echo "[error] git is required. Install it and try again."
  exit 1
fi

# --- Step 3: Clone or update source ---

if [ -d "${SRC_DIR}/.git" ]; then
  echo "Updating source..."
  git -C "${SRC_DIR}" fetch origin
  git -C "${SRC_DIR}" checkout "${BRANCH}"
  git -C "${SRC_DIR}" pull origin "${BRANCH}"
  echo "[ok] Source updated"
else
  echo "Cloning triggerfish..."
  mkdir -p "$(dirname "${SRC_DIR}")"
  git clone --branch "${BRANCH}" "${REPO_URL}" "${SRC_DIR}"
  echo "[ok] Source cloned to ${SRC_DIR}"
fi

# --- Step 4: Compile ---

echo "Compiling (this may take a minute)..."
cd "${SRC_DIR}"
deno compile --allow-all --include config/ --include skills/ --include src/tidepool/tmpl_base.html --include src/tidepool/tmpl_styles.html --include src/tidepool/tmpl_chat.html --include src/tidepool/tmpl_canvas.html --include src/tidepool/tmpl_chat_script.html --include src/tidepool/tmpl_canvas_script.html --output=triggerfish src/cli/main.ts
echo "[ok] Compiled successfully"

# --- Step 5: Install binary ---

if [ -w /usr/local/bin ]; then
  INSTALL_DIR="/usr/local/bin"
else
  INSTALL_DIR="${HOME}/.local/bin"
  mkdir -p "${INSTALL_DIR}"
fi

cp "${SRC_DIR}/triggerfish" "${INSTALL_DIR}/triggerfish"
chmod +x "${INSTALL_DIR}/triggerfish"
echo "[ok] Installed to ${INSTALL_DIR}/triggerfish"

# Ensure it's on PATH for the rest of this script
export PATH="${INSTALL_DIR}:${PATH}"

# Check if install dir is in user's PATH
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

# --- Step 6: First-time setup + optional daemon install ---
# The dive wizard asks the user whether to install the daemon (step 6/6).
# When --install-daemon is passed, dive will auto-start the daemon if the
# user says yes during the wizard.

# When piped via curl|bash, stdin is the pipe — not the terminal.
# Redirect from /dev/tty so the interactive wizard can read user input.
echo ""
"${INSTALL_DIR}/triggerfish" dive --install-daemon </dev/tty

echo ""
echo "  triggerfish status    # Check daemon status"
echo "  triggerfish logs      # View logs"
echo "  triggerfish patrol    # Run health check"
echo "  triggerfish stop      # Stop the daemon"
echo ""
