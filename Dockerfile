FROM ghcr.io/puppeteer/puppeteer:23.7.1

# Set environment variables for Puppeteer (skip Chromium download)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Temporarily switch to root user to set permissions correctly
USER root

# Ensure the files have the correct permissions (read/write access)
RUN chmod 755 /usr/src/app && chown -R node:node /usr/src/app

# Switch back to the 'node' user to run npm install
USER node

# Install dependencies
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Run the app
CMD ["node", "app.js"]
