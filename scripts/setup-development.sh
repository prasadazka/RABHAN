#!/bin/bash

# RABHAN Platform - Development Environment Setup Script
# This script automates the setup process for new developers

set -e  # Exit on any error

echo "🚀 RABHAN Platform - Development Setup"
echo "======================================"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check system requirements
check_requirements() {
    log_info "Checking system requirements..."
    
    # Check Node.js
    if command -v node >/dev/null 2>&1; then
        NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
        if [ "$NODE_VERSION" -ge 18 ]; then
            log_success "Node.js $(node --version) ✓"
        else
            log_error "Node.js version 18+ required, found $(node --version)"
            exit 1
        fi
    else
        log_error "Node.js not found. Please install Node.js 18+ from https://nodejs.org"
        exit 1
    fi
    
    # Check npm
    if command -v npm >/dev/null 2>&1; then
        log_success "npm $(npm --version) ✓"
    else
        log_error "npm not found"
        exit 1
    fi
    
    # Check PostgreSQL
    if command -v psql >/dev/null 2>&1; then
        log_success "PostgreSQL $(psql --version | awk '{print $3}') ✓"
    else
        log_warning "PostgreSQL not found in PATH. Please ensure PostgreSQL is installed and accessible."
    fi
    
    # Check Redis
    if command -v redis-server >/dev/null 2>&1; then
        log_success "Redis $(redis-server --version | awk '{print $3}' | cut -d'=' -f2) ✓"
    else
        log_warning "Redis not found in PATH. Please ensure Redis is installed and accessible."
    fi
    
    # Check Git
    if command -v git >/dev/null 2>&1; then
        log_success "Git $(git --version | awk '{print $3}') ✓"
    else
        log_error "Git not found. Please install Git."
        exit 1
    fi
}

# Create environment files
create_env_files() {
    log_info "Creating environment files..."
    
    # Prompt for database password
    read -sp "Enter PostgreSQL password for rabhan_dev user: " DB_PASSWORD
    echo
    
    # Prompt for JWT secret
    read -sp "Enter JWT secret (or press Enter for auto-generated): " JWT_SECRET
    echo
    
    if [ -z "$JWT_SECRET" ]; then
        JWT_SECRET=$(openssl rand -base64 64 | tr -d "\n")
        log_info "Auto-generated JWT secret"
    fi
    
    # Backend services
    SERVICES=("auth-service" "user-service" "contractor-service" "document-service" "quote-service" "admin-service" "marketplace-service")
    PORTS=(3001 3002 3004 3003 3005 3006 3007)
    DATABASES=("rabhan_auth" "rabhan_users" "rabhan_contractors" "rabhan_documents" "rabhan_quotes" "rabhan_admin" "rabhan_marketplace")
    
    for i in "${!SERVICES[@]}"; do
        SERVICE=${SERVICES[$i]}
        PORT=${PORTS[$i]}
        DB=${DATABASES[$i]}
        
        ENV_FILE="backend/services/$SERVICE/.env"
        
        if [ ! -f "$ENV_FILE" ]; then
            log_info "Creating $ENV_FILE"
            
            cat > "$ENV_FILE" << EOF
NODE_ENV=development
PORT=$PORT

# Database Configuration
DATABASE_URL=postgresql://rabhan_dev:$DB_PASSWORD@localhost:5432/$DB

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT Configuration (for auth service)
JWT_SECRET=$JWT_SECRET
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3010
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3010

# SAMA Compliance
SAMA_COMPLIANCE_MODE=development
SAMA_AUDIT_ENABLED=true
SAMA_LOG_LEVEL=info

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
CONTRACTOR_SERVICE_URL=http://localhost:3004
DOCUMENT_SERVICE_URL=http://localhost:3003
QUOTE_SERVICE_URL=http://localhost:3005
ADMIN_SERVICE_URL=http://localhost:3006
MARKETPLACE_SERVICE_URL=http://localhost:3007

# Business Configuration (for quote service)
MAX_QUOTE_AMOUNT=5000
DEFAULT_SYSTEM_COST_PER_KWP=2000
PENALTY_RATE=0.05

# File Storage (for document/marketplace services)
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png
EOF
            log_success "Created $ENV_FILE"
        else
            log_warning "$ENV_FILE already exists, skipping"
        fi
    done
    
    # Frontend environment files
    FRONTEND_APPS=("rabhan-web" "admin-dashboard")
    
    for APP in "${FRONTEND_APPS[@]}"; do
        ENV_FILE="frontend/$APP/.env"
        
        if [ ! -f "$ENV_FILE" ]; then
            log_info "Creating $ENV_FILE"
            
            cat > "$ENV_FILE" << EOF
VITE_APP_ENV=development
VITE_APP_NAME=RABHAN

# API URLs
VITE_API_BASE_URL=http://localhost:3001
VITE_AUTH_SERVICE_URL=http://localhost:3001
VITE_USER_SERVICE_URL=http://localhost:3002
VITE_DOCUMENT_SERVICE_URL=http://localhost:3003
VITE_CONTRACTOR_SERVICE_URL=http://localhost:3004
VITE_QUOTE_SERVICE_URL=http://localhost:3005
VITE_ADMIN_SERVICE_URL=http://localhost:3006
VITE_MARKETPLACE_SERVICE_URL=http://localhost:3007

# App Configuration
VITE_DEFAULT_LANGUAGE=en
VITE_SUPPORTED_LANGUAGES=en,ar
VITE_APP_THEME=light
EOF
            log_success "Created $ENV_FILE"
        else
            log_warning "$ENV_FILE already exists, skipping"
        fi
    done
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    
    # Backend services
    for SERVICE in "auth-service" "user-service" "contractor-service" "document-service" "quote-service" "admin-service" "marketplace-service" "document-proxy-service"; do
        if [ -d "backend/services/$SERVICE" ]; then
            log_info "Installing dependencies for $SERVICE"
            cd "backend/services/$SERVICE"
            npm install --silent
            cd - > /dev/null
            log_success "Dependencies installed for $SERVICE"
        fi
    done
    
    # Frontend applications
    for APP in "rabhan-web" "admin-dashboard"; do
        if [ -d "frontend/$APP" ]; then
            log_info "Installing dependencies for $APP"
            cd "frontend/$APP"
            npm install --silent
            cd - > /dev/null
            log_success "Dependencies installed for $APP"
        fi
    done
}

