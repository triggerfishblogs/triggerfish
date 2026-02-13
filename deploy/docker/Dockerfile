# Stage 1: Build — compile Triggerfish binary
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


# Stage 2: Runtime — minimal Debian matching builder glibc
FROM docker.io/debian:trixie-slim

# Install tini from Debian repos + create nonroot user
RUN apt-get update \
    && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd -r nonroot && useradd -r -g nonroot -d /data -s /sbin/nologin nonroot \
    && mkdir -p /data && chown nonroot:nonroot /data

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

ENTRYPOINT ["tini", "--", "/usr/local/bin/triggerfish"]
CMD ["run"]
