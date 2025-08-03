#!/bin/bash

# Quick fix for AWS production database schema
# Run this script on your AWS instance to fix the missing columns

set -e

echo "🔧 Fixing AWS Production Database Schema..."

# Check if we're on the AWS instance
if [ ! -d "/opt/rabhan" ]; then
    echo "❌ This script should be run on the AWS instance where RABHAN is deployed"
    exit 1
fi

# Stop services temporarily to prevent issues during schema update
echo "🛑 Stopping services temporarily..."
sudo -u rabhan pm2 stop all

# Run the schema fix
echo "📊 Applying database schema fixes..."
sudo -u postgres psql -f /opt/rabhan/deployment/database/fix-production-schema.sql

# Restart services
echo "🚀 Restarting services..."
sudo -u rabhan pm2 start all

# Wait a moment for services to start
sleep 5

# Check service status
echo "📋 Service Status:"
sudo -u rabhan pm2 status

echo "✅ Database schema fix completed!"
echo "🧪 Testing registration endpoint..."

# Test the registration endpoint
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "test@example.com",
    "password": "TestPassword123!",
    "phone": "+966501234567",
    "user_type": "HOMEOWNER"
  }' || echo "❌ Registration test failed - check logs"

echo "🏁 Schema fix process completed!"