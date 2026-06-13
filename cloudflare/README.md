# Cloudflare Workers

Cloudflare Workers that sit in front of the backend origin server.

## Why

The backend runs inside a Dokku container on the origin server. Nginx on that
server routes requests based on the `Host` header — the stephen app responds to
`Host: stephen.thilenius.com`. Cloudflare manages the public DNS, so all
browser and API traffic passes through Cloudflare before reaching the origin.

Without this worker, the request that Cloudflare forwards to the origin would
carry the wrong `Host` header, and nginx would not route it to the correct
container.

## Workers

### `stephen-worker.js`

Proxies all traffic to the stephen backend container.

| Concern | Behaviour |
|---|---|
| HTTP requests | Rewrites `Host` → `stephen.thilenius.com`, forwards to origin, injects `Access-Control-Allow-Origin: *` |
| WebSocket upgrades | Detects `Upgrade: websocket`, switches protocol to `wss:`, passes through without body |
| CORS | `Access-Control-Allow-Origin: *` added to every response |

**Deploy:**
```bash
npx wrangler deploy stephen-worker.js
```

Or paste into the Cloudflare dashboard → Workers → your worker → Edit code.

## What does NOT use this worker

The **mDNS bridge script** (`../mDNS scripts/esp-mdns-bridge.sh`) runs directly
on the origin host. It contacts the backend at `https://stephen.thilenius.com`
without going through Cloudflare, so nginx handles it locally with no worker
involvement.

The origin server cannot reach `stephen.thilenius.com` directly (hairpin NAT
does not work). The bridge script instead calls the Cloudflare Worker URL,
which resolves from outside the local network and proxies back to the origin:

```bash
BACKEND="https://stephen.stephen-c19.workers.dev"
```
