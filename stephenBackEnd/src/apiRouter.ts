// apiRouter.ts
import express, { Request, Response, Router } from "express";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";

import { sprinklerRoutes } from "sprinkler";
import { powerMeterRoutes } from "powerMeter";
import { solarEdgeRoutes } from "solarEdge";
import { ultimeterRoutes } from "ultimeter";
import { albumsAndBoxesRoutes } from "albums";
import { blossomRoutes } from "blossom";
import { espRoutes } from "esp";
// import { davisAnemometer } from "davisAnemometer";
import { fileShareRoutes } from "fileShare";

/**
 * Creates and configures the main API router by mounting various sub-routers
 * and defining core endpoints (debug and test).
 *
 * @returns A configured Express Router with all API routes mounted.
 */
const _versionFile = fileURLToPath(new URL('./version.json', import.meta.url));
const _backendVersion: string = JSON.parse(readFileSync(_versionFile, 'utf-8')).version;

export function createApiRouter(): Router {
  const router = express.Router();

  // Mount sub-routers for different API modules
  router.use(sprinklerRoutes());
  router.use(powerMeterRoutes());
  router.use(solarEdgeRoutes());
  router.use(ultimeterRoutes());
  router.use(albumsAndBoxesRoutes());
  router.use(blossomRoutes());
  router.use("/esp", espRoutes());
  // router.use(davisAnemometer());
  router.use(fileShareRoutes());

  /**
   * Basic test endpoint to confirm that the API server is up and running.
   *
   * @route GET /test
   * @returns A plain-text greeting indicating server health.
   */
  router.get("/test", (_req: Request, res: Response) => {
    res.send("API says Hello, TypeScript & Express!");
  });

  router.get("/version", (_req: Request, res: Response) => {
    res.json({ version: _backendVersion });
  });

  return router;
}
