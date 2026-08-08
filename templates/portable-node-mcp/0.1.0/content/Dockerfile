ARG BUILDER_BASE=docker.io/library/node:22-slim@sha256:d649c27dae7ba0137b3cef5dd75baa422c08dc3d9e3fc0c23dfb172dc3cc6436
ARG RUNTIME_BASE=gcr.io/distroless/nodejs22-debian13:nonroot@sha256:939d6f1671529d230f50b563578e9b5d206af58f038b10ebd7e1233023d4e167

FROM ${BUILDER_BASE} AS builder
WORKDIR /workspace
COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts
COPY src ./src
COPY test ./test
RUN npm test \
    && npm prune --omit=dev \
    && mkdir -p /out \
    && cp -R package.json package-lock.json src /out/ \
    && test ! -e /out/test

FROM ${RUNTIME_BASE} AS runtime

ARG OCI_SOURCE="https://github.com/{{ hodos.repository }}"
ARG OCI_REVISION="unknown"
ARG OCI_VERSION="0.0.0-dev"
ARG OCI_CREATED="1970-01-01T00:00:00Z"

LABEL org.opencontainers.image.source="${OCI_SOURCE}" \
      org.opencontainers.image.revision="${OCI_REVISION}" \
      org.opencontainers.image.version="${OCI_VERSION}" \
      org.opencontainers.image.created="${OCI_CREATED}" \
      org.opencontainers.image.title="{{ hodos.name }}" \
      org.opencontainers.image.description="{{ hodos.description }}" \
      org.opencontainers.image.licenses="Apache-2.0" \
      org.opencontainers.image.vendor="HodosGraph"

WORKDIR /app
COPY --from=builder --chown=65532:65532 /out/ /app/

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8080

USER 65532:65532
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD ["/nodejs/bin/node", "-e", "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

CMD ["src/server.mjs"]
