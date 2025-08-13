import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { ContractorProfile } from '../../services/contractor.service';
import { ContractorSelectionStep } from './ContractorSelectionStep';
import { QuoteRequestForm } from './QuoteRequestForm';
import { CheckCircleIcon, UsersIcon, FileTextIcon } from 'lucide-react';

interface MultiStepQuoteRequestProps {
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
  onSuccess?: (requestId: string) => void;
  onCancel?: () => void;
  className?: string;
}

interface QuoteFormData {
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

export const MultiStepQuoteRequest: React.FC<MultiStepQuoteRequestProps> = ({
  user,
  onSuccess,
  onCancel,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Step management
  const [currentStep, setCurrentStep] = useState<'basic-info' | 'contractor-selection' | 'final-form'>('basic-info');
  
  // Data storage between steps
  const [basicQuoteData, setBasicQuoteData] = useState<Partial<QuoteFormData> | null>(null);
  const [selectedContractors, setSelectedContractors] = useState<ContractorProfile[]>([]);
  const [inspectionSchedules, setInspectionSchedules] = useState<{ [key: string]: Date }>({});

  const steps = [
    { key: 'basic-info', icon: FileTextIcon, label: t('quotes.steps.basicInfo') },
    { key: 'contractor-selection', icon: UsersIcon, label: t('quotes.steps.contractorSelection') },
    { key: 'final-form', icon: CheckCircleIcon, label: t('quotes.steps.finalSubmission') }
  ];

  const currentStepIndex = steps.findIndex(step => step.key === currentStep);

  // Handle basic info form completion
  const handleBasicInfoComplete = (formData: Partial<QuoteFormData>) => {
    setBasicQuoteData(formData);
    setCurrentStep('contractor-selection');
  };

  // Handle contractor selection completion
  const handleContractorsSelected = (contractors: ContractorProfile[], schedules: { [key: string]: Date }) => {
    setSelectedContractors(contractors);
    setInspectionSchedules(schedules);
    setCurrentStep('final-form');
  };

  // Handle final form submission
  const handleFinalSubmission = (requestId: string) => {
    if (onSuccess) {
      onSuccess(requestId);
    }
  };

  // Navigation handlers
  const handleBack = () => {
    switch (currentStep) {
      case 'contractor-selection':
        setCurrentStep('basic-info');
        break;
      case 'final-form':
        setCurrentStep('contractor-selection');
        break;
    }
  };

  const renderStepIndicator = () => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '2rem',
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
    }}>
      {steps.map((step, index) => {
        const StepIcon = step.icon;
        const isCompleted = index < currentStepIndex;
        const isCurrent = index === currentStepIndex;
        
        return (
          <React.Fragment key={step.key}>
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '0.5rem',
              flex: 1
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: isCompleted 
                  ? theme.colors.semantic.success.main 
                  : isCurrent 
                  ? theme.colors.primary[500] 
                  : theme.colors.backgrounds.secondary,
                color: isCompleted || isCurrent ? 'white' : theme.colors.text.secondary,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: theme.transitions.normal
              }}>
                {isCompleted ? (
                  <CheckCircleIcon size={24} />
                ) : (
                  <StepIcon size={24} />
                )}
              </div>
              
              <div style={{
                fontSize: '0.8rem',
                fontWeight: '600',
                color: isCompleted || isCurrent 
                  ? theme.colors.text.primary 
                  : theme.colors.text.secondary,
                textAlign: 'center'
              }}>
                {step.label}
              </div>
            </div>
            
            {index < steps.length - 1 && (
              <div style={{
                height: '2px',
                flex: 1,
                backgroundColor: isCompleted 
                  ? theme.colors.semantic.success.main 
                  : theme.colors.borders.light,
                margin: '0 1rem',
                marginTop: '-24px'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 'basic-info':
        return (
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: theme.colors.text.primary,
                marginBottom: '0.5rem'
              }}>
                {t('quotes.steps.basicInfo')}
              </h3>
              <p style={{
                color: theme.colors.text.secondary,
                fontSize: '0.9rem'
              }}>
                {t('quotes.steps.basicInfoDesc')}
              </p>
            </div>
            
            <BasicInfoForm 
              user={user}
              initialData={basicQuoteData}
              onComplete={handleBasicInfoComplete}
              onCancel={onCancel}
            />
          </div>
        );

      case 'contractor-selection':
        return (
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: theme.colors.text.primary,
                marginBottom: '0.5rem'
              }}>
                {t('quotes.steps.contractorSelection')}
              </h3>
              <p style={{
                color: theme.colors.text.secondary,
                fontSize: '0.9rem'
              }}>
                {t('quotes.steps.contractorSelectionDesc')}
              </p>
            </div>
            
            <ContractorSelectionStep
              serviceArea={basicQuoteData?.service_area || user.region || 'riyadh'}
              onContractorsSelected={handleContractorsSelected}
              onNext={() => setCurrentStep('final-form')}
              onBack={handleBack}
            />
          </div>
        );

      case 'final-form':
        return (
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
            }}>
              <h3 style={{
                fontSize: '1.2rem',
                fontWeight: '700',
                color: theme.colors.text.primary,
                marginBottom: '0.5rem'
              }}>
                {t('quotes.steps.finalSubmission')}
              </h3>
              <p style={{
                color: theme.colors.text.secondary,
                fontSize: '0.9rem',
                marginBottom: '1rem'
              }}>
                {t('quotes.steps.finalSubmissionDesc')}
              </p>

              {/* Selected Contractors Summary */}
              <div style={{
                backgroundColor: theme.colors.primary[50],
                border: `2px solid ${theme.colors.primary[100]}`,
                borderRadius: '8px',
                padding: '1rem'
              }}>
                <h4 style={{
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  color: theme.colors.primary[700],
                  marginBottom: '0.5rem'
                }}>
                  {t('contractors.selection.selected')} ({selectedContractors.length})
                </h4>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '0.5rem'
                }}>
                  {selectedContractors.map((contractor) => (
                    <div key={contractor.id} style={{
                      backgroundColor: 'white',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '500',
                      color: theme.colors.text.primary,
                      border: `1px solid ${theme.colors.primary[200]}`
                    }}>
                      {contractor.business_name}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <QuoteRequestForm
              user={user}
              initialData={basicQuoteData}
              selectedContractors={selectedContractors}
              inspectionSchedules={inspectionSchedules}
              onSuccess={handleFinalSubmission}
              onCancel={handleBack}
              showContractorSummary={false}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`multi-step-quote-request ${className}`}>
      {renderStepIndicator()}
      {renderCurrentStep()}
    </div>
  );
};

