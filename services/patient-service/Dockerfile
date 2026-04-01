FROM node:18-alpine

WORKDIR /app

RUN mkdir -p /app/uploads/medical-records

COPY package.json package-lock.json* ./
RUN npm install --only=production

COPY . .

EXPOSE 3002

CMD ["npm", "start"]
