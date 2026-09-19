FROM mcr.microsoft.com/playwright:v1.63.0-jammy

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the code
COPY . .

# Expose port
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
