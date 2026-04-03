import express from "express";
import fs from "node:fs";
import path from "node:path";
import { promises as fsp } from "node:fs";
import { pb } from "pb";

/**
 * Photo albums and boxes management module.
 * Provides REST API endpoints for managing photo galleries, including regular albums,
 * special albums (admin-only), and numbered photo boxes with rotation support.
 *
 * @module albums
 */

/** Last authentication token used for caching purposes */
let lastToken = ""; // (currently unused – kept for compatibility)

/** Last user role retrieved for caching purposes */
let lastRole = ""; // (currently unused – kept for compatibility)

/** Rate limiting flag to prevent rapid successive requests */
let skip = false;

/**
 * Read all JPEG files from a directory and load rotation data if available.
 * Filters for .jpg files only and attempts to load rotation.json for image orientation data.
 *
 * @param dir - Directory path to scan for image files
 * @returns Object containing file list and rotation data. On failure, returns { files: [], rotation: {} }.
 *
 * @example
 * ```ts
 * const albumData = readFiles('stephen/gallery/albums/vacation2023');
 * // Returns: { files: ['img1.jpg', 'img2.jpg'], rotation: { 'img1.jpg': 1 } }
 * ```
 */
const readFiles = (dir: string): { files: string[]; rotation: Record<string, number> } => {
  const content: { files: string[]; rotation: Record<string, number> } = { files: [], rotation: {} };

  try {
    content.files = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((file) => file.isFile() && file.name.endsWith(".jpg"))
      .map((file) => file.name);
  } catch (e) {
    console.error("Error reading directory:", dir, e);
    return { files: [], rotation: {} };
  }

  try {
    const rotationFile = path.join(dir, "rotation.json");
    if (fs.existsSync(rotationFile)) {
      const data = fs.readFileSync(rotationFile, "utf8");
      content.rotation = JSON.parse(data);
    }
  } catch (e) {
    console.error("Error reading rotation file:", e);
  }

  return content;
};

/**
 * Read a JSON file (utf8) and parse it, returning a fallback if the file doesn't exist.
 *
 * @param file - Absolute path to the JSON file.
 * @param fallback - Value returned if the file is missing.
 * @returns Parsed JSON value or the fallback.
 */
async function readJSON<T>(file: string, fallback: T): Promise<T> {
  try {
    const text = await fsp.readFile(file, "utf8");
    return JSON.parse(text) as T;
  } catch (e: any) {
    if (e?.code === "ENOENT") return fallback;
    throw e;
  }
}

/**
 * Serialize data to JSON and write to disk (utf8).
 *
 * @param file - Absolute path to write.
 * @param data - Serializable data.
 */
async function writeJSON(file: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, json, "utf8");
}

/**
 * Validate rotation payload: keys are filenames (string),
 * values are integers in the range 0..3 (0 means "no rotation" / remove).
 *
 * @param input - Arbitrary input to validate.
 * @throws Error if validation fails.
 *
 * @example
 * ```ts
 * validateRotation({ 'photo1.jpg': 1, 'photo2.jpg': 3 }); // valid
 * validateRotation({ 'photo1.jpg': 0 }); // valid (means clear)
 * validateRotation({ 'photo1.jpg': 'x' as any }); // throws
 * ```
 */
function validateRotation(input: unknown): asserts input is Record<string, number> {
  if (typeof input !== "object" || input === null) {
    throw new Error("rotation must be an object");
  }
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (typeof k !== "string") throw new Error("rotation keys must be strings");
    if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 3) {
      throw new Error(`rotation["${k}"] must be an integer 0..3`);
    }
  }
}

/**
 * Merge a rotation payload into an album/box directory's rotation.json,
 * deleting keys with value 0 and setting keys with 1..3.
 *
 * @param dir - Base directory containing rotation.json
 * @param payload - Rotation map to merge
 * @returns The updated rotation map as persisted
 *
 * @example
 * ```ts
 * await rotateUpdate('stephen/gallery/albums/vacation', { 'a.jpg': 2, 'b.jpg': 0 });
 * ```
 */
async function rotateUpdate(dir: string, payload: Record<string, number>): Promise<Record<string, number>> {
  const rotationFile = path.join(dir, "rotation.json");
  const existing = await readJSON<Record<string, number>>(rotationFile, {});
  const merged: Record<string, number> = { ...existing };

  for (const [k, v] of Object.entries(payload)) {
    if (v === 0) delete merged[k];
    else merged[k] = v; // 1..3
  }

  await writeJSON(rotationFile, merged);
  return merged;
}

/**
 * Creates an Express router for handling photo albums and boxes operations.
 * Supports file listing, image rotation management, and role-based access control.
 *
 * @returns An Express Router with photo gallery management endpoints
 *
 * @example
 * ```ts
 * const app = express();
 * app.use('/api/gallery', albumsAndBoxesRoutes());
 * ```
 */
