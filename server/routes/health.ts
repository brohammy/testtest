import { RequestHandler } from "express";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const handleHealthCheck: RequestHandler = async (req, res) => {
  try {
    const health = {
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
    };

    res.json({
      success: true,
      data: health,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Health check failed",
    });
  }
};

export const handleSigningCapabilities: RequestHandler = async (req, res) => {
  try {
    const capabilities = {
      zsign: false,
      zsignVersion: null,
      supportedFormats: ["ipa"],
      maxFileSize: "500MB",
      features: {
        urlDownload: true,
        tweakInjection: true,
        iconReplacement: true,
        entitlementModification: true,
        bundleModification: true,
      },
    };

    // Check if zsign is available
    try {
      const { stdout } = await execAsync("zsign --version");
      capabilities.zsign = true;
      capabilities.zsignVersion = stdout.trim();
    } catch (error) {
      console.log("zsign not available:", error);
    }

    res.json({
      success: true,
      data: capabilities,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Failed to check capabilities",
    });
  }
};
