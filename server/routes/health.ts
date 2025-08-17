import { RequestHandler } from "express";
import * as fs from 'fs';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  services: {
    fileSystem: boolean;
    certificates: boolean;
    signing: boolean;
  };
  features: {
    realSigning: boolean;
    mockSigning: boolean;
  };
  message: string;
}

export const handleHealthCheck: RequestHandler = async (req, res) => {
  const health: HealthStatus = {
    status: 'healthy',
    services: {
      fileSystem: true,
      certificates: true,
      signing: true,
    },
    features: {
      realSigning: true,
      mockSigning: true,
    },
    message: 'All systems operational'
  };

  try {
    // Check file system access
    const uploadsDir = 'uploads';
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    // Test certificate processing
    try {
      await import('node-forge');
      health.services.certificates = true;
    } catch (error) {
      console.log('node-forge import error:', error);
      health.services.certificates = false;
      health.features.realSigning = false;
      health.status = 'degraded';
      health.message = 'Certificate processing unavailable, using mock signing only';
    }

    // Test IPA processing
    try {
      await import('adm-zip');
      await import('plist');
      health.services.signing = true;
    } catch (error) {
      console.log('IPA processing import error:', error);
      health.services.signing = false;
      health.features.realSigning = false;
      health.status = 'degraded';
      health.message = 'IPA processing unavailable, using mock signing only';
    }

    if (!health.features.realSigning) {
      health.status = 'degraded';
      health.message = 'Real signing unavailable - dependencies missing. Mock signing available for testing.';
    }

  } catch (error) {
    health.status = 'unhealthy';
    health.message = `System error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }

  // Set appropriate HTTP status
  const statusCode = health.status === 'healthy' ? 200 : 
                    health.status === 'degraded' ? 200 : 503;

  res.status(statusCode).json(health);
};

export const handleSigningCapabilities: RequestHandler = (req, res) => {
  const capabilities = {
    realSigning: {
      available: true,
      features: [
        'P12 certificate processing',
        'Mobile provision parsing',
        'IPA extraction and modification',
        'Binary signing simulation',
        'Custom entitlements',
        'Bundle modification',
        'Tweak file installation',
        'Custom icon replacement'
      ],
      requirements: [
        'Valid P12 certificate',
        'Valid mobile provision',
        'Compatible IPA file'
      ]
    },
    mockSigning: {
      available: true,
      features: [
        'File upload testing',
        'Progress tracking',
        'Download simulation',
        'Manifest generation'
      ],
      note: 'Mock signing for development and testing purposes'
    },
    supportedFormats: {
      ipa: ['.ipa'],
      certificates: ['.p12', '.pfx'],
      provisions: ['.mobileprovision', '.provisionprofile'],
      additional: ['.cyan', '.dylib', '.framework', '.bundle', '.plist']
    }
  };

  try {
    // Check if real signing dependencies are available
    require('node-forge');
    require('adm-zip');
    require('plist');
  } catch (error) {
    capabilities.realSigning.available = false;
    capabilities.realSigning.features.push('⚠️ Dependencies missing - install node-forge, adm-zip, plist');
  }

  res.json(capabilities);
};
