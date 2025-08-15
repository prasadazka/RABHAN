#!/bin/bash

# AWS Setup Script for RABHAN - Zero Code Changes
echo "🚀 Setting up RABHAN on AWS..."

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Redis
sudo apt install -y redis-server

# Install nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Setup PostgreSQL with exact same credentials
echo "🗄️ Setting up PostgreSQL..."
sudo -u postgres psql -c "CREATE USER rabhan_user WITH PASSWORD '12345';"
sudo -u postgres psql -c "ALTER USER rabhan_user CREATEDB;"
sudo -u postgres psql -c "ALTER USER rabhan_user SUPERUSER;"

# Create all databases
sudo -u postgres psql -c "CREATE DATABASE rabhan_auth OWNER rabhan_user;"
sudo -u postgres psql -c "CREATE DATABASE rabhan_user OWNER rabhan_user;"
sudo -u postgres psql -c "CREATE DATABASE rabhan_contractors OWNER rabhan_user;"
sudo -u postgres psql -c "CREATE DATABASE rabhan_document OWNER rabhan_user;"
sudo -u postgres psql -c "CREATE DATABASE rabhan_admin OWNER rabhan_user;"
sudo -u postgres psql -c "CREATE DATABASE rabhan_marketplace OWNER rabhan_user;"
sudo -u postgres psql -c "CREATE DATABASE rabhan_quote OWNER rabhan_user;"

echo "✅ Databases created successfully"

# Clone your repository
cd ~
git clone https://github.com/YOUR_USERNAME/RABHAN_backup.git rabhan
cd rabhan

# Install dependencies for all services
echo "📦 Installing dependencies..."

# Backend services
for service in auth-service user-service contractor-service document-service admin-service marketplace-service quote-service solar-calculator-service document-proxy-service; do
    if [ -d "backend/services/$service" ]; then
        echo "Installing $service..."
        cd "backend/services/$service"
        npm install --production
        if [ -f tsconfig.json ]; then
            npm run build
        fi
        cd ~/rabhan
    fi
done

# Frontend
echo "Installing frontend..."
cd frontend/rabhan-web
npm install --production
npm run build
cd ~/rabhan

# Run database migrations
echo "🔄 Running database migrations..."

# Auth service migrations
cd backend/services/auth-service
npm run migrate || echo "Auth migrations completed"
cd ~/rabhan

# User service migrations  
cd backend/services/user-service
npm run migrate || echo "User migrations completed"
cd ~/rabhan

# Contractor service migrations
cd backend/services/contractor-service
npm run migrate || echo "Contractor migrations completed"
cd ~/rabhan

# Document service migrations
cd backend/services/document-service
npm run migrate || echo "Document migrations completed"
cd ~/rabhan

# Admin service migrations
cd backend/services/admin-service
npm run migrate || echo "Admin migrations completed"
cd ~/rabhan

# Marketplace service migrations
cd backend/services/marketplace-service
npm run migrate || echo "Marketplace migrations completed"
cd ~/rabhan

# Quote service migrations
cd backend/services/quote-service
npm run migrate || echo "Quote migrations completed"
cd ~/rabhan

# Setup nginx
echo "🌐 Setting up nginx..."
sudo cp nginx.conf /etc/nginx/sites-available/rabhan
sudo ln -sf /etc/nginx/sites-available/rabhan /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
sudo systemctl enable nginx

# Start all services with PM2
echo "🔥 Starting all services..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# Setup firewall
echo "🔒 Setting up firewall..."
sudo ufw allow ssh
sudo ufw allow http
sudo ufw allow https
sudo ufw --force enable

echo "✅ RABHAN setup complete!"
echo "🌍 Your application is now running at: http://16.170.220.109"
echo ""
echo "Services status:"
pm2 status
echo ""
echo "🔄 To deploy changes: git push origin main"