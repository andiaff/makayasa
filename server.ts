import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import https from "https";
import http from "http";
import { URL } from "url";

// Secure HTTP/HTTPS request proxy using native Node.js http/https modules with built-in manual redirect and timeout handling.
// This is highly robust, avoids undici fetch socket-leak/timeout issues in sandboxed container environments, and follows 302 Found redirects perfectly.
function requestWithRedirects(
  initialUrl: string,
  method: string,
  bodyData: any,
  maxRedirects = 10
): Promise<{ status: number; contentType: string; data: string }> {
  return new Promise((resolve, reject) => {
    let currentUrl = initialUrl;
    let redirectCount = 0;
    let currentMethod = method;
    let currentBody = bodyData;

    const executeRequest = (urlStr: string) => {
      try {
        console.log(`[PROXY HOP ${redirectCount}] ${currentMethod} to: ${urlStr}`);
        const parsedUrl = new URL(urlStr);
        const protocol = parsedUrl.protocol === "https:" ? https : http;
        
        const headers: Record<string, string> = {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "application/json, text/plain, */*",
        };

        let requestBodyString = "";
        if (currentMethod === "POST" && currentBody) {
          headers["Content-Type"] = "application/json";
          requestBodyString = typeof currentBody === "string" ? currentBody : JSON.stringify(currentBody);
          headers["Content-Length"] = Buffer.byteLength(requestBodyString).toString();
        }

        const options: https.RequestOptions = {
          method: currentMethod,
          headers: headers,
          timeout: 60000, // 60 seconds timeout for a single hop
        };

        const req = protocol.request(parsedUrl, options, (res) => {
          const status = res.statusCode || 200;

          // Handle redirect status codes: 301, 302, 303, 307, 308
          if (status >= 300 && status < 400 && res.headers.location) {
            if (redirectCount >= maxRedirects) {
              reject(new Error(`Too many redirects (max: ${maxRedirects})`));
              return;
            }
            redirectCount++;
            
            // Resolve relative/absolute redirect location
            const redirectUrl = new URL(res.headers.location, urlStr).toString();
            console.log(`[PROXY REDIRECT] Following ${status} redirect to: ${redirectUrl}`);
            
            // For 301, 302, 303 standard HTTP specs say to convert subsequent request to GET and drop body
            if (status === 301 || status === 302 || status === 303) {
              currentMethod = "GET";
              currentBody = null;
            }
            
            executeRequest(redirectUrl);
            return;
          }

          const contentType = res.headers["content-type"] || "";
          const chunks: Buffer[] = [];

          res.on("data", (chunk) => {
            chunks.push(chunk);
          });

          res.on("end", () => {
            const buffer = Buffer.concat(chunks);
            const responseText = buffer.toString("utf8");
            console.log(`[PROXY SUCCESS] Status: ${status}, Bytes: ${buffer.length}`);
            resolve({
              status: status,
              contentType: contentType,
              data: responseText,
            });
          });

          res.on("error", (err) => {
            console.error(`[PROXY RESPONSE ERROR]:`, err);
            reject(err);
          });
        });

        req.on("timeout", () => {
          console.warn(`[PROXY HOP TIMEOUT] Request to ${urlStr} timed out`);
          req.destroy();
          reject(new Error("Timeout"));
        });

        req.on("error", (err) => {
          console.error(`[PROXY CONNECTION ERROR]:`, err);
          reject(err);
        });

        if (currentMethod === "POST" && requestBodyString) {
          req.write(requestBodyString);
        }
        req.end();
      } catch (err) {
        console.error(`[PROXY EXECUTE ERROR]:`, err);
        reject(err);
      }
    };

    executeRequest(currentUrl);
  });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for JSON parsing with large payload support for database syncs
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API Health Route
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Secure Server-side Proxy for Google Sheets CSV and Apps Script Web Apps
  // Bypasses CORS and Iframe Redirection constraints in the browser sandbox.
  app.all("/api/proxy-appscript", async (req, res) => {
    let url = (req.query.url as string || req.body?.url as string || "").trim();
    if (!url) {
      return res.status(400).json({ error: "Missing 'url' query parameter or request body parameter" });
    }

    // Auto-fix: if the user forgot '/exec' at the end of the Google Apps Script URL, append it automatically
    if (url.includes("script.google.com/macros/s/")) {
      const parts = url.split("script.google.com/macros/s/");
      if (parts.length === 2) {
        const idSegment = parts[1];
        if (!idSegment.includes("/exec")) {
          const idClean = idSegment.split("?")[0].split("/")[0].trim();
          url = `https://script.google.com/macros/s/${idClean}/exec`;
          console.log(`[PROXY] Auto-corrected Apps Script URL: ${url}`);
        }
      }
    }

    try {
      // Security Validation: Ensure we only proxy trusted Google origins
      if (
        !url.startsWith("https://script.google.com/") && 
        !url.startsWith("https://script.googleusercontent.com/") &&
        !url.startsWith("https://docs.google.com/")
      ) {
        return res.status(400).json({ error: "Only Google Apps Script and Google Sheet URLs are permitted for proxying." });
      }

      console.log(`[PROXY] Method ${req.method} fetching from Google Service: ${url}`);
      
      const isPost = req.method === "POST";
      let bodyCopy: any = null;

      if (isPost && req.body) {
        bodyCopy = { ...req.body };
        delete bodyCopy.url; // Remove the proxy-specific url field to avoid polluting the Apps Script payload
      }

      console.log(`[PROXY] Sending ${req.method} to: ${url}`);
      const proxyResult = await requestWithRedirects(url, req.method, bodyCopy);

      if (proxyResult.status >= 400) {
        // If Google Apps Script returned a specific error payload in text form, handle it gracefully
        const trimmed = proxyResult.data.trim();
        const isHtml = proxyResult.contentType.toLowerCase().includes("text/html") || 
                       trimmed.toLowerCase().startsWith("<!doctype") || 
                       trimmed.toLowerCase().startsWith("<html") || 
                       trimmed.toLowerCase().startsWith("<script") ||
                       trimmed.includes("<body") ||
                       trimmed.includes("google-signin") ||
                       trimmed.includes("Sign in");

        if (isHtml) {
          return res.status(400).json({
            error: "Web App mengembalikan halaman HTML (Google Login/Editor), bukan data JSON. Pastikan Anda mendeploy Apps Script sebagai Web App dengan pengaturan:\n1. Klik 'Terapkan' (Deploy) > 'Penerapan baru' (New deployment)\n2. Pilih tipe: 'Web App'\n3. Jalankan sebagai (Execute as): 'Saya (Me / mahrus0593@gmail.com)'\n4. Siapa yang memiliki akses (Who has access): 'Siapa saja (Anyone)'\n5. Salin URL Web App yang berakhiran '/exec', bukan link editor Apps Script atau Spreadsheet!"
          });
        }

        return res.status(proxyResult.status).json({ 
          error: `Google Service responded with status: ${proxyResult.status}. Detail: ${trimmed.slice(0, 500)}` 
        });
      }

      const contentType = proxyResult.contentType || "";
      const textData = proxyResult.data;
      const trimmed = textData.trim();
      
      if (contentType.includes("application/json")) {
        try {
          const jsonData = JSON.parse(textData);
          return res.json(jsonData);
        } catch (e) {
          // JSON parsing failed, fallback to raw text parsing
        }
      }

      const isHtml = contentType.toLowerCase().includes("text/html") || 
                     trimmed.toLowerCase().startsWith("<!doctype") || 
                     trimmed.toLowerCase().startsWith("<html") || 
                     trimmed.toLowerCase().startsWith("<script") ||
                     trimmed.includes("<body") ||
                     trimmed.includes("google-signin") ||
                     trimmed.includes("Sign in");

      if (isHtml) {
        return res.status(400).json({
          error: "Web App mengembalikan halaman HTML (Google Login/Editor), bukan data JSON. Pastikan Anda mendeploy Apps Script sebagai Web App dengan pengaturan:\n1. Klik 'Terapkan' (Deploy) > 'Penerapan baru' (New deployment)\n2. Pilih tipe: 'Web App'\n3. Jalankan sebagai (Execute as): 'Saya (Me / mahrus0593@gmail.com)'\n4. Siapa yang memiliki akses (Who has access): 'Siapa saja (Anyone)'\n5. Salin URL Web App yang berakhiran '/exec', bukan link editor Apps Script atau Spreadsheet!"
        });
      }

      // If not JSON but parses, return as JSON
      try {
        const parsedJson = JSON.parse(textData);
        return res.json(parsedJson);
      } catch {
        // If not JSON, return as text
        res.setHeader("Content-Type", contentType || "text/plain");
        return res.send(textData);
      }
    } catch (error: any) {
      console.error("[PROXY ERROR] Failed to fetch Google resource:", error);
      if (error.message?.includes("Timeout") || error.message?.includes("timeout")) {
        return res.status(504).json({ 
          error: "Koneksi ke Google Apps Script/Spreadsheet mengalami Timeout (melebihi 60 detik). Ini biasanya terjadi karena Google Sheets sedang memproses data yang terlalu besar atau Apps Script mengalami cold start. Silakan coba sinkronisasi ulang dalam beberapa saat." 
        });
      }
      return res.status(500).json({ 
        error: error.message || "Unknown proxy error occurred while fetching from Google Services." 
      });
    }
  });

  // Vite Middleware integration for local development hot-reload & asset serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("[VITE] Mounted Vite development middleware");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log(`[PROD] Serving static files from ${distPath}`);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Owner Command Center running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[SERVER FATAL] Failed to start express server:", err);
});
