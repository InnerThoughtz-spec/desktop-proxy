# syntax=docker/dockerfile:1.7
#
# Production image for desktop-proxy. Multi-stage so the runtime layer doesn't
# carry a full toolchain, and uses a non-root user for the app process.

# ---- deps ---------------------------------------------------------------
FROM node:20-alpine AS deps
WORKDIR /app

# Alpine node ships without the build tools some native deps occasionally
# need; add them only in the deps stage, not in the runtime image.
RUN apk add --no-cache python3 make g++

COPY package.json package-lock.json* ./
RUN npm ci --omit=dev --no-audit --no-fund

# ---- runtime ------------------------------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/app/data

# tini reaps zombies + forwards SIGTERM/SIGINT so `docker stop` is graceful.
RUN apk add --no-cache tini \
 && addgroup -S app && adduser -S app -G app \
 && mkdir -p /app/data/wallpapers \
 && chown -R app:app /app

COPY --from=deps --chown=app:app /app/node_modules ./node_modules
COPY --chown=app:app server.js ./server.js
COPY --chown=app:app package.json package-lock.json* ./
COPY --chown=app:app public ./public

USER app

EXPOSE 8080

# Persist uploaded wallpapers across container restarts.
VOLUME ["/app/data"]

HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "server.js"]
