# Lightweight base with both Node.js and Python
FROM node:21-slim

# Install Python, curl, and other essentials
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    curl \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Create Python alias
RUN ln -s /usr/bin/python3 /usr/bin/python

# Install common Python packages
RUN pip3 install numpy matplotlib pandas requests seaborn plotly --break-system-packages

# Install a simple HTTP server globally
RUN npm install -g http-server

# Set up working directory
WORKDIR /home/user

# Create public directory structure
RUN mkdir -p public/demos

COPY start_server.sh /start_server.sh
RUN chmod +x /start_server.sh