FROM node:14
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
ENV MONGODB_URL mongodb://127.0.0.1:27017/
CMD ["npm", "run", "start"]
