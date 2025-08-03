import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { userService, UpdateProfileData } from '../services/user.service';
import { authService } from '../services/auth.service';
import { documentService } from '../services/document.service';
import { useGeolocation } from '../hooks/useGeolocation';

// MVP Phase 1 - ProfileEditor Interface (matches fdev.md exactly)
interface MVPProfileProps {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
    phone?: string;
    national_id?: string;
    
    // Address Information - MVP Core (matches backend UserProfile)
    region?: string;
    city?: string;
    district?: string;
    street_address?: string;
    landmark?: string;
    postal_code?: string;
    gps_latitude?: number;
    gps_longitude?: number;
    
    // Property & Energy Information - MVP Core (matches backend UserProfile)
    property_type?: string;
    property_ownership?: string;
    roof_size?: number;
    electricity_consumption?: string;
    electricity_meter_number?: string;
    
    // Employment Information - MVP Phase 1 (Basic BNPL eligibility only)
    employment_status?: string;
    
    // Preferences - MVP Core (matches backend UserProfile)
    preferred_language?: string;
    email_notifications?: boolean;
    sms_notifications?: boolean;
    marketing_consent?: boolean;
    
    // Profile Status - MVP Core (matches backend UserProfile)
    profile_completed?: boolean;
    profile_completion_percentage?: number;
  };
  onUpdate?: (section: string, data: any) => void;
}

