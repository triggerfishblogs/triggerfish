#!/bin/bash
# Triggerfish Uninstall Script
#
# Stops the daemon, removes the service, binary, source, config, and logs.
# Usage: bash ~/.triggerfish/src/scripts/uninstall.sh
#   or:  curl -sSL https://raw.githubusercontent.com/greghavens/triggerfish/master/scripts/uninstall.sh | bash
set -e

echo ""
echo "  Triggerfish Uninstaller"
echo "  ======================"
echo ""

# --- Step 1: Stop the daemon ---

if command -v triggerfish &>/dev/null; then
  echo "Stopping daemon..."
  triggerfish stop 2>/dev/null || true
  echo "[ok] Daemon stopped"
fi

# --- Step 2: Remove systemd service (Linux) ---

SYSTEMD_UNIT="${HOME}/.config/systemd/user/triggerfish.service"
if [ -f "${SYSTEMD_UNIT}" ]; then
  echo "Removing systemd service..."
  systemctl --user disable triggerfish.service 2>/dev/null || true
  rm -f "${SYSTEMD_UNIT}"
  systemctl --user daemon-reload 2>/dev/null || true
  echo "[ok] Systemd service removed"
fi

# --- Step 3: Remove launchd plist (macOS) ---

LAUNCHD_PLIST="${HOME}/Library/LaunchAgents/dev.triggerfish.agent.plist"
if [ -f "${LAUNCHD_PLIST}" ]; then
  echo "Removing launchd service..."
  launchctl unload "${LAUNCHD_PLIST}" 2>/dev/null || true
  rm -f "${LAUNCHD_PLIST}"
  echo "[ok] Launchd service removed"
fi

# --- Step 4: Remove binary ---

for BIN_DIR in /usr/local/bin "${HOME}/.local/bin"; do
  if [ -f "${BIN_DIR}/triggerfish" ]; then
    echo "Removing binary from ${BIN_DIR}..."
    rm -f "${BIN_DIR}/triggerfish"
    echo "[ok] Binary removed"
  fi
done

# --- Step 5: Remove all data ---

if [ -d "${HOME}/.triggerfish" ]; then
  echo "Removing ${HOME}/.triggerfish (source, config, logs)..."
  rm -rf "${HOME}/.triggerfish"
  echo "[ok] All data removed"
fi

echo ""
echo "Triggerfish has been completely uninstalled."
echo ""
