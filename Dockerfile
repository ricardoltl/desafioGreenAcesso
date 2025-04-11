FROM node:20.18.0-alpine

WORKDIR /usr/src/app
RUN apk add --no-cache bash

ADD https://raw.githubusercontent.com/vishnubob/wait-for-it/master/wait-for-it.sh /usr/local/bin/wait-for-it.sh
RUN chmod +x /usr/local/bin/wait-for-it.sh

COPY package*.json ./

RUN npm install

COPY tsconfig.json .
COPY ./src ./src
COPY migrations ./migrations
COPY seeders ./seeders

RUN npm run build


EXPOSE ${PORT:-3000}

CMD [ "node", "dist/server.js" ]