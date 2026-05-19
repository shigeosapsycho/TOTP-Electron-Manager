# 🐳 Docker Build Guide - Quick Reference

**Build Mac binaries on Windows/Linux without Apple certificate**

## Quick Start

### Prerequisites
- Docker Desktop installed and running
- 8GB+ RAM available for Docker
- 20GB free disk space

### Build Commands

```bash
# Build for macOS (from Windows/Linux)
./build-mac-docker.sh mac

# Build for Windows
./build-mac-docker.sh windows

# Build for Linux
./build-mac-docker.sh linux

# Build for all platforms
./build-mac-docker.sh all

# Clean and rebuild
./build-mac-docker.sh mac clean
```

## Traditional Electron Builds (Alternative)

### Windows Build (Native)
```bash
cd frontend
npm install
npm run build
npm run electron-build-win
```

### macOS Build (Native)
```bash
cd frontend
npm install
npm run build
npm run electron-build-mac
```

### Linux Build (Native)
```bash
sudo apt install build-essential libnss3-dev
cd frontend
npm install
npm run build
npm run electron-build-linux
```

## Output Files

**Docker & Native Builds:**
- Windows: `dist-final/TOTP Manager Setup 2.2.0.exe`
- macOS: `dist-final/TOTP Manager 2.2.0.dmg`
- Linux: `dist-final/TOTP Manager 2.2.0.AppImage`

## macOS Installation (Unsigned Builds)

When you install the Docker-built Mac app, you'll see a Gatekeeper warning:

**"TOTP Manager" cannot be opened because it is from an unidentified developer**

**Solution:**
1. Right-click the app
2. Select "Open"
3. Click "Open" in the dialog
4. App will open normally

**Or:**
1. Open System Preferences
2. Go to Security & Privacy
3. Click "Open Anyway" for TOTP Manager

## Docker vs Native Builds

| Feature | Docker Build | Native Build |
|---------|--------------|--------------|
| **Cross-Platform** | ✅ Build any platform from any OS | ❌ Requires native hardware |
| **Certificate** | ❌ Not needed (dev builds) | ✅ Full code signing support |
| **Build Speed** | 🐢 Slower (container overhead) | 🚀 Faster (native performance) |
| **Best For** | Cross-platform builds, CI/CD | Native development, debugging |

## Troubleshooting

**Docker not running:**
```bash
# Start Docker Desktop from your applications
# Verify with: docker --version
```

**Permission errors:**
```bash
chmod +x build-mac-docker.sh
```

**Out of memory:**
- Increase Docker memory limit to 8GB+
- Docker Desktop → Settings → Resources → Memory

**Build failures:**
```bash
./build-mac-docker.sh mac clean
```

## Advanced Usage

**Development in Docker:**
```bash
./build-mac-docker.sh dev
```

**Check build logs:**
```bash
docker-compose logs totp-build-mac
```

**Inspect output:**
```bash
docker-compose run --rm totp-build-mac ls -la dist-final/
```

---

**Full Documentation:** See [deployment/docker-builds.md](obsidian/deployment/docker-builds.md)