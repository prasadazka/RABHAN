import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { config } from '../../config/environment';
import { 
  XIcon, 
  PlusIcon, 
  MinusIcon,
  SaveIcon,
  CalculatorIcon,
  AlertCircleIcon,
  InfoIcon
} from 'lucide-react';

interface DetailedQuotationFormProps {
  isOpen: boolean;
  onClose: () => void;
  requestId: string;
  quotationId: string;
  requestDetails: {
    system_size_kwp: string;
    location_address: string;
    service_area: string;
  };
  onSuccess: () => void;
}

interface LineItem {
  serial_number: number;
  item_name: string;
  description: string;
  quantity: number;
  unit_price: number;
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

const DetailedQuotationForm: React.FC<DetailedQuotationFormProps> = ({
  isOpen,
  onClose,
  requestId,
  quotationId,
  requestDetails,
  onSuccess
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Form state
  const [formData, setFormData] = useState({
    contractor_vat_number: '',
    installation_deadline: '',
    payment_terms: 'wallet_credit' as 'wallet_credit' | 'bank_transfer',
    solar_system_capacity_kwp: parseFloat(requestDetails.system_size_kwp) || 0,
    storage_capacity_kwh: 0,
    monthly_production_kwh: 0,
  });

  // Line items with default Solar Panel, Inverter, Batteries, Other
  const [lineItems, setLineItems] = useState<LineItem[]>([
    {
      serial_number: 1,
      item_name: 'Solar Panel',
      description: '450W efficiency',
      quantity: 18,
      unit_price: 400
    },
    {
      serial_number: 2,
      item_name: 'Inverter',
      description: 'Hybrid - 10KW',
      quantity: 1,
      unit_price: 4500
    },
    {
      serial_number: 3,
      item_name: 'Batteries',
      description: 'LifePO4 - 15KWH',
      quantity: 1,
      unit_price: 9000
    },
    {
      serial_number: 4,
      item_name: 'Other',
      description: 'Stands & wires',
      quantity: 1,
      unit_price: 2000
    }
  ]);

  const [totals, setTotals] = useState<QuotationTotals>({
    total_price: 0,
    total_commission: 0,
    total_over_price: 0,
    total_user_price: 0,
    total_vendor_net: 0,
    vat_amount: 0,
    total_payable: 0
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate totals when line items change
  useEffect(() => {
    calculateTotals();
  }, [lineItems]);

  const calculateTotals = () => {
    const totalPrice = lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
    const totalCommission = totalPrice * 0.15; // 15% commission
    const totalOverPrice = totalPrice * 0.10; // 10% over-price
    const totalUserPrice = totalPrice + totalOverPrice;
    const totalVendorNet = totalPrice - totalCommission;
    const vatAmount = totalVendorNet * 0.15; // 15% VAT on vendor net
    const totalPayable = totalVendorNet + vatAmount;

    setTotals({
      total_price: totalPrice,
      total_commission: totalCommission,
      total_over_price: totalOverPrice,
      total_user_price: totalUserPrice,
      total_vendor_net: totalVendorNet,
      vat_amount: vatAmount,
      total_payable: totalPayable
    });
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleLineItemChange = (index: number, field: keyof LineItem, value: any) => {
    setLineItems(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const addLineItem = () => {
    const newItem: LineItem = {
      serial_number: lineItems.length + 1,
      item_name: '',
      description: '',
      quantity: 1,
      unit_price: 0
    };
    setLineItems(prev => [...prev, newItem]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(prev => prev.filter((_, i) => i !== index));
      // Renumber remaining items
      setLineItems(prev => prev.map((item, i) => ({ ...item, serial_number: i + 1 })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        quotation_id: quotationId,
        ...formData,
        line_items: lineItems
      };

      const response = await fetch(`${config.quoteServiceUrl}/contractor/submit-detailed-quotation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('rabhan_access_token')}`,
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Failed to submit quotation');
      }

      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Failed to submit detailed quotation:', error);
      setError(error.message || 'Failed to submit quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

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
      padding: '1rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        width: '95%',
        maxWidth: '1200px',
        maxHeight: '95vh',
        overflow: 'hidden',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: theme.colors.primary[500],
          color: 'white',
          padding: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '0.5rem' }}>
              {t('contractorApp.quotes.submitDetailedQuotation')}
            </h2>
            <p style={{ fontSize: '14px', opacity: 0.9 }}>
              {requestDetails.system_size_kwp} kWp - {requestDetails.service_area}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              padding: '8px',
              cursor: 'pointer'
            }}
          >
            <XIcon size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{
            maxHeight: 'calc(95vh - 200px)',
            overflowY: 'auto',
            padding: '1.5rem'
          }}>
            
            {/* Quote Information */}
            <div style={{
              backgroundColor: theme.colors.backgrounds.secondary,
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: theme.colors.text.primary,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <InfoIcon size={20} />
                {t('contractorApp.quotes.quoteInformation')}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: theme.colors.text.primary
                  }}>
                    {t('contractorApp.quotes.vatNumber')} *
                  </label>
                  <input
                    type="text"
                    value={formData.contractor_vat_number}
                    onChange={(e) => handleInputChange('contractor_vat_number', e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${theme.colors.borders.light}`,
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                    placeholder="300000000000000"
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: theme.colors.text.primary
                  }}>
                    {t('contractorApp.quotes.installationDeadline')} *
                  </label>
                  <input
                    type="date"
                    value={formData.installation_deadline}
                    onChange={(e) => handleInputChange('installation_deadline', e.target.value)}
                    required
                    min={new Date().toISOString().split('T')[0]}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${theme.colors.borders.light}`,
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: theme.colors.text.primary
                  }}>
                    {t('contractorApp.quotes.paymentTerms')}
                  </label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${theme.colors.borders.light}`,
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="wallet_credit">{t('contractorApp.quotes.walletCredit')}</option>
                    <option value="bank_transfer">{t('contractorApp.quotes.bankTransfer')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* System Specifications */}
            <div style={{
              backgroundColor: theme.colors.backgrounds.secondary,
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: theme.colors.text.primary
              }}>
                {t('contractorApp.quotes.systemSpecifications')}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: theme.colors.text.primary
                  }}>
                    {t('contractorApp.quotes.solarCapacity')} (kWp)
                  </label>
                  <input
                    type="number"
                    value={formData.solar_system_capacity_kwp}
                    onChange={(e) => handleInputChange('solar_system_capacity_kwp', parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${theme.colors.borders.light}`,
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: theme.colors.text.primary
                  }}>
                    {t('contractorApp.quotes.storageCapacity')} (kWh)
                  </label>
                  <input
                    type="number"
                    value={formData.storage_capacity_kwh}
                    onChange={(e) => handleInputChange('storage_capacity_kwh', parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${theme.colors.borders.light}`,
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    marginBottom: '0.5rem',
                    color: theme.colors.text.primary
                  }}>
                    {t('contractorApp.quotes.monthlyProduction')} (kWh)
                  </label>
                  <input
                    type="number"
                    value={formData.monthly_production_kwh}
                    onChange={(e) => handleInputChange('monthly_production_kwh', parseFloat(e.target.value) || 0)}
                    step="0.1"
                    min="0"
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: `1px solid ${theme.colors.borders.light}`,
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: `2px solid ${theme.colors.primary[200]}`,
              overflow: 'hidden',
              marginBottom: '1.5rem'
            }}>
              <div style={{
                backgroundColor: theme.colors.primary[500],
                color: 'white',
                padding: '1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '600' }}>
                  {t('contractorApp.quotes.quotationItems')}
                </h3>
                <button
                  type="button"
                  onClick={addLineItem}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: 'none',
                    color: 'white',
                    borderRadius: '6px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <PlusIcon size={16} />
                  {t('contractorApp.quotes.addItem')}
                </button>
              </div>
              
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ backgroundColor: theme.colors.backgrounds.secondary }}>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>S/N</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Item</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Description</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Qty</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Unit Price (SAR)</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'left', fontSize: '14px', fontWeight: '600' }}>Total (SAR)</th>
                      <th style={{ padding: '1rem 0.5rem', textAlign: 'center', fontSize: '14px', fontWeight: '600' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item, index) => (
                      <tr key={index} style={{ borderBottom: `1px solid ${theme.colors.borders.light}` }}>
                        <td style={{ padding: '1rem 0.5rem', fontSize: '14px', fontWeight: '600' }}>
                          {item.serial_number}
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <input
                            type="text"
                            value={item.item_name}
                            onChange={(e) => handleLineItemChange(index, 'item_name', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: `1px solid ${theme.colors.borders.light}`,
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                            placeholder="Solar Panel"
                          />
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => handleLineItemChange(index, 'description', e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem',
                              border: `1px solid ${theme.colors.borders.light}`,
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                            placeholder="450W efficiency"
                          />
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleLineItemChange(index, 'quantity', parseInt(e.target.value) || 0)}
                            min="0"
                            style={{
                              width: '80px',
                              padding: '0.5rem',
                              border: `1px solid ${theme.colors.borders.light}`,
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '1rem 0.5rem' }}>
                          <input
                            type="number"
                            value={item.unit_price}
                            onChange={(e) => handleLineItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)}
                            step="0.01"
                            min="0"
                            style={{
                              width: '120px',
                              padding: '0.5rem',
                              border: `1px solid ${theme.colors.borders.light}`,
                              borderRadius: '4px',
                              fontSize: '14px'
                            }}
                          />
                        </td>
                        <td style={{ padding: '1rem 0.5rem', fontSize: '14px', fontWeight: '600' }}>
                          {formatCurrency(item.quantity * item.unit_price)}
                        </td>
                        <td style={{ padding: '1rem 0.5rem', textAlign: 'center' }}>
                          <button
                            type="button"
                            onClick={() => removeLineItem(index)}
                            disabled={lineItems.length <= 1}
                            style={{
                              backgroundColor: lineItems.length > 1 ? theme.colors.semantic.error.main : theme.colors.text.disabled,
                              border: 'none',
                              color: 'white',
                              borderRadius: '4px',
                              padding: '4px',
                              cursor: lineItems.length > 1 ? 'pointer' : 'not-allowed'
                            }}
                          >
                            <MinusIcon size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pricing Summary */}
            <div style={{
              backgroundColor: theme.colors.primary[50],
              borderRadius: '12px',
              border: `2px solid ${theme.colors.primary[200]}`,
              padding: '1.5rem',
              marginBottom: '1rem'
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                marginBottom: '1rem',
                color: theme.colors.primary[600],
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CalculatorIcon size={20} />
                {t('contractorApp.quotes.quotationSummary')}
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
                <div style={{ 
                  backgroundColor: 'white', 
                  borderRadius: '8px', 
                  padding: '1rem',
                  border: `2px solid ${theme.colors.primary[200]}`
                }}>
                  <label style={{ fontSize: '14px', color: theme.colors.text.secondary, marginBottom: '0.5rem', display: 'block' }}>
                    {t('contractorApp.quotes.quotedPrice')}
                  </label>
                  <div style={{ fontSize: '20px', fontWeight: '700', color: theme.colors.primary[600] }}>
                    {formatCurrency(totals.total_price)}
                  </div>
                  <div style={{ fontSize: '12px', color: theme.colors.text.secondary, marginTop: '0.25rem' }}>
                    {t('contractorApp.quotes.baseQuotationAmount')}
                  </div>
                </div>
                
                <div style={{ 
                  backgroundColor: theme.colors.semantic.success.light, 
                  borderRadius: '8px', 
                  padding: '1rem',
                  border: `2px solid ${theme.colors.semantic.success.main}`
                }}>
                  <label style={{ fontSize: '14px', color: theme.colors.semantic.success.dark, marginBottom: '0.5rem', display: 'block' }}>
                    {t('contractorApp.quotes.youReceive')}
                  </label>
                  <div style={{ fontSize: '22px', fontWeight: '700', color: theme.colors.semantic.success.dark }}>
                    {formatCurrency(totals.total_payable)}
                  </div>
                  <div style={{ fontSize: '12px', color: theme.colors.semantic.success.dark, marginTop: '0.25rem' }}>
                    {t('contractorApp.quotes.afterProcessingFees')}
                  </div>
                </div>
              </div>
              
              <div style={{
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: theme.colors.semantic.info.light,
                borderRadius: '8px',
                border: `1px solid ${theme.colors.semantic.info.main}`,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <InfoIcon size={16} color={theme.colors.semantic.info.main} />
                <span style={{ fontSize: '13px', color: theme.colors.semantic.info.dark }}>
                  {t('contractorApp.quotes.pricingNote')}
                </span>
              </div>
            </div>

            {error && (
              <div style={{
                backgroundColor: theme.colors.semantic.error.light,
                border: `2px solid ${theme.colors.semantic.error.main}`,
                borderRadius: '8px',
                padding: '1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: theme.colors.semantic.error.dark
              }}>
                <AlertCircleIcon size={20} />
                <span style={{ fontSize: '14px' }}>{error}</span>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '1.5rem',
            borderTop: `1px solid ${theme.colors.borders.light}`,
            backgroundColor: theme.colors.backgrounds.secondary,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ fontSize: '14px', color: theme.colors.text.secondary }}>
              {t('contractorApp.quotes.quotationWillBeReviewed')}
            </div>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                style={{
                  backgroundColor: 'transparent',
                  border: `2px solid ${theme.colors.borders.light}`,
                  color: theme.colors.text.secondary,
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                style={{
                  backgroundColor: theme.colors.primary[500],
                  border: 'none',
                  color: 'white',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                <SaveIcon size={16} />
                {isSubmitting ? t('common.submitting') : t('contractorApp.quotes.submitQuotation')}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DetailedQuotationForm;