# Code Review — Gliderport Backend

---

## 🐛 Bugs

### 1. `fileShare.ts` — Template literal used as a plain string (upload broken)
**Line 52** — The `destination` callback uses `"${dir}"` as a regular quoted string, not a backtick template literal. The upload will always try to write to a folder literally named `${dir}` and will fail.

```ts
// ❌ Wrong — regular string, not a template literal
destination: function (req, file, cb) {
  cb(null, "${dir}");
},

// ✅ Fix
destination: function (req, file, cb) {
  cb(null, dir);
},
```

---

### 2. `socket.ts` — Duplicate `uuidv4()` call; first ID is unused
**Lines 163 & 170** — Two separate UUIDs are generated on a new connection. The first (`const id = uuidv4()`) is only used in the log message `"Web Socket connection opened from: " + id`. The metadata object immediately generates its own _different_ UUID. This means the logged ID never matches the tracked client ID — making connection logs misleading for debugging.

```ts
// ❌ Now: two UUIDs, the logged one is thrown away
const id = uuidv4();                   // line 163 — only used in log
const metadata: ClientMetadata = {
  id: uuidv4(),                         // line 170 — completely different UUID
  ...
};
log(..., "Web Socket connection opened from: " + id);   // logs wrong id!

// ✅ Fix — generate once, reuse
const metadata: ClientMetadata = { id: uuidv4(), ... };
log(..., "Web Socket connection opened from: " + metadata.id);
```

---

### 3. `sprinkler.ts` — String compared to number -1 (always false)
**Lines 272 & 300** — `sprinkler.ip` is typed as and initialised to `""` (empty string). The guards `sprinkler.ip == -1` compare it to the number `-1`. Because JS coerces `"" == -1` to `false`, these checks are always false — the `load` endpoint returns data even when no sprinkler is connected, and `found` always returns `true` in that branch.

```ts
// ❌ Wrong — comparing a string to a number
if (sprinkler.ip == -1) { ... }
res.json({ status: sprinkler.ip == -1 ? false : true });

// ✅ Fix
if (sprinkler.ip === "") { ... }
res.json({ status: sprinkler.ip !== "" });
```

---

### 4. `solarEdge.ts` — `minToId` and `hrToId` are identical functions
**Lines 83–88** — Both functions are byte-for-byte identical. One of them (likely `minToId`) should be removed and all calls should go through `hrToId`. Having two identically-named-but-differently-named copies risks them diverging.

```ts
// ❌ Both do exactly the same thing
const minToId = (hr: number) => "0".repeat(15 - hr.toString().length) + hr.toString();
const hrToId  = (hr: number) => "0".repeat(15 - hr.toString().length) + hr.toString();
```

---

### 5. `solarEdge.ts` — Stray unused console import
**Line 28** — `import { error } from "console"` is imported but never used anywhere in the file. It should be removed to avoid confusion.

---

### 6. `solarEdge.ts` — `startFiveSecondTimer` defined but never called
The function at line 292 is fully implemented but the call at lines 284–286 is commented out, so solar data collection never actually starts. If this is intentional it should be documented clearly; if not, it's a significant silent data-collection bug.

---

### 7. `ultimeter.ts` — PocketBase filter passed as an object instead of a string
**Lines 204–205 and 220–222** — PocketBase's `.getFullList()` `filter` option must be a string expression, not a plain JS object. Passing `{ id: hrToId(hr - 1) }` will silently fail or be ignored by the PocketBase SDK.

```ts
// ❌ Wrong — filter is an object, not a string
const record = await pb.collection("ultimeter").getFullList({
  filter: { id: hrToId(hr - 1) },
});

// ✅ Fix — filter must be a string
const record = await pb.collection("ultimeter").getFullList({
  filter: `id = "${hrToId(hr - 1)}"`,
});
```

---

### 8. `solarEdge.ts` — Backup appends `"]\n"` twice
**Lines 537 & 543** — Inside the while loop, when `end >= last`, the code appends the trimmed last batch without a trailing comma plus `"]\n"` (line 537). Then after the loop exits, another `"]\n"` is unconditionally appended (line 543). The result is a malformed JSON file ending with `...}\n]\n]\n`.

---

### 9. `fileShare.ts` — Path traversal vulnerability
**Line 287** — `dir + req.query.name` is passed directly to `fs.unlink` without any sanitization. A malicious request with `name=../../etc/passwd` could delete arbitrary files. Similarly in the `/file` download endpoint.

```ts
// ❌ Dangerous
fs.unlink(dir + req.query.name, ...);

// ✅ Fix — resolve and verify the path stays inside dir
const safeName = path.basename(req.query.name as string);
fs.unlink(path.join(dir, safeName), ...);
```

---

### 10. `pb.ts` — Admin credentials hardcoded in source
**Line 163** — Hardcoded plaintext credentials (`"Qwe123qwe!"`) are committed to source control. They should be moved to environment variables.

```ts
// ❌
authData = await pb.admins.authWithPassword("stephen@thilenius.com", "Qwe123qwe!");

// ✅
authData = await pb.admins.authWithPassword(
  process.env.PB_ADMIN_EMAIL!,
  process.env.PB_ADMIN_PASSWORD!
);
```

---

### 11. `albums.ts` — `readImages` and `rotation` endpoints have no authentication
`/readDirectories/:select` verifies a Bearer token, but `/readImages/:name/:select` and `POST /rotation/:name/:select` have no authentication at all. Anyone can read image lists or change rotation values without a token.

---

## ⚠️ Inconsistencies