# Setup databases
setup_databases() {
    log_info "Setting up databases..."
    
    # Check if PostgreSQL is running
    if ! pgrep -x "postgres" > /dev/null; then
        log_warning "PostgreSQL might not be running. Please start PostgreSQL service."
        return 1
    fi
    
    # Prompt for PostgreSQL superuser
    read -p "Enter PostgreSQL superuser (default: postgres): " PG_USER
    PG_USER=${PG_USER:-postgres}
    
    read -sp "Enter PostgreSQL superuser password: " PG_PASSWORD
    echo
    
    # Database setup script
    cat > /tmp/setup_databases.sql << EOF
-- Create databases
CREATE DATABASE IF NOT EXISTS rabhan_auth;
CREATE DATABASE IF NOT EXISTS rabhan_users;
CREATE DATABASE IF NOT EXISTS rabhan_contractors;
CREATE DATABASE IF NOT EXISTS rabhan_documents;
CREATE DATABASE IF NOT EXISTS rabhan_quotes;
CREATE DATABASE IF NOT EXISTS rabhan_marketplace;
CREATE DATABASE IF NOT EXISTS rabhan_admin;

-- Create user if not exists
DO \$\$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'rabhan_dev') THEN
        CREATE USER rabhan_dev WITH PASSWORD '$DB_PASSWORD';
    END IF;
END
\$\$;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE rabhan_auth TO rabhan_dev;
GRANT ALL PRIVILEGES ON DATABASE rabhan_users TO rabhan_dev;
GRANT ALL PRIVILEGES ON DATABASE rabhan_contractors TO rabhan_dev;
GRANT ALL PRIVILEGES ON DATABASE rabhan_documents TO rabhan_dev;
GRANT ALL PRIVILEGES ON DATABASE rabhan_quotes TO rabhan_dev;
GRANT ALL PRIVILEGES ON DATABASE rabhan_marketplace TO rabhan_dev;
GRANT ALL PRIVILEGES ON DATABASE rabhan_admin TO rabhan_dev;
EOF
    
    # Execute database setup
    if PGPASSWORD="$PG_PASSWORD" psql -h localhost -U "$PG_USER" -f /tmp/setup_databases.sql > /dev/null 2>&1; then
        log_success "Databases created successfully"
    else
        log_error "Failed to create databases. Please check PostgreSQL connection and credentials."
        return 1
    fi
    
    # Clean up
    rm /tmp/setup_databases.sql
}

# Run migrations
run_migrations() {
    log_info "Running database migrations..."
    
    for SERVICE in "auth-service" "contractor-service" "quote-service" "admin-service" "marketplace-service"; do
        if [ -d "backend/services/$SERVICE" ] && [ -d "backend/services/$SERVICE/migrations" ]; then
            log_info "Running migrations for $SERVICE"
            cd "backend/services/$SERVICE"
            if npm run migrate > /dev/null 2>&1; then
                log_success "Migrations completed for $SERVICE"
            else
                log_warning "Migrations failed for $SERVICE (might not have migration script)"
            fi
            cd - > /dev/null
        fi
    done
}

