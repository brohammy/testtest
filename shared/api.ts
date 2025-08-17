/**
 * Shared code between client and server
 * Useful to share types between client and server
 * and/or small pure JS functions that can be used on both client and server
 */

/**
 * Example response type for /api/demo
 */
export interface DemoResponse {
  message: string;
}

/**
 * IPA Signing API Types
 */

export interface SigningRequest {
  // IPA source
  ipaSource: "file" | "url";
  ipaUrl?: string;

  // Required certificates
  p12Password?: string;

  // Basic signing options
  bundleId?: string;
  bundleName?: string;
  bundleVersion?: string;
  zipLevel?: number;
  entitlements?: string;

  // Signing flags
  weak?: boolean;
  adhoc?: boolean;
  debug?: boolean;
  force?: boolean;

  // Cyan modification options
  cyanAppName?: string;
  cyanVersion?: string;
  cyanBundleId?: string;
  cyanMinimumOS?: string;
  cyanCompressionLevel?: number;

  // Cyan boolean flags
  removeSupportedDevices?: boolean;
  removeWatch?: boolean;
  enableDocuments?: boolean;
  cyanFakeSign?: boolean;
  thinBinaries?: boolean;
  removeExtensions?: boolean;
  removeEncryptedExtensions?: boolean;
  ignoreEncrypted?: boolean;
  overwrite?: boolean;
}

export interface SigningResponse {
  success: boolean;
  jobId: string;
  message: string;
}

export interface SigningProgress {
  jobId: string;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  message: string;
  result?: SigningResult;
  error?: string;
}

export interface SigningResult {
  signedIpaUrl: string;
  installLink: string;
  metadata: {
    bundleName: string;
    bundleId: string;
    bundleVersion: string;
    fileSize: number;
    signedAt: string;
  };
}

export interface FileUploadResponse {
  success: boolean;
  fileId: string;
  filename: string;
  size: number;
  uploadedAt: string;
}

export interface StoredFile {
  id: string;
  filename: string;
  originalName: string;
  size: number;
  mimetype: string;
  uploadedAt: string;
  path: string;
}
