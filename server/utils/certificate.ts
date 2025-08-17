import * as forge from "node-forge";
import * as fs from "fs";

export interface CertificateInfo {
  certificate: forge.pki.Certificate;
  privateKey: forge.pki.PrivateKey;
  commonName: string;
  organizationName: string;
  teamId: string;
  notBefore: Date;
  notAfter: Date;
  isValid: boolean;
}

export interface MobileProvision {
  name: string;
  uuid: string;
  teamId: string;
  appId: string;
  devices: string[];
  entitlements: any;
  certificates: string[];
  expirationDate: Date;
  isValid: boolean;
}

export class CertificateProcessor {
  /**
   * Process P12 certificate file
   */
  static async processP12Certificate(
    p12FilePath: string,
    password?: string,
  ): Promise<CertificateInfo> {
    try {
      const p12Data = fs.readFileSync(p12FilePath);
      const p12Base64 = forge.util.encode64(p12Data.toString("binary"));
      const p12Der = forge.util.decode64(p12Base64);

      // Parse P12 file
      const p12Asn1 = forge.asn1.fromDer(p12Der);
      const p12 = forge.pkcs12.pkcs12FromAsn1(p12Asn1, password || "");

      // Extract certificate and private key
      let certificate: forge.pki.Certificate | null = null;
      let privateKey: forge.pki.PrivateKey | null = null;

      for (const safeContents of p12.safeContents) {
        for (const safeBag of safeContents.safeBags) {
          if (safeBag.type === forge.pki.oids.certBag) {
            certificate = safeBag.cert as forge.pki.Certificate;
          } else if (
            safeBag.type === forge.pki.oids.pkcs8ShroudedKeyBag ||
            safeBag.type === forge.pki.oids.keyBag
          ) {
            privateKey = safeBag.key as forge.pki.PrivateKey;
          }
        }
      }

      if (!certificate || !privateKey) {
        throw new Error(
          "Could not extract certificate or private key from P12 file",
        );
      }

      // Extract certificate information
      const subject = certificate.subject;
      const commonName = subject.getField("CN")?.value || "Unknown";
      const organizationName = subject.getField("O")?.value || "Unknown";

      // Extract Team ID from OU field
      const ouField = subject.getField("OU");
      const teamId = ouField?.value || "Unknown";

      const now = new Date();
      const isValid =
        now >= certificate.validity.notBefore &&
        now <= certificate.validity.notAfter;

      return {
        certificate,
        privateKey,
        commonName,
        organizationName,
        teamId,
        notBefore: certificate.validity.notBefore,
        notAfter: certificate.validity.notAfter,
        isValid,
      };
    } catch (error) {
      console.error("Error processing P12 certificate:", error);
      throw new Error(
        `Failed to process P12 certificate: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Process mobile provision file
   */
  static async processMobileProvision(
    mpFilePath: string,
  ): Promise<MobileProvision> {
    try {
      const mpData = fs.readFileSync(mpFilePath, "utf8");

      // Extract plist content from mobile provision
      const plistStart = mpData.indexOf("<plist");
      const plistEnd = mpData.indexOf("</plist>") + 8;

      if (plistStart === -1 || plistEnd === -1) {
        throw new Error("Invalid mobile provision format");
      }

      const plistContent = mpData.substring(plistStart, plistEnd);

      // Parse plist (we'll use a simple regex approach for now)
      const extractValue = (key: string): any => {
        const keyRegex = new RegExp(
          `<key>${key}</key>\\s*<([^>]+)>([^<]*)</\\1>`,
        );
        const match = plistContent.match(keyRegex);
        return match ? match[2] : null;
      };

      const extractArray = (key: string): string[] => {
        const keyRegex = new RegExp(
          `<key>${key}</key>\\s*<array>([\\s\\S]*?)</array>`,
        );
        const match = plistContent.match(keyRegex);
        if (!match) return [];

        const arrayContent = match[1];
        const stringRegex = /<string>([^<]*)<\/string>/g;
        const strings = [];
        let stringMatch;
        while ((stringMatch = stringRegex.exec(arrayContent)) !== null) {
          strings.push(stringMatch[1]);
        }
        return strings;
      };

      const name = extractValue("Name") || "Unknown";
      const uuid = extractValue("UUID") || "";
      const teamId = extractValue("TeamIdentifier") || "";
      const appIdName = extractValue("AppIDName") || "";
      const devices = extractArray("ProvisionedDevices");
      const certificates = extractArray("DeveloperCertificates");

      // Extract expiration date
      const expirationString = extractValue("ExpirationDate");
      const expirationDate = expirationString
        ? new Date(expirationString)
        : new Date();

      const isValid = new Date() < expirationDate;

      return {
        name,
        uuid,
        teamId,
        appId: appIdName,
        devices,
        entitlements: {}, // Will be populated from Entitlements key
        certificates,
        expirationDate,
        isValid,
      };
    } catch (error) {
      console.error("Error processing mobile provision:", error);
      throw new Error(
        `Failed to process mobile provision: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Validate certificate and mobile provision compatibility
   */
  static validateCertificateProvisionMatch(
    cert: CertificateInfo,
    provision: MobileProvision,
  ): boolean {
    // Check if team IDs match
    if (cert.teamId !== provision.teamId) {
      console.warn(
        `Team ID mismatch: Certificate=${cert.teamId}, Provision=${provision.teamId}`,
      );
      return false;
    }

    // Check if certificate is still valid
    if (!cert.isValid) {
      console.warn("Certificate has expired");
      return false;
    }

    // Check if provision is still valid
    if (!provision.isValid) {
      console.warn("Mobile provision has expired");
      return false;
    }

    return true;
  }

  /**
   * Generate certificate fingerprint for matching
   */
  static getCertificateFingerprint(certificate: forge.pki.Certificate): string {
    const der = forge.asn1
      .toDer(forge.pki.certificateToAsn1(certificate))
      .getBytes();
    const md = forge.md.sha1.create();
    md.update(der);
    return md.digest().toHex().toUpperCase();
  }
}
