#!/bin/bash

# Simple script to start the Node.js image gallery server

# Optional: go to the script's directory
cd "$(dirname "$0")"

# Start server
echo "Starting Node.js server on http://localhost:3500"
node server.js
