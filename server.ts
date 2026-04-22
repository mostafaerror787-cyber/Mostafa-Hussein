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

// Import firebase config manually
const firebaseConfig = JSON.parse(fs.readFileSync(path.join(__dirname, "firebase-applet-config.json"), "utf-8"));

// Initialize Firebase Admin for server-side use
let globalBucket: any = null;

async function initFirebaseAdmin() {
  if (admin.apps.length && globalBucket) return;

  console.log("[SERVER] Initializing Firebase Admin...");
  try {
    const projectId = firebaseConfig.projectId;
    // Common bucket name patterns
    const candidates = [
      firebaseConfig.storageBucket,                 // 1. From config
      `${projectId}.firebasestorage.app`,           // 2. Modern default
      `${projectId}.appspot.com`,                   // 3. Classic default
      projectId                                     // 4. Raw ID
    ].filter(Boolean);

    for (const bucketName of candidates) {
      try {
        console.log(`[SERVER] Testing bucket: ${bucketName}...`);
        
        // Initialize or re-initialize if needed (though admin only allows one default app)
        if (!admin.apps.length) {
          admin.initializeApp({
            projectId: projectId,
            storageBucket: bucketName
          });
        }
        
        const testBucket = admin.storage().bucket(bucketName);
        const [exists] = await testBucket.exists();
        
        if (exists) {
          globalBucket = testBucket;
          console.log(`[SERVER] Success! Using bucket: ${bucketName}`);
          break;
        } else {
          console.log(`[SERVER] Bucket ${bucketName} does not exist.`);
        }
      } catch (e: any) {
        console.log(`[SERVER] Error testing ${bucketName}: ${e.message}`);
      }
    }

    if (!globalBucket) {
      console.error("[SERVER] CRITICAL: Could not find any valid storage bucket.");
      // Fallback to config version anyway as a last resort
      if (!admin.apps.length) {
        admin.initializeApp({ projectId: firebaseConfig.projectId, storageBucket: firebaseConfig.storageBucket });
      }
      globalBucket = admin.storage().bucket();
    }
  } catch (err: any) {
    console.error("[SERVER] FATAL: Firebase Admin init failed:", err.message);
  }
}

// Perform initial init
initFirebaseAdmin();

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log("[SERVER] Starting server flow...");
  
  // Ensure we are initialized (idempotent)
  await initFirebaseAdmin();

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

  // API Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", adminLoaded: !!admin.apps.length });
  });

  // Upload API handler
  app.post("/api/upload", (req, res, next) => {
    if (!globalBucket) {
      return res.status(500).json({ error: "Firebase Storage is not available on the server" });
    }
    
    // Wrap multer in a function to catch synchronous errors
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
      
      console.log(`[API] Upload successful: ${downloadUrl}`);
      
      res.json({ 
        url: downloadUrl,
        name: file.originalname,
        size: file.size,
        path: storagePath
      });
    } catch (error: any) {
      console.error("[API] Server error during upload:", error);
      
      // Detailed diagnostics for bucket issues
      const isBucketError = error.message?.includes('bucket does not exist');
      res.status(500).json({ 
        error: isBucketError ? "Storage bucket configuration error" : "Server error during upload process",
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
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
