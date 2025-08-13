import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  CheckCircle,
  AlertCircle,
  Clock,
  Upload,
  FileText,
  User,
  CreditCard,
  Building,
  Shield,
  TrendingUp,
  ChevronRight,
  Info,
  X,
  Download,
  Eye,
  Table,
  Grid
} from 'lucide-react';
import { 
  documentService, 
  DocumentService,
  DocumentCategory, 
  DocumentMetadata 
} from '../../services/document.service';
import { 
  kycService,
  KYCService,
  KYCStatus,
  KYCRequirement
} from '../../services/kyc.service';

// Styled Components
const TrackerContainer = styled.div`
  background: var(--color-background-surface);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--color-border-light);
`;

const Header = styled.div`
  margin-bottom: 24px;
`;

const Title = styled.h2`
  margin: 0 0 8px 0;
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const Subtitle = styled.p`
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 14px;
`;

const ProgressOverview = styled.div`
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  border-radius: 12px;
  padding: 24px;
  color: white;
  margin-bottom: 24px;
`;

const ProgressStats = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 20px;
  margin-bottom: 16px;
`;

const StatItem = styled.div`
  text-align: center;
  
  .value {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }
  
  .label {
    font-size: 12px;
    opacity: 0.9;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const ProgressBarContainer = styled.div`
  margin-top: 16px;
`;

const ProgressBarLabel = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
`;

const ProgressBar = styled.div<{ progress: number }>`
  width: 100%;
  height: 8px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
  overflow: hidden;
  
  &::after {
    content: '';
    display: block;
    height: 100%;
    width: ${props => props.progress}%;
    background: white;
    border-radius: 4px;
    transition: width 0.5s ease;
  }
`;

const DocumentCategories = styled.div`
  display: grid;
  gap: 16px;
`;

const CategoryGroup = styled.div`
  border: 1px solid var(--color-border-light);
  border-radius: 12px;
  overflow: hidden;
`;

const CategoryHeader = styled.div<{ completed: boolean }>`
  background: ${props => 
    props.completed ? 'var(--color-success-50)' : 'var(--color-background-secondary)'
  };
  border-bottom: 1px solid var(--color-border-light);
  padding: 16px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CategoryTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  .icon {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-primary-100);
    color: var(--color-primary-600);
  }
  
  .info {
    h3 {
      margin: 0 0 2px 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--color-text-primary);
    }
    
    p {
      margin: 0;
      font-size: 12px;
      color: var(--color-text-secondary);
    }
  }
`;

const CategoryStatus = styled.div<{ status: 'completed' | 'partial' | 'pending' }>`
  display: flex;
  align-items: center;
  gap: 8px;
  color: ${props => {
    switch (props.status) {
      case 'completed': return 'var(--color-success-600)';
      case 'partial': return 'var(--color-warning-600)';
      default: return 'var(--color-text-secondary)';
    }
  }};
  font-size: 14px;
  font-weight: 500;
`;

const DocumentList = styled.div`
  padding: 20px;
  display: grid;
  gap: 12px;
`;

const DocumentItem = styled(motion.div)<{ status: 'uploaded' | 'approved' | 'rejected' | 'missing' }>`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px;
  border: 1px solid var(--color-border-light);
  border-radius: 12px;
  background: var(--color-background-surface);
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
  
  &:hover {
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    transform: translateY(-1px);
  }
  
  ${props => {
    switch (props.status) {
      case 'approved':
        return `
          border-color: var(--color-success-300);
          background: linear-gradient(135deg, var(--color-success-50), var(--color-success-25));
          box-shadow: 0 1px 3px 0 rgba(34, 197, 94, 0.1), 0 1px 2px 0 rgba(34, 197, 94, 0.06);
          
          &:hover {
            box-shadow: 0 4px 6px -1px rgba(34, 197, 94, 0.15), 0 2px 4px -1px rgba(34, 197, 94, 0.1);
          }
        `;
      case 'rejected':
        return `
          border-color: var(--color-error-300);
          background: linear-gradient(135deg, var(--color-error-50), var(--color-error-25));
          box-shadow: 0 1px 3px 0 rgba(239, 68, 68, 0.1), 0 1px 2px 0 rgba(239, 68, 68, 0.06);
          
          &:hover {
            box-shadow: 0 4px 6px -1px rgba(239, 68, 68, 0.15), 0 2px 4px -1px rgba(239, 68, 68, 0.1);
          }
        `;
      case 'uploaded':
        return `
          border-color: var(--color-warning-300);
          background: linear-gradient(135deg, var(--color-warning-50), var(--color-warning-25));
          box-shadow: 0 1px 3px 0 rgba(245, 158, 11, 0.1), 0 1px 2px 0 rgba(245, 158, 11, 0.06);
          
          &:hover {
            box-shadow: 0 4px 6px -1px rgba(245, 158, 11, 0.15), 0 2px 4px -1px rgba(245, 158, 11, 0.1);
          }
        `;
      default:
        return `
          border-style: dashed;
          background: linear-gradient(135deg, var(--color-background-surface), var(--color-neutral-50));
          
          &:hover {
            border-color: var(--color-primary-300);
            background: linear-gradient(135deg, var(--color-primary-50), var(--color-primary-25));
            box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.15), 0 2px 4px -1px rgba(59, 130, 246, 0.1);
          }
        `;
    }
  }}
  
  cursor: ${props => props.status === 'missing' ? 'pointer' : 'default'};
`;

const DocumentInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  
  .name {
    font-weight: 500;
    color: var(--color-text-primary);
    margin-bottom: 2px;
  }
  
  .details {
    font-size: 12px;
    color: var(--color-text-secondary);
  }
`;

const DocumentActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ActionButton = styled(motion.button)<{ variant?: 'primary' | 'secondary' }>`
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
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
          color: var(--color-text-secondary);
          &:hover { 
            background: var(--color-neutral-200);
            color: var(--color-text-primary);
          }
        `;
    }
  }}
`;

const StatusIcon = styled.div<{ status: string }>`
  color: ${props => {
    switch (props.status) {
      case 'approved': return 'var(--color-success-500)';
      case 'rejected': return 'var(--color-error-500)';
      case 'uploaded': 
      case 'pending': return 'var(--color-warning-500)';
      default: return 'var(--color-text-tertiary)';
    }
  }};
`;

const NextSteps = styled.div`
  background: var(--color-background-secondary);
  border-radius: 8px;
  padding: 20px;
  margin-top: 24px;
  border-left: 4px solid var(--color-primary-500);
`;

const NextStepsTitle = styled.h3`
  margin: 0 0 12px 0;
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NextStepsList = styled.ul`
  margin: 0;
  padding-left: 20px;
  
  li {
    margin-bottom: 8px;
    color: var(--color-text-secondary);
    font-size: 14px;
    line-height: 1.5;
  }
`;

// View Toggle Components
const ViewToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
`;

const ToggleButton = styled(motion.button)<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 1px solid var(--color-border-light);
  border-radius: 8px;
  background: ${props => props.active ? 'var(--color-primary-500)' : 'var(--color-background-surface)'};
  color: ${props => props.active ? 'white' : 'var(--color-text-secondary)'};
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    background: ${props => props.active ? 'var(--color-primary-600)' : 'var(--color-background-secondary)'};
  }
`;

// Table Components
const DocumentTable = styled.table`
  width: 100%;
  background: var(--color-background-surface);
  border-radius: 12px;
  border: 1px solid var(--color-border-light);
  border-collapse: collapse;
  overflow: hidden;
`;

const TableHeader = styled.thead`
  background: var(--color-background-secondary);
`;

const TableHeaderRow = styled.tr`
  border-bottom: 1px solid var(--color-border-light);
`;

const TableHeaderCell = styled.th`
  padding: 16px 20px;
  text-align: left;
  font-weight: 600;
  font-size: 14px;
  color: var(--color-text-primary);
  border-bottom: 1px solid var(--color-border-light);
  
  &:first-child {
    width: 30%;
  }
  
  &:nth-child(2) {
    width: 15%;
  }
  
  &:nth-child(3) {
    width: 15%;
  }
  
  &:nth-child(4) {
    width: 12%;
  }
  
  &:nth-child(5) {
    width: 10%;
  }
  
  &:last-child {
    width: 18%;
    text-align: center;
  }
  
  @media (max-width: 768px) {
    padding: 12px 16px;
    font-size: 12px;
  }
`;

const TableBody = styled.tbody``;

const TableRow = styled(motion.tr)<{ status: 'uploaded' | 'approved' | 'rejected' | 'missing'; verified: boolean }>`
  border-bottom: 1px solid var(--color-border-light);
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-background-secondary);
  }
  
  &:last-child {
    border-bottom: none;
  }
  
  ${props => {
    switch (props.status) {
      case 'approved':
        return `
          background: linear-gradient(135deg, var(--color-success-50), var(--color-success-25));
          border-left: 4px solid var(--color-success-500);
        `;
      case 'rejected':
        return `
          background: linear-gradient(135deg, var(--color-error-50), var(--color-error-25));
          border-left: 4px solid var(--color-error-500);
        `;
      case 'uploaded':
        return `
          background: linear-gradient(135deg, var(--color-warning-50), var(--color-warning-25));
          border-left: 4px solid var(--color-warning-500);
        `;
      default:
        return `
          background: var(--color-background-surface);
          border-left: 4px solid var(--color-border-light);
        `;
    }
  }}
