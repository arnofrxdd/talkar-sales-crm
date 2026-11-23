FROM node:20-alpine

WORKDIR /app

# Install OpenSSL for Prisma engine on Alpine Linux
RUN apk add --no-cache openssl wget

# Copy package descriptors
COPY package*.json ./
COPY prisma ./prisma/

# Install production and development dependencies needed for TypeScript execution
RUN npm ci

# Generate Prisma client
RUN npx prisma generate

# Copy source code and config
COPY tsconfig.json ./
COPY src ./src/
COPY docker-entrypoint.sh ./

RUN chmod +x ./docker-entrypoint.sh

# Unique default port 7576 for sales CRM deployment
ENV NODE_ENV=production
ENV PORT=7576
ENV HOST=0.0.0.0
ENV DOMAIN=salescrm.talkar.in
ENV DATABASE_URL="file:/app/data/sales.db"

EXPOSE 7576

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["npm", "start"]
