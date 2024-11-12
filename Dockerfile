FROM ghcr.io/puppeteer/puppeteer:23.7.1

# Environment variables to skip Chromium download and set executable path
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set working directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Fix permissions for package files before installing dependencies
RUN chmod -R 755 /usr/src/app && \
    chown -R node:node /usr/src/app

# Switch to the node user (if Render uses 'node' as the default user)
USER node

# Run npm install as the node user
RUN npm install

# Copy the rest of the application code
COPY . .

# Default command to run the app
CMD ["node", "app.js"]
