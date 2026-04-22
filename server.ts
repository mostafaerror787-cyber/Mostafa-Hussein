import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import admin from "firebase-admin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Global state
let globalBucket: any = null;
let firebaseConfig: any = null;

function loadConfig() {
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    if (fs.existsSync(configPath)) {
      firebaseConfig = JSON.parse(fs.readFileSync(configPath, "utf-8"));
      return true;
    }
    console.warn("[SERVER] Warning: firebase-applet-config.json not found at", configPath);
  } catch (err: any) {
    console.error("[SERVER] Error loading config:", err.message);
  }
  return false;
}

async function initFirebaseAdmin() {
  if (admin.apps.length && globalBucket) return true;
  if (!loadConfig()) return false;

  console.log("[SERVER] Initializing Firebase Admin...");
  try {
    const projectId = firebaseConfig.projectId;
    const candidates = [
      firebaseConfig.storageBucket,                 // 1. From config
      `${projectId}.firebasestorage.app`,           // 2. Modern default
      `${projectId}.appspot.com`,                   // 3. Classic default
      projectId                                     // 4. Raw ID
    ].filter(Boolean);

    // Initial app init
    if (!admin.apps.length) {
      admin.initializeApp({
        projectId: projectId,
        storageBucket: candidates[0]
      });
    }

    // Try to find the valid bucket. We'll do this quickly.
    for (const bucketName of candidates) {
      try {
        const testBucket = admin.storage().bucket(bucketName);
        // exists() can be slow, we'll try it but move on if it fails
        const [exists] = await testBucket.exists().catch(() => [false]);
        
        if (exists) {
          globalBucket = testBucket;
          console.log(`[SERVER] Success! Using bucket: ${bucketName}`);
          return true;
        }
      } catch (e: any) {
        console.log(`[SERVER] Bucket candidate ${bucketName} failed: ${e.message}`);
      }
    }

    // fallback
    globalBucket = admin.storage().bucket();
    return true;
  } catch (err: any) {
    console.error("[SERVER] FATAL: Firebase Admin init failed:", err.message);
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. START LISTENING IMMEDIATELY to prevent proxy 404/timeout
  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Listening on http://0.0.0.0:${PORT} (PID: ${process.pid})`);
  });

  // 2. Init Firebase in background or as part of flow
  initFirebaseAdmin().then(success => {
    if (success) console.log("[SERVER] Firebase initialized successfully");
    else console.warn("[SERVER] Firebase initialization skipped or failed");
  });

  app.use(cors());
  app.use(express.json());

  // Request logger
  app.use((req, res, next) => {
    console.log(`[SERVER] ${req.method} ${req.url}`);
    next();
  });

  // Set up multer for memory storage
  const upload = multer({ 
    storage: multer.memoryStorage(), 
    limits: { fileSize: 100 * 1024 * 1024 } 
  });

  // API routes FIRST
  app.use("/api", (req, res, next) => {
    console.log(`[API_REQUEST] ${req.method} ${req.url}`);
    next();
  });

  app.get("/api/health", (req, res) => {
    res.json({ 
      status: "ok", 
      adminLoaded: !!admin.apps.length,
      bucket: globalBucket?.name || "uninitialized"
    });
  });

  app.post("/api/upload", async (req, res, next) => {
    if (!globalBucket) {
      // Try to re-init if not ready
      await initFirebaseAdmin();
    }
    
    if (!globalBucket) {
      console.error("[API] Upload blocked: globalBucket is null");
      return res.status(503).json({ error: "Firebase Storage is still initializing or not available" });
    }
    
    upload.single("file")(req, res, (err) => {
      if (err) {
        console.error("[API] Multer error:", err);
        return res.status(400).json({ error: `Multer error: ${err.message}` });
      }
      next();
    });
  }, async (req: any, res) => {
    try {
      if (!globalBucket) throw new Error("Bucket not initialized");

      const file = req.file;
      const userId = req.body.userId || "anonymous";
      
      if (!file) {
        console.warn("[API] Upload failed: No file in request");
        return res.status(400).json({ error: "No file uploaded" });
      }

      console.log(`[API] Processing upload: ${file.originalname} (${file.size} bytes) for user ${userId} using bucket ${globalBucket.name}`);
      
      const storagePath = `songs/${userId}/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      const blob = globalBucket.file(storagePath);
      
      await blob.save(file.buffer, {
        contentType: file.mimetype,
        resumable: false,
        metadata: {
          cacheControl: 'public, max-age=31536000',
        }
      });
      
      await blob.makePublic().catch(err => {
        console.warn("[API] makePublic failed:", err.message);
      });
      
      const downloadUrl = `https://storage.googleapis.com/${globalBucket.name}/${encodeURIComponent(storagePath)}`;
      
      console.log(`[API] Upload successful. Public URL: ${downloadUrl}`);
      
      res.json({ 
        url: downloadUrl,
        name: file.originalname,
        size: file.size,
        path: storagePath
      });
    } catch (error: any) {
      console.error("[API] Server error during upload:", error);
      
      // Detailed diagnostics
      res.status(500).json({ 
        error: "Server error during upload process",
        details: error.message,
        triedBucket: globalBucket?.name
      });
    }
  });

  // Global error handler for API routes
  app.use("/api", (err: any, req: any, res: any, next: any) => {
    console.error("[SERVER] Unhandled API Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });

  // Catch-all for unknown /api routes to prevent falling through to Vite (HTML)
  app.all("/api/*", (req, res) => {
    console.warn(`[SERVER] 404 - API Route Not Found: ${req.method} ${req.url}`);
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        host: '0.0.0.0',
        port: 3000
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    // Already listening
  });
}

startServer().catch(err => {
  console.error("[FATAL ERROR] Failed to start server:", err);
  process.exit(1);
});
