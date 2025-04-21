FROM node:23-alpine

WORKDIR /app

RUN npm install -f

CMD ["npm", "run", "dev"]
