# Build stage
FROM node:20-slim as builder

WORKDIR /app

# Copy package files and tsconfig
COPY package*.json tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY src/ ./src/

# Build TypeScript code
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files and built files
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install production dependencies only
RUN npm install --production

# Create a non-root user
RUN useradd -r -u 1001 -g root appuser
USER appuser

# Add healthcheck
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "process.exit(0)"

# Run the application
CMD ["npm", "start"] 