import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Briefcase, 
  Shield, 
  FileText, 
  Star, 
  Phone,
  Mail,
  MapPin,
  Home,
  Building,
  Users,
  Globe,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Edit,
  Download,
  Eye,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Award,
  Wrench
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DocumentViewer } from '@/components/ui/DocumentViewer';

// API base URL
const API_BASE_URL = 'http://localhost:3006/api';

interface ContractorProfile {
  id: string;
  companyName: string;
  businessNameAr?: string;
  email: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  businessType: string;
  commercialRegistration?: string;
  vatNumber?: string;
  status: string;
  verificationLevel: number;
  averageRating: number;
  totalReviews: number;
  completedProjects: number;
  registrationDate: string;
  city: string;
  region: string;
  addressLine1: string;
  addressLine2?: string;
  postalCode?: string;
  establishedYear?: number;
  employeeCount?: number;
  description?: string;
  descriptionAr?: string;
  serviceCategories: string | string[];
  serviceAreas: string[];
  yearsExperience: number;
  preferredLanguage: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingConsent: boolean;
}

interface Document {
  id: string;
  type: string;
  filename: string;
  uploadDate: string;
  status: 'pending' | 'approved' | 'rejected';
  size: number;
  url: string;
}

export function ContractorProfilePage() {
  const { t } = useTranslation('common');
  const { contractorId } = useParams();
  const navigate = useNavigate();
  const [contractor, setContractor] = useState<ContractorProfile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch contractor profile data
  useEffect(() => {
    const fetchContractor = async () => {
      if (!contractorId) {
        setError('Contractor ID is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        // First try to get from the contractors list endpoint
        const response = await fetch(`${API_BASE_URL}/dashboard/contractors`);
        const data = await response.json();

        if (data.success) {
          const foundContractor = data.data.find((c: any) => c.id === contractorId);
          if (foundContractor) {
            setContractor(foundContractor);
          } else {
            setError('Contractor not found');
          }
        } else {
          throw new Error(data.message || 'Failed to fetch contractor');
        }

        // Fetch contractor documents from API
        const documentsResponse = await fetch(`${API_BASE_URL}/dashboard/contractors/${contractorId}/documents`);
        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();
          console.log('🔍 DEBUG: Raw contractor documents API response:', documentsData);
          if (documentsData.success && documentsData.data) {
            // Map the API response to our Document interface
            const mappedDocuments: Document[] = documentsData.data.map((doc: any) => {
              console.log(`🔍 DEBUG: Processing contractor document - type: "${doc.type}", filename: "${doc.filename || doc.originalName}"`);
              return {
                id: doc.id,
                type: doc.type,
                filename: doc.originalName || doc.filename,
                uploadDate: doc.uploadDate,
                status: doc.verificationStatus || doc.status,
                size: doc.size,
                url: doc.url
              };
            });
            setDocuments(mappedDocuments);
            console.log(`✅ Loaded ${mappedDocuments.length} documents for contractor ${contractorId}`);
            console.log('🔍 DEBUG: Mapped contractor documents:', mappedDocuments);
          }
        } else {
          console.warn('⚠️ Could not fetch contractor documents, using empty array');
          setDocuments([]);
        }
      } catch (err) {
        console.error('Failed to fetch contractor:', err);
        setError('Failed to load contractor profile');
      } finally {
        setLoading(false);
      }
    };

    fetchContractor();
  }, [contractorId]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'status-success';
      case 'verified': return 'status-success';
      case 'suspended': return 'status-danger';
      case 'rejected': return 'status-danger';
      case 'pending': return 'status-warning';
      default: return 'status-warning';
    }
  };

  const getVerificationLevelColor = (level: number) => {
    if (level >= 4) return 'text-green-600';
    if (level >= 2) return 'text-yellow-600';
    return 'text-gray-500';
  };

  const formatServiceCategories = (categories: string | string[] | null | undefined) => {
    if (!categories) return [];
    if (typeof categories === 'string') {
      // Handle PostgreSQL array format like "{residential_solar}"
      return categories.replace(/[{}]/g, '').split(',').map(cat => cat.trim()).filter(cat => cat);
    }
    return Array.isArray(categories) ? categories : [];
  };

  const handleApproveDocument = async (documentId: string) => {
    // Mock API call - in real implementation, this would call the backend
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId ? { ...doc, status: 'approved' } : doc
    ));
  };

  const handleRejectDocument = async (documentId: string) => {
    // Mock API call - in real implementation, this would call the backend
    setDocuments(prev => prev.map(doc => 
      doc.id === documentId ? { ...doc, status: 'rejected' } : doc
    ));
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentViewer(true);
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'commercial_registration':
        return <Building className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
      case 'business_license':
        return <Shield className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
      case 'vat_certificate':
        return <DollarSign className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
      case 'professional_licenses':
        return <Award className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
      case 'insurance_documents':
        return <Shield className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
      case 'tax_clearance':
        return <DollarSign className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
      case 'safety_certifications':
        return <CheckCircle className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
      case 'quality_certifications':
        return <Star className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
      default:
        return <FileText className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
    }
  };

  const getDocumentTypeName = (type: string) => {
    // Document type mapping for contractor documents
    const typeMap: { [key: string]: string } = {
      'commercial_registration': 'Commercial Registration',
      'business_license': 'Business License',
      'vat_certificate': 'VAT Certificate',
      'professional_licenses': 'Professional Licenses',
      'insurance_documents': 'Insurance Documents',
      'tax_clearance': 'Tax Clearance',
      'safety_certifications': 'Safety Certifications',
      'quality_certifications': 'Quality Certifications',
      'environmental_permits': 'Environmental Permits',
      'other_documents': 'Other Documents'
    };
    console.log(`🔍 DEBUG: Mapping contractor document type "${type}" to "${typeMap[type] || type}"`);
    return typeMap[type] || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleStatusUpdate = async (newStatus: string, notes?: string) => {
    if (!contractor) return;

    try {
      setIsUpdatingStatus(true);
      const response = await fetch(`${API_BASE_URL}/dashboard/contractors/${contractor.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus,
          notes: notes || `Status updated to ${newStatus} by admin`
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Update the contractor state with the new status
        setContractor(prev => prev ? { ...prev, status: newStatus } : null);
        console.log(`✅ Contractor status updated to ${newStatus}`);
      } else {
        console.error('Failed to update contractor status:', data.error);
        alert('Failed to update contractor status. Please try again.');
      }
    } catch (error) {
      console.error('Error updating contractor status:', error);
      alert('An error occurred while updating the status. Please try again.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const getDocumentStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return '#10b981'; // green
      case 'rejected':
        return '#ef4444'; // red
      case 'pending':
        return '#f59e0b'; // amber
      default:
        return '#6b7280'; // gray
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" message={t('common.loading')} />
      </div>
    );
  }

  if (error || !contractor) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">{t('common.error')}</h3>
        <p className="text-muted-foreground mb-4">{error || 'Contractor not found'}</p>
        <button 
          onClick={() => navigate('/contractors')} 
          className="btn-primary"
        >
          Back to Contractors
        </button>
      </div>
    );
  }

  const serviceCategories = formatServiceCategories(contractor.serviceCategories);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 -m-6 p-6">
      {/* Enhanced Header with Hero Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 mb-8"
      >
        <div className="absolute inset-0 bg-grid-pattern opacity-5"></div>
        <div className="relative p-8">
          <div className="flex items-start justify-between mb-6">
            <motion.button
              onClick={() => navigate('/contractors')}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="inline-flex items-center px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 shadow-lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              <span className="text-sm font-medium">Back to Contractors</span>
            </motion.button>
            
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 shadow-lg"
              >
                <Edit className="w-5 h-5 text-primary" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-3 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-white/20 hover:bg-white dark:hover:bg-slate-700 transition-all duration-200 shadow-lg"
              >
                <Download className="w-5 h-5 text-primary" />
              </motion.button>
            </div>
          </div>

          <div className="flex items-start space-x-6 rtl:space-x-reverse">
            {/* Company Avatar */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2 }}
              className="relative"
            >
              <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                <Briefcase className="w-12 h-12 text-white" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-green-500 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </motion.div>

            {/* Company Info */}
            <div className="flex-1 space-y-4">
              <div>
                <motion.h1 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-4xl font-bold text-foreground flex items-center mb-2"
                >
                  {contractor.companyName}
                  <span className="ml-3 rtl:ml-0 rtl:mr-3 inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200">
                    <Shield className="w-4 h-4 mr-1 rtl:mr-0 rtl:ml-1" />
                    Verified
                  </span>
                </motion.h1>
                
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex items-center space-x-4 rtl:space-x-reverse text-muted-foreground"
                >
                  <div className="flex items-center">
                    <MapPin className="w-4 h-4 mr-1 rtl:mr-0 rtl:ml-1" />
                    <span>{contractor.city || 'Riyadh'}, Saudi Arabia</span>
                  </div>
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1 rtl:mr-0 rtl:ml-1" />
                    <span>Joined {new Date(contractor.createdAt).getFullYear()}</span>
                  </div>
                </motion.div>
              </div>

              {/* Quick Stats */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="flex items-center space-x-8 rtl:space-x-reverse"
              >
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{contractor.averageRating?.toFixed(1) || '4.5'}</div>
                  <div className="flex items-center justify-center mb-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= (contractor.averageRating || 4.5) ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <div className="text-xs text-muted-foreground">Rating</div>
                </div>
                <div className="h-12 w-px bg-border"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{contractor.completedProjects || 0}</div>
                  <div className="text-xs text-muted-foreground">Projects</div>
                </div>
                <div className="h-12 w-px bg-border"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">{contractor.yearsExperience || 1}</div>
                  <div className="text-xs text-muted-foreground">Years</div>
                </div>
                <div className="h-12 w-px bg-border"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-foreground">Lvl {contractor.verificationLevel || 1}</div>
                  <div className="text-xs text-muted-foreground">Verified</div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>
      
      {/* Enhanced Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Main Content - Left Side */}
        <div className="xl:col-span-2 space-y-8">
          
          {/* Business Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-700/50 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 border-b border-slate-200/50 dark:border-slate-700/50">
              <h3 className="text-xl font-bold text-foreground flex items-center">
                <Building className="w-6 h-6 mr-3 rtl:mr-0 rtl:ml-3 text-blue-600" />
                Business Information
              </h3>
              <p className="text-sm text-muted-foreground mt-1">Complete business profile and contact details</p>
            </div>
            
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Company Name</label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Briefcase className="w-4 h-4 text-primary" />
                    <p className="text-lg font-semibold text-foreground">{contractor.companyName}</p>
                  </div>
                  {contractor.businessNameAr && (
                    <p className="text-sm text-muted-foreground mr-6 rtl:mr-0 rtl:ml-6">{contractor.businessNameAr}</p>
                  )}
                </div>
                
                <div className="space-y-1">
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Business Type</label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <Building className="w-4 h-4 text-primary" />
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-slate-100 dark:bg-slate-700 text-foreground capitalize">
                      {contractor.businessType}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Email Address</label>
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
                      <Mail className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="text-lg font-medium text-foreground">{contractor.email}</p>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Phone Number</label>
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                      <Phone className="w-4 h-4 text-blue-600" />
                    </div>
                    <p className="text-lg font-medium text-foreground">{contractor.phone}</p>
                  </div>
                </div>

                {contractor.website && (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Website</label>
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                        <Globe className="w-4 h-4 text-purple-600" />
                      </div>
                      <a 
                        href={contractor.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-lg font-medium text-primary hover:text-primary/80 transition-colors hover:underline"
                      >
                        {contractor.website}
                      </a>
                    </div>
                  </div>
                )}

                {contractor.commercialRegistration && (
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Commercial Registration</label>
                    <div className="flex items-center space-x-3 rtl:space-x-reverse">
                      <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30">
                        <FileText className="w-4 h-4 text-orange-600" />
                      </div>
                      <p className="text-lg font-medium text-foreground font-mono">{contractor.commercialRegistration}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Location Information */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="card-content">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
                {t('contractors.location')}
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contractors.address')}
                  </label>
                  <p className="font-medium">{contractor.addressLine1}</p>
                  {contractor.addressLine2 && (
                    <p className="text-sm text-muted-foreground">{contractor.addressLine2}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contractors.cityRegion')}
                  </label>
                  <p className="font-medium">{contractor.city}, {contractor.region}</p>
                  {contractor.postalCode && (
                    <p className="text-sm text-muted-foreground">{contractor.postalCode}</p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contractors.serviceAreas')}
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(contractor.serviceAreas || []).map((area, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-muted text-muted-foreground">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contractors.serviceCategories')}
                  </label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {(serviceCategories || []).map((category, index) => (
                      <span key={index} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/10 text-primary">
                        {category.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Description */}
          {contractor.description && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <div className="card-content">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <FileText className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
                  {t('contractors.description')}
                </h3>
                <p className="text-muted-foreground">{contractor.description}</p>
                {contractor.descriptionAr && (
                  <p className="text-muted-foreground mt-2 text-right">{contractor.descriptionAr}</p>
                )}
              </div>
            </motion.div>
          )}

          {/* Admin Actions Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <div className="card-content">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
                Admin Actions
              </h3>
              
              <div className="space-y-3">
                {contractor.status === 'pending' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate('verified', 'Contractor approved by admin after document review')}
                      disabled={isUpdatingStatus}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isUpdatingStatus ? 'Updating...' : 'Approve & Verify'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('rejected', 'Contractor rejected by admin due to incomplete or invalid documentation')}
                      disabled={isUpdatingStatus}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      {isUpdatingStatus ? 'Updating...' : 'Reject'}
                    </button>
                  </>
                )}
                
                {contractor.status === 'verified' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate('active', 'Contractor activated and ready for projects')}
                      disabled={isUpdatingStatus}
                      className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isUpdatingStatus ? 'Updating...' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('suspended', 'Contractor suspended by admin pending review')}
                      disabled={isUpdatingStatus}
                      className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <Clock className="w-4 h-4" />
                      {isUpdatingStatus ? 'Updating...' : 'Suspend'}
                    </button>
                  </>
                )}
                
                {contractor.status === 'active' && (
                  <button
                    onClick={() => handleStatusUpdate('suspended', 'Contractor suspended by admin')}
                    disabled={isUpdatingStatus}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Clock className="w-4 h-4" />
                    {isUpdatingStatus ? 'Updating...' : 'Suspend'}
                  </button>
                )}
                
                {contractor.status === 'suspended' && (
                  <>
                    <button
                      onClick={() => handleStatusUpdate('active', 'Contractor reactivated by admin')}
                      disabled={isUpdatingStatus}
                      className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {isUpdatingStatus ? 'Updating...' : 'Reactivate'}
                    </button>
                    <button
                      onClick={() => handleStatusUpdate('rejected', 'Contractor permanently rejected by admin')}
                      disabled={isUpdatingStatus}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      {isUpdatingStatus ? 'Updating...' : 'Reject'}
                    </button>
                  </>
                )}
                
                {contractor.status === 'rejected' && (
                  <button
                    onClick={() => handleStatusUpdate('pending', 'Contractor status reset to pending for re-review')}
                    disabled={isUpdatingStatus}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    {isUpdatingStatus ? 'Updating...' : 'Reset to Pending'}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status & Verification */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="card-content">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Shield className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
                {t('contractors.status')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contractors.currentStatus')}
                  </label>
                  <div className="mt-1">
                    <span className={getStatusColor(contractor.status)}>
                      {t(`contractors.${contractor.status}`)}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contractors.verificationLevel')}
                  </label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mt-1">
                    <Shield className={`w-4 h-4 ${getVerificationLevelColor(contractor.verificationLevel || 0)}`} />
                    <span className={`font-medium ${getVerificationLevelColor(contractor.verificationLevel || 0)}`}>
                      Level {contractor.verificationLevel || 0}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contractors.memberSince')}
                  </label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mt-1">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">
                      {new Date(contractor.registrationDate).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Performance Stats */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="card-content">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
                {t('contractors.performance')}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contractors.rating')}
                  </label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mt-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="font-medium">{(contractor.averageRating || 0).toFixed(1)}</span>
                    <span className="text-sm text-muted-foreground">
                      ({contractor.totalReviews || 0} {t('contractors.reviews')})
                    </span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contractors.completedProjects')}
                  </label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mt-1">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    <span className="font-medium">{contractor.completedProjects || 0}</span>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {t('contractors.experience')}
                  </label>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse mt-1">
                    <Award className="w-4 h-4 text-blue-500" />
                    <span className="font-medium">
                      {contractor.yearsExperience || 0} {t('contractors.years')}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Company Details */}
          {(contractor.establishedYear || contractor.employeeCount) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card"
            >
              <div className="card-content">
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Users className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
                  {t('contractors.companyDetails')}
                </h3>
                
                <div className="space-y-4">
                  {contractor.establishedYear && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('contractors.establishedYear')}
                      </label>
                      <p className="font-medium">{contractor.establishedYear}</p>
                    </div>
                  )}

                  {contractor.employeeCount && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        {t('contractors.employeeCount')}
                      </label>
                      <p className="font-medium">{contractor.employeeCount} {t('contractors.employees')}</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Documents Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <div className="card-content">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#3eb2b1', opacity: 0.1 }}>
                  <FileText className="w-6 h-6" style={{ color: '#3eb2b1' }} />
                </div>
                <h3 className="text-xl font-semibold">Business Documents</h3>
              </div>

              <div className="space-y-4">
                {documents.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No documents uploaded yet</p>
                  </div>
                ) : (
                  documents.map((document) => (
                    <div key={document.id} className="border border-border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getDocumentIcon(document.type)}
                          <div>
                            <p className="font-semibold">{getDocumentTypeName(document.type)}</p>
                            <p className="text-sm text-muted-foreground">{document.filename}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-muted-foreground">
                                {formatFileSize(document.size)}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {new Date(document.uploadDate).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          <span 
                            className="px-3 py-1 rounded-full text-xs font-medium"
                            style={{ 
                              backgroundColor: `${getDocumentStatusColor(document.status)}20`,
                              color: getDocumentStatusColor(document.status)
                            }}
                          >
                            {document.status.charAt(0).toUpperCase() + document.status.slice(1)}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleViewDocument(document)}
                              className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
                              title="View Document"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {document.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveDocument(document.id)}
                                  className="p-2 rounded-lg bg-green-100 hover:bg-green-200 text-green-700 transition-colors"
                                  title="Approve Document"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleRejectDocument(document.id)}
                                  className="p-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 transition-colors"
                                  title="Reject Document"
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Document Viewer Modal */}
      {showDocumentViewer && selectedDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-lg max-w-4xl max-h-[90vh] w-full overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="text-lg font-semibold">
                {getDocumentTypeName(selectedDocument.type)}
              </h3>
              <button
                onClick={() => setShowDocumentViewer(false)}
                className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-4 bg-muted/20 min-h-96 max-h-[70vh] overflow-auto">
              <DocumentViewer document={selectedDocument} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}