// Basic Info Form Component
interface BasicInfoFormProps {
  user: any;
  initialData: Partial<QuoteFormData> | null;
  onComplete: (data: Partial<QuoteFormData>) => void;
  onCancel?: () => void;
}

const BasicInfoForm: React.FC<BasicInfoFormProps> = ({ 
  user, 
  initialData, 
  onComplete, 
  onCancel 
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [formData, setFormData] = useState<Partial<QuoteFormData>>({
    system_size_kwp: initialData?.system_size_kwp || 6,
    service_area: initialData?.service_area || user.region?.toLowerCase() || 'riyadh',
    location_address: initialData?.location_address || 
      (user.street_address 
        ? `${user.street_address}, ${user.district || ''}, ${user.city || ''}, ${user.region || ''}`.replace(/,\\s*,/g, ',').replace(/^,|,$/g, '')
        : ''),
    ...initialData
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const serviceAreas = [
    { value: 'riyadh', label: t('quotes.form.serviceArea.options.riyadh', 'Riyadh') },
    { value: 'jeddah', label: t('quotes.form.serviceArea.options.jeddah', 'Jeddah') },
    { value: 'dammam', label: t('quotes.form.serviceArea.options.dammam', 'Dammam') },
    { value: 'mecca', label: t('quotes.form.serviceArea.options.mecca', 'Mecca') },
    { value: 'medina', label: t('quotes.form.serviceArea.options.medina', 'Medina') },
  ];

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.system_size_kwp || formData.system_size_kwp < 1 || formData.system_size_kwp > 50) {
      newErrors.system_size_kwp = t('quotes.form.errors.systemSizeRange');
    }

    if (!formData.service_area) {
      newErrors.service_area = t('quotes.form.errors.serviceAreaRequired');
    }

    if (!formData.location_address?.trim()) {
      newErrors.location_address = t('quotes.form.errors.locationRequired');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      onComplete(formData);
    }
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

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '600',
    color: theme.colors.text.secondary,
    textAlign: isRTL ? 'right' : 'left',
  };

  return (
    <form onSubmit={handleSubmit} style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '2rem',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
    }}>
      {/* System Size */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{...labelStyle} as React.CSSProperties}>
          {t('quotes.form.systemSize.label')}
        </label>
        <input
          type="number"
          min="1"
          max="50"
          step="0.5"
          value={formData.system_size_kwp || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, system_size_kwp: parseFloat(e.target.value) || 0 }))}
          style={errors.system_size_kwp ? { ...inputStyle, borderColor: theme.colors.semantic.error.main } : inputStyle}
          placeholder={t('quotes.form.systemSize.placeholder')}
        />
        {errors.system_size_kwp && (
          <p style={{ color: theme.colors.semantic.error.main, fontSize: '12px', marginTop: '4px' }}>
            {errors.system_size_kwp}
          </p>
        )}
      </div>

      {/* Service Area */}
      <div style={{ marginBottom: '1.5rem' }}>
        <label style={{...labelStyle} as React.CSSProperties}>
          {t('quotes.form.serviceArea.label')}
        </label>
        <select
          value={formData.service_area || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, service_area: e.target.value }))}
          style={errors.service_area ? { ...inputStyle, borderColor: theme.colors.semantic.error.main } : inputStyle}
        >
          <option value="">{t('quotes.form.serviceArea.placeholder')}</option>
          {serviceAreas.map(area => (
            <option key={area.value} value={area.value}>
              {area.label}
            </option>
          ))}
        </select>
        {errors.service_area && (
          <p style={{ color: theme.colors.semantic.error.main, fontSize: '12px', marginTop: '4px' }}>
            {errors.service_area}
          </p>
        )}
      </div>

      {/* Location */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{...labelStyle} as React.CSSProperties}>
          {t('quotes.form.location.label')}
        </label>
        <textarea
          value={formData.location_address || ''}
          onChange={(e) => setFormData(prev => ({ ...prev, location_address: e.target.value }))}
          style={{
            ...inputStyle,
            minHeight: '80px',
            resize: 'vertical',
            ...(errors.location_address ? { borderColor: theme.colors.semantic.error.main } : {})
          }}
          placeholder={t('quotes.form.location.placeholder')}
          rows={3}
        />
        {errors.location_address && (
          <p style={{ color: theme.colors.semantic.error.main, fontSize: '12px', marginTop: '4px' }}>
            {errors.location_address}
          </p>
        )}
      </div>

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: `1px solid ${theme.colors.borders.light}`,
        paddingTop: '1.5rem'
      }}>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              backgroundColor: 'transparent',
              border: `2px solid ${theme.colors.borders.light}`,
              color: theme.colors.text.secondary,
              padding: '12px 24px',
              borderRadius: '8px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {t('common.cancel')}
          </button>
        )}

        <button
          type="submit"
          style={{
            backgroundColor: theme.colors.primary[500],
            color: 'white',
            border: 'none',
            padding: '12px 32px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: theme.transitions.normal,
            marginLeft: 'auto'
          }}
        >
          {t('contractors.selection.title')}
        </button>
      </div>
    </form>
  );
};