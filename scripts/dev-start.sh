#!/bin/bash

echo "🚀 Starting WokiBrain Development Environment"
echo ""

echo "1️⃣  Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi
echo "✅ Docker is running"
echo ""

echo "2️⃣  Starting services..."
docker-compose up -d mongodb redis
echo "⏳ Waiting for services to be healthy (30 seconds)..."
sleep 30

echo ""
echo "3️⃣  Checking services status..."
docker-compose ps

echo ""
echo "4️⃣  Verifying MongoDB connection..."
if docker exec wokibrain-mongo mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo "✅ MongoDB is ready"
else
    echo "⚠️  MongoDB might not be fully ready yet, but continuing..."
fi

echo ""
echo "5️⃣  Verifying Redis connection..."
if docker exec wokibrain-redis redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis is ready"
else
    echo "⚠️  Redis might not be fully ready yet, but continuing..."
fi

echo ""
echo "6️⃣  Setting up environment..."
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << 'EOF'
NODE_ENV=development
PORT=3000
HOST=0.0.0.0
MONGODB_URI=mongodb://localhost:27017/wokibrain
MONGODB_DATABASE=wokibrain
REDIS_HOST=localhost
REDIS_PORT=6379
EVENT_SOURCING_ENABLED=false
CQRS_ENABLED=false
LOG_LEVEL=info
RATE_LIMIT_MAX=100
CORS_ORIGIN=*
SEED_DB=true
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Next steps:"
echo ""
echo "  Start the API:"
echo "    npm run dev"
echo ""
echo "  In another terminal, test it:"
echo "    curl http://localhost:3000/api/v1/health"
echo ""
echo "  Open API docs:"
echo "    open http://localhost:3000/api/v1/docs"
echo ""
echo "  Stop services:"
echo "    docker-compose down"
echo ""
echo "🎉 Happy coding!"



