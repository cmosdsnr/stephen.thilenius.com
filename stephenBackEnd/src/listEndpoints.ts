/**
 * @packageDocumentation
 *
 * **Recursively walks an Express Application or Router**
 * **and returns an array of all registered endpoints (any HTTP method) with their fully-qualified paths.**
 *
 * This module provides utilities for introspecting Express applications to discover
 * all registered routes and their HTTP methods. Useful for debugging, documentation
 * generation, and API discovery.
 *
 * Usage:
 * ```ts
 * import express from 'express';
 * import { listEndpoints } from './listEndpoints';
 * const app = express();
 * // ... mount your routers
 * app.use('/api', listEndpoints(app));
 * // Now GET /api/listEndpoints returns all endpoints
 * ```
 *
 * @module listEndpoints
 */

import express, { Application, Router, Request, Response } from "express";

/**
 * Represents a single API endpoint with its HTTP methods and path.
 *
 * @interface Endpoint
 */
interface Endpoint {
  /** Comma-separated HTTP methods (e.g., "GET", "POST", "GET, POST") */
  method: string;
  /** Fully-qualified route path (e.g., "/api/scanLatestDirectory") */
  path: string;
}

/**
 * Walks through an Express Layer and, if it's a route or router, extracts endpoints or recurses.
 *
 * This function handles three main cases:
 * - Direct routes (e.g., router.get("/foo", handler))
 * - Nested routers (e.g., app.use("/api", router))
 * - Other middleware (ignored)
 *
 * @param layer - An Express layer object (from `app._router.stack` or `router.stack`)
 * @param prefix - The path prefix that led to this layer (e.g., "/api", "/api/images")
 * @param out - The array to accumulate `{ method, path }` objects into
 *
 * @example
 * ```typescript
 * const endpoints: Endpoint[] = [];
 * traverseLayer(layer, "/api", endpoints);
 * // endpoints now contains discovered routes from this layer
 * ```
 */
function traverseLayer(layer: any, prefix: string, out: Endpoint[]): void {
  // CASE A: A "direct" route was registered (e.g., router.get("/foo", ...)).
  if (layer.route) {
    const routePath: string = layer.route.path;
    const methods: Record<string, boolean> = layer.route.methods;
    const methodNames = Object.keys(methods)
      .filter((m) => methods[m])
      .map((m) => m.toUpperCase())
      .join(", ");
    out.push({ method: methodNames, path: prefix + routePath });
  }
  // CASE B: This layer is a "router" middleware (mounted via router.use or app.use).
  //         Recurse inside its stack to extract nested routes.
  else if (layer.name === "router" && layer.handle && layer.handle.stack) {
    let mountPath = "";

    // In Express 4.x, `layer.regexp` is a Regex matching the mount path.
    // - If `fast_slash` is true, it was mounted at "/".
    if (typeof layer.regexp === "object" && layer.regexp.fast_slash) {
      mountPath = "";
    }
    // Otherwise, convert the regex source to a string path.
    else if (layer.regexp && layer.regexp.source) {
      const regexSource: string = layer.regexp.source
        .replace(/^\\^\\\//, "/") // remove leading "^\/"
        .replace(/\\\/\?(\(\?\=\\\/\|\$\))$/, "") // remove trailing "\/?(?=\/|$)"
        .replace(/\\\//g, "/"); // turn "\/" into "/"
      mountPath = regexSource;
    }

    // Combine the prefix with the mount path.
    const newPrefix = prefix + mountPath;

    // Recurse into the router's own stack.
    layer.handle.stack.forEach((innerLayer: any) => {
      traverseLayer(innerLayer, newPrefix, out);
    });
  }
  // CASE C & D: Other middleware (e.g., static, error handlers) are ignored.
}

/**
 * Recursively extracts every route from the given Express Application or Router.
 *
 * Traverses the internal Express router stack to discover all registered endpoints,
 * including those nested within sub-routers. Handles both Application and Router instances.
 *
 * @param appOrRouter - The Express Application (`app`) or an Express `Router`
 * @returns An array of `{ method, path }` objects for each registered endpoint
 *
 * @example
 * ```typescript
 * const app = express();
 * app.get('/health', handler);
 * app.use('/api', apiRouter);
 *
 * const endpoints = extractEndpoints(app);
 * // Returns: [
 * //   { method: "GET", path: "/health" },
 * //   { method: "GET", path: "/api/users" },
 * //   ...
 * // ]
 * ```
 */
function extractEndpoints(appOrRouter: Application | Router): Endpoint[] {
  const endpoints: Endpoint[] = [];
  // Access the internal router stack (`_router.stack`)
  // @ts-ignore
  const stack = (appOrRouter as any)._router?.stack;
  if (!Array.isArray(stack)) return endpoints;

  stack.forEach((layer: any) => {
    traverseLayer(layer, "", endpoints);
  });

  return endpoints;
}

/**
 * Returns a new Express `Router` that exposes an endpoint listing service.
 *
 * Creates a router with a single GET endpoint that returns a JSON array of all
 * registered routes in the provided Express application or router. This is useful
 * for API documentation, debugging, and service discovery.
 *
 * @param appOrRouter - The Express Application or Router to inspect
 * @returns A `Router` with a single route `/listEndpoints`
 *
 * @example
 * ```typescript
 * const app = express();
 * app.get('/users', getUsersHandler);
 * app.post('/users', createUserHandler);
 *
 * // Mount the endpoint lister
 * app.use('/debug', listEndpoints(app));
 *
 * // Now GET /debug/listEndpoints returns:
 * // [
 * //   { method: "GET", path: "/users" },
 * //   { method: "POST", path: "/users" },
 * //   { method: "GET", path: "/debug/listEndpoints" }
 * // ]
 * ```
 *
 * @example
 * ```typescript
 * // Use with a specific router
 * const apiRouter = express.Router();
 * apiRouter.get('/health', healthHandler);
 *
 * app.use('/api', apiRouter);
 * app.use('/api', listEndpoints(apiRouter)); // Only lists /api routes
 * ```
 */
export function listEndpoints(appOrRouter: Application | Router): Router {
  const router = express.Router();

  /**
   * GET /listEndpoints
   *
   * Responds with a JSON array of all registered endpoints (method and path).
   * Each endpoint object contains the HTTP method(s) and the full route path.
   *
   * @param _req - Express request object (unused)
   * @param res - Express response object for sending JSON data
   * @returns JSON response containing array of endpoint objects
   *
   * @example
   * Response format:
   * ```json
   * [
   *   { "method": "GET", "path": "/api/users" },
   *   { "method": "POST", "path": "/api/users" },
   *   { "method": "GET, PUT, DELETE", "path": "/api/users/:id" }
   * ]
   * ```
   */
  router.get("/listEndpoints", (_req: Request, res: Response) => {
    const endpoints = extractEndpoints(appOrRouter);
    res.json(endpoints);
  });

  return router;
}
