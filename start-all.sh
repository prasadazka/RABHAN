#!/bin/bash

# RABHAN Solar BNPL Platform - Complete Startup Script (Linux/macOS)
# Usage: ./start-all.sh

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

# Emojis for better UX
ROCKET="🚀"
CHECK="✅"
CROSS="❌"
GEAR="🔧"
HEALTH="🏥"
WEB="🌐"
SHIELD="🔐"
USERS="👥"
DOCS="📁"
BUILDER="🏗️"
SUN="🌞"
ADMIN="⚙️"
SHOP="🛒"
PROXY="📂"
COMPUTER="💻"
DASHBOARD="🔧"

echo
echo "===================================================="
echo "${ROCKET} RABHAN Solar BNPL Platform - Complete Startup"
echo "===================================================="
echo

# Set environment variables
export NODE_ENV=development
export FORCE_COLOR=1

echo "${GEAR} Checking prerequisites..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "${CROSS} Node.js is not installed or not in PATH"
    echo "Please install Node.js and try again"
    exit 1
fi

echo "${CHECK} Node.js found: $(node --version)"

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "${CROSS} npm is not available"
    exit 1
fi

echo "${CHECK} npm found: $(npm --version)"

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo
echo "${GEAR} Installing dependencies if needed..."

# Function to install dependencies if node_modules doesn't exist
install_if_needed() {
    local dir="$1"
    local service_name="$2"
    
    if [ -d "$dir" ]; then
        cd "$dir"
        if [ ! -d "node_modules" ]; then
            echo "Installing dependencies for $service_name..."
            npm install
        fi
    else
        echo "${YELLOW} Warning: Directory $dir not found for $service_name${NC}"
    fi
}

# Install backend service dependencies
echo "Installing backend service dependencies..."
install_if_needed "$SCRIPT_DIR/backend/services/auth-service" "Auth Service"
install_if_needed "$SCRIPT_DIR/backend/services/user-service" "User Service"
install_if_needed "$SCRIPT_DIR/backend/services/contractor-service" "Contractor Service"
install_if_needed "$SCRIPT_DIR/backend/services/admin-service" "Admin Service"
install_if_needed "$SCRIPT_DIR/backend/services/document-service" "Document Service"
install_if_needed "$SCRIPT_DIR/backend/services/solar-calculator-service" "Solar Calculator"
install_if_needed "$SCRIPT_DIR/backend/services/marketplace-service" "Marketplace Service"
install_if_needed "$SCRIPT_DIR/backend/services/document-proxy-service" "Document Proxy"

# Install frontend dependencies
echo "Installing frontend dependencies..."
install_if_needed "$SCRIPT_DIR/frontend/rabhan-web" "Web App"
install_if_needed "$SCRIPT_DIR/frontend/admin-dashboard" "Admin Dashboard"

echo
echo "${ROCKET} Starting all RABHAN services and applications..."
echo

# Create logs directory if it doesn't exist
mkdir -p logs

# Function to start a service in the background
start_service() {
    local service_dir="$1"
    local service_name="$2"
    local port="$3"
    local emoji="$4"
    
    echo "${emoji} Starting $service_name (Port $port)..."
    
    if [ -d "$service_dir" ]; then
        cd "$service_dir"
        
        # Start service in background and redirect output to log file
        npm run dev > "../../../logs/${service_name,,}-$port.log" 2>&1 &
        local pid=$!
        echo $pid > "../../../logs/${service_name,,}-$port.pid"
        
        echo "  ${CHECK} $service_name started with PID $pid"
        sleep 2
    else
        echo "  ${YELLOW} Warning: $service_dir not found, skipping $service_name${NC}"
    fi
}

# Start all backend services
echo "📊 Backend Services:"
echo "================================"
start_service "$SCRIPT_DIR/backend/services/auth-service" "Auth Service" "3001" "${SHIELD}"
start_service "$SCRIPT_DIR/backend/services/user-service" "User Service" "3002" "${USERS}"
start_service "$SCRIPT_DIR/backend/services/document-service" "Document Service" "3003" "${DOCS}"
start_service "$SCRIPT_DIR/backend/services/contractor-service" "Contractor Service" "3004" "${BUILDER}"
start_service "$SCRIPT_DIR/backend/services/solar-calculator-service" "Solar Calculator" "3005" "${SUN}"
start_service "$SCRIPT_DIR/backend/services/admin-service" "Admin Service" "3006" "${ADMIN}"
start_service "$SCRIPT_DIR/backend/services/marketplace-service" "Marketplace Service" "3007" "${SHOP}"
start_service "$SCRIPT_DIR/backend/services/document-proxy-service" "Document Proxy" "3008" "${PROXY}"

echo
echo "⏳ Waiting for services to initialize..."
sleep 10

echo
echo "${WEB} Starting Frontend Applications..."
echo

# Start frontend applications
echo "🌐 Frontend Applications:"
echo "================================"
start_service "$SCRIPT_DIR/frontend/rabhan-web" "Web App" "3000" "${COMPUTER}"
start_service "$SCRIPT_DIR/frontend/admin-dashboard" "Admin Dashboard" "3010" "${DASHBOARD}"

echo
echo "${CHECK} All services and applications are starting up!"
echo

echo "📊 Service Status:"
echo "================================"
echo "${SHIELD} Auth Service:           http://localhost:3001/health"
echo "${USERS} User Service:           http://localhost:3002/health"
echo "${DOCS} Document Service:       http://localhost:3003/health"
echo "${BUILDER} Contractor Service:     http://localhost:3004/health"
echo "${SUN} Solar Calculator:       http://localhost:3005/health"
echo "${ADMIN} Admin Service:          http://localhost:3006/health"
echo "${SHOP} Marketplace Service:    http://localhost:3007/health"
echo "${PROXY} Document Proxy:         http://localhost:3008/health"
echo
echo "🌐 Frontend Applications:"
echo "================================"
echo "${COMPUTER} Main Web App:           http://localhost:3000"
echo "${DASHBOARD} Admin Dashboard:        http://localhost:3010"
echo

echo "⏳ Waiting 30 seconds for all services to fully initialize..."
sleep 30

# Run health checks
echo
echo "${HEALTH} Running Health Checks..."
echo

if [ -f "$SCRIPT_DIR/scripts/health-check.sh" ]; then
    bash "$SCRIPT_DIR/scripts/health-check.sh"
else
    echo "${YELLOW} Health check script not found, skipping...${NC}"
fi

echo
echo "🎉 RABHAN Platform is now running!"
echo
echo "📖 Quick Start Guide:"
echo "================================"
echo "1. Main Application: http://localhost:3000"
echo "2. Admin Dashboard:  http://localhost:3010"
echo "3. API Documentation: Available at each service's /docs endpoint"
echo "4. Logs: Check logs/ directory for service logs"
echo
echo "🛑 To stop all services, run: ./stop-all.sh"
echo "📊 To check status, run: ./scripts/health-check.sh"
echo "📋 To view logs, run: tail -f logs/*.log"
echo

echo "Press Ctrl+C to stop monitoring, or run ./stop-all.sh to stop all services"

# Keep script running to monitor services
trap 'echo "Use ./stop-all.sh to properly stop all services"; exit 0' INT

# Monitor services
while true; do
    sleep 60
    echo "$(date): All services running... (Use Ctrl+C to exit monitoring)"
done