const ProfileMVP: React.FC<MVPProfileProps> = ({ user: initialUser, onUpdate }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [activeSection, setActiveSection] = useState('personal');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  
  // State for user data that updates with auth service
  const [user, setUser] = useState(initialUser);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  
  // Subscribe to auth service changes to get updated user data
  useEffect(() => {
    const unsubscribe = authService.subscribe((authState) => {
      if (authState.user) {
        console.log('🔄 User data updated from auth service:', authState.user);
        setUser(authState.user);
      }
    });
    
    return unsubscribe;
  }, []);
  
  // Load user profile data from user service on component mount
  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        setIsLoadingProfile(true);
        console.log('📥 Loading user profile from user service...');
        
        const result = await userService.getProfile();
        if (result.success && result.profile) {
          console.log('✅ User profile loaded successfully:', result.profile);
          setUserProfile(result.profile);
          
          // Merge user profile data with auth user data - MVP fields only
          const mergedUser = {
            ...user,
            // Auth service fields
            id: user.id,
            email: user.email,
            first_name: user.first_name,
            last_name: user.last_name,
            role: user.role,
            phone: user.phone,
            national_id: user.national_id,
            // User service profile fields - MVP only
            region: result.profile.region,
            city: result.profile.city,
            district: result.profile.district,
            street_address: result.profile.streetAddress,
            landmark: result.profile.landmark,
            postal_code: result.profile.postalCode,
            property_type: result.profile.propertyType,
            property_ownership: result.profile.propertyOwnership,
            roof_size: result.profile.roofSize?.toString(),
            gps_latitude: result.profile.gpsLatitude?.toString(),
            gps_longitude: result.profile.gpsLongitude?.toString(),
            electricity_consumption: result.profile.electricityConsumption,
            electricity_meter_number: result.profile.electricityMeterNumber,
            employment_status: result.profile.employmentStatus,
            preferred_language: result.profile.preferredLanguage,
            email_notifications: result.profile.emailNotifications,
            sms_notifications: result.profile.smsNotifications,
            marketing_consent: result.profile.marketingConsent,
          };
          
          console.log('🔗 Merged user data (MVP):', mergedUser);
          setUser(mergedUser);
        } else {
          console.log('⚠️ No user profile found or failed to load:', result.error);
        }
      } catch (error) {
        console.error('❌ Error loading user profile:', error);
      } finally {
        setIsLoadingProfile(false);
      }
    };
    
    // Only load profile if we have a user ID from auth
    if (user.id) {
      loadUserProfile();
    }
  }, [user.id]);
  
  // MVP Phase 1 form data structure
  const [formData, setFormData] = useState({
    personal: {
      first_name: user.first_name || '',
      last_name: user.last_name || '',
      phone: user.phone || '',
      email: user.email || '',
    },
    address: {
      region: user.region || '',
      city: user.city || '',
      district: user.district || '',
      street_address: user.street_address || '',
      landmark: user.landmark || '',
      postal_code: user.postal_code || '',
      gps_latitude: user.gps_latitude || '',
      gps_longitude: user.gps_longitude || '',
    },
    property: {
      property_type: user.property_type || '',
      property_ownership: user.property_ownership || '',
      roof_size: user.roof_size || '',
      electricity_consumption: user.electricity_consumption || '',
      electricity_meter_number: user.electricity_meter_number || '',
    },
    employment: {
      employment_status: user.employment_status || '',
    },
    preferences: {
      preferred_language: user.preferred_language || 'ar',
      email_notifications: user.email_notifications ?? true,
      sms_notifications: user.sms_notifications ?? true,
      marketing_consent: user.marketing_consent ?? false,
    },
  });

  // Update form data when user state changes (after profile load/save)
  useEffect(() => {
    console.log('🔄 User state changed, updating form data...');
    setFormData({
      personal: {
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        email: user.email || '',
      },
      address: {
        region: user.region || '',
        city: user.city || '',
        district: user.district || '',
        street_address: user.street_address || '',
        landmark: user.landmark || '',
        postal_code: user.postal_code || '',
        gps_latitude: user.gps_latitude || '',
        gps_longitude: user.gps_longitude || '',
      },
      property: {
        property_type: user.property_type || '',
        property_ownership: user.property_ownership || '',
        roof_size: user.roof_size || '',
        electricity_consumption: user.electricity_consumption || '',
        electricity_meter_number: user.electricity_meter_number || '',
      },
      employment: {
        employment_status: user.employment_status || '',
      },
      preferences: {
        preferred_language: user.preferred_language || 'ar',
        email_notifications: user.email_notifications ?? true,
        sms_notifications: user.sms_notifications ?? true,
        marketing_consent: user.marketing_consent ?? false,
      },
    });
  }, [user]);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [documents, setDocuments] = useState<any[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  
  // Geolocation hook
  const { location, getCurrentLocation, error: locationError } = useGeolocation();
  
  // MVP Phase 1 - 4 main sections only
  const sections = [
    { id: 'personal', name: t('profile.sections.personal'), icon: '👤' },
    { id: 'address', name: t('profile.sections.address'), icon: '📍' },
    { id: 'property', name: t('profile.sections.property'), icon: '🏠' },
    { id: 'preferences', name: t('profile.sections.preferences'), icon: '⚙️' },
  ];

  // Validation for MVP fields only
  const validateField = (field: string, value: any) => {
    switch (field) {
      case 'first_name':
        if (!value || value.length < 2) return { isValid: false, message: `${t('auth.register.firstName')} must be at least 2 characters` };
        if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(value)) return { isValid: false, message: `${t('auth.register.firstName')} can only contain letters and spaces` };
        break;
      case 'last_name':
        if (!value || value.length < 2) return { isValid: false, message: `${t('auth.register.lastName')} must be at least 2 characters` };
        if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(value)) return { isValid: false, message: `${t('auth.register.lastName')} can only contain letters and spaces` };
        break;
      case 'phone':
        if (!value) return { isValid: false, message: 'Phone number is required' };
        if (!/^(05|5)[0-9]{8}$/.test(value.replace(/[\s\-\(\)]/g, ''))) return { isValid: false, message: 'Please enter a valid Saudi phone number' };
        break;
      case 'postal_code':
        if (!value) return { isValid: false, message: 'Postal code is required' };
        if (!/^[0-9]{5}$/.test(value)) return { isValid: false, message: 'Postal code must be 5 digits' };
        break;
      case 'roof_size':
        if (!value || value <= 0) return { isValid: false, message: 'Roof size must be greater than 0' };
        if (value < 10 || value > 10000) return { isValid: false, message: 'Roof size must be between 10 and 10,000 square meters' };
        break;
      case 'electricity_meter_number':
        if (!value) return { isValid: false, message: 'Electricity meter number is required' };
        if (!/^[A-Z0-9]+$/.test(value)) return { isValid: false, message: 'Meter number can only contain uppercase letters and numbers' };
        break;
    }
    return { isValid: true, message: '' };
  };

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
    
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async (section: string) => {
    try {
      setLoading(true);
      setErrors({});

      const sectionData = formData[section as keyof typeof formData];
      const validationErrors: Record<string, string> = {};

      // Validate all fields in the section
      Object.entries(sectionData).forEach(([field, value]) => {
        const validation = validateField(field, value);
        if (!validation.isValid) {
          validationErrors[field] = validation.message;
        }
      });

      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      // Map form fields to appropriate service data - ONLY the fields in current section
      const updateData: any = {};
      
      Object.keys(sectionData).forEach(field => {
        const value = sectionData[field as keyof typeof sectionData];
        if (value === undefined || value === null || value === '') {
          return;
        }

        // Section-specific field processing
        if (section === 'personal') {
          // Auth service fields
          if (['first_name', 'last_name', 'phone'].includes(field)) {
            updateData[field] = value;
          }
        } else if (section === 'address') {
          // User service fields - convert to camelCase
          switch (field) {
            case 'street_address': updateData.streetAddress = value; break;
            case 'postal_code': updateData.postalCode = value; break;
            case 'gps_latitude': updateData.gpsLatitude = parseFloat(value) || null; break;
            case 'gps_longitude': updateData.gpsLongitude = parseFloat(value) || null; break;
            default: updateData[field] = value;
          }
        } else if (section === 'property') {
          // User service fields - convert to camelCase  
          switch (field) {
            case 'property_type': updateData.propertyType = value; break;
            case 'property_ownership': updateData.propertyOwnership = value; break;
            case 'roof_size': updateData.roofSize = parseFloat(value) || null; break;
            case 'electricity_consumption': updateData.electricityConsumption = value; break;
            case 'electricity_meter_number': updateData.electricityMeterNumber = value; break;
          }
        } else if (section === 'employment') {
          // User service fields - convert to camelCase
          switch (field) {
            case 'employment_status': updateData.employmentStatus = value; break;
          }
        } else if (section === 'preferences') {
          // User service fields - convert to camelCase
          switch (field) {
            case 'preferred_language': updateData.preferredLanguage = value; break;
            case 'email_notifications': updateData.emailNotifications = value; break;
            case 'sms_notifications': updateData.smsNotifications = value; break;
            case 'marketing_consent': updateData.marketingConsent = value; break;
          }
        }
      });

      console.log(`📤 Saving ${section} section:`, updateData);

      // Save to appropriate service
      if (section === 'personal') {
        const authUpdate = {
          first_name: updateData.first_name,
          last_name: updateData.last_name,
          phone: updateData.phone,
        };
        
        if (Object.keys(authUpdate).some(key => authUpdate[key as keyof typeof authUpdate])) {
          console.log('📤 Updating auth service:', authUpdate);
          const authResult = await authService.updateProfile(authUpdate);
          if (!authResult.success) {
            throw new Error(authResult.error || 'Failed to update personal information');
          }
        }
      } else {
        // All other sections go to user service
        if (Object.keys(updateData).length > 0) {
          console.log('📤 Updating user service:', updateData);
          const userResult = await userService.updateProfile(updateData);
          if (!userResult.success) {
            throw new Error(userResult.error || `Failed to update ${section} information`);
          }
        }
      }

      // Success feedback
      console.log(`✅ ${section} section saved successfully`);
      setEditingSection(null);
      
      // Trigger callback if provided
      if (onUpdate) {
        onUpdate(section, updateData);
      }

    } catch (error) {
      console.error(`❌ Error saving ${section}:`, error);
      setErrors({ general: error instanceof Error ? error.message : `Failed to save ${section} information` });
    } finally {
      setLoading(false);
    }
  };

  // Get current location for GPS fields
  const handleGetLocation = async () => {
    try {
      await getCurrentLocation();
      if (location) {
        handleInputChange('address', 'gps_latitude', location.latitude.toString());
        handleInputChange('address', 'gps_longitude', location.longitude.toString());
      }
    } catch (error) {
      console.error('Error getting location:', error);
    }
  };

  const renderField = (section: string, field: string, type: string = 'text', options?: any) => {
    const value = formData[section as keyof typeof formData][field as keyof any] || '';
    const error = errors[field];
    const isEditing = editingSection === section;

    const fieldStyle = {
      width: '100%',
      padding: '12px 16px',
      border: `1px solid ${error ? '#e53e3e' : theme.colors.border}`,
      borderRadius: '8px',
      fontSize: '16px',
      backgroundColor: isEditing ? '#fff' : '#f7f7f7',
      color: theme.colors.text.primary,
      direction: isRTL ? 'rtl' as const : 'ltr' as const,
      readOnly: !isEditing,
      cursor: isEditing ? 'text' : 'default',
    };

    if (type === 'select') {
      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(section, field, e.target.value)}
          style={fieldStyle}
          disabled={!isEditing}
        >
          <option value="">{t('common.select')}</option>
          {options?.map((option: any) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      );
    }

    if (type === 'checkbox') {
      return (
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: isEditing ? 'pointer' : 'default' }}>
          <input
            type="checkbox"
            checked={value}
            onChange={(e) => handleInputChange(section, field, e.target.checked)}
            disabled={!isEditing}
            style={{ cursor: isEditing ? 'pointer' : 'default' }}
          />
          <span>{options?.label || field}</span>
        </label>
      );
    }

    return (
      <input
        type={type}
        value={value}
        onChange={(e) => handleInputChange(section, field, e.target.value)}
        style={fieldStyle}
        placeholder={options?.placeholder || ''}
      />
    );
  };

  const renderSection = (sectionId: string) => {
    const isEditing = editingSection === sectionId;

    switch (sectionId) {
      case 'personal':
        return (
          <div style={{ display: 'grid', gap: '20px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('auth.register.firstName')} *
              </label>
              {renderField('personal', 'first_name')}
              {errors.first_name && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.first_name}</div>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('auth.register.lastName')} *
              </label>
              {renderField('personal', 'last_name')}
              {errors.last_name && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.last_name}</div>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('auth.register.phone')} *
              </label>
              {renderField('personal', 'phone', 'tel')}
              {errors.phone && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.phone}</div>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('auth.register.email')}
              </label>
              {renderField('personal', 'email', 'email')}
              <div style={{ fontSize: '14px', color: theme.colors.text.secondary, marginTop: '4px' }}>
                {t('profile.emailReadonly')}
              </div>
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
                {renderField('address', 'region', 'select', {
                  options: [
                    { value: 'riyadh', label: t('profile.regions.riyadh') },
                    { value: 'makkah', label: t('profile.regions.makkah') },
                    { value: 'eastern', label: t('profile.regions.eastern') },
                  ]
                })}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('profile.city')} *
                </label>
                {renderField('address', 'city')}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.district')} *
              </label>
              {renderField('address', 'district')}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.streetAddress')} *
              </label>
              {renderField('address', 'street_address')}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('profile.landmark')}
                </label>
                {renderField('address', 'landmark')}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('profile.postalCode')} *
                </label>
                {renderField('address', 'postal_code')}
                {errors.postal_code && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.postal_code}</div>}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.gpsLocation')}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '8px', alignItems: 'end' }}>
                {renderField('address', 'gps_latitude', 'number', { placeholder: t('profile.latitude') })}
                {renderField('address', 'gps_longitude', 'number', { placeholder: t('profile.longitude') })}
                <button
                  type="button"
                  onClick={handleGetLocation}
                  disabled={!isEditing}
                  style={{
                    padding: '12px 16px',
                    backgroundColor: theme.colors.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: isEditing ? 'pointer' : 'not-allowed',
                    opacity: isEditing ? 1 : 0.5,
                  }}
                >
                  📍
                </button>
              </div>
              {locationError && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{locationError}</div>}
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
                {renderField('property', 'property_type', 'select', {
                  options: [
                    { value: 'villa', label: t('profile.propertyTypes.villa') },
                    { value: 'apartment', label: t('profile.propertyTypes.apartment') },
                    { value: 'duplex', label: t('profile.propertyTypes.duplex') },
                    { value: 'townhouse', label: t('profile.propertyTypes.townhouse') },
                    { value: 'commercial', label: t('profile.propertyTypes.commercial') },
                  ]
                })}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  {t('profile.propertyOwnership')} *
                </label>
                {renderField('property', 'property_ownership', 'select', {
                  options: [
                    { value: 'owned', label: t('profile.ownership.owned') },
                    { value: 'rented', label: t('profile.ownership.rented') },
                    { value: 'leased', label: t('profile.ownership.leased') },
                  ]
                })}
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.roofSize')} * ({t('profile.squareMeters')})
              </label>
              {renderField('property', 'roof_size', 'number', { placeholder: '50' })}
              {errors.roof_size && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.roof_size}</div>}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.electricityConsumption')} * ({t('profile.monthlyKwh')})
              </label>
              {renderField('property', 'electricity_consumption', 'select', {
                options: [
                  { value: '0_200', label: '0-200 kWh' },
                  { value: '200_400', label: '200-400 kWh' },
                  { value: '400_600', label: '400-600 kWh' },
                  { value: '600_800', label: '600-800 kWh' },
                  { value: '800_1000', label: '800-1000 kWh' },
                  { value: '1000_1200', label: '1000-1200 kWh' },
                  { value: '1200_1500', label: '1200-1500 kWh' },
                  { value: '1500_plus', label: '1500+ kWh' },
                ]
              })}
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.electricityMeterNumber')} *
              </label>
              {renderField('property', 'electricity_meter_number', 'text', { placeholder: 'METER123456' })}
              {errors.electricity_meter_number && <div style={{ color: '#e53e3e', fontSize: '14px', marginTop: '4px' }}>{errors.electricity_meter_number}</div>}
            </div>

            {/* Employment Status - MVP Phase 1 for BNPL eligibility */}
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                {t('profile.employmentStatus')} *
              </label>
              {renderField('employment', 'employment_status', 'select', {
                options: [
                  { value: 'government', label: t('profile.employment.government') },
                  { value: 'private', label: t('profile.employment.private') },
                  { value: 'self_employed', label: t('profile.employment.selfEmployed') },
                  { value: 'retired', label: t('profile.employment.retired') },
                  { value: 'student', label: t('profile.employment.student') },
                ]
              })}
              <div style={{ fontSize: '14px', color: theme.colors.text.secondary, marginTop: '4px' }}>
                {t('profile.employmentStatusRequired')}
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
              {renderField('preferences', 'preferred_language', 'select', {
                options: [
                  { value: 'ar', label: t('languages.arabic') },
                  { value: 'en', label: t('languages.english') },
                ]
              })}
            </div>

            <div>
              <h4 style={{ margin: '0 0 16px', color: theme.colors.text.primary }}>
                {t('profile.notificationPreferences')}
              </h4>
              
              {renderField('preferences', 'email_notifications', 'checkbox', { 
                label: t('profile.emailNotifications') 
              })}
              
              {renderField('preferences', 'sms_notifications', 'checkbox', { 
                label: t('profile.smsNotifications') 
              })}
              
              {renderField('preferences', 'marketing_consent', 'checkbox', { 
                label: t('profile.marketingConsent') 
              })}
            </div>
          </div>
        );

      default:
        return <div>Section not found</div>;
    }
  };

  if (isLoadingProfile) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '400px',
        color: theme.colors.text.secondary 
      }}>
        {t('common.loading')}...
      </div>
    );
  }

  return (
    <div style={{ 
      maxWidth: '1000px', 
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
          fontSize: '28px',
          fontWeight: '600'
        }}>
          {t('profile.title')} - MVP
        </h1>
        <p style={{ 
          margin: 0, 
          color: theme.colors.text.secondary,
          fontSize: '16px'
        }}>
          {t('profile.subtitle')}
        </p>
        
        {/* Profile Completion */}
        {user.profile_completion_percentage !== undefined && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              marginBottom: '8px'
            }}>
              <span style={{ fontSize: '14px', fontWeight: '500' }}>
                {t('profile.completion')}
              </span>
              <span style={{ fontSize: '14px', color: theme.colors.primary }}>
                {user.profile_completion_percentage}%
              </span>
            </div>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              backgroundColor: '#f0f0f0', 
              borderRadius: '4px',
              overflow: 'hidden'
            }}>
              <div style={{ 
                width: `${user.profile_completion_percentage}%`, 
                height: '100%', 
                backgroundColor: theme.colors.primary,
                transition: 'width 0.3s ease'
              }} />
            </div>
          </div>
        )}
      </div>

      {/* Section Navigation */}
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        marginBottom: '32px',
        flexWrap: 'wrap',
        justifyContent: 'center'
      }}>
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            style={{
              padding: '12px 20px',
              border: `1px solid ${activeSection === section.id ? theme.colors.primary : theme.colors.border}`,
              borderRadius: '25px',
              backgroundColor: activeSection === section.id ? theme.colors.primary : 'transparent',
              color: activeSection === section.id ? 'white' : theme.colors.text.primary,
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>{section.icon}</span>
            {section.name}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div style={{ 
        backgroundColor: 'white', 
        borderRadius: '12px', 
        padding: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        border: `1px solid ${theme.colors.border}`
      }}>
        {/* Section Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
          borderBottom: `1px solid ${theme.colors.border}`,
          paddingBottom: '16px'
        }}>
          <h2 style={{ 
            margin: 0, 
            color: theme.colors.text.primary,
            fontSize: '20px',
            fontWeight: '600'
          }}>
            {sections.find(s => s.id === activeSection)?.icon} {sections.find(s => s.id === activeSection)?.name}
          </h2>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            {editingSection === activeSection ? (
              <>
                <button
                  onClick={() => setEditingSection(null)}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: '6px',
                    backgroundColor: 'white',
                    color: theme.colors.text.secondary,
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleSave(activeSection)}
                  disabled={loading}
                  style={{
                    padding: '8px 16px',
                    border: 'none',
                    borderRadius: '6px',
                    backgroundColor: theme.colors.primary,
                    color: 'white',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: '14px',
                    opacity: loading ? 0.7 : 1,
                  }}
                >
                  {loading ? t('common.saving') : t('common.save')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditingSection(activeSection)}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: theme.colors.primary,
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                {t('common.edit')}
              </button>
            )}
          </div>
        </div>

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

        {/* Section Form */}
        {renderSection(activeSection)}
      </div>
    </div>
  );
};

export default ProfileMVP;