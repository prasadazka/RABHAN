# Solar Calculator API Fix - Port 3000 to Port 80 Issue

## Problem
Frontend was making API calls to port 3000 instead of nginx proxy on port 80, causing 405 errors:
```
POST http://16.170.220.109:3000/api/solar-calculator/calculate 405 (Not Allowed)
```

## Root Cause
- Frontend container runs on port 3000
- Solar calculator service runs on port 3005  
- Nginx proxy runs on port 80
- Frontend was using relative URLs (`/api/solar-calculator`) which resolved to current container origin (port 3000)

## Solution Steps

### 1. Update Frontend Environment Variables
```bash
ssh -i rabhan-key.pem ubuntu@ec2-16-170-220-109.eu-north-1.compute.amazonaws.com
cd /opt/rabhan/frontend/rabhan-web
```

Edit `.env.production`:
```env
# Change from relative URLs to absolute URLs pointing to port 80
VITE_SOLAR_API_URL=http://16.170.220.109/api/solar-calculator
VITE_AUTH_API_URL=http://16.170.220.109/api/auth
VITE_USER_API_URL=http://16.170.220.109/api/users
# ... other APIs
```

### 2. Configure Nginx Proxy
Create nginx config to route API calls properly:
```nginx
server {
    listen 80;
    server_name _;
    
    # API Routes - Handle FIRST before frontend
    location /api/solar-calculator/ {
        proxy_pass http://localhost:3005/api/solar-calculator/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend - serves static files
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Apply nginx config:
```bash
sudo cp /tmp/rabhan-proxy.conf /etc/nginx/sites-available/
sudo rm -f /etc/nginx/sites-enabled/*
sudo ln -sf /etc/nginx/sites-available/rabhan-proxy.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 3. Rebuild Frontend
```bash
cd /opt/rabhan/frontend/rabhan-web
npm run build
```

### 4. Update Frontend Container
```bash
# Stop old container
sudo docker rm -f rabhan-frontend

# Copy built files to container
sudo docker run -d --name rabhan-frontend -p 3000:80 --restart=unless-stopped nginx:alpine
sudo tar -C /opt/rabhan/frontend/rabhan-web/dist -cf - . | sudo docker exec -i rabhan-frontend tar -C /usr/share/nginx/html -xf -
```

## Verification
Test both frontend and API:
```bash
# Test frontend loads
curl -s -I http://16.170.220.109/ | head -1
# Should return: HTTP/1.1 200 OK

# Test API works
curl -s http://16.170.220.109/api/solar-calculator/health
# Should return: {"success":true,"service":"solar-calculator-service","status":"healthy"}
```

## Architecture
```
Browser Request → Port 80 (nginx) → Routes to:
├── /api/solar-calculator/ → Port 3005 (solar service)
└── /* → Port 3000 (frontend container)
```

## Key Insights
1. **Use absolute URLs** in production environment variables
2. **API routes must be defined BEFORE** catch-all frontend route in nginx
3. **Frontend container** should only serve static files, not handle API calls
4. **Nginx proxy** handles all external traffic and routes appropriately

## Files Changed
- `/opt/rabhan/frontend/rabhan-web/.env.production` - Updated API URLs
- `/etc/nginx/sites-enabled/rabhan-proxy.conf` - Nginx configuration
- Frontend container rebuilt with new environment

## Status: ✅ FIXED
- Frontend: Working at http://16.170.220.109/
- Solar Calculator API: Working at http://16.170.220.109/api/solar-calculator/
- No more CORS or 405 errors