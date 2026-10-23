#!/usr/bin/env bash
set -e

BRANCH="${1:-feature/gemini-free-models}"

echo "=========================================="
echo "🚀 Deploying NinaivuKalanjiyam on EC2"
echo "Target Branch: $BRANCH"
echo "=========================================="

# 1. Pull latest changes from remote
echo -e "\n📥 Fetching latest commits from GitHub..."
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull origin "$BRANCH"

# 2. Build React Frontend
echo -e "\n📦 Building React Frontend (production)..."
cd frontend
npm ci || npm install
npm run build
cd ..

# 3. Backend Setup
echo -e "\n⚙️ Installing Backend Dependencies..."
cd backend
npm ci --only=production || npm install --production

# 4. Database Migrations
echo -e "\n🗄️ Checking / Running Database Migrations..."
node scripts/migrate.js || true

# 5. Restart with PM2
echo -e "\n🔄 Restarting Application with PM2..."
if command -v pm2 &> /dev/null; then
    pm2 restart ecosystem.config.js || pm2 start ecosystem.config.js
    pm2 save
    echo -e "\n✅ PM2 process restarted successfully!"
else
    echo -e "\n⚠️ PM2 is not installed globally. Install with: sudo npm install -g pm2"
fi

echo -e "\n🎉 Deployment Complete! App is live on port 5002."
echo "=========================================="
