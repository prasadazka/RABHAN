#!/bin/bash

# RABHAN Update Deployment Script
# For updating existing production deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_ROOT="/opt/rabhan"
BACKUP_DIR="/opt/backups/rabhan"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}🔄 Starting RABHAN Update Deployment${NC}"
echo "=================================================="

# Create backup
echo -e "${YELLOW}📦 Creating backup...${NC}"
sudo mkdir -p $BACKUP_DIR
sudo tar -czf $BACKUP_DIR/rabhan_backup_$TIMESTAMP.tar.gz -C /opt rabhan
sudo -u rabhan pg_dumpall > $BACKUP_DIR/database_backup_$TIMESTAMP.sql
echo -e "${GREEN}✅ Backup created: $BACKUP_DIR/rabhan_backup_$TIMESTAMP.tar.gz${NC}"

# Stop services
echo -e "${YELLOW}⏸️  Stopping services...${NC}"
sudo -u rabhan pm2 stop all

# Update application code
echo -e "${YELLOW}📥 Updating application code...${NC}"
sudo cp -r ./backend $APP_ROOT/
sudo cp -r ./frontend $APP_ROOT/
sudo chown -R rabhan:rabhan $APP_ROOT

# Update dependencies and build
echo -e "${YELLOW}🔨 Building application...${NC}"

# Frontend build
cd $APP_ROOT/frontend/rabhan-web
sudo -u rabhan npm install --production
sudo -u rabhan npm run build

# Backend dependencies
for service in auth-service user-service document-service contractor-service solar-calculator-service; do
    if [ -d "$APP_ROOT/backend/services/$service" ]; then
        echo "Updating dependencies for $service..."
        cd $APP_ROOT/backend/services/$service
        sudo -u rabhan npm install --production
    fi
done

# Restart services
echo -e "${YELLOW}🚀 Restarting services...${NC}"
cd $APP_ROOT
sudo -u rabhan pm2 reload all

# Health check
echo -e "${YELLOW}🔍 Running health checks...${NC}"
sleep 10

curl -f http://localhost:3001/health || echo "Auth service health check failed"
curl -f http://localhost:3002/health || echo "User service health check failed"
curl -f http://localhost:3003/health || echo "Document service health check failed"
curl -f http://localhost:3004/health || echo "Contractor service health check failed"
curl -f http://localhost:3005/health || echo "Solar calculator health check failed"

echo -e "${GREEN}✅ Update deployment completed!${NC}"
echo "Backup available at: $BACKUP_DIR/rabhan_backup_$TIMESTAMP.tar.gz"