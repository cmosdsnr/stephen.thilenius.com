import fs from "fs";
import multer from "multer";
import express, { Request, Response } from "express";
import { pb } from "pb";

import path from "path";
import { __dirname } from "miscellaneous";

/**
 * File sharing module for uploading, downloading, and managing shared files.
 * Provides a simple web interface and API for file operations with download tracking.
 *
 * Features:
 * - File upload with 2GB size limit per file
 * - Download tracking via PocketBase database
 * - Optional file deletion after download
 * - Web interface for file management
 * - JSON API for programmatic access
 *
 * @module fileShare
 */

/** Directory path where shared files are stored */
const dir = path.join(__dirname, `/stephen/shares/`);

// fs.readdir("/app/", (err, files) => {
//   console.log("/app:");
//   if (err) console.log("Error loading directory");
//   else console.log(files);
// });

// fs.readdir("/app/public/", (err, files) => {
//   console.log("/app/public:");
//   if (err) console.log("Error loading directory");
//   else console.log(files);
// });

// fs.readdir("/app/public/shares", (err, files) => {
//   console.log("/app/public/shares:");
//   if (err) console.log("Error loading directory");
//   else console.log(files);
// });

/**
 * Multer storage configuration for file uploads.
 * Files are stored with their original names in the shares directory.
 *
 * @see {@link https://github.com/expressjs/multer} - Multer documentation
 */
var storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },
});

/**
 * Multer upload middleware configuration.
 * Allows multiple file uploads with a 2GB size limit per file.
 *
 * @see {@link https://github.com/expressjs/multer#limits} - Multer limits documentation
 */
const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024 * 1024, //2GB max file(s) size
  },
}).array("files");

/**
 * Handle file upload requests using multer middleware.
 * Processes multiple files and returns the updated file list on success.
 *
 * @param req - Express request object with file data in multipart/form-data format
 * @param res - Express response object
 * @returns JSON response with success status and file list, or error details
 *
 * @example
 * ```typescript
 * // Example successful response:
 * // {
 * //   success: true,
 * //   message: "Files uploaded successfully!",
 * //   files: ["file1.txt", "file2.pdf"]
 * // }
 * ```
 */
function uploadFiles(req: any, res: any) {
  upload(req, res, function (error) {
    if (error) {
      //instanceof multer.MulterError
      res.status(500);
      if (error.code == "LIMIT_FILE_SIZE") {
        error.message = "File Size is too large. Allowed file size is 200KB";
        error.success = false;
      }
      return res.json(error);
    } else {
      if (!req.files) {
        res.status(500);
        res.json("file not found");
      }
      res.status(200);
      getFiles(res, {
        success: true,
        message: "Files uploaded successfully!",
      });

      console.log(req.body);
      console.log(req.files);
    }
  });
}

/**
 * Read the shares directory and return a list of available files.
 * Appends the file list to the provided content object and sends the response.
 *
 * @param res - Express response object to send the result
 * @param content - Content object to append file list to (modified in place)
 *
 * @example
 * ```typescript
 * // Example response content:
 * // {
 * //   files: ["document.pdf", "image.jpg", "archive.zip"],
 * //   success: true
 * // }
 * ```
 */
const getFiles = (res: any, content: any) => {
  content.files = [];
  console.log(`trying to load: ${dir}`);
  fs.readdir(dir, (err, files) => {
    if (err) content.error = "Error loading directory";
    else files.forEach((file, i) => content.files.push(file));
    res.send(content);
  });
};

/**
 * Creates an Express router for handling file sharing operations.
 *
 * Provides the following routes:
 * - GET /ToShareInfo - HTML page showing download history from database
 * - GET /file?name=filename[&d=1] - Download a file, optionally delete after download
 * - GET /ToShare - HTML page listing all available files with download/delete links
 * - GET /getAvailableFiles - JSON API returning list of available files
 * - GET /delete?name=filename - Delete a file and return updated file list
 * - POST /upload_files - Upload one or more files (multipart/form-data)
 *
 * @returns An Express Router with file sharing endpoints
 * @example
 * ```typescript
 * const app = express();
 * app.use('/api/files', fileShareRoutes());
 * ```
 */
