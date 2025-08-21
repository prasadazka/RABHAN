#!/bin/bash

# RABHAN Clean Deployment Guide
# This script helps you deploy without modifying existing code

echo "🚀 RABHAN Clean Deployment Process"
echo "=================================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_step() {
    echo -e "${BLUE}[STEP]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Check current state
print_step "1. Checking current deployment state..."
echo "Current directory contents:"
ls -la
echo ""

echo "Running Docker containers:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || echo "Docker not running or not installed"
echo ""

echo "Running processes on common ports:"
netstat -tulpn 2>/dev/null | grep -E ':(3000|3001|3002|3003|3004|3005|3006|3007|3008|80|443|5432|6379)' || echo "netstat not available"
echo ""

# Step 2: Clean up old deployment
print_step "2. Cleaning up old deployment (SAFE - no code changes)..."
echo "Stopping any running Docker containers..."
docker stop $(docker ps -q) 2>/dev/null || echo "No containers to stop"

echo "Removing old containers..."
docker rm $(docker ps -aq) 2>/dev/null || echo "No containers to remove"

echo "Cleaning unused Docker images..."
docker system prune -f 2>/dev/null || echo "Docker system prune not needed"

# Step 3: Install dependencies
print_step "3. Installing required dependencies..."
sudo apt-get update
sudo apt-get install -y curl git

# Install Docker if not present
if ! command -v docker &> /dev/null; then
    print_step "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    sudo systemctl start docker
    sudo systemctl enable docker
    print_success "Docker installed"
else
    print_success "Docker already installed"
fi

# Install Docker Compose if not present
if ! command -v docker-compose &> /dev/null; then
    print_step "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    print_success "Docker Compose installed"
else
    print_success "Docker Compose already installed"
fi

print_success "Dependencies installation completed!"

# Step 4: Show next steps
echo ""
print_step "4. Next Steps:"
echo "1. Upload deployment files to this server"
echo "2. Configure environment variables"
echo "3. Run the deployment"
echo ""

echo "Your instance is ready for clean deployment!"
echo "Instance IP: 16.170.220.109"
echo "Ready to receive deployment files..."