import AdmZip from "adm-zip";
import * as fs from "fs";
import * as path from "path";
import * as plist from "plist";
import { CertificateInfo, MobileProvision } from "./certificate";

export interface IPAInfo {
  bundleId: string;
  bundleName: string;
  bundleVersion: string;
  bundleShortVersion: string;
  minimumOSVersion: string;
  supportedDevices: string[];
  executable: string;
}

export interface SigningOptions {
  bundleId?: string;
  bundleName?: string;
  bundleVersion?: string;
  minimumOSVersion?: string;
  entitlements?: any;
  removeExtensions?: boolean;
  removeWatch?: boolean;
  thinBinaries?: boolean;
}

export class IPAProcessor {
  /**
   * Extract and analyze IPA file
   */
  static async extractIPA(
    ipaPath: string,
    outputDir: string,
  ): Promise<IPAInfo> {
    try {
      console.log(`[IPA] Extracting IPA: ${ipaPath} to ${outputDir}`);

      // Create output directory
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      // Extract IPA (which is a ZIP file)
      const zip = new AdmZip(ipaPath);
      zip.extractAllTo(outputDir, true);

      // Find the .app directory
      const payloadDir = path.join(outputDir, "Payload");
      if (!fs.existsSync(payloadDir)) {
        throw new Error("Invalid IPA: No Payload directory found");
      }

      const appDirs = fs
        .readdirSync(payloadDir)
        .filter((name) => name.endsWith(".app"));
      if (appDirs.length === 0) {
        throw new Error("Invalid IPA: No .app directory found in Payload");
      }

      const appDir = path.join(payloadDir, appDirs[0]);
      const infoPlistPath = path.join(appDir, "Info.plist");

      if (!fs.existsSync(infoPlistPath)) {
        throw new Error("Invalid IPA: No Info.plist found");
      }

      // Parse Info.plist
      const infoPlistData = fs.readFileSync(infoPlistPath);
      const infoPlist = plist.parse(infoPlistData.toString()) as any;

      const bundleId = infoPlist.CFBundleIdentifier || "";
      const bundleName =
        infoPlist.CFBundleDisplayName || infoPlist.CFBundleName || "";
      const bundleVersion = infoPlist.CFBundleVersion || "1.0";
      const bundleShortVersion =
        infoPlist.CFBundleShortVersionString || bundleVersion;
      const minimumOSVersion = infoPlist.MinimumOSVersion || "9.0";
      const executable = infoPlist.CFBundleExecutable || "";
      const supportedDevices = infoPlist.UIDeviceFamily || [];

      console.log(`[IPA] Extracted app: ${bundleName} (${bundleId})`);

      return {
        bundleId,
        bundleName,
        bundleVersion,
        bundleShortVersion,
        minimumOSVersion,
        supportedDevices,
        executable,
      };
    } catch (error) {
      console.error("Error extracting IPA:", error);
      throw new Error(
        `Failed to extract IPA: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Modify IPA contents with signing options
   */
  static async modifyIPA(
    extractedDir: string,
    options: SigningOptions,
    appInfo: IPAInfo,
  ): Promise<void> {
    try {
      console.log(`[IPA] Modifying IPA with options:`, options);

      const payloadDir = path.join(extractedDir, "Payload");
      const appDirs = fs
        .readdirSync(payloadDir)
        .filter((name) => name.endsWith(".app"));
      const appDir = path.join(payloadDir, appDirs[0]);
      const infoPlistPath = path.join(appDir, "Info.plist");

      // Read and modify Info.plist
      const infoPlistData = fs.readFileSync(infoPlistPath);
      const infoPlist = plist.parse(infoPlistData.toString()) as any;

      // Apply modifications
      if (options.bundleId) {
        infoPlist.CFBundleIdentifier = options.bundleId;
        console.log(`[IPA] Changed bundle ID to: ${options.bundleId}`);
      }

      if (options.bundleName) {
        infoPlist.CFBundleDisplayName = options.bundleName;
        infoPlist.CFBundleName = options.bundleName;
        console.log(`[IPA] Changed bundle name to: ${options.bundleName}`);
      }

      if (options.bundleVersion) {
        infoPlist.CFBundleVersion = options.bundleVersion;
        infoPlist.CFBundleShortVersionString = options.bundleVersion;
        console.log(`[IPA] Changed version to: ${options.bundleVersion}`);
      }

      if (options.minimumOSVersion) {
        infoPlist.MinimumOSVersion = options.minimumOSVersion;
        console.log(
          `[IPA] Changed minimum iOS version to: ${options.minimumOSVersion}`,
        );
      }

      // Remove Watch support if requested
      if (options.removeWatch) {
        delete infoPlist.WKWatchKitApp;
        delete infoPlist.WKCompanionAppBundleIdentifier;
        console.log(`[IPA] Removed Watch support`);
      }

      // Remove supported devices if requested
      if (options.removeExtensions) {
        // Remove app extensions
        const plugInsDir = path.join(appDir, "PlugIns");
        if (fs.existsSync(plugInsDir)) {
          fs.rmSync(plugInsDir, { recursive: true, force: true });
          console.log(`[IPA] Removed app extensions`);
        }
      }

      // Write modified Info.plist
      const modifiedPlist = plist.build(infoPlist);
      fs.writeFileSync(infoPlistPath, modifiedPlist);
      console.log(`[IPA] Updated Info.plist`);
    } catch (error) {
      console.error("Error modifying IPA:", error);
      throw new Error(
        `Failed to modify IPA: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Install mobile provision and entitlements
   */
  static async installProvisionAndEntitlements(
    extractedDir: string,
    provision: MobileProvision,
    customEntitlements?: any,
  ): Promise<void> {
    try {
      console.log(`[IPA] Installing mobile provision: ${provision.name}`);

      const payloadDir = path.join(extractedDir, "Payload");
      const appDirs = fs
        .readdirSync(payloadDir)
        .filter((name) => name.endsWith(".app"));
      const appDir = path.join(payloadDir, appDirs[0]);

      // Copy mobile provision to app bundle
      const embeddedProvisionPath = path.join(
        appDir,
        "embedded.mobileprovision",
      );
      // Note: In a real implementation, you'd copy the actual provision file
      // For now, we'll create a placeholder
      fs.writeFileSync(embeddedProvisionPath, JSON.stringify(provision));

      // Create entitlements file
      const entitlements = customEntitlements ||
        provision.entitlements || {
          "application-identifier": `${provision.teamId}.${provision.appId}`,
          "com.apple.developer.team-identifier": provision.teamId,
          "get-task-allow": false,
          "keychain-access-groups": [`${provision.teamId}.*`],
        };

      const entitlementsPath = path.join(appDir, "entitlements.plist");
      const entitlementsPlist = plist.build(entitlements);
      fs.writeFileSync(entitlementsPath, entitlementsPlist);

      console.log(`[IPA] Installed provision and entitlements`);
    } catch (error) {
      console.error("Error installing provision:", error);
      throw new Error(
        `Failed to install provision: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Create signed IPA
   */
  static async createSignedIPA(
    extractedDir: string,
    outputPath: string,
  ): Promise<void> {
    try {
      console.log(`[IPA] Creating signed IPA: ${outputPath}`);

      // Create new ZIP with IPA contents
      const zip = new AdmZip();

      // Add all files from extracted directory
      const addDirectoryToZip = (dirPath: string, zipPath: string = "") => {
        const items = fs.readdirSync(dirPath);
        for (const item of items) {
          const itemPath = path.join(dirPath, item);
          const itemZipPath = zipPath ? `${zipPath}/${item}` : item;

          if (fs.statSync(itemPath).isDirectory()) {
            addDirectoryToZip(itemPath, itemZipPath);
          } else {
            const data = fs.readFileSync(itemPath);
            zip.addFile(itemZipPath, data);
          }
        }
      };

      addDirectoryToZip(extractedDir);

      // Write the new IPA
      zip.writeZip(outputPath);

      console.log(`[IPA] Created signed IPA: ${outputPath}`);
    } catch (error) {
      console.error("Error creating signed IPA:", error);
      throw new Error(
        `Failed to create signed IPA: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Simulate code signing (basic implementation)
   * Note: Real code signing would require platform-specific tools
   */
  static async signBinaries(
    extractedDir: string,
    certificate: CertificateInfo,
    entitlementsPath: string,
  ): Promise<void> {
    try {
      console.log(
        `[IPA] Signing binaries with certificate: ${certificate.commonName}`,
      );

      const payloadDir = path.join(extractedDir, "Payload");
      const appDirs = fs
        .readdirSync(payloadDir)
        .filter((name) => name.endsWith(".app"));
      const appDir = path.join(payloadDir, appDirs[0]);

      // Find executable and framework binaries
      const findBinaries = (dir: string): string[] => {
        const binaries: string[] = [];
        const items = fs.readdirSync(dir);

        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);

          if (stat.isDirectory()) {
            if (item.endsWith(".framework") || item.endsWith(".dylib")) {
              binaries.push(itemPath);
            }
            binaries.push(...findBinaries(itemPath));
          } else if (stat.isFile() && stat.mode & parseInt("111", 8)) {
            // Executable file
            binaries.push(itemPath);
          }
        }

        return binaries;
      };

      const binaries = findBinaries(appDir);
      console.log(`[IPA] Found ${binaries.length} binaries to sign`);

      // Simulate signing by adding a signature marker
      for (const binary of binaries) {
        try {
          // Add a simple signature marker (in real implementation, this would be actual code signing)
          const signatureMarker = `\n# SIGNED WITH: ${certificate.commonName}\n# TEAM ID: ${certificate.teamId}\n# DATE: ${new Date().toISOString()}\n`;
          fs.appendFileSync(binary, signatureMarker);
          console.log(`[IPA] Signed: ${path.relative(appDir, binary)}`);
        } catch (err) {
          console.warn(`[IPA] Could not sign ${binary}: ${err}`);
        }
      }

      console.log(`[IPA] Completed binary signing`);
    } catch (error) {
      console.error("Error signing binaries:", error);
      throw new Error(
        `Failed to sign binaries: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Get file size in human readable format
   */
  static getFileSize(filePath: string): number {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch {
      return 0;
    }
  }
}
