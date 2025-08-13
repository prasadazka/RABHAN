import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  FileText,
  User,
  Building,
  Calendar,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calculator,
  DollarSign,
  Clock,
  MapPin,
  Phone,
  Mail,
  ZapIcon,
  BatteryIcon,
  Settings,
  Eye,
  MessageSquare
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from './ui/LoadingSpinner';

const API_BASE_URL = 'http://localhost:3009/api';

interface LineItem {
  id: string;
  serial_number: number;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  rabhan_commission: number;
  rabhan_over_price: number;
  user_price: number;
  vendor_net_price: number;
}

interface QuotationTotals {
  total_price: number;
  total_commission: number;
  total_over_price: number;
  total_user_price: number;
  total_vendor_net: number;
  vat_amount: number;
  total_payable: number;
}

interface DetailedQuotation {
  id: string;
  request_id: string;
  contractor_id: string;
  contractor_company: string;
  contractor_email: string;
  contractor_phone: string;
  contractor_vat_number: string;
  installation_deadline: string;
  payment_terms: string;
  solar_system_capacity_kwp: number;
  storage_capacity_kwh: number;
  monthly_production_kwh: number;
  admin_status: 'pending_review' | 'approved' | 'rejected' | 'revision_needed';
  admin_notes?: string;
  rejection_reason?: string;
  reviewed_by?: string;
  reviewed_at?: string;
  created_at: string;
  updated_at: string;
  line_items: LineItem[];
  totals: QuotationTotals;
  user_id: string;
  requested_size: number;
}

interface QuotationReviewModalProps {
  isOpen: boolean;
  quotationId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuotationReviewModal({ 
  isOpen, 
  quotationId, 
  onClose, 
  onSuccess 
}: QuotationReviewModalProps) {
  const { t } = useTranslation('common');
  const [quotation, setQuotation] = useState<DetailedQuotation | null>(null);
  const [loading, setLoading] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewForm, setReviewForm] = useState({
    admin_status: 'approved' as 'approved' | 'rejected' | 'revision_needed',
    admin_notes: '',
    rejection_reason: ''
  });

