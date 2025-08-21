#!/bin/bash

# RABHAN Status Check Script
# Run this on your AWS instance to see current state

echo "🔍 RABHAN Platform Status Check"
echo "================================"

echo ""
echo "1. Current Directory Contents:"
echo "=============================="
pwd
ls -la

echo ""
echo "2. Docker Status:"
echo "================"
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    docker --version
    
    echo ""
    echo "Running Docker Containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "No containers running"
    
    echo ""
    echo "All Docker Containers (including stopped):"
    docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" || echo "No containers found"
else
    echo "❌ Docker is not installed"
fi

echo ""
echo "3. Port Usage:"
echo "============="
echo "Checking common RABHAN ports..."
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3009 3010 5432 6379 80 443; do
    result=$(netstat -tulpn 2>/dev/null | grep ":${port} " || echo "")
    if [ -n "$result" ]; then
        echo "Port $port: OCCUPIED - $result"
    else
        echo "Port $port: FREE"
    fi
done

echo ""
echo "4. System Resources:"
echo "==================="
echo "Memory Usage:"
free -h

echo ""
echo "Disk Usage:"
df -h

echo ""
echo "5. Process Check:"
echo "================"
echo "Node.js processes:"
ps aux | grep node | grep -v grep || echo "No Node.js processes found"

echo ""
echo "Nginx processes:"
ps aux | grep nginx | grep -v grep || echo "No Nginx processes found"

echo ""
echo "6. Network Interfaces:"
echo "====================="
ip addr show | grep -E "inet.*eth0|inet.*ens" || echo "Network interface check failed"

echo ""
echo "7. Recent System Logs (last 10 lines):"
echo "======================================"
sudo journalctl --no-pager -n 10 || echo "Cannot access system logs"

echo ""
echo "Status check completed!"
echo "======================"