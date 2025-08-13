import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { config } from '../../config/environment';
import { 
  XIcon, 
  CheckCircleIcon,
  BuildingIcon,
  CalendarIcon,
  PhoneIcon,
  MailIcon,
  StarIcon,
  ZapIcon,
  BatteryIcon,
  CalculatorIcon,
  ShoppingCartIcon,
  GitCompare,
  AlertCircleIcon,
  DollarSignIcon,
  TrendingUpIcon,
  ShieldCheckIcon
} from 'lucide-react';

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

interface ApprovedQuotation {
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
  admin_status: 'approved';
  is_selected: boolean;
  created_at: string;
  line_items: LineItem[];
  totals: QuotationTotals;
}

interface QuotationComparisonModalProps {
  isOpen: boolean;
  requestId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const QuotationComparisonModal: React.FC<QuotationComparisonModalProps> = ({
  isOpen,
  requestId,
  onClose,
  onSuccess
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [quotations, setQuotations] = useState<ApprovedQuotation[]>([]);
  const [selectedQuotationId, setSelectedQuotationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'comparison' | 'details'>('comparison');
  const [selectedForDetails, setSelectedForDetails] = useState<ApprovedQuotation | null>(null);

  // Fetch approved quotations
  useEffect(() => {
    if (isOpen && requestId) {
      fetchApprovedQuotations();
    }
  }, [isOpen, requestId]);

  const fetchApprovedQuotations = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${config.quoteServiceUrl}/user/request/${requestId}/approved-quotations`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rabhan_access_token')}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        setQuotations(data.data.quotations || []);
      } else {
        throw new Error(data.message || 'Failed to load quotations');
      }
    } catch (error: any) {
      console.error('Failed to load quotations:', error);
      setError(error.message || 'Failed to load quotations');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectQuotation = async (quotationId: string) => {
    setIsSelecting(true);
    setError(null);

    try {
      const response = await fetch(`${config.quoteServiceUrl}/user/select/${quotationId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rabhan_access_token')}`,
        },
        body: JSON.stringify({
          selection_reason: 'Selected after comparing all available quotations'
        })
      });

      const data = await response.json();

      if (data.success) {
        onSuccess();
        onClose();
      } else {
        throw new Error(data.message || 'Failed to select quotation');
      }
    } catch (error: any) {
      console.error('Failed to select quotation:', error);
      setError(error.message || 'Failed to select quotation');
    } finally {
      setIsSelecting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getBestValueQuotation = () => {
    if (quotations.length === 0) return null;
    return quotations.reduce((best, current) => 
      current.totals.total_user_price < best.totals.total_user_price ? current : best
    );
  };

  const getRecommendedQuotation = () => {
    if (quotations.length === 0) return null;
    // Simple recommendation based on best value and installation time
    const sortedByValue = [...quotations].sort((a, b) => a.totals.total_user_price - b.totals.total_user_price);
    const sortedByTime = [...quotations].sort((a, b) => new Date(a.installation_deadline).getTime() - new Date(b.installation_deadline).getTime());
    
    // Return the quotation that's in top 2 for both value and time
    return sortedByValue.find(q => sortedByTime.slice(0, 2).includes(q)) || sortedByValue[0];
  };

  const bestValue = getBestValueQuotation();
  const recommended = getRecommendedQuotation();

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '1rem',
      direction: isRTL ? 'rtl' : 'ltr'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        width: '98%',
        maxWidth: viewMode === 'details' ? '1000px' : '1400px',
        maxHeight: '95vh',
        overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.colors.primary[500]}, ${theme.colors.primary[600]})`,
          color: 'white',
          padding: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              {t('userApp.quotes.compareQuotations')}
            </h2>
            <p style={{ fontSize: '1rem', opacity: 0.9 }}>
              {quotations.length} {t('userApp.quotes.quotationsAvailable')}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '12px', padding: '4px' }}>
              <button
                onClick={() => setViewMode('comparison')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: viewMode === 'comparison' ? 'rgba(255,255,255,0.3)' : 'transparent',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <GitCompare size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />
                {t('userApp.quotes.comparison')}
              </button>
              <button
                onClick={() => setViewMode('details')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: viewMode === 'details' ? 'rgba(255,255,255,0.3)' : 'transparent',
                  color: 'white',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                <CalculatorIcon size={16} style={{ marginRight: '0.5rem', display: 'inline' }} />
                {t('userApp.quotes.details')}
              </button>
            </div>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white',
                borderRadius: '10px',
                padding: '0.75rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s'
              }}
            >
              <XIcon size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div style={{
          maxHeight: 'calc(95vh - 180px)',
          overflowY: 'auto',
          padding: viewMode === 'details' ? '1.5rem' : '2rem'
        }}>
          
          {isLoading ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: theme.colors.text.secondary }}>
              <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
              <p style={{ fontSize: '1.125rem', fontWeight: '600' }}>
                {t('common.loading')}
              </p>
            </div>
          ) : error ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem',
              backgroundColor: theme.colors.semantic.error.light,
              borderRadius: '12px',
              border: `2px solid ${theme.colors.semantic.error.main}`
            }}>
              <AlertCircleIcon size={48} style={{ color: theme.colors.semantic.error.main, marginBottom: '1rem' }} />
              <p style={{ color: theme.colors.semantic.error.dark, marginBottom: '1rem', fontSize: '1.125rem' }}>
                {error}
              </p>
              <button
                onClick={fetchApprovedQuotations}
                style={{
                  backgroundColor: theme.colors.semantic.error.main,
                  color: 'white',
                  border: 'none',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t('common.retry')}
              </button>
            </div>
          ) : quotations.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem', color: theme.colors.text.secondary }}>
              <GitCompare size={64} style={{ marginBottom: '1.5rem', opacity: 0.3 }} />
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1rem' }}>
                {t('userApp.quotes.noQuotationsAvailable')}
              </h3>
              <p style={{ fontSize: '1rem' }}>
                {t('userApp.quotes.waitForContractorQuotes')}
              </p>
            </div>
          ) : viewMode === 'comparison' ? (
            <div>
              {/* Quick Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1.5rem',
                marginBottom: '2rem'
              }}>
                <div style={{
                  background: `linear-gradient(135deg, ${theme.colors.semantic.success.light}, ${theme.colors.semantic.success.main})`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  color: 'white'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <TrendingUpIcon size={24} style={{ marginRight: '0.5rem' }} />
                    <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                      {t('userApp.quotes.bestValue')}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                    {bestValue ? formatCurrency(bestValue.totals.total_user_price) : '--'}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                    {bestValue?.contractor_company}
                  </div>
                </div>

                <div style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary[400]}, ${theme.colors.primary[600]})`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  color: 'white'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <ShieldCheckIcon size={24} style={{ marginRight: '0.5rem' }} />
                    <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                      {t('userApp.quotes.recommended')}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                    {recommended ? formatCurrency(recommended.totals.total_user_price) : '--'}
                  </div>
                  <div style={{ fontSize: '0.875rem', opacity: 0.9 }}>
                    {recommended?.contractor_company}
                  </div>
                </div>

                <div style={{
                  background: `linear-gradient(135deg, ${theme.colors.semantic.info.light}, ${theme.colors.semantic.info.main})`,
                  borderRadius: '16px',
                  padding: '1.5rem',
                  color: 'white'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <CalendarIcon size={24} style={{ marginRight: '0.5rem' }} />
                    <span style={{ fontSize: '1rem', fontWeight: '600' }}>
                      {t('userApp.quotes.fastestInstallation')}
                    </span>
                  </div>
                  <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>
                    {quotations.length > 0 ? Math.min(...quotations.map(q => 
                      Math.ceil((new Date(q.installation_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
                    )) : '--'} {t('userApp.quotes.days')}
                  </div>
                </div>
              </div>

              {/* Quotations Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: quotations.length === 1 ? '1fr' : quotations.length === 2 ? '1fr 1fr' : 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '2rem'
              }}>
                {quotations.map((quotation) => (
                  <div
                    key={quotation.id}
                    style={{
                      backgroundColor: 'white',
                      borderRadius: '20px',
                      border: `3px solid ${
                        quotation.id === bestValue?.id ? theme.colors.semantic.success.main :
                        quotation.id === recommended?.id ? theme.colors.primary[500] :
                        theme.colors.borders.light
                      }`,
                      padding: '2rem',
                      position: 'relative',
                      boxShadow: quotation.id === bestValue?.id || quotation.id === recommended?.id 
                        ? '0 8px 40px rgba(62, 178, 177, 0.15)' 
                        : '0 4px 20px rgba(0, 0, 0, 0.1)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setSelectedForDetails(quotation);
                      setViewMode('details');
                    }}
                  >
                    {/* Badge */}
                    {quotation.id === bestValue?.id && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '1.5rem',
                        backgroundColor: theme.colors.semantic.success.main,
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <StarIcon size={16} />
                        {t('userApp.quotes.bestValue')}
                      </div>
                    )}
                    
                    {quotation.id === recommended?.id && quotation.id !== bestValue?.id && (
                      <div style={{
                        position: 'absolute',
                        top: '-12px',
                        left: '1.5rem',
                        backgroundColor: theme.colors.primary[500],
                        color: 'white',
                        padding: '0.5rem 1rem',
                        borderRadius: '20px',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                      }}>
                        <ShieldCheckIcon size={16} />
                        {t('userApp.quotes.recommended')}
                      </div>
                    )}

                    {/* Contractor Info */}
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h3 style={{
                        fontSize: '1.5rem',
                        fontWeight: '700',
                        color: theme.colors.text.primary,
                        marginBottom: '0.5rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                      }}>
                        <BuildingIcon size={24} color={theme.colors.primary[500]} />
                        {quotation.contractor_company}
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem', color: theme.colors.text.secondary }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <MailIcon size={14} />
                          {quotation.contractor_email}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <PhoneIcon size={14} />
                          {quotation.contractor_phone}
                        </div>
                      </div>
                    </div>

                    {/* System Specs */}
                    <div style={{
                      backgroundColor: theme.colors.backgrounds.secondary,
                      borderRadius: '12px',
                      padding: '1rem',
                      marginBottom: '1.5rem'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
                        <div>
                          <ZapIcon size={20} color={theme.colors.semantic.warning.main} style={{ marginBottom: '0.25rem' }} />
                          <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{quotation.solar_system_capacity_kwp}</div>
                          <div style={{ fontSize: '0.75rem', color: theme.colors.text.secondary }}>kWp</div>
                        </div>
                        <div>
                          <BatteryIcon size={20} color={theme.colors.semantic.success.main} style={{ marginBottom: '0.25rem' }} />
                          <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>{quotation.storage_capacity_kwh}</div>
                          <div style={{ fontSize: '0.75rem', color: theme.colors.text.secondary }}>kWh</div>
                        </div>
                        <div>
                          <CalendarIcon size={20} color={theme.colors.primary[500] } style={{ marginBottom: '0.25rem' }} />
                          <div style={{ fontSize: '1.25rem', fontWeight: '700' }}>
                            {Math.ceil((new Date(quotation.installation_deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: theme.colors.text.secondary }}>days</div>
                        </div>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div style={{
                      textAlign: 'center',
                      marginBottom: '1.5rem'
                    }}>
                      <div style={{
                        fontSize: '2.5rem',
                        fontWeight: '700',
                        color: theme.colors.primary[600],
                        marginBottom: '0.25rem'
                      }}>
                        {formatCurrency(quotation.totals.total_user_price)}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: theme.colors.text.secondary }}>
                        {t('userApp.quotes.totalPrice')}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: theme.colors.text.secondary, marginTop: '0.25rem' }}>
                        {quotation.line_items.length} {t('userApp.quotes.lineItems')}
                      </div>
                    </div>

                    {/* Payment Terms */}
                    <div style={{
                      fontSize: '0.875rem',
                      color: theme.colors.text.secondary,
                      textAlign: 'center',
                      marginBottom: '1.5rem',
                      padding: '0.5rem',
                      backgroundColor: theme.colors.backgrounds.secondary,
                      borderRadius: '8px'
                    }}>
                      💳 {t('userApp.quotes.paymentTerms')}: {quotation.payment_terms.replace('_', ' ').toUpperCase()}
                    </div>

                    {/* Select Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedQuotationId(quotation.id);
                        handleSelectQuotation(quotation.id);
                      }}
                      disabled={isSelecting}
                      style={{
                        width: '100%',
                        backgroundColor: theme.colors.primary[500],
                        color: 'white',
                        border: 'none',
                        padding: '1rem',
                        borderRadius: '12px',
                        fontSize: '1rem',
                        fontWeight: '600',
                        cursor: isSelecting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        opacity: isSelecting && selectedQuotationId !== quotation.id ? 0.5 : 1,
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {isSelecting && selectedQuotationId === quotation.id ? (
                        <>
                          <div style={{
                            width: '16px',
                            height: '16px',
                            border: '2px solid transparent',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                          {t('common.selecting')}
                        </>
                      ) : (
                        <>
                          <CheckCircleIcon size={20} />
                          {t('userApp.quotes.selectThisQuote')}
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // Details View
            selectedForDetails && (
              <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                {/* Back Button */}
                <button
                  onClick={() => setViewMode('comparison')}
                  style={{
                    backgroundColor: theme.colors.backgrounds.secondary,
                    border: 'none',
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    marginBottom: '1.5rem',
                    cursor: 'pointer',
                    fontSize: '0.875rem'
                  }}
                >
                  ← {t('common.backToComparison')}
                </button>

                {/* Detailed Quotation Display */}
                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '16px',
                  border: `2px solid ${theme.colors.primary[200]}`,
                  overflow: 'hidden'
                }}>
                  {/* Header */}
                  <div style={{
                    backgroundColor: theme.colors.primary[500],
                    color: 'white',
                    padding: '1.5rem',
                    textAlign: 'center'
                  }}>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
                      {selectedForDetails.contractor_company}
                    </h3>
                    <p style={{ opacity: 0.9 }}>
                      {t('userApp.quotes.detailedQuotation')}
                    </p>
                  </div>

                  {/* Line Items Table */}
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ backgroundColor: theme.colors.backgrounds.secondary }}>
                          <th style={{ padding: '1rem 0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>
                            {t('userApp.quotes.item')}
                          </th>
                          <th style={{ padding: '1rem 0.75rem', textAlign: 'left', fontSize: '0.875rem', fontWeight: '600' }}>
                            {t('userApp.quotes.description')}
                          </th>
                          <th style={{ padding: '1rem 0.75rem', textAlign: 'center', fontSize: '0.875rem', fontWeight: '600' }}>
                            {t('userApp.quotes.quantity')}
                          </th>
                          <th style={{ padding: '1rem 0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>
                            {t('userApp.quotes.unitPrice')}
                          </th>
                          <th style={{ padding: '1rem 0.75rem', textAlign: 'right', fontSize: '0.875rem', fontWeight: '600' }}>
                            {t('userApp.quotes.totalPrice')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedForDetails.line_items.map((item, index) => (
                          <tr key={item.id} style={{ 
                            borderBottom: `1px solid ${theme.colors.borders.light}`,
                            backgroundColor: index % 2 === 0 ? 'white' : theme.colors.backgrounds.secondary
                          }}>
                            <td style={{ padding: '1rem 0.75rem', fontWeight: '600' }}>
                              {item.item_name}
                            </td>
                            <td style={{ padding: '1rem 0.75rem', fontSize: '0.875rem', color: theme.colors.text.secondary }}>
                              {item.description}
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'center', fontWeight: '600' }}>
                              {item.quantity}
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: '600' }}>
                              {formatCurrency(item.unit_price)}
                            </td>
                            <td style={{ padding: '1rem 0.75rem', textAlign: 'right', fontWeight: '700', fontSize: '1.125rem' }}>
                              {formatCurrency(item.user_price)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Totals */}
                  <div style={{
                    backgroundColor: theme.colors.primary[50],
                    padding: '1.5rem',
                    borderTop: `2px solid ${theme.colors.primary[200]}`
                  }}>
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: '1.5rem',
                      fontWeight: '700'
                    }}>
                      <span>{t('userApp.quotes.totalAmount')}:</span>
                      <span style={{ color: theme.colors.primary[600] }}>
                        {formatCurrency(selectedForDetails.totals.total_user_price)}
                      </span>
                    </div>
                    <div style={{
                      fontSize: '0.875rem',
                      color: theme.colors.text.secondary,
                      textAlign: 'right',
                      marginTop: '0.5rem'
                    }}>
                      {t('userApp.quotes.installationDeadline')}: {formatDate(selectedForDetails.installation_deadline)}
                    </div>
                  </div>

                  {/* Select Button */}
                  <div style={{ padding: '1.5rem' }}>
                    <button
                      onClick={() => {
                        setSelectedQuotationId(selectedForDetails.id);
                        handleSelectQuotation(selectedForDetails.id);
                      }}
                      disabled={isSelecting}
                      style={{
                        width: '100%',
                        backgroundColor: theme.colors.primary[500],
                        color: 'white',
                        border: 'none',
                        padding: '1rem',
                        borderRadius: '12px',
                        fontSize: '1.125rem',
                        fontWeight: '600',
                        cursor: isSelecting ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        opacity: isSelecting ? 0.7 : 1
                      }}
                    >
                      {isSelecting ? (
                        <>
                          <div style={{
                            width: '20px',
                            height: '20px',
                            border: '2px solid transparent',
                            borderTop: '2px solid white',
                            borderRadius: '50%',
                            animation: 'spin 1s linear infinite'
                          }} />
                          {t('common.selecting')}
                        </>
                      ) : (
                        <>
                          <ShoppingCartIcon size={20} />
                          {t('userApp.quotes.selectThisQuotation')}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default QuotationComparisonModal;