FROM node:22-slim

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./

# Install dependencies
RUN npm ci --no-audit --legacy-peer-deps

# Copy the rest of the code
COPY . .

# Expose Next.js development port
EXPOSE 3000

# Start Next.js in development mode
CMD ["npm", "run", "dev"]
