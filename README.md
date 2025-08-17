# Advanced IPA Signer

A production-ready web application for signing iOS IPA files with certificates and advanced modification options.

## Features

### Core Functionality
- **IPA Signing**: Upload IPA files or provide URLs for remote files
- **Certificate Management**: Support for P12 certificates and mobile provision files
- **File Storage**: Secure backend storage for IPA files and certificates
- **Progress Tracking**: Real-time progress updates during signing process
- **Download & Install**: Direct download and over-the-air installation links

### Advanced Options
- **Basic Signing**: Custom bundle ID, app name, version, compression levels
- **Signing Flags**: Weak signing, ad-hoc signing, debug mode, force overwrite
- **Cyan Modifications**: Support for cyan files, tweaks, custom icons, and plist files
- **Bundle Modifications**: Remove components, thin binaries, custom entitlements

## Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS + Shadcn/ui
- **Backend**: Express.js + Multer for file uploads
- **File Storage**: Local filesystem with organized job structure
- **UI Components**: Modern, accessible components with dark/light theme support

## API Endpoints

### File Management
- `POST /api/files/upload` - Upload single file
- `POST /api/files/upload-multiple` - Upload multiple files
- `GET /api/files/:fileId` - Get file information
- `GET /api/files/:fileId/download` - Download file
- `DELETE /api/files/:fileId` - Delete file

### IPA Signing
- `POST /api/sign` - Submit signing job with files and options
- `GET /api/sign/progress/:jobId` - Check signing progress
- `DELETE /api/sign/:jobId` - Cancel signing job
- `GET /api/manifest/:jobId` - Download installation manifest

## File Types Supported

### Required Files
- **IPA Files**: `.ipa` (iOS application packages)
- **P12 Certificates**: `.p12`, `.pfx` (signing certificates)
- **Mobile Provisions**: `.mobileprovision`, `.provisionprofile`

### Optional Files
- **Cyan Files**: `.cyan` (modification files)
- **Tweak Files**: `.dylib`, `.framework`, `.bundle`
- **Icons**: `.png`, `.jpg`, `.jpeg` (custom app icons)
- **Plist Files**: `.plist` (custom property lists)
- **Entitlements**: Custom entitlements files

## Usage

### Basic Signing
1. Upload an IPA file or provide a URL
2. Upload P12 certificate and mobile provision files
3. Optionally provide P12 password
4. Click "Start Signing Process"

### Advanced Signing
1. Enable "Advanced Options"
2. Configure basic signing options (bundle ID, name, version)
3. Set signing flags as needed
4. Upload additional files for cyan modifications
5. Configure cyan options and boolean flags
6. Submit the signing job

### Monitoring Progress
- Real-time progress updates with percentage and status messages
- Success indicators with download and installation links
- Error handling with detailed error messages

## File Storage Structure

```
uploads/
├── jobs/
│   └── [job-id]/
│       ├── input-files/
│       └── output-files/
└── temp/
    └── [file-uploads]
```

## Security Features

- File type validation based on MIME types and extensions
- File size limits (500MB default)
- Unique file naming to prevent conflicts
- Secure file storage with organized directory structure
- Input validation for all form fields

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start
```

## Configuration

### Environment Variables
- `PING_MESSAGE` - Custom ping response message
- `BASE_URL` - Base URL for manifest generation (defaults to localhost:8080)

### File Limits
- Maximum file size: 500MB
- Maximum files per upload: 10 (for multiple file uploads)
- Supported compression levels: 0-9

## Production Deployment

The application is ready for production deployment with:
- Proper error handling and validation
- File cleanup and management
- Progress tracking and job management
- Secure file storage
- Mobile-responsive UI

For production use, consider:
- Using a proper database instead of in-memory storage
- Implementing user authentication
- Adding file encryption
- Setting up proper logging
- Configuring reverse proxy for file serving
- Implementing rate limiting

## API Documentation

All API endpoints return JSON responses with the following structure:

```typescript
// Success Response
{
  success: true,
  data: any // endpoint-specific data
}

// Error Response
{
  success: false,
  error: string // error message
}
```

See `shared/api.ts` for complete TypeScript interface definitions.
