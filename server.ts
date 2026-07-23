import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Ensure uploads directory exists
  const UPLOADS_DIR = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }

  // Setup multer storage
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
      const originalName = file.originalname;
      const ext = path.extname(originalName);
      const base = path.basename(originalName, ext);
      
      // If file already exists, append a unique timestamp to prevent collision
      const targetPath = path.join(UPLOADS_DIR, originalName);
      if (fs.existsSync(targetPath)) {
        cb(null, `${base}-${Date.now()}${ext}`);
      } else {
        cb(null, originalName);
      }
    }
  });

  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB file size limit
  });

  // Parse JSON bodies
  app.use(express.json());

  // 1. API: List uploaded files
  app.get("/api/files", (req, res) => {
    try {
      const files = fs.readdirSync(UPLOADS_DIR);
      const fileList = files
        .filter(file => file !== ".gitkeep")
        .map(file => {
          const filePath = path.join(UPLOADS_DIR, file);
          const stat = fs.statSync(filePath);
          const ext = path.extname(file).toLowerCase();
          
          // Basic MIME-type mapping
          let type = "application/octet-stream";
          if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg"].includes(ext)) {
            type = "image/" + (ext === ".jpg" ? "jpeg" : ext.substring(1));
          } else if (ext === ".pdf") {
            type = "application/pdf";
          } else if ([".doc", ".docx"].includes(ext)) {
            type = "application/msword";
          } else if ([".xls", ".xlsx"].includes(ext)) {
            type = "application/vnd.ms-excel";
          } else if ([".ppt", ".pptx"].includes(ext)) {
            type = "application/vnd.ms-powerpoint";
          } else if ([".txt", ".md", ".json", ".csv"].includes(ext)) {
            type = "text/plain";
          } else if ([".zip", ".rar", ".tar", ".gz", ".7z"].includes(ext)) {
            type = "application/zip";
          } else if ([".mp3", ".wav", ".ogg", ".m4a"].includes(ext)) {
            type = "audio/mpeg";
          } else if ([".mp4", ".mov", ".avi", ".mkv", ".webm"].includes(ext)) {
            type = "video/mp4";
          }

          return {
            name: file,
            size: stat.size,
            type,
            uploadedAt: stat.birthtime,
            url: `/api/files/download/${encodeURIComponent(file)}`
          };
        });

      // Sort by uploaded time, newest first
      fileList.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());
      res.json(fileList);
    } catch (error) {
      console.error("Failed to list files:", error);
      res.status(500).json({ error: "Failed to list files" });
    }
  });

  // 2. API: Upload a file
  app.post("/api/upload", upload.single("file"), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded or file exceeds size limit" });
    }
    res.json({
      message: "File uploaded successfully",
      file: {
        name: req.file.filename,
        size: req.file.size,
        url: `/api/files/download/${encodeURIComponent(req.file.filename)}`
      }
    });
  });

  // 3. API: Download / View file
  app.get("/api/files/download/:name", (req, res) => {
    const fileName = req.params.name;
    const filePath = path.join(UPLOADS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).send("File not found");
    }

    const ext = path.extname(fileName).toLowerCase();
    // Certain safe files can be viewed inline, others downloaded directly
    const inlineTypes = [".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".txt", ".svg", ".mp3", ".mp4", ".webm"];
    if (inlineTypes.includes(ext)) {
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
    } else {
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
    }

    res.sendFile(filePath);
  });

  // 4. API: Delete file
  app.delete("/api/files/:name", (req, res) => {
    const fileName = req.params.name;
    const filePath = path.join(UPLOADS_DIR, fileName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }

    try {
      fs.unlinkSync(filePath);
      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Failed to delete file:", error);
      res.status(500).json({ error: "Failed to delete file" });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
