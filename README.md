# TOTP Manager

**Version 2.2.0 - Electron Desktop App** 🎉

A secure, local-only TOTP (Time-based One-Time Password) manager desktop application built with Electron, React, and TypeScript.

> **🆕 NEW in v2.2.0**: 📥 Added CSV import functionality! You can now import accounts from CSV files exported from this app, completing the import/export workflow.

## ⚡ Quick Start

### Electron Desktop App

1. **Install dependencies and build:**
   ```bash
   cd frontend
   npm install
   npm run build
   ```

2. **Run in development:**
   ```bash
   npm run electron-dev
   ```

3. **Build for distribution:**
   ```bash
   # Build for your platform
   npm run electron-build

   # Or build for specific platforms
   npm run electron-build-win   # Windows
   npm run electron-build-mac    # macOS
   npm run electron-build-linux  # Linux
   ```

The desktop app will be available in the `frontend/dist-final/` folder as a standalone executable.

## 🌟 Features

### Desktop App Features (v2.2.0)
- 🔐 **Local-Only Storage** - All data stored locally on your computer
- 🔒 **No Authentication Required** - Opens directly to your dashboard
- 🔐 **Lock Emoji Icon** - Easy-to-identify app icon
- ⏱️ **Smooth Countdown** - Millisecond-precision progress animations
- 🖱️ **Context Menu Toggle** - Right-click again to close context menu
- 📤 **Enhanced CSV Export** - File save dialog with location selection
- 🔑 **Secret Key Visibility** - View secret keys in edit mode with proper text wrapping
- 🔘 **Smart Update Button** - Disabled when no changes made, enabled only when needed
- 🚫 **Clean Interface** - Prevented text selection on all UI elements for professional look
- 🧹 **Clean Codebase** - Removed legacy web version, focused on desktop experience
- ⚡ **Performance Optimized** - Fast, responsive interface
- 🎨 **Beautiful UI** - Clean, responsive interface with dark mode
- ⌨️ **Keyboard Shortcuts** - Power user features (Ctrl+A, Ctrl+D, Shift+Click)
- 🎯 **Drag & Drop** - Intuitive account reordering
- 📋 **Bulk Operations** - Multi-select and bulk edit/delete
- 🔍 **Search & Filter** - Quickly find your accounts
- 📥 **Import/Export** - CSV export and import functionality
- 📌 **Pin Accounts** - Keep important accounts at the top

## 🏗️ Architecture

### Electron Desktop App
- **Main Process**: Node.js backend with secure IPC communication
- **Renderer Process**: React frontend with TypeScript
- **Storage**: Encrypted JSON file storage using electron-store
- **Security**: AES-256-GCM encryption for TOTP secrets
- **TOTP Generation**: Client-side using otpauth library
- **Time Sync**: Epoch time-based 30-second cycle synchronization

## 🚀 Getting Started

### First Launch

1. **Launch the application** - Opens directly to your dashboard
2. **Start adding accounts** - Click "Add Account" to get started
3. **Enter TOTP details** - Service name, account name, and secret key
4. **Done!** - Your TOTP codes will appear and sync automatically

### Adding TOTP Accounts

1. **Get your TOTP secret** from the service (usually a QR code or text string)
2. **Click "Add Account"** in the app
3. **Fill in the details**:
   - **Service Name**: e.g., "Google", "GitHub", "Amazon"
   - **Account Name**: e.g., "email@example.com" or "username"
   - **Secret Key**: Paste the TOTP secret key
4. **Click "Add Account"** - Your account is ready!

## 🔒 Security Features

### Desktop App Security
- ✅ **Local-only storage** - No data sent to any server
- ✅ **AES-256-GCM encryption** - Military-grade encryption for TOTP secrets
- ✅ **PBKDF2 key derivation** - 100,000 iterations for key strength
- ✅ **Unique encryption salt** - Generated per installation
- ✅ **No authentication barrier** - Quick access to your codes

### Data Storage
- **Accounts stored locally**: Encrypted JSON file via electron-store
- **TOTP secrets**: Encrypted with AES-256-GCM
- **No cloud sync**: All data stays on your computer
- **Client-side TOTP**: Codes generated locally using otpauth library

## 🛠️ Development

### Building from Source

```bash
# Clone repository
git clone <repository-url>
cd TOTP-Manager

# Install frontend dependencies
cd frontend
npm install

# Build frontend
npm run build

# Run Electron app
npm run electron-dev
```

### Building Windows Executable

To create a distributable Windows `.exe` installer:

```bash
cd frontend

# Build the Next.js frontend first
npm run build

# Build Windows executable
npm run electron-build-win
```

The Windows installer will be created at `frontend\dist-final\TOTP Manager Setup 2.2.0.exe`

This installer includes:
- Standalone executable
- All dependencies bundled
- 🔐 Lock emoji icon
- No installation required (portable)

### Building for Other Platforms

```bash
# macOS
npm run electron-build-mac

# Linux
npm run electron-build-linux
```

