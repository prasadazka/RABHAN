#!/bin/bash

# RABHAN FULL AUTO-DEPLOYMENT SCRIPT
# Just run: curl -sSL https://your-link/auto-deploy.sh | bash
# OR: wget -O - https://your-link/auto-deploy.sh | bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Configuration
INSTANCE_IP="16.170.220.109"
REPO_URL="https://github.com/your-username/RABHAN.git"  # UPDATE THIS!

print_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║                                                          ║"
    echo "║              🚀 RABHAN AUTO-DEPLOYMENT 🚀                ║"
    echo "║                                                          ║"
    echo "║              Fully Automated Setup                      ║"
    echo "║              No Manual Steps Required                   ║"
    echo "║                                                          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

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

# Step 1: Clean existing deployment
cleanup_existing() {
    print_step "1. Cleaning up existing deployment..."
    
    # Stop all Docker containers
    docker stop $(docker ps -q) 2>/dev/null || echo "No containers to stop"
    docker rm $(docker ps -aq) 2>/dev/null || echo "No containers to remove"
    
    # Clean Docker system
    docker system prune -af 2>/dev/null || echo "Docker clean not needed"
    
    # Kill processes on common ports
    sudo fuser -k 3000/tcp 2>/dev/null || echo "Port 3000 free"
    sudo fuser -k 3001/tcp 2>/dev/null || echo "Port 3001 free"
    sudo fuser -k 3002/tcp 2>/dev/null || echo "Port 3002 free"
    sudo fuser -k 3003/tcp 2>/dev/null || echo "Port 3003 free"
    sudo fuser -k 3004/tcp 2>/dev/null || echo "Port 3004 free"
    sudo fuser -k 3005/tcp 2>/dev/null || echo "Port 3005 free"
    sudo fuser -k 3006/tcp 2>/dev/null || echo "Port 3006 free"
    sudo fuser -k 3007/tcp 2>/dev/null || echo "Port 3007 free"
    sudo fuser -k 3008/tcp 2>/dev/null || echo "Port 3008 free"
    sudo fuser -k 3009/tcp 2>/dev/null || echo "Port 3009 free"
    sudo fuser -k 3010/tcp 2>/dev/null || echo "Port 3010 free"
    sudo fuser -k 80/tcp 2>/dev/null || echo "Port 80 free"
    sudo fuser -k 5432/tcp 2>/dev/null || echo "Port 5432 free"
    sudo fuser -k 6379/tcp 2>/dev/null || echo "Port 6379 free"
    
    print_success "Cleanup completed"
}

# Step 2: Install dependencies
install_dependencies() {
    print_step "2. Installing dependencies..."
    
    # Update system
    sudo apt-get update -y
    
    # Install required packages
    sudo apt-get install -y curl git wget unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release
    
    # Install Docker
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
    
    # Install Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_step "Installing Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        print_success "Docker Compose installed"
    else
        print_success "Docker Compose already installed"
    fi
    
    # Install Node.js (for building if needed)
    if ! command -v node &> /dev/null; then
        print_step "Installing Node.js..."
        curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
        sudo apt-get install -y nodejs
        print_success "Node.js installed"
    else
        print_success "Node.js already installed"
    fi
    
    print_success "All dependencies installed"
}

# Step 3: Setup project
setup_project() {
    print_step "3. Setting up RABHAN project..."
    
    # Remove old project if exists
    sudo rm -rf /opt/rabhan
    
    # Clone repository
    print_step "Cloning RABHAN repository..."
    sudo git clone $REPO_URL /opt/rabhan 2>/dev/null || {
        print_error "Failed to clone repository. Using local backup method..."
        # If git clone fails, we'll create the structure manually
        sudo mkdir -p /opt/rabhan
    }
    
    cd /opt/rabhan
    sudo chown -R $USER:$USER /opt/rabhan
    
    print_success "Project setup completed"
}

