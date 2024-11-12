FROM ghcr.io/puppeteer/puppeteer:23.7.1

# Set environment variables for Puppeteer (skip Chromium download)
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Set working directory inside the container
WORKDIR /usr/src/app

# Update package lists and install Chromium
RUN apt-get update -y

# Try installing the packages one by one and capture error logs
RUN apt-get install -y chromium fonts-liberation libappindicator3-1 libasound2 libx11-xcb1 libxcomposite1 libxdamage1 libxrandr2 xdg-utils libgbm-dev --no-install-recommends || echo "Failed to install required packages"

# Clean up after installation to reduce image size
RUN rm -rf /var/lib/apt/lists/* 

# Copy package.json and package-lock.json into the container
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of the application code into the container
COPY . .

# Expose the port the app will run on (assuming it's 3000)
EXPOSE 3000

# Command to run the application
CMD ["node", "app.js"]
