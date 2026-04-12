# TOTP Manager - Frontend

This is the frontend for TOTP Manager, built with Next.js, React, TypeScript, and Electron.

## 📋 Overview

This is a **Next.js static export** that serves as the UI for the TOTP Manager Electron desktop application. It's not a traditional web app - it's built specifically to run inside Electron.

## 🚀 Quick Start

### Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run development server (for UI development only):**
   ```bash
   npm run dev
   ```
   Opens at `http://localhost:3000`

3. **Build for production:**
   ```bash
   npm run build
   ```
   Creates static export in `out/` directory

4. **Run Electron app:**
   ```bash
   npm run electron-dev
   ```

### Building for Distribution

```bash
# Build for current platform
npm run electron-build

# Build for specific platforms
npm run electron-build-win    # Windows (.exe)
npm run electron-build-mac     # macOS (.dmg)
npm run electron-build-linux   # Linux (.AppImage)
```

Output is in `dist-final/` directory.

## 📁 Project Structure

```
frontend/
├── electron.js           # Electron main process
├── preload.js            # Preload script for IPC
├── next.config.js        # Next.js configuration (static export)
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
├── tailwind.config.js    # Tailwind CSS configuration
│
├── src/                  # React application source
│   ├── app/             # Next.js App Router
│   │   ├── page.tsx     # Main dashboard page
│   │   ├── layout.tsx   # Root layout
│   │   └── globals.css  # Global styles
│   │
│   ├── components/      # React components
│   │   ├── AccountCard.tsx
│   │   ├── AddAccountModal.tsx
│   │   ├── EditAccountModal.tsx
│   │   ├── BulkActionMenu.tsx
│   │   └── ContextMenu.tsx
│   │
│   ├── lib/            # Utilities and libraries
│   │   ├── storage.ts  # Local storage interface with Electron IPC
│   │   └── constants.ts # App constants
│   │
│   └── types/          # TypeScript type definitions
│       └── index.ts    # Shared types
│
└── out/                # Built static export (generated)
```

## 🛠️ Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Next.js dev server (for UI development) |
| `npm run build` | Build Next.js static export |
| `npm run start` | Serve built static files |
| `npm run lint` | Run ESLint |
| `npm run electron` | Run Electron app (requires built files) |
| `npm run electron-dev` | Run Electron in development mode |
| `npm run electron-build` | Build Electron app for current platform |
| `npm run electron-build-win` | Build Windows executable |
| `npm run electron-build-mac` | Build macOS application |
| `npm run electron-build-linux` | Build Linux AppImage |

## 🔌 Electron Integration

### IPC Communication

The frontend communicates with the Electron main process via:

- **preload.js**: Exposes secure APIs to renderer process
- **storage.ts**: TypeScript interface for Electron IPC calls
- **electron.js**: Main process handlers for file operations, encryption, etc.

### Key IPC Handlers

- `getAccounts`: Retrieve all accounts from storage
- `createAccount`: Add new account
- `updateAccount`: Update existing account
- `deleteAccount`: Remove account
- `bulkDeleteAccounts`: Delete multiple accounts
- `reorderAccounts`: Reorder accounts
- `decryptSecret`: Decrypt TOTP secret for code generation
- `exportAccounts`: Export accounts data
- `importAccounts`: Import accounts data
- `saveFile`: Show save dialog and write file

## 🎨 UI Technologies

- **Framework**: Next.js 16.2.3 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4.0
- **UI Components**: Headless UI, Heroicons
- **State Management**: React hooks (useState, useEffect, useMemo)
- **TOTP Generation**: otpauth library (client-side)

## 🔒 Security Features

- **AES-256-GCM Encryption**: All TOTP secrets encrypted
- **PBKDF2 Key Derivation**: 100,000 iterations
- **Local Storage Only**: No data sent to servers
- **Context Isolation**: Secure Electron IPC
- **No Node Integration**: Renderer process sandboxed

## 📦 Dependencies

### Key Dependencies

- `next`: React framework
- `react`: UI library
- `electron`: Desktop app framework
- `electron-store`: Encrypted local storage
- `otpauth`: TOTP code generation
- `@headlessui/react`: Accessible UI components
- `@heroicons/react`: Icon library

### Dev Dependencies

- `typescript`: Type checking
- `tailwindcss`: Styling
- `electron-builder`: Application packaging

## 🐛 Development Tips

### Hot Reload

- Next.js dev server supports hot reload for UI changes
- Electron main process requires restart after changes
- Use `npm run dev` for UI-only development
- Use `npm run electron-dev` for full Electron testing

### Debugging

1. **UI Issues**: Use browser DevTools (F11 in Electron)
2. **Main Process**: Check console output
3. **IPC Issues**: Add console.log in preload.js and electron.js

### Building

1. Always run `npm run build` before packaging
2. Check `out/` directory exists and contains files
3. Verify static export is complete

## 🚀 Deployment

### Electron Apps

Built executables are self-contained and require:
- No installation (portable)
- No dependencies (Node.js bundled)
- No internet connection (offline-first)

### Distribution

- Windows: `dist-final/TOTP Manager Setup 2.2.0.exe`
- macOS: `dist-final/TOTP Manager 2.2.0.dmg`
- Linux: `dist-final/TOTP Manager 2.2.0.AppImage`

## 📝 Configuration

### Next.js (next.config.js)

- **Output**: Static export (`output: 'export'`)
- **Images**: Unoptimized (for local file loading)
- **Base Path**: None (root-relative paths)

### Tailwind (tailwind.config.js)

- **Content**: All src files and components
- **Theme**: Custom colors for dark mode
- **Plugins**: None (using Tailwind 4.0)

### TypeScript (tsconfig.json)

- **Target**: ES2017
- **Module**: ESNext
- **Strict**: Enabled
- **Paths**: `@/*` maps to `src/*`

## 🤝 Contributing

When making changes:

1. Test UI changes with `npm run dev`
2. Test Electron integration with `npm run electron-dev`
3. Build before committing: `npm run build`
4. Keep types updated in `src/types/index.ts`
5. Follow existing code style and patterns

## 📄 License

MIT License - See root LICENSE file
