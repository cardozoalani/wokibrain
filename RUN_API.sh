#!/bin/bash

# Get the directory where the script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "🚀 Iniciando WokiBrain API"
echo ""

export MONGODB_URI="mongodb://localhost:27017/wokibrain"
export MONGODB_DATABASE="wokibrain"
export REDIS_HOST="localhost"
export REDIS_PORT="6379"
export NODE_ENV="development"
export PORT="3000"
export LOG_LEVEL="info"
export SEED_DB="true"

echo "📝 Variables configuradas:"
echo "   MongoDB: $MONGODB_URI"
echo "   Redis: $REDIS_HOST:$REDIS_PORT"
echo "   Port: $PORT"
echo ""

echo "🔥 Iniciando servidor..."
npm run dev
