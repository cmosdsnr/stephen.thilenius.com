/**
 * @packageDocumentation
 *
 * **Admin Portal Proxy Module**
 *
 * Provides a transparent HTTP proxy route (`/portal`) that forwards all requests
 * to the local machine at `192.168.1.96`. Access is restricted exclusively to
 * authenticated users with the **Administrator** role, verified on every request
 * using the PocketBase Bearer token supplied in the `Authorization` header.
 *
 * ### How it works
 * 1. Client sends a request to `/api/portal[/optional/path][?query=string]`.
 * 2. The module validates the Bearer token against PocketBase and confirms the
 *    `Administrator` role.
 * 3. The incoming request is forwarded to `http://192.168.1.96[/optional/path]`
 *    using Node's built-in `http` module (no third-party proxy library needed).
 * 4. The target's response (headers + body) is piped back to the original client.
 *
 * ### Security considerations
 * - Only `Administrator`-role users may access this route.
 * - Hop-by-hop headers (`connection`, `transfer-encoding`, `upgrade`) are stripped
 *   before forwarding so they do not confuse the target server.
 * - The `host` header is rewritten to the target so the target responds correctly.
 *
 * @module localPortal
 */

import express, { NextFunction, Request, Response } from "express";
import http from "http";
import { pb } from "pb";

/** IP address of the local machine to proxy requests to */
const PORTAL_HOST = "192.168.1.96";

/** HTTP port on the target machine */
const PORTAL_PORT = 80;

/**
 * HTTP request headers that must not be forwarded to the upstream server.
 * These "hop-by-hop" headers are connection-scoped and meaningless across hops.
 */
const HOP_BY_HOP_HEADERS: ReadonlySet<string> = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);

/**
 * Validate a Bearer token from the `Authorization` header and confirm that the
 * authenticated user has the `Administrator` role.
 *
 * @param authHeader - Raw value of the `Authorization` request header.
 * @returns The PocketBase user model on success, or `null` if the token is
 *          missing, malformed, expired, or the user is not an Administrator.
 *
 * @example
 * ```typescript
 * const user = await validateAdmin(req.headers.authorization);
 * if (!user) return res.status(401).json({ error: "Unauthorized" });
 * ```
 */
async function validateAdmin(authHeader: string | undefined): Promise<any | null> {
  if (!authHeader) return null;

  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;

  // Load the token into the PocketBase auth store and refresh to confirm validity.
  pb.authStore.save(token, null);
  try {
    await pb.collection("users").authRefresh();
  } catch {
    return null;
  }

  const user = pb.authStore.model;
  if (!user || (user as any).role !== "Administrator") return null;

  return user;
}

/**
 * Forward an incoming Express request to the portal target machine.
 * Copies the request method, path, query string, sanitised headers, and body
 * (if present) to the upstream server, then pipes the full response back.
 *
 * @param req       - Incoming Express request. `req.path` must already be the
 *                    path *relative to* the `/portal` mount point (i.e. the
 *                    `/portal` segment has already been stripped by Express).
 * @param res       - Express response to which the upstream response is piped.
 *
 * @example
 * ```typescript
 * // Called internally by the /portal route handler after auth passes.
 * await proxyToPortal(req, res);
 * ```
 */
