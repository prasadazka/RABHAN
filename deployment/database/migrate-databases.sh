#!/bin/bash

# RABHAN Database Migration Script
# Runs database migrations for all services

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_ROOT="/opt/rabhan"
BACKUP_DIR="/opt/backups/rabhan/migrations"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo -e "${BLUE}🗄️  Starting RABHAN Database Migrations${NC}"
echo "=================================================="

# Create backup directory
sudo mkdir -p $BACKUP_DIR

# Function to run migrations for a service
run_service_migrations() {
    local service_name=$1
    local service_path="$APP_ROOT/backend/services/$service_name"
    local db_name="rabhan_${service_name//-/_}"
    
    echo -e "\n${BLUE}📋 Migrating $service_name database${NC}"
    echo "----------------------------------------"
    
    if [ ! -d "$service_path" ]; then
        echo -e "${YELLOW}⚠️  Service directory not found: $service_path${NC}"
        return 1
    fi
    
    # Backup current database
    echo "Creating backup for $db_name..."
    sudo -u postgres pg_dump $db_name > $BACKUP_DIR/${db_name}_backup_$TIMESTAMP.sql
    
    # Check if migration directory exists
    if [ -d "$service_path/migrations" ]; then
        echo "Running migrations for $service_name..."
        cd $service_path
        
        # Different migration commands based on service setup
        if [ -f "package.json" ] && grep -q "migrate" package.json; then
            sudo -u rabhan npm run migrate
        elif [ -f "knexfile.js" ]; then
            sudo -u rabhan npx knex migrate:latest
        elif [ -f "prisma/schema.prisma" ]; then
            sudo -u rabhan npx prisma migrate deploy
        else
            echo -e "${YELLOW}⚠️  No migration system found for $service_name${NC}"
            echo "Looking for SQL migration files..."
            
            if [ -d "migrations" ] && [ "$(ls -A migrations/*.sql 2>/dev/null)" ]; then
                echo "Found SQL migration files. Running them..."
                for migration_file in migrations/*.sql; do
                    if [ -f "$migration_file" ]; then
                        echo "Running: $(basename $migration_file)"
                        sudo -u postgres psql -d $db_name -f "$migration_file"
                    fi
                done
            fi
        fi
        
        echo -e "${GREEN}✅ $service_name migrations completed${NC}"
    else
        echo -e "${YELLOW}⚠️  No migrations directory found for $service_name${NC}"
    fi
}

# Function to verify database connections
verify_database_connections() {
    echo -e "\n${BLUE}🔍 Verifying Database Connections${NC}"
    echo "----------------------------------------"
    
    local databases=("rabhan_auth" "rabhan_user" "rabhan_documents" "rabhan_contractors")
    
    for db in "${databases[@]}"; do
        if sudo -u postgres psql -d $db -c "SELECT 1;" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ $db - Connection successful${NC}"
        else
            echo -e "${RED}❌ $db - Connection failed${NC}"
        fi
    done
}

# Function to check table creation
check_table_creation() {
    echo -e "\n${BLUE}📊 Checking Table Creation${NC}"
    echo "----------------------------------------"
    
    # Check auth service tables
    local auth_tables=$(sudo -u postgres psql -d rabhan_auth -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';" | wc -l)
    echo "Auth Service Tables: $auth_tables"
    
    # Check user service tables
    local user_tables=$(sudo -u postgres psql -d rabhan_user -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';" | wc -l)
    echo "User Service Tables: $user_tables"
    
    # Check document service tables
    local doc_tables=$(sudo -u postgres psql -d rabhan_documents -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';" | wc -l)
    echo "Document Service Tables: $doc_tables"
    
    # Check contractor service tables
    local contractor_tables=$(sudo -u postgres psql -d rabhan_contractors -t -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';" | wc -l)
    echo "Contractor Service Tables: $contractor_tables"
}

# Main migration process
main() {
    # Verify database connections first
    verify_database_connections
    
    # Stop services during migration
    echo -e "\n${YELLOW}⏸️  Stopping services for safe migration...${NC}"
    sudo -u rabhan pm2 stop all || echo "Services not running"
    
    # Run migrations for each service
    run_service_migrations "auth-service"
    run_service_migrations "user-service"
    run_service_migrations "document-service" 
    run_service_migrations "contractor-service"
    
    # Check results
    check_table_creation
    
    # Start services again
    echo -e "\n${YELLOW}🚀 Restarting services...${NC}"
    sudo -u rabhan pm2 start all
    
    # Final verification
    echo -e "\n${BLUE}🏁 Migration Summary${NC}"
    echo "----------------------------------------"
    echo "Migration completed at: $(date)"
    echo "Backups stored in: $BACKUP_DIR"
    echo "Backup timestamp: $TIMESTAMP"
    
    # Show PM2 status
    echo -e "\n${BLUE}📊 Service Status:${NC}"
    sudo -u rabhan pm2 status
    
    echo -e "\n${GREEN}✅ Database migrations completed successfully!${NC}"
}

# Check if PostgreSQL is running
if ! sudo systemctl is-active --quiet postgresql; then
    echo -e "${RED}❌ PostgreSQL is not running. Please start it first.${NC}"
    echo "sudo systemctl start postgresql"
    exit 1
fi

# Run main migration process
main

# Cleanup old backups (keep last 10)
echo -e "\n${BLUE}🧹 Cleaning up old backups...${NC}"
find $BACKUP_DIR -name "*.sql" -type f -mtime +30 -exec rm {} \; 2>/dev/null || true

echo -e "\n${GREEN}🎉 All database migrations completed successfully!${NC}"