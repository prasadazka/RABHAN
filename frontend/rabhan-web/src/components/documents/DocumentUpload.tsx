import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Upload, 
  File, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Shield, 
  Eye,
  X,
  FileText,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  documentService, 
  DocumentService,
  DocumentCategory, 
  UploadProgress, 
  UploadResponse
} from '../../services/document.service';
import type { ValidationResults } from '../../services/document.service';

// Styled Components
const UploadContainer = styled.div`
  background: var(--color-background-surface);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--color-border-light);
  box-shadow: var(--shadow-sm);
`;

const DropZone = styled(motion.div)<{ isDragActive: boolean; hasError: boolean }>`
  border: 2px dashed ${props => 
    props.hasError ? 'var(--color-error-main)' : 
    props.isDragActive ? 'var(--color-primary-500)' : 
    'var(--color-border-medium)'
  };
  border-radius: 12px;
  padding: 40px 20px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  background: ${props => 
    props.isDragActive ? 'var(--color-primary-50)' : 
    'var(--color-background-primary)'
  };
  
  &:hover {
    border-color: var(--color-primary-500);
    background: var(--color-primary-50);
  }
`;

const UploadContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const UploadIcon = styled(motion.div)`
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--color-primary-100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-primary-600);
`;

const CategorySelect = styled.select`
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--color-border-medium);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  
  &:focus {
    outline: none;
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px var(--color-primary-100);
  }
`;

const ProgressContainer = styled(motion.div)`
  background: var(--color-background-secondary);
  border-radius: 8px;
  padding: 20px;
  margin-top: 16px;
`;

const ProgressBar = styled.div<{ progress: number }>`
  width: 100%;
  height: 8px;
  background: var(--color-neutral-200);
  border-radius: 4px;
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.progress}%;
    background: linear-gradient(90deg, var(--color-primary-500), var(--color-primary-400));
    transition: width 0.3s ease;
  }
`;

const ValidationResults = styled(motion.div)`
  background: var(--color-background-secondary);
  border-radius: 8px;
  padding: 20px;
  margin-top: 16px;
`;

const ValidationItem = styled.div<{ status: 'success' | 'warning' | 'error' }>`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  
  .icon {
    color: ${props => 
      props.status === 'success' ? 'var(--color-success-main)' :
      props.status === 'warning' ? 'var(--color-warning-main)' :
      'var(--color-error-main)'
    };
  }
`;

const FilePreview = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--color-background-secondary);
  border-radius: 8px;
  margin-top: 16px;
`;

const FileInfo = styled.div`
  flex: 1;
  
  .name {
    font-weight: 500;
    color: var(--color-text-primary);
    margin-bottom: 4px;
  }
  
  .details {
    font-size: 14px;
    color: var(--color-text-secondary);
  }
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-top: 20px;
`;

const Button = styled(motion.button)<{ variant?: 'primary' | 'secondary' | 'danger' }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  
  ${props => {
    switch (props.variant) {
      case 'primary':
        return `
          background: var(--color-primary-500);
          color: white;
          &:hover { background: var(--color-primary-600); }
        `;
      case 'danger':
        return `
          background: var(--color-error-500);
          color: white;
          &:hover { background: var(--color-error-600); }
        `;
      default:
        return `
          background: var(--color-neutral-100);
          color: var(--color-text-primary);
          &:hover { background: var(--color-neutral-200); }
        `;
    }
  }}
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const HiddenInput = styled.input`
  display: none;
`;

const ErrorMessage = styled.div`
  background: var(--color-error-50);
  border: 1px solid var(--color-error-200);
  color: var(--color-error-700);
  padding: 12px 16px;
  border-radius: 8px;
  margin-top: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
