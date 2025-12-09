#!/bin/bash

# Script to set up production data for testing
# Usage: ./scripts/setup-production-data.sh [admin-secret]

set -e

BASE_URL="${BASE_URL:-https://wokibrain.grgcrew.com/api/v1}"
ADMIN_SECRET="${1:-wokibrain-admin-secret-change-in-production}"

echo "🚀 Setting up WokiBrain production data"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

echo "📋 Base URL: $BASE_URL"
echo "🔑 Admin Secret: ${ADMIN_SECRET:0:10}..."
echo ""

# Check admin info
echo "1️⃣  Checking admin endpoints..."
curl -s "$BASE_URL/admin/info" | jq -r '.message // .error' || echo "⚠️  Could not reach admin endpoints"
echo ""

# Seed database
echo "2️⃣  Seeding database with sample data..."
SEED_RESPONSE=$(curl -s -X POST "$BASE_URL/admin/seed?secret=$ADMIN_SECRET" \
  -H "Content-Type: application/json")

if echo "$SEED_RESPONSE" | jq -e '.message' > /dev/null 2>&1; then
  echo "✅ Database seeded successfully"
  echo "$SEED_RESPONSE" | jq '.data'
else
  echo "❌ Failed to seed database"
  echo "$SEED_RESPONSE" | jq '.'
  exit 1
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ SETUP COMPLETE!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📝 Sample data created:"
echo "   - Restaurant: R1 (Bistro Central)"
echo "   - Sector: S1 (Main Hall)"
echo "   - Tables: T1, T2, T3, T4, T5"
echo "   - Booking: B1"
echo ""
echo "🧪 Test the API:"
echo "   curl \"$BASE_URL/woki/discover?restaurantId=R1&sectorId=S1&date=2025-10-22&partySize=4&duration=90\""
echo ""



