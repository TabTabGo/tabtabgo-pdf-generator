# Use Puppeteer base image which has all required dependencies
FROM ghcr.io/puppeteer/puppeteer:23.9.0

# Set working directory
WORKDIR /home/pptruser/app

# Copy package.json only first
COPY --chown=pptruser:pptruser package.json ./

# Install app dependencies without lockfile to avoid npm ci issues
# Skip Puppeteer's Chromium download as the base image already has it
# NOTE: strict-ssl is disabled as a workaround for build environment certificate issues
# In production environments with proper certificates, remove the npm config line
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm config set strict-ssl false && \
    npm install --omit=dev --ignore-scripts --no-package-lock

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
    echo 'export PUPPETEER_EXECUTABLE_PATH=$(find /home/pptruser/.cache/puppeteer/chrome -name chrome -type f | head -n 1)' >> /home/pptruser/entrypoint.sh && \
    echo 'exec "$@"' >> /home/pptruser/entrypoint.sh && \
    chmod +x /home/pptruser/entrypoint.sh

ENTRYPOINT ["/home/pptruser/entrypoint.sh"]

# The base image already sets up a non-root user (pptruser)
# Start the application
CMD ["node", "src/index.js"]
