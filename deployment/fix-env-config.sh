#!/bin/bash

# Fix environment configuration issues on AWS
# This sets up temporary Twilio config for development

echo "🔧 Fixing environment configuration..."

# Navigate to auth service directory
cd /opt/rabhan/backend/services/auth-service

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file for auth service..."
    cat > .env << 'EOF'
# RABHAN Auth Service Environment Configuration

# Environment
NODE_ENV=production

# Database
DATABASE_URL=postgresql://rabhan_auth:temp_password_auth@localhost:5432/rabhan_auth

# JWT Configuration
JWT_SECRET=rabhan_jwt_secret_key_for_development_only_change_in_production
JWT_REFRESH_SECRET=rabhan_jwt_refresh_secret_key_for_development_only_change_in_production

# Twilio Configuration (temporary - for development only)
TWILIO_ACCOUNT_SID=AC_temporary_development_sid
TWILIO_AUTH_TOKEN=temporary_development_token
TWILIO_PHONE_NUMBER=+15551234567

# Redis Configuration
REDIS_URL=redis://localhost:6379

# SAMA Compliance
SAMA_AUDIT_ENABLED=true
SAMA_COMPLIANCE_MODE=production

# Security Settings
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
MAX_LOGIN_ATTEMPTS=20
ACCOUNT_LOCK_DURATION_MS=300000

# Logging
LOG_LEVEL=info
LOG_FORMAT=json

# Development settings - skip phone verification for testing
SKIP_PHONE_VERIFICATION=true
EOF
    echo "✅ Created .env file with temporary configuration"
else
    echo "⚠️  .env file already exists"
    
    # Add missing variables if they don't exist
    if ! grep -q "TWILIO_ACCOUNT_SID" .env; then
        echo "TWILIO_ACCOUNT_SID=AC_temporary_development_sid" >> .env
    fi
    
    if ! grep -q "TWILIO_AUTH_TOKEN" .env; then
        echo "TWILIO_AUTH_TOKEN=temporary_development_token" >> .env
    fi
    
    if ! grep -q "TWILIO_PHONE_NUMBER" .env; then
        echo "TWILIO_PHONE_NUMBER=+15551234567" >> .env
    fi
    
    if ! grep -q "SKIP_PHONE_VERIFICATION" .env; then
        echo "SKIP_PHONE_VERIFICATION=true" >> .env
    fi
    
    echo "✅ Updated .env with missing variables"
fi

# Set proper permissions
chmod 600 .env
chown ubuntu:ubuntu .env

echo "🏁 Environment configuration fixed!"