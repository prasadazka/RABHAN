import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Filter,
  Download,
  Trash2,
  Eye,
  FileText,
  Image as ImageIcon,
  File,
  AlertCircle,
  CheckCircle,
  Clock,
  Shield,
  MoreVertical,
  Calendar,
  User,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import { 
  documentService, 
  DocumentService,
  DocumentMetadata, 
  DocumentCategory, 
  DocumentFilters,
  DocumentListResponse 
} from '../../services/document.service';

// Styled Components
const ManagerContainer = styled.div`
  background: var(--color-background-surface);
  border-radius: 12px;
  padding: 24px;
  border: 1px solid var(--color-border-light);
`;

const Header = styled.div`
  display: flex;
  justify-content: between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
`;

const Title = styled.h2`
  margin: 0;
  color: var(--color-text-primary);
  font-size: 20px;
  font-weight: 600;
`;

const Controls = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  flex: 1;
  justify-content: flex-end;
`;

const SearchBox = styled.div`
  position: relative;
  min-width: 250px;
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 10px 16px 10px 40px;
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
  
  &::placeholder {
    color: var(--color-text-tertiary);
  }
`;

const SearchIcon = styled(Search)`
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--color-text-tertiary);
  width: 18px;
  height: 18px;
`;

const FilterSelect = styled.select`
  padding: 10px 16px;
  border: 1px solid var(--color-border-medium);
  border-radius: 8px;
  font-size: 14px;
  background: var(--color-background-primary);
  color: var(--color-text-primary);
  min-width: 150px;
  
  &:focus {
    outline: none;
    border-color: var(--color-primary-500);
    box-shadow: 0 0 0 3px var(--color-primary-100);
  }
`;

const RefreshButton = styled(motion.button)`
  padding: 10px;
  border: 1px solid var(--color-border-medium);
  border-radius: 8px;
  background: var(--color-background-primary);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-background-secondary);
    color: var(--color-text-primary);
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const DocumentGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const DocumentCard = styled(motion.div)`
  background: var(--color-background-primary);
  border: 1px solid var(--color-border-light);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    border-color: var(--color-primary-300);
    box-shadow: var(--shadow-md);
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const FileIcon = styled.div<{ fileType: string }>`
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  background: ${props => {
    if (props.fileType.startsWith('image/')) return 'var(--color-success-500)';
    if (props.fileType === 'application/pdf') return 'var(--color-error-500)';
    return 'var(--color-neutral-500)';
  }};
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ActionButton = styled(motion.button)`
  padding: 6px;
  border: none;
  border-radius: 6px;
  background: var(--color-background-secondary);
  color: var(--color-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  
  &:hover {
    background: var(--color-neutral-200);
    color: var(--color-text-primary);
  }
`;

const FileName = styled.div`
  font-weight: 500;
  color: var(--color-text-primary);
  margin-bottom: 4px;
  font-size: 14px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const FileDetails = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--color-text-secondary);
`;

const StatusBadges = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const StatusBadge = styled.div<{ status: string }>`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  background: ${props => {
    const color = DocumentService.getStatusColor(props.status);
    return `${color}20`;
  }};
  color: ${props => DocumentService.getStatusColor(props.status)};
  text-transform: capitalize;
`;

const CategoryBadge = styled.div`
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  margin-bottom: 8px;
  display: inline-block;
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 60px 20px;
  color: var(--color-text-secondary);
  
  .icon {
    width: 64px;
    height: 64px;
    margin: 0 auto 16px;
    color: var(--color-text-tertiary);
  }
  
  h3 {
    margin: 0 0 8px 0;
    color: var(--color-text-primary);
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
`;

const LoadingState = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: var(--color-text-secondary);
  gap: 12px;
`;

const Pagination = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 24px;
  flex-wrap: wrap;
  gap: 16px;
`;

const PaginationInfo = styled.div`
  font-size: 14px;
  color: var(--color-text-secondary);
`;

const PaginationButtons = styled.div`
  display: flex;
  gap: 8px;
`;

