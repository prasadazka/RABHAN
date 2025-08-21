#!/bin/bash

# RABHAN Platform - Individual Service Launcher
# Usage: ./scripts/start-individual.sh [service-name]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emojis
TOOLS="🔧"
CHECK="✅"
CROSS="❌"
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
echo "${TOOLS} RABHAN Platform - Individual Service Launcher"
echo "===================================================="
echo

if [ -z "$1" ]; then
    echo "Usage: ./scripts/start-individual.sh [service-name]"
    echo
    echo "Available services:"
    echo "================================"
    echo "${SHIELD} auth          - Auth Service (Port 3001)"
    echo "${USERS} user          - User Service (Port 3002)"
    echo "${DOCS} document      - Document Service (Port 3003)"
    echo "${BUILDER} contractor    - Contractor Service (Port 3004)"
    echo "${SUN} calculator    - Solar Calculator Service (Port 3005)"
    echo "${ADMIN} admin         - Admin Service (Port 3006)"
    echo "${SHOP} marketplace   - Marketplace Service (Port 3007)"
    echo "${PROXY} document-proxy - Document Proxy Service (Port 3008)"
    echo "${COMPUTER} web           - Main Web App (Port 3000)"
    echo "${DASHBOARD} admin-dash    - Admin Dashboard (Port 3010)"
    echo
    echo "Examples:"
    echo "  ./scripts/start-individual.sh auth"
    echo "  ./scripts/start-individual.sh web"
    echo "  ./scripts/start-individual.sh calculator"
    echo
    exit 1
fi

SERVICE="$1"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Create logs directory if it doesn't exist
mkdir -p "$PROJECT_DIR/logs"

# Function to start a service
start_service() {
    local service_dir="$1"
    local service_name="$2"
    local port="$3"
    local emoji="$4"
    
    echo "${emoji} Starting $service_name (Port $port)..."
    
    if [ ! -d "$service_dir" ]; then
        echo "${CROSS} Directory not found: $service_dir"
        exit 1
    fi
    
    cd "$service_dir"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        echo "${CROSS} package.json not found in $service_dir"
        exit 1
    fi
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies for $service_name..."
        npm install
    fi
    
    # Check if port is already in use
    if lsof -i:$port >/dev/null 2>&1; then
        echo "${YELLOW}Warning: Port $port is already in use${NC}"
        echo "Do you want to continue anyway? (y/N)"
        read -r response
        if [[ ! "$response" =~ ^[Yy]$ ]]; then
            echo "Cancelled."
            exit 1
        fi
    fi
    
    # Start service in background
    echo "Starting $service_name..."
    npm run dev > "$PROJECT_DIR/logs/${service_name,,}-$port.log" 2>&1 &
    local pid=$!
    echo $pid > "$PROJECT_DIR/logs/${service_name,,}-$port.pid"
    
    echo "${CHECK} $service_name started with PID $pid"
    echo "📋 Logs: tail -f $PROJECT_DIR/logs/${service_name,,}-$port.log"
    echo "🌐 URL: http://localhost:$port"
    
    # Wait a moment and check if process is still running
    sleep 3
    if ps -p $pid > /dev/null 2>&1; then
        echo "${CHECK} $service_name is running successfully"
    else
        echo "${CROSS} $service_name failed to start. Check logs for details."
        cat "$PROJECT_DIR/logs/${service_name,,}-$port.log"
        exit 1
    fi
}

case "$SERVICE" in
    "auth")
        start_service "$PROJECT_DIR/backend/services/auth-service" "Auth Service" "3001" "${SHIELD}"
        ;;
    "user")
        start_service "$PROJECT_DIR/backend/services/user-service" "User Service" "3002" "${USERS}"
        ;;
    "document")
        start_service "$PROJECT_DIR/backend/services/document-service" "Document Service" "3003" "${DOCS}"
        ;;
    "contractor")
        start_service "$PROJECT_DIR/backend/services/contractor-service" "Contractor Service" "3004" "${BUILDER}"
        ;;
    "calculator")
        start_service "$PROJECT_DIR/backend/services/solar-calculator-service" "Solar Calculator" "3005" "${SUN}"
        ;;
    "admin")
        start_service "$PROJECT_DIR/backend/services/admin-service" "Admin Service" "3006" "${ADMIN}"
        ;;
    "marketplace")
        start_service "$PROJECT_DIR/backend/services/marketplace-service" "Marketplace Service" "3007" "${SHOP}"
        ;;
    "document-proxy")
        start_service "$PROJECT_DIR/backend/services/document-proxy-service" "Document Proxy" "3008" "${PROXY}"
        ;;
    "web")
        start_service "$PROJECT_DIR/frontend/rabhan-web" "Web App" "3000" "${COMPUTER}"
        ;;
    "admin-dash")
        start_service "$PROJECT_DIR/frontend/admin-dashboard" "Admin Dashboard" "3010" "${DASHBOARD}"
        ;;
    *)
        echo "${CROSS} Unknown service: $SERVICE"
        echo
        echo "Available services: auth, user, document, contractor, calculator, admin, marketplace, document-proxy, web, admin-dash"
        exit 1
        ;;
esac

echo
echo "🔍 To check service health: ./scripts/health-check.sh"
echo "🛑 To stop this service: kill $(cat "$PROJECT_DIR/logs/${SERVICE,,}-*.pid" 2>/dev/null | head -1)"
echo "🔄 To restart all services: ./start-all.sh"
echo