  // Fetch detailed quotation
  const fetchQuotation = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/admin/quotations/${quotationId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_access_token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setQuotation(data.data.quotation);
      } else {
        throw new Error(data.message || 'Failed to fetch quotation');
      }

    } catch (err: any) {
      console.error('Failed to fetch quotation:', err);
      setError(err.message || 'Failed to load quotation');
    } finally {
      setLoading(false);
    }
  };

  // Submit review decision
  const submitReview = async () => {
    try {
      setReviewLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/admin/quotations/${quotationId}/review`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_access_token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(reviewForm)
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        throw new Error(data.message || 'Failed to submit review');
      }

    } catch (err: any) {
      console.error('Failed to submit review:', err);
      setError(err.message || 'Failed to submit review');
    } finally {
      setReviewLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && quotationId) {
      fetchQuotation();
    }
  }, [isOpen, quotationId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
        return <span>{status}</span>;
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-2xl max-w-7xl w-full max-h-[95vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="w-8 h-8" />
                <div>
                  <h2 className="text-2xl font-bold">Quotation Review</h2>
                  <p className="text-blue-100 text-sm">ID: {quotationId}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[calc(95vh-140px)]">
            {loading ? (
              <div className="flex items-center justify-center h-96">
                <LoadingSpinner size="lg" message="Loading quotation details..." />
              </div>
            ) : error ? (
              <div className="flex items-center justify-center h-96 text-red-600">
                <div className="text-center">
                  <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                  <p className="text-lg font-semibold">{error}</p>
                  <button
                    onClick={fetchQuotation}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : quotation ? (
              <div className="p-6 space-y-8">
                
                {/* Status and Basic Info */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <User className="w-5 h-5 mr-2 text-blue-600" />
                      Customer Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600">User ID</label>
                        <p className="font-mono text-sm">{quotation.user_id}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Requested Size</label>
                        <p className="font-semibold">{quotation.requested_size} kWp</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Building className="w-5 h-5 mr-2 text-blue-600" />
                      Contractor Information
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600">Company</label>
                        <p className="font-semibold">{quotation.contractor_company}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Contact</label>
                        <p className="text-sm">{quotation.contractor_email}</p>
                        <p className="text-sm">{quotation.contractor_phone}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">VAT Number</label>
                        <p className="font-mono text-sm">{quotation.contractor_vat_number}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                      Quote Details
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600">Status</label>
                        <div className="mt-1">
                          {getStatusBadge(quotation.admin_status)}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Installation Deadline</label>
                        <p className="font-semibold">{formatDate(quotation.installation_deadline)}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Payment Terms</label>
                        <p className="capitalize">{quotation.payment_terms.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Specifications */}
                <div className="bg-blue-50 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-6 flex items-center">
                    <ZapIcon className="w-6 h-6 mr-2 text-blue-600" />
                    System Specifications
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="text-center">
                      <div className="bg-white rounded-lg p-4">
                        <ZapIcon className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-900">
                          {quotation.solar_system_capacity_kwp}
                        </div>
                        <div className="text-sm text-gray-600">Solar Capacity (kWp)</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="bg-white rounded-lg p-4">
                        <BatteryIcon className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-900">
                          {quotation.storage_capacity_kwh}
                        </div>
                        <div className="text-sm text-gray-600">Storage (kWh)</div>
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="bg-white rounded-lg p-4">
                        <Calculator className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-900">
                          {quotation.monthly_production_kwh}
                        </div>
                        <div className="text-sm text-gray-600">Monthly Production (kWh)</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden">
                  <div className="bg-gray-900 text-white px-6 py-4">
                    <h3 className="text-xl font-semibold flex items-center">
                      <FileText className="w-6 h-6 mr-2" />
                      Quotation Line Items
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="text-left p-4 font-semibold">S/N</th>
                          <th className="text-left p-4 font-semibold">Item</th>
                          <th className="text-left p-4 font-semibold">Description</th>
                          <th className="text-center p-4 font-semibold">Qty</th>
                          <th className="text-right p-4 font-semibold">Unit Price</th>
                          <th className="text-right p-4 font-semibold">Total Price</th>
                          <th className="text-right p-4 font-semibold">Commission</th>
                          <th className="text-right p-4 font-semibold">Over Price</th>
                          <th className="text-right p-4 font-semibold">User Price</th>
                          <th className="text-right p-4 font-semibold">Vendor Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotation.line_items.map((item, index) => (
                          <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                            <td className="p-4 font-semibold text-center">{item.serial_number}</td>
                            <td className="p-4 font-semibold">{item.item_name}</td>
                            <td className="p-4 text-sm">{item.description}</td>
                            <td className="p-4 text-center font-medium">{item.quantity}</td>
                            <td className="p-4 text-right font-medium">{formatCurrency(item.unit_price)}</td>
                            <td className="p-4 text-right font-semibold">{formatCurrency(item.total_price)}</td>
                            <td className="p-4 text-right text-red-600 font-medium">-{formatCurrency(item.rabhan_commission)}</td>
                            <td className="p-4 text-right text-orange-600 font-medium">+{formatCurrency(item.rabhan_over_price)}</td>
                            <td className="p-4 text-right text-blue-600 font-bold">{formatCurrency(item.user_price)}</td>
                            <td className="p-4 text-right text-green-600 font-semibold">{formatCurrency(item.vendor_net_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Pricing Summary */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-6 flex items-center">
                    <Calculator className="w-6 h-6 mr-2 text-blue-600" />
                    Financial Summary
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-lg font-bold text-gray-900">
                        {formatCurrency(quotation.totals.total_price)}
                      </div>
                      <div className="text-sm text-gray-600">Total Price</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-lg font-bold text-red-600">
                        -{formatCurrency(quotation.totals.total_commission)}
                      </div>
                      <div className="text-sm text-gray-600">Commission (15%)</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-lg font-bold text-orange-600">
                        +{formatCurrency(quotation.totals.total_over_price)}
                      </div>
                      <div className="text-sm text-gray-600">Over Price (10%)</div>
                    </div>
                    <div className="bg-white rounded-lg p-4 text-center">
                      <div className="text-lg font-bold text-blue-600">
                        {formatCurrency(quotation.totals.total_user_price)}
                      </div>
                      <div className="text-sm text-gray-600">User Pays</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-green-100 rounded-lg p-4 text-center">
                      <div className="text-xl font-bold text-green-800">
                        {formatCurrency(quotation.totals.total_vendor_net)}
                      </div>
                      <div className="text-sm text-green-700">Vendor Net Price</div>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-4 text-center">
                      <div className="text-xl font-bold text-gray-800">
                        {formatCurrency(quotation.totals.vat_amount)}
                      </div>
                      <div className="text-sm text-gray-700">VAT (15%)</div>
                    </div>
                    <div className="bg-indigo-100 rounded-lg p-4 text-center border-2 border-indigo-300">
                      <div className="text-2xl font-bold text-indigo-900">
                        {formatCurrency(quotation.totals.total_payable)}
                      </div>
                      <div className="text-sm text-indigo-700 font-semibold">Contractor Receives</div>
                    </div>
                  </div>
                </div>

                {/* Review Form */}
                {quotation.admin_status === 'pending_review' && (
                  <div className="bg-yellow-50 rounded-xl p-6 border-2 border-yellow-200">
                    <h3 className="text-xl font-semibold mb-6 flex items-center text-yellow-800">
                      <MessageSquare className="w-6 h-6 mr-2" />
                      Review Decision
                    </h3>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-semibold mb-2">Decision</label>
                        <select
                          value={reviewForm.admin_status}
                          onChange={(e) => setReviewForm(prev => ({ 
                            ...prev, 
                            admin_status: e.target.value as 'approved' | 'rejected' | 'revision_needed'
                          }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="approved">Approve Quotation</option>
                          <option value="rejected">Reject Quotation</option>
                          <option value="revision_needed">Request Revision</option>
                        </select>
                      </div>
                      
                      <div className="lg:col-span-2">
                        <label className="block text-sm font-semibold mb-2">Admin Notes</label>
                        <textarea
                          value={reviewForm.admin_notes}
                          onChange={(e) => setReviewForm(prev => ({ ...prev, admin_notes: e.target.value }))}
                          placeholder="Add your review comments..."
                          rows={3}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      
                      {reviewForm.admin_status === 'rejected' && (
                        <div className="lg:col-span-3">
                          <label className="block text-sm font-semibold mb-2">Rejection Reason *</label>
                          <textarea
                            value={reviewForm.rejection_reason}
                            onChange={(e) => setReviewForm(prev => ({ ...prev, rejection_reason: e.target.value }))}
                            placeholder="Please provide detailed reason for rejection..."
                            rows={2}
                            required
                            className="w-full p-3 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          />
                        </div>
                      )}
                    </div>
                    
                    {error && (
                      <div className="mt-4 p-4 bg-red-100 border border-red-300 rounded-lg text-red-700">
                        <div className="flex items-center">
                          <AlertCircle className="w-5 h-5 mr-2" />
                          <span>{error}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Review History */}
                {quotation.reviewed_at && (
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center">
                      <Eye className="w-5 h-5 mr-2 text-gray-600" />
                      Review History
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="text-sm text-gray-600">Reviewed By</label>
                        <p className="font-semibold">{quotation.reviewed_by}</p>
                      </div>
                      <div>
                        <label className="text-sm text-gray-600">Reviewed At</label>
                        <p>{formatDate(quotation.reviewed_at)}</p>
                      </div>
                      {quotation.admin_notes && (
                        <div>
                          <label className="text-sm text-gray-600">Admin Notes</label>
                          <p className="bg-white p-3 rounded-lg border">{quotation.admin_notes}</p>
                        </div>
                      )}
                      {quotation.rejection_reason && (
                        <div>
                          <label className="text-sm text-gray-600">Rejection Reason</label>
                          <p className="bg-red-50 p-3 rounded-lg border border-red-200 text-red-800">
                            {quotation.rejection_reason}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t bg-gray-50 px-6 py-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {quotation && `Created: ${formatDate(quotation.created_at)}`}
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={onClose}
                  disabled={reviewLoading}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  Close
                </button>
                {quotation && quotation.admin_status === 'pending_review' && (
                  <button
                    onClick={submitReview}
                    disabled={reviewLoading || (reviewForm.admin_status === 'rejected' && !reviewForm.rejection_reason.trim())}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    {reviewLoading && <LoadingSpinner size="sm" />}
                    <span>{reviewLoading ? 'Submitting...' : 'Submit Review'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}