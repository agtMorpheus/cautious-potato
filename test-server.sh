#!/bin/bash

# Simple test server script
echo "Starting local development server..."
echo "Open your browser to: http://localhost:8080"
echo "Test files available:"
echo "  - http://localhost:8080/test-module-import.html"
echo "  - http://localhost:8080/test-stromkreise-final.html"
echo "  - http://localhost:8080/index.html"
echo ""
echo "Press Ctrl+C to stop the server"

python3 -m http.server 8080