# Create startup script
create_startup_script() {
    log_info "Creating startup script..."
    
    cat > start-all-services.sh << 'EOF'
#!/bin/bash

# RABHAN Platform - Start All Services

echo "🚀 Starting RABHAN Platform Services"
echo "===================================="

# Start Redis if not running
if ! pgrep -x "redis-server" > /dev/null; then
    echo "Starting Redis server..."
    redis-server --daemonize yes
fi

# Function to start service in background
start_service() {
    local service_path=$1
    local service_name=$2
    local port=$3
    
    cd "$service_path"
    echo "Starting $service_name on port $port..."
    npm run dev > "../../../logs/$service_name.log" 2>&1 &
    echo $! > "../../../logs/$service_name.pid"
    cd - > /dev/null
}

# Create logs directory
mkdir -p logs

# Start backend services
start_service "backend/services/auth-service" "auth-service" 3001
start_service "backend/services/user-service" "user-service" 3002
start_service "backend/services/document-service" "document-service" 3003
start_service "backend/services/contractor-service" "contractor-service" 3004
start_service "backend/services/quote-service" "quote-service" 3005
start_service "backend/services/admin-service" "admin-service" 3006
start_service "backend/services/marketplace-service" "marketplace-service" 3007
start_service "backend/services/document-proxy-service" "document-proxy-service" 3008

# Start frontend applications
start_service "frontend/rabhan-web" "rabhan-web" 3000
start_service "frontend/admin-dashboard" "admin-dashboard" 3010

echo ""
echo "✅ All services started!"
echo ""
echo "Service URLs:"
echo "- Main App: http://localhost:3000"
echo "- Admin Dashboard: http://localhost:3010"
echo "- Auth Service: http://localhost:3001/health"
echo "- User Service: http://localhost:3002/health"
echo "- Document Service: http://localhost:3003/health"
echo "- Contractor Service: http://localhost:3004/health"
echo "- Quote Service: http://localhost:3005/health"
echo "- Admin Service: http://localhost:3006/health"
echo "- Marketplace Service: http://localhost:3007/health"
echo "- Document Proxy: http://localhost:3008/health"
echo ""
echo "To stop all services, run: ./stop-all-services.sh"
EOF

    chmod +x start-all-services.sh
    log_success "Created start-all-services.sh"
    
    # Create stop script
    cat > stop-all-services.sh << 'EOF'
#!/bin/bash

# RABHAN Platform - Stop All Services

echo "🛑 Stopping RABHAN Platform Services"
echo "===================================="

# Stop services using PID files
for pidfile in logs/*.pid; do
    if [ -f "$pidfile" ]; then
        service_name=$(basename "$pidfile" .pid)
        pid=$(cat "$pidfile")
        if kill -0 "$pid" 2>/dev/null; then
            echo "Stopping $service_name (PID: $pid)..."
            kill "$pid"
        fi
        rm "$pidfile"
    fi
done

# Stop any remaining node processes on our ports
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3010; do
    pid=$(lsof -ti:$port 2>/dev/null)
    if [ ! -z "$pid" ]; then
        echo "Stopping process on port $port (PID: $pid)..."
        kill "$pid" 2>/dev/null
    fi
done

echo "✅ All services stopped!"
EOF

    chmod +x stop-all-services.sh
    log_success "Created stop-all-services.sh"
}

# Main setup function
main() {
    echo
    log_info "Starting RABHAN Platform development setup..."
    echo
    
    # Check if we're in the right directory
    if [ ! -f "CLAUDE.md" ]; then
        log_error "Please run this script from the RABHAN project root directory"
        exit 1
    fi
    
    # Run setup steps
    check_requirements
    echo
    
    create_env_files
    echo
    
    install_dependencies
    echo
    
    setup_databases
    echo
    
    run_migrations
    echo
    
    create_startup_script
    echo
    
    log_success "🎉 Setup completed successfully!"
    echo
    echo "Next steps:"
    echo "1. Start all services: ./start-all-services.sh"
    echo "2. Open http://localhost:3000 in your browser"
    echo "3. Open http://localhost:3010 for admin dashboard"
    echo "4. Check the DEVELOPER_SETUP_GUIDE.md for detailed information"
    echo
    echo "To stop all services: ./stop-all-services.sh"
    echo
}

# Run main function
main "$@"