### 1. `hrToId` duplicated across four files
`powerMeter.ts`, `solarEdge.ts` (`hrToId` + `minToId`), `ultimeter.ts`, and `miscellaneous.ts` (`ToId`) all independently define the same zero-padding function with slightly different names. This should be a single shared export from `miscellaneous.ts` and imported everywhere.

---

### 2. Redundant body-parsing middleware in `app.ts`
`express.urlencoded` (line 48) and `bodyParser.urlencoded` (line 50) are both registered — they are identical under the hood (Express 4.16+ wraps body-parser internally). The extra one should be removed. There's also a limit mismatch: urlencoded is set to `30mb` on line 48 but `10mb` on line 50; the second registration effectively overrides the first.

---

### 3. `appSetup.ts` appears to be dead code
`appSetup.ts` creates a second Express app listening on port `1234`. It is not imported anywhere in the codebase. It is probably an early prototype that was never cleaned up and should be removed.

---

### 4. Mixed import paths for `miscellaneous`
Some modules use `import { log } from "miscellaneous"` (relative), others use `import { log } from "miscellaneous"` (bare). Pick one style and stick to it. The `tsconfig.json` path aliases would make bare imports safe, but mixing them is confusing.

---

### 5. `socket` vs `socket` import path
`esp.ts`, `powerMeter.ts`, `solarEdge.ts`, and `ultimeter.ts` import from `"socket"`, but `socket.ts` itself imports from `"sprinkler"` (no alias). This mixed aliasing style should be standardised.

---

### 6. `var` used in `appSetup.ts` instead of `const`/`let`
`var corsOptions = ...` on line 38 should be `const corsOptions = ...`. `var` should not appear in TypeScript source files.

---

### 7. `Array.fill()` shared-reference trap
In `powerMeter.ts`:
```ts
let hour: number[][] = Array(60).fill(Array(6).fill(0));
```
`Array.fill()` with an object fills every slot with a reference to the *same* inner array. Writing `hour[3][1] = 5` also changes `hour[7][1]` etc. The same issue exists in `ultimeter.ts` with `Array(240).fill(Array(2).fill(0))`.

```ts
// ✅ Fix — create independent inner arrays
let hour: number[][] = Array.from({ length: 60 }, () => Array(6).fill(0));
```

---

### 8. `solarEdge.ts` duplicates the log-trimming function from `miscellaneous.ts`
`solarEdge.ts` has its own private `limitLogLineNumbers(file, max)` (line 573) that does the same thing as the one in `miscellaneous.ts`. It should import and call the shared version instead.

---

### 9. Error response shape is inconsistent
Different modules return errors in different shapes:
- `{ error: "..." }` — most modules
- `{ ok: false, error: "..." }` — `albums.ts`
- `{ error: "...", detail: "..." }` — `powerMeter.ts`
- `{ error: "...", errorMsg: ... }` — `ultimeter.ts`, `solarEdge.ts`

A shared error-response helper would make these uniform and easier to handle on the frontend.

---

### 10. `fileShare.ts` — "delete" via GET request
`GET /delete?name=...` triggers a file deletion. HTTP GET should be side-effect-free (idiomatic REST convention). This should be a `DELETE /file?name=...` or `DELETE /shares/:name`.

---

## 💬 Missing / Incomplete Comments

- **`solarEdge.ts` `saveCurrentMinute`** (line 90) — No JSDoc. This is a critical function that persists a data point to the database and should be documented.
- **`esp.ts` `/setPrefix` and `/getPrefix` routes** (lines 208–228) — No JSDoc, unlike all other routes in the file.
- **`solarEdge.ts` `/solarEdge/Translate` route** (line 660) — No JSDoc. This is a heavy migration endpoint; it needs documenting.
- **`solarEdge.ts` module-level mutable variables** (`readings`, `readingMinute`, `currentReadingMinute`, `reading`, `lastReading`, `busy` — lines 207–211) — Declared without comments. Their role in the 5-second tick cycle should be described.
- **`miscellaneous.ts` `logFiles` Set** (line 72) — The set is populated by every `log()` call but is never actually consumed or acted upon. The comment says "keep a record" but the record is never read. Either use it or remove it.
- **`fileShare.ts`** — Debug `console.log(req.body)` and `console.log(req.files)` at lines 111–112 are leftover and should be removed or guarded by a `DEBUG` flag.
- **`app.ts` line 83** — `process.exit(1)` is commented out with no explanation of why this was disabled. A comment explaining the decision is needed.

---

## ⚡ Optimisations

### 1. Spread-in-loop O(n²) array building
In `solarEdge.ts` and `ultimeter.ts`, history is built like:
```ts
ans = [...ans, ...r.power]; // inside a loop
```
Each iteration creates a brand-new array copying all previous elements. For large datasets (24+ hours) this becomes very slow. Use `push` with spread once or `Array.prototype.concat`:
```ts
ans.push(...r.power);
// or
ans = ans.concat(r.power);
```

### 2. ESP network scan is very aggressive
`esp.ts` fires 253 simultaneous TCP connections, each with a 15-second timeout. On a busy network this produces a spike of ~250 half-open sockets. Consider batching scans in groups of 30–50 with `p-limit` (which is already a declared dependency).

### 3. `albums.ts` uses synchronous fs calls inside async handlers
`readFiles()` uses `fs.readdirSync` and `fs.readFileSync`. While harmless for small directories, they block the Node.js event loop. `readImages` and `readDirectories` already use `async`, so the sync calls should be replaced with their `fsp` (promise) equivalents.

---
