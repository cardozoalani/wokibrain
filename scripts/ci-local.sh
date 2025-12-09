#!/bin/bash
# Script to run CI checks locally before pushing
# This mimics what GitHub Actions does in the CI workflow

set -e

echo "🔍 Running CI checks locally..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        exit 1
    fi
}

# 1. Lint
echo "📝 Running ESLint..."
npm run lint
print_status $? "ESLint passed"

# 2. Format check
echo ""
echo "🎨 Checking code formatting..."
npm run format:check
print_status $? "Format check passed"

# 3. Type check
echo ""
echo "🔷 Running TypeScript type check..."
npm run typecheck
print_status $? "Type check passed"

# 4. Tests
echo ""
echo "🧪 Running tests..."
npm test
print_status $? "Tests passed"

# 5. Build
echo ""
echo "🏗️  Building project..."
npm run build
print_status $? "Build passed"

echo ""
echo -e "${GREEN}🎉 All CI checks passed! Ready to commit and push.${NC}"

