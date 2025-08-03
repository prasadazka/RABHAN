import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { userService } from '../services/user.service';
import { authService } from '../services/auth.service';
import { useGeolocation } from '../hooks/useGeolocation';

// MVP ProfileEditor - Matches backend UserProfile interface exactly
interface ProfileEditorProps {
  userId: string;
  onSave?: (data: any) => void;
  onError?: (error: string) => void;
}

// MVP Phase 1 - Exact backend field mapping
interface ProfileFormData {
  // Personal Information (Auth Service)
  firstName: string;
  lastName: string;
  
  // Address Information (User Service)
  region: string;
  city: string;
  district: string;
  streetAddress: string;
  landmark?: string;
  postalCode: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  
  // Property & Energy Information (User Service)
  propertyType: string;
  propertyOwnership: string;
  roofSize: number;
  electricityConsumption: string;
  electricityMeterNumber: string;
  
  // Employment Information (User Service) - MVP Phase 1
  employmentStatus?: string;
  
  // Preferences (User Service)
  preferredLanguage: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingConsent: boolean;
}

const ProfileEditor: React.FC<ProfileEditorProps> = ({ userId, onSave, onError }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { location, getCurrentLocation } = useGeolocation();
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    region: '',
    city: '',
    district: '',
    streetAddress: '',
    landmark: '',
    postalCode: '',
    gpsLatitude: undefined,
    gpsLongitude: undefined,
    propertyType: '',
    propertyOwnership: '',
    roofSize: 0,
    electricityConsumption: '',
    electricityMeterNumber: '',
    employmentStatus: '',
    preferredLanguage: 'ar',
    emailNotifications: true,
    smsNotifications: true,
    marketingConsent: false,
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeStep, setActiveStep] = useState(0);

  // Load existing profile data
  useEffect(() => {
    const loadProfile = async () => {
      try {
        setLoading(true);
        const result = await userService.getProfile();
        if (result.success && result.profile) {
          const profile = result.profile;
          setFormData({
            firstName: profile.firstName || '',
            lastName: profile.lastName || '',
            region: profile.region || '',
            city: profile.city || '',
            district: profile.district || '',
            streetAddress: profile.streetAddress || '',
            landmark: profile.landmark || '',
            postalCode: profile.postalCode || '',
            gpsLatitude: profile.gpsLatitude,
            gpsLongitude: profile.gpsLongitude,
            propertyType: profile.propertyType || '',
            propertyOwnership: profile.propertyOwnership || '',
            roofSize: profile.roofSize || 0,
            electricityConsumption: profile.electricityConsumption || '',
            electricityMeterNumber: profile.electricityMeterNumber || '',
            employmentStatus: profile.employmentStatus || '',
            preferredLanguage: profile.preferredLanguage || 'ar',
            emailNotifications: profile.emailNotifications ?? true,
            smsNotifications: profile.smsNotifications ?? true,
            marketingConsent: profile.marketingConsent ?? false,
          });
        }
      } catch (error) {
        console.error('Failed to load profile:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      loadProfile();
    }
  }, [userId]);

  // Validation functions - MVP requirements only
  const validateField = (field: keyof ProfileFormData, value: any): { isValid: boolean; message: string } => {
    switch (field) {
      case 'firstName':
      case 'lastName':
        if (!value || value.length < 2) {
          return { isValid: false, message: t('validation.name_min_length') };
        }
        if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(value)) {
          return { isValid: false, message: t('validation.name_letters_only') };
        }
        break;
        
      case 'region':
      case 'city':
      case 'district':
      case 'streetAddress':
        if (!value || value.trim().length === 0) {
          return { isValid: false, message: t('validation.field_required') };
        }
        break;
        
      case 'postalCode':
        if (!value || !/^[0-9]{5}$/.test(value)) {
          return { isValid: false, message: t('validation.postal_code_format') };
        }
        break;
        
      case 'propertyType':
      case 'propertyOwnership':
      case 'electricityConsumption':
        if (!value) {
          return { isValid: false, message: t('validation.field_required') };
        }
        break;
        
      case 'roofSize':
        if (!value || value < 10 || value > 10000) {
          return { isValid: false, message: t('validation.roof_size_range') };
        }
        break;
        
      case 'electricityMeterNumber':
        if (!value || !/^[A-Z0-9]+$/.test(value)) {
          return { isValid: false, message: t('validation.meter_number_format') };
        }
        break;
    }
    return { isValid: true, message: '' };
  };

  const handleInputChange = (field: keyof ProfileFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleGetLocation = async () => {
    try {
      await getCurrentLocation();
      if (location) {
        handleInputChange('gpsLatitude', location.latitude);
        handleInputChange('gpsLongitude', location.longitude);
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  // Save profile data
  const handleSave = async () => {
    try {
      setSaving(true);
      setErrors({});

      // Validate all required fields
      const validationErrors: Record<string, string> = {};
      const requiredFields: (keyof ProfileFormData)[] = [
        'firstName', 'lastName', 'region', 'city', 'district', 
        'streetAddress', 'postalCode', 'propertyType', 'propertyOwnership', 
        'roofSize', 'electricityConsumption', 'electricityMeterNumber'
      ];

      requiredFields.forEach(field => {
        const validation = validateField(field, formData[field]);
        if (!validation.isValid) {
          validationErrors[field] = validation.message;
        }
      });

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Prepare data for backend - exact field mapping
      const updateData = {
        // User service fields
        firstName: formData.firstName,
        lastName: formData.lastName,
        region: formData.region,
        city: formData.city,
        district: formData.district,
        streetAddress: formData.streetAddress,
        landmark: formData.landmark || undefined,
        postalCode: formData.postalCode,
        gpsLatitude: formData.gpsLatitude || undefined,
        gpsLongitude: formData.gpsLongitude || undefined,
        propertyType: formData.propertyType,
        propertyOwnership: formData.propertyOwnership,
        roofSize: formData.roofSize,
        electricityConsumption: formData.electricityConsumption,
        electricityMeterNumber: formData.electricityMeterNumber,
        employmentStatus: formData.employmentStatus || undefined,
        preferredLanguage: formData.preferredLanguage,
        emailNotifications: formData.emailNotifications,
        smsNotifications: formData.smsNotifications,
        marketingConsent: formData.marketingConsent,
      };

      // Update profile
      const result = await userService.updateProfile(updateData);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile');
      }

      // Also update auth service for name changes
      const authUpdate = {
        first_name: formData.firstName,
        last_name: formData.lastName,
      };
      
      const authResult = await authService.updateProfile(authUpdate);
      if (!authResult.success) {
        console.warn('Failed to update auth profile:', authResult.error);
      }

      onSave?.(updateData);
      console.log('✅ Profile saved successfully');

    } catch (error) {
      console.error('❌ Error saving profile:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to save profile';
      setErrors({ general: errorMessage });
      onError?.(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // MVP Step definitions
  const steps = [
    { id: 'personal', title: t('profile.steps.personal'), fields: ['firstName', 'lastName'] },
    { id: 'address', title: t('profile.steps.address'), fields: ['region', 'city', 'district', 'streetAddress', 'postalCode'] },
    { id: 'property', title: t('profile.steps.property'), fields: ['propertyType', 'propertyOwnership', 'roofSize', 'electricityConsumption', 'electricityMeterNumber'] },
    { id: 'employment', title: t('profile.steps.employment'), fields: ['employmentStatus'] },
    { id: 'preferences', title: t('profile.steps.preferences'), fields: ['preferredLanguage', 'emailNotifications', 'smsNotifications', 'marketingConsent'] },
  ];

  const renderField = (field: keyof ProfileFormData, type: string = 'text', options?: any[]) => {
    const value = formData[field];
    const error = errors[field];

    const fieldStyle = {
      width: '100%',
      padding: '12px 16px',
      border: `1px solid ${error ? '#e53e3e' : theme.colors.border}`,
      borderRadius: '8px',
      fontSize: '16px',
      backgroundColor: '#ffffff',
      color: theme.colors.text.primary,
      direction: isRTL ? 'rtl' as const : 'ltr' as const,
    };

    if (type === 'select') {
      return (
        <select
          value={value as string}
          onChange={(e) => handleInputChange(field, e.target.value)}
          style={fieldStyle}
        >
          <option value="">{t('common.select')}</option>
          {options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'checkbox') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={value as boolean}
            onChange={(e) => handleInputChange(field, e.target.checked)}
            style={{ cursor: 'pointer' }}
          />
          <span>{options?.[0]?.label}</span>
        </label>
      );
    }

    return (
      <input
        type={type}
        value={value as string | number}
        onChange={(e) => handleInputChange(field, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        style={fieldStyle}
        placeholder={options?.[0]?.placeholder}
      />
    );
  };

  const renderStep = (stepIndex: number) => {
    const step = steps[stepIndex];
    
    switch (step.id) {
      case 'personal':
        return (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.firstName')} *
              </label>
              {renderField('firstName')}
              {errors.firstName && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.firstName}</div>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.lastName')} *
              </label>
              {renderField('lastName')}
              {errors.lastName && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.lastName}</div>}
            </div>
          </div>
        );

      case 'address':
        return (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('profile.region')} *
                </label>
                {renderField('region', 'select', [
                  { value: 'riyadh', label: t('profile.regions.riyadh') },
                  { value: 'makkah', label: t('profile.regions.makkah') },
                  { value: 'eastern', label: t('profile.regions.eastern') },
                ])}
                {errors.region && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.region}</div>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('profile.city')} *
                </label>
                {renderField('city')}
                {errors.city && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.city}</div>}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.district')} *
              </label>
              {renderField('district')}
              {errors.district && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.district}</div>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.streetAddress')} *
              </label>
              {renderField('streetAddress')}
              {errors.streetAddress && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.streetAddress}</div>}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('profile.landmark')}
                </label>
                {renderField('landmark')}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('profile.postalCode')} *
                </label>
                {renderField('postalCode')}
                {errors.postalCode && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.postalCode}</div>}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.gpsLocation')} ({t('profile.optional')})
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                {renderField('gpsLatitude', 'number', [{ placeholder: t('profile.latitude') }])}
                {renderField('gpsLongitude', 'number', [{ placeholder: t('profile.longitude') }])}
                <button
                  type="button"
                  onClick={handleGetLocation}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: theme.colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                >
                  📍
                </button>
              </div>
            </div>
          </div>
        );

      case 'property':
        return (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('profile.propertyType')} *
                </label>
                {renderField('propertyType', 'select', [
                  { value: 'VILLA', label: t('profile.propertyTypes.villa') },
                  { value: 'APARTMENT', label: t('profile.propertyTypes.apartment') },
                  { value: 'DUPLEX', label: t('profile.propertyTypes.duplex') },
                  { value: 'TOWNHOUSE', label: t('profile.propertyTypes.townhouse') },
                  { value: 'COMMERCIAL', label: t('profile.propertyTypes.commercial') },
                ])}
                {errors.propertyType && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.propertyType}</div>}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('profile.propertyOwnership')} *
                </label>
                {renderField('propertyOwnership', 'select', [
                  { value: 'OWNED', label: t('profile.ownership.owned') },
                  { value: 'RENTED', label: t('profile.ownership.rented') },
                  { value: 'LEASED', label: t('profile.ownership.leased') },
                ])}
                {errors.propertyOwnership && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.propertyOwnership}</div>}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.roofSize')} * ({t('profile.squareMeters')})
              </label>
              {renderField('roofSize', 'number', [{ placeholder: '50' }])}
              {errors.roofSize && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.roofSize}</div>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.electricityConsumption')} *
              </label>
              {renderField('electricityConsumption', 'select', [
                { value: '0_200', label: '0-200 kWh' },
                { value: '200_400', label: '200-400 kWh' },
                { value: '400_600', label: '400-600 kWh' },
                { value: '600_800', label: '600-800 kWh' },
                { value: '800_1000', label: '800-1000 kWh' },
                { value: '1000_1200', label: '1000-1200 kWh' },
                { value: '1200_1500', label: '1200-1500 kWh' },
                { value: '1500_PLUS', label: '1500+ kWh' },
              ])}
              {errors.electricityConsumption && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.electricityConsumption}</div>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.electricityMeterNumber')} *
              </label>
              {renderField('electricityMeterNumber', 'text', [{ placeholder: 'METER123456' }])}
              {errors.electricityMeterNumber && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.electricityMeterNumber}</div>}
            </div>
          </div>
        );

      case 'employment':
        return (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.employmentStatus')} *
              </label>
              {renderField('employmentStatus', 'select', [
                { value: 'government', label: t('profile.employment.government') },
                { value: 'private', label: t('profile.employment.private') },
                { value: 'self_employed', label: t('profile.employment.selfEmployed') },
                { value: 'retired', label: t('profile.employment.retired') },
                { value: 'student', label: t('profile.employment.student') },
              ])}
              {errors.employmentStatus && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.employmentStatus}</div>}
              <div style={{ fontSize: '14px', color: theme.colors.text.secondary, marginTop: '4px' }}>
                {t('profile.employmentStatusHelp')}
              </div>
            </div>
          </div>
        );

      case 'preferences':
        return (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.preferredLanguage')}
              </label>
              {renderField('preferredLanguage', 'select', [
                { value: 'ar', label: t('languages.arabic') },
                { value: 'en', label: t('languages.english') },
              ])}
            </div>

            <div>
              <h4 style={{ margin: '0 0 16px', color: theme.colors.text.primary }}>
                {t('profile.notificationPreferences')}
              </h4>
              
              <div style={{ display: 'grid', gap: '12px' }}>
                {renderField('emailNotifications', 'checkbox', [{ label: t('profile.emailNotifications') }])}
                {renderField('smsNotifications', 'checkbox', [{ label: t('profile.smsNotifications') }])}
                {renderField('marketingConsent', 'checkbox', [{ label: t('profile.marketingConsent') }])}
              </div>
            </div>
          </div>
        );

      default:
        return <div>Step not found</div>;
    }
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '200px',
        color: theme.colors.text.secondary 
      }}>
        {t('common.loading')}...
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '800px', 
      margin: '0 auto', 
      padding: '20px',
      direction: isRTL ? 'rtl' : 'ltr'
    }}>
      {/* Header */}
      <div style={{ 
        marginBottom: '32px', 
        textAlign: 'center',
        borderBottom: `1px solid ${theme.colors.border}`,
        paddingBottom: '24px'
      }}>
        <h1 style={{ 
          margin: '0 0 8px', 
          color: theme.colors.text.primary,
          fontSize: '24px',
          fontWeight: '600'
        }}>
          {t('profile.editor.title')}
        </h1>
        <p style={{ 
          margin: 0, 
          color: theme.colors.text.secondary,
          fontSize: '16px'
        }}>
          {t('profile.editor.subtitle')}
        </p>
      </div>

      {/* Step Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '32px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {steps.map((step, index) => (
          <button
            key={step.id}
            onClick={() => setActiveStep(index)}
            style={{
              padding: '8px 16px',
              border: `1px solid ${activeStep === index ? theme.colors.primary : theme.colors.border}`,
              borderRadius: '20px',
              backgroundColor: activeStep === index ? theme.colors.primary : 'transparent',
              color: activeStep === index ? 'white' : theme.colors.text.primary,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
            }}
          >
            {index + 1}. {step.title}
          </button>
        ))}
      </div>

      {/* Step Content */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: `1px solid ${theme.colors.border}`,
        marginBottom: '24px'
      }}>
        {/* Error Display */}
        {errors.general && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '6px',
            color: '#c53030',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
            {errors.general}
          </div>
        )}

        {/* Step Form */}
        {renderStep(activeStep)}
      </div>

      {/* Action Buttons */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        gap: '16px'
      }}>
        <div>
          {activeStep > 0 && (
            <button
              onClick={() => setActiveStep(activeStep - 1)}
              style={{
                padding: '12px 24px',
                border: `1px solid ${theme.colors.border}`,
                borderRadius: '8px',
                backgroundColor: 'white',
                color: theme.colors.text.primary,
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              {t('common.previous')}
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          {activeStep < steps.length - 1 ? (
            <button
              onClick={() => setActiveStep(activeStep + 1)}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: theme.colors.primary,
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              {t('common.next')}
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '8px',
                backgroundColor: theme.colors.primary,
                color: 'white',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileEditor;