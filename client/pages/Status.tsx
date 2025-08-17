import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, AlertCircle, RefreshCw, Server, Shield, FileText } from 'lucide-react';

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

interface Capabilities {
  realSigning: {
    available: boolean;
    features: string[];
    requirements: string[];
  };
  mockSigning: {
    available: boolean;
    features: string[];
    note: string;
  };
  supportedFormats: {
    ipa: string[];
    certificates: string[];
    provisions: string[];
    additional: string[];
  };
}

export default function Status() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');

  const fetchStatus = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [healthRes, capRes] = await Promise.all([
        fetch('/api/health'),
        fetch('/api/capabilities')
      ]);
      
      if (!healthRes.ok || !capRes.ok) {
        throw new Error('Failed to fetch status');
      }
      
      const healthData = await healthRes.json();
      const capData = await capRes.json();
      
      setHealth(healthData);
      setCapabilities(capData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-4">
            System Status
          </h1>
          <p className="text-gray-600 text-lg">
            Monitor IPA signing service health and capabilities
          </p>
        </div>

        {error && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-red-700">
                <XCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Overall Health Status */}
        {health && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-3">
                {getStatusIcon(health.status)}
                System Health
                <Badge className={getStatusColor(health.status)}>
                  {health.status.toUpperCase()}
                </Badge>
              </CardTitle>
              <CardDescription>{health.message}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Server className="w-4 h-4" />
                  <span className="font-medium">File System:</span>
                  {health.services.fileSystem ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  <span className="font-medium">Certificates:</span>
                  {health.services.certificates ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span className="font-medium">IPA Processing:</span>
                  {health.services.signing ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Features Status */}
        {health && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Real Signing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  {health.features.realSigning ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Available
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        Unavailable
                      </Badge>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {health.features.realSigning 
                    ? 'Full P12 certificate processing and IPA signing'
                    : 'Real signing disabled - dependencies missing'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Mock Signing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 mb-2">
                  {health.features.mockSigning ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <Badge className="bg-green-100 text-green-800 border-green-200">
                        Available
                      </Badge>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-500" />
                      <Badge className="bg-red-100 text-red-800 border-red-200">
                        Unavailable
                      </Badge>
                    </>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  Development and testing mode for UI validation
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Capabilities */}
        {capabilities && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Signing Capabilities</CardTitle>
              <CardDescription>
                Supported file formats and signing features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Supported File Formats</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <span className="text-sm font-medium text-gray-700">IPA Files:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {capabilities.supportedFormats.ipa.map(format => (
                        <Badge key={format} variant="outline" className="text-xs">
                          {format}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Certificates:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {capabilities.supportedFormats.certificates.map(format => (
                        <Badge key={format} variant="outline" className="text-xs">
                          {format}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Provisions:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {capabilities.supportedFormats.provisions.map(format => (
                        <Badge key={format} variant="outline" className="text-xs">
                          {format}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-700">Additional:</span>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {capabilities.supportedFormats.additional.map(format => (
                        <Badge key={format} variant="outline" className="text-xs">
                          {format}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Real Signing Features</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {capabilities.realSigning.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-center gap-4">
          <Button onClick={fetchStatus} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
          <Button asChild>
            <a href="/">
              Return to Signer
            </a>
          </Button>
        </div>
      </div>
    </div>
  );
}
