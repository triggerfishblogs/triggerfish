# ============================================================
# Stage 1: Build — compile Triggerfish binary
# ============================================================
FROM docker.io/denoland/deno:2.6.8 AS builder

WORKDIR /build

# Copy dependency manifest first for caching
COPY deno.json deno.lock* ./
COPY src/ src/

# Cache dependencies
RUN deno cache src/cli/main.ts

# Copy bundled assets
COPY config/ config/

# Compile with bundled config, skills, and templates
RUN deno compile --allow-all \
    --include config/ \
    --include src/skills/ \
    --include src/tools/tidepool/tmpl_base.html \
    --include src/tools/tidepool/tmpl_styles.html \
    --include src/tools/tidepool/tmpl_chat.html \
    --include src/tools/tidepool/tmpl_canvas.html \
    --include src/tools/tidepool/tmpl_chat_script.html \
    --include src/tools/tidepool/tmpl_canvas_script.html \
    --output=/build/triggerfish \
    src/cli/main.ts

# ============================================================
# Stage 2: Runtime — Debian Trixie for GLIBC 2.40+
# (SQLite FFI requires GLIBC >= 2.38, Bookworm only has 2.36)
# ============================================================
FROM docker.io/debian:trixie-slim AS production

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates tini \
    && rm -rf /var/lib/apt/lists/*

# Copy compiled binary from builder
COPY --from=builder /build/triggerfish /usr/local/bin/triggerfish

# Environment
ENV TRIGGERFISH_DATA_DIR=/data
ENV TRIGGERFISH_DOCKER=true
# Deno FFI plugin cache needs a writable home; point it inside /data
ENV DENO_DIR=/data/.deno
ENV HOME=/data

# Ports: gateway HTTP + WebSocket
EXPOSE 18789 18790

# Data volume mount point — owned by nonroot user
RUN mkdir -p /data && chown 65534:65534 /data
VOLUME /data

# Run as nonroot (UID 65534 = nobody in Debian, matches distroless convention)
USER 65534:65534

# Use tini for PID 1 signal handling (-s registers as subreaper)
ENTRYPOINT ["tini", "-s", "--", "/usr/local/bin/triggerfish"]
CMD ["run"]

# ============================================================
# Stage 3: Debug variant (identical base, kept for CI compat)
# ============================================================
FROM production AS debug
