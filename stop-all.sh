#!/bin/bash

# RABHAN Solar BNPL Platform - Shutdown Script (Linux/macOS)
# Usage: ./stop-all.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emojis
STOP="🛑"
CHECK="✅"
WARNING="⚠️"
SEARCH="🔍"
CLEAN="🧹"

echo
echo "===================================================="
echo "${STOP} RABHAN Platform - Shutdown All Services"
echo "===================================================="
echo

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "${SEARCH} Finding and stopping RABHAN processes..."

# Function to stop processes by PID file
stop_by_pid_file() {
    local service_name="$1"
    local pid_file="$SCRIPT_DIR/logs/${service_name,,}.pid"
    
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if ps -p $pid > /dev/null 2>&1; then
            echo "Stopping $service_name (PID: $pid)..."
            kill -TERM $pid 2>/dev/null
            
            # Wait up to 10 seconds for graceful shutdown
            local count=0
            while ps -p $pid > /dev/null 2>&1 && [ $count -lt 10 ]; do
                sleep 1
                ((count++))
            done
            
            # Force kill if still running
            if ps -p $pid > /dev/null 2>&1; then
                echo "Force killing $service_name..."
                kill -KILL $pid 2>/dev/null
            fi
            
            echo "${CHECK} $service_name stopped"
        fi
        rm -f "$pid_file"
    fi
}

# Function to stop processes by port
stop_by_port() {
    local port="$1"
    local service_name="$2"
    
    local pid=$(lsof -t -i:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "Stopping $service_name on port $port (PID: $pid)..."
        kill -TERM $pid 2>/dev/null
        
        # Wait for graceful shutdown
        sleep 2
        
        # Force kill if still running
        if ps -p $pid > /dev/null 2>&1; then
            echo "Force killing $service_name..."
            kill -KILL $pid 2>/dev/null
        fi
        
        echo "${CHECK} $service_name stopped"
    fi
}

# Stop services using PID files first
echo "Stopping services using PID files..."
for pid_file in "$SCRIPT_DIR/logs/"*.pid; do
    if [ -f "$pid_file" ]; then
        local basename=$(basename "$pid_file" .pid)
        local service_name=$(echo "$basename" | sed 's/-[0-9]*$//')
        stop_by_pid_file "$service_name"
    fi
done

# Stop services by port as backup
echo "Stopping any remaining services by port..."
stop_by_port 3000 "Web App"
stop_by_port 3001 "Auth Service"
stop_by_port 3002 "User Service"
stop_by_port 3003 "Document Service"
stop_by_port 3004 "Contractor Service"
stop_by_port 3005 "Solar Calculator"
stop_by_port 3006 "Admin Service"
stop_by_port 3007 "Marketplace Service"
stop_by_port 3008 "Document Proxy"
stop_by_port 3010 "Admin Dashboard"

# Clean up any remaining Node.js processes related to RABHAN
echo "${CLEAN} Cleaning up remaining RABHAN processes..."
pkill -f "rabhan" 2>/dev/null || true
pkill -f "npm.*dev" 2>/dev/null || true

# Clean up PID files
echo "Cleaning up PID files..."
rm -f "$SCRIPT_DIR/logs/"*.pid

echo
echo "${CHECK} All RABHAN services have been stopped!"
echo

# Verify shutdown
echo "📊 Verifying shutdown..."

ports=(3000 3001 3002 3003 3004 3005 3006 3007 3008 3010)
service_names=("Web App" "Auth Service" "User Service" "Document Service" "Contractor Service" "Solar Calculator" "Admin Service" "Marketplace Service" "Document Proxy" "Admin Dashboard")

for i in "${!ports[@]}"; do
    port=${ports[$i]}
    service=${service_names[$i]}
    
    if lsof -i:$port >/dev/null 2>&1; then
        echo "${WARNING} Port $port ($service): Still in use"
    else
        echo "${CHECK} Port $port ($service): Free"
    fi
done

echo
echo "🔄 To restart all services, run: ./start-all.sh"
echo "📋 Service logs are preserved in: logs/"
echo

# Show any remaining processes on RABHAN ports
echo "🔍 Checking for any remaining processes on RABHAN ports..."
for port in "${ports[@]}"; do
    local pid=$(lsof -t -i:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "${WARNING} Process still running on port $port: PID $pid"
        ps -p $pid -o pid,ppid,cmd 2>/dev/null || true
    fi
done

echo
echo "✅ Shutdown complete!"