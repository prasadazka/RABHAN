import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  User,
  Building,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Search,
  Filter,
  Download,
  RefreshCw,
  ExternalLink,
  Users,
  Calendar as CalendarIcon,
  Activity
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// API base URL
const API_BASE_URL = 'http://localhost:3006/api';

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
}

interface Assignment {
  id: string;
  request_id: string;
  contractor_id: string;
  contractor_company: string;
  contractor_email: string;
  contractor_phone: string;
  status: string;
  assigned_at: string;
  viewed_at: string | null;
  responded_at: string | null;
  response_notes: string | null;
}

export function QuotesPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('common');
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 10
  });

  // Fetch quotes
  const fetchQuotes = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.search) params.append('search', filters.search);
      params.append('page', filters.page.toString());
      params.append('limit', filters.limit.toString());

      let response;
      let isFromQuoteService = false;

      try {
        // Try admin service first
        console.log('Trying admin service for quotes...');
        response = await fetch(`${API_BASE_URL}/quotes?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('rabhan_admin_token')}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Admin service returned ${response.status}: ${response.statusText}`);
        }
      } catch (adminError) {
        console.log('Admin service failed:', adminError.message, '- quote service not available yet');
        
        // Quote service is not implemented yet, show empty state
        setQuotes([]);
        setError('Quote service is not available. The admin service is required for quotes management.');
        return;
      }

      const data = await response.json();
      console.log('Quotes API Response:', { success: data.success, dataLength: data.data?.quotes?.length });

      if (data.success) {
        setQuotes(data.data?.quotes || []);
        console.log(`✅ Loaded ${data.data?.quotes?.length || 0} quotes from admin service`);
      } else {
        throw new Error(data.message || 'Failed to fetch quotes');
      }

    } catch (err: any) {
      console.error('Failed to fetch quotes:', err);
      setError(err.message || 'Failed to load quotes');
      setQuotes([]);
    } finally {
      setLoading(false);
    }
  };

  // Fetch quote assignments
  const fetchQuoteAssignments = async (quoteId: string) => {
    try {
      setAssignmentsLoading(true);

      const response = await fetch(`${API_BASE_URL}/quotes/${quoteId}/assignments`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('rabhan_admin_token')}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        setAssignments(data.data?.assignments || []);
      } else {
        throw new Error(data.message || 'Failed to fetch assignments');
      }

    } catch (err: any) {
      console.error('Failed to fetch assignments:', err);
      setAssignments([]);
    } finally {
      setAssignmentsLoading(false);
    }
  };

  // Load data on mount and filter changes
  useEffect(() => {
    fetchQuotes();
  }, [filters]);

  // Handle quote selection
  const handleQuoteSelect = (quote: Quote) => {
    setSelectedQuote(quote);
    setShowDetailsModal(true);
    fetchQuoteAssignments(quote.id);
  };

  // Close modal
  const closeModal = () => {
    setShowDetailsModal(false);
    setSelectedQuote(null);
    setAssignments([]);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <span className="status-warning">Pending</span>;
      case 'in_progress':
        return <span className="status-info">In Progress</span>;
      case 'completed':
        return <span className="status-success">Completed</span>;
      case 'cancelled':
        return <span className="status-error">Cancelled</span>;
      default:
        return <span className="status-default">{status}</span>;
    }
  };

  // Get assignment status badge
  const getAssignmentStatusBadge = (status: string) => {
    switch (status) {
      case 'assigned':
        return <span className="status-warning">Assigned</span>;
      case 'viewed':
        return <span className="status-info">Viewed</span>;
      case 'accepted':
        return <span className="status-success">Accepted</span>;
      case 'rejected':
        return <span className="status-error">Rejected</span>;
      default:
        return <span className="status-default">{status}</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" message="Loading quotes..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Quote Requests Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage all quote requests and contractor responses
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={fetchQuotes}
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
          <button className="btn-primary flex items-center space-x-2">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
                className="w-full p-2 border border-border rounded-lg"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
                  placeholder="Search by location or area..."
                  className="w-full pl-10 p-2 border border-border rounded-lg"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">Page Size</label>
              <select
                value={filters.limit}
                onChange={(e) => setFilters(prev => ({ ...prev, limit: Number(e.target.value), page: 1 }))}
                className="w-full p-2 border border-border rounded-lg"
              >
                <option value={10}>10 per page</option>
                <option value={20}>20 per page</option>
                <option value={50}>50 per page</option>
              </select>
            </div>
            
            <div className="flex items-end">
              <button
                onClick={() => setFilters({ status: '', search: '', page: 1, limit: 10 })}
                className="btn-outline w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Full Width Table */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            Quote Requests ({quotes.length})
          </h2>
        </div>
        <div className="card-content p-0">
          {error ? (
            <div className="text-center py-8 text-destructive">
              <p>{error}</p>
            </div>
          ) : quotes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No quote requests found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-4 font-semibold">Customer</th>
                    <th className="text-left p-4 font-semibold">Contact</th>
                    <th className="text-left p-4 font-semibold">System</th>
                    <th className="text-left p-4 font-semibold">Location</th>
                    <th className="text-left p-4 font-semibold">Status</th>
                    <th className="text-left p-4 font-semibold">Contractors</th>
                    <th className="text-left p-4 font-semibold">Date</th>
                    <th className="text-left p-4 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {quotes.map((quote, index) => (
                    <motion.tr
                      key={quote.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="border-b border-border hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => handleQuoteSelect(quote)}
                    >
                      <td className="p-4">
                        <div>
                          <div className="font-semibold text-foreground">
                            {quote.user_first_name} {quote.user_last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ID: {quote.user_id.slice(0, 8)}...
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div>
                          <div className="text-sm">{quote.user_email}</div>
                          <div className="text-sm text-muted-foreground">
                            {quote.user_phone || 'No phone'}
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-medium">{quote.system_size_kwp} kWp</div>
                        <div className="text-sm text-muted-foreground">
                          {quote.service_area}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="max-w-48 truncate" title={quote.location_address}>
                          <MapPin className="w-4 h-4 inline mr-1" />
                          {quote.location_address}
                        </div>
                      </td>
                      <td className="p-4">
                        {getStatusBadge(quote.status)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <Users className="w-4 h-4 text-muted-foreground" />
                            <span className="text-sm font-medium">
                              {quote.assigned_contractors_count}
                            </span>
                          </div>
                          {quote.received_quotes_count > 0 && (
                            <div className="flex items-center space-x-1">
                              <Activity className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-600 font-medium">
                                {quote.received_quotes_count}
                              </span>
                            </div>
                          )}
                          {quote.approved_quotes_count > 0 && (
                            <div className="flex items-center space-x-1">
                              <CheckCircle className="w-4 h-4 text-green-600" />
                              <span className="text-sm text-green-600 font-medium">
                                {quote.approved_quotes_count}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-muted-foreground">
                          <CalendarIcon className="w-4 h-4 inline mr-1" />
                          {new Date(quote.created_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/quotes/${quote.id}`);
                          }}
                          className="btn-outline btn-sm flex items-center space-x-1"
                        >
                          <ExternalLink className="w-4 h-4" />
                          <span>View</span>
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

      {/* Quote Details Modal */}
      {showDetailsModal && selectedQuote && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="border-b border-border p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold flex items-center">
                  <FileText className="w-6 h-6 mr-2 text-primary" />
                  Quote Request Details
                </h2>
                <button
                  onClick={closeModal}
                  className="btn-outline btn-sm"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Customer Information */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <User className="w-5 h-5 mr-2 text-primary" />
                    Customer Information
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Name:</span>
                      <span className="font-medium">
                        {selectedQuote.user_first_name} {selectedQuote.user_last_name}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Email:</span>
                      <span className="font-medium">{selectedQuote.user_email}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Phone:</span>
                      <span className="font-medium">{selectedQuote.user_phone || 'Not provided'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">User ID:</span>
                      <span className="font-mono text-sm">{selectedQuote.user_id}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <Building className="w-5 h-5 mr-2 text-primary" />
                    System Details
                  </h3>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">System Size:</span>
                      <span className="font-medium">{selectedQuote.system_size_kwp} kWp</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Service Area:</span>
                      <span className="font-medium">{selectedQuote.service_area}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(selectedQuote.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Location:</span>
                      <span className="font-medium max-w-xs truncate" title={selectedQuote.location_address}>
                        {selectedQuote.location_address}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Request Statistics */}
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-muted/30 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-primary">
                    {selectedQuote.assigned_contractors_count}
                  </div>
                  <div className="text-sm text-muted-foreground">Assigned Contractors</div>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {selectedQuote.received_quotes_count}
                  </div>
                  <div className="text-sm text-muted-foreground">Received Quotes</div>
                </div>
                <div className="bg-muted/30 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {selectedQuote.approved_quotes_count}
                  </div>
                  <div className="text-sm text-muted-foreground">Approved Quotes</div>
                </div>
              </div>

              {/* Contractor Assignments */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center">
                  <Users className="w-5 h-5 mr-2 text-primary" />
                  Contractor Assignments
                </h3>
                {assignmentsLoading ? (
                  <div className="text-center py-8">
                    <LoadingSpinner size="md" message="Loading assignments..." />
                  </div>
                ) : assignments.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>No contractor assignments found</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {assignments.map((assignment) => (
                      <div key={assignment.id} className="border border-border rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="font-semibold text-foreground">
                              {assignment.contractor_company}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              {assignment.contractor_email}
                            </p>
                            {assignment.contractor_phone && (
                              <p className="text-sm text-muted-foreground">
                                {assignment.contractor_phone}
                              </p>
                            )}
                          </div>
                          {getAssignmentStatusBadge(assignment.status)}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-muted-foreground">Assigned:</span>
                            <span className="ml-1 font-medium">
                              {new Date(assignment.assigned_at).toLocaleDateString()}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Viewed:</span>
                            <span className="ml-1 font-medium">
                              {assignment.viewed_at 
                                ? new Date(assignment.viewed_at).toLocaleDateString()
                                : 'Not viewed'
                              }
                            </span>
                          </div>
                          {assignment.responded_at && (
                            <div className="col-span-2">
                              <span className="text-muted-foreground">Responded:</span>
                              <span className="ml-1 font-medium">
                                {new Date(assignment.responded_at).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                        
                        {assignment.response_notes && (
                          <div className="mt-3 p-3 bg-muted/30 rounded-lg">
                            <span className="text-sm font-medium">Response Notes:</span>
                            <p className="text-sm text-muted-foreground mt-1">
                              {assignment.response_notes}
                            </p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex justify-end space-x-4 pt-4 border-t border-border">
                <button onClick={closeModal} className="btn-outline">
                  Close
                </button>
                <button className="btn-primary">
                  Manage Request
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}