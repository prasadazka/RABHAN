import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { QuoteRequestForm } from '../components/quotes/QuoteRequestForm';
import { MultiStepQuoteRequest } from '../components/quotes/MultiStepQuoteRequest';
import QuotationComparisonModal from '../components/quotes/QuotationComparisonModal';
import { UserQuoteDetailModal } from '../components/quotes/UserQuoteDetailModal';
import { quoteService } from '../services/quote.service';
import { PlusIcon, FileTextIcon, ClockIcon, ChevronRightIcon, MapPinIcon, CalendarIcon, PhoneIcon, HomeIcon, ZapIcon, CheckCircleIcon, AlertCircleIcon, XCircleIcon, GitCompare } from 'lucide-react';

interface QuotesProps {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    region?: string;
    city?: string;
    district?: string;
    street_address?: string;
    property_type?: string;
  };
}

interface ContractorInfo {
  id: string;
  business_name: string;
  business_name_ar?: string;
  status: string;
  verification_level: number;
  email?: string;
  phone?: string;
  user_type: string;
}

interface AssignedContractor {
  contractor_id: string;
  assignment_status: 'assigned' | 'accepted' | 'rejected';
  assigned_at: string;
  responded_at?: string;
  contractor_info: ContractorInfo;
}

interface QuoteRequestItem {
  id: string;
  system_size_kwp: number;
  location_address: string;
  service_area: string;
  preferred_installation_date: string;
  contact_phone: string;
  status: 'pending' | 'in_progress' | 'quotes_received' | 'quote_selected' | 'completed' | 'cancelled';
  quotes_count: number;
  property_details?: {
    property_type: string;
    roof_type: string;
    roof_orientation: string;
    shading_issues: boolean;
  };
  selected_contractors?: string[];
  assigned_contractors?: AssignedContractor[];
  contractor_details?: {
    [key: string]: ContractorInfo;
  };
  inspection_schedules?: { [key: string]: string };
  estimated_cost?: string;
  selected_quote?: {
    contractor_id: string;
    contractor_name: string;
    price: string;
    selected_at: string;
  };
  created_at: string;
  updated_at: string;
}

