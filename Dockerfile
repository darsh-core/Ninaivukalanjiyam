# Multi-stage production Dockerfile for NinaivuKalanjiyam
# 1. Build React Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# 2. Production Runtime
FROM node:20-alpine AS runner
WORKDIR /app

# Install ffmpeg for audio slicing
RUN apk add --no-cache ffmpeg

# Install backend dependencies
WORKDIR /app/backend
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source & database migrations
COPY backend/ ./
COPY database/ /app/database/

# Copy built frontend dist from stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Expose default port
EXPOSE 5002

ENV NODE_ENV=production
ENV PORT=5002

CMD ["node", "src/server.js"]
