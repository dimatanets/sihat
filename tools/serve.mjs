/* Local-only preview; no build step. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const mime = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".woff2": "font/woff2", ".pdf": "application/pdf" };
const server = http.createServer((req, res) => {
  let url;
  try { url = decodeURIComponent(new URL(req.url, "http://localhost").pathname); }
  catch (_) { res.writeHead(400).end("Bad request"); return; }
  const file = path.resolve(root, "." + (url.endsWith("/") ? url + "index.html" : url));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end("Forbidden"); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404).end("Not found"); return; }
    res.writeHead(200, { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    res.end(data);
  });
});
server.listen(5173, "127.0.0.1", () => console.log("Sihat preview: http://127.0.0.1:5173"));
