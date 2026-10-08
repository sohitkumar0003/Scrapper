FROM mcr.microsoft.com/playwright:v1.63.0-noble

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY src/server ./src/server
COPY src/scraper ./src/scraper

ENV NODE_ENV=production

CMD ["npm", "run", "server"]