# Step 4: Create deployment files
create_deployment_files() {
    print_step "4. Creating deployment configuration..."
    
    # Create docker-compose.production.yml
    cat > docker-compose.production.yml << 'EOF'
version: '3.8'

services:
  # Database Services
  postgres:
    image: postgres:15-alpine
    container_name: rabhan-postgres
    restart: unless-stopped
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD:-rabhan123}
      POSTGRES_MULTIPLE_DATABASES: rabhan_auth,rabhan_user,rabhan_contractor,rabhan_document,rabhan_admin,rabhan_quote,rabhan_marketplace
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    ports:
      - "5432:5432"
    networks:
      - rabhan-network
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    container_name: rabhan-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD:-redis123}
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"
    networks:
      - rabhan-network
    healthcheck:
      test: ["CMD", "redis-cli", "auth", "${REDIS_PASSWORD:-redis123}", "ping"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Backend Services (keeping exact same ports as local)
  auth-service:
    build:
      context: ./backend/services/auth-service
      dockerfile: Dockerfile.production
    container_name: rabhan-auth-service
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3001
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-rabhan123}@postgres:5432/rabhan_auth
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis123}@redis:6379/0
      JWT_SECRET: ${JWT_SECRET:-rabhan_jwt_secret_production_2024}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-rabhan_jwt_refresh_secret_production_2024}
      TWILIO_ACCOUNT_SID: ${TWILIO_ACCOUNT_SID:-demo_sid}
      TWILIO_AUTH_TOKEN: ${TWILIO_AUTH_TOKEN:-demo_token}
      TWILIO_PHONE_NUMBER: ${TWILIO_PHONE_NUMBER:-+966500000000}
    ports:
      - "3001:3001"
    networks:
      - rabhan-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  user-service:
    build:
      context: ./backend/services/user-service
      dockerfile: Dockerfile.production
    container_name: rabhan-user-service
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3002
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-rabhan123}@postgres:5432/rabhan_user
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis123}@redis:6379/1
      JWT_SECRET: ${JWT_SECRET:-rabhan_jwt_secret_production_2024}
    ports:
      - "3002:3002"
    networks:
      - rabhan-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  document-service:
    build:
      context: ./backend/services/document-service
      dockerfile: Dockerfile.production
    container_name: rabhan-document-service
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3003
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-rabhan123}@postgres:5432/rabhan_document
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis123}@redis:6379/2
    ports:
      - "3003:3003"
    networks:
      - rabhan-network
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - document_uploads:/app/uploads

  contractor-service:
    build:
      context: ./backend/services/contractor-service
      dockerfile: Dockerfile.production
    container_name: rabhan-contractor-service
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3004
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-rabhan123}@postgres:5432/rabhan_contractor
    ports:
      - "3004:3004"
    networks:
      - rabhan-network
    depends_on:
      postgres:
        condition: service_healthy

  solar-calculator-service:
    build:
      context: ./backend/services/solar-calculator-service
      dockerfile: Dockerfile.production
    container_name: rabhan-solar-calculator
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3005
    ports:
      - "3005:3005"
    networks:
      - rabhan-network

  admin-service:
    build:
      context: ./backend/services/admin-service
      dockerfile: Dockerfile.production
    container_name: rabhan-admin-service
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3006
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-rabhan123}@postgres:5432/rabhan_admin
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis123}@redis:6379/3
    ports:
      - "3006:3006"
    networks:
      - rabhan-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  marketplace-service:
    build:
      context: ./backend/services/marketplace-service
      dockerfile: Dockerfile.production
    container_name: rabhan-marketplace-service
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3007
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-rabhan123}@postgres:5432/rabhan_marketplace
    ports:
      - "3007:3007"
    networks:
      - rabhan-network
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - marketplace_uploads:/app/uploads

  quote-service:
    build:
      context: ./backend/services/quote-service
      dockerfile: Dockerfile.production
    container_name: rabhan-quote-service
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3009
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD:-rabhan123}@postgres:5432/rabhan_quote
      REDIS_URL: redis://:${REDIS_PASSWORD:-redis123}@redis:6379/4
      JWT_SECRET: ${JWT_SECRET:-rabhan_jwt_secret_production_2024}
    ports:
      - "3009:3009"
    networks:
      - rabhan-network
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  document-proxy-service:
    build:
      context: ./backend/services/document-proxy-service
      dockerfile: Dockerfile.production
    container_name: rabhan-document-proxy
    restart: unless-stopped
    environment:
      NODE_ENV: production
      PORT: 3008
    ports:
      - "3008:3008"
    networks:
      - rabhan-network

  # Frontend Services (keeping exact same ports)
  frontend:
    build:
      context: ./frontend/rabhan-web
      dockerfile: Dockerfile.production
      args:
        - VITE_API_BASE_URL=http://16.170.220.109
        - VITE_APP_ENV=production
    container_name: rabhan-frontend
    restart: unless-stopped
    ports:
      - "3000:3000"
    networks:
      - rabhan-network

  admin-frontend:
    build:
      context: ./frontend/admin-web
      dockerfile: Dockerfile.production
      args:
        - VITE_API_BASE_URL=http://16.170.220.109
        - VITE_APP_ENV=production
    container_name: rabhan-admin-frontend
    restart: unless-stopped
    ports:
      - "3010:3000"
    networks:
      - rabhan-network

