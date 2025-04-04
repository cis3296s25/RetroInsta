# Use Node.js as the base image
FROM node:latest

# Set the working directory
WORKDIR /app

# Copy package.json and install dependencies
COPY package.json package-lock.json ./
RUN npm install --frozen-lockfile

# Install react-oauth, react-router and mui material packages
RUN npm install @react-oauth/google
RUN npm install react-router-dom @types/react-router-dom
RUN npm install @mui/material @mui/icons-material @emotion/react @emotion/styled


# Copy the rest of the app's source code
COPY . .

# Expose the Vite development server's port
EXPOSE 5173

# Start Vite in development mode
CMD ["npm", "run", "dev", "--", "--host"]
