#!/bin/bash

# RABHAN Production Secrets Generator
# Generates secure random strings for production deployment

echo "🔐 Generating production secrets for RABHAN..."

# Generate JWT secrets (64 characters each)
JWT_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)
JWT_REFRESH_SECRET=$(openssl rand -base64 48 | tr -d "=+/" | cut -c1-64)

# Generate database passwords (32 characters each)
POSTGRES_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)
AUTH_DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)
USER_DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)
DOCUMENT_DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)
CONTRACTOR_DB_PASSWORD=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)

# Generate encryption key for documents
DOCUMENT_ENCRYPTION_KEY=$(openssl rand -base64 24 | tr -d "=+/" | cut -c1-32)

echo "🔑 Generated secrets (SAVE THESE SECURELY!):"
echo "======================================"
echo "JWT_SECRET=$JWT_SECRET"
echo "JWT_REFRESH_SECRET=$JWT_REFRESH_SECRET"
echo ""
echo "POSTGRES_PASSWORD=$POSTGRES_PASSWORD"
echo "AUTH_DATABASE_PASSWORD=$AUTH_DB_PASSWORD"
echo "USER_DATABASE_PASSWORD=$USER_DB_PASSWORD"
echo "DOCUMENT_DATABASE_PASSWORD=$DOCUMENT_DB_PASSWORD"
echo "CONTRACTOR_DATABASE_PASSWORD=$CONTRACTOR_DB_PASSWORD"
echo ""
echo "DOCUMENT_ENCRYPTION_KEY=$DOCUMENT_ENCRYPTION_KEY"
echo "======================================"

# Create production environment file with secrets
echo "📝 Creating production environment file with secrets..."

# Copy template and replace placeholders
cp .env.production .env.production.with-secrets

# Replace secrets in the file
sed -i "s/CHANGE_THIS_TO_SECURE_RANDOM_STRING_32_CHARS_MIN/$JWT_SECRET/g" .env.production.with-secrets
sed -i "s/CHANGE_THIS_TO_SECURE_REFRESH_STRING_32_CHARS_MIN/$JWT_REFRESH_SECRET/g" .env.production.with-secrets
sed -i "s/CHANGE_THIS_SECURE_POSTGRES_PASSWORD/$POSTGRES_PASSWORD/g" .env.production.with-secrets
sed -i "s/CHANGE_THIS_AUTH_DB_PASSWORD/$AUTH_DB_PASSWORD/g" .env.production.with-secrets
sed -i "s/CHANGE_THIS_USER_DB_PASSWORD/$USER_DB_PASSWORD/g" .env.production.with-secrets
sed -i "s/CHANGE_THIS_DOCUMENT_DB_PASSWORD/$DOCUMENT_DB_PASSWORD/g" .env.production.with-secrets
sed -i "s/CHANGE_THIS_CONTRACTOR_DB_PASSWORD/$CONTRACTOR_DB_PASSWORD/g" .env.production.with-secrets
sed -i "s/CHANGE_THIS_TO_SECURE_ENCRYPTION_KEY_32_CHARS/$DOCUMENT_ENCRYPTION_KEY/g" .env.production.with-secrets

echo "✅ Production environment file created: .env.production.with-secrets"
echo ""
echo "⚠️  IMPORTANT SECURITY NOTES:"
echo "   1. Keep these secrets SECURE and PRIVATE"
echo "   2. Store them in AWS Secrets Manager or similar"
echo "   3. Never commit secrets to version control"
echo "   4. Use different secrets for each environment"
echo "   5. Rotate secrets regularly (every 90 days)"
echo ""
echo "🚀 Ready for production deployment!"