FROM ghcr.io/puppeteer/puppeteer:23.7.1 
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true\
 PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable\
 NODE_ENV=production

WORKDIR /usr/src/app

COPY package*.json ./
RUN chmod -R 755 /usr/src/app && chown -R node:node /usr/src/app


RUN npm install

COPY . .
CMD ["node","app.js"]