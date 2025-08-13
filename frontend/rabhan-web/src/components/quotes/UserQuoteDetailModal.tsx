import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  FileText, 
  CheckCircle, 
  Clock, 
  Calendar, 
  Zap, 
  Shield, 
  Building,
  Award,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';

interface UserQuoteDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  quote: any;
  request?: any; // Add request data to get system capacity
  onSelectQuote?: (quoteId: string) => void;
}

export const UserQuoteDetailModal: React.FC<UserQuoteDetailModalProps> = ({
  isOpen,
  onClose,
  quote,
  request,
  onSelectQuote
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  if (!isOpen || !quote) return null;

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString(isRTL ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Calculate user-facing pricing (hide commission details)
  const basePrice = parseFloat(quote.base_price?.toString() || '0');
  const totalUserPrice = parseFloat(quote.total_user_price?.toString() || '0');
  // Use quote system capacity if available, otherwise fallback to request system size
  const systemCapacity = parseFloat(quote.solar_system_capacity_kwp || request?.system_size_kwp || '0');
  const storageCapacity = parseFloat(quote.storage_capacity_kwh || '0');

  // Create simplified itemized breakdown for users (no commissions shown)
  const items = [
    {
      sn: 1,
      item: "Solar Panels",
      description: "450W efficiency monocrystalline",
      qty: Math.ceil(systemCapacity * 1000 / 450),
      unitPrice: Math.round(totalUserPrice * 0.28 / Math.ceil(systemCapacity * 1000 / 450)),
    },
    {
      sn: 2,
      item: "Inverter",
      description: `Hybrid - ${Math.ceil(systemCapacity)}KW`,
      qty: 1,
      unitPrice: Math.round(totalUserPrice * 0.18),
    },
    {
      sn: 3,
      item: "Batteries",
      description: `LifePO4 - ${storageCapacity}KWH`,
      qty: 1,
      unitPrice: Math.round(totalUserPrice * 0.35),
    },
    {
      sn: 4,
      item: "Installation",
      description: "Mounting, wiring & commissioning",
      qty: 1,
      unitPrice: Math.round(totalUserPrice * 0.19),
    }
  ];

  // Adjust last item to match exact total
  const calculatedTotal = items.reduce((sum, item) => sum + (item.qty * item.unitPrice), 0);
  const difference = totalUserPrice - calculatedTotal;
  if (difference !== 0) {
    items[items.length - 1].unitPrice += difference;
  }

  return (
    <div 
      style={{
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
        padding: '20px',
        direction: isRTL ? 'rtl' : 'ltr'
      }}
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
          width: '95%',
          maxWidth: '1200px',
          maxHeight: '90vh',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
          color: 'white',
          padding: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h2 style={{
              fontSize: '1.75rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <FileText size={28} />
              {t('quotes.detailedQuotation')}
            </h2>
            <p style={{ opacity: 0.9, fontSize: '14px' }}>
              {quote.contractor_name || 'Solar Provider'} - {formatDate(quote.created_at)}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              border: 'none',
              color: 'white',
              borderRadius: '8px',
              padding: '12px',
              cursor: 'pointer',
              transition: theme.transitions.normal
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div style={{
          maxHeight: 'calc(90vh - 140px)',
          overflowY: 'auto',
          padding: '2rem'
        }}>
          {/* Quote Status */}
          <div style={{
            backgroundColor: quote.admin_status === 'approved' ? '#f0f9ff' : '#fef3c7',
            border: `2px solid ${quote.admin_status === 'approved' ? theme.colors.semantic.success.main : theme.colors.semantic.warning.main}`,
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            {quote.admin_status === 'approved' ? (
              <CheckCircle size={24} color={theme.colors.semantic.success.main} />
            ) : (
              <Clock size={24} color={theme.colors.semantic.warning.main} />
            )}
            <div>
              <h3 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: quote.admin_status === 'approved' ? theme.colors.semantic.success.dark : theme.colors.semantic.warning.dark,
                marginBottom: '0.25rem'
              }}>
                {quote.admin_status === 'approved' ? t('quotes.status.approved') : t('quotes.status.pendingReview')}
              </h3>
              <p style={{
                fontSize: '14px',
                color: quote.admin_status === 'approved' ? theme.colors.semantic.success.main : theme.colors.semantic.warning.main,
                margin: 0
              }}>
                {quote.admin_status === 'approved' 
                  ? t('quotes.readyForSelection') 
                  : t('quotes.underAdminReview')
                }
              </p>
            </div>
          </div>

          {/* Quote Summary */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              backgroundColor: theme.colors.backgrounds.secondary,
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <Zap size={32} color={theme.colors.primary[500]} style={{ marginBottom: '0.5rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: theme.colors.text.primary, marginBottom: '0.5rem' }}>
                {t('quotes.systemCapacity')}
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: theme.colors.primary[600], margin: 0 }}>
                {systemCapacity} kWp
              </p>
            </div>

            <div style={{
              backgroundColor: theme.colors.backgrounds.secondary,
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <Building size={32} color={theme.colors.primary[500]} style={{ marginBottom: '0.5rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: theme.colors.text.primary, marginBottom: '0.5rem' }}>
                {t('quotes.totalPrice')}
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: theme.colors.primary[600], margin: 0 }}>
                SAR {(totalUserPrice * 1.15).toLocaleString()}
              </p>
              <p style={{ fontSize: '14px', color: theme.colors.text.secondary, margin: 0 }}>
                {t('quotes.includingVAT')}
              </p>
            </div>

            <div style={{
              backgroundColor: theme.colors.backgrounds.secondary,
              borderRadius: '12px',
              padding: '1.5rem',
              textAlign: 'center'
            }}>
              <Calendar size={32} color={theme.colors.primary[500]} style={{ marginBottom: '0.5rem' }} />
              <h3 style={{ fontSize: '1.1rem', fontWeight: '600', color: theme.colors.text.primary, marginBottom: '0.5rem' }}>
                {t('quotes.installationTime')}
              </h3>
              <p style={{ fontSize: '2rem', fontWeight: '700', color: theme.colors.primary[600], margin: 0 }}>
                {quote.installation_timeline_days}
              </p>
              <p style={{ fontSize: '14px', color: theme.colors.text.secondary, margin: 0 }}>
                {t('quotes.days')}
              </p>
            </div>
          </div>

          {/* Itemized Breakdown */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{
              fontSize: '1.3rem',
              fontWeight: '700',
              color: theme.colors.text.primary,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FileText size={20} />
              {t('quotes.itemizedBreakdown')}
            </h3>

            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
              border: `2px solid ${theme.colors.borders.light}`
            }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ backgroundColor: theme.colors.primary[500], color: 'white' }}>
                    <tr>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Item</th>
                      <th style={{ padding: '1rem', textAlign: 'left', fontWeight: '600' }}>Description</th>
                      <th style={{ padding: '1rem', textAlign: 'center', fontWeight: '600' }}>Qty</th>
                      <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Unit Price</th>
                      <th style={{ padding: '1rem', textAlign: 'right', fontWeight: '600' }}>Total Price</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => {
                      const totalPrice = item.qty * item.unitPrice;
                      return (
                        <tr key={item.sn} style={{ borderBottom: `1px solid ${theme.colors.borders.light}` }}>
                          <td style={{ padding: '1rem', fontWeight: '500', color: theme.colors.text.primary }}>
                            {item.item}
                          </td>
                          <td style={{ padding: '1rem', color: theme.colors.text.secondary }}>
                            {item.description}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'center', fontFamily: 'monospace' }}>
                            {item.qty}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace' }}>
                            SAR {item.unitPrice.toLocaleString()}
                          </td>
                          <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: '600' }}>
                            SAR {totalPrice.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                    
                    {/* Subtotal */}
                    <tr style={{ backgroundColor: theme.colors.backgrounds.secondary, borderTop: `2px solid ${theme.colors.borders.medium}` }}>
                      <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: theme.colors.text.primary }}>
                        {t('quotes.subtotal')}:
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', fontSize: '1.1rem' }}>
                        SAR {totalUserPrice.toLocaleString()}
                      </td>
                    </tr>
                    
                    {/* Subtotal Excluding VAT */}
                    <tr style={{ backgroundColor: theme.colors.backgrounds.secondary, borderTop: `2px solid ${theme.colors.borders.medium}` }}>
                      <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: theme.colors.text.primary }}>
                        {t('quotes.totalAmount')} ({t('quotes.excludingVAT')}):
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', fontSize: '1.1rem' }}>
                        SAR {totalUserPrice.toLocaleString()}
                      </td>
                    </tr>
                    
                    {/* VAT */}
                    <tr style={{ backgroundColor: theme.colors.backgrounds.secondary }}>
                      <td colSpan={4} style={{ padding: '1rem', textAlign: 'right', fontWeight: '600', color: theme.colors.text.primary }}>
                        {t('quotes.vat')} (15%):
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: '600', color: theme.colors.text.secondary }}>
                        SAR {(totalUserPrice * 0.15).toLocaleString()}
                      </td>
                    </tr>
                    
                    {/* Total Including VAT */}
                    <tr style={{ backgroundColor: theme.colors.primary[50], borderTop: `2px solid ${theme.colors.primary[500]}` }}>
                      <td colSpan={4} style={{ padding: '1.25rem', textAlign: 'right', fontWeight: '700', fontSize: '1.2rem', color: theme.colors.primary[700] }}>
                        {t('quotes.totalAmount')} ({t('quotes.includingVAT')}):
                      </td>
                      <td style={{ padding: '1.25rem', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', fontSize: '1.3rem', color: theme.colors.primary[700] }}>
                        SAR {(totalUserPrice * 1.15).toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* System Specifications */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            <div style={{
              backgroundColor: theme.colors.backgrounds.secondary,
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <h4 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: theme.colors.text.primary,
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Zap size={18} />
                {t('quotes.systemSpecs')}
              </h4>
              <div style={{ display: 'grid', gap: '0.75rem', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.colors.text.secondary }}>{t('quotes.systemCapacity')}:</span>
                  <span style={{ fontWeight: '500', color: theme.colors.text.primary }}>{systemCapacity} kWp</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.colors.text.secondary }}>{t('quotes.storageCapacity')}:</span>
                  <span style={{ fontWeight: '500', color: theme.colors.text.primary }}>{storageCapacity} kWh</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.colors.text.secondary }}>{t('quotes.monthlyProduction')}:</span>
                  <span style={{ fontWeight: '500', color: theme.colors.text.primary }}>{quote.monthly_production_kwh} kWh</span>
                </div>
              </div>
            </div>

            <div style={{
              backgroundColor: theme.colors.backgrounds.secondary,
              borderRadius: '12px',
              padding: '1.5rem'
            }}>
              <h4 style={{
                fontSize: '1.1rem',
                fontWeight: '600',
                color: theme.colors.text.primary,
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Shield size={18} />
                {t('quotes.warranty')}
              </h4>
              <div style={{ display: 'grid', gap: '0.75rem', fontSize: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.colors.text.secondary }}>{t('quotes.equipment')}:</span>
                  <span style={{ fontWeight: '500', color: theme.colors.text.primary }}>25 {t('quotes.years')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.colors.text.secondary }}>{t('quotes.performance')}:</span>
                  <span style={{ fontWeight: '500', color: theme.colors.text.primary }}>25 {t('quotes.years')}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.colors.text.secondary }}>{t('quotes.installation')}:</span>
                  <span style={{ fontWeight: '500', color: theme.colors.text.primary }}>10 {t('quotes.years')}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Provider Information */}
          <div style={{
            backgroundColor: theme.colors.backgrounds.secondary,
            borderRadius: '12px',
            padding: '1.5rem',
            marginBottom: '2rem'
          }}>
            <h4 style={{
              fontSize: '1.1rem',
              fontWeight: '600',
              color: theme.colors.text.primary,
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Award size={18} />
              {t('quotes.providerInfo')}
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              <div>
                <h5 style={{ fontWeight: '600', color: theme.colors.text.primary, marginBottom: '0.5rem' }}>
                  {quote.contractor_name || 'Solar Provider'}
                </h5>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: theme.colors.text.secondary, marginBottom: '0.25rem' }}>
                  <Mail size={14} />
                  {quote.contractor_email || 'contact@provider.com'}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: theme.colors.text.secondary }}>
                  <Phone size={14} />
                  {quote.contractor_phone || '+966 XX XXX XXXX'}
                </div>
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <span style={{ color: theme.colors.text.secondary, fontSize: '14px' }}>{t('quotes.quoteValidUntil')}:</span>
                  <span style={{ fontWeight: '500', color: theme.colors.text.primary, fontSize: '14px' }}>
                    {formatDate(quote.expires_at)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: theme.colors.text.secondary, fontSize: '14px' }}>{t('quotes.installationDeadline')}:</span>
                  <span style={{ fontWeight: '500', color: theme.colors.text.primary, fontSize: '14px' }}>
                    {formatDate(quote.installation_deadline)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '1rem',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                color: theme.colors.text.secondary,
                border: `2px solid ${theme.colors.borders.medium}`,
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: theme.transitions.normal
              }}
            >
              {t('common.close')}
            </button>
            
            {quote.admin_status === 'approved' && onSelectQuote && (
              <button
                onClick={() => onSelectQuote(quote.id)}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle size={16} />
                {t('quotes.selectThisQuote')}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};