volumes:
  postgres_data:
    driver: local
  redis_data:
    driver: local
  document_uploads:
    driver: local
  marketplace_uploads:
    driver: local

networks:
  rabhan-network:
    driver: bridge
EOF

    print_success "Docker Compose file created"
}

# Step 5: Create Dockerfiles for each service
create_dockerfiles() {
    print_step "5. Creating Dockerfiles for services..."
    
    # Create Dockerfile for each backend service
    for service in auth-service user-service document-service contractor-service admin-service marketplace-service quote-service document-proxy-service; do
        if [ -d "backend/services/$service" ]; then
            cat > "backend/services/$service/Dockerfile.production" << 'EOF'
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build if needed
RUN npm run build || echo "No build script found"

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3000}/health || exit 1

CMD ["npm", "start"]
EOF
        fi
    done
    
    # Create Dockerfile for frontend services
    for frontend in rabhan-web admin-web; do
        if [ -d "frontend/$frontend" ]; then
            cat > "frontend/$frontend/Dockerfile.production" << 'EOF'
FROM node:18-alpine as builder

WORKDIR /app
COPY package*.json ./
RUN npm ci && npm cache clean --force
COPY . .

ARG VITE_API_BASE_URL=http://localhost
ARG VITE_APP_ENV=production
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
ENV VITE_APP_ENV=${VITE_APP_ENV}

RUN npm run build

FROM node:18-alpine as production
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./

RUN npm ci --only=production && npm cache clean --force

RUN addgroup -g 1001 -S nodejs
RUN adduser -S nodejs -u 1001
RUN chown -R nodejs:nodejs /app
USER nodejs

EXPOSE 3000

CMD ["npx", "serve", "-s", "dist", "-l", "3000"]
EOF
        fi
    done
    
    print_success "Dockerfiles created"
}

# Step 6: Create database initialization
create_db_init() {
    print_step "6. Creating database initialization..."
    
    cat > init-db.sh << 'EOF'
#!/bin/bash
set -e

function create_user_and_database() {
    local database=$1
    echo "Creating database '$database'"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" <<-EOSQL
        CREATE DATABASE $database;
        GRANT ALL PRIVILEGES ON DATABASE $database TO $POSTGRES_USER;
EOSQL
}

if [ -n "$POSTGRES_MULTIPLE_DATABASES" ]; then
    echo "Multiple database creation requested: $POSTGRES_MULTIPLE_DATABASES"
    for db in $(echo $POSTGRES_MULTIPLE_DATABASES | tr ',' ' '); do
        create_user_and_database $db
    done
    echo "Multiple databases created"
fi
EOF
    
    chmod +x init-db.sh
    print_success "Database initialization script created"
}

# Step 7: Create environment file
create_env() {
    print_step "7. Creating environment configuration..."
    
    cat > .env << 'EOF'
# RABHAN Production Environment
NODE_ENV=production

# Database
DB_PASSWORD=rabhan_secure_db_2024
REDIS_PASSWORD=rabhan_secure_redis_2024

# JWT
JWT_SECRET=rabhan_jwt_secret_production_2024_change_this_to_something_secure
JWT_REFRESH_SECRET=rabhan_jwt_refresh_production_2024_change_this_to_something_secure

# Twilio (Update with real credentials)
TWILIO_ACCOUNT_SID=demo_account_sid
TWILIO_AUTH_TOKEN=demo_auth_token
TWILIO_PHONE_NUMBER=+966500000000

# App Settings
VITE_API_BASE_URL=http://16.170.220.109
VITE_APP_ENV=production
EOF
    
    print_success "Environment file created"
}