async function proxyToPortal(req: Request, res: Response): Promise<void> {
  // Build the query string from the already-parsed query object.
  const qs = new URLSearchParams(req.query as Record<string, string>).toString();
  const targetPath = (req.path || "/") + (qs ? `?${qs}` : "");

  // Copy incoming headers, stripping hop-by-hop entries that must not be forwarded.
  const forwardHeaders: http.OutgoingHttpHeaders = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      forwardHeaders[key] = value;
    }
  }
  // Rewrite the host header so the target server resolves its routes correctly.
  forwardHeaders["host"] = `${PORTAL_HOST}:${PORTAL_PORT}`;

  // Prepare the body if the request carries one. body-parser has already consumed
  // the readable stream and placed the parsed result in req.body, so we
  // re-serialise it here for methods that typically carry a body.
  let bodyBuffer: Buffer | undefined;
  const methodHasBody = ["POST", "PUT", "PATCH"].includes(req.method.toUpperCase());
  if (methodHasBody && req.body !== undefined) {
    const contentType = (req.headers["content-type"] ?? "").toLowerCase();
    if (contentType.includes("application/json") || !contentType) {
      // Default: re-serialise as JSON.
      bodyBuffer = Buffer.from(JSON.stringify(req.body), "utf8");
      forwardHeaders["content-type"] = "application/json";
    } else if (contentType.includes("application/x-www-form-urlencoded")) {
      // Re-serialise as URL-encoded form data.
      bodyBuffer = Buffer.from(new URLSearchParams(req.body).toString(), "utf8");
    }
    if (bodyBuffer) {
      forwardHeaders["content-length"] = bodyBuffer.length;
    }
  }

  const options: http.RequestOptions = {
    hostname: PORTAL_HOST,
    port: PORTAL_PORT,
    path: targetPath,
    method: req.method,
    headers: forwardHeaders,
  };

  return new Promise<void>((resolve) => {
    const proxyReq = http.request(options, (proxyRes) => {
      // Forward the status code from the upstream server.
      res.status(proxyRes.statusCode ?? 200);

      // Forward upstream response headers, stripping hop-by-hop ones.
      for (const [key, value] of Object.entries(proxyRes.headers)) {
        if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase()) && value !== undefined) {
          res.setHeader(key, value);
        }
      }

      // Pipe the upstream response body directly to the client response.
      proxyRes.pipe(res);
      proxyRes.on("end", resolve);
    });

    proxyReq.on("error", (err: NodeJS.ErrnoException) => {
      console.error(`[localPortal] Proxy error forwarding to ${PORTAL_HOST}: ${err.message}`);
      if (!res.headersSent) {
        res.status(502).json({
          error: "Bad Gateway",
          detail: `Could not reach ${PORTAL_HOST}:${PORTAL_PORT} — ${err.message}`,
        });
      }
      resolve();
    });

    // Write the re-serialised request body to the upstream request if needed.
    if (bodyBuffer) {
      proxyReq.write(bodyBuffer);
    }

    proxyReq.end();
  });
}

/**
 * Creates an Express router that provides a fully transparent HTTP proxy to the
 * local admin machine at `192.168.1.96`. Every HTTP method and sub-path is
 * supported. All requests are authenticated before forwarding.
 *
 * Mounted routes (assuming the router is registered under `/api`):
 *
 * | Client request                    | Forwarded to                        |
 * |-----------------------------------|-------------------------------------|
 * | `GET  /api/portal`                | `GET  http://192.168.1.96/`         |
 * | `GET  /api/portal/dashboard`      | `GET  http://192.168.1.96/dashboard`|
 * | `POST /api/portal/config`         | `POST http://192.168.1.96/config`   |
 * | `GET  /api/portal/page?foo=bar`   | `GET  http://192.168.1.96/page?foo=bar` |
 *
 * @returns A configured Express `Router` with the admin portal proxy endpoints.
 *
 * @example
 * ```typescript
 * import { localPortalRoutes } from "localPortal";
 * const apiRouter = express.Router();
 * apiRouter.use(localPortalRoutes());
 * ```
 */
export const localPortalRoutes = (): express.Router => {
  const router = express.Router();

  /**
   * Auth + proxy middleware shared by both portal route patterns.
   * Validates the Administrator token, then delegates to `proxyToPortal`.
   *
   * @param req  - Express request (path is already relative to `/portal`).
   * @param res  - Express response.
   * @param _next - Unused; all paths are either proxied or terminated here.
   */
  const portalHandler = async (req: Request, res: Response, _next: NextFunction): Promise<void> => {
    // ── Authentication ────────────────────────────────────────────────────────
    const user = await validateAdmin(req.headers.authorization);
    if (!user) {
      res.status(401).json({
        error: "Unauthorized",
        detail: "A valid Administrator Bearer token is required to access the portal.",
      });
      return;
    }

    // ── Proxy ─────────────────────────────────────────────────────────────────
    await proxyToPortal(req, res);
  };

  /**
   * ALL /portal
   * Handles requests to the bare `/portal` path (no trailing slash).
   * Equivalent to forwarding to http://192.168.1.96/
   */
  router.all("/portal", portalHandler);

  /**
   * ALL /portal/*
   * Handles requests to any sub-path under `/portal/`.
   * The `/portal` prefix is stripped by Express before `req.path` is set,
   * so `req.path` is already the upstream path (e.g. `/dashboard`).
   */
  router.all("/portal/*", portalHandler);

  console.log(`localPortal running → http://${PORTAL_HOST}:${PORTAL_PORT}`);
  return router;
};
