import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { quoteService, QuoteRequest } from '../../services/quote.service';
import { ContractorProfile } from '../../services/contractor.service';
import { CalendarIcon, MapPinIcon, PhoneIcon, HomeIcon } from 'lucide-react';
import { ThemedDatePicker } from './ThemedDatePicker';

interface QuoteRequestFormProps {
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
  initialData?: Partial<FormData>;
  selectedContractors?: ContractorProfile[];
  inspectionSchedules?: { [key: string]: Date };
  showContractorSummary?: boolean;
  onSuccess?: (requestId: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface FormData {
  system_size_kwp: number;
  location_address: string;
  service_area: string;
  preferred_installation_date: string;
  contact_phone: string;
  notes: string;
  property_details: {
    property_type: string;
    roof_type: string;
    roof_orientation: string;
    shading_issues: boolean;
  };
}


export const QuoteRequestForm: React.FC<QuoteRequestFormProps> = ({
  user,
  initialData,
  selectedContractors = [],
  inspectionSchedules = {},
  showContractorSummary = true,
  onSuccess,
  onCancel,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  // Responsive state
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Translated dropdown options
  const serviceAreas = [
    { value: 'riyadh', label: t('quotes.form.serviceArea.options.riyadh', 'Riyadh') },
    { value: 'jeddah', label: t('quotes.form.serviceArea.options.jeddah', 'Jeddah') },
    { value: 'dammam', label: t('quotes.form.serviceArea.options.dammam', 'Dammam') },
    { value: 'mecca', label: t('quotes.form.serviceArea.options.mecca', 'Mecca') },
    { value: 'medina', label: t('quotes.form.serviceArea.options.medina', 'Medina') },
  ];

  const propertyTypes = [
    { value: 'villa', label: t('quotes.form.propertyDetails.propertyTypes.villa', 'Villa') },
    { value: 'apartment', label: t('quotes.form.propertyDetails.propertyTypes.apartment', 'Apartment') },
    { value: 'townhouse', label: t('quotes.form.propertyDetails.propertyTypes.townhouse', 'Townhouse') },
    { value: 'commercial', label: t('quotes.form.propertyDetails.propertyTypes.commercial', 'Commercial') },
  ];

  const roofTypes = [
    { value: 'flat', label: t('quotes.form.propertyDetails.roofTypes.flat', 'Flat Roof') },
    { value: 'sloped', label: t('quotes.form.propertyDetails.roofTypes.sloped', 'Sloped Roof') },
    { value: 'mixed', label: t('quotes.form.propertyDetails.roofTypes.mixed', 'Mixed') },
  ];

  const roofOrientations = [
    { value: 'south', label: t('quotes.form.propertyDetails.roofOrientations.south', 'South') },
    { value: 'southwest', label: t('quotes.form.propertyDetails.roofOrientations.southwest', 'Southwest') },
    { value: 'southeast', label: t('quotes.form.propertyDetails.roofOrientations.southeast', 'Southeast') },
    { value: 'east', label: t('quotes.form.propertyDetails.roofOrientations.east', 'East') },
    { value: 'west', label: t('quotes.form.propertyDetails.roofOrientations.west', 'West') },
    { value: 'mixed', label: t('quotes.form.propertyDetails.roofOrientations.mixed', 'Multiple Directions') },
  ];

  const [formData, setFormData] = useState<FormData>({
    system_size_kwp: initialData?.system_size_kwp || 6,
    location_address: initialData?.location_address || 
      (user.street_address 
        ? `${user.street_address}, ${user.district || ''}, ${user.city || ''}, ${user.region || ''}`.replace(/,\s*,/g, ',').replace(/^,|,$/g, '')
        : ''),
    service_area: initialData?.service_area || user.region?.toLowerCase() || 'riyadh',
    preferred_installation_date: initialData?.preferred_installation_date || '',
    contact_phone: initialData?.contact_phone || user.phone || '',
    notes: initialData?.notes || '',
    property_details: {
      property_type: initialData?.property_details?.property_type || user.property_type || 'villa',
      roof_type: initialData?.property_details?.roof_type || 'flat',
      roof_orientation: initialData?.property_details?.roof_orientation || 'south',
      shading_issues: initialData?.property_details?.shading_issues || false
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Set minimum date to tomorrow
  useEffect(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];
    
    if (!formData.preferred_installation_date) {
      setFormData(prev => ({
        ...prev,
        preferred_installation_date: minDate
      }));
    }
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.system_size_kwp < 1 || formData.system_size_kwp > 50) {
      newErrors.system_size_kwp = t('quotes.form.errors.systemSizeRange');
    }

    if (!formData.location_address.trim()) {
      newErrors.location_address = t('quotes.form.errors.locationRequired');
    }

    if (!formData.service_area) {
      newErrors.service_area = t('quotes.form.errors.serviceAreaRequired');
    }

    if (!formData.preferred_installation_date) {
      newErrors.preferred_installation_date = t('quotes.form.errors.dateRequired');
    } else {
      const selectedDate = new Date(formData.preferred_installation_date);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (selectedDate < tomorrow) {
        newErrors.preferred_installation_date = t('quotes.form.errors.dateInFuture');
      }
    }

    if (!formData.contact_phone.trim()) {
      newErrors.contact_phone = t('quotes.form.errors.phoneRequired');
    } else if (formData.contact_phone.replace(/[\s-]/g, '').length > 13) {
      newErrors.contact_phone = t('quotes.form.errors.phoneTooLong');
    } else if (!/^(\+966|0)[5-9]\d{8}$/.test(formData.contact_phone.replace(/\s/g, ''))) {
      newErrors.contact_phone = t('quotes.form.errors.phoneInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');

    try {
      const requestData: QuoteRequest = {
        system_size_kwp: formData.system_size_kwp,
        location_address: formData.location_address,
        service_area: formData.service_area,
        preferred_installation_date: formData.preferred_installation_date,
        contact_phone: formData.contact_phone,
        notes: formData.notes || undefined,
        property_details: formData.property_details,
        selected_contractors: selectedContractors.map(c => c.id),
        inspection_schedules: inspectionSchedules
      };

      const response = await quoteService.submitQuoteRequest(requestData);

      if (response.success) {
        setSubmitStatus('success');
        if (onSuccess && response.data?.id) {
          onSuccess(response.data.id);
        }
      } else {
        throw new Error(response.error || 'Failed to submit quote request');
      }
    } catch (error: any) {
      console.error('Quote request submission error:', error);
      setSubmitStatus('error');
      
      // Extract error message properly
      let errorMessage = t('quotes.form.errors.submitFailed');
      if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message && typeof error.message === 'string') {
        errorMessage = error.message;
      } else if (error?.error && typeof error.error === 'string') {
        errorMessage = error.error;
      }
      
      setErrors({
        submit: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handlePropertyDetailsChange = (field: keyof FormData['property_details'], value: any) => {
    setFormData(prev => ({
      ...prev,
      property_details: {
        ...prev.property_details,
        [field]: value
      }
    }));
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: `2px solid ${theme.colors.borders.light}`,
    borderRadius: '8px',
    fontSize: '16px',
    fontFamily: theme.typography.fonts.primary,
    backgroundColor: '#ffffff',
    color: theme.colors.text.primary,
    outline: 'none',
    transition: theme.transitions.normal,
    direction: isRTL ? 'rtl' : 'ltr',
  };

  const errorInputStyle = {
    ...inputStyle,
    borderColor: theme.colors.semantic.error.main,
    backgroundColor: '#fff5f5',
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textAlign: isRTL ? 'right' : 'left',
  };

  if (submitStatus === 'success') {
    return (
      <div className={`quote-request-success ${className}`}>
        <div style={{
          background: 'linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%)',
          border: `2px solid ${theme.colors.semantic.success.main}`,
          borderRadius: '12px',
          padding: '1rem',
          textAlign: 'center',
          maxWidth: '500px',
          margin: '1rem auto'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: theme.colors.semantic.success.main,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem',
            color: 'white',
            fontSize: '24px'
          }}>
            ✓
          </div>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            color: theme.colors.text.primary,
            marginBottom: '1rem'
          }}>
            {t('quotes.form.success.title')}
          </h2>
          <p style={{
            color: theme.colors.text.secondary,
            marginBottom: '1rem',
            lineHeight: '1.6'
          }}>
            {t('quotes.form.success.message')}
          </p>
          {onCancel && (
            <button
              onClick={onCancel}
              style={{
                backgroundColor: theme.colors.primary[500],
                color: 'white',
                border: 'none',
                padding: '12px 24px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: theme.transitions.normal
              }}
            >
              {t('common.viewQuotes')}
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`quote-request-form ${className}`}>
      <div style={{
        width: '100%',
        maxWidth: 'none',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
        overflow: 'hidden'
      }}>
        {/* Header */}
        <div style={{
          background: theme.colors.gradients.primary,
          color: 'white',
          padding: '1rem',
          textAlign: 'center'
        }}>
          <h1 style={{
            fontSize: '1.5rem',
            fontWeight: '700',
            marginBottom: '0.5rem'
          }}>
            {t('quotes.form.title')}
          </h1>
          <p style={{ fontSize: '1rem', opacity: 0.9 }}>
            {t('quotes.form.subtitle')}
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '1rem' }}>
          {/* Main Form Grid - Two Columns */}
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '1rem' : '1.5rem',
            marginBottom: '1rem'
          }}>
            
            {/* Left Column */}
            <div>
              {/* Essential Details */}
              <div style={{
                backgroundColor: '#fff',
                border: `2px solid ${theme.colors.primary[100]}`,
                borderRadius: '8px',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: theme.colors.primary[600],
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <HomeIcon size={16} style={{ marginRight: isRTL ? '0' : '6px', marginLeft: isRTL ? '6px' : '0' }} />
                  {t('quotes.form.sections.systemAndContact')}
                </h3>
                
                {/* System Size & Service Area in one row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{...labelStyle, marginBottom: '4px', fontSize: '13px'} as React.CSSProperties}>
                      {t('quotes.form.systemSize.label')}
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      step="0.5"
                      value={formData.system_size_kwp}
                      onChange={(e) => handleInputChange('system_size_kwp', parseFloat(e.target.value) || 0)}
                      style={{...inputStyle, padding: '8px 12px'}}
                      placeholder={t('quotes.form.systemSize.placeholder')}
                    />
                    {errors.system_size_kwp && (
                      <p style={{ color: theme.colors.semantic.error.main, fontSize: '11px', marginTop: '2px' }}>
                        {errors.system_size_kwp}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    <label style={{...labelStyle, marginBottom: '4px', fontSize: '13px'} as React.CSSProperties}>
                      {t('quotes.form.serviceArea.label')}
                    </label>
                    <select
                      value={formData.service_area}
                      onChange={(e) => handleInputChange('service_area', e.target.value)}
                      style={{...inputStyle, padding: '8px 12px'}}
                    >
                      <option value="">{t('quotes.form.serviceArea.placeholder')}</option>
                      {serviceAreas.map(area => (
                        <option key={area.value} value={area.value}>
                          {area.label}
                        </option>
                      ))}
                    </select>
                    {errors.service_area && (
                      <p style={{ color: theme.colors.semantic.error.main, fontSize: '11px', marginTop: '2px' }}>
                        {errors.service_area}
                      </p>
                    )}
                  </div>
                </div>

                {/* Installation Date & Phone */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label style={{...labelStyle, marginBottom: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px'} as React.CSSProperties}>
                      <CalendarIcon size={12} />
                      {t('quotes.form.installationDate.label')}
                    </label>
                    <ThemedDatePicker
                      value={formData.preferred_installation_date}
                      onChange={(value) => handleInputChange('preferred_installation_date', value)}
                      style={{
                        ...inputStyle, 
                        padding: '8px 12px'
                      }}
                      min={new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                      placeholder={t('quotes.form.installationDate.placeholder')}
                    />
                    {errors.preferred_installation_date && (
                      <p style={{ color: theme.colors.semantic.error.main, fontSize: '11px', marginTop: '2px' }}>
                        {errors.preferred_installation_date}
                      </p>
                    )}
                  </div>

                  <div>
                    <label style={{...labelStyle, marginBottom: '4px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px'} as React.CSSProperties}>
                      <PhoneIcon size={12} />
                      {t('quotes.form.phone.label')}
                    </label>
                    <input
                      type="tel"
                      value={formData.contact_phone}
                      onChange={(e) => handleInputChange('contact_phone', e.target.value)}
                      style={{...inputStyle, padding: '8px 12px'}}
                      placeholder={t('quotes.form.phone.placeholder')}
                      maxLength={13}
                    />
                    {errors.contact_phone && (
                      <p style={{ color: theme.colors.semantic.error.main, fontSize: '11px', marginTop: '2px' }}>
                        {errors.contact_phone}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div style={{
                backgroundColor: '#fff',
                border: `2px solid ${theme.colors.primary[100]}`,
                borderRadius: '8px',
                padding: '1.25rem'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: theme.colors.primary[600],
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <MapPinIcon size={16} style={{ marginRight: isRTL ? '0' : '6px', marginLeft: isRTL ? '6px' : '0' }} />
                  {t('quotes.form.sections.location')}
                </h3>
                <label style={{...labelStyle, marginBottom: '4px', fontSize: '13px'} as React.CSSProperties}>
                  {t('quotes.form.location.label')}
                </label>
                <textarea
                  value={formData.location_address}
                  onChange={(e) => handleInputChange('location_address', e.target.value)}
                  style={{
                    ...inputStyle,
                    minHeight: '70px',
                    padding: '8px 12px',
                    resize: 'none',
                    ...(errors.location_address ? { borderColor: theme.colors.semantic.error.main, backgroundColor: '#fff5f5' } : {})
                  }}
                  placeholder={t('quotes.form.location.placeholder')}
                  rows={3}
                />
                {errors.location_address && (
                  <p style={{ color: theme.colors.semantic.error.main, fontSize: '11px', marginTop: '2px' }}>
                    {errors.location_address}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column */}
            <div>
              {/* Property Details */}
              <div style={{
                backgroundColor: '#fff',
                border: `2px solid ${theme.colors.primary[100]}`,
                borderRadius: '8px',
                padding: '1.25rem',
                marginBottom: '1.25rem'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: theme.colors.primary[600],
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <HomeIcon size={16} style={{ marginRight: isRTL ? '0' : '6px', marginLeft: isRTL ? '6px' : '0' }} />
                  {t('quotes.form.sections.propertyDetails')}
                </h3>

                {/* Property Type */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{...labelStyle, marginBottom: '4px', fontSize: '13px'} as React.CSSProperties}>
                    {t('quotes.form.propertyDetails.propertyType')}
                  </label>
                  <select
                    value={formData.property_details.property_type}
                    onChange={(e) => handlePropertyDetailsChange('property_type', e.target.value)}
                    style={{...inputStyle, padding: '8px 12px'}}
                  >
                    {propertyTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Roof Type & Orientation in one row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div>
                    <label style={{...labelStyle, marginBottom: '4px', fontSize: '13px'} as React.CSSProperties}>
                      {t('quotes.form.propertyDetails.roofType')}
                    </label>
                    <select
                      value={formData.property_details.roof_type}
                      onChange={(e) => handlePropertyDetailsChange('roof_type', e.target.value)}
                      style={{...inputStyle, padding: '8px 12px'}}
                    >
                      {roofTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{...labelStyle, marginBottom: '4px', fontSize: '13px'} as React.CSSProperties}>
                      {t('quotes.form.propertyDetails.roofOrientation')}
                    </label>
                    <select
                      value={formData.property_details.roof_orientation}
                      onChange={(e) => handlePropertyDetailsChange('roof_orientation', e.target.value)}
                      style={{...inputStyle, padding: '8px 12px'}}
                    >
                      {roofOrientations.map(orientation => (
                        <option key={orientation.value} value={orientation.value}>
                          {orientation.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Shading Issues */}
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '0.75rem',
                  borderRadius: '6px',
                  border: `1px solid ${theme.colors.borders.light}`
                }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    cursor: 'pointer',
                    fontSize: '13px',
                    fontWeight: '500',
                    color: theme.colors.text.secondary
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.property_details.shading_issues}
                      onChange={(e) => handlePropertyDetailsChange('shading_issues', e.target.checked)}
                      style={{
                        marginRight: isRTL ? '0' : '8px',
                        marginLeft: isRTL ? '8px' : '0',
                        transform: 'scale(1.1)'
                      }}
                    />
                    {t('quotes.form.propertyDetails.shadingIssues')}
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div style={{
                backgroundColor: '#fff',
                border: `2px solid ${theme.colors.primary[100]}`,
                borderRadius: '8px',
                padding: '1.25rem'
              }}>
                <h3 style={{
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: theme.colors.primary[600],
                  marginBottom: '1rem'
                }}>
                  {t('quotes.form.sections.notesOptional')}
                </h3>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  style={{
                    ...inputStyle,
                    minHeight: '70px',
                    padding: '8px 12px',
                    resize: 'none'
                  }}
                  placeholder={t('quotes.form.notes.placeholder')}
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div style={{
              backgroundColor: '#fef2f2',
              border: `2px solid ${theme.colors.semantic.error.main}`,
              borderRadius: '8px',
              padding: '1rem',
              marginBottom: '1rem'
            }}>
              <p style={{ color: theme.colors.semantic.error.main, margin: 0 }}>
                {errors.submit}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            gap: '0.75rem',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingTop: '1rem',
            borderTop: `1px solid ${theme.colors.borders.light}`,
            marginTop: '0.5rem'
          }}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                style={{
                  backgroundColor: 'transparent',
                  color: theme.colors.text.secondary,
                  border: `2px solid ${theme.colors.borders.light}`,
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.6 : 1,
                  transition: theme.transitions.normal
                }}
              >
                {t('common.cancel')}
              </button>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              style={{
                backgroundColor: theme.colors.primary[500],
                color: 'white',
                border: 'none',
                padding: '12px 32px',
                borderRadius: '8px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.6 : 1,
                transition: theme.transitions.normal,
                minWidth: '140px'
              }}
            >
              {isSubmitting ? t('common.submitting') : t('quotes.form.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};