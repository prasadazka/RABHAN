#!/bin/bash

# RABHAN AWS Deployment Script
# Securely deploys to AWS EC2 instance

set -e

AWS_HOST="ec2-16-170-220-109.eu-north-1.compute.amazonaws.com"
AWS_USER="ubuntu" 
KEY_FILE="rabhan-key.pem"
REMOTE_DIR="/home/ubuntu/rabhan"

echo "🚀 RABHAN AWS Deployment Starting..."
echo "Target: $AWS_HOST"
echo "=================================="

# Check if key file exists
if [ ! -f "$KEY_FILE" ]; then
    echo "❌ SSH key file not found: $KEY_FILE"
    exit 1
fi

# Set correct permissions for SSH key
chmod 600 "$KEY_FILE"

echo "📦 Creating deployment package..."
# Create temporary deployment directory (exclude sensitive files)
mkdir -p temp-deploy
rsync -av --progress \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='logs' \
    --exclude='*.log' \
    --exclude='temp-deploy' \
    . temp-deploy/

echo "📤 Uploading files to AWS..."
scp -i "$KEY_FILE" -r temp-deploy/* "$AWS_USER@$AWS_HOST:$REMOTE_DIR/"

echo "🔧 Deploying on AWS server..."
ssh -i "$KEY_FILE" "$AWS_USER@$AWS_HOST" << 'EOF'
cd /home/ubuntu/rabhan

# Stop existing containers
echo "⏹️ Stopping existing containers..."
docker-compose -f docker-compose.production.yml down || true

# Clean up old images
echo "🧹 Cleaning up..."
docker system prune -f

# Start services
echo "🚀 Starting services..."
docker-compose -f docker-compose.production.yml up -d

# Show status
echo "📊 Service Status:"
docker-compose -f docker-compose.production.yml ps

echo "✅ Deployment completed!"
echo "🌐 Access your app at: http://16.170.220.109"
EOF

# Cleanup
rm -rf temp-deploy

echo "✅ AWS Deployment completed successfully!"
echo ""
echo "🔗 Your applications are now available at:"
echo "   Main Site: http://16.170.220.109"
echo "   Admin Panel: http://16.170.220.109:3010 (or configure admin.rabhan.com DNS)"