`;

const TableCell = styled.td`
  padding: 16px 20px;
  font-size: 14px;
  color: var(--color-text-primary);
  vertical-align: middle;
  
  &.filename {
    font-weight: 500;
  }
  
  &.status {
    font-weight: 600;
  }
  
  &.actions {
    text-align: center;
  }
  
  @media (max-width: 768px) {
    padding: 12px 16px;
    font-size: 12px;
    
    &.actions {
      text-align: left;
    }
  }
`;

const CellContent = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  
  &.actions {
    justify-content: center;
    gap: 4px;
    
    @media (max-width: 768px) {
      justify-content: flex-start;
    }
  }
`;

const TableActionButton = styled(motion.button)<{ variant?: 'primary' | 'secondary' | 'danger'; disabled?: boolean }>`
  padding: 6px 12px;
  border-radius: 6px;
  font-weight: 500;
  border: none;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  transition: all 0.2s ease;
  opacity: ${props => props.disabled ? 0.5 : 1};
  
  ${props => {
    if (props.disabled) {
      return `
        background: var(--color-neutral-200);
        color: var(--color-text-tertiary);
      `;
    }
    
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
          background: var(--color-background-secondary);
          color: var(--color-text-secondary);
          &:hover { 
            background: var(--color-neutral-200);
            color: var(--color-text-primary);
          }
        `;
    }
  }}
`;

const VerifiedBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  background: var(--color-success-100);
  color: var(--color-success-700);
  border-radius: 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const EmptyState = styled.div`
  padding: 40px 20px;
  text-align: center;
  color: var(--color-text-secondary);
  
  .icon {
    margin-bottom: 16px;
    opacity: 0.5;
  }
  
  .message {
    font-size: 16px;
    font-weight: 500;
    margin-bottom: 8px;
  }
  
  .description {
    font-size: 14px;
  }
`;

// Custom Confirmation Dialog
const ConfirmDialog = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 20px;
`;

const ConfirmContent = styled(motion.div)`
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(248, 250, 252, 0.9));
  border-radius: 16px;
  padding: 32px;
  max-width: 420px;
  width: 100%;
  box-shadow: 
    0 0 30px rgba(62, 178, 177, 0.12),
    0 10px 40px rgba(0, 0, 0, 0.15);
  border: 2px solid #3eb2b1;
  backdrop-filter: blur(12px);
  text-align: center;
`;

const ConfirmIcon = styled.div`
  width: 64px;
  height: 64px;
  margin: 0 auto 20px;
  background: linear-gradient(135deg, #3eb2b1, #2d9a99);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const ConfirmTitle = styled.h3`
  margin: 0 0 12px 0;
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 600;
`;

const ConfirmMessage = styled.p`
  margin: 0 0 24px 0;
  color: var(--color-text-secondary);
  font-size: 16px;
  line-height: 1.5;
`;

const ConfirmButtons = styled.div`
  display: flex;
  gap: 12px;
  justify-content: center;
`;

const ConfirmButton = styled(motion.button)<{ variant?: 'primary' | 'secondary' }>`
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  border: none;
  cursor: pointer;
  font-size: 14px;
  min-width: 100px;
  transition: all 0.2s ease;
  
  ${props => {
    if (props.variant === 'primary') {
      return `
        background: #3eb2b1;
        color: white;
        &:hover { 
          background: #2d9a99;
          box-shadow: 0 4px 12px rgba(62, 178, 177, 0.3);
        }
      `;
    } else {
      return `
        background: var(--color-background-secondary);
        color: var(--color-text-primary);
        border: 1px solid var(--color-border-light);
        &:hover { 
          background: var(--color-neutral-100);
          border-color: #3eb2b1;
        }
      `;
    }
  }}
