import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Upload, 
  TrendingUp, 
  Settings,
  Filter,
  Search,
  Plus,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';

// Components
import DocumentManager from '../components/documents/DocumentManager';
import KYCProgressTracker from '../components/documents/KYCProgressTracker';
import VerificationBadge, { VerificationStatus } from '../components/VerificationBadge';
import { documentService, DocumentMetadata } from '../services/document.service';
import { userService } from '../services/user.service';

// Styled Components
const DocumentsContainer = styled.div`
  width: 100%;
  padding: 24px;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
`;

const Header = styled.div`
  margin-bottom: 32px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8));
  padding: 24px;
  border-radius: 16px;
  box-shadow: 
    0 0 25px rgba(59, 130, 246, 0.1),
    0 8px 32px rgba(0, 0, 0, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
`;

const Title = styled.h1`
  margin: 0 0 8px 0;
  color: var(--color-text-primary);
  font-size: 28px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 12px;
  
  @media (max-width: 768px) {
    font-size: 24px;
  }
`;

const Subtitle = styled.p`
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 16px;
  line-height: 1.5;
`;

const TabsContainer = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(249, 250, 251, 0.9));
  padding: 12px 16px;
  border-radius: 16px;
  box-shadow: 
    0 0 20px rgba(59, 130, 246, 0.08),
    0 4px 20px rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(8px);
  
  @media (max-width: 768px) {
    overflow-x: auto;
    padding: 8px 12px;
  }
`;

const Tab = styled(motion.button)<{ active: boolean }>`
  padding: 12px 20px;
  border: none;
  background: transparent;
  color: ${props => props.active ? 'var(--color-primary-600)' : 'var(--color-text-secondary)'};
  font-weight: ${props => props.active ? '600' : '500'};
  cursor: pointer;
  border-bottom: 2px solid ${props => props.active ? 'var(--color-primary-500)' : 'transparent'};
  transition: all 0.2s ease;
  white-space: nowrap;
  display: flex;
  align-items: center;
  gap: 8px;
  
  &:hover {
    color: var(--color-primary-600);
  }
`;

const TabContent = styled(motion.div)`
  min-height: 500px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(248, 250, 252, 0.85));
  padding: 24px;
  border-radius: 20px;
  box-shadow: 
    0 0 30px rgba(59, 130, 246, 0.12),
    0 10px 40px rgba(0, 0, 0, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.25);
  backdrop-filter: blur(12px);
`;

const ActionButtons = styled.div`
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    flex-direction: column;
  }
`;

const ActionButton = styled(motion.button)<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 20px;
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
      default:
        return `
          background: var(--color-background-secondary);
          color: var(--color-text-primary);
          border: 1px solid var(--color-border-medium);
          &:hover { 
            background: var(--color-neutral-100);
            border-color: var(--color-primary-300);
          }
        `;
    }
  }}
`;

const UploadModal = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  padding: 20px;
  
  /* Smooth enter/exit animations */
  &.entering {
    animation: modalFadeIn 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  }
  
  &.exiting {
    animation: modalFadeOut 0.2s cubic-bezier(0.4, 0, 1, 1);
  }
  
  /* Mobile-first responsive design */
  @media (max-width: 768px) {
    padding: 16px;
    align-items: flex-end;
  }
  
  /* Accessibility: High contrast mode support */
  @media (prefers-contrast: high) {
    background: rgba(0, 0, 0, 0.9);
  }
  
  /* Performance: GPU acceleration */
  transform: translateZ(0);
  will-change: opacity;
`;

const ModalContent = styled(motion.div)`
  background: var(--color-background-primary);
  border-radius: 20px;
  padding: 0;
  max-width: 640px;
  width: 100%;
  max-height: 90vh;
  position: relative;
  box-shadow: 
    0 32px 64px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px var(--color-border-light),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  border: 1px solid var(--color-border-light);
  overflow: hidden;
  
  /* SAMA compliance: Enhanced security visual cues */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, 
      var(--color-primary-500) 0%, 
      var(--color-secondary-500) 50%, 
      var(--color-primary-500) 100%);
    z-index: 1;
  }
  
  /* Mobile-first responsive design */
  @media (max-width: 768px) {
    border-radius: 20px 20px 0 0;
    max-height: 85vh;
    margin-top: auto;
  }
  
  /* RTL support */
  [dir="rtl"] & {
    direction: rtl;
  }
  
  /* Performance: GPU acceleration */
  transform: translateZ(0);
  will-change: transform, opacity;
  
  /* Smooth animations */
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 32px 0 32px;
  margin-bottom: 24px;
  position: relative;
  z-index: 2;
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    padding: 20px 24px 0 24px;
    margin-bottom: 20px;
  }
  
  /* RTL support */
  [dir="rtl"] & {
    direction: rtl;
  }
