# Use the official Puppeteer image with Chromium bundled
FROM ghcr.io/puppeteer/puppeteer:23.7.1

# Set environment variables for Puppeteer (skip Chromium download)
# We'll use the system-installed Chromium instead
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set working directory inside the container
WORKDIR /usr/src/app

# Install Chromium and its dependencies (to run Puppeteer in headless mode)
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-liberation \
    libappindicator3-1 \
    libasound2 \
    libx11-xcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    xdg-utils \
    libgbm-dev \  
    # Adding libgbm-dev for graphics handling (important for Chromium)
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*  # Clean up apt cache to reduce image size

# Copy package.json and package-lock.json into the container (for npm install)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Expose the port the app will run on (assuming it's 3000)
EXPOSE 3000

# Command to run the application (assuming 'app.js' is the entry point)
CMD ["node", "app.js"]
