FROM node:18-alpine

WORKDIR /app

RUN mkdir -p /uploads/doctor-verification

COPY package.json package-lock.json* ./
RUN npm install --only=production

COPY . .

EXPOSE 3003

CMD ["npm", "start"]
