#!/bin/bash

# Render Build Script
# This script installs dependencies for both backend and frontend

echo "🚀 Starting Render build process..."
echo ""

# Install root dependencies
echo "📦 Installing root dependencies..."
npm ci

# Install backend dependencies
echo "📦 Installing backend dependencies..."
cd backend
npm ci
cd ..

# Install frontend dependencies  
echo "📦 Installing frontend dependencies..."
cd frontend
npm ci
cd ..

echo ""
echo "✅ Build complete! Ready to start."
