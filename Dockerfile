FROM node:26-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./
COPY src ./src
COPY tsconfig.json ./

RUN npm ci

EXPOSE 3000

CMD ["npm", "test"]