`;

// Interfaces
interface DocumentUploadProps {
  onUploadComplete?: (documentId: string) => void;
  onUploadError?: (error: string) => void;
  allowedCategories?: string[];
  maxFileSize?: number; // in bytes
  className?: string;
}

// Component
const DocumentUpload: React.FC<DocumentUploadProps> = ({
  onUploadComplete,
  onUploadError,
  allowedCategories,
  maxFileSize = 50 * 1024 * 1024, // 50MB default
  className
}) => {
  const { t, i18n } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [validationResults, setValidationResults] = useState<ValidationResults | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string>('');
  const [uploadComplete, setUploadComplete] = useState<UploadResponse | null>(null);

  // Load categories on mount and when auth token is available
  useEffect(() => {
    // Ensure auth token is set before loading categories
    const token = localStorage.getItem('token');
    console.log('🔑 Token from localStorage:', token ? token.substring(0, 50) + '...' : 'none');
    
    if (token) {
      documentService.setAuthToken(token);
      loadCategories();
    } else {
      console.warn('⚠️ No auth token found, cannot load categories');
      // For testing, set a test token
      const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxZjQ3NTcyOS1jMmUwLTRiM2QtYTY3OC1lNGE0ZWE0ZDZjYzAiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ0eXBlIjoiVVNFUiIsImlhdCI6MTc1Mzk4NTM1NCwiZXhwIjoxNzU0MDcxNzU0fQ.wyCd8yfMxBAKjeemyzHzkvrSTctI94LX9wDWrj7f2eA';
      console.log('🧪 Using test token for development');
      documentService.setAuthToken(testToken);
      loadCategories();
    }
  }, []);

  const loadCategories = async () => {
    try {
      console.log('🔄 Loading document categories...');
      const allCategories = await documentService.getCategories();
      console.log('📋 Categories loaded:', allCategories);
      
      const filteredCategories = allowedCategories 
        ? allCategories.filter(cat => allowedCategories.includes(cat.id))
        : allCategories;
      
      console.log('📋 Filtered categories:', filteredCategories);
      setCategories(filteredCategories);
      
      if (filteredCategories.length > 0) {
        setSelectedCategory(filteredCategories[0].id);
        console.log('✅ Selected default category:', filteredCategories[0].id);
      }
    } catch (error) {
      console.error('❌ Failed to load categories:', error);
      toast.error(t('documents.upload.error.categories'));
    }
  };

  // File validation
  const validateFile = (file: File): string | null => {
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
    
    if (!allowedTypes.includes(file.type)) {
      return t('documents.upload.error.invalid_type');
    }
    
    if (file.size > maxFileSize) {
      return t('documents.upload.error.size_limit', { 
        maxSize: DocumentService.formatFileSize(maxFileSize) 
      });
    }
    
    return null;
  };

  // Handle file selection
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    const validationError = validateFile(file);
    
    if (validationError) {
      setError(validationError);
      return;
    }
    
    setSelectedFile(file);
    setError('');
    setValidationResults(null);
    setUploadComplete(null);
  }, [maxFileSize, t]);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  // Handle upload
  const handleUpload = async () => {
    console.log('🚀 Starting upload...', { selectedFile: selectedFile?.name, selectedCategory });
    
    if (!selectedFile || !selectedCategory) {
      console.error('❌ Missing file or category', { selectedFile: !!selectedFile, selectedCategory });
      return;
    }
    
    setIsUploading(true);
    setError('');
    setUploadProgress(null);
    setValidationResults(null);
    
    try {
      console.log('📤 Calling documentService.uploadDocument...');
      const response = await documentService.uploadDocument(
        selectedFile,
        selectedCategory,
        {},
        (progress) => {
          console.log('📊 Upload progress:', progress);
          setUploadProgress(progress);
        }
      );
      
      console.log('✅ Upload response received:', response);
      setUploadComplete(response);
      setValidationResults(response.validation_results || null);
      
      // Start polling for status updates
      if (response.document_id) {
        console.log('🔄 Starting status polling for document:', response.document_id);
        documentService.pollDocumentStatus(
          response.document_id,
          (document) => {
            console.log('📋 Document status update:', document);
          }
        );
      }
      
      onUploadComplete?.(response.document_id);
      toast.success(t('documents.upload.success'));
      
    } catch (error: any) {
      console.error('❌ Upload failed:', error);
      const errorMessage = error.message || t('documents.upload.error.generic');
      setError(errorMessage);
      onUploadError?.(errorMessage);
      toast.error(errorMessage);
    } finally {
      console.log('🏁 Upload process finished');
      setIsUploading(false);
    }
  };

  // Reset form
  const handleReset = () => {
    setSelectedFile(null);
    setUploadProgress(null);
    setValidationResults(null);
    setError('');
    setUploadComplete(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get file icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon size={24} />;
    } else if (file.type === 'application/pdf') {
      return <FileText size={24} />;
    }
    return <File size={24} />;
  };

  // Get status icon
  const getStatusIcon = (status: 'success' | 'warning' | 'error') => {
    switch (status) {
      case 'success':
        return <CheckCircle size={20} className="icon" />;
      case 'warning':
        return <AlertTriangle size={20} className="icon" />;
      case 'error':
        return <XCircle size={20} className="icon" />;
    }
  };

  const selectedCategoryInfo = categories.find(cat => cat.id === selectedCategory);

  return (
    <UploadContainer className={className}>
      {/* Category Selection */}
      {categories.length > 0 && (
        <div style={{ marginBottom: '20px' }}>
          <label style={{ 
            display: 'block', 
            marginBottom: '8px', 
            fontWeight: '500',
            color: 'var(--color-text-primary)'
          }}>
            {t('documents.upload.category')}
          </label>
          <CategorySelect
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">{t('documents.upload.select_category')}</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </CategorySelect>
          
          {selectedCategoryInfo && (
            <div style={{ 
              marginTop: '8px', 
              fontSize: '14px', 
              color: 'var(--color-text-secondary)' 
            }}>
              {selectedCategoryInfo.description}
            </div>
          )}
        </div>
      )}

      {/* Upload Area */}
      {!selectedFile && (
        <DropZone
          isDragActive={isDragActive}
          hasError={!!error}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <UploadContent>
            <UploadIcon
              animate={{ 
                scale: isDragActive ? 1.1 : 1,
                rotate: isDragActive ? 5 : 0 
              }}
            >
              <Upload size={28} />
            </UploadIcon>
            
            <div>
              <h3 style={{ 
                margin: '0 0 8px 0', 
                color: 'var(--color-text-primary)' 
              }}>
                {t('documents.upload.drop_zone.title')}
              </h3>
              <p style={{ 
                margin: 0, 
                color: 'var(--color-text-secondary)',
                fontSize: '14px'
              }}>
                {t('documents.upload.drop_zone.subtitle')}
              </p>
            </div>
            
            <div style={{ 
              fontSize: '12px', 
              color: 'var(--color-text-tertiary)' 
            }}>
              {t('documents.upload.supported_formats')}: PDF, JPEG, PNG<br />
              {t('documents.upload.max_size')}: {DocumentService.formatFileSize(maxFileSize)}
            </div>
          </UploadContent>
        </DropZone>
      )}

      {/* File Preview */}
      {selectedFile && (
        <FilePreview>
          <div style={{ color: 'var(--color-primary-500)' }}>
            {getFileIcon(selectedFile)}
          </div>
          <FileInfo>
            <div className="name">{selectedFile.name}</div>
            <div className="details">
              {DocumentService.formatFileSize(selectedFile.size)} • {selectedFile.type}
            </div>
          </FileInfo>
          {!isUploading && (
            <Button onClick={handleReset} variant="secondary">
              <X size={16} />
            </Button>
          )}
        </FilePreview>
      )}

      {/* Upload Progress */}
      <AnimatePresence>
        {uploadProgress && (
          <ProgressContainer
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              marginBottom: '12px' 
            }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {uploadProgress.message}
              </span>
              <span style={{ fontSize: '14px', color: 'var(--color-text-secondary)' }}>
                {uploadProgress.percentage}%
              </span>
            </div>
            <ProgressBar progress={uploadProgress.percentage} />
            
            {uploadProgress.stage === 'virus_scanning' && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px', 
                marginTop: '12px',
                fontSize: '14px',
                color: 'var(--color-text-secondary)'
              }}>
                <Shield size={16} />
                {t('documents.upload.virus_scanning')}
              </div>
            )}
          </ProgressContainer>
        )}
      </AnimatePresence>

      {/* Validation Results */}
      <AnimatePresence>
        {validationResults && (
          <ValidationResults
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <h4 style={{ 
              margin: '0 0 16px 0', 
              color: 'var(--color-text-primary)' 
            }}>
              {t('documents.upload.validation_results')}
            </h4>
            
            <ValidationItem status={validationResults.file_validation?.valid ? 'success' : 'error'}>
              {getStatusIcon(validationResults.file_validation?.valid ? 'success' : 'error')}
              <span>{t('documents.upload.file_validation')}</span>
            </ValidationItem>
            
            <ValidationItem status={validationResults.virus_scan?.clean ? 'success' : 'error'}>
              {getStatusIcon(validationResults.virus_scan?.clean ? 'success' : 'error')}
              <span>{t('documents.upload.virus_scan')}</span>
            </ValidationItem>
            
            <ValidationItem status={validationResults.content_validation?.valid ? 'success' : 'warning'}>
              {getStatusIcon(validationResults.content_validation?.valid ? 'success' : 'warning')}
              <span>
                {t('documents.upload.content_validation')} 
                ({validationResults.content_validation?.confidence || 0}%)
              </span>
            </ValidationItem>
            
            <ValidationItem status={
              validationResults.security_validation?.risk_level === 'low' ? 'success' : 
              validationResults.security_validation?.risk_level === 'medium' ? 'warning' : 'error'
            }>
              {getStatusIcon(
                validationResults.security_validation?.risk_level === 'low' ? 'success' : 
                validationResults.security_validation?.risk_level === 'medium' ? 'warning' : 'error'
              )}
              <span>
                {t('documents.upload.security_validation')} 
                ({validationResults.security_validation?.risk_level})
              </span>
            </ValidationItem>
          </ValidationResults>
        )}
      </AnimatePresence>

      {/* Error Message */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <ErrorMessage>
              <AlertTriangle size={20} />
              {error}
            </ErrorMessage>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action Buttons */}
      <ActionButtons>
        {selectedFile && !uploadComplete && (
          <>
            {/* Debug info */}
            <div style={{ fontSize: '12px', color: 'red', marginBottom: '8px' }}>
              DEBUG: Categories: {categories.length}, Selected: {selectedCategory || 'none'}, 
              Button disabled: {isUploading || !selectedCategory ? 'YES' : 'NO'}
            </div>
            <Button
              variant="primary"
              onClick={handleUpload}
              disabled={isUploading || !selectedCategory}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isUploading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('documents.upload.uploading')}
                </>
              ) : (
                <>
                  <Upload size={16} />
                  {t('documents.upload.upload_button')}
                </>
              )}
            </Button>
          </>
        )}
        
        {(selectedFile || uploadComplete) && (
          <Button
            variant="secondary"
            onClick={handleReset}
            disabled={isUploading}
          >
            {uploadComplete ? t('documents.upload.upload_another') : t('common.cancel')}
          </Button>
        )}
      </ActionButtons>

      {/* Hidden File Input */}
      <HiddenInput
        ref={fileInputRef}
        type="file"
        accept=".pdf,.jpeg,.jpg,.png"
        onChange={(e) => handleFileSelect(e.target.files)}
      />
    </UploadContainer>
  );
};

export default DocumentUpload;