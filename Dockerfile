FROM node:latest

LABEL name="image-bucket"
LABEL maintainer="pikachu"

WORKDIR /image-bucket

COPY package*.json ./
RUN npm install

COPY . .

VOLUME /screenshots
