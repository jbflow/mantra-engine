FROM node:26-alpine

RUN apk add --no-cache git

WORKDIR /app

COPY package*.json ./
<<<<<<< HEAD
COPY src ./src
COPY tsconfig.json ./

RUN npm ci

EXPOSE 3000

CMD ["npm", "test"]
=======
COPY tsconfig.json ./
COPY src ./src
COPY tests ./tests

RUN npm ci

EXPOSE 1979

CMD ["npm", "run", "server"]
>>>>>>> 08346e6 (remove mantra-remote script from engine)
