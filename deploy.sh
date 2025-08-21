#!/bin/bash

# RABHAN MVP Deployment Script for Single t3.large Instance
# This script automates the deployment process

set -e

echo "🚀 Starting RABHAN Platform Deployment..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.production.yml"
ENV_FILE=".env"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
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

# Check if running as root or with sudo
check_permissions() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root or with sudo"
        exit 1
    fi
}

# Install Docker and Docker Compose if not present
install_docker() {
    print_status "Checking Docker installation..."
    
    if ! command -v docker &> /dev/null; then
        print_status "Installing Docker..."
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        systemctl start docker
        systemctl enable docker
        print_success "Docker installed successfully"
    else
        print_success "Docker is already installed"
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_status "Installing Docker Compose..."
        curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
        print_success "Docker Compose installed successfully"
    else
        print_success "Docker Compose is already installed"
    fi
}

# Setup environment file
setup_environment() {
    print_status "Setting up environment configuration..."
    
    if [[ ! -f "$ENV_FILE" ]]; then
        if [[ -f ".env.production" ]]; then
            cp .env.production "$ENV_FILE"
            print_warning "Copied .env.production to .env. Please update with your actual values!"
            print_warning "Edit the .env file with your configuration before continuing."
            read -p "Press Enter after updating the .env file..."
        else
            print_error "No environment file found. Please create a .env file."
            exit 1
        fi
    else
        print_success "Environment file exists"
    fi
}

# Setup directories and permissions
setup_directories() {
    print_status "Setting up directories and permissions..."
    
    # Create necessary directories
    mkdir -p nginx/conf.d nginx/ssl
    mkdir -p data/postgres data/redis
    mkdir -p data/uploads/{users,documents,marketplace}
    mkdir -p logs
    
    # Make initialization script executable
    chmod +x scripts/init-multiple-databases.sh
    
    # Set appropriate permissions
    chown -R 1001:1001 data/uploads
    chmod -R 755 data/uploads
    
    print_success "Directories and permissions set up"
}

# Build and start services
deploy_services() {
    print_status "Building and starting RABHAN services..."
    
    # Pull latest images
    docker-compose -f "$COMPOSE_FILE" pull
    
    # Build custom images
    docker-compose -f "$COMPOSE_FILE" build --no-cache
    
    # Stop existing services
    docker-compose -f "$COMPOSE_FILE" down
    
    # Start services
    docker-compose -f "$COMPOSE_FILE" up -d
    
    print_success "Services started successfully"
}

# Health check
health_check() {
    print_status "Performing health checks..."
    
    sleep 30  # Wait for services to start
    
    services=("postgres" "redis" "auth-service" "user-service" "frontend")
    
    for service in "${services[@]}"; do
        if docker-compose -f "$COMPOSE_FILE" ps "$service" | grep -q "Up"; then
            print_success "$service is running"
        else
            print_error "$service is not running properly"
            docker-compose -f "$COMPOSE_FILE" logs "$service"
        fi
    done
}

# Setup SSL (Let's Encrypt)
setup_ssl() {
    print_status "Setting up SSL certificates..."
    
    if [[ -n "${DOMAIN:-}" ]]; then
        # Install certbot
        if ! command -v certbot &> /dev/null; then
            apt-get update
            apt-get install -y certbot python3-certbot-nginx
        fi
        
        # Generate certificates
        certbot --nginx -d "$DOMAIN" -d "$ADMIN_DOMAIN" --non-interactive --agree-tos --email "admin@$DOMAIN"
        
        print_success "SSL certificates configured"
    else
        print_warning "DOMAIN not set in environment, skipping SSL setup"
    fi
}

# Setup monitoring
setup_monitoring() {
    print_status "Setting up monitoring..."
    
    # Create log rotation configuration
    cat > /etc/logrotate.d/rabhan << EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
EOF
    
    # Setup basic monitoring script
    cat > /usr/local/bin/rabhan-monitor.sh << 'EOF'
#!/bin/bash
cd /opt/rabhan
docker-compose -f docker-compose.production.yml ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
EOF
    
    chmod +x /usr/local/bin/rabhan-monitor.sh
    
    print_success "Monitoring setup completed"
}

# Backup setup
setup_backup() {
    print_status "Setting up backup system..."
    
    # Create backup script
    cat > /usr/local/bin/rabhan-backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/backup/rabhan/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"

# Database backup
docker exec rabhan-postgres pg_dumpall -U postgres | gzip > "$BACKUP_DIR/database.sql.gz"

# Upload files backup
tar -czf "$BACKUP_DIR/uploads.tar.gz" -C /opt/rabhan data/uploads

# Keep only last 7 days of backups
find /backup/rabhan -type d -mtime +7 -exec rm -rf {} +

echo "Backup completed: $BACKUP_DIR"
EOF
    
    chmod +x /usr/local/bin/rabhan-backup.sh
    
    # Add to crontab for daily backups at 2 AM
    (crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/rabhan-backup.sh") | crontab -
    
    print_success "Backup system configured"
}

# Cleanup old Docker resources
cleanup_docker() {
    print_status "Cleaning up Docker resources..."
    
    docker system prune -f
    docker volume prune -f
    
    print_success "Docker cleanup completed"
}

# Main deployment process
main() {
    print_status "RABHAN Platform Deployment Starting..."
    
    check_permissions
    install_docker
    setup_environment
    setup_directories
    deploy_services
    health_check
    setup_ssl
    setup_monitoring
    setup_backup
    cleanup_docker
    
    print_success "🎉 RABHAN Platform deployed successfully!"
    echo
    print_status "Access your applications:"
    echo "  Main App: http://${DOMAIN:-your-domain.com}"
    echo "  Admin Panel: http://${ADMIN_DOMAIN:-admin.your-domain.com}"
    echo
    print_status "Useful commands:"
    echo "  Monitor services: /usr/local/bin/rabhan-monitor.sh"
    echo "  View logs: docker-compose -f $COMPOSE_FILE logs -f [service-name]"
    echo "  Backup data: /usr/local/bin/rabhan-backup.sh"
    echo "  Restart services: docker-compose -f $COMPOSE_FILE restart"
}

# Handle script interruption
trap 'print_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"