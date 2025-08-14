# 🚀 RABHAN CI/CD Deployment Guide

## Overview
This guide sets up a **clean CI/CD pipeline** that automatically deploys your RABHAN platform to AWS without requiring any source code changes.

## 🛠️ Setup Instructions

### 1. GitHub Secrets Configuration
Add these secrets to your GitHub repository (`Settings > Secrets > Actions`):

```bash
# Required Secrets:
AWS_SSH_PRIVATE_KEY=<your-rabhan-key.pem-content>
DB_PASSWORD=<your-secure-database-password>
REDIS_PASSWORD=<your-secure-redis-password>
JWT_SECRET=<your-256-bit-jwt-secret>
JWT_REFRESH_SECRET=<your-256-bit-jwt-refresh-secret>
TWILIO_ACCOUNT_SID=<your-twilio-account-sid>
TWILIO_AUTH_TOKEN=<your-twilio-auth-token>
TWILIO_PHONE_NUMBER=<your-twilio-phone-number>
```

### 2. Add SSH Key to GitHub Secrets
```bash
# Copy your SSH key content:
cat rabhan-key.pem

# Add this content to GitHub Secret: AWS_SSH_PRIVATE_KEY
```

### 3. Configure Production Environment
Update `.env.production` with your actual values, then the CI/CD will use these automatically.

## 🎯 Available Workflows

### 1. **Auto Deploy** (`deploy-to-aws.yml`)
- **Trigger**: Push to `master` branch or manual dispatch
- **Actions**: 
  - ✅ Builds frontend applications
  - ✅ Deploys to AWS with zero-downtime
  - ✅ Runs health checks
  - ✅ Creates management scripts

### 2. **Health Check** (`health-check.yml`)
- **Trigger**: Every 30 minutes + manual dispatch
- **Actions**:
  - ✅ Monitors all services
  - ✅ Checks database connectivity
  - ✅ Auto-restarts failed services
  - ✅ Generates status reports

### 3. **Manual Control** (`manual-deploy.yml`)
- **Trigger**: Manual dispatch only
- **Actions**:
  - 📊 Check status
  - 🔄 Restart services
  - 🛑 Stop services
  - 📄 View logs
  - 💾 Create backups
  - 🧹 System cleanup

## 🚀 How to Deploy

### Option 1: Automatic (Recommended)
```bash
# Just push to master branch:
git add .
git commit -m "Deploy RABHAN platform"
git push origin master

# GitHub Actions will automatically deploy to AWS!
```

### Option 2: Manual Deployment
1. Go to GitHub > Actions > "🚀 Deploy RABHAN to AWS"
2. Click "Run workflow"
3. Select environment (production)
4. Click "Run workflow"

## 📊 Monitoring Your Deployment

### View Deployment Status
- Go to **GitHub > Actions** to see real-time deployment progress
- All steps are logged with emojis for easy tracking

### Check Production Health
- **Auto Health Checks**: Run every 30 minutes
- **Manual Health Check**: GitHub Actions > "🏥 Production Health Check"

### Access Your Applications
After successful deployment:
- **Main App**: http://16.170.220.109:3000
- **Admin Panel**: http://16.170.220.109:3010
- **All APIs**: Ports 3001-3008

## 🛠️ Management Commands

### SSH to AWS and use these commands:
```bash
# Check status
rabhan-status

# Restart all services
rabhan-restart

# View logs
docker-compose -f /opt/rabhan/docker-compose.production.yml logs -f
```

### Or use GitHub Actions:
1. Go to **Actions > "🎛️ Manual Deployment Control"**
2. Choose action: `status`, `restart`, `logs`, `backup`, `cleanup`
3. Optionally select specific service
4. Run workflow

## 🔒 Security Features

- ✅ **No sensitive data in source code**
- ✅ **All secrets managed through GitHub**
- ✅ **SSH key rotation support**
- ✅ **Automated security updates**
- ✅ **Production environment isolation**

## 🐳 Docker Architecture

The CI/CD uses your existing `docker-compose.production.yml`:
- **11 Services**: 9 backend + 2 frontend
- **Databases**: PostgreSQL (7 databases) + Redis
- **Reverse Proxy**: Nginx with SSL
- **Health Checks**: All services monitored
- **Auto-restart**: Failed services restart automatically

## 🚨 Troubleshooting

### Deployment Failed?
1. Check **GitHub Actions logs** for specific errors
2. Use **Manual Control** workflow to check status
3. SSH to AWS: `ssh -i rabhan-key.pem ubuntu@16.170.220.109`
4. Run: `rabhan-status` to see current state

### Services Not Starting?
1. Use **Manual Control** > **View Logs**
2. Check environment variables in GitHub Secrets
3. Verify Docker containers: `docker-compose ps`

### Database Issues?
1. Check PostgreSQL logs: `docker logs rabhan-postgres`
2. Test connectivity: `docker exec rabhan-postgres pg_isready`
3. Manual backup: Use **Manual Control** > **Backup**

## 📈 What's Automated

✅ **Code Deployment**: Zero-downtime updates  
✅ **Environment Setup**: Production environment auto-configured  
✅ **Database Management**: Automatic migrations & backups  
✅ **Health Monitoring**: 24/7 service monitoring  
✅ **Auto-Recovery**: Failed services restart automatically  
✅ **Security Updates**: Docker images stay updated  
✅ **Log Management**: Automated log rotation  
✅ **Backup System**: Daily automated backups  

## 🎯 Benefits

1. **Zero Source Code Changes**: No deployment configs in your code
2. **One-Click Deployment**: Push to master = automatic deployment
3. **Professional Monitoring**: 24/7 health checks
4. **Easy Management**: GitHub Actions UI for all operations
5. **Secure**: All credentials managed through GitHub Secrets
6. **Scalable**: Easy to add more environments

---

## 🚀 Ready to Deploy?

1. **Add GitHub Secrets** (see step 1 above)
2. **Push to master branch**
3. **Watch the magic happen in GitHub Actions!**

Your RABHAN platform will be live in ~5-10 minutes! 🎉