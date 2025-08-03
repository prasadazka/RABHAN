# 🚀 RABHAN AWS t3.large Deployment Guide

## **Quick Start Deployment**

### **Prerequisites**
- Fresh AWS t3.large instance (Ubuntu 22.04 LTS)
- Domain name pointed to your server IP
- SSH access to the server

### **Step 1: Prepare Deployment Files**
```bash
# On your local machine
cd E:\RABHAN

# Generate production secrets
cd deployment/env
chmod +x generate-secrets.sh
./generate-secrets.sh

# Update domain in NGINX config
sed -i 's/your-domain.com/rabhan.sa/g' deployment/nginx/rabhan.conf
```

### **Step 2: Upload to Server**
```bash
# Upload deployment files to server
scp -r deployment/ ubuntu@your-server-ip:/tmp/
scp -r backend/ ubuntu@your-server-ip:/tmp/
scp -r frontend/ ubuntu@your-server-ip:/tmp/
```

### **Step 3: Run Deployment**
```bash
# SSH to server
ssh ubuntu@your-server-ip

# Move files and run deployment
sudo mv /tmp/deployment /opt/
sudo mv /tmp/backend /opt/
sudo mv /tmp/frontend /opt/

# Make scripts executable
chmod +x /opt/deployment/*.sh
chmod +x /opt/deployment/database/*.sh
chmod +x /opt/deployment/env/*.sh

# Run deployment (takes 10-15 minutes)
cd /opt/deployment
sudo ./deploy.sh
```

### **Step 4: Update Configuration**
```bash
# Update secrets in environment file
sudo nano /opt/rabhan/.env

# Update database passwords
sudo -u postgres psql -f /opt/deployment/database/setup-databases.sql

# Run database migrations
sudo ./database/migrate-databases.sh
```

### **Step 5: Verify Deployment**
```bash
# Check services
sudo -u rabhan pm2 status

# Test endpoints
curl https://your-domain.com/health
curl https://your-domain.com/api/auth/health
curl https://your-domain.com/api/users/health
```

---

## **File Structure**

```
deployment/
├── deploy.sh                 # Main deployment script
├── update.sh                 # Update deployment script
├── ecosystem.config.js       # PM2 configuration
├── README.md                 # This file
├── nginx/
│   ├── rabhan.conf           # NGINX site configuration
│   └── proxy_params          # NGINX proxy parameters
├── env/
│   ├── .env.production       # Production environment template
│   └── generate-secrets.sh   # Secret generation script
└── database/
    ├── setup-databases.sql   # Database setup script
    ├── migrate-databases.sh  # Migration script
    └── backup-databases.sh   # Backup script
```

---

## **Service Architecture**

### **Ports & Services**
| Service | Port | Memory | Purpose |
|---------|------|--------|---------|
| Frontend | 80/443 | - | React app via NGINX |
| Auth Service | 3001 | 300MB | Authentication & JWT |
| User Service | 3002 | 250MB | User profiles & KYC |
| Document Service | 3003 | 400MB | File uploads & storage |
| Contractor Service | 3004 | 250MB | Contractor management |
| Solar Calculator | 3005 | 200MB | Solar calculations |
| PostgreSQL | 5432 | 1GB | Database |
| Redis | 6379 | 200MB | Cache & sessions |

### **Resource Usage (t3.large: 2 vCPU, 8GB RAM)**
- **Application Services**: ~1.4GB RAM
- **Databases**: ~1.2GB RAM  
- **System + NGINX**: ~300MB RAM
- **Available Buffer**: ~5GB RAM ✅

---

## **Management Commands**

### **Service Management**
```bash
# PM2 commands (run as rabhan user)
sudo -u rabhan pm2 status          # Check status
sudo -u rabhan pm2 logs             # View logs  
sudo -u rabhan pm2 restart all      # Restart all
sudo -u rabhan pm2 reload all       # Zero-downtime reload
sudo -u rabhan pm2 stop all         # Stop all services
sudo -u rabhan pm2 start all        # Start all services

# Individual service control
sudo -u rabhan pm2 restart rabhan-auth-service
sudo -u rabhan pm2 logs rabhan-user-service
```

### **Database Management**
```bash
# Connect to databases
sudo -u postgres psql -d rabhan_auth
sudo -u postgres psql -d rabhan_user
sudo -u postgres psql -d rabhan_documents
sudo -u postgres psql -d rabhan_contractors

# Run backups
sudo ./database/backup-databases.sh

# Run migrations
sudo ./database/migrate-databases.sh
```

### **NGINX Management**
```bash
# Test configuration
sudo nginx -t

# Reload configuration
sudo systemctl reload nginx

# View logs
sudo tail -f /var/log/nginx/rabhan_access.log
sudo tail -f /var/log/nginx/rabhan_error.log
```

