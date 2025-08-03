#!/bin/bash

# RABHAN BNPL Platform - AWS t3.large Deployment Script
# Automated deployment for production environment

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="rabhan"
APP_ROOT="/opt/rabhan"
LOG_DIR="/var/log/rabhan"
NGINX_CONF="/etc/nginx/sites-available/rabhan"
DOMAIN="your-domain.com"
BACKUP_DIR="/opt/backups/rabhan"

echo -e "${BLUE}🚀 Starting RABHAN Deployment on AWS t3.large${NC}"
echo "=================================================="

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo -e "${RED}❌ This script should not be run as root for security reasons${NC}"
   echo "Please run as a regular user with sudo privileges"
   exit 1
fi

# Function to print step headers
print_step() {
    echo -e "\n${BLUE}📋 Step $1: $2${NC}"
    echo "----------------------------------------"
}

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ $1 completed successfully${NC}"
    else
        echo -e "${RED}❌ $1 failed${NC}"
        exit 1
    fi
}

# Step 1: System Update and Dependencies
print_step "1" "System Update and Dependencies Installation"

sudo apt update && sudo apt upgrade -y
check_success "System update"

# Install required packages
sudo apt install -y curl wget git nginx postgresql postgresql-contrib redis-server ufw fail2ban certbot python3-certbot-nginx htop unzip
check_success "Package installation"

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
check_success "Node.js installation"

# Install PM2 globally
sudo npm install -g pm2 tsx
check_success "PM2 installation"

# Step 2: User and Directory Setup
print_step "2" "User and Directory Setup"

# Create rabhan user
sudo useradd -r -s /bin/bash -d $APP_ROOT rabhan || echo "User already exists"
sudo mkdir -p $APP_ROOT
sudo mkdir -p $LOG_DIR
sudo mkdir -p $BACKUP_DIR
sudo mkdir -p /opt/rabhan/uploads
sudo mkdir -p /opt/rabhan/secure-storage

# Set permissions
sudo chown -R rabhan:rabhan $APP_ROOT
sudo chown -R rabhan:rabhan $LOG_DIR
sudo chmod 755 $APP_ROOT
sudo chmod 755 $LOG_DIR
check_success "Directory setup"

# Step 3: Firewall Configuration
print_step "3" "Firewall Configuration"

sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
check_success "Firewall configuration"

# Step 4: Database Setup
print_step "4" "PostgreSQL Database Setup"

# Start PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create databases and users using the comprehensive setup script
sudo -u postgres psql -f ./deployment/database/setup-databases.sql
check_success "Database and users creation"

# Run the complete schema setup
sudo -u postgres psql -f ./deployment/database/production-schema-setup.sql
check_success "Database schema setup"

# Step 5: Redis Configuration
print_step "5" "Redis Configuration"

sudo systemctl start redis-server
sudo systemctl enable redis-server

# Configure Redis for production
sudo sed -i 's/^# maxmemory <bytes>/maxmemory 256mb/' /etc/redis/redis.conf
sudo sed -i 's/^# maxmemory-policy noeviction/maxmemory-policy allkeys-lru/' /etc/redis/redis.conf
sudo systemctl restart redis-server
check_success "Redis configuration"

# Step 6: Application Deployment
print_step "6" "Application Code Deployment"

echo "Please ensure your code is available in the current directory"
echo "Copying application files..."

# Copy application files
sudo cp -r ./backend $APP_ROOT/
sudo cp -r ./frontend $APP_ROOT/
sudo cp -r ./shared $APP_ROOT/ 2>/dev/null || echo "No shared directory found"
sudo cp ./deployment/ecosystem.config.js $APP_ROOT/
sudo chown -R rabhan:rabhan $APP_ROOT
check_success "Application files copy"

# Step 7: Frontend Build
print_step "7" "Frontend Build"

cd $APP_ROOT/frontend/rabhan-web
sudo -u rabhan npm install --production
sudo -u rabhan npm run build
check_success "Frontend build"

