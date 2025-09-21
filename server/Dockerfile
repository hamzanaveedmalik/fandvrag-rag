# Use Node.js 20 (LTS) as base image
FROM node:20-slim

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port (Cloud Run will set PORT env var)
EXPOSE 8080

# Start the application directly with tsx
CMD ["npx", "tsx", "src/index.ts"]
