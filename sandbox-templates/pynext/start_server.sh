#!/bin/bash

# Function to check if server is running
function ping_server() {
    counter=0
    response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000")
    while [[ ${response} -ne 200 ]]; do
        let counter++
        if (( counter % 20 == 0 )); then
            echo "Waiting for server to start..."
            sleep 0.1
        fi
        response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000")
    done
}

# Start simple HTTP server in background
cd /home/user && http-server public -p 3000 -c-1 --cors &

# Wait for server to be ready
ping_server

echo "Static server running on http://localhost:3000"
echo "Landing page: http://localhost:3000/index.html"
echo "Presentation: http://localhost:3000/deck.html"
echo "Demos available at: http://localhost:3000/demos/"

# Keep the container running
wait