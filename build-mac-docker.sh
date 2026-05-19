#!/bin/bash

# Docker Build Script for TOTP Electron Manager
# Cross-platform builds without requiring platform-specific tools

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🐳 TOTP Electron Manager - Docker Build Script${NC}"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    echo "Visit: https://docs.docker.com/get-docker/"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker is not running. Please start Docker.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is installed and running${NC}"
echo ""

# Parse command line arguments
PLATFORM=${1:-"all"}
CLEAN=${2:-"false"}

# Clean previous builds
if [ "$CLEAN" = "true" ]; then
    echo -e "${YELLOW}🧹 Cleaning previous builds...${NC}"
    rm -rf frontend/.next
    rm -rf frontend/out
    rm -rf dist-final
    docker system prune -f
    echo -e "${GREEN}✅ Cleanup complete${NC}"
    echo ""
fi

# Create dist directory
mkdir -p dist-final

case $PLATFORM in
    windows|win)
        echo -e "${YELLOW}🪟 Building for Windows...${NC}"
        docker-compose --profile build run --rm totp-build-windows
        echo -e "${GREEN}✅ Windows build complete!${NC}"
        echo "📦 Output: dist-final/TOTP Manager Setup 2.2.0.exe"
        ;;

    mac|macos)
        echo -e "${YELLOW}🍎 Building for macOS...${NC}"
        docker-compose --profile build run --rm totp-build-mac
        echo -e "${GREEN}✅ macOS build complete!${NC}"
        echo "📦 Output: dist-final/TOTP Manager-2.2.0-mac.zip"
        echo "   (unsigned .app inside .zip - user must right-click > Open to bypass Gatekeeper)"
        ;;

    linux)
        echo -e "${YELLOW}🐧 Building for Linux...${NC}"
        docker-compose --profile build run --rm totp-build-linux
        echo -e "${GREEN}✅ Linux build complete!${NC}"
        echo "📦 Output: dist-final/TOTP Manager-2.2.0.AppImage"
        ;;

    all)
        echo -e "${YELLOW}🚀 Building for all platforms...${NC}"
        docker-compose --profile build run --rm totp-build-all
        echo -e "${GREEN}✅ All builds complete!${NC}"
        echo ""
        echo "📦 Built files:"
        ls -lh dist-final/
        ;;

    dev)
        echo -e "${YELLOW}🛠️  Starting development environment...${NC}"
        echo "Note: Electron GUI may not work properly in Docker container"
        echo "This is primarily for testing the build process"
        docker-compose --profile dev run --rm totp-dev
        ;;

    *)
        echo -e "${RED}❌ Unknown platform: $PLATFORM${NC}"
        echo "Usage: $0 [windows|mac|linux|all|dev] [clean]"
        echo ""
        echo "Examples:"
        echo "  $0 mac          # Build for macOS"
        echo "  $0 windows      # Build for Windows"
        echo "  $0 linux        # Build for Linux"
        echo "  $0 all          # Build for all platforms"
        echo "  $0 dev          # Start development environment"
        echo "  $0 mac clean    # Clean and build for macOS"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Build process completed successfully!${NC}"
echo ""
echo "Next steps:"
echo "1. Test the generated binaries"
echo "2. If building for macOS, note that it's unsigned"
echo "3. Distribute to users for testing"