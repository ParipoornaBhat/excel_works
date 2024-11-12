FROM ghcr.io/puppeteer/puppeteer:23.7.1

# Set environment variables for Puppeteer (skip Chromium download)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set working directory inside the container
WORKDIR /usr/src/app

# Install Chromium
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
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Expose port


# Run the app
CMD ["node", "app.js"]
