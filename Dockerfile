# Use Puppeteer base image which has all required dependencies
FROM ghcr.io/puppeteer/puppeteer:23.9.0

# Set working directory
WORKDIR /home/pptruser/app

# Copy package.json only first
COPY --chown=pptruser:pptruser package.json ./

# Install app dependencies without lockfile to avoid npm ci issues
# Skip Puppeteer's Chromium download as the base image already has it
# Disable strict SSL to work around certificate issues in build environment
ENV PUPPETEER_SKIP_DOWNLOAD=true
RUN npm config set strict-ssl false && \
    npm install --omit=dev --ignore-scripts --no-package-lock

# Copy application source
COPY --chown=pptruser:pptruser src ./src

# Expose the application port
EXPOSE 3000

# Set environment variables
ENV NODE_ENV=production
# Point to Chrome installed in the base image
ENV PUPPETEER_EXECUTABLE_PATH=/home/pptruser/.cache/puppeteer/chrome/linux-131.0.6778.85/chrome-linux64/chrome

# The base image already sets up a non-root user (pptruser)
# Start the application
CMD ["node", "src/index.js"]
