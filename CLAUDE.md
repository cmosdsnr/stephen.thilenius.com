# Project Overview

Monorepo containing personal web infrastructure, IoT firmware, and mobile apps.

## Projects

- **stephenFrontEnd/** — React 18 + Vite + TypeScript frontend (photo galleries, charts, data viz). Uses Bootstrap 5, MUI, Chart.js, AG Charts, Firebase, PocketBase.
- **stephenBackEnd/** — Express + TypeScript backend (Node 22, ESM). Handles albums, data logging, device control. Uses PocketBase, WebSockets, Modbus, cron.
- **espserver/** — React 18 + Vite + TypeScript web UI for ESP32 device monitoring. Uses MUI, WebSockets.
- **4inDisplay_S3/** — ESP32-S3 firmware (C++/Arduino via PlatformIO). Multi-device display (Coffee, Sprinkler, Desk, Gliderport, PowerMeter).
- **sprinklerApp/** — React Native + Expo (SDK 53) mobile app for sprinkler control.

## Package Manager

All Node.js projects use **Yarn**.

## Common Commands

```bash
# Frontend (stephenFrontEnd)
cd stephenFrontEnd && yarn dev    # Dev server on port 5174
cd stephenFrontEnd && yarn build  # Production build

# Backend (stephenBackEnd)
cd stephenBackEnd && yarn dev     # Dev with tsx watch
cd stephenBackEnd && yarn build   # TypeScript compile

# ESP Server UI (espserver)
cd espserver && yarn dev

# Sprinkler App (sprinklerApp)
cd sprinklerApp && npx expo start

# ESP32 Firmware (4inDisplay_S3)
# Built with PlatformIO — use `pio run` or PlatformIO IDE
```

## Documentation

The four Node.js projects (stephenFrontEnd, stephenBackEnd, espserver, sprinklerApp) use **TypeDoc** to generate HTML API docs. Generated docs are copied to `\\buddbliss\passport\stephen\docs\<project>\` via each project's `copy-docs.bat`.

### Generating docs

**All 4 projects at once (from PowerShell):**
```powershell
.\generate-all-docs.ps1
```

**Single project (from PowerShell, inside the project directory):**
```powershell
.\generate-docs.ps1
```

**Single project (from any shell, no date in footer):**
```bash
yarn docs:generate
```

The footer shows *Generated: Month DD, YYYY*. This date is injected via the `DOCS_DATE` environment variable, which the `.ps1` scripts set automatically. Running `yarn docs:generate` directly without setting `DOCS_DATE` first will produce a blank date in the footer.

## Code Style

- TypeScript for all web/Node projects
- ESM modules in backend
- React functional components with hooks
- C++ with Arduino framework for firmware

## Environment

- `.env` and `.env.local` files in backend and frontend (do NOT commit these)

## commands and scripts

- prompt window is powershell on windows
- scripts in general should be in powershell