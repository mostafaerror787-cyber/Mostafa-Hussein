import express from "express";
import { createServer as createViteServer } from "vite";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure directories exist
const UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");
const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ songs: [] }));

function getDb() {
  return JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
}

function saveDb(data: any) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Request logger
  app.use((req, res, next) => {
    if (!req.url.startsWith('/@vite') && !req.url.startsWith('/src')) {
      console.log(`[SERVER] ${req.method} ${req.url}`);
    }
    next();
  });

  // Set up multer for local storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, uniqueSuffix + '-' + file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_'));
    }
  });

  const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } 
  });

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "local" });
  });

  // Song metadata endpoints
  app.get("/api/songs", (req, res) => {
    const db = getDb();
    res.json(db.songs);
  });

  app.post("/api/songs", (req, res) => {
    const db = getDb();
    const newSong = {
      id: `song-${Date.now()}-${Math.round(Math.random() * 1000000)}`,
      createdAt: new Date().toISOString(),
      ...req.body
    };
    db.songs.unshift(newSong);
    saveDb(db);
    res.status(201).json(newSong);
  });

  app.patch("/api/songs/:id", (req, res) => {
    const db = getDb();
    const index = db.songs.findIndex((s: any) => s.id === req.params.id);
    if (index !== -1) {
      db.songs[index] = { ...db.songs[index], ...req.body };
      saveDb(db);
      res.json(db.songs[index]);
    } else {
      res.status(404).json({ error: "Song not found" });
    }
  });

  app.delete("/api/songs/:id", (req, res) => {
    const db = getDb();
    const index = db.songs.findIndex((s: any) => s.id === req.params.id);
    if (index !== -1) {
      const song = db.songs[index];
      if (song.audioUrl && song.audioUrl.startsWith('/uploads/')) {
        const filePath = path.join(process.cwd(), 'public', song.audioUrl);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
          console.log(`[SERVER] Deleted physical file: ${filePath}`);
        }
      }
      db.songs.splice(index, 1);
      saveDb(db);
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Song not found" });
    }
  });

  // File upload endpoint
  app.post("/api/upload", upload.single("file"), (req, res) => {
    try {
      const file = (req as any).file;
      if (!file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      // Return a relative path that can be served by the web server
      const downloadUrl = `/uploads/${file.filename}`;
      
      console.log(`[API] File uploaded successfully: ${downloadUrl}`);
      
      res.json({ 
        url: downloadUrl,
        name: file.originalname,
        size: file.size,
        path: downloadUrl
      });
    } catch (error: any) {
      console.error("[API] Server error during upload:", error);
      res.status(500).json({ error: "Server error during upload process", details: error.message });
    }
  });

  // Global error handler for API routes
  app.use("/api", (err: any, req: any, res: any, next: any) => {
    console.error("[SERVER] Unhandled API Error:", err);
    res.status(500).json({ error: "Internal Server Error", details: err.message });
  });

  // Catch-all for unknown /api routes
  app.all("/api/*", (req, res) => {
    res.status(404).json({ error: `API route not found: ${req.method} ${req.url}` });
  });

  // Serve static files from public (already handled by Vite in dev, but needed for uploads)
  app.use('/uploads', express.static(UPLOADS_DIR));

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
    console.log(`[SERVER] Running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("[FATAL ERROR] Failed to start server:", err);
  process.exit(1);
});