### Project Structure
```
TOTP-Manager/
└── frontend/           # Electron desktop app
    ├── electron.js     # Main process
    ├── preload.js      # Preload script for IPC
    ├── src/            # React frontend
    │   ├── app/        # Next.js pages
    │   ├── components/ # React components
    │   ├── lib/        # Utilities and storage
    │   └── types/      # TypeScript types
    └── package.json    # Dependencies and scripts
```

## 📋 Keyboard Shortcuts

- **Ctrl+A**: Select all accounts (toggle)
- **Ctrl+D**: Deselect all accounts
- **Shift+Click**: Range selection (like Windows File Explorer)
- **Backspace**: Delete selected accounts (with confirmation)
- **Escape**: Close context menus and modals

## 🔧 Troubleshooting

### Desktop App Issues

**Q: Can I sync data between computers?**
A: Use the Export feature to save your accounts as CSV, then Import on the new computer.

**Q: Is the app open source?**
A: Yes! The code is available on GitHub. You can audit the code and build it yourself.

**Q: Does the app collect any telemetry?**
A: No. The app is completely local and doesn't send any data anywhere.

## 📦 Installation

### Windows
1. Download `TOTP Manager Setup 2.2.0.exe` from the releases page
2. Run the installer
3. Launch the app from Start Menu

### macOS
1. Download `TOTP Manager 2.2.0.dmg` from the releases page
2. Open the DMG and drag to Applications
3. Launch from Applications

### Linux
1. Download `TOTP Manager 2.2.0.AppImage` from the releases page
2. Make it executable: `chmod +x TOTP\ Manager\ 2.2.0.AppImage`
3. Run: `./TOTP\ Manager\ 2.2.0.AppImage`

### Build from Source
See [Development](#-development) section above.

## 🆚 Version History

### v2.2.0 (Current) - Electron Desktop App
- 📥 Added CSV import functionality to complement CSV export
- 🔄 Complete import/export workflow - backup and restore your accounts
- ✨ New "CSV Import" tab in Add Account modal
- 📋 Supports the exact CSV format exported by the app
- 🔍 Line-by-line error reporting for failed imports

### v2.1.7 - Electron Desktop App
- 🔧 Fixed selection counter to update correctly when deleting selected accounts
- ⚡ Optimized progress bar animations in Add Account modal (2x faster, smoother)
- ✨ Improved user experience when managing account selections

### v2.1.6 - Electron Desktop App
- 🎯 Fixed Export CSV popup size to match success/failure popup dimensions
- 🚫 Removed OK button from Export CSV popup (hidden while user selects file location)
- 🔒 Added scroll prevention when Export CSV popup is open
- ✨ Improved popup consistency across all modals

### v2.1.5 - Electron Desktop App
- 🧹 Removed legacy web version codebase completely
- 🗑️ Cleaned up Python dependencies and backend files
- 📦 Simplified project structure focused on desktop app
- ✨ Cleaner, more maintainable codebase

### v2.1.4 - Electron Desktop App
- 🔒 Extended text selection prevention to Add Account modal
- 🎯 Made modal title, subtitle, and tabs unselectable
- ✨ More professional and polished user interface

### v2.1.3 - Electron Desktop App
- 🚫 Removed Help menu from application menu bar
- 🔒 Prevented text selection on UI elements (header, buttons)
- 🎨 Cleaner interface with fewer distractions

### v2.1.2 - Electron Desktop App
- 🔧 Fixed secret key overflow issue in edit mode (long keys now wrap properly)
- 🔘 Smart update button (disabled when no changes made)
- 🎨 Improved UI stability and text wrapping

### v2.1.1 - Electron Desktop App
- 📤 Enhanced CSV export with file save dialog
- 🔑 Secret key visibility in edit mode (no authentication needed)
- ✨ Improved export confirmation flow
- 🎯 Better user feedback during export process

### v2.1.0 - Electron Desktop App
- 🔐 Added lock emoji icon for easy identification
- ⏱️ Smooth countdown animations with millisecond precision
- 🖱️ Context menu toggle (right-click to close)
- ⚡ Performance optimizations for faster UI
- 🚫 Removed window resizing on context menu open
- 🌙 Fixed dark mode flash on startup
- 📏 Fixed window size (1400x950, non-resizable)

### v2.0.0 - Electron Desktop App
- ✨ Completely rewritten as Electron desktop app
- 📴 Removed server dependency (offline-first)
- 🎨 Beautiful UI with dark mode support
- ⌨️ Keyboard shortcuts (Ctrl+A, Ctrl+D, Shift+Click)
- 🎯 Drag and drop reordering
- 📋 Bulk operations (multi-select, bulk edit/delete)
- 🔍 Search and filter accounts
- 📤 Export/Import functionality
- 📌 Pin accounts to top

### v1.0.0 - Web App

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details

## 🙏 Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- TOTP generation using [otpauth](https://github.com/hect0/otpauth)
- UI components from [Headless UI](https://headlessui.com/)
- Icons from [Heroicons](https://heroicons.com/)

---

**Version**: 2.2.0
**Status**: Production Ready ✅
**Platform**: Windows, macOS, Linux
