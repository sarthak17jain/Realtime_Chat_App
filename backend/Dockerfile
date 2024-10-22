FROM node:18-alpine

WORKDIR /usr/src/app

COPY package* .

RUN npm install

COPY . .

# Generate Prisma client
RUN npx prisma generate

# Expose a range of ports
EXPOSE 5001-5003

# Use a shell form to run multiple commands
CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]