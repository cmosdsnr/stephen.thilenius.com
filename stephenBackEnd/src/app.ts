/**
 * @packageDocumentation
 *
 * **Main application entry point for the Gliderport server.**
 *
 * Responsibilities:
 * - Load environment variables and set timezone.
 * - Configure Express app with body parsing, CORS, and optional file upload.
 * - Mount diagnostics (listEndpoints) and API routes under `/api`.
 * - Serve static assets (images, docs, frontend SPA) from disk.
 * - Provide SPA fallback to `index.html` for client-side routing.
 * - Centralized error handling for payload limits and other errors.
 * - Initialize HTTP and WebSocket servers.
 *
 * @module app
 */
import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";
import http from "http";
import bodyParser from "body-parser";
import cors from "cors";
import fs from "fs";
import path from "path";

import { socketServer } from "socket";
import { createApiRouter } from "apiRouter";
import { listEndpoints } from "listEndpoints";
import { __dirname } from "miscellaneous";
import { createProxyMiddleware } from "http-proxy-middleware";

// Load environment variables and set timezone
dotenv.config();
process.env.TZ = "America/Los_Angeles";

/** Port to listen on (from env or default 3000) */
const PORT = process.env.PORT || 3000;

/** Express application instance */
export const app = express();

app.set("trust proxy", true);

// Proxy specific route to another local IP
// app.use(
//   "/camera",
//   createProxyMiddleware({
//     target: "http://192.168.1.93:80", // target local IP + port
//     changeOrigin: true,
//     pathRewrite: {
//       "^/camera": "", // strip /camera prefix when forwarding (remove if not needed)
//     },
//     on: {
//       proxyRes: (proxyRes: http.IncomingMessage, _req: http.IncomingMessage, _res: http.ServerResponse) => {
//         const location = proxyRes.headers["location"];
//
//         if (location) {
//           // Check for absolute redirects (e.g. http://192.168.1.93/top.htm)
//           if (location.match(/^http:\/\/192\.168\.1\.93/)) {
//             proxyRes.headers["location"] = location.replace(/^http:\/\/192\.168\.1\.93(:80)?/, "/camera");
//           }
//           // Check for relative redirects (e.g. /top.htm)
//           else if (location.startsWith("/")) {
//             proxyRes.headers["location"] = `/camera${location}`;
//           }
//         }
//       },
//     },
//   }),
// );

app.get("/camera", (_req, res) => {
  res.redirect("http://99.146.35.112:8086");
});

// -----------------------------------------------------------------------------
/**
 * Body parsing middleware.
 * - Parses URL-encoded data (form submissions).
 * - Parses JSON bodies up to 30MB.
 */
app.use(express.urlencoded({ extended: true, limit: "30mb" }));
app.use(bodyParser.json({ limit: "30mb" }));

// -----------------------------------------------------------------------------
/**
 * CORS configuration:
 * - Allows origins matching stephen.thilenius.com, localhost, or any.
 * - Returns HTTP 200 on successful preflight.
 */
const corsOptions = {
  origin: [/stephen.*thilenius.*/, /localhost.*/, /.*/],
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// -----------------------------------------------------------------------------
/**
 * Diagnostic route: lists all registered endpoints under `/api/listEndpoints`.
 */
app.use("/api", listEndpoints(app));

/**
 * Mounts the main API router under `/api`.
 */
app.use("/api", createApiRouter());

// -----------------------------------------------------------------------------
/**
 * Verify required static directories exist; exit if missing.
 */
["logs", "sound", "docs", "frontend", "gallery", "public"].forEach((dir) => {
  const fullPath = path.join(__dirname, `/stephen/${dir}`);
  if (!fs.existsSync(fullPath)) {
    console.error(`Directory ${fullPath} does not exist.`);
    // process.exit(1);
  }
});

/** Serve static assets */
app.use("/docs", express.static(path.join(__dirname, "/stephen/docs")));
app.use("/sound", express.static(path.join(__dirname, "/stephen/sound")));
app.use("/gallery", express.static(path.join(__dirname, "/stephen/gallery")));
app.use("/", express.static(path.join(__dirname, "/stephen/frontend")));

// -----------------------------------------------------------------------------
/**
 * Single-page application (SPA) fallback.
 * Redirects all unmatched routes to `index.html`.
 */
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, "/stephen/frontend/index.html"));
});

// -----------------------------------------------------------------------------
/**
 * Global error handler.
 * - Catches "Payload too large" errors and returns 413.
 * - Logs other errors and returns 500.
 */
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (err.type === "entity.too.large") {
    return res.status(413).json({ error: "Payload too large", details: err.message });
  }
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// -----------------------------------------------------------------------------
/**
 * Create HTTP server and attach WebSocket server.
 */
const server = http.createServer(app);
socketServer(server);

/** Start listening for HTTP and WebSocket connections. */
server.listen(PORT, () => {
  console.log(`\n######################################################`);
  console.log(`         Server is running at http://localhost:${PORT}`);
  console.log(`######################################################`);
});