export const fileShareRoutes = (): express.Router => {
  const router = express.Router();

  /**
   * GET /ToShareInfo
   * Returns an HTML page showing download history from the database.
   * Displays a table of downloaded files with timestamps and delete options.
   *
   * @param req - Express request object
   * @param res - Express response object with HTML content
   * @returns HTML page with download history table or "no files" message
   */
  router.get("/ToShareInfo", (req, res) => {
    let content = `<head><title>Dad's Server</title></head>`;
    pb.collection("fileDownloads")
      .getFullList({
        sort: "-created",
      })
      .then((records: any[]) => {
        if (records.length === 0) content += `<h1>No files have been downloaded yet</h1>`;
        else {
          content += `<style>table {border-collapse: collapse;} table, tr, td, th {border: 1px solid black; padding: 0px 20px;}</style>`;
          content += `<table><tr><th>Filename</th><th>Downloaded</th></tr>`;
          records.forEach((row, i) => {
            content += `<tr><td>${row.fileName}</td><td>${row.created}</td><td><a href='/delete/${row.fileName}'>❌</a></td></tr>`;
          });
          content += `</table>`;
        }
        content += `<br/><a href='/ToShare'>ToShare</a>`;
        res.send(content);
      });
  });

  /**
   * GET /file
   * Download a specific file by name. Tracks downloads in database.
   * If d=1 query parameter is provided, deletes the file after successful download.
   *
   * @param req - Express request object with query parameters
   * @param req.query.name - Name of the file to download
   * @param req.query.d - Optional flag ("1") to delete file after download
   * @param res - Express response object for file download
   * @returns File download or "file not found" message
   */
  router.get("/file", (req: any, res) => {
    let path = dir + req.query.name;
    console.log(path, fs.existsSync(path));

    if (fs.existsSync(path)) {
      res.download(path, req.query.name, (err) => {
        if (err) {
          console.log(err);
        } else {
          console.log("File sent");
          pb.collection("fileDownloads").create({ fileName: req.query.name });
          if (req.query.d === "1") fs.unlink(path, () => {});
        }
      });
    } else {
      console.log("not found");
      res.send("File not found: " + req.query.name);
    }
  });

  /**
   * GET /ToShare
   * Returns an HTML page listing all shared files with download and delete links.
   * Provides a simple web interface for file management.
   *
   * @param req - Express request object
   * @param res - Express response object with HTML content
   * @returns HTML page with file listing and management links
   */
  router.get("/ToShare", (req, res) => {
    let content = `<head><title>Dad's Server</title></head>`;
    // if ("password" in req.query && req.query.password === "qwe123") {
    if (true) {
      fs.readdir(dir, (err, files) => {
        if (err) {
          console.log(err);
          content += "Error loading directory";
        } else if (files.length === 0) {
          content += `<h1>No files to share</h1>`;
        } else {
          files.forEach((file, i) => {
            content += `<a href='/file/${file}'>${file}</a><a style='margin-left: 20px' href='/delete/${file}'>❌</a><br/>`;
          });
        }
        content += `<br/><a href='/ToShareInfo'>ToShare Info</a>`;
        res.send(content);
      });
    } else {
      content = `<h1>stephen.Buddbliss.com serving on miniPC!</h1>`;
      res.send(content);
    }
  });

  /**
   * GET /getAvailableFiles
   * JSON API endpoint that returns a list of all available files in the shares directory.
   *
   * @param req - Express request object
   * @param res - Express response object with JSON data
   * @returns JSON object with files array or error message
   *
   * @example
   * ```typescript
   * // Example response:
   * // { files: ["document.pdf", "image.jpg"] }
   * ```
   */
  router.get("/getAvailableFiles", (req, res) => {
    getFiles(res, {});
  });

  /**
   * GET /delete
   * Delete a file by name and return the updated file list.
   * Removes the file from the filesystem and responds with current directory contents.
   *
   * @param req - Express request object with query parameters
   * @param req.query.name - Name of the file to delete
   * @param res - Express response object with updated file list
   * @returns JSON object with updated files array after deletion
   */
  router.get("/delete", (req, res) => {
    const safeName = path.basename(req.query.name as string);
    fs.unlink(path.join(dir, safeName), () => {
      getFiles(res, {});
      // res.redirect("/ToShare?password=qwe123");
    });
  });

  /**
   * POST /upload_files
   * Upload one or more files using multipart/form-data.
   * Files are stored with their original names, up to 2GB per file limit.
   *
   * @param req - Express request object with multipart file data
   * @param res - Express response object with upload status
   * @returns JSON response with success status and file list, or error details
   */
  router.post("/upload_files", uploadFiles);
  return router;
};