---

## **Monitoring & Maintenance**

### **Health Checks**
```bash
# Service health endpoints
curl https://your-domain.com/health
curl https://your-domain.com/api/auth/health
curl https://your-domain.com/api/users/health
curl https://your-domain.com/api/documents/health
curl https://your-domain.com/api/contractors/health
curl https://your-domain.com/api/solar-calculator/health

# System resources
htop
df -h
free -h
```

### **Log Locations**
```bash
# Application logs
/var/log/rabhan/auth-service.log
/var/log/rabhan/user-service.log
/var/log/rabhan/document-service.log
/var/log/rabhan/contractor-service.log
/var/log/rabhan/solar-calculator.log

# System logs
/var/log/nginx/rabhan_access.log
/var/log/nginx/rabhan_error.log
/var/log/postgresql/postgresql-14-main.log
```

### **Automated Backups**
```bash
# Set up daily backups (2 AM)
sudo crontab -e
# Add: 0 2 * * * /opt/deployment/database/backup-databases.sh

# Backup location
/opt/backups/rabhan/
```

---

## **Security Configuration**

### **Firewall (UFW)**
```bash
# Check status
sudo ufw status

# Allow specific ports if needed
sudo ufw allow from specific-ip to any port 5432  # PostgreSQL
sudo ufw allow from specific-ip to any port 6379  # Redis
```

### **SSL Certificate Renewal**
```bash
# Auto-renewal (already configured)
sudo certbot renew --dry-run

# Manual renewal
sudo certbot renew
sudo systemctl reload nginx
```

### **Security Updates**
```bash
# Regular system updates
sudo apt update && sudo apt upgrade -y

# Node.js security updates
sudo npm audit fix
```

---

## **Troubleshooting**

### **Common Issues**

1. **Service Won't Start**
   ```bash
   # Check PM2 logs
   sudo -u rabhan pm2 logs servicename
   
   # Check environment variables
   sudo -u rabhan cat /opt/rabhan/.env
   ```

2. **Database Connection Issues**
   ```bash
   # Check PostgreSQL status
   sudo systemctl status postgresql
   
   # Test connection
   sudo -u postgres psql -d rabhan_auth -c "SELECT 1;"
   ```

3. **NGINX Issues**
   ```bash
   # Test configuration
   sudo nginx -t
   
   # Check error logs
   sudo tail -f /var/log/nginx/error.log
   ```

4. **High Memory Usage**
   ```bash
   # Check memory usage
   free -h
   
   # Restart services to free memory
   sudo -u rabhan pm2 restart all
   ```

### **Performance Optimization**

1. **Database Optimization**
   ```sql
   -- Run as postgres user
   VACUUM ANALYZE;
   REINDEX DATABASE rabhan_auth;
   ```

2. **PM2 Optimization**
   ```bash
   # Monitor performance
   sudo -u rabhan pm2 monit
   
   # Adjust memory limits in ecosystem.config.js
   ```

---

## **Scaling Considerations**

### **When to Upgrade from t3.large**

**Upgrade to t3.xlarge (4 vCPU, 16GB) when:**
- Memory usage consistently >85%
- CPU usage consistently >80%
- Adding Phase 2+ features (AI, Analytics)
- Handling >1000 concurrent users

### **Horizontal Scaling Options**
- **Database**: Move to RDS PostgreSQL
- **Cache**: Move to ElastiCache Redis
- **Load Balancer**: Add Application Load Balancer
- **CDN**: Add CloudFront for static assets

---

## **Deployment Checklist**

### **Pre-Deployment**
- [ ] Domain DNS configured
- [ ] Server security groups configured
- [ ] SSL certificate ready
- [ ] Environment secrets generated
- [ ] Database passwords updated

### **Post-Deployment**
- [ ] All services running (PM2 status)
- [ ] Health checks passing
- [ ] SSL certificate installed
- [ ] Database migrations completed
- [ ] Backups configured
- [ ] Monitoring set up
- [ ] Performance tested

### **Production Readiness**
- [ ] Load testing completed
- [ ] Security audit passed
- [ ] Backup and recovery tested
- [ ] Monitoring and alerting configured
- [ ] Documentation updated
- [ ] Team access configured

---

## **Support & Maintenance**

### **Regular Maintenance Tasks**
- **Daily**: Check service status, review logs
- **Weekly**: Check disk space, review performance
- **Monthly**: Update system packages, rotate logs  
- **Quarterly**: Security audit, backup testing

### **Emergency Procedures**
- **Service Down**: `sudo -u rabhan pm2 restart all`
- **Database Issues**: Check logs, restart PostgreSQL
- **High Load**: Scale services, check bottlenecks
- **Security Issue**: Review logs, update firewall

---

**✅ RABHAN is now ready for production deployment on AWS t3.large!**