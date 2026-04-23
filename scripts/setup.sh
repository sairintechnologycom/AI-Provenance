#!/bin/bash

# MergeBrief One-Click Setup Script
set -e

echo "🚀 Starting MergeBrief Setup..."

# Check for Docker
if ! [ -x "$(command -v docker)" ]; then
  echo '❌ Error: docker is not installed.' >&2
  exit 1
fi

if ! [ -x "$(command -v docker-compose)" ] && ! docker compose version > /dev/null 2>&1; then
  echo '❌ Error: docker-compose is not installed.' >&2
  exit 1
fi

# Create .env if it doesn't exist
if [ ! -f .env ]; then
  echo "📝 Creating .env file from .env.example..."
  cp .env.example .env
  
  # Generate NEXTAUTH_SECRET
  if [[ "$OSTYPE" == "darwin"* ]]; then
    SECRET=$(openssl rand -base64 32)
  else
    SECRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 32 | head -n 1)
  fi
  
  # Replace NEXTAUTH_SECRET in .env
  # Using a temporary file for portability with sed
  sed "s/NEXTAUTH_SECRET=/NEXTAUTH_SECRET=$SECRET/" .env > .env.tmp && mv .env.tmp .env
  
  echo "✅ .env file created with a fresh NEXTAUTH_SECRET."
  echo "⚠️  Please open .env and add your ANTHROPIC_API_KEY and GitHub App credentials."
else
  echo "ℹ️  .env file already exists, skipping creation."
fi

echo ""
echo "📦 Building and starting MergeBrief containers..."
docker compose up -d --build

echo ""
echo "🎉 Setup complete! MergeBrief is starting up."
echo "📊 Dashboard: http://localhost:3001"
echo "🔌 API: http://localhost:3000"
echo ""
echo "Run 'docker compose logs -f' to see the progress of the database initialization."