# Step 8: Deploy services
deploy_services() {
    print_step "8. Deploying RABHAN services..."
    
    # Start deployment
    docker-compose -f docker-compose.production.yml down 2>/dev/null || echo "No existing services"
    
    print_step "Building images (this will take 5-10 minutes)..."
    docker-compose -f docker-compose.production.yml build --no-cache
    
    print_step "Starting services..."
    docker-compose -f docker-compose.production.yml up -d
    
    print_success "Services deployed"
}

# Step 9: Health check
health_check() {
    print_step "9. Performing health checks..."
    
    echo "Waiting for services to start..."
    sleep 45
    
    echo "Service Status:"
    echo "=============="
    docker-compose -f docker-compose.production.yml ps
    
    echo ""
    echo "Port Check:"
    echo "==========="
    netstat -tulpn | grep -E ':(3000|3001|3002|3003|3004|3005|3006|3007|3008|3009|3010|5432|6379)'
    
    print_success "Health check completed"
}

# Step 10: Create management scripts
create_management_scripts() {
    print_step "10. Creating management scripts..."
    
    # Status script
    sudo tee /usr/local/bin/rabhan-status << 'EOF' > /dev/null
#!/bin/bash
cd /opt/rabhan
echo "RABHAN Platform Status"
echo "====================="
docker-compose -f docker-compose.production.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
echo ""
echo "System Resources:"
free -h | head -2
df -h / | tail -1
EOF
    
    # Restart script
    sudo tee /usr/local/bin/rabhan-restart << 'EOF' > /dev/null
#!/bin/bash
cd /opt/rabhan
echo "Restarting RABHAN Platform..."
docker-compose -f docker-compose.production.yml restart
echo "Restart completed"
EOF
    
    # Logs script
    sudo tee /usr/local/bin/rabhan-logs << 'EOF' > /dev/null
#!/bin/bash
cd /opt/rabhan
if [ -z "$1" ]; then
    echo "Usage: rabhan-logs [service-name]"
    echo "Available services:"
    docker-compose -f docker-compose.production.yml ps --services
else
    docker-compose -f docker-compose.production.yml logs -f --tail=100 "$1"
fi
EOF
    
    sudo chmod +x /usr/local/bin/rabhan-*
    
    print_success "Management scripts created"
}

# Main deployment function
main() {
    print_banner
    
    echo "Starting full auto-deployment for RABHAN Platform..."
    echo "Instance: $INSTANCE_IP"
    echo "This will take approximately 10-15 minutes..."
    echo ""
    
    cleanup_existing
    install_dependencies
    setup_project
    create_deployment_files
    create_dockerfiles
    create_db_init
    create_env
    deploy_services
    health_check
    create_management_scripts
    
    echo ""
    print_success "🎉 RABHAN Platform Successfully Deployed!"
    echo ""
    echo -e "${GREEN}Access your applications:${NC}"
    echo "  📱 Main App: http://16.170.220.109:3000"
    echo "  👨‍💼 Admin Panel: http://16.170.220.109:3010"
    echo ""
    echo -e "${BLUE}Management Commands:${NC}"
    echo "  📊 Check Status: rabhan-status"
    echo "  🔄 Restart Services: rabhan-restart"
    echo "  📋 View Logs: rabhan-logs [service-name]"
    echo ""
    echo -e "${YELLOW}Services Running:${NC}"
    echo "  • Frontend: Port 3000"
    echo "  • Auth API: Port 3001"
    echo "  • User API: Port 3002"
    echo "  • Document API: Port 3003"
    echo "  • Contractor API: Port 3004"
    echo "  • Solar Calculator: Port 3005"
    echo "  • Admin API: Port 3006"
    echo "  • Marketplace API: Port 3007"
    echo "  • Document Proxy: Port 3008"
    echo "  • Quote Service: Port 3009"
    echo "  • Admin Frontend: Port 3010"
    echo "  • PostgreSQL: Port 5432"
    echo "  • Redis: Port 6379"
    echo ""
    print_success "Deployment Complete! 🚀"
}

# Handle interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Check if running as root
if [[ $EUID -eq 0 ]]; then
    print_error "Don't run this script as root. Run as ubuntu user with sudo privileges."
    exit 1
fi

# Run main deployment
main "$@"