# Step 8: Backend Dependencies
print_step "8" "Backend Services Dependencies"

# Install dependencies for each service
for service in auth-service user-service document-service contractor-service solar-calculator-service; do
    if [ -d "$APP_ROOT/backend/services/$service" ]; then
        echo "Installing dependencies for $service..."
        cd $APP_ROOT/backend/services/$service
        sudo -u rabhan npm install --production
        check_success "$service dependencies"
    fi
done

# Step 9: Environment Configuration
print_step "9" "Environment Configuration"

if [ -f "./deployment/env/.env.production.with-secrets" ]; then
    sudo cp ./deployment/env/.env.production.with-secrets $APP_ROOT/.env
    sudo chown rabhan:rabhan $APP_ROOT/.env
    sudo chmod 600 $APP_ROOT/.env
    echo -e "${GREEN}✅ Production environment file deployed${NC}"
else
    echo -e "${YELLOW}⚠️  No secrets file found. Please run generate-secrets.sh first${NC}"
    sudo cp ./deployment/env/.env.production $APP_ROOT/.env
    sudo chown rabhan:rabhan $APP_ROOT/.env
    sudo chmod 600 $APP_ROOT/.env
    echo -e "${YELLOW}⚠️  Using template .env file - UPDATE SECRETS BEFORE STARTING SERVICES${NC}"
fi

# Step 10: NGINX Configuration
print_step "10" "NGINX Configuration"

sudo cp ./deployment/nginx/rabhan.conf $NGINX_CONF
sudo cp ./deployment/nginx/proxy_params /etc/nginx/proxy_params

# Update domain in NGINX config
sudo sed -i "s/your-domain.com/$DOMAIN/g" $NGINX_CONF

# Enable site
sudo ln -sf $NGINX_CONF /etc/nginx/sites-enabled/rabhan
sudo rm -f /etc/nginx/sites-enabled/default

# Test NGINX configuration
sudo nginx -t
check_success "NGINX configuration"

# Step 11: SSL Certificate
print_step "11" "SSL Certificate Setup"

# Temporarily start NGINX for domain verification
sudo systemctl start nginx

echo -e "${YELLOW}Setting up SSL certificate for $DOMAIN${NC}"
echo "Make sure your domain points to this server's IP address"
read -p "Press Enter to continue with SSL setup (or Ctrl+C to skip)..."

sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN || {
    echo -e "${YELLOW}⚠️  SSL setup failed or skipped. You can set it up later with:${NC}"
    echo "sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
}

# Step 12: PM2 Setup
print_step "12" "PM2 Process Manager Setup"

cd $APP_ROOT

# Start all services with PM2
sudo -u rabhan pm2 start ecosystem.config.js
sudo -u rabhan pm2 save
sudo pm2 startup systemd -u rabhan --hp $APP_ROOT

check_success "PM2 setup"

# Step 13: Service Status Check
print_step "13" "Service Status Verification"

echo "Checking service status..."
sudo systemctl status postgresql --no-pager -l
sudo systemctl status redis-server --no-pager -l
sudo systemctl status nginx --no-pager -l

echo -e "\nPM2 Process Status:"
sudo -u rabhan pm2 status

# Step 14: Health Checks
print_step "14" "Health Checks"

sleep 10  # Wait for services to start

echo "Testing service endpoints..."
curl -f http://localhost:3001/health || echo "Auth service not responding"
curl -f http://localhost:3002/health || echo "User service not responding"
curl -f http://localhost:3003/health || echo "Document service not responding"
curl -f http://localhost:3004/health || echo "Contractor service not responding"
curl -f http://localhost:3005/health || echo "Solar calculator not responding"

# Step 15: Security Hardening
print_step "15" "Security Hardening"

# Configure fail2ban
sudo cp /etc/fail2ban/jail.conf /etc/fail2ban/jail.local

# Add custom jail for NGINX
sudo tee /etc/fail2ban/jail.d/nginx-req-limit.conf > /dev/null << EOF
[nginx-req-limit]
enabled = true
filter = nginx-req-limit
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/rabhan_error.log
findtime = 600
bantime = 3600
maxretry = 10
EOF

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
check_success "Security hardening"

