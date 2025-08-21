#!/bin/bash

echo "🚀 RABHAN Deployment Fix Script"
echo "=================================="

# Set proper environment
export NODE_ENV=production

# Stop all containers
echo "📋 Stopping all containers..."
docker-compose -f docker-compose.production.yml down

# Remove old images
echo "🧹 Cleaning old images..."
docker system prune -f

# Build and start services in correct order
echo "🏗️ Building and starting services..."

# Start database services first
docker-compose -f docker-compose.production.yml up -d postgres redis

# Wait for databases
echo "⏳ Waiting for databases..."
sleep 30

# Start backend services
docker-compose -f docker-compose.production.yml up -d \
    auth-service \
    user-service \
    document-service \
    contractor-service \
    solar-calculator-service \
    admin-service \
    marketplace-service \
    document-proxy-service \
    quote-service

# Wait for backend services
echo "⏳ Waiting for backend services..."
sleep 45

# Start frontend services
docker-compose -f docker-compose.production.yml up -d \
    frontend \
    admin-frontend

# Start nginx last
echo "🌐 Starting nginx proxy..."
docker-compose -f docker-compose.production.yml up -d nginx

echo "✅ Deployment completed!"
echo ""
echo "🔍 Service Status:"
docker-compose -f docker-compose.production.yml ps

echo ""
echo "📊 Port Mapping:"
echo "Frontend: http://localhost:3000"
echo "Auth: http://localhost:3001/api/auth"
echo "User: http://localhost:3002/api/users" 
echo "Document: http://localhost:3003/api/documents"
echo "Contractor: http://localhost:3004/api/contractors"
echo "Solar: http://localhost:3005/api/solar-calculator"
echo "Admin: http://localhost:3006/api/admin"
echo "Marketplace: http://localhost:3007/api/v1"
echo "Document-Proxy: http://localhost:3008"
echo "Quote: http://localhost:3009/api/quotes"
echo "Nginx: http://localhost (port 80)"
echo ""
echo "🌐 Production URLs:"
echo "Main site: http://16.170.220.109"
echo "Admin: http://admin.rabhan.com (if DNS configured)"