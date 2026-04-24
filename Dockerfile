# Single-container image for Azure App Service:
# - Node API on port 3000
# - Puppeteer/Chrome for HTML to PDF
# - ONLYOFFICE Document Server for DOCX/XML to PDF
#
# ONLYOFFICE is a full document server, so this image is intentionally larger
# than a browser-only API image. Keep Azure WEBSITES_PORT set to 3000.

ARG PUPPETEER_IMAGE=ghcr.io/puppeteer/puppeteer:24.36.0
ARG ONLYOFFICE_IMAGE=onlyoffice/documentserver:9.3.1
FROM ${PUPPETEER_IMAGE} AS puppeteer-browser

FROM node:22-bookworm-slim AS app-build

WORKDIR /app

COPY package.json package-lock.json tsconfig.json ./

# The final image gets Chrome from the Puppeteer image stage.
ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN npm ci

COPY src ./src
RUN npm run build && npm prune --omit=dev

FROM ${ONLYOFFICE_IMAGE}

USER root

ENV NODE_ENV=production \
    PORT=3000 \
    ONLYOFFICE_DOCUMENT_SERVER_URL=http://127.0.0.1 \
    OFFICE_DOCUMENT_FETCH_BASE_URL=http://127.0.0.1:3000 \
    ONLYOFFICE_REQUEST_TIMEOUT_MS=120000 \
    ALLOW_PRIVATE_IP_ADDRESS=true \
    PUPPETEER_SKIP_DOWNLOAD=true

# curl is needed for the ONLYOFFICE healthcheck in the startup script.
# Node.js is copied from the build stage rather than installed via apt to ensure
# version consistency: the apt repos on the base image ship a much older Node.
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy the full Node.js installation (binary + npm/npx + ICU data + headers)
# rather than just the bare `node` binary so that any future base-image change
# that alters shared-library versions does not silently break the runtime.
COPY --from=app-build /usr/local /usr/local

WORKDIR /opt/tabtabgo-pdf-generator

# Order layers from most stable to most frequently changed for better cache reuse.
COPY --from=puppeteer-browser /home/pptruser/.cache/puppeteer/chrome /opt/puppeteer/.cache/puppeteer/chrome
COPY --from=app-build /app/node_modules ./node_modules
COPY --from=app-build /app/package.json ./package.json
COPY --chmod=755 scripts/start-onlyoffice-single-container.sh /usr/local/bin/start-onlyoffice-single-container

# dist changes on every code push; keep it last so layers above stay cached.
COPY --from=app-build /app/dist ./dist

EXPOSE 3000

ENTRYPOINT ["/usr/local/bin/start-onlyoffice-single-container"]
