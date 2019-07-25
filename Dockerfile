FROM node:latest

LABEL name="image-bucket"
LABEL maintainer="pikachu"

WORKDIR /bucket

COPY package*.json ./
RUN npm install

COPY . .

VOLUME /screenshots

CMD ["node", "index.js", "./screenshots"]
