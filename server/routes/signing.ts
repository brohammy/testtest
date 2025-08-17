import { RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import {
  SigningRequest,
  SigningResponse,
  SigningProgress,
  SigningResult,
} from "@shared/api";
import { IPASigner, SigningJobFiles, SigningJobParams } from "../utils/signer";

// Configure multer for signing uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const jobDir = path.join(
      process.cwd(),
      "uploads",
      "jobs",
      req.body.jobId || uuidv4(),
    );
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }
    cb(null, jobDir);
  },
  filename: (req, file, cb) => {
    // Keep original names for easier processing
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
});

// In-memory job store (in production, use a database)
const jobStore = new Map<string, SigningProgress>();

export const uploadSigningFiles = upload.fields([
  { name: "ipa", maxCount: 1 },
  { name: "p12", maxCount: 1 },
  { name: "mp", maxCount: 1 },
  { name: "cyanFiles", maxCount: 10 },
  { name: "tweakFiles", maxCount: 10 },
  { name: "iconFile", maxCount: 1 },
  { name: "plistFile", maxCount: 1 },
  { name: "entitlementsFile", maxCount: 1 },
]);

export const handleSigningSubmission: RequestHandler = async (req, res) => {
  try {
    const jobId = uuidv4();
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };

    console.log(`[SIGNING] New job submitted: ${jobId}`);
    console.log(`[SIGNING] Files received:`, Object.keys(files || {}));

    // Validate required files
    if (!files.p12 || !files.mp) {
      console.log(`[SIGNING] Missing required files for job ${jobId}`);
      return res.status(400).json({
        success: false,
        error: "P12 certificate and mobile provision files are required",
      });
    }

    // Check IPA source
    if (!files.ipa && !req.body.ipaurl) {
      console.log(`[SIGNING] No IPA source provided for job ${jobId}`);
      return res.status(400).json({
        success: false,
        error: "IPA file or URL is required",
      });
    }

    // Create job progress entry
    const progress: SigningProgress = {
      jobId,
      status: "pending",
      progress: 0,
      message: "Job submitted successfully",
    };

    jobStore.set(jobId, progress);
    console.log(`[SIGNING] Job ${jobId} created and stored`);

    // Start processing in background
    processSigningJob(jobId, files, req.body);

    const response: SigningResponse = {
      success: true,
      jobId,
      message: "Signing job submitted successfully",
    };

    res.json(response);
  } catch (error) {
    console.error("Signing submission error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to submit signing job",
    });
  }
};

export const handleSigningProgress: RequestHandler = (req, res) => {
  const { jobId } = req.params;
  const progress = jobStore.get(jobId);

  console.log(`[SIGNING] Progress check for job ${jobId}:`, progress?.status, progress?.progress);

  if (!progress) {
    console.log(`[SIGNING] Job ${jobId} not found in store`);
    return res.status(404).json({
      success: false,
      error: "Job not found",
    });
  }

  res.json(progress);
};

export const handleSigningCancel: RequestHandler = (req, res) => {
  const { jobId } = req.params;
  const progress = jobStore.get(jobId);

  if (!progress) {
    return res.status(404).json({
      success: false,
      error: "Job not found",
    });
  }

  if (progress.status === "completed" || progress.status === "failed") {
    return res.status(400).json({
      success: false,
      error: "Cannot cancel completed or failed job",
    });
  }

  progress.status = "failed";
  progress.message = "Job cancelled by user";
  progress.error = "Cancelled";

  res.json({
    success: true,
    message: "Job cancelled successfully",
  });
};

async function processSigningJob(
  jobId: string,
  files: { [fieldname: string]: Express.Multer.File[] },
  params: any,
) {
  console.log(`[SIGNING] Starting processing for job ${jobId}`);
  const progress = jobStore.get(jobId)!;

  try {
    // Update progress
    progress.status = "processing";
    progress.progress = 10;
    progress.message = "Validating files...";
    jobStore.set(jobId, progress);
    console.log(`[SIGNING] Job ${jobId} progress: 10%`);

    // Simulate file validation (faster for better UX)
    await sleep(500);

    progress.progress = 30;
    progress.message = "Extracting IPA contents...";
    jobStore.set(jobId, progress);
    await sleep(600);

    progress.progress = 50;
    progress.message = "Processing certificates...";
    jobStore.set(jobId, progress);
    await sleep(500);

    progress.progress = 70;
    progress.message = "Applying modifications...";
    jobStore.set(jobId, progress);
    await sleep(600);

    progress.progress = 90;
    progress.message = "Signing IPA...";
    jobStore.set(jobId, progress);
    await sleep(800);

    // Generate mock result
    const result: SigningResult = {
      signedIpaUrl: `/api/files/download/signed-${jobId}.ipa`,
      installLink: `itms-services://?action=download-manifest&url=${process.env.BASE_URL || "http://localhost:8080"}/api/manifest/${jobId}`,
      metadata: {
        bundleName: params.bundleName || params.cyanAppName || "Signed App",
        bundleId:
          params.bundleId || params.cyanBundleId || "com.example.signedapp",
        bundleVersion: params.bundleVersion || params.cyanVersion || "1.0.0",
        fileSize: Math.floor(Math.random() * 100000000) + 50000000, // 50-150MB
        signedAt: new Date().toISOString(),
      },
    };

    progress.status = "completed";
    progress.progress = 100;
    progress.message = "Signing completed successfully";
    progress.result = result;
    jobStore.set(jobId, progress);
  } catch (error) {
    console.error("Signing process error:", error);
    progress.status = "failed";
    progress.error =
      error instanceof Error ? error.message : "Unknown error occurred";
    progress.message = "Signing failed";
    jobStore.set(jobId, progress);
  }
}

export const handleManifestDownload: RequestHandler = (req, res) => {
  const { jobId } = req.params;
  const progress = jobStore.get(jobId);

  if (!progress || !progress.result) {
    return res.status(404).json({
      success: false,
      error: "Signed app not found",
    });
  }

  const manifest = {
    items: [
      {
        assets: [
          {
            kind: "software-package",
            url: `${process.env.BASE_URL || "http://localhost:8080"}${progress.result.signedIpaUrl}`,
          },
        ],
        metadata: {
          "bundle-identifier": progress.result.metadata.bundleId,
          "bundle-version": progress.result.metadata.bundleVersion,
          kind: "software",
          title: progress.result.metadata.bundleName,
        },
      },
    ],
  };

  res.set("Content-Type", "application/xml");
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>items</key>
  <array>
    <dict>
      <key>assets</key>
      <array>
        <dict>
          <key>kind</key>
          <string>software-package</string>
          <key>url</key>
          <string>${process.env.BASE_URL || "http://localhost:8080"}${progress.result.signedIpaUrl}</string>
        </dict>
      </array>
      <key>metadata</key>
      <dict>
        <key>bundle-identifier</key>
        <string>${progress.result.metadata.bundleId}</string>
        <key>bundle-version</key>
        <string>${progress.result.metadata.bundleVersion}</string>
        <key>kind</key>
        <string>software</string>
        <key>title</key>
        <string>${progress.result.metadata.bundleName}</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`);
};

// Helper function for simulating async operations
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
