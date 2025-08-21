#!/bin/bash

# Stop Git Workflows and Continuous Processes (Linux/macOS)
# Usage: ./stop-git-workflows.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Emojis
STOP="🛑"
CHECK="✅"
WARNING="⚠️"
SEARCH="🔍"
TOOLS="🔧"

echo
echo "===================================================="
echo "${STOP} STOP Git Workflows and Continuous Processes"
echo "===================================================="
echo

echo "${SEARCH} Stopping all Node.js processes..."
pkill -f node 2>/dev/null || true

echo "${SEARCH} Stopping any git-related processes..."
pkill -f git 2>/dev/null || true
pkill -f ssh 2>/dev/null || true

echo "${SEARCH} Stopping any Docker processes..."
pkill -f docker 2>/dev/null || true

echo "${SEARCH} Stopping any CI/CD related processes..."
pkill -f npm 2>/dev/null || true
pkill -f yarn 2>/dev/null || true
pkill -f deploy 2>/dev/null || true
pkill -f workflow 2>/dev/null || true
pkill -f action 2>/dev/null || true

echo "${SEARCH} Clearing git hooks..."
if [ -d ".git/hooks" ]; then
    rm -f .git/hooks/pre-commit
    rm -f .git/hooks/post-commit
    rm -f .git/hooks/pre-push
    rm -f .git/hooks/post-receive
    echo "Git hooks cleared"
fi

echo "${SEARCH} Disabling git auto-deployment..."
git config --unset deploy.remote 2>/dev/null || true
git config --unset deploy.branch 2>/dev/null || true
git config --unset hooks.pre-push 2>/dev/null || true

echo "${SEARCH} Stopping any background deployment scripts..."
# Kill any deployment-related processes
ps aux | grep -E "(deploy|workflow|action)" | grep -v grep | awk '{print $2}' | xargs kill -9 2>/dev/null || true

echo "${SEARCH} Checking for any remaining processes on deployment ports..."
# Kill processes on common deployment ports
for port in 8080 9000 22 443 80; do
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
done

echo
echo "${CHECK} All git workflows and continuous processes stopped!"
echo

echo "📊 Verifying cleanup..."
echo "================================"

# Check if Node.js processes are stopped
if pgrep node >/dev/null 2>&1; then
    echo "${WARNING} Some Node.js processes still running:"
    pgrep -l node
else
    echo "${CHECK} All Node.js processes stopped"
fi

# Check git processes
if pgrep git >/dev/null 2>&1; then
    echo "${WARNING} Some git processes still running:"
    pgrep -l git
else
    echo "${CHECK} All git processes stopped"
fi

# Check for deployment processes
if pgrep -f deploy >/dev/null 2>&1; then
    echo "${WARNING} Some deployment processes still running:"
    pgrep -lf deploy
else
    echo "${CHECK} All deployment processes stopped"
fi

echo
echo "${TOOLS} Recommended actions:"
echo "================================"
echo "1. Commit your changes: git add . && git commit -m 'Stop workflows'"
echo "2. Push manually when ready: git push"
echo "3. Use ./start-all.sh to restart RABHAN services only"
echo "4. Disable GitHub Actions in repository settings if needed"
echo

echo "📋 Git status:"
change_count=$(git status --porcelain | wc -l)
echo "You have $change_count pending changes"

echo
echo "🚀 To restart RABHAN services cleanly: ./start-all.sh"
echo "🛑 If issues persist, restart your computer"
echo

# Show current running processes that might be relevant
echo "🔍 Current relevant processes:"
echo "================================"
ps aux | grep -E "(node|git|npm|deploy|workflow)" | grep -v grep | head -10

echo
echo "✅ Cleanup complete!"