`;

const ModalTitle = styled.h2`
  margin: 0;
  color: var(--color-text-primary);
  font-size: 24px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.02em;
  
  /* SAMA compliance: Professional typography */
  font-family: var(--font-primary, 'Inter', system-ui, sans-serif);
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    font-size: 20px;
  }
  
  /* Accessibility: Ensure proper contrast */
  @media (prefers-contrast: high) {
    font-weight: 800;
  }
`;

const CloseButton = styled(motion.button)`
  padding: 12px;
  border: none;
  background: var(--color-background-secondary);
  border-radius: 12px;
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  min-width: 44px;
  min-height: 44px;
  
  /* Hover state */
  &:hover {
    background: var(--color-background-tertiary);
    color: var(--color-text-primary);
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  }
  
  /* Active state */
  &:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  /* Focus state for accessibility */
  &:focus {
    outline: 2px solid var(--color-primary-500);
    outline-offset: 2px;
  }
  
  /* High contrast mode */
  @media (prefers-contrast: high) {
    border: 2px solid var(--color-text-primary);
  }
  
  /* Performance optimization */
  will-change: transform;
`;

const ModalBody = styled.div`
  padding: 0 32px 32px 32px;
  position: relative;
  z-index: 2;
  
  /* Mobile responsive */
  @media (max-width: 768px) {
    padding: 0 24px 24px 24px;
  }
  
  /* RTL support */
  [dir="rtl"] & {
    direction: rtl;
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const StatCard = styled.div<{ type?: 'total' | 'approved' | 'pending' | 'rejected' }>`
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  border: 1px solid rgba(255, 255, 255, 0.3);
  
  ${props => {
    switch (props.type) {
      case 'total':
        return `
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04);
          border: 2px solid #3eb2b1;
          
          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(62, 178, 177, 0.15), 0 8px 24px rgba(0, 0, 0, 0.08);
            background: linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(248, 250, 252, 0.95));
            border-color: #2d9a99;
          }
          
          .value { color: #2d7d7c; font-weight: 800; }
          .label { color: #3eb2b1; font-weight: 600; }
        `;
      case 'approved':
        return `
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04);
          border: 2px solid #50c5c3;
          
          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(80, 197, 195, 0.15), 0 8px 24px rgba(0, 0, 0, 0.08);
            background: linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(248, 250, 252, 0.95));
            border-color: #3eb2b1;
          }
          
          .value { color: #237e7d; font-weight: 800; }
          .label { color: #2da6a5; font-weight: 600; }
        `;
      case 'pending':
        return `
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04);
          border: 2px solid #7dd3d8;
          
          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(125, 211, 216, 0.15), 0 8px 24px rgba(0, 0, 0, 0.08);
            background: linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(248, 250, 252, 0.95));
            border-color: #5cc5ca;
          }
          
          .value { color: #4a9f9e; font-weight: 800; }
          .label { color: #5cb3b2; font-weight: 600; }
        `;
      case 'rejected':
        return `
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04);
          border: 2px solid #a8d8d7;
          
          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(168, 216, 215, 0.15), 0 8px 24px rgba(0, 0, 0, 0.08);
            background: linear-gradient(135deg, rgba(255, 255, 255, 1), rgba(248, 250, 252, 0.95));
            border-color: #8bd0cf;
          }
          
          .value { color: #6bb5b4; font-weight: 800; }
          .label { color: #7bc2c1; font-weight: 600; }
        `;
      default:
        return `
          background: linear-gradient(135deg, rgba(255, 255, 255, 0.9), rgba(248, 250, 252, 0.8));
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06), 0 4px 16px rgba(0, 0, 0, 0.04);
          border: 2px solid rgba(62, 178, 177, 0.3);
          
          &:hover {
            transform: translateY(-4px);
            box-shadow: 0 4px 12px rgba(62, 178, 177, 0.1), 0 8px 24px rgba(0, 0, 0, 0.08);
            background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
            border-color: rgba(62, 178, 177, 0.5);
          }
          
          .value { color: var(--color-text-primary); }
          .label { color: var(--color-text-secondary); }
        `;
    }
  }}
  
  .value {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  
  .label {
    font-size: 14px;
    font-weight: 500;
  }
`;


// Interfaces
interface DocumentsPageProps {
  userType?: 'USER' | 'CONTRACTOR';
}

// Component
const DocumentsPage: React.FC<DocumentsPageProps> = ({ userType = 'USER' }) => {
  const { t } = useTranslation();
  
  // State
  const [activeTab, setActiveTab] = useState<'overview' | 'upload' | 'manage'>('overview');
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('not_verified');
  const [isLoadingVerification, setIsLoadingVerification] = useState(true);

  // Load documents and verification status on mount
  useEffect(() => {
    loadDocuments();
    loadVerificationStatus();
    
    // Set auth token for document service
    const token = localStorage.getItem('token');
    if (token) {
      documentService.setAuthToken(token);
    }
  }, []);

  // Set up periodic verification status refresh for real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('⏰ Periodic verification status refresh...');
      loadVerificationStatus();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const loadDocuments = async () => {
    try {
      console.log('📋 Loading documents from API...');
      
      // Set auth token before making API call
      const token = localStorage.getItem('token');
      if (token) {
        documentService.setAuthToken(token);
      } else {
        // Use test token for development
        const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxZjQ3NTcyOS1jMmUwLTRiM2QtYTY3OC1lNGE0ZWE0ZDZjYzAiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ0eXBlIjoiVVNFUiIsImlhdCI6MTc1Mzk4NTM1NCwiZXhwIjoxNzU0MDcxNzU0fQ.wyCd8yfMxBAKjeemyzHzkvrSTctI94LX9wDWrj7f2eA';
        documentService.setAuthToken(testToken);
      }
      
      const response = await documentService.getDocuments({ 
        limit: 100,
        // Add timestamp to prevent caching
        _t: Date.now().toString()
      });
      console.log('📋 API response:', response);
      console.log('📋 Documents received:', response.documents.length);
      
      // Log each document with key details
      response.documents.forEach((doc, index) => {
        console.log(`📄 Document ${index + 1}:`, {
          id: doc.document_id,
          filename: doc.original_filename,
          category: doc.category_id,
          uploadTime: doc.upload_timestamp,
          status: doc.document_status
        });
      });
      
      setDocuments(response.documents);
      console.log('✅ Documents state updated with', response.documents.length, 'documents');
    } catch (error) {
      console.error('❌ Failed to load documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadVerificationStatus = async () => {
    try {
      setIsLoadingVerification(true);
      console.log('🔍 Loading verification status from user service...');
      
      const status = await userService.getVerificationStatus();
      console.log('✅ Verification status loaded:', status);
      setVerificationStatus(status);
    } catch (error) {
      console.error('❌ Failed to load verification status:', error);
      setVerificationStatus('not_verified');
    } finally {
      setIsLoadingVerification(false);
    }
  };

  // Handle upload request from KYC tracker - directly open file manager
  const handleUploadRequest = (categoryId: string) => {
    console.log('🗂️ Direct file upload requested for category:', categoryId);
    
    // Create hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.pdf,.jpeg,.jpg,.png';
    fileInput.style.display = 'none';
    
    fileInput.addEventListener('change', async (event) => {
      const files = (event.target as HTMLInputElement).files;
      if (!files || files.length === 0) return;
      
      const file = files[0];
      console.log('📁 File selected:', file.name, file.size, file.type);
      
      // Set auth token
      const token = localStorage.getItem('token');
      if (token) {
        documentService.setAuthToken(token);
      } else {
        // Use test token for development
        const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxZjQ3NTcyOS1jMmUwLTRiM2QtYTY3OC1lNGE0ZWE0ZDZjYzAiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ0eXBlIjoiVVNFUiIsImlhdCI6MTc1Mzk4NTM1NCwiZXhwIjoxNzU0MDcxNzU0fQ.wyCd8yfMxBAKjeemyzHzkvrSTctI94LX9wDWrj7f2eA';
        documentService.setAuthToken(testToken);
      }
      
      try {
        toast.loading('Uploading document...', { id: 'upload-progress' });
        
        const response = await documentService.uploadDocument(
          file,
          categoryId,
          {},
          (progress) => {
            toast.loading(`Uploading... ${progress.percentage}%`, { id: 'upload-progress' });
          }
        );
        
        toast.success('Document uploaded successfully!', { id: 'upload-progress' });
        console.log('📋 Reloading documents list after successful upload...');
        
        // Wait a moment for backend to complete the replacement
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('📋 Making API call to get fresh documents...');
        await loadDocuments();
        console.log('📋 Documents list reloaded');
        
        // Refresh verification status as document upload may trigger status change
        console.log('🔄 Refreshing verification status after document upload...');
        await loadVerificationStatus();
        console.log('✅ Verification status refreshed');
        
      } catch (error: any) {
        console.error('Upload failed:', error);
        toast.error(error.message || 'Upload failed', { id: 'upload-progress' });
      }
      
      // Clean up
      document.body.removeChild(fileInput);
    });
    
    // Add to DOM and trigger click
    document.body.appendChild(fileInput);
    fileInput.click();
  };


  // Calculate stats
  const totalDocuments = documents.length;
  const approvedDocuments = documents.filter(doc => doc.approval_status === 'approved').length;
  const pendingDocuments = documents.filter(doc => doc.approval_status === 'pending').length;
  const rejectedDocuments = documents.filter(doc => doc.approval_status === 'rejected').length;

  // Tab configurations
  const tabs = [
    {
      key: 'overview' as const,
      label: t('documents.tabs.overview'),
      icon: <TrendingUp size={16} />
    },
    {
      key: 'upload' as const,
      label: t('documents.tabs.upload'),
      icon: <Upload size={16} />
    },
    {
      key: 'manage' as const,
      label: t('documents.tabs.manage'),
      icon: <Settings size={16} />
    }
  ];


  return (
    <DocumentsContainer>
      <Header>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          <div>
            <Title>
              <FileText size={32} />
              {t('documents.title')}
            </Title>
            <Subtitle>
              {userType === 'CONTRACTOR' 
                ? t('documents.subtitle.contractor')
                : t('documents.subtitle.user')
              }
            </Subtitle>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {isLoadingVerification ? (
              <div style={{ 
                padding: '8px 16px', 
                background: '#f3f4f6', 
                borderRadius: '8px',
                color: '#6b7280',
                fontSize: '14px'
              }}>
                Loading...
              </div>
            ) : (
              <VerificationBadge 
                status={verificationStatus} 
                showUploadPrompt={true}
              />
            )}
          </div>
        </div>
      </Header>

      <TabsContainer>
        {tabs.map(tab => (
          <Tab
            key={tab.key}
            active={activeTab === tab.key}
            onClick={() => setActiveTab(tab.key)}
            whileHover={{ y: -1 }}
            whileTap={{ y: 0 }}
          >
            {tab.icon}
            {tab.label}
          </Tab>
        ))}
      </TabsContainer>

      <AnimatePresence mode="wait">
        <TabContent
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'overview' && (
            <div>
              <StatsGrid>
                <StatCard type="total">
                  <div className="value">{totalDocuments}</div>
                  <div className="label">{t('documents.stats.total')}</div>
                </StatCard>
                <StatCard type="approved">
                  <div className="value">{approvedDocuments}</div>
                  <div className="label">{t('documents.stats.approved')}</div>
                </StatCard>
                <StatCard type="pending">
                  <div className="value">{pendingDocuments}</div>
                  <div className="label">{t('documents.stats.pending')}</div>
                </StatCard>
                <StatCard type="rejected">
                  <div className="value">{rejectedDocuments}</div>
                  <div className="label">{t('documents.stats.rejected')}</div>
                </StatCard>
              </StatsGrid>

              <div data-kyc-progress>
                <KYCProgressTracker
                  userType={userType}
                  onUploadRequest={undefined}
                  showDocuments={true}
                  documents={documents}
                />
              </div>
            </div>
          )}

          {activeTab === 'upload' && (
            <KYCProgressTracker
              userType={userType}
              onUploadRequest={handleUploadRequest}
              showDocuments={true}
              documents={documents}
            />
          )}

          {activeTab === 'manage' && (
            <DocumentManager
              onDocumentSelect={(doc) => {
                console.log('Selected document:', doc);
                // Handle document selection if needed
              }}
            />
          )}
        </TabContent>
      </AnimatePresence>

    </DocumentsContainer>
  );
};

export default DocumentsPage;