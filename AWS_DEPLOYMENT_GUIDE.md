# RABHAN Platform - AWS t3.large Single Instance Deployment Guide

## 🏗️ Architecture Overview
- **Instance**: Single t3.large (2 vCPU, 8GB RAM)
- **Frontend Apps**: Main RABHAN + Admin Portal
- **Backend**: 8 Microservices (Node.js/TypeScript)
- **Database**: PostgreSQL + Redis
- **Reverse Proxy**: Nginx with SSL termination
- **Containerization**: Docker Compose

## 📋 Pre-Deployment Checklist

### 1. AWS Instance Setup
```bash
# Launch t3.large instance with Ubuntu 20.04 LTS
# Security Group: Allow ports 80, 443, 22
# Storage: 20GB+ EBS volume
# Key Pair: For SSH access
```

### 2. Domain Configuration
```bash
# Point your domains to AWS instance IP:
# A record: rabhan.com → YOUR_AWS_IP
# A record: admin.rabhan.com → YOUR_AWS_IP
```

### 3. Required Environment Variables
Copy `.env.production` to `.env` and configure:
```bash
DB_PASSWORD=your_secure_database_password
REDIS_PASSWORD=your_secure_redis_password
JWT_SECRET=your_256_bit_jwt_secret
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
DOMAIN=rabhan.com
ADMIN_DOMAIN=admin.rabhan.com
```

## 🚀 Deployment Process

### Step 1: Connect to AWS Instance
```bash
ssh -i your-key.pem ubuntu@YOUR_AWS_IP
```

### Step 2: Clone Repository
```bash
cd /opt
sudo git clone https://github.com/your-repo/rabhan-platform.git rabhan
cd rabhan
```

### Step 3: Configure Environment
```bash
sudo cp .env.production .env
sudo nano .env  # Edit with your actual values
```

### Step 4: Run Deployment Script
```bash
sudo ./deploy.sh
```

The script will automatically:
- ✅ Install Docker & Docker Compose
- ✅ Setup directories and permissions
- ✅ Build all Docker images
- ✅ Start all services
- ✅ Configure Nginx reverse proxy
- ✅ Setup SSL certificates (Let's Encrypt)
- ✅ Configure monitoring and backups

### Step 5: Verify Deployment
```bash
# Check service status
/usr/local/bin/rabhan-monitor.sh

# View service logs
docker-compose -f docker-compose.production.yml logs -f auth-service
```

## 🌐 Service Architecture

### Port Mapping (Internal Docker Network)
```
Internet (80/443) → Nginx → Internal Services:
├── Frontend: rabhan.com → container:80
├── Admin: admin.rabhan.com → container:80
├── Auth API: /api/auth → auth-service:3001
├── User API: /api/user → user-service:3002
├── Document API: /api/document → document-service:3003
├── Contractor API: /api/contractor → contractor-service:3004
├── Solar API: /api/solar → solar-calculator:3005
├── Admin API: /api/admin → admin-service:3006
├── Marketplace API: /api/marketplace → marketplace-service:3007
└── Proxy API: /api/proxy → document-proxy:3008
```

### Database Setup
```yaml
PostgreSQL Databases:
- rabhan_auth (Authentication)
- rabhan_user (User Management)
- rabhan_contractor (Contractor Data)
- rabhan_document (Document Storage)
- rabhan_admin (Admin Functions)
- rabhan_quote (Quote System)
- rabhan_marketplace (Product Catalog)

Redis Databases:
- DB 0: Authentication sessions
- DB 1: User service cache
- DB 2: Document service cache
- DB 3: Admin service cache
```

## 🔒 Security Features

### SSL/TLS
- Automatic Let's Encrypt certificates
- HTTPS redirect
- Security headers (HSTS, CSP, etc.)

### Rate Limiting
```nginx
# Authentication endpoints: 5 req/sec
# API endpoints: 10 req/sec
# Burst limits configured per service
```

### Container Security
- Non-root user execution
- Read-only file systems where applicable
- Health checks for all services
- Resource limits

## 📊 Monitoring & Maintenance

### Health Monitoring
```bash
# Service status check
/usr/local/bin/rabhan-monitor.sh

# Individual service logs
docker-compose logs -f [service-name]

# System resources
htop
df -h
```

### Backup System
```bash
# Manual backup
/usr/local/bin/rabhan-backup.sh

# Automated daily backups at 2 AM
# Retention: 7 days
```

### Log Management
- Docker logs rotated daily
- 7-day retention
- Compressed archives

## 🛠️ Operational Commands

### Service Management
```bash
cd /opt/rabhan

# Restart all services
docker-compose -f docker-compose.production.yml restart

# Restart specific service
docker-compose -f docker-compose.production.yml restart auth-service

# Update services (zero-downtime)
docker-compose -f docker-compose.production.yml up -d --no-deps auth-service

# View service logs
docker-compose -f docker-compose.production.yml logs -f --tail=100 auth-service
```

### Database Operations
```bash
# Database backup
docker exec rabhan-postgres pg_dumpall -U postgres > backup.sql

# Access PostgreSQL
docker exec -it rabhan-postgres psql -U postgres -d rabhan_auth

# Access Redis
docker exec -it rabhan-redis redis-cli -a $REDIS_PASSWORD
```

### SSL Renewal
```bash
# Automatic renewal (configured in cron)
certbot renew --nginx

# Manual renewal
certbot certbot --nginx -d rabhan.com -d admin.rabhan.com
```

## 🚨 Troubleshooting

### Common Issues
1. **Services not starting**: Check Docker logs and environment variables
2. **SSL issues**: Ensure domains point to correct IP
3. **Database connection errors**: Verify PostgreSQL is running
4. **Memory issues**: Monitor with `htop`, consider service restarts

### Performance Optimization
```bash
# For t3.large (8GB RAM):
# - PostgreSQL: max_connections=100, shared_buffers=2GB
# - Redis: maxmemory=1GB
# - Node.js services: --max-old-space-size=512
```

### Emergency Procedures
```bash
# Stop all services
docker-compose -f docker-compose.production.yml down

# Emergency restart
sudo reboot

# Restore from backup
./scripts/restore-backup.sh /backup/rabhan/YYYYMMDD_HHMMSS
```

## 📈 Resource Usage

### Expected Usage (t3.large):
- **CPU**: 60-80% under normal load
- **RAM**: 6-7GB utilized
- **Storage**: 5-10GB for application data
- **Network**: Variable based on traffic

### Scaling Considerations
When ready to scale:
1. Move databases to RDS
2. Use ECS/EKS for services
3. Add Load Balancer
4. Implement Redis Cluster

## 🎯 Success Metrics
- ✅ All 10 services running (2 frontend + 8 backend)
- ✅ SSL certificates active
- ✅ Database connections healthy
- ✅ API response times < 500ms
- ✅ Zero-downtime deployments
- ✅ Automated backups functioning

## 📞 Support
For issues or questions:
1. Check logs: `docker-compose logs -f [service]`
2. Verify environment variables in `.env`
3. Ensure all services are healthy: `/usr/local/bin/rabhan-monitor.sh`
4. Review this guide for troubleshooting steps

---

**🎉 Your RABHAN Platform is now production-ready on AWS!**