`;

// Interfaces
interface KYCProgressTrackerProps {
  userType?: 'USER' | 'CONTRACTOR';
  onUploadRequest?: (categoryId: string) => void;
  className?: string;
  showDocuments?: boolean; // Control whether to show uploaded documents or just progress
  defaultView?: 'cards' | 'table'; // Default view mode
  showManageTab?: boolean; // Show manage tab for tabular view
  documents?: DocumentMetadata[]; // Real documents from API instead of mock data
}

interface DocumentRequirement {
  categoryId: string;
  name: string;
  description: string;
  required: boolean;
  icon: React.ReactNode;
  documents: DocumentMetadata[];
}

// Component
const KYCProgressTracker: React.FC<KYCProgressTrackerProps> = ({
  userType = 'USER',
  onUploadRequest,
  className,
  showDocuments = false,
  defaultView = 'cards',
  showManageTab = false,
  documents: propDocuments
}) => {
  const { t, i18n } = useTranslation();
  
  // State
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<DocumentMetadata | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(defaultView as 'cards' | 'table');

  // Load data
  useEffect(() => {
    // Set auth token for document service
    const token = localStorage.getItem('token');
    if (token) {
      documentService.setAuthToken(token);
    }
    loadData();
  }, [userType]);

  // Update documents when prop changes
  useEffect(() => {
    if (propDocuments && propDocuments.length >= 0) {
      console.log('📋 KYCProgressTracker: PropDocuments updated, setting to:', propDocuments.length);
      setDocuments(propDocuments);
    }
  }, [propDocuments]);


  const loadData = async () => {
    try {
      setLoading(true);
      
      // Ensure auth token is set before making requests
      const token = localStorage.getItem('token');
      if (token) {
        documentService.setAuthToken(token);
        kycService.setAuthToken(token);
      }
      
      // Get KYC status which includes all requirements and their status
      const userRole = userType === 'USER' ? 'customer' : 'contractor';
      const kycData = await kycService.getKYCStatus(userRole);
      
      setKycStatus(kycData);
      
      // Convert KYC requirements to categories format for compatibility
      // Remove duplicates by category ID
      const uniqueRequirements = kycData.requirements.reduce((acc, req) => {
        if (!acc.find(existing => existing.categoryId === req.categoryId)) {
          acc.push(req);
        }
        return acc;
      }, [] as KYCRequirement[]);

      const categoriesFromKyc = uniqueRequirements.map(req => ({
        id: req.categoryId,
        name: req.categoryName,
        description: req.categoryName,
        required_for_kyc: req.required,
        user_type: userType as 'USER' | 'CONTRACTOR' | 'BOTH',
        validation_rules: {}
      }));
      
      setCategories(categoriesFromKyc);
      
      // Create mock documents from KYC data for display compatibility
      // Remove duplicates and filter uploaded documents
      const documentsFromKyc = uniqueRequirements
        .filter(req => req.uploaded && req.documentId)
        .map(req => ({
          document_id: req.documentId!,
          user_id: kycData.userId,
          category_id: req.categoryId,
          original_filename: `${req.categoryName}.pdf`,
          file_size_bytes: 0,
          mime_type: 'application/pdf',
          file_hash: '',
          upload_timestamp: new Date().toISOString(),
          validation_score: 100,
          virus_scan_status: 'clean' as const,
          approval_status: req.approved ? 'approved' as const : 'pending' as const,
          document_status: 'validated' as const,
          ocr_confidence: 100,
          sama_audit_log: [],
          category: categoriesFromKyc.find(cat => cat.id === req.categoryId)
        }));
      
      // Always use real documents from props when provided (even if empty array)
      if (propDocuments !== undefined && propDocuments !== null) {
        console.log('📋 Using real documents from props:', propDocuments.length);
        setDocuments(propDocuments);
        
        // Update KYC requirements with real document status
        if (propDocuments.length > 0 && kycData.requirements) {
          console.log('📋 KYC Requirements from backend:', kycData.requirements);
          console.log('📋 Document categories from props:', propDocuments.map(doc => doc.category_id));
          
          console.log('🔍 KYC Category Matching Debug:');
          console.log('📋 Available document categories:', propDocuments.map(doc => doc.category_id));
          console.log('📋 Required KYC categories:', kycData.requirements.map(req => req.categoryId));
          
          const updatedRequirements = kycData.requirements.map(req => {
            // Flexible category matching - try exact match first, then variations
            const exactMatch = propDocuments.some(doc => doc.category_id === req.categoryId);
            const caseInsensitiveMatch = propDocuments.some(doc => 
              doc.category_id?.toLowerCase() === req.categoryId?.toLowerCase()
            );
            const underscoreMatch = propDocuments.some(doc => 
              doc.category_id?.replace(/_/g, '-') === req.categoryId?.replace(/_/g, '-') ||
              doc.category_id?.replace(/-/g, '_') === req.categoryId?.replace(/-/g, '_')
            );
            
            const hasDocumentForCategory = exactMatch || caseInsensitiveMatch || underscoreMatch;
            console.log(`📋 Category ${req.categoryId}: hasDocument=${hasDocumentForCategory}, required=${req.required}`);
            
            // Debug: Show which documents match this category
            const matchingDocs = propDocuments.filter(doc => 
              doc.category_id === req.categoryId ||
              doc.category_id?.toLowerCase() === req.categoryId?.toLowerCase() ||
              doc.category_id?.replace(/_/g, '-') === req.categoryId?.replace(/_/g, '-') ||
              doc.category_id?.replace(/-/g, '_') === req.categoryId?.replace(/-/g, '_')
            );
            if (matchingDocs.length > 0) {
              console.log(`  ✅ Found ${matchingDocs.length} docs for ${req.categoryId}:`, matchingDocs.map(d => d.original_filename));
            } else {
              console.log(`  ❌ No documents found for category: ${req.categoryId}`);
              console.log(`  Available categories:`, propDocuments.map(d => d.category_id));
            }
            
            return {
              ...req,
              uploaded: hasDocumentForCategory || req.uploaded,
              // Keep existing approved status, but mark as uploaded if we have docs
            };
          });
          
          // Recalculate completion percentage
          const totalRequired = updatedRequirements.filter(req => req.required).length;
          const completedRequired = updatedRequirements.filter(req => req.required && req.uploaded).length;
          const newCompletionPercentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0;
          
          console.log('📊 Updated KYC status with real documents:', {
            totalRequired,
            completedRequired, 
            newCompletionPercentage
          });
          
          // Update KYC status with real document data
          setKycStatus({
            ...kycData,
            requirements: updatedRequirements,
            completionPercentage: newCompletionPercentage
          });
        }
      } else {
        console.log('📋 Using mock documents from KYC data:', documentsFromKyc.length);
        setDocuments(documentsFromKyc);
      }
    } catch (error) {
      console.error('Failed to load KYC data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Group documents by category
  const documentsByCategory = documents.reduce((acc, doc) => {
    if (!acc[doc.category_id]) {
      acc[doc.category_id] = [];
    }
    acc[doc.category_id].push(doc);
    return acc;
  }, {} as Record<string, DocumentMetadata[]>);

  // Calculate progress from KYC status (direct from backend)
  const progressPercentage = kycStatus?.completionPercentage || 0;
  
  // Calculate stats from KYC requirements (remove duplicates)
  const allRequirements = kycStatus?.requirements || [];
  const uniqueRequiredCategories = allRequirements
    .filter(req => req.required)
    .reduce((acc, req) => {
      if (!acc.find(existing => existing.categoryId === req.categoryId)) {
        acc.push(req);
      }
      return acc;
    }, [] as KYCRequirement[]);
    
  const requiredCategories = uniqueRequiredCategories;
  const completedCategories = requiredCategories.filter(req => req.approved);
  const uploadedCategories = requiredCategories.filter(req => req.uploaded);

  // Get category icon
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    if (name.includes('id') || name.includes('passport')) return <User size={20} />;
    if (name.includes('salary') || name.includes('income')) return <CreditCard size={20} />;
    if (name.includes('commercial') || name.includes('business')) return <Building size={20} />;
    if (name.includes('insurance') || name.includes('certificate')) return <Shield size={20} />;
    return <FileText size={20} />;
  };

  // Get file type icon based on filename extension
  const getFileTypeIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <FileText size={20} color="#dc2626" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FileText size={20} color="#059669" />;
      case 'doc':
      case 'docx':
        return <FileText size={20} color="#2563eb" />;
      default:
        return <FileText size={20} color="#6b7280" />;
    }
  };

  // Get document status from KYC requirements
  const getDocumentStatus = (categoryId: string): 'completed' | 'partial' | 'pending' => {
    const requirement = kycStatus?.requirements.find(req => req.categoryId === categoryId);
    if (!requirement) return 'pending';
    
    if (requirement.approved) return 'completed';
    if (requirement.uploaded) return 'partial';
    return 'pending';
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'completed':
        return <CheckCircle size={16} />;
      case 'rejected':
        return <AlertCircle size={16} />;
      case 'uploaded':
      case 'pending':
      case 'partial':
        return <Clock size={16} />;
      default:
        return <Upload size={16} />;
    }
  };

  // Get next steps from KYC status
  const getNextSteps = (): string[] => {
    const steps: string[] = [];
    
    const missingRequired = requiredCategories.filter(req => !req.approved);
    
    if (missingRequired.length > 0) {
      steps.push(t('kyc.next_steps.upload_required', { 
        count: missingRequired.length 
      }));
    }
    
    const pendingApproval = requiredCategories.filter(req => req.uploaded && !req.approved);
    
    if (pendingApproval.length > 0) {
      steps.push(t('kyc.next_steps.await_approval', { 
        count: pendingApproval.length 
      }));
    }
    
    if (progressPercentage === 100) {
      steps.push(t('kyc.next_steps.complete'));
    }
    
    return steps;
  };

  // Check if document is admin verified (approved) and cannot be deleted
  const isDocumentVerified = (document: DocumentMetadata): boolean => {
    return document.approval_status === 'approved';
  };

  // Get formatted upload date
  const formatUploadDate = (timestamp: string): string => {
    return new Date(timestamp).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Translate document category name
  const translateCategoryName = (categoryName: string): string => {
    // Normalize the category name to match translation keys
    const normalizedName = categoryName
      .toLowerCase()
      .replace(/\s+/g, '_')
      .replace(/[^a-z_]/g, '');

    // Try to get translation from kyc.categories first, then documents.categories, fallback to original name if not found
    let translationKey = `kyc.categories.${normalizedName}`;
    let translated = t(translationKey);
    
    // If not found in kyc.categories, try documents.categories
    if (translated === translationKey) {
      translationKey = `documents.categories.${normalizedName}`;
      translated = t(translationKey);
    }
    
    // If translation key is returned as-is, it means no translation found
    return translated === translationKey ? categoryName : translated;
  };

  // Handle delete confirmation
  const handleDeleteClick = (document: DocumentMetadata) => {
    setDocumentToDelete(document);
    setShowConfirmDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!documentToDelete) return;
    
    console.log('Attempting to delete document:', documentToDelete.document_id);
    
    try {
      const result = await documentService.deleteDocument(documentToDelete.document_id);
      console.log('Delete result:', result);
      
      // Wait a moment before refreshing to ensure backend processing is complete
      setTimeout(() => {
        loadData(); // Refresh the data
      }, 500);
      
      toast.success(t('kyc.document_deleted'));
    } catch (error) {
      console.error('Failed to delete document:', error);
      console.error('Error details:', error);
      toast.error(t('kyc.delete_failed'));
    } finally {
      setShowConfirmDialog(false);
      setDocumentToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowConfirmDialog(false);
    setDocumentToDelete(null);
  };

  // Render table view
  const renderTableView = () => {
    const allDocuments = documents.filter(doc => doc.document_status !== 'archived');
    
    if (allDocuments.length === 0) {
      return (
        <div style={{ background: 'var(--color-background-surface)', borderRadius: '12px', border: '1px solid var(--color-border-light)' }}>
          <EmptyState>
            <div className="icon">
              <FileText size={48} />
            </div>
            <div className="message">{t('kyc.no_documents')}</div>
            <div className="description">{t('kyc.no_documents_description')}</div>
          </EmptyState>
        </div>
      );
    }

    return (
      <DocumentTable>
        <TableHeader>
          <TableHeaderRow>
            <TableHeaderCell>{t('kyc.table.document')}</TableHeaderCell>
            <TableHeaderCell>{t('kyc.table.category')}</TableHeaderCell>
            <TableHeaderCell>{t('kyc.table.status')}</TableHeaderCell>
            <TableHeaderCell>{t('kyc.table.uploaded')}</TableHeaderCell>
            <TableHeaderCell>{t('kyc.table.size')}</TableHeaderCell>
            <TableHeaderCell>{t('kyc.table.actions')}</TableHeaderCell>
          </TableHeaderRow>
        </TableHeader>
        
        <TableBody>
          {allDocuments.map(document => {
            const isVerified = isDocumentVerified(document);
            const requirement = kycStatus?.requirements.find(req => req.categoryId === document.category_id);
            const status = document.approval_status === 'approved' ? 'approved' : 
                          document.approval_status === 'rejected' ? 'rejected' : 'uploaded';
            
            return (
              <TableRow
                key={document.document_id}
                status={status}
                verified={isVerified}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <TableCell className="filename">
                  <CellContent>
                    {getFileTypeIcon(document.original_filename)}
                    <span title={document.original_filename}>
                      {document.original_filename.length > 30 
                        ? `${document.original_filename.substring(0, 30)}...`
                        : document.original_filename
                      }
                    </span>
                  </CellContent>
                </TableCell>
                
                <TableCell>
                  {requirement?.categoryName ? translateCategoryName(requirement.categoryName) : t('common.unknown')}
                </TableCell>
                
                <TableCell className="status">
                  <CellContent>
                    <StatusIcon status={document.approval_status}>
                      {getStatusIcon(document.approval_status)}
                    </StatusIcon>
                    <span style={{ color: DocumentService.getStatusColor(document.approval_status) }}>
                      {DocumentService.getStatusText(document.approval_status, i18n.language)}
                    </span>
                    {isVerified && (
                      <VerifiedBadge>
                        <Shield size={10} />
                        {t('kyc.verified')}
                      </VerifiedBadge>
                    )}
                  </CellContent>
                </TableCell>
                
                <TableCell>
                  {formatUploadDate(document.upload_timestamp)}
                </TableCell>
                
                <TableCell>
                  {DocumentService.formatFileSize(document.file_size_bytes)}
                </TableCell>
                
                <TableCell className="actions">
                  <CellContent className="actions">
                    <TableActionButton
                      onClick={async () => {
                        try {
                          const blob = await documentService.downloadDocument(document.document_id);
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = document.original_filename;
                          a.click();
                          URL.revokeObjectURL(url);
                        } catch (error) {
                          console.error('Failed to download document:', error);
                          toast.error(t('kyc.download_failed'));
                        }
                      }}
                      title={t('kyc.download_document')}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Download size={12} />
                    </TableActionButton>
                    
                    {onUploadRequest && (
                      <TableActionButton
                        variant="primary"
                        onClick={() => onUploadRequest(document.category_id)}
                        title={t('kyc.replace_document')}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Upload size={12} />
                      </TableActionButton>
                    )}
                    
                    <TableActionButton
                      variant="danger"
                      disabled={isVerified}
                      onClick={() => !isVerified && handleDeleteClick(document)}
                      title={
                        isVerified 
                          ? t('kyc.cannot_delete_verified') 
                          : t('kyc.delete_document')
                      }
                      whileHover={!isVerified ? { scale: 1.05 } : {}}
                      whileTap={!isVerified ? { scale: 0.95 } : {}}
                    >
                      <X size={12} />
                    </TableActionButton>
                  </CellContent>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </DocumentTable>
    );
  };

  if (loading) {
    return (
      <TrackerContainer className={className}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '40px 0',
          color: 'var(--color-text-secondary)'
        }}>
          <Clock size={20} className="animate-spin" style={{ marginRight: '8px' }} />
          {t('kyc.loading')}
        </div>
      </TrackerContainer>
    );
  }

  return (
    <TrackerContainer className={className}>
      <Header>
        <Title>
          <TrendingUp size={24} />
          {t('kyc.title')}
        </Title>
        <Subtitle>
          {userType === 'CONTRACTOR' 
            ? t('kyc.subtitle.contractor')
            : t('kyc.subtitle.user')
          }
        </Subtitle>
      </Header>

      <ProgressOverview>
        <ProgressStats>
          <StatItem>
            <div className="value">{completedCategories.length}</div>
            <div className="label">{t('kyc.stats.completed')}</div>
          </StatItem>
          <StatItem>
            <div className="value">{requiredCategories.length - completedCategories.length}</div>
            <div className="label">{t('kyc.stats.remaining')}</div>
          </StatItem>
          <StatItem>
            <div className="value">{uploadedCategories.length}</div>
            <div className="label">{t('kyc.stats.uploaded')}</div>
          </StatItem>
          <StatItem>
            <div className="value">{progressPercentage}%</div>
            <div className="label">{t('kyc.stats.progress')}</div>
          </StatItem>
        </ProgressStats>
        
        <ProgressBarContainer>
          <ProgressBarLabel>
            <span>{t('kyc.progress.overall')}</span>
            <span>{progressPercentage}%</span>
          </ProgressBarLabel>
          <ProgressBar progress={progressPercentage} />
        </ProgressBarContainer>
      </ProgressOverview>

      {showManageTab && showDocuments && (
        <ViewToggle>
          <ToggleButton
            active={viewMode === 'cards'}
            onClick={() => setViewMode('cards')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Grid size={16} />
            {t('kyc.view.cards')}
          </ToggleButton>
          <ToggleButton
            active={viewMode === 'table'}
            onClick={() => setViewMode('table')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Table size={16} />
            {t('kyc.view.table')}
          </ToggleButton>
        </ViewToggle>
      )}

      {showDocuments && viewMode === 'table' ? (
        renderTableView()
      ) : (
        <DocumentCategories>
        {requiredCategories.map(requirement => {
          const categoryDocs = documentsByCategory[requirement.categoryId] || [];
          const categoryStatus = getDocumentStatus(requirement.categoryId);
          
          return (
            <CategoryGroup key={requirement.categoryId}>
              <CategoryHeader completed={categoryStatus === 'completed'}>
                <CategoryTitle>
                  <div className="icon">
                    {getCategoryIcon(requirement.categoryName)}
                  </div>
                  <div className="info">
                    <h3>{translateCategoryName(requirement.categoryName)}</h3>
                    <p>{t('kyc.required_document')}</p>
                  </div>
                </CategoryTitle>
                
                <CategoryStatus status={categoryStatus}>
                  {getStatusIcon(categoryStatus)}
                  {t(`kyc.status.${categoryStatus}`)}
                  {requirement.required && (
                    <span style={{ 
                      fontSize: '10px',
                      background: 'var(--color-error-100)',
                      color: 'var(--color-error-700)',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      marginLeft: '8px'
                    }}>
                      {t('kyc.required')}
                    </span>
                  )}
                </CategoryStatus>
              </CategoryHeader>
              
              {showDocuments && (
                <DocumentList>
                  {(() => {
                    // Show only the MOST RECENT document for this category (KYC rule: 1 document per category)
                    const latestDoc = categoryDocs.length > 0 
                      ? categoryDocs.sort((a, b) => new Date(b.upload_timestamp).getTime() - new Date(a.upload_timestamp).getTime())[0]
                      : null;

                  if (!latestDoc) {
                    // No document uploaded yet
                    if (onUploadRequest) {
                      // Show upload option if upload handler is provided
                      return (
                        <DocumentItem
                          status="missing"
                          onClick={() => onUploadRequest(requirement.categoryId)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <DocumentInfo>
                            <StatusIcon status="missing">
                              <Upload size={20} />
                            </StatusIcon>
                            <div>
                              <div className="name">
                                {translateCategoryName(requirement.categoryName)}
                              </div>
                              <div className="details">
                                {t('kyc.click_to_upload')}
                              </div>
                            </div>
                          </DocumentInfo>
                          <DocumentActions>
                            <ActionButton variant="primary">
                              <Upload size={14} />
                              {t('kyc.upload')}
                            </ActionButton>
                          </DocumentActions>
                        </DocumentItem>
                      );
                    } else {
                      // Read-only mode - show missing status without upload option
                      return (
                        <DocumentItem status="missing">
                          <DocumentInfo>
                            <StatusIcon status="missing">
                              <Upload size={20} />
                            </StatusIcon>
                            <div>
                              <div className="name">{translateCategoryName(requirement.categoryName)}</div>
                              <div className="details">
                                {t('kyc.not_uploaded')}
                              </div>
                            </div>
                          </DocumentInfo>
                        </DocumentItem>
                      );
                    }
                  }

                  // Show the current document with replace option
                  return (
                    <DocumentItem
                      key={latestDoc.document_id}
                      status={
                        latestDoc.approval_status === 'approved' ? 'approved' :
                        latestDoc.approval_status === 'rejected' ? 'rejected' : 'uploaded'
                      }
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <DocumentInfo>
                        <StatusIcon status={latestDoc.approval_status}>
                          {getFileTypeIcon(latestDoc.original_filename)}
                        </StatusIcon>
                        <div>
                          <div className="name">{latestDoc.original_filename}</div>
                          <div className="details">
                            <span style={{ color: DocumentService.getStatusColor(latestDoc.approval_status) }}>
                              {DocumentService.getStatusText(latestDoc.approval_status, i18n.language)}
                            </span>
                            {' • '}
                            {t('kyc.uploaded_on', { 
                              date: new Date(latestDoc.upload_timestamp).toLocaleDateString(i18n.language)
                            })} • {DocumentService.formatFileSize(latestDoc.file_size_bytes)}
                          </div>
                        </div>
                      </DocumentInfo>
                      <DocumentActions>
                        <ActionButton
                          onClick={async () => {
                            try {
                              const blob = await documentService.downloadDocument(latestDoc.document_id);
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url;
                              a.download = latestDoc.original_filename;
                              a.click();
                              URL.revokeObjectURL(url);
                            } catch (error) {
                              console.error('Failed to download document:', error);
                              toast.error(t('kyc.download_failed'));
                            }
                          }}
                          title={t('kyc.download_document')}
                        >
                          <Download size={14} />
                        </ActionButton>
                        {onUploadRequest && (
                          <ActionButton 
                            variant="primary"
                            onClick={() => onUploadRequest(requirement.categoryId)}
                            title="Replace this document"
                          >
                            <Upload size={14} />
                            {t('kyc.replace')}
                          </ActionButton>
                        )}
                        <ActionButton
                          onClick={() => handleDeleteClick(latestDoc)}
                          title={t('kyc.delete_document')}
                        >
                          <X size={14} />
                        </ActionButton>
                      </DocumentActions>
                    </DocumentItem>
                  );
                  })()}
                </DocumentList>
              )}
            </CategoryGroup>
          );
        })}
        </DocumentCategories>
      )}

      {getNextSteps().length > 0 && (
        <NextSteps>
          <NextStepsTitle>
            <Info size={20} />
            {t('kyc.next_steps.title')}
          </NextStepsTitle>
          <NextStepsList>
            {getNextSteps().map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </NextStepsList>
        </NextSteps>
      )}

      {/* Custom Delete Confirmation Dialog */}
      <AnimatePresence>
        {showConfirmDialog && (
          <ConfirmDialog
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleDeleteCancel}
          >
            <ConfirmContent
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <ConfirmIcon>
                <AlertCircle size={32} />
              </ConfirmIcon>
              <ConfirmTitle>
                {t('kyc.delete_document')}
              </ConfirmTitle>
              <ConfirmMessage>
                {t('kyc.confirm_delete')}
                {documentToDelete && (
                  <><br /><strong>{documentToDelete.original_filename}</strong></>
                )}
              </ConfirmMessage>
              <ConfirmButtons>
                <ConfirmButton
                  variant="secondary"
                  onClick={handleDeleteCancel}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('common.cancel')}
                </ConfirmButton>
                <ConfirmButton
                  variant="primary"
                  onClick={handleDeleteConfirm}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('common.delete')}
                </ConfirmButton>
              </ConfirmButtons>
            </ConfirmContent>
          </ConfirmDialog>
        )}
      </AnimatePresence>
    </TrackerContainer>
  );
};

export default KYCProgressTracker;