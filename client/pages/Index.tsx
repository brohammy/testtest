import { useState, useEffect } from 'react';
import { FileUpload } from '@/components/FileUpload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Download, 
  Smartphone, 
  CheckCircle, 
  XCircle,
  AlertCircle,
  Loader2
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
  const [buildVersion, setBuildVersion] = useState('');
  const [customEntitlements, setCustomEntitlements] = useState('');
  
  // Cyan options
  const [enable3dTouch, setEnable3dTouch] = useState(false);
  const [enableAssistiveTouch, setEnableAssistiveTouch] = useState(false);
  const [skipSetup, setSkipSetup] = useState(false);
  const [hideRespringLogo, setHideRespringLogo] = useState(false);
  const [enableInternalOptions, setEnableInternalOptions] = useState(false);
  const [enableInternalStorage, setEnableInternalStorage] = useState(false);
  
  // Advanced modifications
  const [removeAppRestrictions, setRemoveAppRestrictions] = useState(false);
  const [enableFileSharing, setEnableFileSharing] = useState(false);
  const [disableLibraryValidation, setDisableLibraryValidation] = useState(false);
  const [enableDebugging, setEnableDebugging] = useState(false);
  const [enableBackgroundProcessing, setEnableBackgroundProcessing] = useState(false);
  const [skipSignatureVerification, setSkipSignatureVerification] = useState(false);
  
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
      if (buildVersion) formData.append('buildVersion', buildVersion);
      if (customEntitlements) formData.append('entitlements', customEntitlements);
      
      // Add cyan options
      if (enable3dTouch) formData.append('enable3dTouch', 'true');
      if (enableAssistiveTouch) formData.append('enableAssistiveTouch', 'true');
      if (skipSetup) formData.append('skipSetup', 'true');
      if (hideRespringLogo) formData.append('hideRespringLogo', 'true');
      if (enableInternalOptions) formData.append('enableInternalOptions', 'true');
      if (enableInternalStorage) formData.append('enableInternalStorage', 'true');
      
      // Add advanced modifications
      if (removeAppRestrictions) formData.append('removeAppRestrictions', 'true');
      if (enableFileSharing) formData.append('enableFileSharing', 'true');
      if (disableLibraryValidation) formData.append('disableLibraryValidation', 'true');
      if (enableDebugging) formData.append('enableDebugging', 'true');
      if (enableBackgroundProcessing) formData.append('enableBackgroundProcessing', 'true');
      if (skipSignatureVerification) formData.append('skipSignatureVerification', 'true');
      
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      color: '#2d3748'
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        background: 'rgba(255, 255, 255, 0.98)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          padding: '40px',
          textAlign: 'center',
          color: 'white'
        }}>
          <h1 style={{
            fontSize: '2.8rem',
            fontWeight: '800',
            marginBottom: '12px',
            textShadow: '0 4px 8px rgba(0, 0, 0, 0.2)'
          }}>
            Advanced IPA Signer
          </h1>
          <p style={{
            fontSize: '1.2rem',
            opacity: '0.9',
            fontWeight: '300'
          }}>
            Complete signing solution with Cyan modifications and advanced options
          </p>
        </div>

        {/* Main Content */}
        <div style={{ padding: '40px' }}>
          <form onSubmit={handleSubmit}>
            {/* IPA Source Selection */}
            <div style={{
              marginBottom: '35px',
              padding: '25px',
              border: '2px solid #e2e8f0',
              borderRadius: '16px',
              background: 'linear-gradient(145deg, #f8fafc 0%, #ffffff 100%)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease'
            }}>
              <h3 style={{
                color: '#2d3748',
                fontSize: '1.4rem',
                fontWeight: '700',
                marginBottom: '25px',
                paddingBottom: '15px',
                borderBottom: '3px solid #667eea',
                display: 'flex',
                alignItems: 'center'
              }}>
                <svg style={{ width: '24px', height: '24px', marginRight: '12px', fill: '#667eea' }} viewBox="0 0 24 24">
                  <path d="M12,2A3,3 0 0,1 15,5V7H16A2,2 0 0,1 18,9V19A2,2 0 0,1 16,21H8A2,2 0 0,1 6,19V9A2,2 0 0,1 8,7H9V5A3,3 0 0,1 12,2Z" />
                </svg>
                IPA Source
              </h3>
              
              <Tabs value={ipaSource} onValueChange={(v) => setIpaSource(v as 'file' | 'url')}>
                <TabsList style={{
                  display: 'flex',
                  marginBottom: '25px',
                  background: '#f1f5f9',
                  borderRadius: '12px',
                  padding: '6px',
                  border: '2px solid #e2e8f0'
                }}>
                  <TabsTrigger 
                    value="file" 
                    style={{
                      flex: '1',
                      padding: '12px 20px',
                      background: ipaSource === 'file' ? 'white' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      color: ipaSource === 'file' ? '#667eea' : '#718096',
                      boxShadow: ipaSource === 'file' ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none',
                      transform: ipaSource === 'file' ? 'translateY(-1px)' : 'none'
                    }}
                  >
                    Upload File
                  </TabsTrigger>
                  <TabsTrigger 
                    value="url"
                    style={{
                      flex: '1',
                      padding: '12px 20px',
                      background: ipaSource === 'url' ? 'white' : 'transparent',
                      border: 'none',
                      borderRadius: '8px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: 'all 0.3s ease',
                      color: ipaSource === 'url' ? '#667eea' : '#718096',
                      boxShadow: ipaSource === 'url' ? '0 4px 12px rgba(0, 0, 0, 0.1)' : 'none',
                      transform: ipaSource === 'url' ? 'translateY(-1px)' : 'none'
                    }}
                  >
                    From URL
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="file">
                  <div style={{ marginBottom: '25px' }}>
                    <Label style={{
                      display: 'block',
                      fontWeight: '600',
                      color: '#2d3748',
                      marginBottom: '10px',
                      fontSize: '1rem'
                    }}>
                      IPA File (.ipa) *
                    </Label>
                    <FileUpload
                      accept=".ipa"
                      onFilesSelected={setIpaFiles}
                      placeholder="Choose or drag & drop IPA file (max 5GB)"
                      required
                    />
                  </div>
                </TabsContent>
                
                <TabsContent value="url">
                  <div style={{ marginBottom: '25px' }}>
                    <Label htmlFor="ipaUrl" style={{
                      display: 'block',
                      fontWeight: '600',
                      color: '#2d3748',
                      marginBottom: '10px',
                      fontSize: '1rem'
                    }}>
                      IPA URL *
                    </Label>
                    <Input
                      id="ipaUrl"
                      type="url"
                      value={ipaUrl}
                      onChange={(e) => setIpaUrl(e.target.value)}
                      placeholder="https://example.com/app.ipa"
                      style={{
                        width: '100%',
                        padding: '14px 18px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        background: '#fff',
                        transition: 'all 0.3s ease',
                        outline: 'none',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
                      }}
                      required={ipaSource === 'url'}
                    />
                    <small style={{
                      color: '#718096',
                      marginTop: '8px',
                      display: 'block'
                    }}>
                      Direct link to .ipa file with proper CORS headers
                    </small>
                  </div>
                </TabsContent>
              </Tabs>
            </div>

            {/* Required Certificates */}
            <div style={{
              marginBottom: '35px',
              padding: '25px',
              border: '2px solid #e2e8f0',
              borderRadius: '16px',
              background: 'linear-gradient(145deg, #f8fafc 0%, #ffffff 100%)',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              transition: 'all 0.3s ease'
            }}>
              <h3 style={{
                color: '#2d3748',
                fontSize: '1.4rem',
                fontWeight: '700',
                marginBottom: '25px',
                paddingBottom: '15px',
                borderBottom: '3px solid #667eea',
                display: 'flex',
                alignItems: 'center'
              }}>
                <svg style={{ width: '24px', height: '24px', marginRight: '12px', fill: '#667eea' }} viewBox="0 0 24 24">
                  <path d="M7,14A3,3 0 0,0 10,17A3,3 0 0,0 13,14A3,3 0 0,0 10,11A3,3 0 0,0 7,14M10.93,12.5C10.92,12.67 10.92,12.83 10.93,13C10.95,13.33 11.04,13.65 11.2,13.94L9.94,14.68C9.78,14.78 9.74,14.97 9.84,15.13L10.84,16.87C10.94,17.03 11.13,17.07 11.29,16.97L12.55,16.23C12.84,16.39 13.16,16.5 13.5,16.55V17.9C13.5,18.07 13.63,18.2 13.8,18.2H15.8C15.97,18.2 16.1,18.07 16.1,17.9V16.55C16.44,16.5 16.76,16.39 17.05,16.23L18.31,16.97C18.47,17.07 18.66,17.03 18.76,16.87L19.76,15.13C19.86,14.97 19.82,14.78 19.66,14.68L18.4,13.94C18.56,13.65 18.65,13.33 18.67,13C18.68,12.83 18.68,12.67 18.67,12.5C18.65,12.17 18.56,11.85 18.4,11.56L19.66,10.82C19.82,10.72 19.86,10.53 19.76,10.37L18.76,8.63C18.66,8.47 18.47,8.43 18.31,8.53L17.05,9.27C16.76,9.11 16.44,9 16.1,8.95V7.6C16.1,7.43 15.97,7.3 15.8,7.3H13.8C13.63,7.3 13.5,7.43 13.5,7.6V8.95C13.16,9 12.84,9.11 12.55,9.27L11.29,8.53C11.13,8.43 10.94,8.47 10.84,8.63L9.84,10.37C9.74,10.53 9.78,10.72 9.94,10.82L11.2,11.56C11.04,11.85 10.95,12.17 10.93,12.5M14.8,12C14.8,11.34 15.34,10.8 16,10.8A1.2,1.2 0 0,1 17.2,12A1.2,1.2 0 0,1 16,13.2C15.34,13.2 14.8,12.66 14.8,12Z" />
                </svg>
                Signing Certificates
              </h3>
              
              <div style={{ marginBottom: '25px' }}>
                <Label style={{
                  display: 'block',
                  fontWeight: '600',
                  color: '#2d3748',
                  marginBottom: '10px',
                  fontSize: '1rem'
                }}>
                  P12 Certificate (.p12) *
                </Label>
                <FileUpload
                  accept=".p12"
                  onFilesSelected={setP12Files}
                  placeholder="Choose or drag & drop P12 certificate"
                  required
                />
              </div>
              
              <div style={{ marginBottom: '25px' }}>
                <Label style={{
                  display: 'block',
                  fontWeight: '600',
                  color: '#2d3748',
                  marginBottom: '10px',
                  fontSize: '1rem'
                }}>
                  Mobile Provision (.mobileprovision) *
                </Label>
                <FileUpload
                  accept=".mobileprovision"
                  onFilesSelected={setMpFiles}
                  placeholder="Choose or drag & drop mobile provision"
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="password" style={{
                  display: 'block',
                  fontWeight: '600',
                  color: '#2d3748',
                  marginBottom: '10px',
                  fontSize: '1rem'
                }}>
                  P12 Certificate Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={p12Password}
                  onChange={(e) => setP12Password(e.target.value)}
                  placeholder="Enter password if required"
                  style={{
                    width: '100%',
                    padding: '14px 18px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '1rem',
                    background: '#fff',
                    transition: 'all 0.3s ease',
                    outline: 'none',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
                  }}
                />
                <small style={{
                  color: '#718096',
                  marginTop: '8px',
                  display: 'block'
                }}>
                  Leave empty if certificate has no password
                </small>
              </div>
            </div>

            {/* Advanced Options Toggle */}
            <div 
              onClick={() => setShowAdvanced(!showAdvanced)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '40px 0',
                padding: '20px',
                background: 'linear-gradient(145deg, #f1f5f9, #e2e8f0)',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                border: '2px solid #cbd5e0'
              }}
            >
              <span style={{
                fontWeight: '700',
                color: '#475569',
                fontSize: '1.1rem'
              }}>
                {showAdvanced ? 'Hide Advanced Options ▲' : 'Show Advanced Options ▼'}
              </span>
            </div>

            {/* Advanced Options */}
            {showAdvanced && (
              <div>
                {/* Basic Signing Options */}
                <div style={{
                  marginBottom: '35px',
                  padding: '25px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, #f8fafc 0%, #ffffff 100%)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s ease'
                }}>
                  <h3 style={{
                    color: '#2d3748',
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    marginBottom: '25px',
                    paddingBottom: '15px',
                    borderBottom: '3px solid #667eea',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <svg style={{ width: '24px', height: '24px', marginRight: '12px', fill: '#667eea' }} viewBox="0 0 24 24">
                      <path d="M12,15.5A3.5,3.5 0 0,1 8.5,12A3.5,3.5 0 0,1 12,8.5A3.5,3.5 0 0,1 15.5,12A3.5,3.5 0 0,1 12,15.5M19.43,12.97C19.47,12.65 19.5,12.33 19.5,12C19.5,11.67 19.47,11.34 19.43,11L21.54,9.37C21.73,9.22 21.78,8.95 21.66,8.73L19.66,5.27C19.54,5.05 19.27,4.96 19.05,5.05L16.56,6.05C16.04,5.66 15.5,5.32 14.87,5.07L14.5,2.42C14.46,2.18 14.25,2 14,2H10C9.75,2 9.54,2.18 9.5,2.42L9.13,5.07C8.5,5.32 7.96,5.66 7.44,6.05L4.95,5.05C4.73,4.96 4.46,5.05 4.34,5.27L2.34,8.73C2.22,8.95 2.27,9.22 2.46,9.37L4.57,11C4.53,11.34 4.5,11.67 4.5,12C4.5,12.33 4.53,12.65 4.57,12.97L2.46,14.63C2.27,14.78 2.22,15.05 2.34,15.27L4.34,18.73C4.46,18.95 4.73,19.03 4.95,18.95L7.44,17.94C7.96,18.34 8.5,18.68 9.13,18.93L9.5,21.58C9.54,21.82 9.75,22 10,22H14C14.25,22 14.46,21.82 14.5,21.58L14.87,18.93C15.5,18.68 16.04,18.34 16.56,17.94L19.05,18.95C19.27,19.03 19.54,18.95 19.66,18.73L21.66,15.27C21.78,15.05 21.73,14.78 21.54,14.63L19.43,12.97Z" />
                    </svg>
                    Basic Signing Options
                  </h3>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <Label htmlFor="bundleId" style={{
                        display: 'block',
                        fontWeight: '600',
                        color: '#2d3748',
                        marginBottom: '10px',
                        fontSize: '1rem'
                      }}>
                        Bundle ID Override
                      </Label>
                      <Input
                        id="bundleId"
                        value={bundleId}
                        onChange={(e) => setBundleId(e.target.value)}
                        placeholder="com.example.app"
                        style={{
                          width: '100%',
                          padding: '14px 18px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          background: '#fff',
                          transition: 'all 0.3s ease',
                          outline: 'none',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="bundleName" style={{
                        display: 'block',
                        fontWeight: '600',
                        color: '#2d3748',
                        marginBottom: '10px',
                        fontSize: '1rem'
                      }}>
                        App Name Override
                      </Label>
                      <Input
                        id="bundleName"
                        value={bundleName}
                        onChange={(e) => setBundleName(e.target.value)}
                        placeholder="My App"
                        style={{
                          width: '100%',
                          padding: '14px 18px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          background: '#fff',
                          transition: 'all 0.3s ease',
                          outline: 'none',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
                        }}
                      />
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <Label htmlFor="bundleVersion" style={{
                        display: 'block',
                        fontWeight: '600',
                        color: '#2d3748',
                        marginBottom: '10px',
                        fontSize: '1rem'
                      }}>
                        Version Override
                      </Label>
                      <Input
                        id="bundleVersion"
                        value={bundleVersion}
                        onChange={(e) => setBundleVersion(e.target.value)}
                        placeholder="1.0.0"
                        style={{
                          width: '100%',
                          padding: '14px 18px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          background: '#fff',
                          transition: 'all 0.3s ease',
                          outline: 'none',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
                        }}
                      />
                    </div>
                    <div>
                      <Label htmlFor="buildVersion" style={{
                        display: 'block',
                        fontWeight: '600',
                        color: '#2d3748',
                        marginBottom: '10px',
                        fontSize: '1rem'
                      }}>
                        Build Version Override
                      </Label>
                      <Input
                        id="buildVersion"
                        value={buildVersion}
                        onChange={(e) => setBuildVersion(e.target.value)}
                        placeholder="1"
                        style={{
                          width: '100%',
                          padding: '14px 18px',
                          border: '2px solid #e2e8f0',
                          borderRadius: '12px',
                          fontSize: '1rem',
                          background: '#fff',
                          transition: 'all 0.3s ease',
                          outline: 'none',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Cyan Options */}
                <div style={{
                  marginBottom: '35px',
                  padding: '25px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, #f8fafc 0%, #ffffff 100%)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s ease'
                }}>
                  <h3 style={{
                    color: '#2d3748',
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    marginBottom: '25px',
                    paddingBottom: '15px',
                    borderBottom: '3px solid #667eea',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <svg style={{ width: '24px', height: '24px', marginRight: '12px', fill: '#667eea' }} viewBox="0 0 24 24">
                      <path d="M12,2C6.48,2 2,6.48 2,12C2,17.52 6.48,22 12,22C17.52,22 22,17.52 22,12C22,6.48 17.52,2 12,2M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,6C8.69,6 6,8.69 6,12C6,15.31 8.69,18 12,18C15.31,18 18,15.31 18,12C18,8.69 15.31,6 12,6M12,16C9.79,16 8,14.21 8,12C8,9.79 9.79,8 12,8C14.21,8 16,9.79 16,12C16,14.21 14.21,16 12,16Z" />
                    </svg>
                    Cyan Options
                  </h3>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    marginTop: '15px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease'
                    }}>
                      <Checkbox 
                        id="enable3dTouch" 
                        checked={enable3dTouch} 
                        onCheckedChange={setEnable3dTouch}
                        style={{ marginRight: '12px', transform: 'scale(1.3)' }}
                      />
                      <Label htmlFor="enable3dTouch" style={{
                        fontWeight: '500',
                        margin: '0',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}>
                        Enable 3D Touch
                      </Label>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease'
                    }}>
                      <Checkbox 
                        id="enableAssistiveTouch" 
                        checked={enableAssistiveTouch} 
                        onCheckedChange={setEnableAssistiveTouch}
                        style={{ marginRight: '12px', transform: 'scale(1.3)' }}
                      />
                      <Label htmlFor="enableAssistiveTouch" style={{
                        fontWeight: '500',
                        margin: '0',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}>
                        Enable Assistive Touch
                      </Label>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease'
                    }}>
                      <Checkbox 
                        id="skipSetup" 
                        checked={skipSetup} 
                        onCheckedChange={setSkipSetup}
                        style={{ marginRight: '12px', transform: 'scale(1.3)' }}
                      />
                      <Label htmlFor="skipSetup" style={{
                        fontWeight: '500',
                        margin: '0',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}>
                        Skip Setup Experience
                      </Label>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease'
                    }}>
                      <Checkbox 
                        id="hideRespringLogo" 
                        checked={hideRespringLogo} 
                        onCheckedChange={setHideRespringLogo}
                        style={{ marginRight: '12px', transform: 'scale(1.3)' }}
                      />
                      <Label htmlFor="hideRespringLogo" style={{
                        fontWeight: '500',
                        margin: '0',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}>
                        Hide Respring Logo
                      </Label>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease'
                    }}>
                      <Checkbox 
                        id="enableInternalOptions" 
                        checked={enableInternalOptions} 
                        onCheckedChange={setEnableInternalOptions}
                        style={{ marginRight: '12px', transform: 'scale(1.3)' }}
                      />
                      <Label htmlFor="enableInternalOptions" style={{
                        fontWeight: '500',
                        margin: '0',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}>
                        Enable Internal Options
                      </Label>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease'
                    }}>
                      <Checkbox 
                        id="enableInternalStorage" 
                        checked={enableInternalStorage} 
                        onCheckedChange={setEnableInternalStorage}
                        style={{ marginRight: '12px', transform: 'scale(1.3)' }}
                      />
                      <Label htmlFor="enableInternalStorage" style={{
                        fontWeight: '500',
                        margin: '0',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}>
                        Enable Internal Storage
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Advanced Modifications */}
                <div style={{
                  marginBottom: '35px',
                  padding: '25px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, #f8fafc 0%, #ffffff 100%)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s ease'
                }}>
                  <h3 style={{
                    color: '#2d3748',
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    marginBottom: '25px',
                    paddingBottom: '15px',
                    borderBottom: '3px solid #667eea',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <svg style={{ width: '24px', height: '24px', marginRight: '12px', fill: '#667eea' }} viewBox="0 0 24 24">
                      <path d="M17.63,5.84C17.27,5.33 16.67,5 16,5L5,5.01C3.9,5.01 3,5.9 3,7V17C3,18.1 3.9,19 5,19H16C16.67,19 17.27,18.67 17.63,18.16L22,12L17.63,5.84M16,17H5V7H16L19.55,12L16,17Z" />
                    </svg>
                    Advanced Modifications
                  </h3>
                  
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '20px',
                    marginTop: '15px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease'
                    }}>
                      <Checkbox 
                        id="removeAppRestrictions" 
                        checked={removeAppRestrictions} 
                        onCheckedChange={setRemoveAppRestrictions}
                        style={{ marginRight: '12px', transform: 'scale(1.3)' }}
                      />
                      <Label htmlFor="removeAppRestrictions" style={{
                        fontWeight: '500',
                        margin: '0',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}>
                        Remove App Restrictions
                      </Label>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease'
                    }}>
                      <Checkbox 
                        id="enableFileSharing" 
                        checked={enableFileSharing} 
                        onCheckedChange={setEnableFileSharing}
                        style={{ marginRight: '12px', transform: 'scale(1.3)' }}
                      />
                      <Label htmlFor="enableFileSharing" style={{
                        fontWeight: '500',
                        margin: '0',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}>
                        Enable File Sharing
                      </Label>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease'
                    }}>
                      <Checkbox 
                        id="disableLibraryValidation" 
                        checked={disableLibraryValidation} 
                        onCheckedChange={setDisableLibraryValidation}
                        style={{ marginRight: '12px', transform: 'scale(1.3)' }}
                      />
                      <Label htmlFor="disableLibraryValidation" style={{
                        fontWeight: '500',
                        margin: '0',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}>
                        Disable Library Validation
                      </Label>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease'
                    }}>
                      <Checkbox 
                        id="enableDebugging" 
                        checked={enableDebugging} 
                        onCheckedChange={setEnableDebugging}
                        style={{ marginRight: '12px', transform: 'scale(1.3)' }}
                      />
                      <Label htmlFor="enableDebugging" style={{
                        fontWeight: '500',
                        margin: '0',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}>
                        Enable Debugging
                      </Label>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease'
                    }}>
                      <Checkbox 
                        id="enableBackgroundProcessing" 
                        checked={enableBackgroundProcessing} 
                        onCheckedChange={setEnableBackgroundProcessing}
                        style={{ marginRight: '12px', transform: 'scale(1.3)' }}
                      />
                      <Label htmlFor="enableBackgroundProcessing" style={{
                        fontWeight: '500',
                        margin: '0',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}>
                        Enable Background Processing
                      </Label>
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      padding: '12px',
                      background: '#f8fafc',
                      borderRadius: '10px',
                      border: '1px solid #e2e8f0',
                      transition: 'all 0.3s ease'
                    }}>
                      <Checkbox 
                        id="skipSignatureVerification" 
                        checked={skipSignatureVerification} 
                        onCheckedChange={setSkipSignatureVerification}
                        style={{ marginRight: '12px', transform: 'scale(1.3)' }}
                      />
                      <Label htmlFor="skipSignatureVerification" style={{
                        fontWeight: '500',
                        margin: '0',
                        cursor: 'pointer',
                        fontSize: '0.95rem'
                      }}>
                        Skip Signature Verification
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Custom Entitlements */}
                <div style={{
                  marginBottom: '35px',
                  padding: '25px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '16px',
                  background: 'linear-gradient(145deg, #f8fafc 0%, #ffffff 100%)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                  transition: 'all 0.3s ease'
                }}>
                  <h3 style={{
                    color: '#2d3748',
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    marginBottom: '25px',
                    paddingBottom: '15px',
                    borderBottom: '3px solid #667eea',
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <svg style={{ width: '24px', height: '24px', marginRight: '12px', fill: '#667eea' }} viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z" />
                    </svg>
                    Custom Entitlements
                  </h3>
                  
                  <div>
                    <Label htmlFor="customEntitlements" style={{
                      display: 'block',
                      fontWeight: '600',
                      color: '#2d3748',
                      marginBottom: '10px',
                      fontSize: '1rem'
                    }}>
                      Custom Entitlements (plist XML)
                    </Label>
                    <Textarea
                      id="customEntitlements"
                      value={customEntitlements}
                      onChange={(e) => setCustomEntitlements(e.target.value)}
                      placeholder={`<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Add your custom entitlements here -->
</dict>
</plist>`}
                      style={{
                        width: '100%',
                        padding: '14px 18px',
                        border: '2px solid #e2e8f0',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        background: '#fff',
                        transition: 'all 0.3s ease',
                        outline: 'none',
                        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.02)',
                        resize: 'vertical',
                        minHeight: '100px',
                        fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace'
                      }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Sign Button */}
            <Button
              type="submit"
              disabled={!isFormValid()}
              style={{
                width: '100%',
                padding: '20px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontSize: '1.2rem',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginTop: '40px',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Sign IPA File'
              )}
            </Button>

            {/* Progress Container */}
            {progress && (
              <div style={{
                marginTop: '40px',
                padding: '30px',
                background: 'linear-gradient(145deg, #f8fafc, #ffffff)',
                borderRadius: '16px',
                border: '2px solid #e2e8f0'
              }}>
                <div style={{
                  width: '100%',
                  height: '12px',
                  background: '#e2e8f0',
                  borderRadius: '6px',
                  overflow: 'hidden',
                  marginBottom: '20px',
                  boxShadow: 'inset 0 2px 4px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{
                    height: '100%',
                    background: 'linear-gradient(90deg, #667eea, #764ba2)',
                    width: `${progress.progress}%`,
                    transition: 'width 0.5s ease',
                    borderRadius: '6px',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                  }} />
                </div>
                <div style={{
                  textAlign: 'center',
                  color: '#475569',
                  fontWeight: '600',
                  fontSize: '1.1rem'
                }}>
                  {progress.message}
                </div>
              </div>
            )}

            {/* Results Container */}
            {progress?.status === 'completed' && progress.result && (
              <div style={{
                marginTop: '40px',
                padding: '30px',
                background: 'linear-gradient(145deg, #f0fdf4, #dcfce7)',
                border: '2px solid #bbf7d0',
                borderRadius: '16px',
                boxShadow: '0 8px 25px rgba(34, 197, 94, 0.1)'
              }}>
                <h3 style={{
                  color: '#166534',
                  fontSize: '1.5rem',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  ✅ Signing Complete!
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px',
                  marginBottom: '25px'
                }}>
                  <p style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '8px',
                    fontWeight: '500'
                  }}>
                    <strong style={{ color: '#166534' }}>File:</strong> {progress.result.metadata.bundleName}
                  </p>
                  <p style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '8px',
                    fontWeight: '500'
                  }}>
                    <strong style={{ color: '#166534' }}>Size:</strong> {formatFileSize(progress.result.metadata.fileSize)}
                  </p>
                  <p style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '8px',
                    fontWeight: '500'
                  }}>
                    <strong style={{ color: '#166534' }}>Bundle ID:</strong> {progress.result.metadata.bundleId}
                  </p>
                  <p style={{
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    borderRadius: '8px',
                    fontWeight: '500'
                  }}>
                    <strong style={{ color: '#166534' }}>Version:</strong> {progress.result.metadata.bundleVersion}
                  </p>
                </div>
                
                <div style={{ display: 'flex', gap: '20px', marginTop: '25px' }}>
                  <a
                    href={progress.result.signedIpaUrl}
                    download
                    style={{
                      flex: '1',
                      padding: '16px 24px',
                      background: '#22c55e',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '12px',
                      textAlign: 'center',
                      fontWeight: '700',
                      transition: 'all 0.3s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    <Download className="w-4 h-4 mr-2 inline" />
                    Download IPA
                  </a>
                  <a
                    href={progress.result.installLink}
                    style={{
                      flex: '1',
                      padding: '16px 24px',
                      background: '#22c55e',
                      color: 'white',
                      textDecoration: 'none',
                      borderRadius: '12px',
                      textAlign: 'center',
                      fontWeight: '700',
                      transition: 'all 0.3s ease',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    <Smartphone className="w-4 h-4 mr-2 inline" />
                    Install via Manifest
                  </a>
                </div>
                
                <Button 
                  onClick={resetForm}
                  style={{
                    width: '100%',
                    marginTop: '20px',
                    background: 'transparent',
                    color: '#166534',
                    border: '2px solid #166534'
                  }}
                >
                  Sign Another App
                </Button>
              </div>
            )}

            {/* Error Container */}
            {error && (
              <div style={{
                marginTop: '40px',
                padding: '30px',
                background: 'linear-gradient(145deg, #fef2f2, #fee2e2)',
                border: '2px solid #fecaca',
                borderRadius: '16px',
                color: '#dc2626',
                boxShadow: '0 8px 25px rgba(220, 38, 38, 0.1)'
              }}>
                <h3 style={{
                  fontSize: '1.5rem',
                  marginBottom: '15px',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  ❌ Signing Failed
                </h3>
                <p>{error}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}
