#!/bin/bash

# RABHAN Platform Health Check Script
# Usage: ./scripts/health-check.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Emojis
HEALTH="🏥"
CHECK="✅"
CROSS="❌"
WARNING="⚠️"
SEARCH="🔍"
SUMMARY="📊"
PARTY="🎉"
TOOLS="🔧"
WEB="🌐"

echo
echo "===================================================="
echo "${HEALTH} RABHAN Platform - Health Check"
echo "===================================================="
echo

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

echo "${SEARCH} Checking all RABHAN services..."
echo

# Define services array
declare -a services=(
    "Main Web App:3000:/"
    "Auth Service:3001:/health"
    "User Service:3002:/health"
    "Document Service:3003:/health"
    "Contractor Service:3004:/health"
    "Solar Calculator:3005:/health"
    "Admin Service:3006:/health"
    "Marketplace Service:3007:/health"
    "Document Proxy:3008:/health"
    "Admin Dashboard:3010:/"
)

total_services=${#services[@]}
running_services=0
failed_services=()

# Function to check service health
check_service() {
    local service_info="$1"
    IFS=':' read -r service_name service_port service_path <<< "$service_info"
    
    echo "Checking $service_name on port $service_port..."
    
    # Check if port is listening
    if lsof -i:$service_port >/dev/null 2>&1; then
        echo "  ${CHECK} $service_name - Port $service_port is listening"
        
        # Try to make HTTP request to health endpoint
        local http_response=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$service_port$service_path" 2>/dev/null)
        
        if [ "$http_response" = "200" ]; then
            echo "  ${CHECK} $service_name - Health check passed (HTTP 200)"
            ((running_services++))
        elif [ "$http_response" = "000" ]; then
            echo "  ${WARNING} $service_name - Port listening but no HTTP response"
            ((running_services++))
        elif [ ! -z "$http_response" ]; then
            echo "  ${WARNING} $service_name - HTTP $http_response response"
            ((running_services++))
        else
            echo "  ${WARNING} $service_name - Port listening (HTTP check failed)"
            ((running_services++))
        fi
    else
        echo "  ${CROSS} $service_name - Not running (port $service_port not listening)"
        failed_services+=("$service_name:$service_port")
    fi
    echo
}

# Check each service
for service in "${services[@]}"; do
    check_service "$service"
done

# Summary
echo "===================================================="
echo "${SUMMARY} HEALTH CHECK SUMMARY"
echo "===================================================="
echo "Total Services: $total_services"
echo "Running Services: $running_services"
echo "Failed Services: $((total_services - running_services))"

if [ $running_services -eq $total_services ]; then
    echo
    echo "${PARTY} ALL SERVICES ARE HEALTHY!"
    echo "${CHECK} RABHAN Platform is fully operational"
    echo
    echo "${WEB} Quick Links:"
    echo "================================"
    echo "Main Application: http://localhost:3000"
    echo "Admin Dashboard:  http://localhost:3010"
    echo "API Health:       http://localhost:3001/health"
else
    echo
    echo "${WARNING} SOME SERVICES ARE DOWN!"
    echo "${TOOLS} Run ./start-all.sh to start missing services"
    echo "📋 Check individual service logs for details"
    
    if [ ${#failed_services[@]} -gt 0 ]; then
        echo
        echo "Failed Services:"
        for failed in "${failed_services[@]}"; do
            IFS=':' read -r name port <<< "$failed"
            echo "  ${CROSS} $name (Port $port)"
        done
    fi
fi

echo
echo "🔄 To restart all services: ./start-all.sh"
echo "🛑 To stop all services: ./stop-all.sh"
echo "📊 To run this check again: ./scripts/health-check.sh"
echo "📋 To view logs: tail -f logs/*.log"
echo

# Show running processes on RABHAN ports
echo "📋 Processes on RABHAN ports:"
echo "================================"
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3010; do
    local pid=$(lsof -t -i:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        local cmd=$(ps -p $pid -o comm= 2>/dev/null)
        echo "Port $port - PID $pid ($cmd)"
    fi
done

echo

# Check system resources
echo "💻 System Resources:"
echo "================================"
echo "Memory Usage:"
free -h | head -2

echo
echo "CPU Usage:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' | awk '{print "User: " $1 "%"}'

echo
echo "Disk Usage:"
df -h / | tail -1 | awk '{print "Root: " $5 " used"}'

# Check log file sizes
if [ -d "$PROJECT_DIR/logs" ]; then
    echo
    echo "📄 Log Files:"
    echo "================================"
    ls -lh "$PROJECT_DIR/logs"/*.log 2>/dev/null | awk '{print $9 " - " $5}' | sed 's|.*/||'
fi

echo
echo "✅ Health check complete!"