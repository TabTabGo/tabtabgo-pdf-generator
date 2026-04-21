# Use Puppeteer base image which has all required dependencies
FROM ghcr.io/puppeteer/puppeteer:23.9.0

# Install LibreOffice + fonts for server-side DOCX/XML to PDF conversion
USER root
RUN apt-get update && \
        apt-get install -y --no-install-recommends \
            libreoffice \
            libreoffice-writer \
            ure \
            fontconfig \
            fonts-dejavu-core \
            fonts-dejavu-extra \
            fonts-liberation \
            fonts-liberation2 \
            fonts-crosextra-carlito \
            fonts-crosextra-caladea \
            fonts-noto-core \
            fonts-noto-extra \
            fonts-noto-cjk \
            fonts-noto-color-emoji && \
        rm -rf /var/lib/apt/lists/* && \
        fc-cache -f -v

# Set working directory
RUN mkdir -p /home/pptruser/app && chown -R pptruser:pptruser /home/pptruser/app
WORKDIR /home/pptruser/app
USER pptruser

# Copy package files
COPY --chown=pptruser:pptruser package.json package-lock.json tsconfig.json ./

# Install all dependencies (including devDependencies needed for build)
# Skip Puppeteer's Chromium download as the base image already has it
# Use build arg to allow SSL configuration without baking it into the image
ARG NPM_CONFIG_STRICT_SSL=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --ignore-scripts

# Copy application source and build TypeScript
COPY --chown=pptruser:pptruser src ./src
RUN npm run build

# Remove devDependencies after build
RUN npm prune --omit=dev

# Expose the application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
ENV LIBREOFFICE_PATH=/usr/bin/soffice
# Find and use Chrome installed in the base image (dynamically locate latest version)
# The base image installs Chrome in /home/pptruser/.cache/puppeteer/chrome/
# We'll set this at runtime via entrypoint to handle version changes gracefully

# Create entrypoint script to set Chrome path dynamically
RUN echo '#!/bin/sh' > /home/pptruser/entrypoint.sh && \
    echo 'CHROME_PATH=$(find /home/pptruser/.cache/puppeteer/chrome -name chrome -type f | head -n 1)' >> /home/pptruser/entrypoint.sh && \
    echo 'if [ -z "$CHROME_PATH" ]; then' >> /home/pptruser/entrypoint.sh && \
    echo '  echo "ERROR: Chrome executable not found in Puppeteer cache"' >> /home/pptruser/entrypoint.sh && \
    echo '  exit 1' >> /home/pptruser/entrypoint.sh && \
    echo 'fi' >> /home/pptruser/entrypoint.sh && \
    echo 'export PUPPETEER_EXECUTABLE_PATH="$CHROME_PATH"' >> /home/pptruser/entrypoint.sh && \
    echo 'exec "$@"' >> /home/pptruser/entrypoint.sh && \
    chmod +x /home/pptruser/entrypoint.sh

ENTRYPOINT ["/home/pptruser/entrypoint.sh"]

# The base image already sets up a non-root user (pptruser)
# Start the application
CMD ["node", "dist/index.js"]
