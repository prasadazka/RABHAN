import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Download, 
  AlertTriangle, 
  Eye,
  ImageIcon,
  FileIcon
} from 'lucide-react';

interface Document {
  id: string;
  type: string;
  filename: string;
  uploadDate: string;
  status: 'pending' | 'approved' | 'rejected';
  size: number;
  url: string;
}

interface DocumentViewerProps {
  document: Document;
}

export function DocumentViewer({ document: documentData }: DocumentViewerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);

  // Extract file extension and determine if it's an image
  const getFileExtension = (filename: string) => {
    return filename.split('.').pop()?.toLowerCase() || '';
  };

  const isImage = (filename: string) => {
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
    return imageExtensions.includes(getFileExtension(filename));
  };

  const isPDF = (filename: string) => {
    return getFileExtension(filename) === 'pdf';
  };

  useEffect(() => {
    const loadDocument = async () => {
      setLoading(true);
      setError(null);
      
      try {
        console.log('Loading document:', documentData);
        
        // Check if we have the basic document data
        if (!documentData || !documentData.filename) {
          setError('Document information is incomplete');
          setDocumentUrl(null);
          return;
        }
        
        // Try to load the actual decrypted image from our decryption service
        if (isImage(documentData.filename)) {
          try {
            // Try to load the actual decrypted image
            const previewUrl = `http://localhost:3007/api/documents/preview/${documentData.id}`;
            
            // Test if the decryption service is available and can decrypt the image
            const testResponse = await fetch(previewUrl, { method: 'HEAD' });
            
            if (testResponse.ok) {
              // Service is available and can decrypt the image
              setDocumentUrl(previewUrl);
              setError(null);
            } else {
              // Fallback to placeholder if decryption service is unavailable
              throw new Error('Decryption service unavailable');
            }
          } catch (decryptError) {
            console.log('Using placeholder for image:', decryptError.message);
            
            // Create a placeholder image that shows document info
            const canvas = document.createElement('canvas');
            canvas.width = 400;
            canvas.height = 300;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              setError('Cannot create document preview');
              setDocumentUrl(null);
              return;
            }
            
            // Draw a nice background
            ctx.fillStyle = '#f8f9fa';
            ctx.fillRect(0, 0, 400, 300);
            
            // Draw border
            ctx.strokeStyle = '#3eb2b1';
            ctx.lineWidth = 2;
            ctx.strokeRect(10, 10, 380, 280);
            
            // Draw icon
            ctx.fillStyle = '#3eb2b1';
            ctx.font = '48px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('🖼️', 200, 100);
            
            // Draw filename
            ctx.fillStyle = '#333';
            ctx.font = '16px Arial';
            const filename = documentData.filename || 'Unknown file';
            ctx.fillText(filename, 200, 150);
            
            // Draw info
            ctx.font = '12px Arial';
            ctx.fillStyle = '#666';
            ctx.fillText('Encrypted document stored securely', 200, 180);
            
            const size = documentData.size || 0;
            ctx.fillText(`Size: ${(size / 1024).toFixed(1)} KB`, 200, 200);
            
            const uploadDate = documentData.uploadDate || documentData.created_at || new Date();
            ctx.fillText(`Uploaded: ${new Date(uploadDate).toLocaleDateString()}`, 200, 220);
            
            const dataUrl = canvas.toDataURL();
            setDocumentUrl(dataUrl);
            setError(null);
          }
        } else if (isPDF(documentData.filename)) {
          setError('PDF documents are stored encrypted and require special decryption to view. Document metadata is available below.');
          setDocumentUrl(null);
        } else {
          setError(`${getFileExtension(documentData.filename).toUpperCase()} files are stored securely. Document information is available below.`);
          setDocumentUrl(null);
        }
      } catch (err) {
        console.error('Error loading document:', err);
        console.error('Document data:', documentData);
        setError(`Failed to process document: ${err.message}`);
        setDocumentUrl(null);
      } finally {
        setLoading(false);
      }
    };

    if (documentData) {
      loadDocument();
    }
  }, [documentData]);

  const handleDownload = async () => {
    try {
      const filename = documentData?.filename || 'Unknown file';
      
      // Try to download the actual decrypted file
      try {
        const downloadUrl = `http://localhost:3007/api/documents/preview/${documentData.id}`;
        const response = await fetch(downloadUrl);
        
        if (response.ok) {
          // Create download link
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          return;
        }
      } catch (downloadError) {
        console.log('Direct download failed:', downloadError.message);
      }
      
      // Fallback: Show document information
      const size = documentData?.size || 0;
      const uploadDate = documentData?.uploadDate || documentData?.created_at || new Date();
      const status = documentData?.status || 'unknown';
      
      const info = `Document Information:
      
📄 File: ${filename}
📏 Size: ${(size / 1024).toFixed(1)} KB
📅 Uploaded: ${new Date(uploadDate).toLocaleDateString()}
📋 Status: ${status.charAt(0).toUpperCase() + status.slice(1)}
🔐 Security: Encrypted storage

Document is available for download. Decryption service is configured for admin access.`;
      
      alert(info);
    } catch (err) {
      console.error('Error processing download request:', err);
      console.error('Document data:', documentData);
      alert('Failed to process download request. Please try again later.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-muted-foreground border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm text-muted-foreground">Loading document...</p>
        </div>
      </div>
    );
  }

  if (error && !documentUrl) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4 text-center">
          <FileText className="w-12 h-12" style={{ color: '#3eb2b1' }} />
          <div>
            <h3 className="text-lg font-semibold">
              Document Available
            </h3>
            <p className="text-sm text-muted-foreground mt-1 max-w-md">
              {error}
            </p>
          </div>
          <button
            onClick={handleDownload}
            className="btn-secondary flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Document Info
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Document Info Header */}
      <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-muted/10">
        <div className="flex items-center gap-3">
          {isImage(documentData.filename) ? (
            <ImageIcon className="w-6 h-6" style={{ color: '#3eb2b1' }} />
          ) : (
            <FileIcon className="w-6 h-6" style={{ color: '#3eb2b1' }} />
          )}
          <div>
            <h4 className="font-semibold">{documentData.filename}</h4>
            <p className="text-sm text-muted-foreground">
              {new Date(documentData.uploadDate || documentData.created_at || new Date()).toLocaleDateString()} • {((documentData.size || 0) / 1024).toFixed(1)} KB
            </p>
          </div>
        </div>
        
        <button
          onClick={handleDownload}
          className="btn-secondary flex items-center gap-2"
          title="Download Document"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
      </div>

      {/* Document Content */}
      <div className="border border-border rounded-lg overflow-hidden">
        {isImage(documentData.filename) && documentUrl ? (
          <div className="relative">
            <img
              src={documentUrl}
              alt={documentData.filename}
              className="w-full h-auto max-h-[600px] object-contain bg-muted/5"
              onError={(e) => {
                console.error('Image failed to load:', e);
                setError('Failed to load image preview');
              }}
            />
          </div>
        ) : isPDF(documentData.filename) && documentUrl ? (
          <div className="h-[600px]">
            <iframe
              src={documentUrl}
              className="w-full h-full border-0"
              title={documentData.filename}
              onError={(e) => {
                console.error('PDF failed to load:', e);
                setError('Failed to load PDF preview');
              }}
            />
          </div>
        ) : (
          <div className="flex items-center justify-center h-96 bg-muted/5">
            <div className="flex flex-col items-center gap-4 text-center">
              <FileText className="w-16 h-16 text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Preview Not Available</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  This file type cannot be previewed in the browser
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  File type: {getFileExtension(documentData.filename).toUpperCase()} • Size: {((documentData.size || 0) / 1024).toFixed(1)} KB
                </p>
              </div>
              <button
                onClick={handleDownload}
                className="btn-primary flex items-center gap-2"
                style={{ backgroundColor: '#3eb2b1', borderColor: '#3eb2b1' }}
              >
                <Download className="w-4 h-4" />
                Download to View
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Document Status */}
      <div className="flex items-center justify-center p-3 border border-border rounded-lg bg-muted/5">
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: documentData.status === 'approved' ? '#10b981' : 
                             documentData.status === 'rejected' ? '#ef4444' : '#f59e0b'
            }}
          />
          <span className="text-sm font-medium">
            Status: {(documentData.status || 'unknown').charAt(0).toUpperCase() + (documentData.status || 'unknown').slice(1)}
          </span>
          {documentData.status === 'pending' && (
            <span className="text-xs text-muted-foreground ml-2">
              • Awaiting admin review
            </span>
          )}
        </div>
      </div>
    </div>
  );
}