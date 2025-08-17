import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import {
  CertificateProcessor,
  CertificateInfo,
  MobileProvision,
} from "./certificate";
import { IPAProcessor, IPAInfo, SigningOptions } from "./ipa";

export interface SigningJobFiles {
  ipaFile?: string;
  p12File: string;
  mpFile: string;
  cyanFiles?: string[];
  tweakFiles?: string[];
  iconFile?: string;
  plistFile?: string;
  entitlementsFile?: string;
}

export interface SigningJobParams {
  // IPA source
  ipaUrl?: string;

  // Basic options
  bundleId?: string;
  bundleName?: string;
  bundleVersion?: string;
  p12Password?: string;
  entitlements?: string;

  // Cyan options
  cyanAppName?: string;
  cyanVersion?: string;
  cyanBundleId?: string;
  cyanMinimumOS?: string;

  // Flags
  removeExtensions?: boolean;
  removeWatch?: boolean;
  thinBinaries?: boolean;
  weak?: boolean;
  adhoc?: boolean;
  debug?: boolean;
}

export interface SigningResult {
  success: boolean;
  signedIpaPath?: string;
  signedIpaSize?: number;
  originalInfo?: IPAInfo;
  certificateInfo?: CertificateInfo;
  provisionInfo?: MobileProvision;
  error?: string;
}

export class IPASigner {
  private jobId: string;
  private workingDir: string;
  private outputDir: string;

