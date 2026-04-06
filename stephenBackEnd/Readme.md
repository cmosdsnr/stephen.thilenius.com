Node.js + Express + TypeScript backend application for the thilenius.com personal web infrastructure.

## Overview
This server handles incoming API requests, WebSocket communication, device integrations, and backend processes. Key features include:
- REST API (Express) and Real-time WebSockets (`ws`)
- IoT/Serial device communication (`modbus-serial`)
- Database integration via PocketBase
- Background task profiling & scheduling (`cron`, `node-cron`, `suncalc`)

## Minimum Requirements
- Node.js 22.x
- Yarn 4.x

## Tech Stack
- **Framework:** Express.js
- **Language:** TypeScript / Node.js
- **Execution:** `tsx` for local dev, `tsc` for production builds
- **Database / Auth:** PocketBase
- **WebSockets:** Native `ws` library
- **Job Scheduling:** `cron`, `node-cron`
- **Hardware/Protocols:** `modbus-serial`
- **Utilities:** `lodash`, `suncalc`, `multer` (file uploads)

## Scripts & Running
Locally compiled and run using Yarn:

- **`yarn dev`**: Starts the local development server with live reload (`tsx watch src/app.ts`).
- **`yarn build`**: Compiles the application to JavaScript in the `dist/` folder via TypeScript (`tsc`). **Required before deployment!**
- **`yarn start`**: Runs the server directly using `tsx`.
- **`yarn start2`**: Runs the compiled production server from `dist/src/app.js`.

## Deployment
- **`go.bat ["optional tag"]`**: Builds the project and deploys to the `stephen` (dokku) container.
- **IMPORTANT**: ALWAYS run `yarn build` (`tsc`) BEFORE uploading! The server expects precompiled `.js` files in the `dist` directory.

### Environment Variables (Remote)
Remote `.env` should include:
- `PORT=5000`
- `STATIC="/storage/static"`

### Dokku Setup & Configuration
```bash
# Create app
dokku apps:create servert

# Setup local storage mounts
dokku storage:mount servert '/media/cmosdsnr/passport/galleries:/app/galleries'
dokku storage:mount servert '/var/lib/dokku/data/storage/server:/app/storage'

# Link networks
dokku network:set pbNetwork attach-post-create servert
dokku network:set servert attach-post-create pbNetwork

# Configure NGINX and SSL
dokku nginx:set servert client-max-body-size 10G
dokku letsencrypt:enable servert
dokku ps:restart servert
```

## Documentation
- **`yarn docs:generate`**: Uses TypeDoc to generate API documentation automatically and deploys it to the server (`copy-docs.bat`).
- Read generated documentation at `/documentation/backend`.

---

## Git & Maintenance Commands

**Adding Remotes:**
```bash
git remote remove github 
git remote add github https://github.com/cmosdsnr/server.thilenius.git
git remote add dokku_alec dokku@thilenius.org:servert
git remote add budd dokku@buddbliss.com:servert
```

**Find and Remove Large Files in History:**
```bash
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch 'storage/shares/t t.txt'" --prune-empty --tag-name-filter cat -- --all
git rev-list --objects --all | git cat-file --batch-check='%(objecttype) %(objectname) %(objectsize) %(rest)' | sed -n 's/^blob //p' | & 'C:\Program Files (x86)\GnuWin32\bin\sort' ...
```

**Fix Conflicting Directories in /media:**
```bash
cd /media/cmosdsnr
lsblk -o NAME,MOUNTPOINT,UUID,FSTYPE,SIZE
sudo umount /media/cmosdsnr/passport1
sudo rm -rf passport; 
sudo mkdir -p /media/cmosdsnr/passport; 
sudo mount /dev/sdb1 /media/cmosdsnr/passport
```