# Use Puppeteer base image which has all required dependencies
FROM ghcr.io/puppeteer/puppeteer:23.9.0

# Set working directory
WORKDIR /home/pptruser/app

# Copy package files
COPY --chown=pptruser:pptruser package.json package-lock.json ./

# Install app dependencies using lockfile for reproducibility
# Skip Puppeteer's Chromium download as the base image already has it
# Skip install scripts to avoid Chromium download
# Use build arg to allow SSL configuration without baking it into the image
ARG NPM_CONFIG_STRICT_SSL=true
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm ci --omit=dev --ignore-scripts

# Copy application source
COPY --chown=pptruser:pptruser src ./src

# Expose the application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
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
CMD ["node", "src/index.js"]