export const Quotes: React.FC<QuotesProps> = ({ user }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [activeTab, setActiveTab] = useState<'form' | 'requests'>('requests');
  const [quoteRequests, setQuoteRequests] = useState<QuoteRequestItem[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequestItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuotesModal, setShowQuotesModal] = useState(false);
  const [showQuotationComparison, setShowQuotationComparison] = useState(false);
  const [selectedRequestForQuotations, setSelectedRequestForQuotations] = useState<string | null>(null);
  const [quotes, setQuotes] = useState<any[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [showUserQuoteDetail, setShowUserQuoteDetail] = useState(false);
  const [selectedQuoteForDetail, setSelectedQuoteForDetail] = useState<any>(null);

  // Load user's quote requests
  useEffect(() => {
    loadQuoteRequests();
  }, []);

  const loadQuoteRequests = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await quoteService.getQuoteRequests({
        page: 1,
        limit: 10
      });

      if (response.success && response.data) {
        setQuoteRequests(response.data.requests || []);
      } else {
        throw new Error(response.error || 'Failed to load quote requests');
      }
    } catch (error: any) {
      console.error('Failed to load quote requests:', error);
      setError(error.message || 'Failed to load quote requests');
      setQuoteRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuoteRequestSuccess = (requestId: string) => {
    console.log('Quote request submitted successfully:', requestId);
    setActiveTab('requests');
    loadQuoteRequests(); // Refresh the requests list
  };

  const loadQuotesForRequest = async (requestId: string) => {
    setLoadingQuotes(true);
    try {
      const response = await quoteService.getQuotesForRequest(requestId);
      if (response.success && response.data) {
        setQuotes(response.data.quotes || []);
        setShowQuotesModal(true);
      } else {
        throw new Error(response.error || 'Failed to load quotes');
      }
    } catch (error: any) {
      console.error('Failed to load quotes:', error);
      setError(error.message || 'Failed to load quotes');
    } finally {
      setLoadingQuotes(false);
    }
  };

  const handleViewQuotations = (requestId: string) => {
    setSelectedRequestForQuotations(requestId);
    setShowQuotationComparison(true);
  };

  const handleQuotationSelectionSuccess = () => {
    setShowQuotationComparison(false);
    setSelectedRequestForQuotations(null);
    loadQuoteRequests(); // Refresh to show updated status
  };

  const handleViewQuoteDetail = (quote: any) => {
    setSelectedQuoteForDetail(quote);
    setShowUserQuoteDetail(true);
  };

  const handleCloseQuoteDetail = () => {
    setShowUserQuoteDetail(false);
    setSelectedQuoteForDetail(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.semantic.warning.main;
      case 'quotes_received':
        return theme.colors.semantic.info.main;
      case 'quote_selected':
        return theme.colors.primary[500];
      case 'completed':
        return theme.colors.semantic.success.main;
      case 'cancelled':
        return theme.colors.semantic.error.main;
      default:
        return theme.colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <ClockIcon size={16} />;
      case 'quotes_received':
        return <FileTextIcon size={16} />;
      case 'quote_selected':
        return <CheckCircleIcon size={16} />;
      case 'completed':
        return <CheckCircleIcon size={16} />;
      case 'cancelled':
        return <XCircleIcon size={16} />;
      default:
        return <AlertCircleIcon size={16} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return t('quotes.status.pending');
      case 'quotes_received':
        return t('quotes.status.quotesReceived');
      case 'quote_selected':
        return t('quotes.status.quoteSelected');
      case 'completed':
        return t('quotes.status.completed');
      case 'cancelled':
        return t('quotes.status.cancelled');
      default:
        return status;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Tab button style
  const getTabStyle = (tabName: string) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 24px',
    borderRadius: '8px',
    border: 'none',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: theme.transitions.normal,
    backgroundColor: activeTab === tabName ? theme.colors.primary[500] : 'transparent',
    color: activeTab === tabName ? 'white' : theme.colors.text.secondary,
    marginRight: isRTL ? '0' : '8px',
    marginLeft: isRTL ? '8px' : '0',
  });

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.colors.backgrounds.secondary,
      fontFamily: theme.typography.fonts.primary,
      direction: isRTL ? 'rtl' : 'ltr'
    }}>
      <div style={{ 
        width: '100%', 
        maxWidth: '100vw',
        padding: '1rem',
        margin: '0'
      }}>
        {/* Header */}
        <div style={{
          marginBottom: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            fontWeight: '700',
            color: theme.colors.text.primary,
            marginBottom: '0.5rem'
          }}>
            {t('quotes.title')}
          </h1>
          <p style={{
            fontSize: '1.2rem',
            color: theme.colors.text.secondary,
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            {t('quotes.subtitle')}
          </p>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          marginBottom: '2rem',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '8px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          width: 'fit-content',
          margin: '0 auto 2rem'
        }}>
          <button
            onClick={() => setActiveTab('requests')}
            style={getTabStyle('requests')}
          >
            <FileTextIcon size={16} style={{ marginRight: isRTL ? '0' : '8px', marginLeft: isRTL ? '8px' : '0', verticalAlign: 'middle' }} />
            {t('quotes.tabs.myRequests')}
          </button>
          <button
            onClick={() => setActiveTab('form')}
            style={getTabStyle('form')}
          >
            <PlusIcon size={16} style={{ marginRight: isRTL ? '0' : '8px', marginLeft: isRTL ? '8px' : '0', verticalAlign: 'middle' }} />
            {t('quotes.tabs.newRequest')}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'form' && (
          <MultiStepQuoteRequest
            user={user}
            onSuccess={handleQuoteRequestSuccess}
            onCancel={() => setActiveTab('requests')}
          />
        )}

        {activeTab === 'requests' && (
          <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 200px)' }}>
            {/* Left Panel - Requests List */}
            <div style={{
              width: selectedRequest ? '40%' : '100%',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden',
              transition: 'width 0.3s ease'
            }}>
              {/* Requests Header */}
              <div style={{
                padding: '1.5rem',
                borderBottom: `2px solid ${theme.colors.borders.light}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: theme.colors.primary[50]
              }}>
                <div>
                  <h2 style={{
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    color: theme.colors.text.primary,
                    marginBottom: '0.25rem'
                  }}>
                    {t('quotes.myRequests.title')}
                  </h2>
                  <p style={{
                    color: theme.colors.text.secondary,
                    fontSize: '13px'
                  }}>
                    {quoteRequests.length} {t('quotes.requests')}
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab('form')}
                  style={{
                    backgroundColor: theme.colors.primary[500],
                    color: 'white',
                    border: 'none',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    fontSize: '13px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: theme.transitions.normal,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <PlusIcon size={14} />
                  {t('quotes.actions.newRequest')}
                </button>
              </div>

              {/* Requests Content */}
              <div style={{ height: 'calc(100% - 80px)', overflowY: 'auto', padding: '1rem' }}>
                {isLoading ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    color: theme.colors.text.secondary
                  }}>
                    <ClockIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>{t('common.loading')}</p>
                  </div>
                ) : error ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '3rem',
                    backgroundColor: '#fef2f2',
                    borderRadius: '8px',
                    border: `2px solid ${theme.colors.semantic.error.main}`
                  }}>
                    <p style={{ color: theme.colors.semantic.error.main, marginBottom: '1rem' }}>
                      {error}
                    </p>
                    <button
                      onClick={loadQuoteRequests}
                      style={{
                        backgroundColor: theme.colors.semantic.error.main,
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '6px',
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                    >
                      {t('common.retry')}
                    </button>
                  </div>
                ) : quoteRequests.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '4rem',
                    color: theme.colors.text.secondary
                  }}>
                    <FileTextIcon size={64} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
                    <h3 style={{
                      fontSize: '1.2rem',
                      fontWeight: '600',
                      marginBottom: '1rem',
                      color: theme.colors.text.primary
                    }}>
                      {t('quotes.myRequests.empty.title')}
                    </h3>
                    <p style={{ marginBottom: '2rem', lineHeight: '1.6' }}>
                      {t('quotes.myRequests.empty.message')}
                    </p>
                    <button
                      onClick={() => setActiveTab('form')}
                      style={{
                        backgroundColor: theme.colors.primary[500],
                        color: 'white',
                        border: 'none',
                        padding: '12px 24px',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: theme.transitions.normal,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}
                    >
                      <PlusIcon size={16} />
                      {t('quotes.actions.createFirst')}
                    </button>
                  </div>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {quoteRequests.map((request) => (
                      <div
                        key={request.id}
                        style={{
                          border: `2px solid ${selectedRequest?.id === request.id ? theme.colors.primary[500] : theme.colors.borders.light}`,
                          borderRadius: '12px',
                          padding: '1.25rem',
                          transition: theme.transitions.normal,
                          cursor: 'pointer',
                          backgroundColor: selectedRequest?.id === request.id ? theme.colors.primary[50] : 'white',
                          boxShadow: selectedRequest?.id === request.id ? '0 4px 16px rgba(62, 178, 177, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
                        }}
                        onClick={() => setSelectedRequest(request)}
                        onMouseEnter={(e) => {
                          if (selectedRequest?.id !== request.id) {
                            e.currentTarget.style.borderColor = theme.colors.primary[300];
                            e.currentTarget.style.backgroundColor = theme.colors.primary[25];
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedRequest?.id !== request.id) {
                            e.currentTarget.style.borderColor = theme.colors.borders.light;
                            e.currentTarget.style.backgroundColor = 'white';
                          }
                        }}
                      >
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '0.75rem'
                        }}>
                          <div style={{ flex: 1 }}>
                            <h3 style={{
                              fontSize: '1rem',
                              fontWeight: '600',
                              color: theme.colors.text.primary,
                              marginBottom: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}>
                              <ZapIcon size={16} color={theme.colors.primary[500]} />
                              {request.system_size_kwp} kWp - {request.service_area}
                            </h3>
                            <p style={{
                              fontSize: '13px',
                              color: theme.colors.text.secondary,
                              marginBottom: '0.5rem',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <MapPinIcon size={12} />
                              {request.location_address.length > 40 ? `${request.location_address.substring(0, 40)}...` : request.location_address}
                            </p>
                          </div>
                          <div style={{ textAlign: isRTL ? 'left' : 'right', marginLeft: '1rem' }}>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 10px',
                              borderRadius: '16px',
                              fontSize: '11px',
                              fontWeight: '600',
                              backgroundColor: `${getStatusColor(request.status)}15`,
                              color: getStatusColor(request.status),
                              marginBottom: '0.5rem'
                            }}>
                              {getStatusIcon(request.status)}
                              {getStatusLabel(request.status)}
                            </div>
                            <div style={{
                              fontSize: '13px',
                              fontWeight: '600',
                              color: theme.colors.primary[500]
                            }}>
                              {request.quotes_count} {t('quotes.quotes')}
                            </div>
                          </div>
                        </div>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          fontSize: '12px',
                          color: theme.colors.text.secondary,
                          paddingTop: '0.75rem',
                          borderTop: `1px solid ${theme.colors.borders.light}`
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CalendarIcon size={12} />
                            {formatDate(request.created_at)}
                          </span>
                          <ChevronRightIcon size={16} color={theme.colors.primary[500]} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Panel - Quote Details */}
            {selectedRequest && (
              <div style={{
                width: '60%',
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                overflow: 'hidden',
                animation: 'slideIn 0.3s ease-out'
              }}>
                {/* Details Header */}
                <div style={{
                  padding: '1.5rem',
                  borderBottom: `2px solid ${theme.colors.borders.light}`,
                  backgroundColor: theme.colors.primary[500],
                  color: 'white'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h2 style={{
                        fontSize: '1.4rem',
                        fontWeight: '700',
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px'
                      }}>
                        <ZapIcon size={24} />
                        {selectedRequest.system_size_kwp} kWp {t('quotes.solarSystem')}
                      </h2>
                      <p style={{ fontSize: '14px', opacity: 0.9 }}>
                        {t('quotes.requestId')}: {selectedRequest.id}
                      </p>
                    </div>
                    <button
                      onClick={() => setSelectedRequest(null)}
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.2)',
                        border: 'none',
                        color: 'white',
                        borderRadius: '6px',
                        padding: '8px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      <XCircleIcon size={16} />
                    </button>
                  </div>
                </div>

                {/* Details Content */}
                <div style={{ height: 'calc(100% - 100px)', overflowY: 'auto', padding: '1.5rem' }}>
                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    
                    {/* Status and Progress */}
                    <div style={{
                      backgroundColor: theme.colors.backgrounds.secondary,
                      borderRadius: '12px',
                      padding: '1.5rem'
                    }}>
                      <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: theme.colors.text.primary,
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {getStatusIcon(selectedRequest.status)}
                        {t('quotes.status.title')}
                      </h3>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '1rem'
                      }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '8px 16px',
                          borderRadius: '20px',
                          fontSize: '14px',
                          fontWeight: '600',
                          backgroundColor: `${getStatusColor(selectedRequest.status)}15`,
                          color: getStatusColor(selectedRequest.status)
                        }}>
                          {getStatusIcon(selectedRequest.status)}
                          {getStatusLabel(selectedRequest.status)}
                        </span>
                        <span style={{
                          fontSize: '16px',
                          fontWeight: '700',
                          color: theme.colors.primary[500]
                        }}>
                          {selectedRequest.quotes_count} {t('quotes.quotesReceivedCount')}
                        </span>
                      </div>
                      {selectedRequest.estimated_cost && (
                        <div style={{
                          padding: '12px',
                          backgroundColor: theme.colors.primary[50],
                          borderRadius: '8px',
                          borderLeft: `4px solid ${theme.colors.primary[500]}`
                        }}>
                          <span style={{ fontSize: '14px', fontWeight: '600', color: theme.colors.primary[600] }}>
                            {t('quotes.estimatedCost')}: {selectedRequest.estimated_cost}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Assigned Contractors */}
                    {selectedRequest.assigned_contractors && selectedRequest.assigned_contractors.length > 0 && (
                      <div style={{
                        backgroundColor: theme.colors.backgrounds.secondary,
                        borderRadius: '12px',
                        padding: '1.5rem'
                      }}>
                        <h3 style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          color: theme.colors.text.primary,
                          marginBottom: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <FileTextIcon size={18} />
                          {t('quotes.selectedContractors')} ({selectedRequest.assigned_contractors.length})
                        </h3>
                        <div style={{ display: 'grid', gap: '8px' }}>
                          {selectedRequest.assigned_contractors.map((assignment, index) => {
                            const contractorInfo = assignment.contractor_info;
                            const contractorName = contractorInfo?.business_name || `${t('quotes.contractor')} ${index + 1}`;
                            const contractorCompany = contractorInfo?.business_name || t('quotes.solarCompany');
                            const assignmentStatus = assignment.assignment_status;
                            const hasQuote = selectedRequest.quotes_count > 0;
                            
                            return (
                              <div key={assignment.contractor_id} style={{
                                backgroundColor: 'white',
                                border: `2px solid ${theme.colors.borders.light}`,
                                borderRadius: '8px',
                                padding: '12px 16px',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                              }}>
                                <div>
                                  <div style={{ fontSize: '14px', fontWeight: '600', color: theme.colors.text.primary, marginBottom: '2px' }}>
                                    {contractorCompany}
                                  </div>
                                  <div style={{ fontSize: '12px', color: theme.colors.text.secondary }}>
                                    {contractorInfo?.email || 'Contact information not available'}
                                  </div>
                                </div>
                                <div style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px',
                                  padding: '4px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px',
                                  fontWeight: '600',
                                  backgroundColor: assignmentStatus === 'accepted' ? `${theme.colors.semantic.success.main}15` : 
                                                  assignmentStatus === 'assigned' ? `${theme.colors.semantic.info.main}15` : 
                                                  `${theme.colors.semantic.warning.main}15`,
                                  color: assignmentStatus === 'accepted' ? theme.colors.semantic.success.main : 
                                        assignmentStatus === 'assigned' ? theme.colors.semantic.info.main : 
                                        theme.colors.semantic.warning.main
                                }}>
                                  {assignmentStatus === 'accepted' ? <CheckCircleIcon size={12} /> : 
                                   assignmentStatus === 'assigned' ? <CheckCircleIcon size={12} /> : 
                                   <ClockIcon size={12} />}
                                  {assignmentStatus === 'accepted' ? t('quotes.status.accepted') : 
                                   assignmentStatus === 'assigned' ? t('quotes.status.assigned') : 
                                   t('quotes.status.pending')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Property Information */}
                    <div style={{
                      backgroundColor: theme.colors.backgrounds.secondary,
                      borderRadius: '12px',
                      padding: '1.5rem'
                    }}>
                      <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: theme.colors.text.primary,
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <HomeIcon size={18} />
                        {t('quotes.propertyDetails')}
                      </h3>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                          <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                            {t('quotes.location')}
                          </label>
                          <div style={{ fontSize: '14px', color: theme.colors.text.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <MapPinIcon size={14} color={theme.colors.primary[500]} />
                            {selectedRequest.location_address}
                          </div>
                        </div>
                        <div>
                          <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                            {t('quotes.contactPhone')}
                          </label>
                          <div style={{ fontSize: '14px', color: theme.colors.text.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <PhoneIcon size={14} color={theme.colors.primary[500]} />
                            {selectedRequest.contact_phone}
                          </div>
                        </div>
                        {selectedRequest.property_details && (
                          <>
                            <div>
                              <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                                {t('quotes.propertyType')}
                              </label>
                              <span style={{ fontSize: '14px', color: theme.colors.text.primary }}>
                                {selectedRequest.property_details.property_type}
                              </span>
                            </div>
                            <div>
                              <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                                {t('quotes.roofType')}
                              </label>
                              <span style={{ fontSize: '14px', color: theme.colors.text.primary }}>
                                {selectedRequest.property_details.roof_type}
                              </span>
                            </div>
                            <div>
                              <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                                {t('quotes.roofOrientation')}
                              </label>
                              <span style={{ fontSize: '14px', color: theme.colors.text.primary }}>
                                {selectedRequest.property_details.roof_orientation}
                              </span>
                            </div>
                            <div>
                              <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                                {t('quotes.shadingIssues')}
                              </label>
                              <span style={{ 
                                fontSize: '14px', 
                                color: selectedRequest.property_details.shading_issues ? theme.colors.semantic.warning.main : theme.colors.semantic.success.main,
                                fontWeight: '500'
                              }}>
                                {selectedRequest.property_details.shading_issues ? t('common.yes') : t('common.no')}
                              </span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Installation Schedule */}
                    <div style={{
                      backgroundColor: theme.colors.backgrounds.secondary,
                      borderRadius: '12px',
                      padding: '1.5rem'
                    }}>
                      <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: theme.colors.text.primary,
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <CalendarIcon size={18} />
                        {t('quotes.installationSchedule')}
                      </h3>
                      <div style={{
                        padding: '12px 16px',
                        backgroundColor: 'white',
                        borderRadius: '8px',
                        border: `2px solid ${theme.colors.primary[200]}`
                      }}>
                        <div style={{ fontSize: '14px', color: theme.colors.text.primary }}>
                          <strong>{t('quotes.preferredDate')}:</strong> {selectedRequest.preferred_installation_date ? formatDate(selectedRequest.preferred_installation_date) : t('quotes.notSpecified')}
                        </div>
                      </div>
                      
                      {selectedRequest.inspection_schedules && Object.keys(selectedRequest.inspection_schedules).length > 0 && (
                        <div style={{ marginTop: '1rem' }}>
                          <h4 style={{ fontSize: '14px', fontWeight: '600', color: theme.colors.text.primary, marginBottom: '8px' }}>
                            {t('quotes.inspectionSchedules')}:
                          </h4>
                          {Object.entries(selectedRequest.inspection_schedules).map(([contractorId, date], index) => {
                            // Find contractor info from assigned contractors or use contractor_details as fallback
                            const assignedContractor = selectedRequest.assigned_contractors?.find(a => a.contractor_id === contractorId);
                            const contractorName = assignedContractor?.contractor_info?.business_name || 
                                                  selectedRequest.contractor_details?.[contractorId]?.business_name || 
                                                  `${t('quotes.contractor')} ${index + 1}`;
                            return (
                              <div key={contractorId} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '8px 12px',
                                backgroundColor: 'white',
                                borderRadius: '6px',
                                marginBottom: '6px',
                                fontSize: '13px'
                              }}>
                                <span style={{ color: theme.colors.text.primary, fontWeight: '500' }}>
                                  {contractorName}
                                </span>
                                <span style={{ color: theme.colors.text.primary, fontWeight: '500' }}>
                                  {new Date(date).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
                                    weekday: 'short',
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Selected Quote (if any) */}
                    {selectedRequest.selected_quote && (
                      <div style={{
                        backgroundColor: theme.colors.semantic.success.light,
                        borderRadius: '12px',
                        padding: '1.5rem',
                        border: `2px solid ${theme.colors.semantic.success.main}`
                      }}>
                        <h3 style={{
                          fontSize: '1.1rem',
                          fontWeight: '600',
                          color: theme.colors.semantic.success.dark,
                          marginBottom: '1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          <CheckCircleIcon size={18} />
                          {t('quotes.selectedQuote')}
                        </h3>
                        <div style={{
                          backgroundColor: 'white',
                          padding: '1rem',
                          borderRadius: '8px'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                            <span style={{ fontSize: '16px', fontWeight: '600', color: theme.colors.text.primary }}>
                              {selectedRequest.selected_quote.contractor_name}
                            </span>
                            <span style={{ fontSize: '18px', fontWeight: '700', color: theme.colors.primary[600] }}>
                              {selectedRequest.selected_quote.price}
                            </span>
                          </div>
                          <div style={{ fontSize: '12px', color: theme.colors.text.secondary }}>
                            {t('quotes.selectedOn')}: {formatDate(selectedRequest.selected_quote.selected_at)}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div style={{
                      display: 'flex',
                      gap: '12px',
                      marginTop: '1rem'
                    }}>
                      <button
                        onClick={() => loadQuotesForRequest(selectedRequest.id)}
                        disabled={selectedRequest.quotes_count === 0 || loadingQuotes}
                        style={{
                          flex: 1,
                          backgroundColor: selectedRequest.quotes_count > 0 ? theme.colors.primary[500] : theme.colors.borders.medium,
                          color: 'white',
                          border: 'none',
                          padding: '12px 20px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: selectedRequest.quotes_count > 0 ? 'pointer' : 'not-allowed',
                          transition: theme.transitions.normal,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          opacity: loadingQuotes ? 0.7 : 1
                        }}
                      >
                        {loadingQuotes ? <ClockIcon size={16} /> : <FileTextIcon size={16} />}
                        {loadingQuotes ? t('common.loading') : t('quotes.actions.viewQuotes')}
                      </button>
                      <button
                        onClick={() => handleViewQuotations(selectedRequest.id)}
                        disabled={selectedRequest.quotes_count === 0}
                        style={{
                          flex: 1,
                          backgroundColor: 'transparent',
                          color: selectedRequest.quotes_count > 0 ? theme.colors.primary[500] : theme.colors.borders.medium,
                          border: `2px solid ${selectedRequest.quotes_count > 0 ? theme.colors.primary[500] : theme.colors.borders.medium}`,
                          padding: '12px 20px',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: selectedRequest.quotes_count > 0 ? 'pointer' : 'not-allowed',
                          transition: theme.transitions.normal,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px'
                        }}
                      >
                        <GitCompare size={16} />
                        {t('userApp.quotes.viewQuotations')}
                      </button>
                    </div>

                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quotes Modal */}
        {showQuotesModal && selectedRequest && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              width: '90%',
              maxWidth: '1000px',
              maxHeight: '90vh',
              overflow: 'hidden',
              position: 'relative'
            }}>
              {/* Modal Header */}
              <div style={{
                backgroundColor: theme.colors.primary[500],
                color: 'white',
                padding: '1.5rem 2rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  margin: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <FileTextIcon size={24} />
                  {t('quotes.receivedQuotes')} ({quotes.length})
                </h2>
                <button
                  onClick={() => setShowQuotesModal(false)}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '8px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <XCircleIcon size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div style={{
                maxHeight: 'calc(90vh - 100px)',
                overflowY: 'auto',
                padding: '2rem'
              }}>
                {quotes.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '4rem',
                    color: theme.colors.text.secondary
                  }}>
                    <FileTextIcon size={64} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
                    <h3 style={{ fontSize: '1.2rem', fontWeight: '600', marginBottom: '1rem', color: theme.colors.text.primary }}>
                      {t('quotes.noQuotes.title')}
                    </h3>
                    <p>{t('quotes.noQuotes.message')}</p>
                  </div>
                ) : (
                  <div style={{ display: 'grid', gap: '1.5rem' }}>
                    {quotes.map((quote: any, index: number) => (
                      <div key={quote.id || index} style={{
                        border: `2px solid ${theme.colors.borders.light}`,
                        borderRadius: '12px',
                        padding: '1.5rem',
                        backgroundColor: theme.colors.backgrounds.secondary,
                        transition: theme.transitions.normal,
                        position: 'relative'
                      }}>
                        {/* Quote Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '1rem'
                        }}>
                          <div>
                            <h3 style={{
                              fontSize: '1.2rem',
                              fontWeight: '700',
                              color: theme.colors.text.primary,
                              marginBottom: '0.5rem'
                            }}>
                              {quote.contractor_name || quote.contractor_company || t('quotes.solarCompany')} #{index + 1}
                            </h3>
                            <div style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              fontSize: '12px',
                              fontWeight: '600',
                              backgroundColor: quote.admin_status === 'approved' 
                                ? `${theme.colors.semantic.success.main}15` 
                                : `${theme.colors.semantic.warning.main}15`,
                              color: quote.admin_status === 'approved' 
                                ? theme.colors.semantic.success.main 
                                : theme.colors.semantic.warning.main
                            }}>
                              {quote.admin_status === 'approved' ? <CheckCircleIcon size={12} /> : <ClockIcon size={12} />}
                              {quote.admin_status === 'approved' ? t('quotes.status.approved') : t('quotes.status.pendingReview')}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{
                              fontSize: '1.5rem',
                              fontWeight: '700',
                              color: theme.colors.primary[600],
                              marginBottom: '0.25rem'
                            }}>
                              {quote.total_user_price ? `${quote.total_user_price.toLocaleString()} SAR` : `${quote.base_price?.toLocaleString()} SAR`}
                            </div>
                            <div style={{
                              fontSize: '12px',
                              color: theme.colors.text.secondary
                            }}>
                              {quote.price_per_kwp} SAR/kWp
                            </div>
                          </div>
                        </div>

                        {/* Quote Details */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '1rem',
                          marginBottom: '1rem'
                        }}>
                          <div>
                            <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                              {t('quotes.installationTimeline')}
                            </label>
                            <span style={{ fontSize: '14px', color: theme.colors.text.primary, fontWeight: '500' }}>
                              {quote.installation_timeline_days} {t('quotes.days')}
                            </span>
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                              {t('quotes.systemCapacity')}
                            </label>
                            <span style={{ fontSize: '14px', color: theme.colors.text.primary, fontWeight: '500' }}>
                              {quote.system_specs?.total_capacity_kwp || selectedRequest.system_size_kwp} kWp
                            </span>
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                              {t('quotes.panels')}
                            </label>
                            <span style={{ fontSize: '14px', color: theme.colors.text.primary, fontWeight: '500' }}>
                              {quote.panels_brand} {quote.panels_model} ({quote.panels_quantity})
                            </span>
                          </div>
                          <div>
                            <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                              {t('quotes.inverter')}
                            </label>
                            <span style={{ fontSize: '14px', color: theme.colors.text.primary, fontWeight: '500' }}>
                              {quote.inverter_brand} {quote.inverter_model}
                            </span>
                          </div>
                        </div>

                        {/* Warranty Information */}
                        {quote.warranty_terms && (
                          <div style={{
                            backgroundColor: 'white',
                            padding: '12px',
                            borderRadius: '8px',
                            marginBottom: '1rem'
                          }}>
                            <h4 style={{ fontSize: '14px', fontWeight: '600', color: theme.colors.text.primary, marginBottom: '8px' }}>
                              {t('quotes.warrantyTerms')}:
                            </h4>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px', fontSize: '13px' }}>
                              <span><strong>{t('quotes.equipment')}:</strong> {quote.warranty_terms.equipment_warranty_years} {t('quotes.years')}</span>
                              <span><strong>{t('quotes.performance')}:</strong> {quote.warranty_terms.performance_warranty_years} {t('quotes.years')}</span>
                              <span><strong>{t('quotes.installation')}:</strong> {quote.warranty_terms.installation_warranty_years} {t('quotes.years')}</span>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div style={{
                          display: 'flex',
                          gap: '12px',
                          marginTop: '1rem'
                        }}>
                          <button
                            disabled={quote.admin_status !== 'approved'}
                            style={{
                              flex: 1,
                              backgroundColor: quote.admin_status === 'approved' ? theme.colors.semantic.success.main : theme.colors.borders.medium,
                              color: 'white',
                              border: 'none',
                              padding: '10px 16px',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: quote.admin_status === 'approved' ? 'pointer' : 'not-allowed',
                              transition: theme.transitions.normal,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <CheckCircleIcon size={16} />
                            {t('quotes.actions.selectQuote')}
                          </button>
                          <button
                            onClick={() => handleViewQuoteDetail(quote)}
                            style={{
                              flex: 1,
                              backgroundColor: 'transparent',
                              color: theme.colors.primary[500],
                              border: `2px solid ${theme.colors.primary[500]}`,
                              padding: '10px 16px',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              transition: theme.transitions.normal,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '6px'
                            }}
                          >
                            <FileTextIcon size={16} />
                            {t('quotes.actions.viewDetails')}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quotation Comparison Modal */}
        {showQuotationComparison && selectedRequestForQuotations && (
          <QuotationComparisonModal
            isOpen={showQuotationComparison}
            requestId={selectedRequestForQuotations}
            onClose={() => {
              setShowQuotationComparison(false);
              setSelectedRequestForQuotations(null);
            }}
            onSuccess={handleQuotationSelectionSuccess}
          />
        )}

        {/* User Quote Detail Modal */}
        <UserQuoteDetailModal
          isOpen={showUserQuoteDetail}
          onClose={handleCloseQuoteDetail}
          quote={selectedQuoteForDetail}
          request={selectedRequest}
        />
      </div>
    </div>
  );
};

export default Quotes;