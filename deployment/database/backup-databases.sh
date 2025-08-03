#!/bin/bash

# RABHAN Database Backup Script
# Creates compressed backups of all databases

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
BACKUP_DIR="/opt/backups/rabhan"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

echo -e "${BLUE}💾 Starting RABHAN Database Backup${NC}"
echo "=================================================="

# Create backup directory
sudo mkdir -p $BACKUP_DIR/daily
sudo mkdir -p $BACKUP_DIR/weekly
sudo mkdir -p $BACKUP_DIR/monthly

# Function to backup individual database
backup_database() {
    local db_name=$1
    local backup_file="$BACKUP_DIR/daily/${db_name}_backup_${TIMESTAMP}.sql"
    
    echo -e "${YELLOW}📦 Backing up $db_name...${NC}"
    
    # Create SQL dump
    sudo -u postgres pg_dump -Fc --no-acl --no-owner $db_name > $backup_file.custom
    sudo -u postgres pg_dump $db_name > $backup_file
    
    # Compress the plain SQL file
    gzip $backup_file
    
    echo -e "${GREEN}✅ $db_name backup completed${NC}"
    echo "   Custom format: $backup_file.custom"
    echo "   Compressed SQL: $backup_file.gz"
}

# Function to create full cluster backup
backup_full_cluster() {
    local backup_file="$BACKUP_DIR/daily/full_cluster_backup_${TIMESTAMP}.sql"
    
    echo -e "${YELLOW}🗄️  Creating full cluster backup...${NC}"
    
    # Full cluster backup
    sudo -u postgres pg_dumpall > $backup_file
    gzip $backup_file
    
    echo -e "${GREEN}✅ Full cluster backup completed${NC}"
    echo "   File: $backup_file.gz"
}

# Function to verify backup integrity
verify_backup() {
    local backup_file=$1
    local db_name=$2
    
    echo -e "${YELLOW}🔍 Verifying backup: $db_name${NC}"
    
    if [ -f "$backup_file" ]; then
        # Test if file can be read
        if gzip -t "$backup_file" 2>/dev/null; then
            echo -e "${GREEN}✅ Backup file integrity verified${NC}"
        else
            echo -e "${RED}❌ Backup file is corrupted${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ Backup file not found${NC}"
        return 1
    fi
}

# Function to cleanup old backups
cleanup_old_backups() {
    echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
    
    # Keep daily backups for 30 days
    find $BACKUP_DIR/daily -name "*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    find $BACKUP_DIR/daily -name "*.custom" -type f -mtime +$RETENTION_DAYS -delete 2>/dev/null || true
    
    # Keep weekly backups for 12 weeks
    find $BACKUP_DIR/weekly -name "*.sql.gz" -type f -mtime +84 -delete 2>/dev/null || true
    
    # Keep monthly backups for 12 months
    find $BACKUP_DIR/monthly -name "*.sql.gz" -type f -mtime +365 -delete 2>/dev/null || true
    
    echo -e "${GREEN}✅ Cleanup completed${NC}"
}

# Function to create weekly/monthly backups
create_periodic_backups() {
    local day_of_week=$(date +%u)  # 1=Monday, 7=Sunday
    local day_of_month=$(date +%d)
    
    # Weekly backup on Sunday
    if [ $day_of_week -eq 7 ]; then
        echo -e "${BLUE}📅 Creating weekly backup...${NC}"
        cp $BACKUP_DIR/daily/full_cluster_backup_${TIMESTAMP}.sql.gz $BACKUP_DIR/weekly/
    fi
    
    # Monthly backup on 1st of month
    if [ $day_of_month -eq 1 ]; then
        echo -e "${BLUE}📅 Creating monthly backup...${NC}"
        cp $BACKUP_DIR/daily/full_cluster_backup_${TIMESTAMP}.sql.gz $BACKUP_DIR/monthly/
    fi
}

# Function to calculate backup sizes
show_backup_stats() {
    echo -e "\n${BLUE}📊 Backup Statistics${NC}"
    echo "----------------------------------------"
    
    if [ -d "$BACKUP_DIR/daily" ]; then
        local daily_size=$(du -sh $BACKUP_DIR/daily 2>/dev/null | cut -f1)
        local daily_count=$(find $BACKUP_DIR/daily -name "*.gz" | wc -l)
        echo "Daily backups: $daily_count files, $daily_size"
    fi
    
    if [ -d "$BACKUP_DIR/weekly" ]; then
        local weekly_size=$(du -sh $BACKUP_DIR/weekly 2>/dev/null | cut -f1)
        local weekly_count=$(find $BACKUP_DIR/weekly -name "*.gz" | wc -l)
        echo "Weekly backups: $weekly_count files, $weekly_size"
    fi
    
    if [ -d "$BACKUP_DIR/monthly" ]; then
        local monthly_size=$(du -sh $BACKUP_DIR/monthly 2>/dev/null | cut -f1)
        local monthly_count=$(find $BACKUP_DIR/monthly -name "*.gz" | wc -l)
        echo "Monthly backups: $monthly_count files, $monthly_size"
    fi
    
    local total_size=$(du -sh $BACKUP_DIR 2>/dev/null | cut -f1)
    echo "Total backup size: $total_size"
}

# Main backup process
main() {
    # Check if PostgreSQL is running
    if ! sudo systemctl is-active --quiet postgresql; then
        echo -e "${RED}❌ PostgreSQL is not running${NC}"
        exit 1
    fi
    
    # Create individual database backups
    backup_database "rabhan_auth"
    backup_database "rabhan_user"
    backup_database "rabhan_documents"
    backup_database "rabhan_contractors"
    
    # Create full cluster backup
    backup_full_cluster
    
    # Verify backups
    verify_backup "$BACKUP_DIR/daily/rabhan_auth_backup_${TIMESTAMP}.sql.gz" "rabhan_auth"
    verify_backup "$BACKUP_DIR/daily/rabhan_user_backup_${TIMESTAMP}.sql.gz" "rabhan_user"
    verify_backup "$BACKUP_DIR/daily/rabhan_documents_backup_${TIMESTAMP}.sql.gz" "rabhan_documents"
    verify_backup "$BACKUP_DIR/daily/rabhan_contractors_backup_${TIMESTAMP}.sql.gz" "rabhan_contractors"
    verify_backup "$BACKUP_DIR/daily/full_cluster_backup_${TIMESTAMP}.sql.gz" "full_cluster"
    
    # Create periodic backups
    create_periodic_backups
    
    # Cleanup old backups
    cleanup_old_backups
    
    # Show statistics
    show_backup_stats
    
    # Log backup completion
    echo "$(date '+%Y-%m-%d %H:%M:%S') - Backup completed successfully" >> $BACKUP_DIR/backup.log
    
    echo -e "\n${GREEN}✅ Database backup completed successfully!${NC}"
    echo "Backup timestamp: $TIMESTAMP"
    echo "Backup location: $BACKUP_DIR"
}

# Run main backup process
main

# Send notification (if configured)
if command -v mail >/dev/null 2>&1; then
    echo "RABHAN database backup completed successfully at $(date)" | mail -s "RABHAN Backup Success" admin@your-domain.com 2>/dev/null || true
fi

echo -e "\n${BLUE}💡 Backup completed! Set up cron job for automated backups:${NC}"
echo "# Daily backup at 2 AM"
echo "0 2 * * * /opt/rabhan/deployment/database/backup-databases.sh"