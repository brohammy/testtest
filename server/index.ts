import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import { handleDemo } from "./routes/demo";
import { 
  handleFileUpload, 
  handleMultipleFileUpload, 
  handleFileDownload, 
  handleFileInfo, 
  handleFileDelete,
  uploadSingle,
  uploadMultiple 
} from "./routes/files";
import {
  handleSigningSubmission,
  handleSigningProgress,
  handleSigningCancel,
  handleManifestDownload,
  uploadSigningFiles
} from "./routes/signing";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Serve static files for downloads
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Health check routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // File management routes
  app.post("/api/files/upload", uploadSingle, handleFileUpload);
  app.post("/api/files/upload-multiple", uploadMultiple, handleMultipleFileUpload);
  app.get("/api/files/:fileId", handleFileInfo);
  app.get("/api/files/:fileId/download", handleFileDownload);
  app.delete("/api/files/:fileId", handleFileDelete);

  // IPA signing routes
  app.post("/api/sign", uploadSigningFiles, handleSigningSubmission);
  app.get("/api/sign/progress/:jobId", handleSigningProgress);
  app.delete("/api/sign/:jobId", handleSigningCancel);
  app.get("/api/manifest/:jobId", handleManifestDownload);

  // Error handling middleware
  app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', error);
    
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          success: false,
          error: 'File too large. Maximum size is 500MB.'
        });
      }
      return res.status(400).json({
        success: false,
        error: `Upload error: ${error.message}`
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  });

  return app;
}
