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
COPY skills/ skills/

# Compile with bundled config and skills
RUN deno compile --allow-all \
    --include config/ \
    --include skills/ \
    --output=/build/triggerfish \
    src/cli/main.ts

# ============================================================
# Stage 2: Runtime (production — no shell, near-zero CVEs)
# ============================================================
FROM gcr.io/distroless/cc-debian12 AS production

# Copy compiled binary from builder
COPY --from=builder /build/triggerfish /usr/local/bin/triggerfish

# Environment
ENV TRIGGERFISH_DATA_DIR=/data
ENV TRIGGERFISH_DOCKER=true

# Ports: gateway HTTP + WebSocket
EXPOSE 18789 18790

# Data volume mount point
VOLUME /data

# Distroless runs as nonroot (UID 65534) by default — no USER directive needed
# No tini — use `docker run --init` or `init: true` in compose
# No shell — binary is the entrypoint directly
ENTRYPOINT ["/usr/local/bin/triggerfish"]
CMD ["run"]

# ============================================================
# Stage 3: Debug variant (has BusyBox shell for troubleshooting)
# ============================================================
FROM gcr.io/distroless/cc-debian12:debug AS debug

COPY --from=builder /build/triggerfish /usr/local/bin/triggerfish

ENV TRIGGERFISH_DATA_DIR=/data
ENV TRIGGERFISH_DOCKER=true

EXPOSE 18789 18790
VOLUME /data

# Debug variant includes busybox shell at /busybox/sh
ENTRYPOINT ["/usr/local/bin/triggerfish"]
CMD ["run"]
