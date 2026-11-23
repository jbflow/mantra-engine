FROM node:26-alpine

RUN apk add --no-cache git openssh-client

WORKDIR /app

COPY package*.json ./
COPY src ./src
COPY tsconfig.json ./

ENV NODE_ENV=development

EXPOSE 3000

CMD ["npm", "test"]
