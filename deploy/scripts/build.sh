#!/bin/bash
# Multi-platform binary build script for Triggerfish.
#
# Compiles for all 5 supported targets and generates SHA256 checksums.
# Output goes to dist/ directory.
set -e

DIST_DIR="dist"
ENTRY="src/cli/main.ts"
INCLUDE_FLAGS="--include config/ --include src/skills/ --include src/tidepool/tmpl_base.html --include src/tidepool/tmpl_styles.html --include src/tidepool/tmpl_chat.html --include src/tidepool/tmpl_canvas.html --include src/tidepool/tmpl_chat_script.html --include src/tidepool/tmpl_canvas_script.html"
VERSION_TAG="${1:-dev}"

TARGETS=(
  "x86_64-unknown-linux-gnu:triggerfish-linux-x64"
  "aarch64-unknown-linux-gnu:triggerfish-linux-arm64"
  "x86_64-apple-darwin:triggerfish-macos-x64"
  "aarch64-apple-darwin:triggerfish-macos-arm64"
  "x86_64-pc-windows-msvc:triggerfish-windows-x64.exe"
)

echo "Building Triggerfish binaries (version: ${VERSION_TAG})..."
echo ""

# Stamp version into source before compilation
echo "export const VERSION: string = \"${VERSION_TAG}\";" > src/cli/version.ts

mkdir -p "${DIST_DIR}"

for target_entry in "${TARGETS[@]}"; do
  IFS=":" read -r target output <<< "${target_entry}"
  echo "  Compiling ${output} (${target})..."
  deno compile --allow-all \
    --target "${target}" \
    ${INCLUDE_FLAGS} \
    --output="${DIST_DIR}/${output}" \
    "${ENTRY}"
done

echo ""
echo "Generating checksums..."
cd "${DIST_DIR}"
sha256sum triggerfish-* > SHA256SUMS.txt
cd ..

echo ""
echo "Build complete. Artifacts in ${DIST_DIR}/:"
ls -lh "${DIST_DIR}/"
