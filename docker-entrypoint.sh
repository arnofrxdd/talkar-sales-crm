#!/bin/sh
set -e

echo "💼 [Talkar Sales CRM] Initializing container..."
mkdir -p /app/data

echo "📦 [Talkar Sales CRM] Deploying Prisma Database Schema..."
npx prisma db push --skip-generate

echo "🌱 [Talkar Sales CRM] Seeding multi-tenant companies and demo leads..."
npm run prisma:seed

echo "✨ [Talkar Sales CRM] Initialization complete! Serving on Port ${PORT:-7576}..."
exec "$@"
