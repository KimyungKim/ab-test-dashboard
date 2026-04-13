FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY public ./public
COPY src ./src
COPY server.mjs ./

EXPOSE 3001

CMD ["node", "server.mjs"]