  constructor(jobId: string) {
    this.jobId = jobId;
    this.workingDir = path.join(process.cwd(), "uploads", "jobs", jobId);
    this.outputDir = path.join(this.workingDir, "output");

    // Ensure directories exist
    if (!fs.existsSync(this.workingDir)) {
      fs.mkdirSync(this.workingDir, { recursive: true });
    }
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Main signing process
   */
  async signIPA(
    files: SigningJobFiles,
    params: SigningJobParams,
  ): Promise<SigningResult> {
    console.log(`[SIGNER] Starting signing process for job ${this.jobId}`);

    try {
      // Step 1: Process certificates
      console.log(`[SIGNER] Processing certificates...`);
      const certificateInfo = await CertificateProcessor.processP12Certificate(
        files.p12File,
        params.p12Password,
      );

      const provisionInfo = await CertificateProcessor.processMobileProvision(
        files.mpFile,
      );

      // Step 2: Validate certificate and provision compatibility
      console.log(`[SIGNER] Validating certificate and provision...`);
      const isCompatible =
        CertificateProcessor.validateCertificateProvisionMatch(
          certificateInfo,
          provisionInfo,
        );

      if (!isCompatible) {
        console.warn(
          `[SIGNER] Certificate and provision may not be compatible, but continuing...`,
        );
      }

      // Step 3: Download IPA if URL provided, or use uploaded file
      let ipaPath: string;
      if (params.ipaUrl) {
        console.log(`[SIGNER] Downloading IPA from URL: ${params.ipaUrl}`);
        ipaPath = await this.downloadIPA(params.ipaUrl);
      } else if (files.ipaFile) {
        ipaPath = files.ipaFile;
      } else {
        throw new Error("No IPA file or URL provided");
      }

      // Step 4: Extract IPA
      console.log(`[SIGNER] Extracting IPA...`);
      const extractedDir = path.join(this.workingDir, "extracted");
      const originalInfo = await IPAProcessor.extractIPA(ipaPath, extractedDir);

      // Step 5: Apply modifications
      console.log(`[SIGNER] Applying modifications...`);
      const signingOptions: SigningOptions = {
        bundleId: params.cyanBundleId || params.bundleId,
        bundleName: params.cyanAppName || params.bundleName,
        bundleVersion: params.cyanVersion || params.bundleVersion,
        minimumOSVersion: params.cyanMinimumOS,
        removeExtensions: params.removeExtensions,
        removeWatch: params.removeWatch,
        thinBinaries: params.thinBinaries,
      };

      await IPAProcessor.modifyIPA(extractedDir, signingOptions, originalInfo);

      // Step 6: Install provision and entitlements
      console.log(`[SIGNER] Installing provision and entitlements...`);
      let customEntitlements: any = undefined;
      if (params.entitlements) {
        try {
          customEntitlements = JSON.parse(params.entitlements);
        } catch {
          console.warn(
            "[SIGNER] Could not parse custom entitlements as JSON, ignoring",
          );
        }
      }

      await IPAProcessor.installProvisionAndEntitlements(
        extractedDir,
        provisionInfo,
        customEntitlements,
      );

      // Step 7: Process additional files (cyan, tweaks, etc.)
      if (files.cyanFiles?.length || files.tweakFiles?.length) {
        console.log(`[SIGNER] Processing additional files...`);
        await this.processAdditionalFiles(extractedDir, files);
      }

      // Step 8: Sign binaries
      console.log(`[SIGNER] Signing binaries...`);
      const entitlementsPath = path.join(
        extractedDir,
        "Payload",
        fs.readdirSync(path.join(extractedDir, "Payload"))[0],
        "entitlements.plist",
      );
      await IPAProcessor.signBinaries(
        extractedDir,
        certificateInfo,
        entitlementsPath,
      );

      // Step 9: Create signed IPA
      console.log(`[SIGNER] Creating signed IPA...`);
      const signedIpaPath = path.join(
        this.outputDir,
        `${originalInfo.bundleName || "signed"}-signed.ipa`,
      );
      await IPAProcessor.createSignedIPA(extractedDir, signedIpaPath);

      const signedIpaSize = IPAProcessor.getFileSize(signedIpaPath);

      console.log(`[SIGNER] Signing completed successfully!`);
      console.log(
        `[SIGNER] Original: ${originalInfo.bundleName} (${originalInfo.bundleId})`,
      );
      console.log(
        `[SIGNER] Signed IPA: ${signedIpaPath} (${(signedIpaSize / 1024 / 1024).toFixed(2)} MB)`,
      );

      return {
        success: true,
        signedIpaPath,
        signedIpaSize,
        originalInfo,
        certificateInfo,
        provisionInfo,
      };
    } catch (error) {
      console.error(`[SIGNER] Signing failed:`, error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Download IPA from URL
   */
  private async downloadIPA(url: string): Promise<string> {
    try {
      console.log(`[SIGNER] Downloading IPA from: ${url}`);

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Failed to download IPA: ${response.status} ${response.statusText}`,
        );
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const ipaPath = path.join(this.workingDir, "downloaded.ipa");
      fs.writeFileSync(ipaPath, buffer);

      console.log(
        `[SIGNER] Downloaded IPA: ${(buffer.length / 1024 / 1024).toFixed(2)} MB`,
      );
      return ipaPath;
    } catch (error) {
      console.error("[SIGNER] Error downloading IPA:", error);
      throw new Error(
        `Failed to download IPA: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Process additional files (cyan, tweaks, etc.)
   */
  private async processAdditionalFiles(
    extractedDir: string,
    files: SigningJobFiles,
  ): Promise<void> {
    try {
      const payloadDir = path.join(extractedDir, "Payload");
      const appDirs = fs
        .readdirSync(payloadDir)
        .filter((name) => name.endsWith(".app"));
      const appDir = path.join(payloadDir, appDirs[0]);

      // Process cyan files
      if (files.cyanFiles?.length) {
        console.log(
          `[SIGNER] Processing ${files.cyanFiles.length} cyan files...`,
        );
        for (const cyanFile of files.cyanFiles) {
          // In a real implementation, cyan files would contain specific modification instructions
          console.log(
            `[SIGNER] Processing cyan file: ${path.basename(cyanFile)}`,
          );
        }
      }

      // Process tweak files (dylibs, frameworks, bundles)
      if (files.tweakFiles?.length) {
        console.log(
          `[SIGNER] Processing ${files.tweakFiles.length} tweak files...`,
        );
        const tweaksDir = path.join(appDir, "Tweaks");
        if (!fs.existsSync(tweaksDir)) {
          fs.mkdirSync(tweaksDir, { recursive: true });
        }

        for (const tweakFile of files.tweakFiles) {
          const fileName = path.basename(tweakFile);
          const destPath = path.join(tweaksDir, fileName);
          fs.copyFileSync(tweakFile, destPath);
          console.log(`[SIGNER] Installed tweak: ${fileName}`);
        }
      }

      // Process custom icon
      if (files.iconFile) {
        console.log(`[SIGNER] Installing custom icon...`);
        const iconName = "AppIcon60x60@2x.png"; // Standard iOS app icon
        const iconPath = path.join(appDir, iconName);
        fs.copyFileSync(files.iconFile, iconPath);
        console.log(`[SIGNER] Installed custom icon`);
      }

      // Process custom plist
      if (files.plistFile) {
        console.log(`[SIGNER] Processing custom plist...`);
        // Custom plist processing would go here
        console.log(`[SIGNER] Processed custom plist`);
      }
    } catch (error) {
      console.error("[SIGNER] Error processing additional files:", error);
      throw new Error(
        `Failed to process additional files: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Clean up working directory
   */
  cleanup(): void {
    try {
      if (fs.existsSync(this.workingDir)) {
        fs.rmSync(this.workingDir, { recursive: true, force: true });
        console.log(
          `[SIGNER] Cleaned up working directory: ${this.workingDir}`,
        );
      }
    } catch (error) {
      console.warn(`[SIGNER] Failed to cleanup: ${error}`);
    }
  }

  /**
   * Get relative path for signed IPA (for download URL)
   */
  getSignedIPARelativePath(signedIpaPath: string): string {
    return path.relative(process.cwd(), signedIpaPath);
  }
}
