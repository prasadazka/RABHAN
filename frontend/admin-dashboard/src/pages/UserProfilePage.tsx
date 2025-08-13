import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  User, 
  Shield, 
  FileText, 
  Download, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock,
  Phone,
  Mail,
  MapPin,
  Home,
  Zap,
  DollarSign,
  Calendar,
  Star,
  AlertTriangle,
  Camera,
  CreditCard,
  Building,
  Users
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { DocumentViewer } from '@/components/ui/DocumentViewer';

// API base URL
const API_BASE_URL = 'http://localhost:3006/api';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  nationalId?: string;
  status: string;
  kycStatus: string;
  registrationDate: string;
  lastLoginAt?: string;
  region: string;
  city: string;
  district?: string;
  profileCompleted: boolean;
  profileCompletionPercentage: number;
  propertyType: string;
  electricityConsumption: string;
  roofSize?: string;
  desiredSystemSize?: string;
  budgetRange?: string;
  bnplEligible: boolean;
  bnplMaxAmount: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  samaVerified: boolean;
  userType: string;
  userRole: string;
  lastUpdated: string;
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

export function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('common');
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusUpdateError, setStatusUpdateError] = useState<string | null>(null);

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!userId) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch user profile
        const profileResponse = await fetch(`${API_BASE_URL}/users/${userId}`);
        if (!profileResponse.ok) throw new Error('Failed to fetch user profile');
        
        const profileData = await profileResponse.json();
        if (profileData.success) {
          setProfile(profileData.data);
        }

        // Fetch user documents from API
        const documentsResponse = await fetch(`${API_BASE_URL}/users/${userId}/documents`);
        if (documentsResponse.ok) {
          const documentsData = await documentsResponse.json();
          console.log('🔍 DEBUG: Raw API response:', documentsData);
          if (documentsData.success && documentsData.data) {
            // Map the API response to our Document interface
            const mappedDocuments: Document[] = documentsData.data.map((doc: any) => {
              console.log(`🔍 DEBUG: Processing document - type: "${doc.type}", filename: "${doc.filename || doc.originalName}"`);
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
            console.log(`✅ Loaded ${mappedDocuments.length} documents for user ${userId}`);
            console.log('🔍 DEBUG: Mapped documents:', mappedDocuments);
          }
        } else {
          console.warn('⚠️ Could not fetch documents, using empty array');
          setDocuments([]);
        }

      } catch (err) {
        console.error('Failed to fetch user profile:', err);
        setError('Failed to load user profile data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

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

  const handleStatusUpdate = async (newStatus: string, notes?: string) => {
    if (!profile || !userId) return;

    try {
      setIsUpdatingStatus(true);
      setStatusUpdateError(null);

      const response = await fetch(`${API_BASE_URL}/dashboard/users/${userId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: newStatus, 
          notes: notes || `Status updated to ${newStatus} by admin`
        })
      });

      const result = await response.json();

      if (response.ok && result.success) {
        // Update the profile with new status
        setProfile(prev => prev ? { ...prev, kycStatus: newStatus } : null);
        
        // Show success message (you could add a toast here)
        console.log(`✅ User status updated to ${newStatus}`);
      } else {
        const errorMessage = result.message || result.error || 'Failed to update user status';
        setStatusUpdateError(errorMessage);
        console.error('❌ Failed to update user status:', errorMessage);
      }

    } catch (error) {
      const errorMessage = 'Network error occurred while updating status';
      setStatusUpdateError(errorMessage);
      console.error('❌ Failed to update user status:', error);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const renderStatusActions = () => {
    if (!profile) return null;

    const currentStatus = profile.kycStatus;
    const actions = [];

    // Define available actions based on current status
    switch (currentStatus) {
      case 'not_verified':
      case 'pending':
        actions.push(
          <button
            key="approve"
            onClick={() => handleStatusUpdate('verified')}
            disabled={isUpdatingStatus}
            className="w-full btn-primary flex items-center justify-center gap-2"
            style={{ backgroundColor: '#3eb2b1', borderColor: '#3eb2b1' }}
          >
            <CheckCircle className="w-4 h-4" />
            {isUpdatingStatus ? 'Updating...' : 'Approve User'}
          </button>
        );
        actions.push(
          <button
            key="reject"
            onClick={() => handleStatusUpdate('rejected')}
            disabled={isUpdatingStatus}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Reject User
          </button>
        );
        break;

      case 'verified':
        actions.push(
          <button
            key="pending"
            onClick={() => handleStatusUpdate('pending')}
            disabled={isUpdatingStatus}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Set Pending
          </button>
        );
        actions.push(
          <button
            key="reject"
            onClick={() => handleStatusUpdate('rejected')}
            disabled={isUpdatingStatus}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <XCircle className="w-4 h-4" />
            Reject User
          </button>
        );
        break;

      case 'rejected':
        actions.push(
          <button
            key="approve"
            onClick={() => handleStatusUpdate('verified')}
            disabled={isUpdatingStatus}
            className="w-full btn-primary flex items-center justify-center gap-2"
            style={{ backgroundColor: '#3eb2b1', borderColor: '#3eb2b1' }}
          >
            <CheckCircle className="w-4 h-4" />
            Approve User
          </button>
        );
        actions.push(
          <button
            key="pending"
            onClick={() => handleStatusUpdate('pending')}
            disabled={isUpdatingStatus}
            className="w-full btn-secondary flex items-center justify-center gap-2"
          >
            <Clock className="w-4 h-4" />
            Set Pending
          </button>
        );
        break;

      default:
        actions.push(
          <div key="no-actions" className="text-center text-muted-foreground">
            No actions available for current status
          </div>
        );
    }

    return actions;
  };

  const handleViewDocument = (document: Document) => {
    setSelectedDocument(document);
    setShowDocumentViewer(true);
  };

  const getDocumentIcon = (type: string) => {
    switch (type) {
      case 'national_id':
      case 'national_id_back':
        return <CreditCard className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
      case 'proof_of_address':
      case 'utility_bill':
        return <Zap className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
      case 'income_proof':
        return <DollarSign className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
      case 'property_deed':
        return <Building className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
      default:
        return <FileText className="w-5 h-5" style={{ color: '#3eb2b1' }} />;
    }
  };

  const getDocumentTypeName = (type: string) => {
    // Document type mapping - Updated 2025-08-05 to fix identity_document issue
    const typeMap: { [key: string]: string } = {
      'national_id': 'National ID (Front)',
      'national_id_back': 'National ID (Back)',
      'proof_of_address': 'Proof of Address',
      'income_proof': 'Income Proof',
      'utility_bill': 'Utility Bill',
      'property_deed': 'Property Deed',
      'identity_document': 'Identity Document' // Fallback for legacy data
    };
    console.log(`🔍 DEBUG: Mapping document type "${type}" to "${typeMap[type] || type}"`);
    return typeMap[type] || type;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStatusColor = (status: string) => {
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

  const getKycStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
      case 'approved':
        return <CheckCircle className="w-5 h-5" style={{ color: '#10b981' }} />;
      case 'rejected':
        return <XCircle className="w-5 h-5" style={{ color: '#ef4444' }} />;
      default:
        return <Clock className="w-5 h-5" style={{ color: '#f59e0b' }} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" message={t('common.loading')} />
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h3 className="text-xl font-semibold mb-2">Error Loading Profile</h3>
        <p className="text-muted-foreground mb-4">{error || 'User profile not found'}</p>
        <button 
          onClick={() => navigate('/users')}
          className="btn-primary"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Users
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/users')}
            className="p-2 rounded-lg bg-muted hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center">
              <User className="w-8 h-8 mr-3 rtl:mr-0 rtl:ml-3" style={{ color: '#3eb2b1' }} />
              User Profile Verification
            </h1>
            <p className="text-muted-foreground mt-2">
              Review and verify user profile and documents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getKycStatusIcon(profile.kycStatus)}
            <span className="text-sm font-medium">
              {profile.kycStatus === 'not_verified' ? 'Pending Verification' : 
               profile.kycStatus === 'verified' ? 'Verified' :
               profile.kycStatus === 'approved' ? 'Approved' : 'Under Review'}
            </span>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="card-content">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#3eb2b1', opacity: 0.1 }}>
                  <User className="w-6 h-6" style={{ color: '#3eb2b1' }} />
                </div>
                <h3 className="text-xl font-semibold">Basic Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Users className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-semibold">{profile.name}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-semibold">{profile.email}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${ 
                        profile.emailVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {profile.emailVerified ? 'Verified' : 'Not Verified'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Phone Number</p>
                      <p className="font-semibold">{profile.phone}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${ 
                        profile.phoneVerified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {profile.phoneVerified ? 'Verified' : 'Not Verified'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-semibold">{profile.city}, {profile.region}</p>
                      {profile.district && <p className="text-sm text-muted-foreground">{profile.district}</p>}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Registration Date</p>
                      <p className="font-semibold">{new Date(profile.registrationDate).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {profile.lastLoginAt && (
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Last Login</p>
                        <p className="font-semibold">{new Date(profile.lastLoginAt).toLocaleDateString()}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* Property & Solar Information Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="card-content">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#3eb2b1', opacity: 0.1 }}>
                  <Home className="w-6 h-6" style={{ color: '#3eb2b1' }} />
                </div>
                <h3 className="text-xl font-semibold">Property & Solar Information</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Property Type</p>
                      <p className="font-semibold">{profile.propertyType}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Zap className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Electricity Consumption</p>
                      <p className="font-semibold">{profile.electricityConsumption} KWh/month</p>
                    </div>
                  </div>

                  {profile.roofSize && (
                    <div className="flex items-center gap-3">
                      <Home className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Roof Size</p>
                        <p className="font-semibold">{profile.roofSize} m²</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {profile.desiredSystemSize && (
                    <div className="flex items-center gap-3">
                      <Star className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Desired System Size</p>
                        <p className="font-semibold">{profile.desiredSystemSize} KW</p>
                      </div>
                    </div>
                  )}

                  {profile.budgetRange && (
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-5 h-5 text-muted-foreground" />
                      <div>
                        <p className="text-sm text-muted-foreground">Budget Range</p>
                        <p className="font-semibold">SAR {profile.budgetRange}</p>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">BNPL Eligibility</p>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-full text-xs ${ 
                          profile.bnplEligible ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {profile.bnplEligible ? 'Eligible' : 'Not Eligible'}
                        </span>
                        {profile.bnplEligible && (
                          <span className="text-sm text-muted-foreground">
                            (Max: SAR {parseFloat(profile.bnplMaxAmount).toLocaleString()})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Documents Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="card-content">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-3 rounded-lg" style={{ backgroundColor: '#3eb2b1', opacity: 0.1 }}>
                  <FileText className="w-6 h-6" style={{ color: '#3eb2b1' }} />
                </div>
                <h3 className="text-xl font-semibold">Uploaded Documents</h3>
              </div>

              <div className="space-y-4">
                {documents.map((document) => (
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
                            backgroundColor: `${getStatusColor(document.status)}20`,
                            color: getStatusColor(document.status)
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
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Right Column - Profile Status & Actions */}
        <div className="space-y-6">
          {/* Profile Completion Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="card-content">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-lg" style={{ backgroundColor: '#3eb2b1', opacity: 0.1 }}>
                  <Shield className="w-5 h-5" style={{ color: '#3eb2b1' }} />
                </div>
                <h3 className="text-lg font-semibold">Profile Status</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-muted-foreground">Profile Completion</span>
                    <span className="text-sm font-medium">{profile.profileCompletionPercentage}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="h-2 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${profile.profileCompletionPercentage}%`,
                        backgroundColor: '#3eb2b1'
                      }}
                    />
                  </div>
                </div>

                <div className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Email Verification</span>
                    {profile.emailVerified ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Phone Verification</span>
                    {profile.phoneVerified ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-sm">SAMA Verification</span>
                    {profile.samaVerified ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-600" />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Action Buttons Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="card-content">
              <h3 className="text-lg font-semibold mb-4">Verification Actions</h3>
              
              {statusUpdateError && (
                <div className="mb-4 p-3 bg-red-100 border border-red-300 rounded-lg">
                  <p className="text-red-700 text-sm">{statusUpdateError}</p>
                </div>
              )}
              
              <div className="space-y-3">
                {renderStatusActions()}
              </div>
              
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Current Status:</span>
                  <span className="font-medium text-foreground">
                    {profile?.kycStatus === 'not_verified' ? 'Pending Verification' :
                     profile?.kycStatus === 'verified' ? 'Verified' :
                     profile?.kycStatus === 'rejected' ? 'Rejected' : 
                     profile?.kycStatus === 'pending' ? 'Under Review' : 
                     'Unknown'}
                  </span>
                </div>
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