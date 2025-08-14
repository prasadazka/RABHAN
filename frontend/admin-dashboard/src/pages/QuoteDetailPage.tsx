import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Building,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ArrowLeft,
  Download,
  RefreshCw,
  Users,
  Activity,
  AlertCircle,
  Check,
  X,
  Edit,
  Save,
  MessageSquare,
  Eye
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

// API base URL - Admin service proxy endpoints
const API_BASE_URL = 'http://localhost:3006/api/v1';

interface Quote {
  id: string;
  user_id: string;
  user_email: string;
  user_first_name: string;
  user_last_name: string;
  user_phone: string;
  system_size_kwp: number;
  location_address: string;
  service_area: string;
  status: string;
  property_details: any;
  electricity_consumption: any;
  created_at: string;
  updated_at: string;
  assigned_contractors_count: number;
  received_quotes_count: number;
  approved_quotes_count: number;
  preferred_installation_date?: string;
}

interface Assignment {
  id: string;
  contractor_id: string;
  contractor_name: string;
  contractor_email: string;
  contractor_phone: string;
  status: string;
  assigned_at: string;
  viewed_at?: string;
  responded_at?: string;
  response_notes?: string;
  has_submitted_quote: boolean;
  base_price?: number;
}

interface ContractorQuote {
  id: string;
  contractor_id: string;
  contractor_name?: string;
  base_price: string | number;
  price_per_kwp: string | number;
  overprice_amount: string | number;
  total_user_price: string | number;
  system_specs: any;
  installation_timeline_days: number;
  warranty_terms: any;
  maintenance_terms: any;
  panels_brand: string | null;
  panels_model: string | null;
  panels_quantity: number | null;
  inverter_brand: string | null;
  inverter_model: string | null;
  inverter_quantity: number | null;
  admin_status: string;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  is_selected: boolean;
  selected_at: string | null;
  created_at: string;
  updated_at: string;
  expires_at: string;
  contractor_vat_number: string;
  installation_deadline: string;
  payment_terms: string;
  solar_system_capacity_kwp: string;
  storage_capacity_kwh: string;
  monthly_production_kwh: string;
  line_items: any[];
}

