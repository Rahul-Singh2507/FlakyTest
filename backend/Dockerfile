FROM node:22-bookworm

ENV NODE_ENV=production
WORKDIR /app

COPY package.json package-lock.json ./
RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm ci --omit=dev \
    && npx playwright install --with-deps chromium

COPY src ./src
COPY data/mock-ticket.json ./data/mock-ticket.json
COPY data/mock-tickets ./data/mock-tickets

EXPOSE 3001
CMD ["npm", "start"]
