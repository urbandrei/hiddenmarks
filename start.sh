#!/bin/bash

# Hidden Marks Startup Script
# This script helps you start the application

set -e

echo "🎮 Hidden Marks - Startup Script"
echo "================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is available
if command -v docker-compose &> /dev/null || command -v docker &> /dev/null; then
    echo -e "${GREEN}✓${NC} Docker detected"
    echo ""
    echo "Starting with Docker..."
    echo ""

    if command -v docker-compose &> /dev/null; then
        docker-compose up -d
    else
        docker compose up -d
    fi

    echo ""
    echo -e "${GREEN}✓${NC} Services started!"
    echo ""
    echo "Access the game at:"
    echo "  Frontend: ${GREEN}http://localhost:3000${NC}"
    echo "  Backend:  ${GREEN}http://localhost:5000${NC}"
    echo ""
    echo "To view logs:"
    echo "  docker-compose logs -f"
    echo ""
    echo "To stop:"
    echo "  docker-compose down"
    echo ""
    exit 0
fi

# Docker not available, try manual setup
echo -e "${YELLOW}!${NC} Docker not found - trying manual setup..."
echo ""

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}✗${NC} Node.js not found"
    echo "Please install Node.js 16+ from https://nodejs.org/"
    exit 1
fi
echo -e "${GREEN}✓${NC} Node.js detected: $(node --version)"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi
echo -e "${GREEN}✓${NC} npm detected: $(npm --version)"

# Check for PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}!${NC} PostgreSQL not found"
    echo "Please install PostgreSQL 12+ from https://www.postgresql.org/"
    echo ""
    echo "Or use Docker instead:"
    echo "  docker-compose up -d"
    exit 1
fi
echo -e "${GREEN}✓${NC} PostgreSQL detected"

# Check if database exists
if psql -lqt | cut -d \| -f 1 | grep -qw hiddenmarks; then
    echo -e "${GREEN}✓${NC} Database 'hiddenmarks' exists"
else
    echo -e "${YELLOW}!${NC} Creating database 'hiddenmarks'..."
    createdb hiddenmarks

    echo "Initializing schema..."
    psql hiddenmarks < server/database/schema.sql
    echo -e "${GREEN}✓${NC} Database initialized"
fi

# Check if dependencies are installed
if [ ! -d "server/node_modules" ]; then
    echo ""
    echo "Installing server dependencies..."
    cd server && npm install && cd ..
    echo -e "${GREEN}✓${NC} Server dependencies installed"
else
    echo -e "${GREEN}✓${NC} Server dependencies already installed"
fi

if [ ! -d "client/node_modules" ]; then
    echo ""
    echo "Installing client dependencies..."
    cd client && npm install && cd ..
    echo -e "${GREEN}✓${NC} Client dependencies installed"
else
    echo -e "${GREEN}✓${NC} Client dependencies already installed"
fi

# Start the services
echo ""
echo "Starting services..."
echo ""
echo -e "${YELLOW}Note:${NC} You'll need to keep this terminal open"
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Stopping services..."
    kill $SERVER_PID $CLIENT_PID 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM

# Start backend
cd server
npm run dev &
SERVER_PID=$!
cd ..

# Wait a bit for backend to start
sleep 3

# Start frontend
cd client
npm start &
CLIENT_PID=$!
cd ..

echo ""
echo -e "${GREEN}✓${NC} Services started!"
echo ""
echo "Access the game at:"
echo "  Frontend: ${GREEN}http://localhost:3000${NC}"
echo "  Backend:  ${GREEN}http://localhost:5000${NC}"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait
