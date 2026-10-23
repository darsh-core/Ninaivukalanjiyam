#!/usr/bin/env bash
set -e

BRANCH="${1:-main}"

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

# Sync dist with Nginx webroot if /var/www paths exist
if [ -d "/var/www/ninaivukalanjiyam/frontend/dist" ]; then
    echo "Syncing frontend build to /var/www/ninaivukalanjiyam/frontend/dist..."
    sudo cp -r frontend/dist/* /var/www/ninaivukalanjiyam/frontend/dist/ 2>/dev/null || cp -r frontend/dist/* /var/www/ninaivukalanjiyam/frontend/dist/
    sudo mkdir -p /var/www/ninaivukalanjiyam/frontend/dist/api/audio
    sudo cp -rn database/seed_recordings/* /var/www/ninaivukalanjiyam/frontend/dist/api/audio/ 2>/dev/null || true
fi
if [ -d "/var/www/html" ]; then
    sudo cp -r frontend/dist/* /var/www/html/ 2>/dev/null || true
    sudo mkdir -p /var/www/html/api/audio
    sudo cp -rn database/seed_recordings/* /var/www/html/api/audio/ 2>/dev/null || true
fi
if command -v nginx &> /dev/null; then
    echo "Reloading Nginx..."
    sudo systemctl reload nginx 2>/dev/null || true
fi

# 3. Backend Setup & Storage Sync
echo -e "\n⚙️ Installing Backend Dependencies & Syncing Assets..."
cd backend
npm ci --only=production || npm install --production

# Create .env from template if missing
if [ ! -f .env ]; then
    echo "Creating backend .env configuration..."
    if [ -f .env.example ]; then
        cp .env.example .env
    elif [ -f ../.env.example ]; then
        cp ../.env.example .env
    fi
fi

# Ensure uploads directory and sync seed audio recordings
mkdir -p uploads/recordings
if [ -d "../database/seed_recordings" ]; then
    cp -rn ../database/seed_recordings/* uploads/recordings/ 2>/dev/null || cp -r ../database/seed_recordings/* uploads/recordings/
    echo "✅ Synchronized audio recordings into backend/uploads/recordings/"
fi

# 4. PostgreSQL User & Database Setup (if sudo access is available)
if command -v psql &> /dev/null && command -v sudo &> /dev/null; then
    echo -e "\n🔧 Checking PostgreSQL setup..."
    sudo -u postgres psql -c "ALTER USER postgres WITH PASSWORD 'darsh0011';" 2>/dev/null || true
    sudo -u postgres psql -c "CREATE DATABASE \"NinaivuKalanjiyam\";" 2>/dev/null || true
    sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE \"NinaivuKalanjiyam\" TO postgres;" 2>/dev/null || true
fi

# 5. Database Migrations and Backup Restoration
echo -e "\n🗄️ Checking / Running Database Migrations & Data Restore..."
node scripts/migrate.js || true

# 6. Restart with PM2
echo -e "\n🔄 Restarting Application with PM2..."
if command -v pm2 &> /dev/null; then
    pm2 restart ecosystem.config.js --update-env || pm2 start ecosystem.config.js --update-env
    pm2 save
    echo -e "\n✅ PM2 process restarted successfully!"
else
    echo -e "\n⚠️ PM2 is not installed globally. Install with: sudo npm install -g pm2"
fi

echo -e "\n🎉 Deployment Complete! App is live on port 5002."
echo "=========================================="
