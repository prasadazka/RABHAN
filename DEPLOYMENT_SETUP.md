# RABHAN AWS Deployment - GitHub Actions

## ✅ What I Created

1. **GitHub Actions workflow** (`.github/workflows/deploy.yml`)
2. **PM2 ecosystem config** (`ecosystem.config.js`) 
3. **Nginx configuration** (`nginx.conf`)
4. **Complete AWS setup script** (`setup-aws.sh`)

## 🚀 One-Time Setup (5 minutes)

### Step 1: Setup GitHub Repository
```bash
# Initialize git in your project (if not already done)
cd E:\RABHAN_CLEAN\RABHAN_backup_clean\RABHAN_backup
git init
git add .
git commit -m "Initial commit"

# Create GitHub repository and push
gh repo create RABHAN_backup --public
git remote add origin https://github.com/YOUR_USERNAME/RABHAN_backup.git
git push -u origin main
```

### Step 2: Add SSH Key to GitHub Secrets
```bash
# Copy your AWS SSH key content
cat rabhan-key.pem

# Go to GitHub → Your Repository → Settings → Secrets and Variables → Actions
# Add new secret: AWS_SSH_KEY = [paste your SSH key content]
```

### Step 3: Initial AWS Setup
```bash
# Connect to AWS
ssh -i "rabhan-key.pem" ubuntu@ec2-16-170-220-109.eu-north-1.compute.amazonaws.com

# Copy and run the setup script
curl -O https://raw.githubusercontent.com/YOUR_USERNAME/RABHAN_backup/main/setup-aws.sh
chmod +x setup-aws.sh
./setup-aws.sh
```

## 🔄 Daily Workflow (Automatic)

```bash
# Work locally as normal
git add .
git commit -m "your changes"
git push origin main

# ↓ Automatically deploys to AWS ↓
# ✅ Pulls latest code
# ✅ Installs dependencies  
# ✅ Builds services
# ✅ Restarts services
# ✅ Reloads nginx
# ✅ Your changes are live in 30 seconds
```

## 🌍 Access Your Application

- **Main App**: http://16.170.220.109
- **All API endpoints work exactly like locally**
- **No URL changes needed**

## 🛠️ Services Running

All 9 services + frontend:
- Frontend: Port 3000 
- Auth Service: Port 3001
- User Service: Port 3002
- Document Service: Port 3003
- Contractor Service: Port 3004
- Solar Calculator: Port 3005
- Admin Service: Port 3006
- Marketplace Service: Port 3007
- Document Proxy: Port 3008
- Quote Service: Port 3009

## 🔧 Troubleshooting

```bash
# Check service status
ssh aws-server "pm2 status"

# Check logs
ssh aws-server "pm2 logs"

# Restart specific service
ssh aws-server "pm2 restart auth-service"

# Check nginx status
ssh aws-server "sudo systemctl status nginx"
```

## ✅ What This Achieves

- **Zero code changes** to your existing project
- **Automatic deployment** on every git push
- **Exact same API URLs** (`/api/auth`, `/api/users`, etc.)
- **Same database credentials** (`rabhan_user:12345`)
- **Production-ready** with PM2, nginx, PostgreSQL
- **30-second deployments** after git push

Your workflow becomes: `code → commit → push → deployed automatically`