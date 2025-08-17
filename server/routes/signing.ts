import { RequestHandler } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";
import { spawn, exec } from "child_process";
import { promisify } from "util";
import {
  SigningRequest,
  SigningResponse,
  SigningProgress,
  SigningResult,
} from "@shared/api";
import { IPASigner, SigningJobFiles, SigningJobParams } from "../utils/signer";

const execAsync = promisify(exec);

// Configure multer for signing uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const jobId = req.body.jobId || uuidv4();
    const jobDir = path.join(process.cwd(), "uploads", "jobs", jobId);
    if (!fs.existsSync(jobDir)) {
      fs.mkdirSync(jobDir, { recursive: true });
    }
    // Store jobId for later use
    req.body.jobId = jobId;
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
    const jobId = req.body.jobId || uuidv4();
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
  const jobDir = path.join(process.cwd(), "uploads", "jobs", jobId);

  try {
    // Initialize progress
    progress.status = "processing";
<<<<<<< HEAD
    progress.progress = 10;
    progress.message = "Checking zsign installation...";

    // Check if zsign is available
    try {
      await execAsync("zsign --help");
    } catch (error) {
      throw new Error("zsign not found. Please install zsign first.");
    }

    progress.progress = 20;
    progress.message = "Preparing files...";

    // Get file paths
    const ipaPath = files.ipa ? files.ipa[0].path : null;
    const p12Path = files.p12[0].path;
    const mpPath = files.mp[0].path;

    // Handle IPA URL download if needed
    let actualIpaPath = ipaPath;
    if (!ipaPath && params.ipaurl) {
      progress.message = "Downloading IPA from URL...";
      actualIpaPath = await downloadFile(
        params.ipaurl,
        path.join(jobDir, "downloaded.ipa"),
      );
    }

    if (!actualIpaPath) {
      throw new Error("No IPA file provided");
    }

    progress.progress = 30;
    progress.message = "Validating certificate...";

    // Prepare zsign command
    const outputPath = path.join(jobDir, "signed.ipa");
    const zsignArgs = ["-k", p12Path, "-m", mpPath, "-o", outputPath];

    // Add password if provided
    if (params.pass) {
      zsignArgs.push("-p", params.pass);
    }

    // Add bundle ID if provided
    if (params.bundleId || params.cyanBundleId) {
      zsignArgs.push("-b", params.bundleId || params.cyanBundleId);
    }

    // Add app name if provided
    if (params.bundleName || params.cyanAppName) {
      zsignArgs.push("-n", params.bundleName || params.cyanAppName);
    }

    // Add version if provided
    if (params.bundleVersion || params.cyanVersion) {
      zsignArgs.push("-v", params.bundleVersion || params.cyanVersion);
    }

    // Add signing options
    if (params.weak) {
      zsignArgs.push("--weak");
    }
    if (params.debug) {
      zsignArgs.push("--debug");
    }
    if (params.force) {
      zsignArgs.push("--force");
    }

    // Add dylib files if provided
    if (files.tweakFiles && files.tweakFiles.length > 0) {
      for (const tweakFile of files.tweakFiles) {
        zsignArgs.push("-d", tweakFile.path);
      }
    }

    // Add custom entitlements if provided
    if (files.entitlementsFile && files.entitlementsFile[0]) {
      zsignArgs.push("-e", files.entitlementsFile[0].path);
    }

    // Add icon if provided
    if (files.iconFile && files.iconFile[0]) {
      zsignArgs.push("-i", files.iconFile[0].path);
    }

    // Add the input IPA as the last argument
    zsignArgs.push(actualIpaPath);

    progress.progress = 50;
    progress.message = "Starting signing process with zsign...";

    // Execute zsign
    await executeZsign(zsignArgs, progress);

    progress.progress = 90;
    progress.message = "Finalizing signed IPA...";

    // Verify output file exists
    if (!fs.existsSync(outputPath)) {
      throw new Error("Signed IPA was not created");
    }

    // Get file size
    const stats = fs.statSync(outputPath);
    const fileSize = stats.size;

    // Generate result
    const result: SigningResult = {
      signedIpaUrl: `/uploads/jobs/${jobId}/signed.ipa`,
      installLink: `itms-services://?action=download-manifest&url=${process.env.BASE_URL || `${process.env.NODE_ENV === "production" ? "https" : "http"}://localhost:8080`}/api/manifest/${jobId}`,
=======
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
>>>>>>> refs/remotes/origin/main
      metadata: {
        bundleName:
          signingResult.originalInfo?.bundleName ||
          params.cyanAppName ||
          params.bundleName ||
          "Signed App",
        bundleId:
<<<<<<< HEAD
          params.bundleId || params.cyanBundleId || "com.example.signedapp",
        bundleVersion: params.bundleVersion || params.cyanVersion || "1.0.0",
        fileSize,
=======
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
>>>>>>> refs/remotes/origin/main
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

async function executeZsign(
  args: string[],
  progress: SigningProgress,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const zsignProcess = spawn("zsign", args);
    let stdout = "";
    let stderr = "";

    zsignProcess.stdout.on("data", (data) => {
      stdout += data.toString();
      console.log("zsign stdout:", data.toString());

      // Update progress based on zsign output
      const output = data.toString();
      if (output.includes("Parsing")) {
        progress.progress = 55;
        progress.message = "Parsing IPA structure...";
      } else if (output.includes("Signing")) {
        progress.progress = 70;
        progress.message = "Signing application...";
      } else if (output.includes("Packing")) {
        progress.progress = 85;
        progress.message = "Packing signed IPA...";
      }
    });

    zsignProcess.stderr.on("data", (data) => {
      stderr += data.toString();
      console.error("zsign stderr:", data.toString());
    });

    zsignProcess.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(`zsign failed with code ${code}: ${stderr || stdout}`),
        );
      }
    });

    zsignProcess.on("error", (error) => {
      reject(new Error(`Failed to start zsign: ${error.message}`));
    });
  });
}

async function downloadFile(url: string, outputPath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const https = require("https");
    const http = require("http");

    const protocol = url.startsWith("https:") ? https : http;
    const file = fs.createWriteStream(outputPath);

    protocol
      .get(url, (response: any) => {
        if (response.statusCode !== 200) {
          reject(new Error(`Failed to download file: ${response.statusCode}`));
          return;
        }

        response.pipe(file);

        file.on("finish", () => {
          file.close();
          resolve(outputPath);
        });

        file.on("error", (error: Error) => {
          fs.unlink(outputPath, () => {}); // Delete the file on error
          reject(error);
        });
      })
      .on("error", (error: Error) => {
        reject(error);
      });
  });
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

<<<<<<< HEAD
  const baseUrl =
    process.env.BASE_URL || `${req.protocol}://${req.get("host")}`;
=======
  const baseUrl = process.env.BASE_URL || "http://localhost:8080";
  const ipaUrl = `${baseUrl}${progress.result.signedIpaUrl}`;
>>>>>>> refs/remotes/origin/main

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
<<<<<<< HEAD
          <string>${baseUrl}${progress.result.signedIpaUrl}</string>
=======
          <string>${ipaUrl}</string>
>>>>>>> refs/remotes/origin/main
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

// Helper function to check if zsign is installed
export const checkZsignInstallation: RequestHandler = async (req, res) => {
  try {
    const { stdout } = await execAsync("zsign --version");
    res.json({
      success: true,
      installed: true,
      version: stdout.trim(),
    });
  } catch (error) {
    res.json({
      success: true,
      installed: false,
      error: "zsign not found",
    });
  }
};
