#!/bin/bash

# API Performance Monitor - Deployment Initialization Script
# This script helps set up the project for deployment to Render

set -e

echo "========================================="
echo "API Performance Monitor - Setup Script"
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js >= 18.0.0 from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✓ Node.js detected: $NODE_VERSION${NC}"

# Check npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✓ npm detected: $NPM_VERSION${NC}"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
echo ""

echo "Installing root dependencies..."
npm install

echo ""
echo "Installing backend dependencies..."
cd backend
npm install
cd ..

echo ""
echo "Installing frontend dependencies..."
cd frontend
npm install
cd ..

echo ""
echo -e "${GREEN}✓ All dependencies installed successfully${NC}"
echo ""

# Check for .env files
echo "🔐 Checking environment configuration..."
echo ""

if [ ! -f "backend/.env" ]; then
    echo "Creating backend/.env from template..."
    cp backend/.env.example backend/.env
    echo -e "${YELLOW}⚠ You need to configure backend/.env with your MongoDB URI${NC}"
fi

if [ ! -f "frontend/.env" ]; then
    echo "Creating frontend/.env from template..."
    cp frontend/.env.example frontend/.env
    echo -e "${GREEN}✓ Frontend .env created${NC}"
fi

echo ""
echo "========================================="
echo -e "${GREEN}✓ Setup Complete!${NC}"
echo "========================================="
echo ""

echo "📝 Next Steps:"
echo "1. Update backend/.env with your MongoDB connection string"
echo "2. Start development:"
echo "   npm run dev"
echo ""
echo "3. For production deployment to Render:"
echo "   - Push to GitHub"
echo "   - Connect repository to Render"
echo "   - Set environment variables in Render dashboard"
echo "   - Deploy!"
echo ""
echo "📚 For more information, see README.md"
echo ""
