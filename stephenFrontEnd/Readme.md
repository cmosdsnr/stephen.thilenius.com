React 18 + Vite + TypeScript frontend application for the stephen.thilenius.com personal web infrastructure. 

## Overview
This application serves as the main web interface for various personal infrastructure monitoring and visualizations, including:
- Photo galleries
- Advanced data visualizations and charts
- IoT device status and metrics (Power, Sprinkler, Coffee, etc.)

## Minimum Requirements
- Node.js (v18+ recommended)
- Yarn 4.x (Package Manager)

## Tech Stack
- **Framework:** React 18
- **Build Tool:** Vite 5
- **Languages:** TypeScript / JavaScript (ESM)
- **UI & Styling:** Bootstrap 5, Material-UI (MUI), Emotion, FontAwesome
- **Charts & Data Viz:** Chart.js, AG Charts, React Charts
- **Backend / DB Integration:** Firebase, PocketBase
- **Routing:** React Router v6
- **Forms & Validation:** React Hook Form, Yup
- **WebSockets:** react-use-websocket for real-time ESP32 / Backend device updates
- **Computer Vision:** OpenCV.js, face-api.js 

## Scripts & Running
Locally compiled and run using Yarn:

- **`yarn dev`**: Starts the local Vite development server on port 5174.
- **`yarn build`**: Compiles the application for production.
- **`yarn preview`**: Locally previews the production build.

## Deployment
- **`go.bat ["optional tag"]`**: Builds the project and uses Robocopy to deploy the compiled static assets to the `buddbliss` static directory.

## Documentation
- **`yarn docs:generate`**: Uses TypeDoc to generate API and structural documentation, then deploys it to the server (`copy-docs.bat`).
- Read generated documentation at `/documentation/frontend`, `/documentation/backend`, or `/documentation/esp32`.

## Maintenance
- Run `npx knip` to analyze the workspace and check for unused files, dependencies, and exports.

## Known Issues / Problems
- None at the moment.