export function QuoteDetailPage() {
  const { quoteId } = useParams<{ quoteId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [contractorQuotes, setContractorQuotes] = useState<ContractorQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'assignments' | 'quotes' | 'timeline'>('overview');
  const [selectedQuoteForDetail, setSelectedQuoteForDetail] = useState<ContractorQuote | null>(null);
  const [showQuoteDetailModal, setShowQuoteDetailModal] = useState(false);
  const [approvingQuote, setApprovingQuote] = useState<string | null>(null);
  const [rejectingQuote, setRejectingQuote] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [showRejectionDialog, setShowRejectionDialog] = useState(false);
  const [quoteToApprove, setQuoteToApprove] = useState<string | null>(null);
  const [quoteToReject, setQuoteToReject] = useState<string | null>(null);
  const [tempAdminNotes, setTempAdminNotes] = useState('');
  const [tempRejectionReason, setTempRejectionReason] = useState('');

  // Load quote data
  useEffect(() => {
    if (quoteId) {
      loadQuoteData();
    }
  }, [quoteId]);

  const loadQuoteData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load quote details
      const quoteResponse = await fetch(`${API_BASE_URL}/quotes/${quoteId}`);
      const quoteData = await quoteResponse.json();

      if (quoteData.success) {
        setQuote(quoteData.data.quote);
      } else {
        throw new Error(quoteData.message || 'Failed to load quote');
      }

      // Load assignments
      const assignmentsResponse = await fetch(`${API_BASE_URL}/quotes/${quoteId}/assignments`);
      const assignmentsData = await assignmentsResponse.json();

      if (assignmentsData.success) {
        setAssignments(assignmentsData.data.assignments || []);
      }

      // Load contractor quotes
      const quotesResponse = await fetch(`${API_BASE_URL}/quotes/${quoteId}/contractor-quotes`);
      const quotesData = await quotesResponse.json();

      if (quotesData.success) {
        setContractorQuotes(quotesData.data.contractor_quotes || []);
      }

    } catch (err) {
      console.error('Error loading quote data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load quote data');
      toast.error('Failed to load quote data');
    } finally {
      setLoading(false);
    }
  };

  // Handle quote detail view
  const handleViewQuoteDetail = (contractorQuote: ContractorQuote) => {
    setSelectedQuoteForDetail(contractorQuote);
    setShowQuoteDetailModal(true);
  };

  // Handle quote approval confirmation
  const showApprovalConfirmation = (quoteId: string) => {
    setQuoteToApprove(quoteId);
    setTempAdminNotes('');
    setShowApprovalDialog(true);
  };

  // Handle quote approval
  const handleApproveQuote = async () => {
    if (!quoteToApprove) return;
    
    try {
      setApprovingQuote(quoteToApprove);
      
      const response = await fetch(`http://localhost:3006/api/contractor-quotes/${quoteToApprove}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rabhan_admin_token')}`
        },
        body: JSON.stringify({
          admin_notes: tempAdminNotes
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Quote approved successfully');
        loadQuoteData(); // Reload the quote data
        setShowApprovalDialog(false);
        setQuoteToApprove(null);
        setTempAdminNotes('');
      } else {
        throw new Error(data.message || 'Failed to approve quote');
      }
    } catch (error) {
      console.error('Error approving quote:', error);
      toast.error('Failed to approve quote');
    } finally {
      setApprovingQuote(null);
    }
  };

  // Handle quote rejection confirmation
  const showRejectionConfirmation = (quoteId: string) => {
    setQuoteToReject(quoteId);
    setTempRejectionReason('');
    setTempAdminNotes('');
    setShowRejectionDialog(true);
  };

  // Handle quote rejection
  const handleRejectQuote = async () => {
    if (!quoteToReject) return;
    
    try {
      if (!tempRejectionReason.trim()) {
        toast.error('Please provide a rejection reason');
        return;
      }
      
      setRejectingQuote(quoteToReject);
      
      const response = await fetch(`http://localhost:3006/api/contractor-quotes/${quoteToReject}/reject`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rabhan_admin_token')}`
        },
        body: JSON.stringify({
          rejection_reason: tempRejectionReason,
          admin_notes: tempAdminNotes
        })
      });
      
      const data = await response.json();
      
      if (data.success) {
        toast.success('Quote rejected successfully');
        loadQuoteData(); // Reload the quote data
        setShowRejectionDialog(false);
        setQuoteToReject(null);
        setTempRejectionReason('');
        setTempAdminNotes('');
      } else {
        throw new Error(data.message || 'Failed to reject quote');
      }
    } catch (error) {
      console.error('Error rejecting quote:', error);
      toast.error('Failed to reject quote');
    } finally {
      setRejectingQuote(null);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'in_progress': return 'text-blue-600 bg-blue-50';
      case 'completed': return 'text-green-600 bg-green-50';
      case 'cancelled': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getAdminStatusBadge = (adminStatus: string) => {
    switch (adminStatus.toLowerCase()) {
      case 'pending_review':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-yellow-400 to-orange-400 text-white shadow-sm">
            <Clock className="w-3 h-3 mr-1" />
            PENDING REVIEW
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-green-500 to-green-600 text-white shadow-sm">
            <CheckCircle className="w-3 h-3 mr-1" />
            APPROVED
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-red-500 to-red-600 text-white shadow-sm">
            <XCircle className="w-3 h-3 mr-1" />
            REJECTED
          </span>
        );
      case 'submitted':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm">
            <FileText className="w-3 h-3 mr-1" />
            SUBMITTED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gradient-to-r from-gray-400 to-gray-500 text-white shadow-sm">
            <AlertCircle className="w-3 h-3 mr-1" />
            {adminStatus.toUpperCase().replace('_', ' ')}
          </span>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-2xl font-semibold text-gray-900">Quote Not Found</h2>
          <p className="text-gray-600">{error || 'The requested quote could not be found.'}</p>
          <button
            onClick={() => navigate('/quotes')}
            className="btn-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigate('/quotes')}
            className="btn-outline btn-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Quotes
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <FileText className="w-6 h-6 mr-3 text-[#3eb2b1]" />
              Quote Request Details
            </h1>
            <p className="text-gray-600 mt-1">ID: {quote.id}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(quote.status)}`}>
            {quote.status.replace('_', ' ').toUpperCase()}
          </span>
          <button
            onClick={loadQuoteData}
            className="btn-outline btn-sm"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: FileText },
            { id: 'assignments', label: `Contractor Assignments (${assignments.length})`, icon: Users },
            { id: 'quotes', label: `Submitted Quotes (${contractorQuotes.length})`, icon: Activity },
            { id: 'timeline', label: 'Timeline', icon: Clock }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === id
                  ? 'border-[#3eb2b1] text-[#3eb2b1]'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Icon className="w-4 h-4 mr-2" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold flex items-center mb-4">
                <User className="w-5 h-5 mr-2 text-[#3eb2b1]" />
                Customer Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="text-gray-600 w-20">Name:</span>
                  <span className="font-medium">{quote.user_first_name} {quote.user_last_name}</span>
                </div>
                <div className="flex items-center">
                  <Mail className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600 w-16">Email:</span>
                  <a href={`mailto:${quote.user_email}`} className="text-[#3eb2b1] hover:underline">
                    {quote.user_email}
                  </a>
                </div>
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                  <span className="text-gray-600 w-16">Phone:</span>
                  <a href={`tel:${quote.user_phone}`} className="text-[#3eb2b1] hover:underline">
                    {quote.user_phone || 'Not provided'}
                  </a>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-600 w-20">User ID:</span>
                  <span className="text-sm text-gray-500 font-mono">{quote.user_id}</span>
                </div>
              </div>
            </div>

            {/* System Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold flex items-center mb-4">
                <Building className="w-5 h-5 mr-2 text-[#3eb2b1]" />
                System Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center">
                  <span className="text-gray-600 w-24">System Size:</span>
                  <span className="font-medium">{quote.system_size_kwp} kWp</span>
                </div>
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 text-gray-400 mr-2 mt-1" />
                  <div className="flex-1">
                    <span className="text-gray-600">Location:</span>
                    <p className="font-medium">{quote.location_address}</p>
                  </div>
                </div>
                <div className="flex items-center">
                  <span className="text-gray-600 w-24">Service Area:</span>
                  <span className="font-medium">{quote.service_area}</span>
                </div>
                {quote.preferred_installation_date && (
                  <div className="flex items-center">
                    <Calendar className="w-4 h-4 text-gray-400 mr-2" />
                    <span className="text-gray-600 w-24">Install Date:</span>
                    <span className="font-medium">{formatDate(quote.preferred_installation_date)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Property Details */}
            {quote.property_details && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold flex items-center mb-4">
                  <Building className="w-5 h-5 mr-2 text-[#3eb2b1]" />
                  Property Details
                </h3>
                <div className="space-y-3">
                  {Object.entries(quote.property_details).map(([key, value]) => (
                    <div key={key} className="flex items-center">
                      <span className="text-gray-600 w-32 capitalize">{key.replace('_', ' ')}:</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Quote Statistics */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold flex items-center mb-4">
                <Activity className="w-5 h-5 mr-2 text-[#3eb2b1]" />
                Quote Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Assigned Contractors:</span>
                  <span className="font-medium text-lg">{quote.assigned_contractors_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Received Quotes:</span>
                  <span className="font-medium text-lg">{quote.received_quotes_count}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Approved Quotes:</span>
                  <span className="font-medium text-lg">{quote.approved_quotes_count}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Created:</span>
                    <span className="font-medium">{formatDate(quote.created_at)}</span>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-gray-600">Updated:</span>
                    <span className="font-medium">{formatDate(quote.updated_at)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'assignments' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center">
                <Users className="w-5 h-5 mr-2 text-[#3eb2b1]" />
                Contractor Assignments ({assignments.length})
              </h3>
            </div>
            
            {assignments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No contractor assignments found</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {assignment.contractor_name}
                        </h4>
                        <div className="mt-2 space-y-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-2" />
                            <a href={`mailto:${assignment.contractor_email}`} className="text-[#3eb2b1] hover:underline">
                              {assignment.contractor_email}
                            </a>
                          </div>
                          {assignment.contractor_phone && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-2" />
                              <a href={`tel:${assignment.contractor_phone}`} className="text-[#3eb2b1] hover:underline">
                                {assignment.contractor_phone}
                              </a>
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>Assigned: {formatDate(assignment.assigned_at)}</span>
                          </div>
                          {assignment.viewed_at && (
                            <div className="flex items-center">
                              <Clock className="w-4 h-4 mr-2" />
                              <span>Viewed: {formatDate(assignment.viewed_at)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(assignment.status)}`}>
                          {assignment.status.toUpperCase()}
                        </span>
                        {assignment.has_submitted_quote && (
                          <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                            Quote Submitted
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {assignment.response_notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-md">
                        <p className="text-sm text-gray-700">
                          <MessageSquare className="w-4 h-4 inline mr-1" />
                          {assignment.response_notes}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'quotes' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold flex items-center">
                <Activity className="w-5 h-5 mr-2 text-[#3eb2b1]" />
                Submitted Quotes ({contractorQuotes.length})
              </h3>
            </div>
            
            {contractorQuotes.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Activity className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No quotes submitted yet</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {contractorQuotes.map((quote) => (
                  <div key={quote.id} className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="text-lg font-semibold text-gray-900">
                          {quote.contractor_name || `Contractor ID: ${quote.contractor_id}`}
                        </h4>
                        {quote.contractor_name && (
                          <p className="text-sm text-gray-600">ID: {quote.contractor_id}</p>
                        )}
                        <div className="mt-3 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-gray-600">Base Price:</span>
                            <p className="font-semibold text-lg text-green-600">
                              SAR {parseFloat(quote.base_price?.toString() || '0').toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Total User Price:</span>
                            <p className="font-semibold text-lg text-blue-600">
                              SAR {parseFloat(quote.total_user_price?.toString() || '0').toLocaleString()}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Price per kWp:</span>
                            <p className="font-medium">SAR {parseFloat(quote.price_per_kwp?.toString() || '0').toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Installation Timeline:</span>
                            <p className="font-medium">{quote.installation_timeline_days} days</p>
                          </div>
                          <div>
                            <span className="text-gray-600">System Capacity:</span>
                            <p className="font-medium">{quote.solar_system_capacity_kwp} kWp</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Monthly Production:</span>
                            <p className="font-medium">{quote.monthly_production_kwh} kWh</p>
                          </div>
                          <div>
                            <span className="text-gray-600">Panels:</span>
                            <p className="font-medium">
                              {quote.panels_brand && quote.panels_model 
                                ? `${quote.panels_brand} ${quote.panels_model}` 
                                : 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Inverter:</span>
                            <p className="font-medium">
                              {quote.inverter_brand && quote.inverter_model 
                                ? `${quote.inverter_brand} ${quote.inverter_model}` 
                                : 'Not specified'}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-600">Submitted:</span>
                            <p className="font-medium">{formatDate(quote.created_at)}</p>
                          </div>
                        </div>
                        {quote.admin_notes && (
                          <div className="mt-3 p-3 bg-blue-50 rounded-md">
                            <span className="text-sm font-medium text-blue-800">Admin Notes:</span>
                            <p className="text-sm text-blue-700">{quote.admin_notes}</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex flex-col items-end space-y-3">
                        {getAdminStatusBadge(quote.admin_status)}
                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => handleViewQuoteDetail(quote)}
                            className="relative overflow-hidden px-4 py-2 bg-gradient-to-r from-[#3eb2b1] to-[#2d9998] text-white font-semibold rounded-lg shadow-lg hover:from-[#2d9998] hover:to-[#1f7574] hover:shadow-xl transform hover:scale-105 transition-all duration-200 flex items-center"
                          >
                            <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                            <Eye className="w-4 h-4 mr-2 relative z-10" />
                            <span className="relative z-10">View Full Details</span>
                          </button>
                          {quote.admin_status === 'pending_review' && (
                            <>
                              <button 
                                onClick={() => showApprovalConfirmation(quote.id)}
                                disabled={approvingQuote === quote.id}
                                className="relative overflow-hidden px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg shadow-lg hover:from-green-600 hover:to-green-700 hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                                <Check className="w-4 h-4 mr-2 relative z-10" />
                                <span className="relative z-10">{approvingQuote === quote.id ? 'Approving...' : 'Approve'}</span>
                                {approvingQuote === quote.id && (
                                  <div className="ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10"></div>
                                )}
                              </button>
                              <button 
                                onClick={() => showRejectionConfirmation(quote.id)}
                                disabled={rejectingQuote === quote.id}
                                className="relative overflow-hidden px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-lg shadow-lg hover:from-red-600 hover:to-red-700 hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
                              >
                                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                                <X className="w-4 h-4 mr-2 relative z-10" />
                                <span className="relative z-10">{rejectingQuote === quote.id ? 'Rejecting...' : 'Reject'}</span>
                                {rejectingQuote === quote.id && (
                                  <div className="ml-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10"></div>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'timeline' && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold flex items-center mb-6">
              <Clock className="w-5 h-5 mr-2 text-[#3eb2b1]" />
              Quote Timeline
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-[#3eb2b1] rounded-full flex items-center justify-center">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-900">Quote Request Created</p>
                  <p className="text-sm text-gray-500">{formatDate(quote.created_at)}</p>
                </div>
              </div>
              
              {assignments.map((assignment) => (
                <div key={assignment.id} className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                      <Users className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">
                      Contractor Assigned: {assignment.contractor_name}
                    </p>
                    <p className="text-sm text-gray-500">{formatDate(assignment.assigned_at)}</p>
                  </div>
                </div>
              ))}
              
              {quote.updated_at !== quote.created_at && (
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center">
                      <Edit className="w-4 h-4 text-white" />
                    </div>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-gray-900">Quote Updated</p>
                    <p className="text-sm text-gray-500">{formatDate(quote.updated_at)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>

      {/* Detailed Quote Modal */}
      {showQuoteDetailModal && selectedQuoteForDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="border-b border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-[#3eb2b1]" />
                  Contractor Quote Details
                </h2>
                <button
                  onClick={() => setShowQuoteDetailModal(false)}
                  className="btn-outline btn-sm"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Quote Header */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <h3 className="text-lg font-semibold mb-4">Quote Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Quote ID:</span>
                      <p className="font-mono text-xs">{selectedQuoteForDetail.id}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Contractor:</span>
                      <p className="font-medium">{selectedQuoteForDetail.contractor_name || 'Unknown Company'}</p>
                      <p className="font-mono text-xs text-gray-500">ID: {selectedQuoteForDetail.contractor_id}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Status:</span>
                      <div className="mt-1">
                        {getAdminStatusBadge(selectedQuoteForDetail.admin_status)}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-600">VAT Number:</span>
                      <p className="font-medium">{selectedQuoteForDetail.contractor_vat_number || 'Not provided'}</p>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold mb-4">Timeline</h3>
                  <div className="space-y-3 text-sm">
                    <div>
                      <span className="text-gray-600">Submitted:</span>
                      <p className="font-medium">{formatDate(selectedQuoteForDetail.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Installation Timeline:</span>
                      <p className="font-medium">{selectedQuoteForDetail.installation_timeline_days} days</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Installation Deadline:</span>
                      <p className="font-medium">{formatDate(selectedQuoteForDetail.installation_deadline)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Quote Expires:</span>
                      <p className="font-medium">{formatDate(selectedQuoteForDetail.expires_at)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Complete Itemized Quotation Table */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold mb-4">Itemized Quotation Breakdown</h3>
                
                {(() => {
                  const basePrice = parseFloat(selectedQuoteForDetail.base_price?.toString() || '0');
                  const overpriceAmount = parseFloat(selectedQuoteForDetail.overprice_amount?.toString() || '0');
                  const totalUserPrice = parseFloat(selectedQuoteForDetail.total_user_price?.toString() || '0');
                  
                  // Use actual contractor-submitted line items if available
                  const contractorLineItems = selectedQuoteForDetail.line_items || [];
                  const hasRealLineItems = contractorLineItems && contractorLineItems.length > 0;
                  
                  // Debug: Check what line items data is received
                  console.log('contractorLineItems:', contractorLineItems);
                  console.log('hasRealLineItems:', hasRealLineItems);
                  console.log('selectedQuoteForDetail.line_items:', selectedQuoteForDetail.line_items);

                  return (
                    <div className="space-y-6">
                      {/* Main Quotation Table */}
                      <div className="bg-white rounded-lg overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-[#3eb2b1] text-white">
                              <tr>
                                <th className="p-3 text-left font-semibold">S/N</th>
                                <th className="p-3 text-left font-semibold">Item</th>
                                <th className="p-3 text-left font-semibold">Description</th>
                                <th className="p-3 text-center font-semibold">Qty</th>
                                <th className="p-3 text-right font-semibold">Unit Price</th>
                                <th className="p-3 text-right font-semibold">Total Price</th>
                                <th className="p-3 text-right font-semibold">RABHAN Commission (15%)</th>
                                <th className="p-3 text-right font-semibold">RABHAN Overprice (10%)</th>
                                <th className="p-3 text-right font-semibold">User Price</th>
                                <th className="p-3 text-right font-semibold">Vendor Net Price</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                              {hasRealLineItems ? (
                                contractorLineItems.map((item: any, index: number) => {
                                  const totalPrice = (item.units || 1) * (item.unit_price || 0);
                                  const commission = totalPrice * 0.15;
                                  const overprice = totalPrice * 0.10;
                                  const userPrice = totalPrice + overprice;
                                  const vendorNet = totalPrice - commission;
                                  
                                  return (
                                    <tr key={index} className="hover:bg-gray-50">
                                      <td className="p-3 font-medium">{item.serial_number || index + 1}</td>
                                      <td className="p-3 font-medium">{item.item_name || 'Not specified'}</td>
                                      <td className="p-3 text-gray-600">{item.description || 'No description'}</td>
                                      <td className="p-3 text-center font-mono">{item.units || 0}</td>
                                      <td className="p-3 text-right font-mono">{(item.unit_price || 0).toLocaleString()}</td>
                                      <td className="p-3 text-right font-mono font-semibold">{totalPrice.toLocaleString()}</td>
                                      <td className="p-3 text-right font-mono text-red-600">{commission.toLocaleString()}</td>
                                      <td className="p-3 text-right font-mono text-orange-600">{overprice.toLocaleString()}</td>
                                      <td className="p-3 text-right font-mono font-semibold text-blue-600">{userPrice.toLocaleString()}</td>
                                      <td className="p-3 text-right font-mono text-green-600">{vendorNet.toLocaleString()}</td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan={10} className="p-6 text-center text-gray-500">
                                    No line items data received from backend API - Check if contractor submitted line items and API is returning them
                                  </td>
                                </tr>
                              )}
                              
                              {/* Totals Row */}
                              {hasRealLineItems && (
                                <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                                  <td colSpan={5} className="p-3 text-right">TOTALS:</td>
                                  <td className="p-3 text-right font-mono text-lg">{basePrice.toLocaleString()}</td>
                                  <td className="p-3 text-right font-mono text-red-600">{(basePrice * 0.15).toLocaleString()}</td>
                                  <td className="p-3 text-right font-mono text-orange-600">{overpriceAmount.toLocaleString()}</td>
                                  <td className="p-3 text-right font-mono text-blue-600 text-lg">{totalUserPrice.toLocaleString()}</td>
                                  <td className="p-3 text-right font-mono text-green-600">{(basePrice * 0.85).toLocaleString()}</td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* VAT Calculation & Final Amounts - 3 Cards */}
                      <div className="space-y-4">
                        <div className="bg-[#3eb2b1] p-4 rounded-t-lg">
                          <h4 className="font-semibold text-white text-center">VAT Calculation & Final Amounts</h4>
                        </div>

                        {/* Card 1: Vendor Payments */}
                        <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                          <div className="bg-green-100 p-3 border-b">
                            <h5 className="font-semibold text-green-800">Vendor Payment Breakdown</h5>
                          </div>
                          <div className="p-4">
                            <table className="w-full">
                              <tbody>
                                <tr className="border-b">
                                  <td className="py-2 font-medium">Vendor Net Price</td>
                                  <td className="py-2 text-right font-mono">SAR {(basePrice * 0.85).toLocaleString()}</td>
                                </tr>
                                <tr className="border-b">
                                  <td className="py-2">VAT @ 15% (RABHAN pays to vendor)</td>
                                  <td className="py-2 text-right font-mono text-red-600">SAR {(basePrice * 0.85 * 0.15).toLocaleString()}</td>
                                </tr>
                                <tr className="bg-green-50">
                                  <td className="py-3 font-semibold text-green-700">Total Vendor Receives (Net + VAT from RABHAN)</td>
                                  <td className="py-3 text-right font-mono font-semibold text-green-700">SAR {(basePrice * 0.85 * 1.15).toLocaleString()}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Card 2: User Payments */}
                        <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                          <div className="bg-blue-100 p-3 border-b">
                            <h5 className="font-semibold text-blue-800">User Payment Breakdown</h5>
                          </div>
                          <div className="p-4">
                            <table className="w-full">
                              <tbody>
                                <tr className="border-b">
                                  <td className="py-2 font-medium">User Price</td>
                                  <td className="py-2 text-right font-mono">SAR {totalUserPrice.toLocaleString()}</td>
                                </tr>
                                <tr className="border-b">
                                  <td className="py-2">VAT @ 15% (RABHAN collects from user)</td>
                                  <td className="py-2 text-right font-mono text-green-600">SAR {(totalUserPrice * 0.15).toLocaleString()}</td>
                                </tr>
                                <tr className="bg-blue-50">
                                  <td className="py-3 font-semibold text-blue-700">Total User Pays (Price + VAT to RABHAN)</td>
                                  <td className="py-3 text-right font-mono font-semibold text-blue-700">SAR {(totalUserPrice * 1.15).toLocaleString()}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Card 3: RABHAN VAT & Earnings */}
                        <div className="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-200">
                          <div className="bg-[#3eb2b1]/20 p-3 border-b">
                            <h5 className="font-semibold text-[#3eb2b1]">RABHAN VAT & Earnings Summary</h5>
                          </div>
                          <div className="p-4">
                            <table className="w-full">
                              <tbody>
                                <tr className="border-b">
                                  <td className="py-2">VAT Collected from User</td>
                                  <td className="py-2 text-right font-mono text-green-600">SAR {(totalUserPrice * 0.15).toLocaleString()}</td>
                                </tr>
                                <tr className="border-b">
                                  <td className="py-2">VAT Paid to Vendor</td>
                                  <td className="py-2 text-right font-mono text-red-600">SAR {(basePrice * 0.85 * 0.15).toLocaleString()}</td>
                                </tr>
                                <tr className="border-b">
                                  <td className="py-2 font-medium">RABHAN Net VAT Position</td>
                                  <td className="py-2 text-right font-mono text-[#3eb2b1]">SAR {((totalUserPrice * 0.15) - (basePrice * 0.85 * 0.15)).toLocaleString()}</td>
                                </tr>
                                <tr className="border-b">
                                  <td className="py-2 font-medium">RABHAN Total Earnings (Before VAT)</td>
                                  <td className="py-2 text-right font-mono text-[#3eb2b1]">SAR {((basePrice * 0.15) + overpriceAmount).toLocaleString()}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>

                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                          <div className="text-xl font-bold text-blue-600">
                            SAR {(totalUserPrice * 1.15).toLocaleString()}
                          </div>
                          <div className="text-sm text-blue-600 font-medium">Customer Pays Total</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                          <div className="text-xl font-bold text-green-600">
                            SAR {(basePrice * 0.85 * 1.15).toLocaleString()}
                          </div>
                          <div className="text-sm text-green-600 font-medium">Vendor Receives</div>
                        </div>
                        <div className="text-center p-4 bg-[#3eb2b1]/10 rounded-lg border border-[#3eb2b1]/30">
                          <div className="text-xl font-bold text-[#3eb2b1]">
                            SAR {((basePrice * 0.15) + overpriceAmount + ((totalUserPrice * 0.15) - (basePrice * 0.85 * 0.15))).toLocaleString()}
                          </div>
                          <div className="text-sm text-[#3eb2b1] font-medium">RABHAN Net Profit</div>
                        </div>
                        <div className="text-center p-4 bg-[#3eb2b1]/20 rounded-lg border border-[#3eb2b1]/40">
                          <div className="text-xl font-bold text-[#3eb2b1]">
                            SAR {((totalUserPrice * 0.15) - (basePrice * 0.85 * 0.15)).toLocaleString()}
                          </div>
                          <div className="text-sm text-[#3eb2b1] font-medium">Net VAT Profit</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* System Specifications */}
              <div className="grid grid-cols-1 gap-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">System Specifications</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">System Capacity:</span>
                      <span className="font-medium">{selectedQuoteForDetail.solar_system_capacity_kwp} kWp</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Storage Capacity:</span>
                      <span className="font-medium">{selectedQuoteForDetail.storage_capacity_kwh} kWh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Monthly Production:</span>
                      <span className="font-medium">{selectedQuoteForDetail.monthly_production_kwh} kWh</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Payment Terms:</span>
                      <span className="font-medium">{selectedQuoteForDetail.payment_terms}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Review Section */}
              {selectedQuoteForDetail.admin_status === 'pending_review' && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Admin Review</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Admin Notes (Optional):</label>
                      <textarea
                        value={adminNotes}
                        onChange={(e) => setAdminNotes(e.target.value)}
                        placeholder="Add any notes for this approval/rejection..."
                        className="w-full p-3 border border-gray-200 rounded-lg resize-none"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Rejection Reason (Required for rejection):</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Provide reason if rejecting this quote..."
                        className="w-full p-3 border border-gray-200 rounded-lg resize-none"
                        rows={2}
                      />
                    </div>
                    <div className="flex space-x-4">
                      <button
                        onClick={() => {
                          showApprovalConfirmation(selectedQuoteForDetail.id);
                          setShowQuoteDetailModal(false);
                        }}
                        disabled={approvingQuote === selectedQuoteForDetail.id}
                        className="relative overflow-hidden px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl shadow-lg hover:from-green-600 hover:to-green-700 hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                        <Check className="w-5 h-5 mr-2 relative z-10" />
                        <span className="relative z-10">{approvingQuote === selectedQuoteForDetail.id ? 'Approving...' : 'Approve Quote'}</span>
                        {approvingQuote === selectedQuoteForDetail.id && (
                          <div className="ml-2 w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10"></div>
                        )}
                      </button>
                      <button
                        onClick={() => {
                          showRejectionConfirmation(selectedQuoteForDetail.id);
                          setShowQuoteDetailModal(false);
                        }}
                        disabled={rejectingQuote === selectedQuoteForDetail.id}
                        className="relative overflow-hidden px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:from-red-600 hover:to-red-700 hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center"
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                        <X className="w-5 h-5 mr-2 relative z-10" />
                        <span className="relative z-10">{rejectingQuote === selectedQuoteForDetail.id ? 'Rejecting...' : 'Reject Quote'}</span>
                        {rejectingQuote === selectedQuoteForDetail.id && (
                          <div className="ml-2 w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin relative z-10"></div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Existing Admin Notes/Review */}
              {selectedQuoteForDetail.admin_notes && (
                <div className="border-t pt-6">
                  <h3 className="text-lg font-semibold mb-4">Previous Admin Review</h3>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="text-sm text-blue-800 font-medium">Admin Notes:</div>
                    <div className="text-blue-700">{selectedQuoteForDetail.admin_notes}</div>
                    {selectedQuoteForDetail.reviewed_at && (
                      <div className="text-xs text-blue-600 mt-2">
                        Reviewed on: {formatDate(selectedQuoteForDetail.reviewed_at)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                <button 
                  onClick={() => setShowQuoteDetailModal(false)} 
                  className="btn-outline"
                >
                  Close
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Approval Confirmation Dialog */}
      {showApprovalDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Approve Quote</h3>
                  <p className="text-sm text-gray-600">Are you sure you want to approve this contractor quote?</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={tempAdminNotes}
                  onChange={(e) => setTempAdminNotes(e.target.value)}
                  placeholder="Add any notes for this approval..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#3eb2b1] focus:border-[#3eb2b1]"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowApprovalDialog(false);
                    setQuoteToApprove(null);
                    setTempAdminNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={approvingQuote !== null}
                >
                  Cancel
                </button>
                <button
                  onClick={handleApproveQuote}
                  disabled={approvingQuote !== null}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {approvingQuote ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Approving...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Approve Quote
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Rejection Confirmation Dialog */}
      {showRejectionDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-lg shadow-xl max-w-md w-full"
          >
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <X className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Reject Quote</h3>
                  <p className="text-sm text-gray-600">Are you sure you want to reject this contractor quote?</p>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={tempRejectionReason}
                  onChange={(e) => setTempRejectionReason(e.target.value)}
                  placeholder="Please provide a clear reason for rejecting this quote..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  rows={3}
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Admin Notes (Optional)
                </label>
                <textarea
                  value={tempAdminNotes}
                  onChange={(e) => setTempAdminNotes(e.target.value)}
                  placeholder="Add any additional notes..."
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-[#3eb2b1] focus:border-[#3eb2b1]"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowRejectionDialog(false);
                    setQuoteToReject(null);
                    setTempRejectionReason('');
                    setTempAdminNotes('');
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={rejectingQuote !== null}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRejectQuote}
                  disabled={rejectingQuote !== null || !tempRejectionReason.trim()}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {rejectingQuote ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Rejecting...
                    </>
                  ) : (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Reject Quote
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}