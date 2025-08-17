import { useState, useEffect } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Download,
  Smartphone,
  ChevronDown,
  ChevronUp,
  FileText,
  Shield,
  Settings,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { SigningRequest, SigningResponse, SigningProgress } from "@shared/api";

export default function Index() {
  // Form state
  const [ipaSource, setIpaSource] = useState<"file" | "url">("file");
  const [ipaFiles, setIpaFiles] = useState<File[]>([]);
  const [ipaUrl, setIpaUrl] = useState("");
  const [p12Files, setP12Files] = useState<File[]>([]);
  const [mpFiles, setMpFiles] = useState<File[]>([]);
  const [p12Password, setP12Password] = useState("");

  // Basic signing options
  const [bundleId, setBundleId] = useState("");
  const [bundleName, setBundleName] = useState("");
  const [bundleVersion, setBundleVersion] = useState("");
  const [zipLevel, setZipLevel] = useState("");
  const [entitlements, setEntitlements] = useState("");

  // Signing flags
  const [weak, setWeak] = useState(false);
  const [adhoc, setAdhoc] = useState(false);
  const [debug, setDebug] = useState(false);
  const [force, setForce] = useState(false);

  // Cyan modification options
  const [cyanFiles, setCyanFiles] = useState<File[]>([]);
  const [tweakFiles, setTweakFiles] = useState<File[]>([]);
  const [iconFiles, setIconFiles] = useState<File[]>([]);
  const [plistFiles, setPlistFiles] = useState<File[]>([]);
  const [entitlementsFiles, setEntitlementsFiles] = useState<File[]>([]);

  const [cyanAppName, setCyanAppName] = useState("");
  const [cyanVersion, setCyanVersion] = useState("");
  const [cyanBundleId, setCyanBundleId] = useState("");
  const [cyanMinimumOS, setCyanMinimumOS] = useState("");
  const [cyanCompressionLevel, setCyanCompressionLevel] = useState("");

  // Cyan boolean flags
  const [removeSupportedDevices, setRemoveSupportedDevices] = useState(false);
  const [removeWatch, setRemoveWatch] = useState(false);
  const [enableDocuments, setEnableDocuments] = useState(false);
  const [cyanFakeSign, setCyanFakeSign] = useState(false);
  const [thinBinaries, setThinBinaries] = useState(false);
  const [removeExtensions, setRemoveExtensions] = useState(false);
  const [removeEncryptedExtensions, setRemoveEncryptedExtensions] =
    useState(false);
  const [ignoreEncrypted, setIgnoreEncrypted] = useState(false);
  const [overwrite, setOverwrite] = useState(false);

  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJob, setCurrentJob] = useState<string | null>(null);
  const [progress, setProgress] = useState<SigningProgress | null>(null);
  const [error, setError] = useState<string>("");

  // Validation
  const isFormValid = () => {
    const hasIpa =
      ipaSource === "file" ? ipaFiles.length > 0 : ipaUrl.trim().length > 0;
    const hasP12 = p12Files.length > 0;
    const hasMp = mpFiles.length > 0;
    return hasIpa && hasP12 && hasMp && !isSubmitting;
  };

  // Poll progress
  useEffect(() => {
    if (!currentJob) return;

    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/sign/progress/${currentJob}`);

        if (!response.ok) {
          const text = await response.text();
          throw new Error(`HTTP ${response.status}: ${text}`);
        }

        const contentType = response.headers.get("content-type");
        if (!contentType?.includes("application/json")) {
          const text = await response.text();
          throw new Error(
            `Expected JSON but received: ${contentType || "unknown"} - ${text.substring(0, 100)}`,
          );
        }

        const progressData: SigningProgress = await response.json();

        setProgress(progressData);

        if (
          progressData.status === "completed" ||
          progressData.status === "failed"
        ) {
          setIsSubmitting(false);
          clearInterval(interval);
          if (progressData.status === "failed") {
            setError(progressData.error || "Signing failed");
          }
        }
      } catch (err) {
        console.error("Failed to check progress:", err);
        setError("Failed to check progress");
        setIsSubmitting(false);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [currentJob]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isFormValid()) return;

    setIsSubmitting(true);
    setError("");
    setProgress(null);

    try {
      const formData = new FormData();

      // Add IPA source
      if (ipaSource === "file" && ipaFiles[0]) {
        formData.append("ipa", ipaFiles[0]);
      } else if (ipaSource === "url" && ipaUrl.trim()) {
        formData.append("ipaurl", ipaUrl.trim());
      }

      // Add required files
      if (p12Files[0]) formData.append("p12", p12Files[0]);
      if (mpFiles[0]) formData.append("mp", mpFiles[0]);
      if (p12Password) formData.append("pass", p12Password);

      // Add basic options
      if (bundleId) formData.append("bundleId", bundleId);
      if (bundleName) formData.append("bundleName", bundleName);
      if (bundleVersion) formData.append("bundleVersion", bundleVersion);
      if (zipLevel) formData.append("zipLevel", zipLevel);
      if (entitlements) formData.append("entitlements", entitlements);

      // Add flags
      if (weak) formData.append("weak", "true");
      if (adhoc) formData.append("adhoc", "true");
      if (debug) formData.append("debug", "true");
      if (force) formData.append("force", "true");

      // Add cyan options
      if (cyanAppName) formData.append("cyanAppName", cyanAppName);
      if (cyanVersion) formData.append("cyanVersion", cyanVersion);
      if (cyanBundleId) formData.append("cyanBundleId", cyanBundleId);
      if (cyanMinimumOS) formData.append("cyanMinimumOS", cyanMinimumOS);
      if (cyanCompressionLevel)
        formData.append("cyanCompressionLevel", cyanCompressionLevel);

      // Add cyan flags
      if (removeSupportedDevices)
        formData.append("removeSupportedDevices", "true");
      if (removeWatch) formData.append("removeWatch", "true");
      if (enableDocuments) formData.append("enableDocuments", "true");
      if (cyanFakeSign) formData.append("cyanFakeSign", "true");
      if (thinBinaries) formData.append("thinBinaries", "true");
      if (removeExtensions) formData.append("removeExtensions", "true");
      if (removeEncryptedExtensions)
        formData.append("removeEncryptedExtensions", "true");
      if (ignoreEncrypted) formData.append("ignoreEncrypted", "true");
      if (overwrite) formData.append("overwrite", "true");

      // Add files
      cyanFiles.forEach((file) => formData.append("cyanFiles", file));
      tweakFiles.forEach((file) => formData.append("tweakFiles", file));
      if (iconFiles[0]) formData.append("iconFile", iconFiles[0]);
      if (plistFiles[0]) formData.append("plistFile", plistFiles[0]);
      if (entitlementsFiles[0])
        formData.append("entitlementsFile", entitlementsFiles[0]);

      const response = await fetch("/api/sign", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        const text = await response.text();
        throw new Error(
          `Expected JSON but received: ${contentType || "unknown"} - ${text.substring(0, 100)}`,
        );
      }

      const result: SigningResponse = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to submit signing job");
      }

      setCurrentJob(result.jobId);
    } catch (err) {
      console.error("Submit error:", err);
      setError(err instanceof Error ? err.message : "Failed to submit job");
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentJob(null);
    setProgress(null);
    setError("");
    setIsSubmitting(false);
  };

  const handleTestSigning = async () => {
    setIsSubmitting(true);
    setError("");
    setProgress(null);

    try {
      // Create a FormData with mock files for testing
      const formData = new FormData();

      // Create mock files
      const mockIpaFile = new File(['mock ipa content'], 'test.ipa', { type: 'application/octet-stream' });
      const mockP12File = new File(['mock p12 content'], 'test.p12', { type: 'application/x-pkcs12' });
      const mockMpFile = new File(['mock provision content'], 'test.mobileprovision', { type: 'application/x-apple-mobileprovision' });

      formData.append('ipa', mockIpaFile);
      formData.append('p12', mockP12File);
      formData.append('mp', mockMpFile);
      formData.append('bundleName', 'Test App');
      formData.append('bundleId', 'com.test.app');
      formData.append('bundleVersion', '1.0.0');

      const response = await fetch("/api/sign", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        throw new Error(`Expected JSON but received: ${contentType || 'unknown'} - ${text.substring(0, 100)}`);
      }

      const result: SigningResponse = await response.json();

      setCurrentJob(result.jobId);
    } catch (err) {
      console.error("Test signing error:", err);
      setError(err instanceof Error ? err.message : "Test signing failed");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-4">
            Advanced IPA Signer
          </h1>
          <p className="text-gray-600 text-lg mb-3">
            Upload files and configure advanced signing options
          </p>
          <div className="flex justify-center gap-4 items-center">
            <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
              ✅ Real IPA Signing Available
            </Badge>
            <Button asChild variant="ghost" size="sm">
              <a href="/status" className="text-blue-600 hover:text-blue-800">
                View Status
              </a>
            </Button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* IPA Source Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                IPA Source
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs
                value={ipaSource}
                onValueChange={(v) => setIpaSource(v as "file" | "url")}
              >
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="file">Upload File</TabsTrigger>
                  <TabsTrigger value="url">From URL</TabsTrigger>
                </TabsList>

                <TabsContent value="file" className="mt-4">
                  <FileUpload
                    accept=".ipa"
                    onFilesSelected={setIpaFiles}
                    placeholder="Choose IPA file to sign"
                    required
                  />
                </TabsContent>

                <TabsContent value="url" className="mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="ipaUrl">IPA URL</Label>
                    <Input
                      id="ipaUrl"
                      type="url"
                      value={ipaUrl}
                      onChange={(e) => setIpaUrl(e.target.value)}
                      placeholder="https://example.com/app.ipa"
                      required={ipaSource === "url"}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Required Certificates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5" />
                Signing Certificates
                <Badge variant="destructive">Required</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-base font-medium">
                  P12 Certificate (.p12, .pfx)
                </Label>
                <FileUpload
                  accept=".p12,.pfx"
                  onFilesSelected={setP12Files}
                  placeholder="Drop P12 certificate file here or click to browse"
                  required
                />
              </div>

              <div>
                <Label className="text-base font-medium">
                  Mobile Provision (.mobileprovision)
                </Label>
                <FileUpload
                  accept=".mobileprovision,.provisionprofile"
                  onFilesSelected={setMpFiles}
                  placeholder="Drop mobile provision file here or click to browse"
                  required
                />
              </div>

              <div>
                <Label htmlFor="p12Password">
                  P12 Certificate Password (Optional)
                </Label>
                <Input
                  id="p12Password"
                  type="password"
                  value={p12Password}
                  onChange={(e) => setP12Password(e.target.value)}
                  placeholder="Enter password if required"
                />
              </div>
            </CardContent>
          </Card>

          {/* Advanced Options */}
          <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
            <CollapsibleTrigger asChild>
              <Card className="cursor-pointer hover:bg-gray-50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Settings className="w-5 h-5" />
                      Advanced Options
                    </div>
                    {showAdvanced ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </CardTitle>
                  <CardDescription>
                    Configure advanced signing and modification options
                  </CardDescription>
                </CardHeader>
              </Card>
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="space-y-6 mt-4">
                {/* Basic Signing Options */}
                <Card>
                  <CardHeader>
                    <CardTitle>Basic Signing Options</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="bundleId">Bundle ID</Label>
                        <Input
                          id="bundleId"
                          value={bundleId}
                          onChange={(e) => setBundleId(e.target.value)}
                          placeholder="com.example.app"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bundleName">App Name</Label>
                        <Input
                          id="bundleName"
                          value={bundleName}
                          onChange={(e) => setBundleName(e.target.value)}
                          placeholder="My App"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bundleVersion">Version</Label>
                        <Input
                          id="bundleVersion"
                          value={bundleVersion}
                          onChange={(e) => setBundleVersion(e.target.value)}
                          placeholder="1.0.0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="zipLevel">ZIP Compression Level</Label>
                        <Select value={zipLevel} onValueChange={setZipLevel}>
                          <SelectTrigger>
                            <SelectValue placeholder="Default" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0">
                              0 - No compression
                            </SelectItem>
                            <SelectItem value="1">1 - Fastest</SelectItem>
                            <SelectItem value="6">6 - Default</SelectItem>
                            <SelectItem value="9">
                              9 - Best compression
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="entitlements">Custom Entitlements</Label>
                      <Textarea
                        id="entitlements"
                        value={entitlements}
                        onChange={(e) => setEntitlements(e.target.value)}
                        placeholder="Custom entitlements content"
                        rows={4}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="weak"
                          checked={weak}
                          onCheckedChange={setWeak}
                        />
                        <Label htmlFor="weak">Use weak signing</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="adhoc"
                          checked={adhoc}
                          onCheckedChange={setAdhoc}
                        />
                        <Label htmlFor="adhoc">Ad-hoc signing</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="debug"
                          checked={debug}
                          onCheckedChange={setDebug}
                        />
                        <Label htmlFor="debug">Debug mode</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="force"
                          checked={force}
                          onCheckedChange={setForce}
                        />
                        <Label htmlFor="force">Force overwrite</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cyan Modification Options */}
                <Card>
                  <CardHeader>
                    <CardTitle>IPA Modification (Cyan)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>Cyan Files (.cyan)</Label>
                        <FileUpload
                          accept=".cyan"
                          multiple
                          onFilesSelected={setCyanFiles}
                          placeholder="Choose cyan files (optional)"
                        />
                      </div>
                      <div>
                        <Label>Tweak/Bundle Files</Label>
                        <FileUpload
                          multiple
                          onFilesSelected={setTweakFiles}
                          placeholder="Choose tweak files (optional)"
                        />
                      </div>
                      <div>
                        <Label>App Icon</Label>
                        <FileUpload
                          accept="image/*"
                          onFilesSelected={setIconFiles}
                          placeholder="Choose icon"
                        />
                      </div>
                      <div>
                        <Label>Custom Plist</Label>
                        <FileUpload
                          accept=".plist"
                          onFilesSelected={setPlistFiles}
                          placeholder="Choose plist"
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Custom Entitlements File</Label>
                      <FileUpload
                        onFilesSelected={setEntitlementsFiles}
                        placeholder="Choose entitlements file"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="cyanAppName">App Name Override</Label>
                        <Input
                          id="cyanAppName"
                          value={cyanAppName}
                          onChange={(e) => setCyanAppName(e.target.value)}
                          placeholder="Custom app name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cyanVersion">Version Override</Label>
                        <Input
                          id="cyanVersion"
                          value={cyanVersion}
                          onChange={(e) => setCyanVersion(e.target.value)}
                          placeholder="1.0.0"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cyanBundleId">Bundle ID Override</Label>
                        <Input
                          id="cyanBundleId"
                          value={cyanBundleId}
                          onChange={(e) => setCyanBundleId(e.target.value)}
                          placeholder="com.example.app"
                        />
                      </div>
                      <div>
                        <Label htmlFor="cyanMinimumOS">
                          Minimum iOS Version
                        </Label>
                        <Input
                          id="cyanMinimumOS"
                          value={cyanMinimumOS}
                          onChange={(e) => setCyanMinimumOS(e.target.value)}
                          placeholder="13.0"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="cyanCompressionLevel">
                        Compression Level
                      </Label>
                      <Select
                        value={cyanCompressionLevel}
                        onValueChange={setCyanCompressionLevel}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Default" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">0 - No compression</SelectItem>
                          <SelectItem value="1">1 - Fastest</SelectItem>
                          <SelectItem value="6">6 - Default</SelectItem>
                          <SelectItem value="9">
                            9 - Best compression
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="removeSupportedDevices"
                          checked={removeSupportedDevices}
                          onCheckedChange={setRemoveSupportedDevices}
                        />
                        <Label htmlFor="removeSupportedDevices">
                          Remove supported devices
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="removeWatch"
                          checked={removeWatch}
                          onCheckedChange={setRemoveWatch}
                        />
                        <Label htmlFor="removeWatch">
                          Remove Watch support
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="enableDocuments"
                          checked={enableDocuments}
                          onCheckedChange={setEnableDocuments}
                        />
                        <Label htmlFor="enableDocuments">
                          Enable document support
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="cyanFakeSign"
                          checked={cyanFakeSign}
                          onCheckedChange={setCyanFakeSign}
                        />
                        <Label htmlFor="cyanFakeSign">Fake sign</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="thinBinaries"
                          checked={thinBinaries}
                          onCheckedChange={setThinBinaries}
                        />
                        <Label htmlFor="thinBinaries">Thin binaries</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="removeExtensions"
                          checked={removeExtensions}
                          onCheckedChange={setRemoveExtensions}
                        />
                        <Label htmlFor="removeExtensions">
                          Remove extensions
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="removeEncryptedExtensions"
                          checked={removeEncryptedExtensions}
                          onCheckedChange={setRemoveEncryptedExtensions}
                        />
                        <Label htmlFor="removeEncryptedExtensions">
                          Remove encrypted extensions
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="ignoreEncrypted"
                          checked={ignoreEncrypted}
                          onCheckedChange={setIgnoreEncrypted}
                        />
                        <Label htmlFor="ignoreEncrypted">
                          Ignore encrypted
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="overwrite"
                          checked={overwrite}
                          onCheckedChange={setOverwrite}
                        />
                        <Label htmlFor="overwrite">Overwrite existing</Label>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* Submit Button */}
          <div className="flex justify-center gap-4">
            <Button
              type="submit"
              size="lg"
              disabled={!isFormValid()}
              className="flex-1 max-w-md h-12 text-lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                "Start Signing Process"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="lg"
              disabled={isSubmitting}
              onClick={handleTestSigning}
              className="h-12 px-6"
            >
              Test Signing
            </Button>
          </div>
        </form>

        {/* Progress Display */}
        {progress && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {progress.status === "completed" && (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                )}
                {progress.status === "failed" && (
                  <XCircle className="w-5 h-5 text-red-500" />
                )}
                {progress.status === "processing" && (
                  <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                )}
                Signing Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{progress.message}</span>
                  <span>{progress.progress}%</span>
                </div>
                <Progress value={progress.progress} className="w-full" />
              </div>

              {progress.status === "completed" && progress.result && (
                <div className="space-y-4">
                  <Separator />
                  <div className="space-y-2">
                    <h4 className="font-semibold text-green-700">
                      ✅ Signing Complete!
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="font-medium">App Name:</span>{" "}
                        {progress.result.metadata.bundleName}
                      </div>
                      <div>
                        <span className="font-medium">Bundle ID:</span>{" "}
                        {progress.result.metadata.bundleId}
                      </div>
                      <div>
                        <span className="font-medium">Version:</span>{" "}
                        {progress.result.metadata.bundleVersion}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button asChild className="flex-1">
                      <a href={progress.result.signedIpaUrl} download>
                        <Download className="w-4 h-4 mr-2" />
                        Download IPA
                      </a>
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <a href={progress.result.installLink}>
                        <Smartphone className="w-4 h-4 mr-2" />
                        Install on Device
                      </a>
                    </Button>
                  </div>
                  <Button
                    onClick={resetForm}
                    variant="ghost"
                    className="w-full"
                  >
                    Sign Another App
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="mt-6" variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}
