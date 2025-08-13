import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  User,
  Building,
  Calendar,
  Search,
  Filter,
  RefreshCw,
  DollarSign,
  Calculator,
  Users,
  TrendingUp
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { QuotationReviewModal } from '@/components/QuotationReviewModal';

const API_BASE_URL = 'http://localhost:3009/api';

interface PendingQuotation {
  id: string;
  request_id: string;
  contractor_id: string;
  contractor_company: string;
  contractor_email: string;
  contractor_vat_number: string;
  installation_deadline: string;
  payment_terms: string;
  solar_system_capacity_kwp: number;
  storage_capacity_kwh: number;
  monthly_production_kwh: number;
  admin_status: 'pending_review' | 'approved' | 'rejected' | 'revision_needed';
  created_at: string;
  updated_at: string;
  user_id: string;
  requested_size: number;
  line_items_count: number;
  estimated_total: number;
}

export function QuotationReviewPage() {
  const { t } = useTranslation('common');
  const [quotations, setQuotations] = useState<PendingQuotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    admin_status: '',
    search: '',
    sort_by: 'created_at',
    sort_order: 'desc'
  });

  // Fetch pending quotations
  const fetchQuotations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.admin_status) params.append('admin_status', filters.admin_status);
      if (filters.search) params.append('search', filters.search);
      params.append('sort_by', filters.sort_by);
      params.append('sort_order', filters.sort_order);

      const response = await fetch(`${API_BASE_URL}/admin/quotes/pending?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setQuotations(data.data?.quotes || []);
      } else {
        throw new Error(data.message || 'Failed to fetch quotations');
      }

    } catch (err: any) {
      console.error('Failed to fetch quotations:', err);
      setError(err.message || 'Failed to load quotations');
      setQuotations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuotations();
  }, [filters]);

  const handleQuotationSelect = (quotationId: string) => {
    setSelectedQuotationId(quotationId);
    setShowReviewModal(true);
  };

  const handleReviewSuccess = () => {
    fetchQuotations(); // Refresh the list
    setShowReviewModal(false);
    setSelectedQuotationId(null);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending_review':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      case 'revision_needed':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <AlertCircle className="w-3 h-3 mr-1" />
            Revision Needed
          </span>
        );
      default:
        return <span className="text-gray-500">{status}</span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusCounts = () => {
    const counts = {
      pending_review: quotations.filter(q => q.admin_status === 'pending_review').length,
      approved: quotations.filter(q => q.admin_status === 'approved').length,
      rejected: quotations.filter(q => q.admin_status === 'rejected').length,
      revision_needed: quotations.filter(q => q.admin_status === 'revision_needed').length,
    };
    return counts;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" message="Loading quotations..." />
      </div>
    );
  }

  const statusCounts = getStatusCounts();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quotation Review</h1>
          <p className="text-muted-foreground mt-2">
            Review and approve contractor quotations with detailed line items
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchQuotations}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-yellow-900">{statusCounts.pending_review}</div>
              <div className="text-sm text-yellow-700">Pending Review</div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-green-900">{statusCounts.approved}</div>
              <div className="text-sm text-green-700">Approved</div>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-red-900">{statusCounts.rejected}</div>
              <div className="text-sm text-red-700">Rejected</div>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <AlertCircle className="h-8 w-8 text-orange-600" />
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-orange-900">{statusCounts.revision_needed}</div>
              <div className="text-sm text-orange-700">Revision Needed</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={filters.admin_status}
                onChange={(e) => setFilters(prev => ({ ...prev, admin_status: e.target.value }))}
                className="w-full p-2 border border-border rounded-lg"
              >
                <option value="">All Statuses</option>
                <option value="pending_review">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="revision_needed">Revision Needed</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search by company or contractor..."
                  className="w-full pl-10 p-2 border border-border rounded-lg"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <select
                value={filters.sort_by}
                onChange={(e) => setFilters(prev => ({ ...prev, sort_by: e.target.value }))}
                className="w-full p-2 border border-border rounded-lg"
              >
                <option value="created_at">Created Date</option>
                <option value="installation_deadline">Installation Deadline</option>
                <option value="estimated_total">Estimated Total</option>
                <option value="contractor_company">Company Name</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ admin_status: '', search: '', sort_by: 'created_at', sort_order: 'desc' })}
                className="btn-outline w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            Contractor Quotations ({quotations.length})
          </h2>
        </div>
        <div className="card-content p-0">
          {error ? (
            <div className="text-center py-8 text-destructive">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-semibold">{error}</p>
              <button
                onClick={fetchQuotations}
                className="mt-4 btn-primary"
              >
                Retry
              </button>
            </div>
          ) : quotations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No quotations found</h3>
              <p>There are no quotations matching your criteria</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Contractor</th>
                    <th className="text-left p-4 font-semibold">System Details</th>
                    <th className="text-left p-4 font-semibold">Line Items</th>
                    <th className="text-left p-4 font-semibold">Estimated Total</th>
                    <th className="text-left p-4 font-semibold">Deadline</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Submitted</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map((quotation, index) => (
                    <motion.tr
                      key={quotation.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={`border-b border-border hover:bg-muted/30 cursor-pointer transition-colors ${
                        quotation.admin_status === 'pending_review' ? 'bg-yellow-50/30' : ''
                      }`}
                      onClick={() => handleQuotationSelect(quotation.id)}
                    >
                      <td className="p-4">
                        <div>
                          <div className="font-semibold text-foreground flex items-center">
                            <Building className="w-4 h-4 mr-2 text-blue-600" />
                            {quotation.contractor_company}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {quotation.contractor_email}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            VAT: {quotation.contractor_vat_number}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="font-medium flex items-center">
                            <Calculator className="w-4 h-4 mr-1 text-yellow-600" />
                            {quotation.solar_system_capacity_kwp} kWp
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Storage: {quotation.storage_capacity_kwh} kWh
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Production: {quotation.monthly_production_kwh} kWh/mo
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 mr-1 text-gray-500" />
                          <span className="font-medium">{quotation.line_items_count}</span>
                          <span className="text-sm text-muted-foreground ml-1">items</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-bold text-lg flex items-center">
                          <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                          {formatCurrency(quotation.estimated_total)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm flex items-center">
                          <Calendar className="w-4 h-4 mr-1 text-blue-500" />
                          {formatDate(quotation.installation_deadline)}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {quotation.payment_terms.replace('_', ' ')}
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(quotation.admin_status)}
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-muted-foreground">
                          {formatDate(quotation.created_at)}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuotationSelect(quotation.id);
                          }}
                          className={`btn-sm flex items-center space-x-1 ${
                            quotation.admin_status === 'pending_review' 
                              ? 'btn-primary' 
                              : 'btn-outline'
                          }`}
                        >
                          <Eye className="w-4 h-4" />
                          <span>
                            {quotation.admin_status === 'pending_review' ? 'Review' : 'View'}
                          </span>
                        </button>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Review Modal */}
      {showReviewModal && selectedQuotationId && (
        <QuotationReviewModal
          isOpen={showReviewModal}
          quotationId={selectedQuotationId}
          onClose={() => {
            setShowReviewModal(false);
            setSelectedQuotationId(null);
          }}
          onSuccess={handleReviewSuccess}
        />
      )}
    </div>
  );
}