const PaginationButton = styled(motion.button)<{ active?: boolean }>`
  padding: 8px 12px;
  border: 1px solid var(--color-border-medium);
  border-radius: 6px;
  background: ${props => props.active ? 'var(--color-primary-500)' : 'var(--color-background-primary)'};
  color: ${props => props.active ? 'white' : 'var(--color-text-primary)'};
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s ease;
  
  &:hover:not(:disabled) {
    background: ${props => props.active ? 'var(--color-primary-600)' : 'var(--color-background-secondary)'};
  }
  
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;

// Interfaces
interface DocumentManagerProps {
  onDocumentSelect?: (document: DocumentMetadata) => void;
  allowedCategories?: string[];
  showUpload?: boolean;
  className?: string;
}

// Component
const DocumentManager: React.FC<DocumentManagerProps> = ({
  onDocumentSelect,
  allowedCategories,
  showUpload = true,
  className
}) => {
  const { t, i18n } = useTranslation();
  
  // State
  const [documents, setDocuments] = useState<DocumentMetadata[]>([]);
  const [categories, setCategories] = useState<DocumentCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<DocumentFilters>({
    limit: 12,
    offset: 0
  });

  // Load documents and categories
  useEffect(() => {
    loadData();
    loadCategories();
  }, [filters]);

  const loadCategories = async () => {
    try {
      const allCategories = await documentService.getCategories();
      const filteredCategories = allowedCategories 
        ? allCategories.filter(cat => allowedCategories.includes(cat.id))
        : allCategories;
      setCategories(filteredCategories);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const response: DocumentListResponse = await documentService.getDocuments(filters);
      setDocuments(response.documents);
      setTotalCount(response.total_count);
    } catch (error: any) {
      console.error('Failed to load documents:', error);
      toast.error(error.message || t('documents.manager.error.load_failed'));
    } finally {
      setLoading(false);
    }
  };

  // Refresh data
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setFilters(prev => ({
      ...prev,
      search: query || undefined,
      offset: 0
    }));
    setCurrentPage(1);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((key: keyof DocumentFilters, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value || undefined,
      offset: 0
    }));
    setCurrentPage(1);
  }, []);

  // Handle pagination
  const handlePageChange = (page: number) => {
    const newOffset = (page - 1) * (filters.limit || 12);
    setFilters(prev => ({ ...prev, offset: newOffset }));
    setCurrentPage(page);
  };

  // Download document
  const handleDownload = async (document: DocumentMetadata) => {
    try {
      const blob = await documentService.downloadDocument(document.document_id);
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = document.original_filename;
      window.document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      window.document.body.removeChild(link);
      toast.success(t('documents.manager.download_success'));
    } catch (error: any) {
      console.error('Download failed:', error);
      toast.error(error.message || t('documents.manager.error.download_failed'));
    }
  };

  // Delete document
  const handleDelete = async (document: DocumentMetadata) => {
    if (!window.confirm(t('documents.manager.delete_confirm'))) {
      return;
    }
    
    try {
      await documentService.deleteDocument(document.document_id);
      toast.success(t('documents.manager.delete_success'));
      await loadData(); // Reload documents
    } catch (error: any) {
      console.error('Delete failed:', error);
      toast.error(error.message || t('documents.manager.error.delete_failed'));
    }
  };

  // Get file icon
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <ImageIcon size={20} />;
    } else if (mimeType === 'application/pdf') {
      return <FileText size={20} />;
    }
    return <File size={20} />;
  };

  // Get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'validated':
      case 'clean':
        return <CheckCircle size={12} />;
      case 'rejected':
      case 'infected':
        return <AlertCircle size={12} />;
      case 'pending':
      case 'processing':
      case 'scanning':
        return <Clock size={12} />;
      default:
        return <Shield size={12} />;
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    return DocumentService.formatFileSize(bytes);
  };

  // Calculate pagination
  const totalPages = Math.ceil(totalCount / (filters.limit || 12));
  const startItem = (currentPage - 1) * (filters.limit || 12) + 1;
  const endItem = Math.min(currentPage * (filters.limit || 12), totalCount);

  return (
    <ManagerContainer className={className}>
      <Header>
        <Title>{t('documents.manager.title')}</Title>
        
        <Controls>
          <SearchBox>
            <SearchIcon />
            <SearchInput
              type="text"
              placeholder={t('documents.manager.search_placeholder')}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </SearchBox>
          
          <FilterSelect
            value={filters.category_id || ''}
            onChange={(e) => handleFilterChange('category_id', e.target.value)}
          >
            <option value="">{t('documents.manager.all_categories')}</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </FilterSelect>
          
          <FilterSelect
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">{t('documents.manager.all_statuses')}</option>
            <option value="pending">{t('documents.status.pending')}</option>
            <option value="processing">{t('documents.status.processing')}</option>
            <option value="validated">{t('documents.status.validated')}</option>
            <option value="approved">{t('documents.status.approved')}</option>
            <option value="rejected">{t('documents.status.rejected')}</option>
          </FilterSelect>
          
          <RefreshButton
            onClick={handleRefresh}
            disabled={refreshing}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </RefreshButton>
        </Controls>
      </Header>

      {loading ? (
        <LoadingState>
          <RefreshCw size={20} className="animate-spin" />
          {t('documents.manager.loading')}
        </LoadingState>
      ) : documents.length === 0 ? (
        <EmptyState>
          <FileText className="icon" />
          <h3>{t('documents.manager.empty.title')}</h3>
          <p>{t('documents.manager.empty.description')}</p>
        </EmptyState>
      ) : (
        <>
          <DocumentGrid>
            <AnimatePresence mode="popLayout">
              {documents.map((document) => (
                <DocumentCard
                  key={document.document_id}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  whileHover={{ y: -2 }}
                  onClick={() => onDocumentSelect?.(document)}
                >
                  <CardHeader>
                    <FileIcon fileType={document.mime_type}>
                      {getFileIcon(document.mime_type)}
                    </FileIcon>
                    
                    <CardActions onClick={(e) => e.stopPropagation()}>
                      <ActionButton
                        onClick={() => handleDownload(document)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Download size={14} />
                      </ActionButton>
                      <ActionButton
                        onClick={() => handleDelete(document)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                      >
                        <Trash2 size={14} />
                      </ActionButton>
                    </CardActions>
                  </CardHeader>
                  
                  {document.category && (
                    <CategoryBadge>
                      {document.category.name}
                    </CategoryBadge>
                  )}
                  
                  <FileName>{document.original_filename}</FileName>
                  
                  <FileDetails>
                    <span>{formatFileSize(document.file_size_bytes)}</span>
                    <span>•</span>
                    <span>{formatDate(document.upload_timestamp)}</span>
                  </FileDetails>
                  
                  <StatusBadges>
                    <StatusBadge status={document.document_status}>
                      {getStatusIcon(document.document_status)}
                      {DocumentService.getStatusText(document.document_status, i18n.language)}
                    </StatusBadge>
                    
                    {document.virus_scan_status !== 'clean' && (
                      <StatusBadge status={document.virus_scan_status}>
                        {getStatusIcon(document.virus_scan_status)}
                        {DocumentService.getStatusText(document.virus_scan_status, i18n.language)}
                      </StatusBadge>
                    )}
                    
                    {document.approval_status !== 'pending' && (
                      <StatusBadge status={document.approval_status}>
                        {getStatusIcon(document.approval_status)}
                        {DocumentService.getStatusText(document.approval_status, i18n.language)}
                      </StatusBadge>
                    )}
                  </StatusBadges>
                </DocumentCard>
              ))}
            </AnimatePresence>
          </DocumentGrid>

          {totalPages > 1 && (
            <Pagination>
              <PaginationInfo>
                {t('documents.manager.pagination.showing', {
                  start: startItem,
                  end: endItem,
                  total: totalCount
                })}
              </PaginationInfo>
              
              <PaginationButtons>
                <PaginationButton
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('common.previous')}
                </PaginationButton>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <PaginationButton
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      active={pageNum === currentPage}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {pageNum}
                    </PaginationButton>
                  );
                })}
                
                <PaginationButton
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {t('common.next')}
                </PaginationButton>
              </PaginationButtons>
            </Pagination>
          )}
        </>
      )}
    </ManagerContainer>
  );
};

export default DocumentManager;