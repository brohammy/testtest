import { RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { FileUploadResponse, StoredFile } from "@shared/api";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types for IPA signing
    const allowedTypes = [
      "application/octet-stream", // .ipa, .p12, .mobileprovision
      "application/x-ios-app", // .ipa
      "application/x-pkcs12", // .p12
      "application/x-apple-mobileprovision", // .mobileprovision
      "text/xml", // .plist, entitlements
      "application/xml", // .plist, entitlements
      "image/png", // icons
      "image/jpeg", // icons
      "image/jpg", // icons
      "text/plain", // .cyan files
      "application/zip", // general archives
    ];

    const allowedExtensions = [
      ".ipa",
      ".p12",
      ".pfx",
      ".mobileprovision",
      ".provisionprofile",
      ".plist",
      ".entitlements",
      ".png",
      ".jpg",
      ".jpeg",
      ".cyan",
      ".dylib",
      ".framework",
      ".bundle",
    ];

    const fileExt = path.extname(file.originalname).toLowerCase();

    if (
      allowedTypes.includes(file.mimetype) ||
      allowedExtensions.includes(fileExt)
    ) {
      cb(null, true);
    } else {
      cb(new Error(`File type not allowed: ${file.mimetype} (${fileExt})`));
    }
  },
});

// In-memory storage for file metadata (in production, use a database)
const fileStore = new Map<string, StoredFile>();

export const uploadSingle = upload.single("file");
export const uploadMultiple = upload.array("files", 10);

export const handleFileUpload: RequestHandler = (req, res) => {
  const file = req.file;

  if (!file) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded",
    });
  }

  const fileId = uuidv4();
  const storedFile: StoredFile = {
    id: fileId,
    filename: file.filename,
    originalName: file.originalname,
    size: file.size,
    mimetype: file.mimetype,
    uploadedAt: new Date().toISOString(),
    path: file.path,
  };

  fileStore.set(fileId, storedFile);

  const response: FileUploadResponse = {
    success: true,
    fileId,
    filename: file.originalname,
    size: file.size,
    uploadedAt: storedFile.uploadedAt,
  };

  res.json(response);
};

export const handleMultipleFileUpload: RequestHandler = (req, res) => {
  const files = req.files as Express.Multer.File[];

  if (!files || files.length === 0) {
    return res.status(400).json({
      success: false,
      error: "No files uploaded",
    });
  }

  const uploadedFiles: FileUploadResponse[] = [];

  for (const file of files) {
    const fileId = uuidv4();
    const storedFile: StoredFile = {
      id: fileId,
      filename: file.filename,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date().toISOString(),
      path: file.path,
    };

    fileStore.set(fileId, storedFile);

    uploadedFiles.push({
      success: true,
      fileId,
      filename: file.originalname,
      size: file.size,
      uploadedAt: storedFile.uploadedAt,
    });
  }

  res.json({
    success: true,
    files: uploadedFiles,
  });
};

export const handleFileDownload: RequestHandler = (req, res) => {
  const { fileId } = req.params;
  const file = fileStore.get(fileId);

  if (!file || !fs.existsSync(file.path)) {
    return res.status(404).json({
      success: false,
      error: "File not found",
    });
  }

  res.download(file.path, file.originalName);
};

export const handleFileInfo: RequestHandler = (req, res) => {
  const { fileId } = req.params;
  const file = fileStore.get(fileId);

  if (!file) {
    return res.status(404).json({
      success: false,
      error: "File not found",
    });
  }

  res.json({
    success: true,
    file: {
      id: file.id,
      filename: file.originalName,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: file.uploadedAt,
    },
  });
};

export const handleFileDelete: RequestHandler = (req, res) => {
  const { fileId } = req.params;
  const file = fileStore.get(fileId);

  if (!file) {
    return res.status(404).json({
      success: false,
      error: "File not found",
    });
  }

  // Delete file from disk
  try {
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
  } catch (error) {
    console.warn("Failed to delete file from disk:", error);
  }

  // Remove from store
  fileStore.delete(fileId);

  res.json({
    success: true,
    message: "File deleted successfully",
  });
};

// Helper function to get file by ID (for internal use)
export const getFileById = (fileId: string): StoredFile | undefined => {
  return fileStore.get(fileId);
};
