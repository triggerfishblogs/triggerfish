# Stage 1: Build — compile Triggerfish binary
FROM docker.io/denoland/deno:2.6.8 AS builder

ARG TARGETARCH=amd64
RUN apt-get update \
    && apt-get install -y --no-install-recommends wget ca-certificates \
    && wget -qO /usr/bin/tini "https://github.com/krallin/tini/releases/download/v0.19.0/tini-static-${TARGETARCH}" \
    && chmod +x /usr/bin/tini \
    && apt-get purge -y wget \
    && rm -rf /var/lib/apt/lists/*

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


# Stage 2: Runtime — minimal Debian matching builder glibc
FROM docker.io/debian:trixie-slim

# Create nonroot user
RUN groupadd -r nonroot && useradd -r -g nonroot -d /data -s /sbin/nologin nonroot \
    && mkdir -p /data && chown nonroot:nonroot /data

# Copy tini from builder
COPY --from=builder /usr/bin/tini /usr/bin/tini

# Copy compiled binary
COPY --from=builder /build/triggerfish /usr/local/bin/triggerfish

# Environment
ENV TRIGGERFISH_DATA_DIR=/data
ENV TRIGGERFISH_DOCKER=true

# Ports: gateway HTTP + WebSocket
EXPOSE 18789 18790

# Data volume mount point
VOLUME /data

USER nonroot

ENTRYPOINT ["/usr/bin/tini", "--", "/usr/local/bin/triggerfish"]
CMD ["run"]
