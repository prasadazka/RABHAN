#!/bin/bash

# Reload nginx configuration to apply admin dashboard routes
echo "Reloading nginx configuration..."

# Check if running in Windows (development) or Linux (deployment)
if command -v nginx >/dev/null 2>&1; then
    # Linux deployment - reload nginx
    sudo nginx -t && sudo nginx -s reload
    echo "✅ Nginx configuration reloaded successfully"
else
    echo "⚠️  Nginx not found in PATH. Configuration updated but requires manual nginx reload on server."
    echo "Please run on the AWS server: sudo nginx -s reload"
fi