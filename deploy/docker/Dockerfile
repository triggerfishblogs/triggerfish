# Stage 1: Build — compile Triggerfish binary
FROM denoland/deno:2.1.4 AS builder

RUN apt-get update && apt-get install -y --no-install-recommends tini \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build

# Copy source files
COPY deno.json deno.lock* ./
COPY src/ src/
COPY config/ config/
COPY skills/ skills/

# Compile with bundled config and skills
RUN deno compile --allow-all \
    --include config/ \
    --include skills/ \
    --output=/build/triggerfish \
    src/cli/main.ts


# Stage 2: Runtime — distroless with tini
FROM gcr.io/distroless/cc-debian12:nonroot

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
