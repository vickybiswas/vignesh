FROM node:23-alpine

WORKDIR /app


CMD ["npm","install", "-f", "&&", "npm", "run", "dev"]
