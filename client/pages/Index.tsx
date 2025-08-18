import { useState, useEffect } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
  Zap,
  Star,
  Lock,
  Cpu,
  Sparkles
} from 'lucide-react';
import { SigningRequest, SigningResponse, SigningProgress } from '@shared/api';

export default function Index() {
  // Form state
  const [ipaSource, setIpaSource] = useState<'file' | 'url'>('file');
  const [ipaFiles, setIpaFiles] = useState<File[]>([]);
  const [ipaUrl, setIpaUrl] = useState('');
  const [p12Files, setP12Files] = useState<File[]>([]);
  const [mpFiles, setMpFiles] = useState<File[]>([]);
  const [p12Password, setP12Password] = useState('');
  
  // Basic signing options
  const [bundleId, setBundleId] = useState('');
  const [bundleName, setBundleName] = useState('');
  const [bundleVersion, setBundleVersion] = useState('');
  const [zipLevel, setZipLevel] = useState('');
  const [entitlements, setEntitlements] = useState('');
  
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
  
  const [cyanAppName, setCyanAppName] = useState('');
  const [cyanVersion, setCyanVersion] = useState('');
  const [cyanBundleId, setCyanBundleId] = useState('');
  const [cyanMinimumOS, setCyanMinimumOS] = useState('');
  const [cyanCompressionLevel, setCyanCompressionLevel] = useState('');
  
  // Cyan boolean flags
  const [removeSupportedDevices, setRemoveSupportedDevices] = useState(false);
  const [removeWatch, setRemoveWatch] = useState(false);
  const [enableDocuments, setEnableDocuments] = useState(false);
  const [cyanFakeSign, setCyanFakeSign] = useState(false);
  const [thinBinaries, setThinBinaries] = useState(false);
  const [removeExtensions, setRemoveExtensions] = useState(false);
  const [removeEncryptedExtensions, setRemoveEncryptedExtensions] = useState(false);
  const [ignoreEncrypted, setIgnoreEncrypted] = useState(false);
  const [overwrite, setOverwrite] = useState(false);
  
  // UI state
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentJob, setCurrentJob] = useState<string | null>(null);
  const [progress, setProgress] = useState<SigningProgress | null>(null);
  const [error, setError] = useState<string>('');

  // Validation
  const isFormValid = () => {
    const hasIpa = ipaSource === 'file' ? ipaFiles.length > 0 : ipaUrl.trim().length > 0;
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
        const progressData: SigningProgress = await response.json();
        
        setProgress(progressData);
        
        if (progressData.status === 'completed' || progressData.status === 'failed') {
          setIsSubmitting(false);
          clearInterval(interval);
          if (progressData.status === 'failed') {
            setError(progressData.error || 'Signing failed');
          }
        }
      } catch (err) {
        console.error('Failed to check progress:', err);
        setError('Failed to check progress');
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
    setError('');
    setProgress(null);
    
    try {
      const formData = new FormData();
      
      // Add IPA source
      if (ipaSource === 'file' && ipaFiles[0]) {
        formData.append('ipa', ipaFiles[0]);
      } else if (ipaSource === 'url' && ipaUrl.trim()) {
        formData.append('ipaurl', ipaUrl.trim());
      }
      
      // Add required files
      if (p12Files[0]) formData.append('p12', p12Files[0]);
      if (mpFiles[0]) formData.append('mp', mpFiles[0]);
      if (p12Password) formData.append('pass', p12Password);
      
      // Add basic options
      if (bundleId) formData.append('bundleId', bundleId);
      if (bundleName) formData.append('bundleName', bundleName);
      if (bundleVersion) formData.append('bundleVersion', bundleVersion);
      if (zipLevel) formData.append('zipLevel', zipLevel);
      if (entitlements) formData.append('entitlements', entitlements);
      
      // Add flags
      if (weak) formData.append('weak', 'true');
      if (adhoc) formData.append('adhoc', 'true');
      if (debug) formData.append('debug', 'true');
      if (force) formData.append('force', 'true');
      
      // Add cyan options
      if (cyanAppName) formData.append('cyanAppName', cyanAppName);
      if (cyanVersion) formData.append('cyanVersion', cyanVersion);
      if (cyanBundleId) formData.append('cyanBundleId', cyanBundleId);
      if (cyanMinimumOS) formData.append('cyanMinimumOS', cyanMinimumOS);
      if (cyanCompressionLevel) formData.append('cyanCompressionLevel', cyanCompressionLevel);
      
      // Add cyan flags
      if (removeSupportedDevices) formData.append('removeSupportedDevices', 'true');
      if (removeWatch) formData.append('removeWatch', 'true');
      if (enableDocuments) formData.append('enableDocuments', 'true');
      if (cyanFakeSign) formData.append('cyanFakeSign', 'true');
      if (thinBinaries) formData.append('thinBinaries', 'true');
      if (removeExtensions) formData.append('removeExtensions', 'true');
      if (removeEncryptedExtensions) formData.append('removeEncryptedExtensions', 'true');
      if (ignoreEncrypted) formData.append('ignoreEncrypted', 'true');
      if (overwrite) formData.append('overwrite', 'true');
      
      // Add files
      cyanFiles.forEach(file => formData.append('cyanFiles', file));
      tweakFiles.forEach(file => formData.append('tweakFiles', file));
      if (iconFiles[0]) formData.append('iconFile', iconFiles[0]);
      if (plistFiles[0]) formData.append('plistFile', plistFiles[0]);
      if (entitlementsFiles[0]) formData.append('entitlementsFile', entitlementsFiles[0]);
      
      const response = await fetch('/api/sign', {
        method: 'POST',
        body: formData
      });
      
      const result: SigningResponse = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit signing job');
      }
      
      setCurrentJob(result.jobId);
    } catch (err) {
      console.error('Submit error:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit job');
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setCurrentJob(null);
    setProgress(null);
    setError('');
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.15)_1px,transparent_0)] [background-size:50px_50px]" />
      
      <div className="relative">
        {/* Header */}
        <div className="border-b border-white/10 bg-black/20 backdrop-blur-xl">
          <div className="container mx-auto px-6 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    IPA Forge
                  </h1>
                  <p className="text-purple-200 text-sm">Professional iOS App Signing</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  zsign Ready
                </Badge>
                <Button variant="ghost" size="sm" className="text-purple-200 hover:text-white hover:bg-white/10">
                  <a href="/status">Status</a>
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-6 py-8 max-w-6xl">
          <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* IPA Source */}
              <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <FileText className="w-5 h-5 text-purple-400" />
                    Application Source
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs value={ipaSource} onValueChange={(v) => setIpaSource(v as 'file' | 'url')}>
                    <TabsList className="grid w-full grid-cols-2 bg-white/10">
                      <TabsTrigger value="file" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                        Upload File
                      </TabsTrigger>
                      <TabsTrigger value="url" className="data-[state=active]:bg-purple-500 data-[state=active]:text-white">
                        Remote URL
                      </TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="file" className="mt-4">
                      <FileUpload
                        accept=".ipa"
                        onFilesSelected={setIpaFiles}
                        placeholder="Drop your IPA file here or click to browse"
                        className="border-dashed border-purple-400/50 bg-purple-500/10 hover:bg-purple-500/20"
                        required
                      />
                    </TabsContent>
                    
                    <TabsContent value="url" className="mt-4">
                      <div className="space-y-2">
                        <Label htmlFor="ipaUrl" className="text-gray-300">IPA Download URL</Label>
                        <Input
                          id="ipaUrl"
                          type="url"
                          value={ipaUrl}
                          onChange={(e) => setIpaUrl(e.target.value)}
                          placeholder="https://example.com/app.ipa"
                          className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                          required={ipaSource === 'url'}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Certificates */}
              <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Lock className="w-5 h-5 text-pink-400" />
                    Signing Certificates
                    <Badge variant="destructive">Required</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-gray-300 text-sm font-medium">P12 Certificate</Label>
                    <FileUpload
                      accept=".p12,.pfx"
                      onFilesSelected={setP12Files}
                      placeholder="Drop your P12 certificate here"
                      className="border-dashed border-pink-400/50 bg-pink-500/10 hover:bg-pink-500/20"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label className="text-gray-300 text-sm font-medium">Mobile Provision</Label>
                    <FileUpload
                      accept=".mobileprovision,.provisionprofile"
                      onFilesSelected={setMpFiles}
                      placeholder="Drop your mobile provision file here"
                      className="border-dashed border-pink-400/50 bg-pink-500/10 hover:bg-pink-500/20"
                      required
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="p12Password" className="text-gray-300">Certificate Password</Label>
                    <Input
                      id="p12Password"
                      type="password"
                      value={p12Password}
                      onChange={(e) => setP12Password(e.target.value)}
                      placeholder="Optional password"
                      className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Advanced Options */}
              <Collapsible open={showAdvanced} onOpenChange={setShowAdvanced}>
                <CollapsibleTrigger asChild>
                  <Card className="border-white/20 bg-white/5 backdrop-blur-xl cursor-pointer hover:bg-white/10 transition-colors">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between text-white">
                        <div className="flex items-center gap-2">
                          <Cpu className="w-5 h-5 text-cyan-400" />
                          Advanced Configuration
                        </div>
                        {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </CardTitle>
                      <CardDescription className="text-gray-400">
                        Fine-tune signing parameters and inject modifications
                      </CardDescription>
                    </CardHeader>
                  </Card>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    {/* Basic Options */}
                    <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-lg">Basic Parameters</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="bundleId" className="text-gray-300 text-xs">Bundle ID</Label>
                            <Input
                              id="bundleId"
                              value={bundleId}
                              onChange={(e) => setBundleId(e.target.value)}
                              placeholder="com.example.app"
                              className="bg-white/10 border-white/20 text-white text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="bundleName" className="text-gray-300 text-xs">App Name</Label>
                            <Input
                              id="bundleName"
                              value={bundleName}
                              onChange={(e) => setBundleName(e.target.value)}
                              placeholder="My App"
                              className="bg-white/10 border-white/20 text-white text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="bundleVersion" className="text-gray-300 text-xs">Version</Label>
                            <Input
                              id="bundleVersion"
                              value={bundleVersion}
                              onChange={(e) => setBundleVersion(e.target.value)}
                              placeholder="1.0.0"
                              className="bg-white/10 border-white/20 text-white text-sm"
                            />
                          </div>
                          <div>
                            <Label htmlFor="zipLevel" className="text-gray-300 text-xs">Compression</Label>
                            <Select value={zipLevel} onValueChange={setZipLevel}>
                              <SelectTrigger className="bg-white/10 border-white/20 text-white">
                                <SelectValue placeholder="Default" />
                              </SelectTrigger>
                              <SelectContent className="bg-slate-800 border-white/20">
                                <SelectItem value="0">No compression</SelectItem>
                                <SelectItem value="6">Default</SelectItem>
                                <SelectItem value="9">Maximum</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="weak" checked={weak} onCheckedChange={setWeak} />
                            <Label htmlFor="weak" className="text-gray-300 text-xs">Weak signing</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="adhoc" checked={adhoc} onCheckedChange={setAdhoc} />
                            <Label htmlFor="adhoc" className="text-gray-300 text-xs">Ad-hoc</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Modification Options */}
                    <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-white text-lg">Modifications</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <Label className="text-gray-300 text-xs">Tweak Files</Label>
                          <FileUpload
                            multiple
                            onFilesSelected={setTweakFiles}
                            placeholder="Drop tweaks here"
                            className="border-dashed border-cyan-400/50 bg-cyan-500/10"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label className="text-gray-300 text-xs">Custom Icon</Label>
                            <FileUpload
                              accept="image/*"
                              onFilesSelected={setIconFiles}
                              placeholder="Icon file"
                              className="border-dashed border-yellow-400/50 bg-yellow-500/10"
                            />
                          </div>
                          <div>
                            <Label className="text-gray-300 text-xs">Plist File</Label>
                            <FileUpload
                              accept=".plist"
                              onFilesSelected={setPlistFiles}
                              placeholder="Plist file"
                              className="border-dashed border-green-400/50 bg-green-500/10"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="flex items-center space-x-2">
                            <Checkbox id="removeWatch" checked={removeWatch} onCheckedChange={setRemoveWatch} />
                            <Label htmlFor="removeWatch" className="text-gray-300 text-xs">Remove Watch</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox id="thinBinaries" checked={thinBinaries} onCheckedChange={setThinBinaries} />
                            <Label htmlFor="thinBinaries" className="text-gray-300 text-xs">Thin binaries</Label>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Action Panel */}
              <Card className="border-white/20 bg-gradient-to-br from-purple-500/20 to-pink-500/20 backdrop-blur-xl sticky top-6">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-white">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    Sign Application
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button
                      type="submit"
                      disabled={!isFormValid()}
                      className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-medium"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4 mr-2" />
                          Start Signing
                        </>
                      )}
                    </Button>
                    
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full border-white/20 text-gray-300 hover:bg-white/10"
                    >
                      Test Configuration
                    </Button>
                  </div>
                  
                  <Separator className="bg-white/20" />
                  
                  <div className="text-xs text-gray-400 space-y-1">
                    <p>• Supports IPA files up to 500MB</p>
                    <p>• Real zsign integration</p>
                    <p>• Over-the-air installation</p>
                  </div>
                </CardContent>
              </Card>

              {/* Status Card */}
              {(progress || error) && (
                <Card className="border-white/20 bg-white/5 backdrop-blur-xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-white">
                      {progress?.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-400" />}
                      {progress?.status === 'failed' && <XCircle className="w-5 h-5 text-red-400" />}
                      {progress?.status === 'processing' && <Loader2 className="w-5 h-5 animate-spin text-blue-400" />}
                      {error && <AlertCircle className="w-5 h-5 text-red-400" />}
                      Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {progress && (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm text-gray-300">
                            <span>{progress.message}</span>
                            <span>{progress.progress}%</span>
                          </div>
                          <Progress 
                            value={progress.progress} 
                            className="h-2 bg-white/20" 
                          />
                        </div>
                        
                        {progress.status === 'completed' && progress.result && (
                          <>
                            <Separator className="bg-white/20" />
                            <div className="space-y-3">
                              <div className="text-sm text-gray-300">
                                <p className="font-medium text-green-400">✅ Signing Complete!</p>
                                <p>App: {progress.result.metadata.bundleName}</p>
                                <p>Bundle ID: {progress.result.metadata.bundleId}</p>
                              </div>
                              <div className="space-y-2">
                                <Button asChild className="w-full bg-green-600 hover:bg-green-700">
                                  <a href={progress.result.signedIpaUrl} download>
                                    <Download className="w-4 h-4 mr-2" />
                                    Download IPA
                                  </a>
                                </Button>
                                <Button asChild variant="outline" className="w-full border-white/20 text-gray-300">
                                  <a href={progress.result.installLink}>
                                    <Smartphone className="w-4 h-4 mr-2" />
                                    Install on Device
                                  </a>
                                </Button>
                              </div>
                              <Button onClick={resetForm} variant="ghost" className="w-full text-gray-400 hover:text-white">
                                Sign Another App
                              </Button>
                            </div>
                          </>
                        )}
                      </>
                    )}
                    
                    {error && (
                      <Alert className="bg-red-500/20 border-red-500/50">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-red-200">{error}</AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
