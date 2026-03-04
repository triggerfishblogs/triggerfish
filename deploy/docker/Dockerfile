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
    --include skills/ \
    --include src/exec/sandbox/worker.ts \
    --include src/tools/tidepool/tmpl_base.html \
    --include src/tools/tidepool/tmpl_styles.html \
    --include src/tools/tidepool/tmpl_chat.html \
    --include src/tools/tidepool/tmpl_canvas.html \
    --include src/tools/tidepool/tmpl_chat_script.html \
    --include src/tools/tidepool/tmpl_canvas_script.html \
    --output=/build/triggerfish \
    src/cli/main.ts

# ============================================================
# Stage 2: Runtime — distroless for minimal attack surface
# Statically-linked Deno binary needs only glibc (cc variant).
# ============================================================
FROM gcr.io/distroless/cc-debian12 AS production

# Copy compiled binary from builder
COPY --from=builder /build/triggerfish /usr/local/bin/triggerfish

# Pre-create /data owned by nonroot (UID 65534)
COPY --from=builder --chown=65534:65534 /build/deno.json /data/.keep

# Environment
ENV TRIGGERFISH_DATA_DIR=/data
ENV TRIGGERFISH_DOCKER=true
# Deno FFI plugin cache needs a writable home; point it inside /data
ENV DENO_DIR=/data/.deno
ENV HOME=/data

# Ports: gateway HTTP + WebSocket
EXPOSE 18789 18790

VOLUME /data

# distroless default user is nonroot (UID 65534)
USER 65534:65534

ENTRYPOINT ["/usr/local/bin/triggerfish"]
CMD ["run"]

# ============================================================
# Stage 3: Debug variant — distroless debug image includes a shell
# ============================================================
FROM gcr.io/distroless/cc-debian12:debug AS debug

COPY --from=builder /build/triggerfish /usr/local/bin/triggerfish
COPY --from=builder --chown=65534:65534 /build/deno.json /data/.keep

ENV TRIGGERFISH_DATA_DIR=/data
ENV TRIGGERFISH_DOCKER=true
ENV DENO_DIR=/data/.deno
ENV HOME=/data

EXPOSE 18789 18790
VOLUME /data
USER 65534:65534

ENTRYPOINT ["/usr/local/bin/triggerfish"]
CMD ["run"]
