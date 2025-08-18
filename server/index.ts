import "dotenv/config";
import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import multer from "multer";
import { handleDemo } from "./routes/demo";
import { handleHealthCheck, handleSigningCapabilities } from "./routes/health";
import {
  handleFileUpload,
  handleMultipleFileUpload,
  handleFileDownload,
  handleFileInfo,
  handleFileDelete,
  uploadSingle,
  uploadMultiple,
} from "./routes/files";
import {
  handleSigningSubmission,
  handleSigningProgress,
  handleSigningCancel,
  handleManifestDownload,
  uploadSigningFiles,
  checkZsignInstallation,
} from "./routes/signing";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Serve static files for downloads
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // Serve signed IPAs with proper content type
  app.get("/uploads/jobs/:jobId/output/:filename", (req, res) => {
    const { jobId, filename } = req.params;
    const filePath = path.join(
      process.cwd(),
      "uploads",
      "jobs",
      jobId,
      "output",
      filename,
    );

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: "File not found" });
    }

    // Set proper content type for IPA files
    if (filename.endsWith(".ipa")) {
      res.set("Content-Type", "application/octet-stream");
      res.set("Content-Disposition", `attachment; filename="${filename}"`);
    }

    res.sendFile(filePath);
  });

  // Health check routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.get("/api/health", handleHealthCheck);
  app.get("/api/capabilities", handleSigningCapabilities);

  // File management routes
  app.post("/api/files/upload", uploadSingle, handleFileUpload);
  app.post(
    "/api/files/upload-multiple",
    uploadMultiple,
    handleMultipleFileUpload,
  );
  app.get("/api/files/:fileId", handleFileInfo);
  app.get("/api/files/:fileId/download", handleFileDownload);
  app.delete("/api/files/:fileId", handleFileDelete);

  // IPA signing routes
  app.post("/api/sign", uploadSigningFiles, handleSigningSubmission);
  app.get("/api/sign/progress/:jobId", handleSigningProgress);
  app.delete("/api/sign/:jobId", handleSigningCancel);
  app.get("/api/manifest/:jobId", handleManifestDownload);

  // Error handling middleware
  app.use(
    (
      error: any,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction,
    ) => {
      console.error("Server error:", error);

      if (error && error.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: "File too large. Maximum size is 500MB.",
        });
      }

      if (
        error &&
        error.message &&
        error.message.includes("File type not allowed")
      ) {
        return res.status(400).json({
          success: false,
          error: error.message,
        });
      }

      res.status(500).json({
        success: false,
        error: "Internal server error",
      });
    },
  );

  return app;
}