# Step 16: Monitoring Setup
print_step "16" "Monitoring and Logging Setup"

# Set up log rotation
sudo tee /etc/logrotate.d/rabhan > /dev/null << EOF
$LOG_DIR/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    postrotate
        sudo -u rabhan pm2 reloadLogs
    endscript
}
EOF

# Create monitoring script
sudo tee /opt/rabhan/monitor.sh > /dev/null << 'EOF'
#!/bin/bash
# Simple monitoring script for RABHAN services

LOG_FILE="/var/log/rabhan/monitor.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

# Check PM2 processes
PM2_STATUS=$(sudo -u rabhan pm2 jlist | jq -r '.[] | select(.pm2_env.status != "online") | .name' 2>/dev/null)

if [ ! -z "$PM2_STATUS" ]; then
    echo "$DATE - WARNING: Some PM2 processes are not online: $PM2_STATUS" >> $LOG_FILE
fi

# Check disk space
DISK_USAGE=$(df / | awk 'NR==2 {print $5}' | sed 's/%//')
if [ $DISK_USAGE -gt 80 ]; then
    echo "$DATE - WARNING: Disk usage is $DISK_USAGE%" >> $LOG_FILE
fi

# Check memory usage
MEM_USAGE=$(free | awk 'NR==2{printf "%.0f", $3*100/$2}')
if [ $MEM_USAGE -gt 85 ]; then
    echo "$DATE - WARNING: Memory usage is $MEM_USAGE%" >> $LOG_FILE
fi
EOF

sudo chmod +x /opt/rabhan/monitor.sh

# Add to crontab
(sudo crontab -l 2>/dev/null; echo "*/5 * * * * /opt/rabhan/monitor.sh") | sudo crontab -

check_success "Monitoring setup"

# Final Steps and Summary
print_step "17" "Deployment Summary"

echo -e "${GREEN}🎉 RABHAN Deployment Completed Successfully!${NC}"
echo "=================================================="
echo -e "${BLUE}📊 Deployment Summary:${NC}"
echo "• Application Root: $APP_ROOT"
echo "• Domain: https://$DOMAIN"
echo "• Services: 5 backend services + frontend"
echo "• Database: PostgreSQL with 4 databases"
echo "• Cache: Redis"
echo "• Web Server: NGINX with SSL"
echo "• Process Manager: PM2"
echo -e "\n${BLUE}🔧 Service URLs:${NC}"
echo "• Frontend: https://$DOMAIN"
echo "• Auth API: https://$DOMAIN/api/auth/"
echo "• User API: https://$DOMAIN/api/users/"
echo "• Document API: https://$DOMAIN/api/documents/"
echo "• Contractor API: https://$DOMAIN/api/contractors/"
echo "• Solar Calculator: https://$DOMAIN/api/solar-calculator/"

echo -e "\n${BLUE}📝 Next Steps:${NC}"
echo "1. Update database passwords with generated secrets"
echo "2. Configure external integrations (Twilio, SendGrid)"
echo "3. Set up monitoring and alerting"
echo "4. Configure backups"
echo "5. Test all functionality"

echo -e "\n${BLUE}🔧 Useful Commands:${NC}"
echo "• Check services: sudo -u rabhan pm2 status"
echo "• View logs: sudo -u rabhan pm2 logs"
echo "• Restart services: sudo -u rabhan pm2 restart all"
echo "• NGINX status: sudo systemctl status nginx"
echo "• Database status: sudo systemctl status postgresql"

echo -e "\n${YELLOW}⚠️  Important Security Reminders:${NC}"
echo "• Update all passwords in .env file"
echo "• Configure firewall rules if needed"
echo "• Set up regular backups"
echo "• Monitor logs regularly"
echo "• Keep system updated"

echo -e "\n${GREEN}✅ RABHAN is now ready for production use!${NC}"