export const albumsAndBoxesRoutes = (): express.Router => {
  const router = express.Router();

  /**
   * POST /rotation/:name/:select
   *
   * Updates rotation values for images in boxes, albums, or special albums.
   * Validates rotation data and writes to the appropriate rotation.json file.
   * Uses the request **body** (JSON) as the source of rotation changes.
   *
   * Path params:
   * - `name`: Name/number of the box or album (folder)
   * - `select`: One of `"box" | "album" | "special"`
   *
   * Body:
   * - `{ rotation: Record<string, 0|1|2|3> }` — filenames to quarter-turns (0 clears the entry)
   *
   * Response:
   * - `{ ok: true, rotation: Record<string, number> }` on success
   * - `{ ok: false, error: string }` on failure
   *
   * @example
   * POST /rotation/vacation2023/album
   * Body: { "rotation": { "photo1.jpg": 1, "photo2.jpg": 3, "photo3.jpg": 0 } }
   */
  router.post("/rotation/:name/:select", async (req, res) => {
    try {
      const base =
        req.params.select === "box"
          ? "stephen/gallery/boxes/boxImages"
          : req.params.select === "album"
          ? "stephen/gallery/albums"
          : "stephen/gallery/specialAlbums";

      const albumDir = path.join(base, req.params.name);

      const { rotation } = req.body ?? {};
      validateRotation(rotation);

      const merged = await rotateUpdate(albumDir, rotation);
      return res.json({ ok: true, rotation: merged });
    } catch (err: any) {
      console.error("Save rotation failed:", err);
      return res.status(400).json({ ok: false, error: err?.message ?? "Bad request" });
    }
  });

  /**
   * GET /readDirectories/:select
   *
   * Returns a list of directories (albums or boxes) plus the combined rotation map
   * for the relevant roots. Requires a valid Bearer token; Administrator users also
   * receive the special albums list.
   *
   * Path params:
   * - `select`: `"box"` returns a list of boxes; otherwise returns regular albums and (if admin) special albums
   *
   * Response (albums):
   * ```json
   * {
   *   "files": ["album1", "album2"],
   *   "special": ["secretA", "secretB"], // only if Administrator
   *   "rotation": { "coverName.jpg": 1, ... } // merged from root rotation.json files
   * }
   * ```
   *
   * Response (boxes):
   * ```json
   * {
   *   "files": ["1", "2", "3"],
   *   "rotation": { "some.jpg": 2, ... }
   * }
   * ```
   */
  router.get("/readDirectories/:select", async (req, res) => {
    const content: { files: string[]; special?: string[]; rotation: Record<string, number> } = {
      files: [],
      rotation: {},
    };

    if (skip) {
      res.send({ error: "skipping" });
      return;
    }
    skip = true;
    setTimeout(() => {
      skip = false;
    }, 500);

    // Bearer token auth with PocketBase
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: "Missing Authorization header" });
    }
    const [scheme, token] = authHeader.split(" ");
    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ error: "Malformed Authorization header" });
    }

    pb.authStore.save(token, null);
    try {
      await pb.collection("users").authRefresh();
    } catch (err) {
      console.error("authRefresh failed:", err, " with token:", token);
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    const user = pb.authStore.model!;
    const role = (user as any).role;

    try {
      if (req.params.select === "box") {
        content.files = fs
          .readdirSync("stephen/gallery/boxes/boxImages", { withFileTypes: true })
          .filter((file) => file.isDirectory())
          .map((file) => file.name);

        const rotFile = "stephen/gallery/boxes/boxImages/rotation.json";
        if (fs.existsSync(rotFile)) {
          const data = fs.readFileSync(rotFile, "utf8");
          const rot = JSON.parse(data);
          content.rotation = { ...content.rotation, ...rot };
        }
      } else {
        // Regular albums
        content.files = fs
          .readdirSync("stephen/gallery/albums", { withFileTypes: true })
          .filter((file) => file.isDirectory())
          .map((file) => file.name);

        const albumRotFile = "stephen/gallery/albums/rotation.json";
        if (fs.existsSync(albumRotFile)) {
          const data = fs.readFileSync(albumRotFile, "utf8");
          const rot = JSON.parse(data);
          content.rotation = { ...content.rotation, ...rot };
        }

        // Special albums for admins
        if (role === "Administrator") {
          content.special = fs
            .readdirSync("stephen/gallery/specialAlbums", { withFileTypes: true })
            .filter((file) => file.isDirectory())
            .map((file) => file.name);

          const specialRotFile = "stephen/gallery/specialAlbums/rotation.json";
          if (fs.existsSync(specialRotFile)) {
            const data = fs.readFileSync(specialRotFile, "utf8");
            const rot = JSON.parse(data);
            content.rotation = { ...content.rotation, ...rot };
          }
        }
      }

      return res.json(content);
    } catch (err) {
      console.error("Error reading directories:", err);
      return res.status(500).json({ error: "Error reading directories" });
    }
  });

  /**
   * GET /readImages/:name/:select
   *
   * Returns all JPEG files and rotation data for a specific collection directory.
   *
   * Path params:
   * - `name`: Name/number of the collection to retrieve
   * - `select`:
   *   - `"box"` → stephen/gallery/boxes/boxImages/:name
   *   - `"album"` → stephen/gallery/albums/:name
   *   - otherwise → stephen/gallery/specialAlbums/:name
   *
   * Response:
   * ```json
   * {
   *   "files": ["a.jpg", "b.jpg"],
   *   "rotation": { "a.jpg": 3 }
   * }
   * ```
   */
  router.get("/readImages/:name/:select", function (req, res) {
    const dir =
      (req.params.select === "box"
        ? "stephen/gallery/boxes/boxImages/"
        : req.params.select === "album"
        ? "stephen/gallery/albums/"
        : "stephen/gallery/specialAlbums/") + req.params.name;

    res.send(readFiles(dir));
  });

  return router;
};
