import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { config } from '../config/environment';
import { 
  FileTextIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  MapPinIcon, 
  ZapIcon, 
  CalendarIcon, 
  PhoneIcon,
  HomeIcon,
  AlertCircleIcon,
  ChevronRightIcon,
  EyeIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  RefreshCwIcon
} from 'lucide-react';

interface ContractorQuotesProps {
  user: {
    id: string;
    email: string;
    business_name?: string;
  };
}

interface AssignedRequest {
  assignment_id: string;
  request_id: string;
  contractor_id: string;
  assignment_status: 'assigned' | 'viewed' | 'accepted' | 'rejected';
  assigned_at: string;
  viewed_at?: string;
  responded_at?: string;
  response_notes?: string;
  has_submitted_quote: boolean;
  quote_request: {
    user_id: string;
    system_size_kwp: number;
    location_address: string;
    service_area: string;
    property_details: any;
    electricity_consumption: any;
    created_at: string;
    status: string;
  };
  // Legacy support for direct properties (optional)
  id?: string;
  system_size_kwp?: string;
  location_address?: string;
  service_area?: string;
  created_at?: string;
}

const ContractorQuotes: React.FC<ContractorQuotesProps> = ({ user }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Add CSS animation for spinning icon
  const spinAnimation = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `;
  
  React.useEffect(() => {
    if (!document.getElementById('spin-animation')) {
      const style = document.createElement('style');
      style.id = 'spin-animation';
      style.textContent = spinAnimation;
      document.head.appendChild(style);
    }
  }, []);
  
  const [assignedRequests, setAssignedRequests] = useState<AssignedRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<AssignedRequest | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assigned' | 'submitted'>('assigned');
  const [isResponding, setIsResponding] = useState(false);
  
  // Submitted quotes state
  const [submittedQuotes, setSubmittedQuotes] = useState<any[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [selectedQuotation, setSelectedQuotation] = useState<any>(null);
  const [showQuotationDetails, setShowQuotationDetails] = useState(false);
  
  // New states for detailed quotation form
  const [showQuotationForm, setShowQuotationForm] = useState(false);
  const [isSubmittingQuotation, setIsSubmittingQuotation] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  
  // Dynamic pricing configuration state
  const [pricingConfig, setPricingConfig] = useState({
    commission_percent: 15,
    overprice_percent: 10,
    vat_rate: 15
  });
  const [quotationData, setQuotationData] = useState({
    contractor_vat_number: '300000000000003',
    installation_deadline: '',
    payment_terms: 'wallet_credit' as 'wallet_credit' | 'bank_transfer',
    solar_system_capacity_kwp: 0,
    storage_capacity_kwh: 0,
    monthly_production_kwh: 0,
    line_items: [
      {
        serial_number: 1,
        item_name: 'Solar Panel',
        description: '',
        quantity: 1,
        unit_price: 0
      }
    ]
  });

  // Load assigned quote requests
  useEffect(() => {
    loadAssignedRequests();
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab === 'submitted') {
      loadSubmittedQuotes();
    }
  }, [activeTab]);

  // Reset quotation form when opening
  useEffect(() => {
    if (showQuotationForm && selectedRequest) {
      setQuotationData(prev => ({
        ...prev,
        solar_system_capacity_kwp: selectedRequest.quote_request?.system_size_kwp || selectedRequest.system_size_kwp || 0,
        line_items: [
          {
            serial_number: 1,
            item_name: 'Solar Panel',
            description: '',
            quantity: 1,
            unit_price: 0
          }
        ]
      }));
    }
  }, [showQuotationForm, selectedRequest]);

  // Load pricing configuration from backend
  const loadPricingConfig = async () => {
    try {
      const response = await fetch(`${config.quoteServiceUrl}/financial/pricing-config`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('rabhan_access_token')}`,
        },
      });
      const data = await response.json();
      if (data.success && data.data.pricing_config) {
        const config = data.data.pricing_config;
        setPricingConfig({
          commission_percent: config.platform_commission_percent || 15,
          overprice_percent: config.platform_overprice_percent || 10,
          vat_rate: config.vat_rate || 15
        });
      }
    } catch (error) {
      console.error('Failed to load pricing config:', error);
    }
  };

  // Load pricing config on component mount
  useEffect(() => {
    loadPricingConfig();
  }, []);

  const loadAssignedRequests = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Use the configured quote service URL with cache-busting
      const cacheBuster = `t=${Date.now()}`;
      const response = await fetch(`${config.quoteServiceUrl}/contractor/assigned-requests?${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rabhan_access_token')}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });

      const data = await response.json();

      if (data?.success) {
        // Handle both possible response formats
        const requests = data.data?.assigned_requests || data.data?.requests || data.assigned_requests || [];
        setAssignedRequests(requests);
      } else {
        throw new Error(data?.message || 'Failed to load assigned requests');
      }
    } catch (error: any) {
      console.error('Failed to load assigned requests:', error);
      setError(error.message || 'Failed to load assigned requests');
      setAssignedRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch submitted quotes
  const loadSubmittedQuotes = async () => {
    setQuotesLoading(true);
    setError(null);
    
    try {
      const cacheBuster = `t=${Date.now()}`;
      const response = await fetch(`${config.quoteServiceUrl}/contractor/my-quotes?${cacheBuster}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rabhan_access_token')}`,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSubmittedQuotes(data.data.quotes || []);
      } else {
        throw new Error(data.message || 'Failed to fetch submitted quotes');
      }
    } catch (error) {
      console.error('Error loading submitted quotes:', error);
      setError(error instanceof Error ? error.message : 'Failed to load submitted quotes');
      setSubmittedQuotes([]);
    } finally {
      setQuotesLoading(false);
    }
  };

  const handleRespond = async (requestId: string, response: 'accepted' | 'rejected', notes?: string) => {
    setIsResponding(true);
    try {
      const apiResponse = await fetch(`${config.quoteServiceUrl}/contractor/respond/${requestId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rabhan_access_token')}`,
        },
        body: JSON.stringify({
          response,
          notes
        })
      });

      const data = await apiResponse.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to respond to request');
      }
      
      // Refresh the list
      await loadAssignedRequests();
      
      // Update selected request if it's the same one
      if (selectedRequest?.id === requestId) {
        const updated = assignedRequests.find(req => req.id === requestId);
        if (updated) {
          setSelectedRequest({ ...updated, assignment_status: response });
        }
      }
    } catch (error: any) {
      console.error('Failed to respond to request:', error);
      setError(error.message || 'Failed to respond to request');
    } finally {
      setIsResponding(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned':
        return theme.colors.semantic.info.main;
      case 'viewed':
        return theme.colors.semantic.warning.main;
      case 'accepted':
        return theme.colors.semantic.success.main;
      case 'rejected':
        return theme.colors.semantic.error.main;
      default:
        return theme.colors.text.secondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'assigned':
        return <ClockIcon size={14} />;
      case 'viewed':
        return <EyeIcon size={14} />;
      case 'accepted':
        return <CheckCircleIcon size={14} />;
      case 'rejected':
        return <XCircleIcon size={14} />;
      default:
        return <AlertCircleIcon size={14} />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'assigned':
        return t('contractorApp.quotes.statuses.assigned');
      case 'viewed':
        return t('contractorApp.quotes.statuses.viewed');
      case 'accepted':
        return t('contractorApp.quotes.statuses.accepted');
      case 'rejected':
        return t('contractorApp.quotes.statuses.rejected');
      default:
        return status;
    }
  };

  // New functions for quotation form
  const calculateLineItemTotals = (item: any) => {
    const totalPrice = item.quantity * item.unit_price;
    const rabhanCommission = totalPrice * (pricingConfig.commission_percent / 100);
    const rabhanOverPrice = totalPrice * (pricingConfig.overprice_percent / 100);
    const userPrice = totalPrice + rabhanOverPrice;
    const vendorNetPrice = totalPrice - rabhanCommission;
    
    return {
      totalPrice,
      rabhanCommission,
      rabhanOverPrice,
      userPrice,
      vendorNetPrice
    };
  };

  const calculateQuotationTotals = () => {
    return quotationData.line_items.reduce((totals, item) => {
      const itemTotals = calculateLineItemTotals(item);
      return {
        totalPrice: totals.totalPrice + itemTotals.totalPrice,
        rabhanCommission: totals.rabhanCommission + itemTotals.rabhanCommission,
        rabhanOverPrice: totals.rabhanOverPrice + itemTotals.rabhanOverPrice,
        userPrice: totals.userPrice + itemTotals.userPrice,
        vendorNetPrice: totals.vendorNetPrice + itemTotals.vendorNetPrice
      };
    }, { totalPrice: 0, rabhanCommission: 0, rabhanOverPrice: 0, userPrice: 0, vendorNetPrice: 0 });
  };

  const fillTestData = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 30); // 30 days from now
    
    setQuotationData(prev => ({
      ...prev,
      installation_deadline: tomorrow.toISOString().split('T')[0],
      payment_terms: 'wallet_credit' as 'wallet_credit' | 'bank_transfer',
      solar_system_capacity_kwp: 10.5,
      storage_capacity_kwh: 15.0,
      monthly_production_kwh: 1200,
      line_items: [
        {
          serial_number: 1,
          item_name: 'Solar Panel',
          description: '450W Monocrystalline High Efficiency',
          quantity: 24,
          unit_price: 400
        },
        {
          serial_number: 2,
          item_name: 'Inverter',
          description: 'Hybrid Inverter - 10KW MPPT',
          quantity: 1,
          unit_price: 4500
        },
        {
          serial_number: 3,
          item_name: 'Batteries',
          description: 'Lithium LifePO4 - 15KWH Storage',
          quantity: 1,
          unit_price: 9000
        },
        {
          serial_number: 4,
          item_name: 'Installation & Accessories',
          description: 'Mounting stands, cables, protection devices',
          quantity: 1,
          unit_price: 2500
        }
      ]
    }));
  };

  const addLineItem = () => {
    setQuotationData(prev => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        {
          serial_number: prev.line_items.length + 1,
          item_name: '',
          description: '',
          quantity: 1,
          unit_price: 0
        }
      ]
    }));
  };

  const removeLineItem = (index: number) => {
    if (quotationData.line_items.length > 1) {
      setQuotationData(prev => ({
        ...prev,
        line_items: prev.line_items.filter((_, i) => i !== index).map((item, i) => ({
          ...item,
          serial_number: i + 1
        }))
      }));
    }
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    setQuotationData(prev => ({
      ...prev,
      line_items: prev.line_items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  // Custom Calendar Component
  const CustomCalendar = ({ selectedDate, onDateSelect, onClose }: { selectedDate: string, onDateSelect: (date: string) => void, onClose: () => void }) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const today = new Date();
    const minDate = new Date();
    
    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startingDayOfWeek = firstDay.getDay();
      
      const days = [];
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < startingDayOfWeek; i++) {
        days.push(null);
      }
      
      // Add days of the month
      for (let day = 1; day <= daysInMonth; day++) {
        days.push(new Date(year, month, day));
      }
      
      return days;
    };
    
    const formatDateToInput = (date: Date) => {
      return date.toISOString().split('T')[0];
    };
    
    const isDateDisabled = (date: Date) => {
      return date < minDate;
    };
    
    const isDateSelected = (date: Date) => {
      return selectedDate === formatDateToInput(date);
    };
    
    const days = getDaysInMonth(currentMonth);
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    
    return (
      <div style={{
        position: 'absolute',
        top: '100%',
        left: 0,
        zIndex: 1000,
        backgroundColor: 'white',
        border: `2px solid ${theme.colors.primary[500]}`,
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        padding: '1rem',
        minWidth: '280px'
      }}>
        {/* Calendar Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem'
        }}>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: theme.colors.primary[500],
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            ‹
          </button>
          <div style={{
            fontSize: '16px',
            fontWeight: '600',
            color: theme.colors.text.primary
          }}>
            {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </div>
          <button
            onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: theme.colors.primary[500],
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            ›
          </button>
        </div>
        
        {/* Day Names */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px',
          marginBottom: '8px'
        }}>
          {dayNames.map(day => (
            <div key={day} style={{
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: '600',
              color: theme.colors.text.secondary,
              padding: '4px'
            }}>
              {day}
            </div>
          ))}
        </div>
        
        {/* Calendar Days */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '4px'
        }}>
          {days.map((date, index) => (
            <div key={index} style={{ height: '32px' }}>
              {date && (
                <button
                  onClick={() => {
                    if (!isDateDisabled(date)) {
                      onDateSelect(formatDateToInput(date));
                      onClose();
                    }
                  }}
                  disabled={isDateDisabled(date)}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    cursor: isDateDisabled(date) ? 'not-allowed' : 'pointer',
                    backgroundColor: isDateSelected(date) 
                      ? theme.colors.primary[500] 
                      : isDateDisabled(date) 
                        ? '#f5f5f5' 
                        : 'transparent',
                    color: isDateSelected(date) 
                      ? 'white' 
                      : isDateDisabled(date) 
                        ? '#ccc' 
                        : theme.colors.text.primary,
                    fontWeight: isDateSelected(date) ? '600' : '400',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!isDateDisabled(date) && !isDateSelected(date)) {
                      e.target.style.backgroundColor = theme.colors.primary[100];
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isDateDisabled(date) && !isDateSelected(date)) {
                      e.target.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  {date.getDate()}
                </button>
              )}
            </div>
          ))}
        </div>
        
        {/* Calendar Footer */}
        <div style={{
          marginTop: '1rem',
          paddingTop: '1rem',
          borderTop: `1px solid ${theme.colors.borders.light}`,
          display: 'flex',
          justifyContent: 'space-between'
        }}>
          <button
            onClick={() => {
              onDateSelect(formatDateToInput(today));
              onClose();
            }}
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.primary[500]}`,
              color: theme.colors.primary[500],
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Today
          </button>
          <button
            onClick={onClose}
            style={{
              backgroundColor: theme.colors.borders.light,
              border: 'none',
              color: theme.colors.text.primary,
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer'
            }}
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  const submitDetailedQuotation = async () => {
    if (!selectedRequest) return;
    
    setIsSubmittingQuotation(true);
    try {
      const totals = calculateQuotationTotals();
      
      const quotationPayload = {
        request_id: selectedRequest.request_id || selectedRequest.id,
        contractor_vat_number: quotationData.contractor_vat_number,
        installation_deadline: quotationData.installation_deadline,
        payment_terms: quotationData.payment_terms,
        solar_system_capacity_kwp: quotationData.solar_system_capacity_kwp,
        storage_capacity_kwh: quotationData.storage_capacity_kwh,
        monthly_production_kwh: quotationData.monthly_production_kwh,
        base_price: totals.totalPrice,
        price_per_kwp: totals.totalPrice / (selectedRequest.quote_request?.system_size_kwp || selectedRequest.system_size_kwp || 1),
        line_items: quotationData.line_items.map(item => ({
          ...item,
          ...calculateLineItemTotals(item)
        }))
      };

      const response = await fetch(`${config.quoteServiceUrl}/contractor/submit-detailed-quotation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rabhan_access_token')}`,
        },
        body: JSON.stringify(quotationPayload),
      });

      const data = await response.json();

      if (data?.success) {
        setShowQuotationForm(false);
        // Update the request status to show quotation submitted
        setAssignedRequests(prev => 
          prev.map(req => 
            (req.request_id || req.id) === (selectedRequest.request_id || selectedRequest.id)
              ? { ...req, has_submitted_quote: true }
              : req
          )
        );
        if (selectedRequest) {
          setSelectedRequest({ ...selectedRequest, has_submitted_quote: true });
        }
      } else {
        throw new Error(data?.message || 'Failed to submit quotation');
      }
    } catch (error) {
      console.error('Submit quotation error:', error);
      setError(error instanceof Error ? error.message : 'Failed to submit quotation');
    } finally {
      setIsSubmittingQuotation(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(62, 178, 177, 0.2)',
    boxShadow: '0 8px 32px rgba(62, 178, 177, 0.1)',
    padding: '2rem',
    marginBottom: '1.5rem',
  };

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
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#1a1a1a',
          textAlign: isRTL ? 'right' : 'left'
        }}>
          {t('contractorApp.quotes.title')}
        </h1>
        <button
          onClick={loadAssignedRequests}
          disabled={isLoading}
          style={{
            backgroundColor: theme.colors.primary[500],
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            opacity: isLoading ? 0.7 : 1
          }}
        >
          <RefreshCwIcon size={16} style={{ 
            animation: isLoading ? 'spin 1s linear infinite' : 'none'
          }} />
          {t('common.refresh')}
        </button>
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
        width: 'fit-content'
      }}>
        <button
          onClick={() => setActiveTab('assigned')}
          style={getTabStyle('assigned')}
        >
          <FileTextIcon size={16} />
          {t('contractorApp.quotes.tabs.assigned')} ({assignedRequests.length})
        </button>
        <button
          onClick={() => setActiveTab('submitted')}
          style={getTabStyle('submitted')}
        >
          <CheckCircleIcon size={16} />
          {t('contractorApp.quotes.tabs.submitted')}
        </button>
      </div>

      {activeTab === 'assigned' && (
        <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 250px)' }}>
          {/* Left Panel - Assigned Requests List */}
          <div style={{
            width: selectedRequest ? '40%' : '100%',
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
            overflow: 'hidden',
            transition: 'width 0.3s ease'
          }}>
            <div style={{
              padding: '1.5rem',
              borderBottom: `2px solid ${theme.colors.borders.light}`,
              backgroundColor: theme.colors.primary[50]
            }}>
              <h2 style={{
                fontSize: '1.3rem',
                fontWeight: '700',
                color: theme.colors.text.primary,
                marginBottom: '0.25rem'
              }}>
                {t('contractorApp.quotes.assignedRequests')}
              </h2>
              <p style={{
                color: theme.colors.text.secondary,
                fontSize: '13px'
              }}>
                {assignedRequests.length} {t('contractorApp.quotes.requests')}
              </p>
            </div>

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
                    onClick={loadAssignedRequests}
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
              ) : assignedRequests.length === 0 ? (
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
                    {t('contractorApp.quotes.noRequests.title')}
                  </h3>
                  <p>{t('contractorApp.quotes.noRequests.message')}</p>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem'
                }}>
                  {assignedRequests.map((request) => (
                    <div
                      key={request.assignment_id || request.id}
                      style={{
                        border: `2px solid ${(selectedRequest?.assignment_id || selectedRequest?.id) === (request.assignment_id || request.id) ? theme.colors.primary[500] : theme.colors.borders.light}`,
                        borderRadius: '12px',
                        padding: '1.25rem',
                        transition: theme.transitions.normal,
                        cursor: 'pointer',
                        backgroundColor: (selectedRequest?.assignment_id || selectedRequest?.id) === (request.assignment_id || request.id) ? theme.colors.primary[50] : 'white',
                        boxShadow: (selectedRequest?.assignment_id || selectedRequest?.id) === (request.assignment_id || request.id) ? '0 4px 16px rgba(62, 178, 177, 0.2)' : '0 2px 8px rgba(0, 0, 0, 0.05)'
                      }}
                      onClick={() => setSelectedRequest(request)}
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
                            {request.quote_request?.system_size_kwp || request.system_size_kwp} kWp - {request.quote_request?.service_area || request.service_area}
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
                            {(request.quote_request?.location_address || request.location_address)?.length > 40 ? 
                              `${(request.quote_request?.location_address || request.location_address).substring(0, 40)}...` : 
                              (request.quote_request?.location_address || request.location_address || 'No address')
                            }
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
                            backgroundColor: `${getStatusColor(request.assignment_status)}15`,
                            color: getStatusColor(request.assignment_status),
                            marginBottom: '0.5rem'
                          }}>
                            {getStatusIcon(request.assignment_status)}
                            {getStatusLabel(request.assignment_status)}
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
                          {formatDate(request.assigned_at)}
                        </span>
                        <ChevronRightIcon size={16} color={theme.colors.primary[500]} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Request Details */}
          {selectedRequest && (
            <div style={{
              width: '60%',
              backgroundColor: 'white',
              borderRadius: '12px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              overflow: 'hidden'
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
                      {selectedRequest.quote_request?.system_size_kwp || selectedRequest.system_size_kwp} kWp {t('contractorApp.quotes.solarSystem')}
                    </h2>
                    <p style={{ fontSize: '14px', opacity: 0.9 }}>
                      {t('contractorApp.quotes.requestId')}: {selectedRequest.request_id || selectedRequest.id}
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
                      cursor: 'pointer'
                    }}
                  >
                    <XCircleIcon size={16} />
                  </button>
                </div>
              </div>

              {/* Details Content */}
              <div style={{ height: 'calc(100% - 100px)', overflowY: 'auto', padding: '1.5rem' }}>
                <div style={{ display: 'grid', gap: '1.5rem' }}>
                  
                  {/* Assignment Status */}
                  <div style={{
                    backgroundColor: theme.colors.backgrounds.secondary,
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}>
                    <h3 style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: theme.colors.text.primary,
                      marginBottom: '1rem'
                    }}>
                      {t('contractorApp.quotes.assignmentStatus')}
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
                        backgroundColor: `${getStatusColor(selectedRequest.assignment_status)}15`,
                        color: getStatusColor(selectedRequest.assignment_status)
                      }}>
                        {getStatusIcon(selectedRequest.assignment_status)}
                        {getStatusLabel(selectedRequest.assignment_status)}
                      </span>
                    </div>
                    
                    {/* Response Actions */}
                    {selectedRequest.assignment_status === 'assigned' || selectedRequest.assignment_status === 'viewed' ? (
                      <div style={{
                        display: 'flex',
                        gap: '12px',
                        marginTop: '1rem'
                      }}>
                        <button
                          onClick={() => handleRespond(selectedRequest.request_id || selectedRequest.id, 'accepted')}
                          disabled={isResponding}
                          style={{
                            flex: 1,
                            backgroundColor: theme.colors.semantic.success.main,
                            color: 'white',
                            border: 'none',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: isResponding ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            opacity: isResponding ? 0.7 : 1
                          }}
                        >
                          <ThumbsUpIcon size={16} />
                          {t('contractorApp.quotes.actions.accept')}
                        </button>
                        <button
                          onClick={() => handleRespond(selectedRequest.request_id || selectedRequest.id, 'rejected', 'Not available for this project')}
                          disabled={isResponding}
                          style={{
                            flex: 1,
                            backgroundColor: theme.colors.semantic.error.main,
                            color: 'white',
                            border: 'none',
                            padding: '12px 20px',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '600',
                            cursor: isResponding ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            opacity: isResponding ? 0.7 : 1
                          }}
                        >
                          <ThumbsDownIcon size={16} />
                          {t('contractorApp.quotes.actions.reject')}
                        </button>
                      </div>
                    ) : (
                      <div style={{
                        padding: '12px',
                        backgroundColor: theme.colors.primary[50],
                        borderRadius: '8px',
                        marginTop: '1rem'
                      }}>
                        <p style={{ fontSize: '14px', color: theme.colors.primary[600] }}>
                          {selectedRequest.assignment_status === 'accepted' ? 
                            t('contractorApp.quotes.alreadyAccepted') : 
                            t('contractorApp.quotes.alreadyRejected')
                          }
                        </p>
                        {selectedRequest.responded_at && (
                          <p style={{ fontSize: '12px', color: theme.colors.text.secondary, marginTop: '4px' }}>
                            {formatDate(selectedRequest.responded_at)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

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
                      {t('contractorApp.quotes.propertyDetails')}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                          {t('contractorApp.quotes.location')}
                        </label>
                        <div style={{ fontSize: '14px', color: theme.colors.text.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPinIcon size={14} color={theme.colors.primary[500]} />
                          {selectedRequest.quote_request?.location_address || selectedRequest.location_address}
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                          {t('contractorApp.quotes.systemSize')}
                        </label>
                        <div style={{ fontSize: '14px', color: theme.colors.text.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <ZapIcon size={14} color={theme.colors.primary[500]} />
                          {selectedRequest.quote_request?.system_size_kwp || selectedRequest.system_size_kwp} kWp
                        </div>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                          {t('contractorApp.quotes.serviceArea')}
                        </label>
                        <span style={{ fontSize: '14px', color: theme.colors.text.primary }}>
                          {selectedRequest.quote_request?.service_area || selectedRequest.service_area}
                        </span>
                      </div>
                      <div>
                        <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                          {t('contractorApp.quotes.requestDate')}
                        </label>
                        <div style={{ fontSize: '14px', color: theme.colors.text.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CalendarIcon size={14} color={theme.colors.primary[500]} />
                          {formatDate(selectedRequest.quote_request?.created_at || selectedRequest.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quote Submission Status */}
                  {selectedRequest.assignment_status === 'accepted' && (
                    <div style={{
                      backgroundColor: selectedRequest.has_submitted_quote ? theme.colors.semantic.success.light : theme.colors.semantic.warning.light,
                      borderRadius: '12px',
                      padding: '1.5rem',
                      border: `2px solid ${selectedRequest.has_submitted_quote ? theme.colors.semantic.success.main : theme.colors.semantic.warning.main}`
                    }}>
                      <h3 style={{
                        fontSize: '1.1rem',
                        fontWeight: '600',
                        color: selectedRequest.has_submitted_quote ? theme.colors.semantic.success.dark : theme.colors.semantic.warning.dark,
                        marginBottom: '1rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        {selectedRequest.has_submitted_quote ? <CheckCircleIcon size={18} /> : <ClockIcon size={18} />}
                        {selectedRequest.has_submitted_quote ? 
                          t('contractorApp.quotes.quoteSubmitted') : 
                          t('contractorApp.quotes.submitQuote')
                        }
                      </h3>
                      {!selectedRequest.has_submitted_quote && (
                        <div>
                          <p style={{ fontSize: '14px', marginBottom: '1rem' }}>
                            {t('contractorApp.quotes.submitQuoteMessage')}
                          </p>
                          <button
                            onClick={() => setShowQuotationForm(true)}
                            style={{
                              backgroundColor: theme.colors.primary[500],
                              color: 'white',
                              border: 'none',
                              padding: '12px 24px',
                              borderRadius: '8px',
                              fontSize: '14px',
                              fontWeight: '600',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px'
                            }}
                          >
                            <FileTextIcon size={16} />
                            {t('contractorApp.quotes.actions.submitQuote')}
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'submitted' && (
        <div style={cardStyle}>
          {quotesLoading ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: '#6b7280'
            }}>
              <RefreshCwIcon 
                size={64} 
                style={{ 
                  marginBottom: '1.5rem', 
                  opacity: 0.3,
                  animation: 'spin 2s linear infinite'
                }} 
              />
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1a1a1a',
                marginBottom: '1rem'
              }}>
                {t('loading')}
              </h2>
              <p>{t('contractorApp.quotes.loadingQuotes')}</p>
            </div>
          ) : error ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: '#ef4444'
            }}>
              <AlertCircleIcon size={64} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1a1a1a',
                marginBottom: '1rem'
              }}>
                {t('error')}
              </h2>
              <p>{error}</p>
              <button
                onClick={loadSubmittedQuotes}
                style={{
                  marginTop: '1rem',
                  padding: '0.75rem 1.5rem',
                  backgroundColor: theme.colors.primary[500],
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {t('retry')}
              </button>
            </div>
          ) : submittedQuotes.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: '#6b7280'
            }}>
              <CheckCircleIcon size={64} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1a1a1a',
                marginBottom: '1rem'
              }}>
                {t('contractorApp.quotes.noSubmittedQuotes')}
              </h2>
              <p>{t('contractorApp.quotes.noSubmittedQuotesMessage')}</p>
            </div>
          ) : (
            <div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '1.5rem',
                borderBottom: '1px solid #e5e7eb'
              }}>
                <h2 style={{
                  fontSize: '1.5rem',
                  fontWeight: '600',
                  color: '#1a1a1a',
                  margin: 0
                }}>
                  {t('contractorApp.quotes.submittedQuotes')} ({submittedQuotes.length})
                </h2>
                <button
                  onClick={loadSubmittedQuotes}
                  style={{
                    padding: '0.5rem',
                    backgroundColor: 'transparent',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}
                >
                  <RefreshCwIcon size={16} />
                  {t('refresh')}
                </button>
              </div>
              
              <div style={{
                maxHeight: 'calc(100vh - 350px)',
                overflowY: 'auto',
                padding: '1rem'
              }}>
                {submittedQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    style={{
                      backgroundColor: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '12px',
                      padding: '1.5rem',
                      marginBottom: '1rem',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <h3 style={{
                          fontSize: '1.125rem',
                          fontWeight: '600',
                          color: '#1a1a1a',
                          margin: '0 0 0.5rem 0'
                        }}>
                          {t('contractorApp.quotes.quotation')} #{quote.id.slice(0, 8)}
                        </h3>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.5rem'
                        }}>
                          <span
                            style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '9999px',
                              fontSize: '0.875rem',
                              fontWeight: '500',
                              backgroundColor: 
                                quote.admin_status === 'approved' ? '#dcfce7' :
                                quote.admin_status === 'rejected' ? '#fee2e2' :
                                quote.admin_status === 'revision_needed' ? '#fef3c7' : '#f3f4f6',
                              color:
                                quote.admin_status === 'approved' ? '#166534' :
                                quote.admin_status === 'rejected' ? '#dc2626' :
                                quote.admin_status === 'revision_needed' ? '#d97706' : '#6b7280'
                            }}
                          >
                            {quote.status_display || quote.admin_status}
                          </span>
                        </div>
                      </div>
                      
                      <div style={{ textAlign: isRTL ? 'left' : 'right' }}>
                        <div style={{
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          color: theme.colors.primary[600],
                          marginBottom: '0.25rem'
                        }}>
                          {quote.totals ? (
                            `${quote.totals.total_user_price?.toLocaleString()} ${t('currency.sar')}`
                          ) : (
                            `${quote.base_price?.toLocaleString()} ${t('currency.sar')}`
                          )}
                        </div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280'
                        }}>
                          {quote.solar_system_capacity_kwp || quote.request_system_size || 0} kWp
                        </div>
                      </div>
                    </div>
                    
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                      gap: '1rem',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <div style={{
                          fontSize: '0.875rem',
                          color: '#6b7280',
                          marginBottom: '0.25rem'
                        }}>
                          {t('contractorApp.quotes.submittedDate')}
                        </div>
                        <div style={{
                          fontWeight: '500',
                          color: '#1a1a1a'
                        }}>
                          {new Date(quote.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                        </div>
                      </div>
                      
                      {quote.installation_deadline && (
                        <div>
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            {t('contractorApp.quotes.installationDeadline')}
                          </div>
                          <div style={{
                            fontWeight: '500',
                            color: '#1a1a1a'
                          }}>
                            {new Date(quote.installation_deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      )}
                      
                      {quote.line_items && quote.line_items.length > 0 && (
                        <div>
                          <div style={{
                            fontSize: '0.875rem',
                            color: '#6b7280',
                            marginBottom: '0.25rem'
                          }}>
                            {t('contractorApp.quotes.lineItems')}
                          </div>
                          <div style={{
                            fontWeight: '500',
                            color: '#1a1a1a'
                          }}>
                            {quote.line_items.length} {t('contractorApp.quotes.items')}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {quote.location_address && (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        marginBottom: '1rem'
                      }}>
                        <MapPinIcon size={16} />
                        {quote.location_address}
                      </div>
                    )}
                    
                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      marginTop: '1rem'
                    }}>
                      <button
                        onClick={() => {
                          setSelectedQuotation(quote);
                          setShowQuotationDetails(true);
                        }}
                        style={{
                          padding: '0.5rem 1rem',
                          backgroundColor: theme.colors.primary[500],
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '0.875rem',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          transition: 'background-color 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = theme.colors.primary[600];
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = theme.colors.primary[500];
                        }}
                      >
                        <EyeIcon size={16} />
                        {t('contractorApp.quotes.viewDetails')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Detailed Quotation Form Modal */}
      {showQuotationForm && selectedRequest && (
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
            width: '95%',
            maxWidth: '1400px',
            maxHeight: '95vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
              color: 'white',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  Submit Detailed Quotation
                </h2>
                <p style={{ fontSize: '14px', opacity: 0.9 }}>
                  Request ID: {selectedRequest.request_id || selectedRequest.id}
                </p>
              </div>
              <button
                onClick={() => setShowQuotationForm(false)}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer'
                }}
              >
                <XCircleIcon size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                
                {/* Quotation Information */}
                <div style={{
                  backgroundColor: theme.colors.backgrounds.secondary,
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Quotation Information
                  </h3>
                  <div style={{ display: 'grid', grid: 'auto / 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                        VAT Number *
                      </label>
                      <input
                        type="text"
                        value={quotationData.contractor_vat_number}
                        onChange={(e) => setQuotationData(prev => ({ ...prev, contractor_vat_number: e.target.value }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: `2px solid ${theme.colors.borders.light}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          color: theme.colors.text.primary,
                          fontFamily: 'inherit',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = theme.colors.primary[500];
                          e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primary[500]}20`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = theme.colors.borders.light;
                          e.target.style.boxShadow = 'none';
                        }}
                        placeholder="Enter your VAT number"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                        Installation Deadline *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <input
                          type="text"
                          value={quotationData.installation_deadline ? new Date(quotationData.installation_deadline).toLocaleDateString('en-GB') : ''}
                          readOnly
                          onClick={() => setShowCalendar(!showCalendar)}
                          style={{
                            width: '100%',
                            padding: '10px 40px 10px 10px',
                            border: `2px solid ${theme.colors.borders.light}`,
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: 'white',
                            color: theme.colors.text.primary,
                            fontFamily: 'inherit',
                            outline: 'none',
                            transition: 'border-color 0.2s ease',
                            cursor: 'pointer'
                          }}
                          onFocus={(e) => {
                            e.target.style.borderColor = theme.colors.primary[500];
                            e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primary[500]}20`;
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = theme.colors.borders.light;
                            e.target.style.boxShadow = 'none';
                          }}
                          placeholder="Select installation deadline"
                        />
                        <CalendarIcon 
                          size={18} 
                          style={{
                            position: 'absolute',
                            right: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: theme.colors.primary[500],
                            cursor: 'pointer',
                            pointerEvents: 'auto'
                          }}
                          onClick={() => setShowCalendar(!showCalendar)}
                        />
                        
                        {/* Custom Calendar */}
                        {showCalendar && (
                          <CustomCalendar
                            selectedDate={quotationData.installation_deadline}
                            onDateSelect={(date) => {
                              setQuotationData(prev => ({ ...prev, installation_deadline: date }));
                            }}
                            onClose={() => setShowCalendar(false)}
                          />
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                        Payment Terms *
                      </label>
                      <select
                        value={quotationData.payment_terms}
                        onChange={(e) => setQuotationData(prev => ({ ...prev, payment_terms: e.target.value as 'wallet_credit' | 'bank_transfer' }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: `2px solid ${theme.colors.borders.light}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          color: theme.colors.text.primary,
                          fontFamily: 'inherit',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = theme.colors.primary[500];
                          e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primary[500]}20`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = theme.colors.borders.light;
                          e.target.style.boxShadow = 'none';
                        }}
                      >
                        <option value="wallet_credit">Wallet Credit</option>
                        <option value="bank_transfer">Bank Transfer</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Solar System Specifications */}
                <div style={{
                  backgroundColor: theme.colors.backgrounds.secondary,
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
                    Solar System Specifications
                  </h3>
                  <div style={{ display: 'grid', grid: 'auto / 1fr 1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                        System Capacity (kWp) *
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={quotationData.solar_system_capacity_kwp}
                        onChange={(e) => setQuotationData(prev => ({ ...prev, solar_system_capacity_kwp: parseFloat(e.target.value) || 0 }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: `2px solid ${theme.colors.borders.light}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          color: theme.colors.text.primary,
                          fontFamily: 'inherit',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = theme.colors.primary[500];
                          e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primary[500]}20`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = theme.colors.borders.light;
                          e.target.style.boxShadow = 'none';
                        }}
                        placeholder="e.g., 6.0"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                        Storage Capacity (kWh)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={quotationData.storage_capacity_kwh}
                        onChange={(e) => setQuotationData(prev => ({ ...prev, storage_capacity_kwh: parseFloat(e.target.value) || 0 }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: `2px solid ${theme.colors.borders.light}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          color: theme.colors.text.primary,
                          fontFamily: 'inherit',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = theme.colors.primary[500];
                          e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primary[500]}20`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = theme.colors.borders.light;
                          e.target.style.boxShadow = 'none';
                        }}
                        placeholder="e.g., 15.0"
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '14px', fontWeight: '600', marginBottom: '0.5rem', display: 'block' }}>
                        Monthly Production (kWh)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={quotationData.monthly_production_kwh}
                        onChange={(e) => setQuotationData(prev => ({ ...prev, monthly_production_kwh: parseFloat(e.target.value) || 0 }))}
                        style={{
                          width: '100%',
                          padding: '10px',
                          border: `2px solid ${theme.colors.borders.light}`,
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          color: theme.colors.text.primary,
                          fontFamily: 'inherit',
                          outline: 'none',
                          transition: 'border-color 0.2s ease'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = theme.colors.primary[500];
                          e.target.style.boxShadow = `0 0 0 3px ${theme.colors.primary[500]}20`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = theme.colors.borders.light;
                          e.target.style.boxShadow = 'none';
                        }}
                        placeholder="e.g., 1200"
                      />
                    </div>
                  </div>
                </div>

                {/* Line Items */}
                <div style={{
                  backgroundColor: theme.colors.backgrounds.secondary,
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600' }}>
                      Quotation Line Items
                    </h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={fillTestData}
                        style={{
                          backgroundColor: theme.colors.semantic.info.main,
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        🧪 Fill Test Data
                      </button>
                      <button
                        onClick={addLineItem}
                        style={{
                          backgroundColor: theme.colors.primary[500],
                          color: 'white',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          fontSize: '14px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                      >
                        + Add Item
                      </button>
                    </div>
                  </div>

                  {/* Comprehensive Pricing Transparency Table */}
                  <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
                    <table style={{ 
                      width: '100%', 
                      borderCollapse: 'collapse', 
                      fontSize: '14px',
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                    }}>
                      <thead>
                        <tr style={{ backgroundColor: theme.colors.primary[500], color: 'white' }}>
                          <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>S/N</th>
                          <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '700', fontSize: '14px' }}>Item</th>
                          <th style={{ padding: '16px 12px', textAlign: 'left', fontWeight: '700', fontSize: '14px' }}>Description</th>
                          <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>Qty</th>
                          <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>Unit Price (SAR)</th>
                          <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>Total Price (SAR)</th>
                          <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', fontSize: '14px', minWidth: '140px' }}>RABHAN Commission ({pricingConfig.commission_percent}%)</th>
                          <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', fontSize: '14px', minWidth: '140px' }}>RABHAN Overprice ({pricingConfig.overprice_percent}%)</th>
                          <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>User Price (SAR)</th>
                          <th style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', fontSize: '14px' }}>Vendor Net Price (SAR)</th>
                          <th style={{ padding: '16px 12px', textAlign: 'center', fontWeight: '700', fontSize: '14px' }}>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {quotationData.line_items.map((item, index) => {
                          const totals = calculateLineItemTotals(item);
                          return (
                            <tr key={index} style={{ 
                              borderBottom: `1px solid ${theme.colors.borders.light}`,
                              backgroundColor: index % 2 === 0 ? theme.colors.backgrounds.secondary : 'white'
                            }}>
                              <td style={{ padding: '14px 12px', textAlign: 'center', fontWeight: '600' }}>
                                {item.serial_number}
                              </td>
                              <td style={{ padding: '14px 12px' }}>
                                <input
                                  type="text"
                                  value={item.item_name}
                                  onChange={(e) => updateLineItem(index, 'item_name', e.target.value)}
                                  style={{
                                    width: '120px',
                                    padding: '6px 8px',
                                    border: `1px solid ${theme.colors.borders.light}`,
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    backgroundColor: 'white',
                                    color: theme.colors.text.primary,
                                    fontFamily: 'inherit',
                                    outline: 'none'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = theme.colors.primary.main;
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = theme.colors.borders.light;
                                  }}
                                  placeholder="Solar Panel"
                                />
                              </td>
                              <td style={{ padding: '14px 12px' }}>
                                <input
                                  type="text"
                                  value={item.description}
                                  onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                                  style={{
                                    width: '140px',
                                    padding: '6px 8px',
                                    border: `1px solid ${theme.colors.borders.light}`,
                                    borderRadius: '4px',
                                    fontSize: '13px',
                                    backgroundColor: 'white',
                                    color: theme.colors.text.primary,
                                    fontFamily: 'inherit',
                                    outline: 'none'
                                  }}
                                  onFocus={(e) => {
                                    e.target.style.borderColor = theme.colors.primary.main;
                                  }}
                                  onBlur={(e) => {
                                    e.target.style.borderColor = theme.colors.borders.light;
                                  }}
                                  placeholder="450W efficiency"
                                />
                              </td>
                              <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)}
                                  style={{
                                    width: '60px',
                                    padding: '8px',
                                    border: `1px solid ${theme.colors.borders.light}`,
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    backgroundColor: 'white',
                                    color: theme.colors.text.primary,
                                    textAlign: 'center'
                                  }}
                                  min="1"
                                />
                              </td>
                              <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                                <input
                                  type="number"
                                  step="0.01"
                                  value={item.unit_price}
                                  onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                                  style={{
                                    width: '100px',
                                    padding: '8px 10px',
                                    border: `1px solid ${theme.colors.borders.light}`,
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    backgroundColor: 'white',
                                    color: theme.colors.text.primary,
                                    textAlign: 'right'
                                  }}
                                  placeholder="0.00"
                                />
                              </td>
                              <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700', color: theme.colors.text.primary, fontSize: '14px' }}>
                                {totals.totalPrice.toFixed(2)}
                              </td>
                              <td style={{ 
                                padding: '14px 12px', 
                                textAlign: 'right', 
                                fontWeight: '600',
                                color: '#ff8c00',
                                fontSize: '14px'
                              }}>
                                -{totals.rabhanCommission.toFixed(2)}
                              </td>
                              <td style={{ 
                                padding: '14px 12px', 
                                textAlign: 'right', 
                                fontWeight: '600',
                                color: '#ff8c00',
                                fontSize: '14px'
                              }}>
                                +{totals.rabhanOverPrice.toFixed(2)}
                              </td>
                              <td style={{ 
                                padding: '14px 12px', 
                                textAlign: 'right', 
                                fontWeight: '700',
                                color: theme.colors.primary[600],
                                fontSize: '14px'
                              }}>
                                {totals.userPrice.toFixed(2)}
                              </td>
                              <td style={{ 
                                padding: '14px 12px', 
                                textAlign: 'right', 
                                fontWeight: '700',
                                color: theme.colors.primary[600],
                                fontSize: '14px'
                              }}>
                                {totals.vendorNetPrice.toFixed(2)}
                              </td>
                              <td style={{ padding: '14px 12px', textAlign: 'center' }}>
                                {quotationData.line_items.length > 1 && (
                                  <button
                                    onClick={() => removeLineItem(index)}
                                    style={{
                                      backgroundColor: theme.colors.semantic.error.main,
                                      color: 'white',
                                      border: 'none',
                                      padding: '4px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      cursor: 'pointer'
                                    }}
                                  >
                                    Remove
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        {(() => {
                          const grandTotals = calculateQuotationTotals();
                          return (
                            <tr style={{ 
                              backgroundColor: theme.colors.backgrounds.secondary,
                              fontWeight: '700',
                              fontSize: '15px',
                              borderTop: `2px solid ${theme.colors.primary[500]}`
                            }}>
                              <td colSpan={5} style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', color: theme.colors.text.primary }}>
                                TOTALS:
                              </td>
                              <td style={{ padding: '16px 12px', textAlign: 'right', fontWeight: '700', color: theme.colors.text.primary }}>
                                {grandTotals.totalPrice.toFixed(2)}
                              </td>
                              <td style={{ 
                                padding: '16px 12px', 
                                textAlign: 'right', 
                                fontWeight: '700',
                                color: '#ff8c00'
                              }}>
                                -{grandTotals.rabhanCommission.toFixed(2)}
                              </td>
                              <td style={{ 
                                padding: '16px 12px', 
                                textAlign: 'right', 
                                fontWeight: '700',
                                color: '#ff8c00'
                              }}>
                                +{grandTotals.rabhanOverPrice.toFixed(2)}
                              </td>
                              <td style={{ 
                                padding: '16px 12px', 
                                textAlign: 'right', 
                                fontWeight: '700',
                                color: theme.colors.primary[600]
                              }}>
                                {grandTotals.userPrice.toFixed(2)}
                              </td>
                              <td style={{ 
                                padding: '16px 12px', 
                                textAlign: 'right', 
                                fontWeight: '700',
                                color: theme.colors.primary[600]
                              }}>
                                {grandTotals.vendorNetPrice.toFixed(2)}
                              </td>
                              <td style={{ padding: '16px 12px' }}></td>
                            </tr>
                          );
                        })()}
                      </tfoot>
                    </table>
                  </div>

                  {/* Totals Summary - Contractor View with Commission and VAT */}
                  <div style={{
                    marginTop: '1rem',
                    padding: '1rem',
                    backgroundColor: '#f8fafc',
                    borderRadius: '8px'
                  }}>
                    {(() => {
                      const totals = calculateQuotationTotals();
                      const vatRate = pricingConfig.vat_rate / 100; // Dynamic VAT from config
                      const finalAmountBeforeVAT = totals.totalPrice - totals.rabhanCommission;
                      const vatAmount = finalAmountBeforeVAT * vatRate;
                      const finalAmountWithVAT = finalAmountBeforeVAT + vatAmount;
                      
                      return (
                        <div style={{ display: 'grid', gap: '0.75rem' }}>
                          {/* Subtotal */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            fontSize: '14px'
                          }}>
                            <span>Subtotal (Your Quote):</span>
                            <span style={{ fontWeight: '600' }}>{totals.totalPrice.toFixed(2)} SAR</span>
                          </div>
                          
                          {/* Rabhan Commission */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            fontSize: '14px',
                            color: theme.colors.semantic.warning.main
                          }}>
                            <span>Rabhan Commission (15%):</span>
                            <span style={{ fontWeight: '600' }}>-{totals.rabhanCommission.toFixed(2)} SAR</span>
                          </div>
                          
                          {/* Amount Before VAT */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            fontSize: '14px',
                            paddingTop: '0.5rem',
                            borderTop: `1px solid ${theme.colors.borders.light}`
                          }}>
                            <span>Amount Before VAT:</span>
                            <span style={{ fontWeight: '600' }}>{finalAmountBeforeVAT.toFixed(2)} SAR</span>
                          </div>
                          
                          {/* VAT */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            fontSize: '14px',
                            color: theme.colors.semantic.info.main
                          }}>
                            <span>VAT (15%):</span>
                            <span style={{ fontWeight: '600' }}>+{vatAmount.toFixed(2)} SAR</span>
                          </div>
                          
                          {/* Final Amount */}
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between',
                            fontSize: '18px',
                            fontWeight: '700',
                            color: theme.colors.primary[500],
                            paddingTop: '0.75rem',
                            borderTop: `2px solid ${theme.colors.primary[500]}`,
                            marginTop: '0.5rem'
                          }}>
                            <span>You Will Receive:</span>
                            <span>{finalAmountWithVAT.toFixed(2)} SAR</span>
                          </div>
                          
                          <div style={{ 
                            fontSize: '12px', 
                            color: theme.colors.text.secondary, 
                            marginTop: '0.5rem',
                            textAlign: 'center',
                            fontStyle: 'italic'
                          }}>
                            * This is your final payment after Rabhan commission and including VAT
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.5rem',
              borderTop: `1px solid ${theme.colors.borders.light}`,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                onClick={() => setShowQuotationForm(false)}
                style={{
                  backgroundColor: theme.colors.borders.light,
                  color: theme.colors.text.primary,
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={submitDetailedQuotation}
                disabled={isSubmittingQuotation}
                style={{
                  backgroundColor: theme.colors.primary[500],
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isSubmittingQuotation ? 'not-allowed' : 'pointer',
                  opacity: isSubmittingQuotation ? 0.7 : 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {isSubmittingQuotation ? <RefreshCwIcon size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <FileTextIcon size={16} />}
                {isSubmittingQuotation ? 'Submitting...' : 'Submit Quotation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quotation Details Modal */}
      {showQuotationDetails && selectedQuotation && (
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
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{
              background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
              color: 'white',
              padding: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                  {t('contractorApp.quotes.quotationDetails')}
                </h2>
                <p style={{ fontSize: '14px', opacity: 0.9 }}>
                  {t('contractorApp.quotes.quotation')} #{selectedQuotation.id.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowQuotationDetails(false);
                  setSelectedQuotation(null);
                }}
                style={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  borderRadius: '6px',
                  padding: '8px',
                  cursor: 'pointer'
                }}
              >
                <XCircleIcon size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ flex: 1, overflow: 'auto', padding: '1.5rem' }}>
              <div style={{ display: 'grid', gap: '1.5rem' }}>
                
                {/* Quotation Summary */}
                <div style={{
                  backgroundColor: theme.colors.backgrounds.secondary,
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
                    {t('contractorApp.quotes.quotationSummary')}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                        {t('contractorApp.quotes.status')}
                      </label>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '16px',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        backgroundColor: 
                          selectedQuotation.admin_status === 'approved' ? theme.colors.semantic.success.light :
                          selectedQuotation.admin_status === 'rejected' ? theme.colors.semantic.error.light :
                          selectedQuotation.admin_status === 'revision_needed' ? theme.colors.semantic.warning.light : 
                          theme.colors.backgrounds.secondary,
                        color:
                          selectedQuotation.admin_status === 'approved' ? theme.colors.semantic.success.dark :
                          selectedQuotation.admin_status === 'rejected' ? theme.colors.semantic.error.dark :
                          selectedQuotation.admin_status === 'revision_needed' ? theme.colors.semantic.warning.dark : 
                          theme.colors.text.secondary
                      }}>
                        {selectedQuotation.status_display || 
                         (selectedQuotation.admin_status === 'pending_review' ? 'Pending Review' :
                          selectedQuotation.admin_status === 'approved' ? 'Approved' :
                          selectedQuotation.admin_status === 'rejected' ? 'Rejected' :
                          selectedQuotation.admin_status === 'revision_needed' ? 'Revision Needed' :
                          selectedQuotation.admin_status)}
                      </span>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                        {t('contractorApp.quotes.totalPrice')}
                      </label>
                      <div style={{ fontSize: '1.125rem', fontWeight: '700', color: theme.colors.primary[600] }}>
                        {selectedQuotation.totals ? (
                          `${selectedQuotation.totals.total_user_price?.toLocaleString()} ${t('currency.sar')}`
                        ) : (
                          `${selectedQuotation.base_price?.toLocaleString()} ${t('currency.sar')}`
                        )}
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                        {t('contractorApp.quotes.systemCapacity')}
                      </label>
                      <div style={{ fontSize: '14px', color: theme.colors.text.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ZapIcon size={14} color={theme.colors.primary[500]} />
                        {selectedQuotation.solar_system_capacity_kwp || selectedQuotation.request_system_size || 0} kWp
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                        {t('contractorApp.quotes.submittedDate')}
                      </label>
                      <div style={{ fontSize: '14px', color: theme.colors.text.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CalendarIcon size={14} color={theme.colors.primary[500]} />
                        {new Date(selectedQuotation.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* System Specifications */}
                {(selectedQuotation.solar_system_capacity_kwp || selectedQuotation.storage_capacity_kwh || selectedQuotation.monthly_production_kwh) && (
                  <div style={{
                    backgroundColor: theme.colors.backgrounds.secondary,
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <ZapIcon size={18} color={theme.colors.primary[500]} />
                      {t('contractorApp.quotes.systemSpecifications')}
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                      {selectedQuotation.solar_system_capacity_kwp && (
                        <div>
                          <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                            {t('contractorApp.quotes.solarCapacity')}
                          </label>
                          <div style={{ fontSize: '14px', color: theme.colors.text.primary, fontWeight: '600' }}>
                            {selectedQuotation.solar_system_capacity_kwp} kWp
                          </div>
                        </div>
                      )}
                      {selectedQuotation.storage_capacity_kwh && (
                        <div>
                          <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                            {t('contractorApp.quotes.storageCapacity')}
                          </label>
                          <div style={{ fontSize: '14px', color: theme.colors.text.primary, fontWeight: '600' }}>
                            {selectedQuotation.storage_capacity_kwh} kWh
                          </div>
                        </div>
                      )}
                      {selectedQuotation.monthly_production_kwh && (
                        <div>
                          <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                            {t('contractorApp.quotes.monthlyProduction')}
                          </label>
                          <div style={{ fontSize: '14px', color: theme.colors.text.primary, fontWeight: '600' }}>
                            {selectedQuotation.monthly_production_kwh} kWh
                          </div>
                        </div>
                      )}
                      {selectedQuotation.installation_deadline && (
                        <div>
                          <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                            {t('contractorApp.quotes.installationDeadline')}
                          </label>
                          <div style={{ fontSize: '14px', color: theme.colors.text.primary, fontWeight: '600' }}>
                            {new Date(selectedQuotation.installation_deadline).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Line Items */}
                {selectedQuotation.line_items && selectedQuotation.line_items.length > 0 && (
                  <div style={{
                    backgroundColor: theme.colors.backgrounds.secondary,
                    borderRadius: '12px',
                    padding: '1.5rem'
                  }}>
                    <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <FileTextIcon size={18} color={theme.colors.primary[500]} />
                      {t('contractorApp.quotes.lineItems')} ({selectedQuotation.line_items.length})
                    </h3>
                    
                    <div style={{ overflowX: 'auto', marginBottom: '1rem' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#f8fafc' }}>
                            <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', borderBottom: `2px solid ${theme.colors.borders.light}` }}>
                              {t('contractorApp.quotes.serialNumber')}
                            </th>
                            <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', borderBottom: `2px solid ${theme.colors.borders.light}` }}>
                              {t('contractorApp.quotes.item')}
                            </th>
                            <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', borderBottom: `2px solid ${theme.colors.borders.light}` }}>
                              {t('contractorApp.quotes.description')}
                            </th>
                            <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', borderBottom: `2px solid ${theme.colors.borders.light}` }}>
                              {t('contractorApp.quotes.quantity')}
                            </th>
                            <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', borderBottom: `2px solid ${theme.colors.borders.light}` }}>
                              {t('contractorApp.quotes.unitPrice')}
                            </th>
                            <th style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600', borderBottom: `2px solid ${theme.colors.borders.light}` }}>
                              {t('contractorApp.quotes.totalPrice')}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedQuotation.line_items.map((item: any, index: number) => (
                            <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                              <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600' }}>
                                {item.serial_number || index + 1}
                              </td>
                              <td style={{ padding: '12px 8px', fontWeight: '600' }}>
                                {item.item_name}
                              </td>
                              <td style={{ padding: '12px 8px', color: theme.colors.text.secondary }}>
                                {item.description || '-'}
                              </td>
                              <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                                {item.units || item.quantity || 1}
                              </td>
                              <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '600' }}>
                                {item.unit_price?.toLocaleString() || '0'} {t('currency.sar')}
                              </td>
                              <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: '700', color: theme.colors.primary[600] }}>
                                {item.total_price?.toLocaleString() || item.user_price?.toLocaleString() || '0'} {t('currency.sar')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pricing Breakdown */}
                    {selectedQuotation.totals && (
                      <div style={{
                        backgroundColor: '#f8fafc',
                        borderRadius: '8px',
                        padding: '1rem',
                        marginTop: '1rem'
                      }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '0.75rem', color: theme.colors.text.primary }}>
                          {t('contractorApp.quotes.pricingBreakdown')}
                        </h4>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px' }}>
                            <span>Subtotal (Your Quote):</span>
                            <span style={{ fontWeight: '600' }}>
                              {selectedQuotation.totals.total_price?.toLocaleString() || selectedQuotation.base_price?.toLocaleString() || '0'} {t('currency.sar')}
                            </span>
                          </div>
                          
                          {selectedQuotation.totals.total_commission && (
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              fontSize: '14px',
                              color: theme.colors.semantic.warning.dark
                            }}>
                              <span>Rabhan Commission (15%):</span>
                              <span style={{ fontWeight: '600' }}>
                                -{selectedQuotation.totals.total_commission?.toLocaleString()} {t('currency.sar')}
                              </span>
                            </div>
                          )}
                          
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            fontSize: '14px',
                            color: theme.colors.text.primary
                          }}>
                            <span>Amount Before VAT:</span>
                            <span style={{ fontWeight: '600' }}>
                              {selectedQuotation.totals.total_vendor_net?.toLocaleString() || selectedQuotation.totals.total_vendor_net_price?.toLocaleString() || '0'} {t('currency.sar')}
                            </span>
                          </div>
                          
                          {selectedQuotation.totals.vat_amount && (
                            <div style={{ 
                              display: 'flex', 
                              justifyContent: 'space-between', 
                              fontSize: '14px',
                              color: theme.colors.semantic.success.dark
                            }}>
                              <span>VAT (15%):</span>
                              <span style={{ fontWeight: '600' }}>
                                +{selectedQuotation.totals.vat_amount?.toLocaleString()} {t('currency.sar')}
                              </span>
                            </div>
                          )}
                          
                          <div style={{ 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            fontSize: '16px',
                            fontWeight: '700',
                            color: theme.colors.semantic.success.dark,
                            paddingTop: '0.5rem',
                            borderTop: `2px solid ${theme.colors.semantic.success.dark}`,
                            marginTop: '0.5rem'
                          }}>
                            <span>You Will Receive:</span>
                            <span>
                              {selectedQuotation.totals.total_payable?.toLocaleString() || 
                               ((selectedQuotation.totals.total_vendor_net || 0) + (selectedQuotation.totals.vat_amount || 0))?.toLocaleString() || '0'} {t('currency.sar')}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Additional Information */}
                <div style={{
                  backgroundColor: theme.colors.backgrounds.secondary,
                  borderRadius: '12px',
                  padding: '1.5rem'
                }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
                    {t('contractorApp.quotes.additionalInformation')}
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                    {selectedQuotation.contractor_vat_number && (
                      <div>
                        <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                          {t('contractorApp.quotes.vatNumber')}
                        </label>
                        <div style={{ fontSize: '14px', color: theme.colors.text.primary, fontWeight: '600' }}>
                          {selectedQuotation.contractor_vat_number}
                        </div>
                      </div>
                    )}
                    {selectedQuotation.payment_terms && (
                      <div>
                        <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                          {t('contractorApp.quotes.paymentTerms')}
                        </label>
                        <div style={{ fontSize: '14px', color: theme.colors.text.primary, fontWeight: '600' }}>
                          {selectedQuotation.payment_terms === 'wallet_credit' ? 
                            t('contractorApp.quotes.walletCredit') : 
                            t('contractorApp.quotes.bankTransfer')
                          }
                        </div>
                      </div>
                    )}
                    {selectedQuotation.location_address && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <label style={{ fontSize: '12px', color: theme.colors.text.secondary, display: 'block', marginBottom: '4px' }}>
                          {t('contractorApp.quotes.location')}
                        </label>
                        <div style={{ fontSize: '14px', color: theme.colors.text.primary, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <MapPinIcon size={14} color={theme.colors.primary[500]} />
                          {selectedQuotation.location_address}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '1.5rem',
              borderTop: `1px solid ${theme.colors.borders.light}`,
              display: 'flex',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowQuotationDetails(false);
                  setSelectedQuotation(null);
                }}
                style={{
                  backgroundColor: theme.colors.primary[500],
                  color: 'white',
                  border: 'none',
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t('common.close')}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Click outside calendar to close */}
      {showCalendar && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
          onClick={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
};

export default ContractorQuotes;