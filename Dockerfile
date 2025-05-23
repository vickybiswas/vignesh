FROM node:23-alpine

WORKDIR /app
COPY ./package.json /app/
RUN npm install -f

CMD ["npm", "run", "dev"]
