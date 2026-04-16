#!/bin/bash
# setup-check.sh - Pre-flight checks for Account CSV import

echo "🔍 Checking Account CSV Import Setup..."
echo "========================================"

# Check if .env exists
if [ -f ".env" ]; then
  echo "✓ .env file found"
else
  echo "⚠ .env file not found - using .env.example"
  if [ -f ".env.example" ]; then
    echo "  → Run: cp .env.example .env"
  fi
fi

# Check DATABASE_URL
if grep -q "DATABASE_URL" .env 2>/dev/null; then
  echo "✓ DATABASE_URL configured"
else
  echo "✗ DATABASE_URL not found in .env"
fi

# Check if CSV file exists
if [ -f "../data/Account.csv" ]; then
  LINES=$(wc -l < ../data/Account.csv)
  echo "✓ Account.csv found ($LINES rows)"
else
  echo "✗ Account.csv not found at ../data/Account.csv"
fi

# Check if node_modules exists
if [ -d "node_modules" ]; then
  echo "✓ node_modules found"
else
  echo "⚠ node_modules not found"
  echo "  → Run: npm install"
fi

# Check Prisma
if [ -f "node_modules/.bin/tsx" ]; then
  echo "✓ tsx runtime found"
else
  echo "⚠ tsx not installed"
  echo "  → Run: npm install"
fi

echo ""
echo "========================================"
echo "To complete setup:"
echo ""
echo "1. cd server"
echo "2. npm install"
echo "3. npm run prisma:migrate"
echo "4. npm run import:accounts"
echo ""
