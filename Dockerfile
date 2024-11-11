FROM ghcr.io/puppeteer/puppeteer:23.7.1

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable

# Set working directory
WORKDIR /usr/src/app

# Copy package.json
COPY package.json ./

# Run npm install
RUN npm install

# Copy the rest of the application code
COPY . .

# Set the command to start the app
CMD ["node", "app.js"]
