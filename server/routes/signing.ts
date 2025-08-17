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

  console.log(
    `[SIGNING] Progress check for job ${jobId}:`,
    progress?.status,
    progress?.progress,
  );

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
  console.log(`[SIGNING] Starting real signing process for job ${jobId}`);
  const progress = jobStore.get(jobId)!;

  try {
    // Initialize progress
    progress.status = "processing";
    progress.progress = 5;
    progress.message = "Initializing signing process...";
    jobStore.set(jobId, progress);

    // Create signer instance
    const signer = new IPASigner(jobId);

    // Prepare file paths for signing
    const signingFiles: SigningJobFiles = {
      p12File: files.p12[0].path,
      mpFile: files.mp[0].path,
    };

    // Add IPA file if uploaded
    if (files.ipa && files.ipa[0]) {
      signingFiles.ipaFile = files.ipa[0].path;
    }

    // Add optional files
    if (files.cyanFiles) {
      signingFiles.cyanFiles = files.cyanFiles.map((f) => f.path);
    }
    if (files.tweakFiles) {
      signingFiles.tweakFiles = files.tweakFiles.map((f) => f.path);
    }
    if (files.iconFile && files.iconFile[0]) {
      signingFiles.iconFile = files.iconFile[0].path;
    }
    if (files.plistFile && files.plistFile[0]) {
      signingFiles.plistFile = files.plistFile[0].path;
    }
    if (files.entitlementsFile && files.entitlementsFile[0]) {
      signingFiles.entitlementsFile = files.entitlementsFile[0].path;
    }

    // Prepare signing parameters
    const signingParams: SigningJobParams = {
      ipaUrl: params.ipaurl,
      bundleId: params.bundleId,
      bundleName: params.bundleName,
      bundleVersion: params.bundleVersion,
      p12Password: params.pass,
      entitlements: params.entitlements,
      cyanAppName: params.cyanAppName,
      cyanVersion: params.cyanVersion,
      cyanBundleId: params.cyanBundleId,
      cyanMinimumOS: params.cyanMinimumOS,
      removeExtensions: params.removeExtensions === "true",
      removeWatch: params.removeWatch === "true",
      thinBinaries: params.thinBinaries === "true",
      weak: params.weak === "true",
      adhoc: params.adhoc === "true",
      debug: params.debug === "true",
    };

    // Update progress - processing certificates
    progress.progress = 15;
    progress.message = "Processing certificates...";
    jobStore.set(jobId, progress);

    // Update progress - extracting IPA
    progress.progress = 35;
    progress.message = "Extracting IPA contents...";
    jobStore.set(jobId, progress);

    // Update progress - applying modifications
    progress.progress = 55;
    progress.message = "Applying modifications...";
    jobStore.set(jobId, progress);

    // Update progress - signing binaries
    progress.progress = 75;
    progress.message = "Signing binaries...";
    jobStore.set(jobId, progress);

    // Perform the actual signing
    const signingResult = await signer.signIPA(signingFiles, signingParams);

    if (!signingResult.success) {
      throw new Error(signingResult.error || "Signing failed");
    }

    // Update progress - finalizing
    progress.progress = 95;
    progress.message = "Finalizing signed IPA...";
    jobStore.set(jobId, progress);

    // Create download URLs
    const signedIpaRelativePath = signer.getSignedIPARelativePath(
      signingResult.signedIpaPath!,
    );
    const downloadUrl = `/uploads/jobs/${jobId}/output/${path.basename(signingResult.signedIpaPath!)}`;

    const result: SigningResult = {
      signedIpaUrl: downloadUrl,
      installLink: `itms-services://?action=download-manifest&url=${process.env.BASE_URL || "http://localhost:8080"}/api/manifest/${jobId}`,
      metadata: {
        bundleName:
          signingResult.originalInfo?.bundleName ||
          params.cyanAppName ||
          params.bundleName ||
          "Signed App",
        bundleId:
          signingResult.originalInfo?.bundleId ||
          params.cyanBundleId ||
          params.bundleId ||
          "com.example.signedapp",
        bundleVersion:
          signingResult.originalInfo?.bundleVersion ||
          params.cyanVersion ||
          params.bundleVersion ||
          "1.0.0",
        fileSize: signingResult.signedIpaSize || 0,
        signedAt: new Date().toISOString(),
      },
    };

    progress.status = "completed";
    progress.progress = 100;
    progress.message = "Signing completed successfully";
    progress.result = result;
    jobStore.set(jobId, progress);

    console.log(`[SIGNING] Job ${jobId} completed successfully`);
    console.log(`[SIGNING] Signed IPA: ${downloadUrl}`);
  } catch (error) {
    console.error(`[SIGNING] Job ${jobId} failed:`, error);
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

  console.log(`[MANIFEST] Generating manifest for job ${jobId}`);

  if (!progress || !progress.result) {
    console.log(`[MANIFEST] Job ${jobId} not found or no result`);
    return res.status(404).json({
      success: false,
      error: "Signed app not found",
    });
  }

  const baseUrl = process.env.BASE_URL || "http://localhost:8080";
  const ipaUrl = `${baseUrl}${progress.result.signedIpaUrl}`;

  console.log(`[MANIFEST] IPA URL: ${ipaUrl}`);
  console.log(
    `[MANIFEST] App: ${progress.result.metadata.bundleName} (${progress.result.metadata.bundleId})`,
  );

  // Generate iOS manifest plist for over-the-air installation
  const manifestPlist = `<?xml version="1.0" encoding="UTF-8"?>
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
          <string>${ipaUrl}</string>
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
        <key>subtitle</key>
        <string>Signed with Advanced IPA Signer</string>
      </dict>
    </dict>
  </array>
</dict>
</plist>`;

  res.set("Content-Type", "application/xml");
  res.set(
    "Content-Disposition",
    `attachment; filename="${progress.result.metadata.bundleName}-manifest.plist"`,
  );
  res.send(manifestPlist);
};

// Helper function for simulating async operations
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
