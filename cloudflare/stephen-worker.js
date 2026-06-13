/**
 * Cloudflare Worker — stephen.thilenius.com proxy
 *
 * PURPOSE
 * -------
 * The backend (Express + Node.js) runs inside a Dokku container on the origin
 * server. Cloudflare sits in front as CDN/DNS, but the container is not
 * directly reachable at the public domain without the correct Host header.
 * This worker rewrites every incoming request so it arrives at the origin with
 * `Host: stephen.thilenius.com`, which nginx uses to route to the stephen
 * Dokku app container.
 *
 * WEBSOCKET HANDLING
 * ------------------
 * The frontend uses a persistent WebSocket connection (via the `ws` library on
 * the backend) for real-time updates (ESP device list, sensor data, etc.).
 * WebSocket upgrades require special handling — they cannot use a standard
 * `fetch` with a body. This worker detects the `Upgrade: websocket` header and
 * passes the request through as-is, switching the protocol to `wss:`.
 *
 * CORS
 * ----
 * `Access-Control-Allow-Origin: *` is injected on every response so the React
 * frontend (served from a different origin during development, or via Cloudflare
 * Pages) can call the API without browser CORS errors.
 *
 * DEPLOYMENT
 * ----------
 * Deploy via the Cloudflare dashboard or Wrangler CLI:
 *   npx wrangler deploy stephen-worker.js
 *
 * The worker should be assigned to the route(s) that the frontend and bridge
 * scripts use to reach the backend (e.g. thilenius.com/api/*).
 *
 * NOTE: The mDNS bridge script (../mDNS scripts/esp-mdns-bridge.sh) runs on
 * the origin host itself and contacts the backend directly at
 * https://stephen.thilenius.com — it does NOT go through this worker.
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

/**
 * Main request handler.
 * Rewrites the request URL and Host header to point at the Dokku origin,
 * then proxies the response back to the caller.
 *
 * @param {Request} request - The incoming Cloudflare request object
 * @returns {Promise<Response>}
 */
async function handleRequest(request) {
  const url = new URL(request.url)

  // Always target the Dokku origin regardless of what hostname the caller used
  url.hostname = 'stephen.thilenius.com'

  // WebSocket upgrades must use wss:, everything else uses https:
  url.protocol = request.headers.get('Upgrade') === 'websocket' ? 'wss:' : 'https:'

  const headers = new Headers(request.headers)
  headers.set('Host', 'stephen.thilenius.com')

  // ── WebSocket upgrade ──────────────────────────────────────────────────────
  // WebSocket connections cannot carry a body and need to be forwarded as a
  // plain Request (no body option) so the runtime handles the upgrade properly.
  if (request.headers.get('Upgrade') === 'websocket') {
    const upstreamReq = new Request(url.toString(), {
      method: request.method,
      headers,
    })
    return fetch(upstreamReq)
  }

  // ── Standard HTTP request ──────────────────────────────────────────────────
  const upstreamReq = new Request(url.toString(), {
    method:   request.method,
    headers,
    body:     request.body,
    redirect: 'follow',
  })

  const upstreamRes = await fetch(upstreamReq)

  // Inject CORS header so browser clients on any origin can call the API
  const resHeaders = new Headers(upstreamRes.headers)
  resHeaders.set('Access-Control-Allow-Origin', '*')

  return new Response(upstreamRes.body, {
    status:     upstreamRes.status,
    statusText: upstreamRes.statusText,
    headers:    resHeaders,
  })
}
