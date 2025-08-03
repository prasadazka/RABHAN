import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { contractorService, ContractorProfile as ContractorProfileType } from '../services/contractor.service';
import { authService } from '../services/auth.service';
import { useGeolocation } from '../hooks/useGeolocation';
import VerificationBadge, { VerificationStatus } from '../components/VerificationBadge';
import Multiselect from '../components/ui/Multiselect';

interface ContractorProfileProps {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
    phone?: string;
    company_name?: string;
    cr_number?: string;
    vat_number?: string;
    business_type?: string;
    preferred_language?: string;
    email_notifications?: boolean;
    sms_notifications?: boolean;
    marketing_consent?: boolean;
    created_at?: string;
  };
  onUpdate?: (section: string, data: any) => void;
}

const ContractorProfile: React.FC<ContractorProfileProps> = ({ user: initialUser, onUpdate }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [activeSection, setActiveSection] = useState('profile');
  const [editingSection, setEditingSection] = useState<string | null>(null);
  
  // State for user data that updates with auth service
  const [user, setUser] = useState(initialUser);
  const [contractorProfile, setContractorProfile] = useState<ContractorProfileType | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>('not_verified');
  const [isLoadingVerification, setIsLoadingVerification] = useState(true);
  
  // Subscribe to auth service changes to get updated user data
  useEffect(() => {
    const unsubscribe = authService.subscribe((authState) => {
      if (authState.user) {
        console.log('🔄 Contractor data updated from auth service:', authState.user);
        setUser(authState.user);
      }
    });
    
    return unsubscribe;
  }, []);
  
  // Load contractor profile data
  useEffect(() => {
    const loadContractorProfile = async () => {
      try {
        setIsLoadingProfile(true);
        console.log('📥 Loading contractor profile...');
        
        const result = await contractorService.getProfile();
        
        if (result.success && result.profile) {
          console.log('✅ Contractor profile loaded successfully:', result.profile);
          setContractorProfile(result.profile);
          
          // Update verification status if available in profile
          if (result.profile.verification_level !== undefined) {
            const status = result.profile.verification_level > 0 ? 'verified' : 'not_verified';
            console.log('🔍 Updating verification status from profile:', status);
            setVerificationStatus(status);
          }
        } else {
          console.log('⚠️ No contractor profile found - will use lazy creation');
          setContractorProfile(null);
        }
      } catch (error) {
        console.error('❌ Failed to load contractor profile:', error);
        setContractorProfile(null);
      } finally {
        setIsLoadingProfile(false);
        setIsLoadingVerification(false);
      }
    };

    if (user.id) {
      loadContractorProfile();
    }
  }, [user.id]);

  // Enhanced mobile-first responsive hook
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [isTablet, setIsTablet] = useState(window.innerWidth >= 768 && window.innerWidth < 1200);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1200);
  
  // Form state management
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const [fieldValidation, setFieldValidation] = useState<Record<string, { isValid: boolean; message?: string }>>({});

  // Geolocation hook
  const { getCurrentLocation, loading: geoLoading, error: geoError, clearError } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 600000,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1200);
      setIsDesktop(width >= 1200);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Utility function to safely parse array data from various formats
  const parseArrayField = useCallback((rawValue: any): string[] => {
    // Handle null, undefined, or empty values
    if (!rawValue || rawValue === '') return [];
    
    // Already an array - return as is
    if (Array.isArray(rawValue)) return rawValue;
    
    // Handle string values
    if (typeof rawValue === 'string') {
      try {
        // Try parsing as JSON first
        const parsed = JSON.parse(rawValue);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        // Parse PostgreSQL array format like "{residential_solar,commercial_solar}"
        let clean = rawValue.trim();
        if (clean.startsWith('{') && clean.endsWith('}')) {
          clean = clean.slice(1, -1);
        }
        return clean ? clean.split(',').map(v => v.trim()).filter(v => v) : [];
      }
    }
    
    // Fallback to empty array
    return [];
  }, []);

  // Sync formData with contractorProfile when it changes
  useEffect(() => {
    if (contractorProfile) {
      console.log('🔄 Syncing formData with updated contractorProfile:', contractorProfile);
      console.log('🔍 Current formData before sync:', formData);
      
      const newFormData = {
        ...formData,
        profile: {
          ...formData.profile,
          // Profile tab business fields use contractor service data (same as Business tab)
          company_name: contractorProfile.business_name || '',
          cr_number: contractorProfile.commercial_registration || '',
          vat_number: contractorProfile.vat_number || '',
          business_type: contractorProfile.business_type || ''
        },
        business: {
          business_name: contractorProfile.business_name || '',
          business_name_ar: contractorProfile.business_name_ar || '',
          business_type: contractorProfile.business_type || '',
          commercial_registration: contractorProfile.commercial_registration || '',
          vat_number: contractorProfile.vat_number || '',
          established_year: contractorProfile.established_year?.toString() || '',
          employee_count: contractorProfile.employee_count?.toString() || '',
          description: contractorProfile.description || '',
          description_ar: contractorProfile.description_ar || ''
        },
        contact: {
          phone: contractorProfile.phone || '',
          whatsapp: contractorProfile.whatsapp || '',
          website: contractorProfile.website || ''
        },
        address: {
          address_line1: contractorProfile.address_line1 || '',
          address_line2: contractorProfile.address_line2 || '',
          city: contractorProfile.city || '',
          region: contractorProfile.region || '',
          postal_code: contractorProfile.postal_code || '',
          latitude: contractorProfile.latitude?.toString() || '',
          longitude: contractorProfile.longitude?.toString() || ''
        },
        services: {
          service_categories: parseArrayField(contractorProfile.service_categories),
          service_areas: parseArrayField(contractorProfile.service_areas),
          years_experience: contractorProfile.years_experience?.toString() || '',
          contractor_type: contractorProfile.contractor_type || 'full_solar_contractor',
          can_install: contractorProfile.can_install ?? true,
          can_supply_only: contractorProfile.can_supply_only ?? false
        },
        preferences: {
          preferred_language: user.preferred_language || i18n.language || 'ar',
          email_notifications: user.email_notifications ?? true,
          sms_notifications: user.sms_notifications ?? true,
          marketing_consent: user.marketing_consent ?? false,
        }
      };
      
      console.log('🔄 Setting new formData:', newFormData);
      console.log('🔍 Profile company_name will be:', newFormData.profile.company_name);
      console.log('🔍 Profile business_type will be:', newFormData.profile.business_type);
      console.log('🔍 Business business_name will be:', newFormData.business.business_name);
      console.log('🔍 Business business_type will be:', newFormData.business.business_type);
      console.log('🔍 Contact phone will be:', newFormData.contact.phone);
      console.log('🔍 Contact whatsapp will be:', newFormData.contact.whatsapp);
      console.log('🔍 Contact website will be:', newFormData.contact.website);
      console.log('🔍 Services service_categories will be:', newFormData.services.service_categories);
      console.log('🔍 Services service_areas will be:', newFormData.services.service_areas);
      console.log('🔍 Contact website will be:', newFormData.contact.website);
      setFormData(newFormData);
    }
  }, [contractorProfile, user]);

  // Initialize form data
  const [formData, setFormData] = useState({
    profile: {
      first_name: user?.first_name || user?.firstName || '',
      last_name: user?.last_name || user?.lastName || '',
      company_name: user?.company_name || '',
      cr_number: user?.cr_number || '',
      vat_number: user?.vat_number || '',
      business_type: user?.business_type || user?.userType || ''
    },
    business: {
      business_name: contractorProfile?.business_name || '',
      business_name_ar: contractorProfile?.business_name_ar || '',
      business_type: contractorProfile?.business_type || '',
      commercial_registration: contractorProfile?.commercial_registration || '',
      vat_number: contractorProfile?.vat_number || '',
      established_year: contractorProfile?.established_year || '',
      employee_count: contractorProfile?.employee_count || '',
      description: contractorProfile?.description || '',
      description_ar: contractorProfile?.description_ar || '',
    },
    contact: {
      phone: contractorProfile?.phone || '',
      whatsapp: contractorProfile?.whatsapp || '',
      website: contractorProfile?.website || '',
    },
    address: {
      address_line1: contractorProfile?.address_line1 || '',
      address_line2: contractorProfile?.address_line2 || '',
      city: contractorProfile?.city || '',
      region: contractorProfile?.region || '',
      postal_code: contractorProfile?.postal_code || '',
      latitude: contractorProfile?.latitude || '',
      longitude: contractorProfile?.longitude || '',
    },
    services: {
      service_categories: parseArrayField(contractorProfile?.service_categories),
      service_areas: parseArrayField(contractorProfile?.service_areas),
      years_experience: contractorProfile?.years_experience || '',
      contractor_type: contractorProfile?.contractor_type || 'full_solar_contractor',
      can_install: contractorProfile?.can_install ?? true,
      can_supply_only: contractorProfile?.can_supply_only ?? false,
    },
    preferences: {
      preferred_language: user?.preferred_language || i18n.language || 'ar',
      email_notifications: user?.email_notifications ?? true,
      sms_notifications: user?.sms_notifications ?? true,
      marketing_consent: user?.marketing_consent ?? false,
    }
  });

  // Update form data when profile loads
  useEffect(() => {
    if (contractorProfile) {
      setFormData({
        business: {
          business_name: contractorProfile.business_name || '',
          business_name_ar: contractorProfile.business_name_ar || '',
          business_type: contractorProfile.business_type || '',
          commercial_registration: contractorProfile.commercial_registration || '',
          vat_number: contractorProfile.vat_number || '',
          established_year: contractorProfile.established_year?.toString() || '',
          employee_count: contractorProfile.employee_count?.toString() || '',
          description: contractorProfile.description || '',
          description_ar: contractorProfile.description_ar || '',
        },
        contact: {
          email: contractorProfile.email || user.email || '',
          phone: contractorProfile.phone || user.phone || '',
          whatsapp: contractorProfile.whatsapp || '',
          website: contractorProfile.website || '',
        },
        address: {
          address_line1: contractorProfile.address_line1 || '',
          address_line2: contractorProfile.address_line2 || '',
          city: contractorProfile.city || '',
          region: contractorProfile.region || '',
          postal_code: contractorProfile.postal_code || '',
          latitude: contractorProfile.latitude?.toString() || '',
          longitude: contractorProfile.longitude?.toString() || '',
        },
        services: {
          service_categories: parseArrayField(contractorProfile.service_categories),
          service_areas: parseArrayField(contractorProfile.service_areas),
          years_experience: contractorProfile.years_experience?.toString() || '',
          contractor_type: contractorProfile.contractor_type || 'full_solar_contractor',
          can_install: contractorProfile.can_install ?? true,
          can_supply_only: contractorProfile.can_supply_only ?? false,
        },
        preferences: {
          preferred_language: i18n.language || 'ar',
          email_notifications: true,
          sms_notifications: true,
          marketing_consent: false,
        }
      });
    }
  }, [contractorProfile, user.email, user.phone, i18n.language]);

  // Menu icon generator
  const getMenuIcon = (section: string) => {
    const iconStyle = { width: '20px', height: '20px', fill: 'currentColor' };
    
    switch (section) {
      case 'profile':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
          </svg>
        );
      case 'business':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24">
            <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
          </svg>
        );
      case 'contact':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24">
            <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
        );
      case 'address':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        );
      case 'verification':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
          </svg>
        );
      case 'preferences':
        return (
          <svg style={iconStyle} viewBox="0 0 24 24">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
        );
      default:
        return null;
    }
  };

  // MVP Phase 1 Menu Items for Contractor
  const menuItems = [
    { id: 'profile', label: t('userApp.sidebar.profile'), icon: getMenuIcon('profile') },
    { id: 'business', label: t('contractorApp.profile.tabs.business'), icon: getMenuIcon('business') },
    { id: 'contact', label: t('contractorApp.profile.tabs.contact'), icon: getMenuIcon('contact') },
    { id: 'address', label: t('contractorApp.profile.tabs.address'), icon: getMenuIcon('address') },
    { id: 'verification', label: t('contractorApp.profile.tabs.verification'), icon: getMenuIcon('verification') },
    { id: 'preferences', label: t('contractorApp.profile.tabs.preferences'), icon: getMenuIcon('preferences') },
  ];

  // Format and validate input
  const formatAndValidateInput = (field: string, value: string): string => {
    switch (field) {
      case 'business_name':
      case 'business_name_ar':
        // Allow letters, numbers, spaces, and common business symbols
        return value.replace(/[^a-zA-Z0-9\u0600-\u06FF\s&()-.,]/g, '').slice(0, 100);
      
      case 'phone':
      case 'whatsapp':
        // Saudi phone format: +966xxxxxxxxx
        let phone = value.replace(/[^\d+]/g, '');
        if (!phone.startsWith('+966') && phone.length > 0) {
          if (phone.startsWith('966')) {
            phone = '+' + phone;
          } else if (phone.startsWith('0')) {
            phone = '+966' + phone.slice(1);
          } else if (/^\d/.test(phone)) {
            phone = '+966' + phone;
          }
        }
        return phone.slice(0, 13);
      
      case 'commercial_registration':
        // 10 digits for CR number
        return value.replace(/\D/g, '').slice(0, 10);
      
      case 'vat_number':
        // 15 digits for VAT number
        return value.replace(/\D/g, '').slice(0, 15);
      
      case 'postal_code':
        // 5 digits for postal code
        return value.replace(/\D/g, '').slice(0, 5);
      
      case 'established_year':
        // Year between 1900 and current year
        const year = value.replace(/\D/g, '').slice(0, 4);
        const currentYear = new Date().getFullYear();
        const yearNum = parseInt(year) || 0;
        if (yearNum > currentYear) return currentYear.toString();
        if (yearNum < 1900 && year.length === 4) return '1900';
        return year;
      
      case 'employee_count':
        // Max 9999 employees
        const count = value.replace(/\D/g, '').slice(0, 4);
        return count === '0' ? '' : count;
      
      case 'years_experience':
        // Max 50 years experience
        const experience = value.replace(/\D/g, '').slice(0, 2);
        return experience === '0' ? '' : Math.min(parseInt(experience) || 0, 50).toString();
      
      case 'website':
        // Basic URL validation
        return value.replace(/[^a-zA-Z0-9./:_-]/g, '').slice(0, 100);
      
      default:
        return value;
    }
  };

  // Enhanced SAMA-compliant validation with security measures
  const validateFieldRealtime = (field: string, value: string | string[]): { isValid: boolean; message?: string } => {
    // Debug logging to track validation
    console.log('🔍 Validating field:', field, 'with value:', value);
    
    // Handle array fields (multiselect)
    if (Array.isArray(value)) {
      // Validate service categories
      if (field === 'service_categories') {
        if (value.length === 0) {
          return { isValid: false, message: t('contractorApp.profile.validation.serviceCategories') || 'Please select at least one service category' };
        }
        if (value.length > 5) {
          return { isValid: false, message: t('contractorApp.profile.validation.maxServiceCategories') || 'Maximum 5 service categories allowed' };
        }
        return { isValid: true };
      }
      
      // Validate service areas
      if (field === 'service_areas') {
        if (value.length === 0) {
          return { isValid: false, message: t('contractorApp.profile.validation.serviceAreas') || 'Please select at least one service area' };
        }
        if (value.length > 8) {
          return { isValid: false, message: t('contractorApp.profile.validation.maxServiceAreas') || 'Maximum 8 service areas allowed' };
        }
        return { isValid: true };
      }
      
      return { isValid: true };
    }
    
    // Security: Check for potentially malicious input in string values
    if (value && typeof value === 'string' && (value.includes('<script') || value.includes('javascript:') || value.includes('data:'))) {
      return { isValid: false, message: t('security.invalidInput') || 'Invalid input detected' };
    }

    switch (field) {
      case 'first_name':
      case 'last_name':
        if (value.length < 2) return { isValid: false, message: t('contractorApp.profile.validation.nameMinLength') || 'Name must be at least 2 characters' };
        if (value.length > 50) return { isValid: false, message: t('contractorApp.profile.validation.nameMaxLength') || 'Name must be 50 characters or less' };
        // Arabic and English letters only
        if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(value)) return { isValid: false, message: t('contractorApp.profile.validation.nameFormat') || 'Name can only contain letters and spaces' };
        return { isValid: true };

      case 'business_name':
      case 'company_name':
        if (value.length < 2) return { isValid: false, message: t('contractorApp.profile.validation.businessNameMinLength') || 'Business name must be at least 2 characters' };
        if (value.length > 100) return { isValid: false, message: t('contractorApp.profile.validation.businessNameMaxLength') || 'Business name must be 100 characters or less' };
        // SAMA compliance: Business names should follow Saudi naming conventions
        if (!/^[a-zA-Z0-9\u0600-\u06FF\s&().-]+$/.test(value)) return { isValid: false, message: t('contractorApp.profile.validation.businessNameFormat') || 'Business name contains invalid characters' };
        return { isValid: true };
      
      case 'phone':
      case 'whatsapp': {
        // WhatsApp is optional - empty values are valid
        if (field === 'whatsapp' && (!value || value.trim() === '')) return { isValid: true };
        
        // SAMA requirement: Saudi phone numbers only
        if (!value.startsWith('+966')) return { isValid: false, message: t('contractorApp.profile.validation.phoneFormat') || 'Phone must start with +966 (Saudi Arabia)' };
        if (value.length !== 13) return { isValid: false, message: t('contractorApp.profile.validation.phoneLength') || 'Phone must be 13 characters (+966xxxxxxxxx)' };
        // Validate Saudi mobile format
        const saudiMobilePattern = /^\+966[5][0-9]{8}$/;
        if (!saudiMobilePattern.test(value)) return { isValid: false, message: t('contractorApp.profile.validation.saudiMobileFormat') || 'Invalid Saudi mobile number format' };
        return { isValid: true };
      }
      
      case 'commercial_registration':
      case 'cr_number':
        // SAMA/MOCI requirement: Valid Saudi CR format
        if (value && value.length !== 10) return { isValid: false, message: t('contractorApp.profile.validation.crLength') || 'Commercial Registration must be exactly 10 digits' };
        if (value && !/^\d{10}$/.test(value)) return { isValid: false, message: t('contractorApp.profile.validation.crFormat') || 'Commercial Registration must contain only digits' };
        // Additional CR validation logic could be added here
        return { isValid: true };
      
      case 'vat_number':
        // ZATCA requirement: Valid Saudi VAT format
        if (value && value.length !== 15) return { isValid: false, message: t('contractorApp.profile.validation.vatLength') || 'VAT number must be exactly 15 digits' };
        if (value && !/^\d{15}$/.test(value)) return { isValid: false, message: t('contractorApp.profile.validation.vatFormat') || 'VAT number must contain only digits' };
        // VAT number should start with specific digits for Saudi Arabia
        if (value && !value.startsWith('3')) return { isValid: false, message: t('contractorApp.profile.validation.vatSaudiFormat') || 'Invalid Saudi VAT number format' };
        return { isValid: true };
      
      case 'postal_code':
        // Saudi Post requirement: 5-digit postal code
        if (value && value.length !== 5) return { isValid: false, message: t('contractorApp.profile.validation.postalCodeLength') || 'Postal code must be exactly 5 digits' };
        if (value && !/^\d{5}$/.test(value)) return { isValid: false, message: t('contractorApp.profile.validation.postalCodeFormat') || 'Postal code must contain only digits' };
        return { isValid: true };
      
      case 'established_year':
        if (value) {
          const year = parseInt(value);
          const currentYear = new Date().getFullYear();
          // Reasonable business establishment year range
          if (year < 1900 || year > currentYear) return { isValid: false, message: t('contractorApp.profile.validation.establishedYear') || `Year must be between 1900 and ${currentYear}` };
          // SAMA compliance: Solar businesses likely established after 2000
          if (year < 2000) return { isValid: false, message: t('contractorApp.profile.validation.modernBusiness') || 'Solar businesses typically established after 2000' };
        }
        return { isValid: true };
      
      case 'years_experience':
        const experience = parseInt(value) || 0;
        if (experience > 50) return { isValid: false, message: t('contractorApp.profile.validation.maxExperience') || 'Experience cannot exceed 50 years' };
        if (experience < 0) return { isValid: false, message: t('contractorApp.profile.validation.minExperience') || 'Experience cannot be negative' };
        return { isValid: true };
      
      case 'website':
        // Website is optional - empty values are valid
        if (!value || value.trim() === '') return { isValid: true };
        
        if (!/^https?:\/\/.+\..+/.test(value)) return { isValid: false, message: t('contractorApp.profile.validation.websiteFormat') || 'Website must be a valid URL (http://example.com)' };
        // Security: Block suspicious URLs
        if (value.includes('javascript:') || value.includes('data:') || value.includes('file:')) {
          return { isValid: false, message: t('security.invalidUrl') || 'Invalid URL format' };
        }
        return { isValid: true };

      case 'email':
        // Enhanced email validation
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (value && !emailPattern.test(value)) return { isValid: false, message: t('contractorApp.profile.validation.emailFormat') || 'Invalid email format' };
        // Security: Block suspicious domains
        if (value && (value.includes('tempmail') || value.includes('10minutemail') || value.includes('guerrillamail'))) {
          return { isValid: false, message: t('security.temporaryEmailBlocked') || 'Temporary email addresses are not allowed' };
        }
        return { isValid: true };

      case 'description':
      case 'description_ar':
        if (value && value.length > 500) return { isValid: false, message: t('contractorApp.profile.validation.descriptionMaxLength') || 'Description must be 500 characters or less' };
        // Security: Check for suspicious content
        if (value && (value.toLowerCase().includes('bitcoin') || value.toLowerCase().includes('crypto') || value.toLowerCase().includes('forex'))) {
          return { isValid: false, message: t('security.suspiciousContentBlocked') || 'Suspicious content detected' };
        }
        return { isValid: true };

      case 'address_line1':
      case 'address_line2':
        if (field === 'address_line1' && value.length < 5) return { isValid: false, message: t('contractorApp.profile.validation.addressMinLength') || 'Address must be at least 5 characters' };
        if (value && value.length > 100) return { isValid: false, message: t('contractorApp.profile.validation.addressMaxLength') || 'Address must be 100 characters or less' };
        return { isValid: true };

      case 'city':
        if (value && value.length < 2) return { isValid: false, message: t('contractorApp.profile.validation.cityMinLength') || 'City must be at least 2 characters' };
        if (value && value.length > 30) return { isValid: false, message: t('contractorApp.profile.validation.cityMaxLength') || 'City must be 30 characters or less' };
        // Arabic and English letters only
        if (value && !/^[a-zA-Z\u0600-\u06FF\s-]+$/.test(value)) return { isValid: false, message: t('contractorApp.profile.validation.cityFormat') || 'City name contains invalid characters' };
        return { isValid: true };
      
      default:
        return { isValid: true };
    }
  };

  const handleInputChange = (section: string, field: string, rawValue: string | string[]) => {
    // Handle multiselect fields differently
    if (Array.isArray(rawValue)) {
      // Perform validation for array fields
      const validation = validateFieldRealtime(field, rawValue);
      
      // Update field validation state
      setFieldValidation(prev => ({
        ...prev,
        [field]: validation
      }));
      
      // Direct array value for multiselect
      setFormData(prev => {
        const updatedSection = {
          ...prev[section as keyof typeof prev],
          [field]: rawValue
        };
        
        return {
          ...prev,
          [section]: updatedSection
        };
      });
      
      // Clear any previous errors for this field
      if (errors[field]) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[field];
          return newErrors;
        });
      }
      return;
    }
    
    // Format and validate the input for regular fields
    const formattedValue = formatAndValidateInput(field, rawValue);
    
    // Perform real-time validation
    const validation = validateFieldRealtime(field, formattedValue);
    
    // Update field validation state
    setFieldValidation(prev => ({
      ...prev,
      [field]: validation
    }));
    
    // Update form data with potential cascading updates
    setFormData(prev => {
      const updatedSection = {
        ...prev[section as keyof typeof prev],
        [field]: formattedValue
      };
      
      // Auto-update capabilities based on contractor type selection
      if (field === 'contractor_type' && section === 'services') {
        if (formattedValue === 'full_solar_contractor') {
          updatedSection.can_install = true;
          updatedSection.can_supply_only = false;
        } else if (formattedValue === 'solar_vendor_only') {
          updatedSection.can_install = false;
          updatedSection.can_supply_only = true;
        }
      }
      
      return {
        ...prev,
        [section]: updatedSection
      };
    });
    
    // Clear any previous errors for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCancel = (section: string) => {
    // Reset form data to original values
    if (contractorProfile) {
      setFormData(prev => ({
        ...prev,
        [section]: {
          business_name: contractorProfile.business_name || '',
          business_name_ar: contractorProfile.business_name_ar || '',
          business_type: contractorProfile.business_type || '',
          commercial_registration: contractorProfile.commercial_registration || '',
          vat_number: contractorProfile.vat_number || '',
          established_year: contractorProfile.established_year?.toString() || '',
          employee_count: contractorProfile.employee_count?.toString() || '',
          description: contractorProfile.description || '',
          description_ar: contractorProfile.description_ar || '',
          email: contractorProfile.email || user.email || '',
          phone: contractorProfile.phone || user.phone || '',
          whatsapp: contractorProfile.whatsapp || '',
          website: contractorProfile.website || '',
          address_line1: contractorProfile.address_line1 || '',
          address_line2: contractorProfile.address_line2 || '',
          city: contractorProfile.city || '',
          region: contractorProfile.region || '',
          postal_code: contractorProfile.postal_code || '',
          latitude: contractorProfile.latitude?.toString() || '',
          longitude: contractorProfile.longitude?.toString() || '',
          service_categories: contractorProfile.service_categories || [],
          service_areas: contractorProfile.service_areas || [],
          years_experience: contractorProfile.years_experience?.toString() || '',
        }
      }));
    }
    
    setEditingSection(null);
    setErrors({});
    setFieldValidation({});
  };

  const handleSave = async (section: string) => {
    try {
      setSaving(true);
      setErrors({});
      
      // Handle profile sections - save to auth service
      if (section.startsWith('profile_')) {
        const profileSection = section.replace('profile_', ''); // 'personal' or 'business'
        const sectionData = formData.profile;
        
        // Validate fields in this profile section
        let hasErrors = false;
        const validationErrors: Record<string, string> = {};
        
        Object.entries(sectionData).forEach(([field, value]) => {
          // Only validate fields that belong to this section and are not read-only
          const isPersonalField = ['first_name', 'last_name'].includes(field);
          const isBusinessField = ['company_name', 'cr_number', 'vat_number', 'business_type'].includes(field);
          const shouldValidate = (profileSection === 'personal' && isPersonalField) || 
                                (profileSection === 'business' && isBusinessField);
          
          if (shouldValidate) {
            const validation = validateFieldRealtime(field, value as string);
            if (!validation.isValid) {
              hasErrors = true;
              validationErrors[field] = validation.message || 'Invalid input';
            }
          }
        });
        
        if (hasErrors) {
          setErrors(validationErrors);
          return;
        }
        
        // Prepare data for auth service update
        const authUpdateData: any = {};
        const contractorUpdateData: any = {};
        
        if (profileSection === 'personal') {
          if (sectionData.first_name) authUpdateData.first_name = sectionData.first_name;
          if (sectionData.last_name) authUpdateData.last_name = sectionData.last_name;
        } else if (profileSection === 'business') {
          // For business info in Profile tab, save to AUTH service (users table)
          if (sectionData.company_name) authUpdateData.company_name = sectionData.company_name;
          if (sectionData.cr_number) authUpdateData.cr_number = sectionData.cr_number;
          if (sectionData.vat_number) authUpdateData.vat_number = sectionData.vat_number;
          if (sectionData.business_type) authUpdateData.business_type = sectionData.business_type;
          
          console.log(`🔄 Saving Profile tab business info to AUTH service:`, authUpdateData);
        }
        
        console.log(`🔄 Saving profile ${profileSection} section to auth service:`, authUpdateData);
        
        // Save to auth service (only if there's data to save)
        if (Object.keys(authUpdateData).length > 0) {
          const result = await authService.updateCurrentUser(authUpdateData);
          
          if (result.success) {
            console.log('✅ Auth profile updated successfully');
            
            // Update local user state
            if (result.user) {
              console.log('🔄 Updating user state with auth service response:', result.user);
              console.log('🔍 User company_name will be:', result.user.company_name);
              console.log('🔍 User business_type will be:', result.user.business_type);
              setUser(result.user);
            } else {
              console.warn('⚠️ No user data returned from auth service update');
            }
          } else {
            console.error('❌ Failed to save auth profile:', result.error);
            setErrors({ general: result.error || 'Failed to save profile' });
            return;
          }
        }
        
        // Success for both services
        setSuccessMessage(t('contractorApp.profile.updateSuccess') || 'Profile updated successfully');
        
        // Call onUpdate if provided
        if (onUpdate) {
          onUpdate(section, profileSection === 'business' ? { ...authUpdateData, ...contractorUpdateData } : authUpdateData);
        }
        
        setEditingSection(null);
        
        // Force re-render by updating a dummy state
        setFieldValidation({});
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
        
        return;
      }
      
      // Handle contact additional section - save to contractor service
      if (section === 'contact_additional') {
        const sectionData = formData.contact;
        
        // Validate fields in this contact section (only additional fields)
        let hasErrors = false;
        const validationErrors: Record<string, string> = {};
        
        // Only validate phone, whatsapp and website (additional contact fields)
        const additionalFields = ['phone', 'whatsapp', 'website'];
        additionalFields.forEach(field => {
          const value = sectionData[field] || '';
          const validation = validateFieldRealtime(field, value);
          if (!validation.isValid) {
            hasErrors = true;
            validationErrors[field] = validation.message || 'Invalid input';
          }
        });
        
        if (hasErrors) {
          setErrors(validationErrors);
          return;
        }
        
        // Prepare data for contractor service update
        const contactUpdateData: any = {
          phone: sectionData.phone || '',  // Direct mapping to phone in contractor service
          whatsapp: sectionData.whatsapp || '',
          website: sectionData.website || ''
        };
        
        console.log('🔄 Saving additional contact info to contractor service:', contactUpdateData);
        
        // Save to contractor service
        const result = await contractorService.updateProfile(contactUpdateData);
        
        if (result.success) {
          console.log('✅ Contact information updated successfully');
          setSuccessMessage(t('contractorApp.profile.updateSuccess') || 'Contact information updated successfully');
          
          // Update local contractor profile state
          if (result.profile) {
            console.log('🔄 Updating contractor profile state with new contact data:', result.profile);
            setContractorProfile(result.profile);
          } else {
            console.log('🔄 Profile not returned, refreshing from API...');
            // Refresh profile data if not returned
            const refreshResult = await contractorService.getProfile();
            if (refreshResult.success && refreshResult.profile) {
              console.log('🔄 Refreshed contractor profile:', refreshResult.profile);
              setContractorProfile(refreshResult.profile);
            } else {
              console.error('❌ Failed to refresh contractor profile:', refreshResult.error);
            }
          }
          
          setEditingSection(null);
          
          // Clear success message after 3 seconds
          setTimeout(() => setSuccessMessage(''), 3000);
          
          // Call onUpdate callback if provided
          if (onUpdate) {
            onUpdate(section, contactUpdateData);
          }
        } else {
          console.error('❌ Failed to save contact information:', result.error);
          setErrors({ general: result.error || 'Failed to save contact information' });
        }
        
        return;
      }
      
      // Handle preferences section - save to AUTH service (contractors table)
      if (section === 'preferences') {
        const sectionData = formData.preferences;
        
        // Prepare preferences data for auth service
        const preferencesData = {
          preferred_language: sectionData.preferred_language,
          email_notifications: sectionData.email_notifications,
          sms_notifications: sectionData.sms_notifications,
          marketing_consent: sectionData.marketing_consent
        };
        
        console.log('💾 Saving preferences to contractor service:', preferencesData);
        
        // Save to contractor service
        const result = await contractorService.updateProfile(preferencesData);
        
        if (result.success) {
          console.log('✅ Preferences saved successfully');
          setSuccessMessage(t('contractorApp.profile.preferencesUpdateSuccess') || 'Preferences updated successfully');
          
          // Update local user state
          if (result.user) {
            setUser(result.user);
            
            // Also update formData to reflect the saved preferences
            setFormData(prev => ({
              ...prev,
              preferences: {
                preferred_language: result.user.preferred_language || i18n.language || 'ar',
                email_notifications: result.user.email_notifications ?? true,
                sms_notifications: result.user.sms_notifications ?? true,
                marketing_consent: result.user.marketing_consent ?? false,
              }
            }));
          }
          
          // Update language if changed
          if (preferencesData.preferred_language && preferencesData.preferred_language !== i18n.language) {
            i18n.changeLanguage(preferencesData.preferred_language);
          }
          
          setEditingSection(null);
          setTimeout(() => setSuccessMessage(''), 3000);
          
          if (onUpdate) {
            onUpdate(section, preferencesData);
          }
        } else {
          console.error('❌ Failed to save preferences:', result.error);
          setErrors({ general: result.error || 'Failed to save preferences' });
        }
        
        return;
      }
      
      // Handle other sections - save to contractor service
      const sectionData = formData[section as keyof typeof formData];
      
      // Validate all fields in section
      let hasErrors = false;
      const validationErrors: Record<string, string> = {};
      
      Object.entries(sectionData).forEach(([field, value]) => {
        const validation = validateFieldRealtime(field, value as string);
        if (!validation.isValid) {
          hasErrors = true;
          validationErrors[field] = validation.message || 'Invalid input';
        }
      });
      
      if (hasErrors) {
        setErrors(validationErrors);
        return;
      }
      
      // Prepare update data for contractor service
      const updateData = { ...sectionData };
      
      // Convert string numbers back to numbers for API
      if (updateData.established_year) updateData.established_year = parseInt(updateData.established_year as string);
      if (updateData.employee_count) updateData.employee_count = parseInt(updateData.employee_count as string);
      if (updateData.years_experience) updateData.years_experience = parseInt(updateData.years_experience as string);
      if (updateData.latitude) updateData.latitude = parseFloat(updateData.latitude as string);
      if (updateData.longitude) updateData.longitude = parseFloat(updateData.longitude as string);
      
      console.log('💾 Saving contractor profile section:', section, updateData);
      
      // Call the contractor service to update
      const result = await contractorService.updateProfile(updateData);
      
      if (result.success) {
        console.log('✅ Contractor profile section saved successfully');
        setSuccessMessage(t('contractorApp.profile.saveSuccess') || 'Profile updated successfully');
        
        // Update local contractor profile state
        if (result.profile) {
          console.log('🔄 Updating contractor profile state with:', result.profile);
          setContractorProfile(result.profile);
        } else {
          console.log('🔄 Profile not returned, refreshing from API...');
          // Refresh profile data if not returned
          const refreshResult = await contractorService.getProfile();
          if (refreshResult.success && refreshResult.profile) {
            console.log('🔄 Refreshed contractor profile:', refreshResult.profile);
            setContractorProfile(refreshResult.profile);
          } else {
            console.error('❌ Failed to refresh contractor profile:', refreshResult.error);
          }
        }
        
        setEditingSection(null);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Call onUpdate callback if provided
        if (onUpdate) {
          onUpdate(section, updateData);
        }
      } else {
        console.error('❌ Failed to save contractor profile:', result.error);
        setErrors({ general: result.error || 'Failed to save profile' });
      }
    } catch (error: any) {
      console.error('❌ Error saving contractor profile:', error);
      setErrors({ general: error.message || t('contractorApp.profile.saveError') || 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  // Get current location
  const handleGetLocation = async () => {
    try {
      clearError();
      console.log('🌍 Getting current location...');
      const position = await getCurrentLocation();
      
      console.log('🌍 Location received:', position);
      
      if (position) {
        console.log('🌍 Updating formData with location:', {
          latitude: position.latitude.toString(),
          longitude: position.longitude.toString()
        });
        
        setFormData(prev => {
          const newFormData = {
            ...prev,
            address: {
              ...prev.address,
              latitude: position.latitude.toString(),
              longitude: position.longitude.toString()
            }
          };
          
          console.log('🌍 New formData:', newFormData);
          return newFormData;
        });
        
        setSuccessMessage(t('contractorApp.profile.locationSuccess') || 'Location retrieved successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (error) {
      console.error('❌ Error getting location:', error);
      setErrors({ location: 'Failed to get location. Please check your browser permissions.' });
    }
  };

  // Styles - Mobile-first approach with enhanced responsive design
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: isMobile ? '10px' : isTablet ? '15px' : '20px',
      direction: isRTL ? 'rtl' as const : 'ltr' as const,
    },
    header: {
      marginBottom: isMobile ? '20px' : '30px',
      textAlign: 'center' as const,
    },
    title: {
      fontSize: isMobile ? '24px' : isTablet ? '28px' : '32px',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '8px',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
    },
    subtitle: {
      fontSize: isMobile ? '14px' : '16px',
      color: '#6b7280',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
    },
    profileHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '20px',
      padding: '20px',
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      flexDirection: isMobile ? 'column' as const : 'row' as const,
      gap: isMobile ? '15px' : '0',
    },
    profileInfo: {
      display: 'flex',
      alignItems: 'center',
      gap: '15px',
      flexDirection: isMobile ? 'column' as const : 'row' as const,
      textAlign: isMobile ? 'center' as const : 'left' as const,
    },
    avatar: {
      width: '60px',
      height: '60px',
      borderRadius: '50%',
      backgroundColor: theme.colors.primary,
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '24px',
      fontWeight: 'bold',
      flexShrink: 0,
    },
    profileText: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '4px',
    },
    profileName: {
      fontSize: isMobile ? '18px' : '20px',
      fontWeight: 'bold',
      color: '#1f2937',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
    },
    profileRole: {
      fontSize: '14px',
      color: '#6b7280',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
    },
    profileStatus: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginTop: '8px',
    },
    mobileMenu: {
      display: isMobile ? 'flex' : 'none',
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '8px',
      marginBottom: '20px',
      overflowX: 'auto' as const,
      gap: '4px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },
    contentLayout: {
      display: 'flex',
      gap: '20px',
      alignItems: 'flex-start',
    },
    leftSidebar: {
      display: isMobile ? 'none' : 'flex',
      flexDirection: 'column' as const,
      width: isTablet ? '200px' : '240px',
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px 0',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      height: 'fit-content',
      position: 'sticky' as const,
      top: '20px',
    },
    menuItem: {
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '0' : '12px',
      padding: isMobile ? '12px 8px' : '12px 20px',
      border: 'none',
      backgroundColor: 'transparent',
      color: '#6b7280',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      fontSize: '14px',
      fontWeight: '500',
      borderRadius: isMobile ? '8px' : '0',
      minWidth: isMobile ? '60px' : 'auto',
      textAlign: 'left' as const,
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
      width: '100%',
      justifyContent: isMobile ? 'center' : 'flex-start',
    },
    activeMenuItem: {
      backgroundColor: isMobile ? 'rgba(62, 178, 177, 0.1)' : '#f0fdfc',
      color: theme.colors.primary,
      borderRight: isMobile ? 'none' : `3px solid ${theme.colors.primary}`,
      fontWeight: '600',
    },
    formContainer: {
      flex: 1,
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: isMobile ? '20px' : '30px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      minHeight: '500px',
    },
    formHeader: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '30px',
      paddingBottom: '20px',
      borderBottom: '1px solid #e5e7eb',
      flexDirection: isMobile ? 'column' as const : 'row' as const,
      gap: isMobile ? '15px' : '0',
    },
    formTitle: {
      fontSize: isMobile ? '20px' : '24px',
      fontWeight: 'bold',
      color: '#1f2937',
      margin: '0',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
    },
    editButton: {
      padding: '8px 16px',
      backgroundColor: theme.colors.primary[500],
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
      ':hover': {
        backgroundColor: theme.colors.primary[600],
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(62, 178, 177, 0.3)',
      },
    },
    fieldsGrid: {
      display: 'grid',
      gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(auto-fit, minmax(300px, 1fr))' : 'repeat(auto-fit, minmax(350px, 1fr))',
      gap: '20px',
      marginBottom: '30px',
    },
    fieldGroup: {
      display: 'flex',
      flexDirection: 'column' as const,
      gap: '8px',
    },
    fieldLabel: {
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
    },
    fieldValue: {
      padding: '12px 16px',
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#1f2937',
      minHeight: '20px',
      display: 'flex',
      alignItems: 'center',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
    },
    input: {
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '8px',
      fontSize: '14px',
      color: '#1f2937',
      backgroundColor: 'white',
      transition: 'all 0.2s ease',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
      width: '100%',
      boxSizing: 'border-box' as const,
    },
    inputValid: {
      borderColor: '#10b981',
      backgroundColor: '#f0fdf4',
    },
    inputInvalid: {
      borderColor: '#ef4444',
      backgroundColor: '#fef2f2',
    },
    buttonGroup: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'flex-end',
      marginTop: '30px',
      flexDirection: isMobile ? 'column' as const : 'row' as const,
    },
    cancelButton: {
      padding: '12px 24px',
      backgroundColor: theme.colors.secondary[200],
      color: theme.colors.secondary[700],
      border: `1px solid ${theme.colors.borders.light}`,
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
      ':hover': {
        backgroundColor: theme.colors.secondary[300],
        borderColor: theme.colors.borders.medium,
        transform: 'translateY(-1px)',
      },
    },
    saveButton: {
      padding: '12px 24px',
      background: theme.colors.gradients.button,
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      cursor: 'pointer',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.2s ease',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
      boxShadow: '0 2px 8px rgba(62, 178, 177, 0.2)',
      ':hover': {
        background: theme.colors.gradients.buttonHover,
        transform: 'translateY(-2px)',
        boxShadow: '0 6px 20px rgba(62, 178, 177, 0.4)',
      },
    },
    successMessage: {
      padding: '12px 16px',
      backgroundColor: theme.colors.semantic.success.light,
      color: theme.colors.semantic.success.dark,
      border: `1px solid ${theme.colors.semantic.success[200]}`,
      borderRadius: '8px',
      fontSize: '14px',
      marginBottom: '20px',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
      display: 'flex',
      alignItems: 'center',
    },
    errorMessage: {
      padding: '12px 16px',
      backgroundColor: theme.colors.semantic.error.light,
      color: theme.colors.semantic.error.dark,
      border: `1px solid ${theme.colors.semantic.error[200]}`,
      borderRadius: '8px',
      fontSize: '14px',
      marginBottom: '20px',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
      display: 'flex',
      alignItems: 'center',
    },
    validationMessage: {
      fontSize: '12px',
      marginTop: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
      color: '#ef4444',
    },
    validationSuccess: {
      color: '#10b981',
    },
    characterCount: {
      fontSize: '11px',
      color: '#9ca3af',
      textAlign: 'right' as const,
      marginTop: '4px',
    },
    locationButton: {
      padding: '8px 12px',
      backgroundColor: '#f3f4f6',
      color: '#374151',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '500',
      transition: 'all 0.2s ease',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
      marginTop: '8px',
    },
    emptyState: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: '#6b7280',
      fontSize: '16px',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
    },
    loadingState: {
      textAlign: 'center' as const,
      padding: '60px 20px',
      color: '#6b7280',
      fontSize: '16px',
      fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
    },
  };

  const renderSelectedForm = () => {
    if (!activeSection) {
      return (
        <div style={styles.emptyState}>
          {t('contractorApp.profile.selectSection')}
        </div>
      );
    }

    if (isLoadingProfile) {
      return (
        <div style={styles.loadingState}>
          {t('common.loading')}
        </div>
      );
    }

    const isEditing = editingSection === activeSection;
    console.log('🔍 Building section data with contractorProfile:', contractorProfile);
    console.log('🔍 Building section data with user:', user);
    

    const sectionData = {
      profile: [
        // Personal Information
        { field: 'first_name', label: t('contractorApp.profile.fields.firstName'), value: user?.first_name || user?.firstName || '', required: true, section: 'personal' },
        { field: 'last_name', label: t('contractorApp.profile.fields.lastName'), value: user?.last_name || user?.lastName || '', required: true, section: 'personal' },
        { field: 'email', label: t('contractorApp.profile.fields.email'), value: user?.email || t('form.business_email_placeholder'), readOnly: true, section: 'personal' },
        { field: 'phone', label: t('contractorApp.profile.fields.phone'), value: user?.phone || t('form.saudi_phone_hint'), readOnly: true, section: 'personal' },
        // Business Information (Profile tab - prioritize auth service data)
        { field: 'company_name', label: t('contractorApp.profile.fields.businessName'), value: user?.company_name || contractorProfile?.business_name || '', required: true, section: 'business' },
        { field: 'cr_number', label: t('contractorApp.profile.fields.crNumber'), value: user?.cr_number || contractorProfile?.commercial_registration || '', section: 'business' },
        { field: 'vat_number', label: t('contractorApp.profile.fields.vatNumber'), value: user?.vat_number || contractorProfile?.vat_number || '', section: 'business' },
        { field: 'business_type', label: t('contractorApp.profile.fields.businessType'), value: user?.business_type || user?.userType || contractorProfile?.business_type || '', type: 'dropdown', section: 'business', options: [
          { value: 'individual', label: t('contractorApp.profile.businessTypes.individual') },
          { value: 'llc', label: t('contractorApp.profile.businessTypes.llc') },
          { value: 'corporation', label: t('contractorApp.profile.businessTypes.corporation') },
          { value: 'partnership', label: t('contractorApp.profile.businessTypes.partnership') },
          { value: 'other', label: t('contractorApp.profile.businessTypes.other') || 'Other' }
        ]},
        // Account Information
        { field: 'role', label: t('userApp.profile.userType'), value: user?.role || 'CONTRACTOR', readOnly: true, section: 'account' },
        { field: 'created_at', label: t('common.createdAt'), value: user?.created_at ? new Date(user.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US') : new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US'), readOnly: true, section: 'account' }
      ],
      personal: [
        // Personal Information
        { field: 'first_name', label: t('contractorApp.profile.fields.firstName'), value: user?.first_name || user?.firstName || '', required: true, section: 'personal' },
        { field: 'last_name', label: t('contractorApp.profile.fields.lastName'), value: user?.last_name || user?.lastName || '', required: true, section: 'personal' },
        { field: 'email', label: t('contractorApp.profile.fields.email'), value: user?.email || t('form.business_email_placeholder'), readOnly: true, section: 'personal' },
        { field: 'phone', label: t('contractorApp.profile.fields.phone'), value: user?.phone || t('form.saudi_phone_hint'), readOnly: true, section: 'personal' },
      ],
      business: [
        // Business Fields (from contractor service - Business tab only)
        { field: 'business_name_ar', label: t('contractorApp.profile.fields.businessNameAr'), value: contractorProfile?.business_name_ar || '' },
        { field: 'established_year', label: t('contractorApp.profile.fields.establishedYear'), value: contractorProfile?.established_year?.toString() || '', type: 'number' },
        { field: 'employee_count', label: t('contractorApp.profile.fields.employeeCount'), value: contractorProfile?.employee_count?.toString() || '', type: 'number' },
        { field: 'description', label: t('contractorApp.profile.fields.description'), value: contractorProfile?.description || '', type: 'textarea' },
        { field: 'description_ar', label: t('contractorApp.profile.fields.descriptionAr'), value: contractorProfile?.description_ar || '', type: 'textarea' },
      ],
      account: [
        // Account Information
        { field: 'role', label: t('userApp.profile.userType'), value: user?.role || 'CONTRACTOR', readOnly: true, section: 'account' },
        { field: 'created_at', label: t('common.createdAt'), value: user?.created_at ? new Date(user.created_at).toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US') : new Date().toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US'), readOnly: true, section: 'account' }
      ],
      contact: [
        // Business contact details (editable - from contractor service)
        { field: 'phone', label: t('contractorApp.profile.fields.businessPhone'), value: contractorProfile?.phone || '', type: 'tel', section: 'additional', placeholder: t('contractorApp.profile.placeholders.businessPhone') || '+966501234567' },
        { field: 'whatsapp', label: t('contractorApp.profile.fields.whatsapp'), value: contractorProfile?.whatsapp || '', type: 'tel', section: 'additional', placeholder: t('contractorApp.profile.placeholders.whatsapp') || '+966501234567' },
        { field: 'website', label: t('contractorApp.profile.fields.website'), value: contractorProfile?.website || '', type: 'url', section: 'additional', placeholder: t('contractorApp.profile.placeholders.website') || 'https://company.com' },
      ],
      address: [
        { field: 'address_line1', label: t('contractorApp.profile.fields.addressLine1'), value: contractorProfile?.address_line1 || '', required: true },
        { field: 'address_line2', label: t('contractorApp.profile.fields.addressLine2'), value: contractorProfile?.address_line2 || '' },
        { field: 'city', label: t('contractorApp.profile.fields.city'), value: contractorProfile?.city || '', required: true },
        { field: 'region', label: t('contractorApp.profile.fields.region'), value: contractorProfile?.region || '', required: true, type: 'dropdown', options: [
          { value: 'Riyadh', label: t('contractorApp.profile.regions.riyadh') },
          { value: 'Makkah', label: t('contractorApp.profile.regions.makkah') },
          { value: 'Madinah', label: t('contractorApp.profile.regions.madinah') },
          { value: 'Qassim', label: t('contractorApp.profile.regions.qassim') },
          { value: 'Eastern Province', label: t('contractorApp.profile.regions.eastern') },
          { value: 'Asir', label: t('contractorApp.profile.regions.asir') },
          { value: 'Tabuk', label: t('contractorApp.profile.regions.tabuk') },
          { value: 'Hail', label: t('contractorApp.profile.regions.hail') },
          { value: 'Northern Borders', label: t('contractorApp.profile.regions.northern') },
          { value: 'Jazan', label: t('contractorApp.profile.regions.jazan') },
          { value: 'Najran', label: t('contractorApp.profile.regions.najran') },
          { value: 'Al Bahah', label: t('contractorApp.profile.regions.bahah') },
          { value: 'Al Jawf', label: t('contractorApp.profile.regions.jawf') },
        ]},
        { field: 'postal_code', label: t('contractorApp.profile.fields.postalCode'), value: contractorProfile?.postal_code || '' },
        { field: 'latitude', label: t('contractorApp.profile.fields.latitude'), value: formData.address.latitude || '', type: 'number', readOnly: true },
        { field: 'longitude', label: t('contractorApp.profile.fields.longitude'), value: formData.address.longitude || '', type: 'number', readOnly: true },
      ],
      verification: [
        { field: 'verification_level', label: t('contractorApp.profile.fields.verificationLevel'), value: contractorProfile?.verification_level?.toString() || '0', readOnly: true, type: 'badge' },
        { field: 'average_rating', label: t('contractorApp.profile.fields.averageRating'), value: contractorProfile?.average_rating?.toString() || '0', readOnly: true, type: 'rating' },
        { field: 'total_reviews', label: t('contractorApp.profile.fields.totalReviews'), value: contractorProfile?.total_reviews?.toString() || '0', readOnly: true },
        { field: 'status', label: t('contractorApp.profile.fields.contractorStatus'), value: contractorProfile?.status || 'pending', readOnly: true, type: 'badge' },
      ],
      preferences: [
        { field: 'preferred_language', label: t('contractorApp.profile.fields.preferredLanguage'), value: user?.preferred_language || i18n.language, type: 'dropdown', options: [
          { value: 'en', label: 'English' },
          { value: 'ar', label: 'العربية' }
        ]},
        { field: 'email_notifications', label: t('contractorApp.profile.fields.emailNotifications'), value: user?.email_notifications ?? true, type: 'toggle' },
        { field: 'sms_notifications', label: t('contractorApp.profile.fields.smsNotifications'), value: user?.sms_notifications ?? true, type: 'toggle' },
        { field: 'marketing_consent', label: t('contractorApp.profile.fields.marketingConsent'), value: user?.marketing_consent ?? false, type: 'toggle' },
      ]
    };

    const fields = sectionData[activeSection as keyof typeof sectionData] || [];
    const menuItem = menuItems.find(item => item.id === activeSection);

    return (
      <div style={styles.formContainer}>
        <div style={styles.formHeader}>
          <h2 style={styles.formTitle}>{menuItem?.label}</h2>
          {activeSection !== 'verification' && activeSection !== 'profile' && activeSection !== 'contact' && (
            <button
              style={styles.editButton}
              onClick={() => setEditingSection(isEditing ? null : activeSection)}
            >
              {isEditing ? t('common.cancel') : t('common.edit')}
            </button>
          )}
        </div>


        {/* SAMA Compliance Indicator */}
        {activeSection !== 'verification' && (
          <div style={{
            padding: '12px 16px',
            backgroundColor: theme.colors.primary[50],
            border: `1px solid ${theme.colors.primary[200]}`,
            borderRadius: '8px',
            fontSize: '14px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={theme.colors.primary[500]}>
              <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/>
            </svg>
            <span style={{ color: theme.colors.primary[600] }}>
              {t('contractorApp.profile.samaCompliance') || 'SAMA CSF Level 4 Compliant - All data is encrypted and securely processed'}
            </span>
          </div>
        )}

        {/* Success Message */}
        {successMessage && (
          <div style={styles.successMessage}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#166534" style={{ marginRight: '8px' }}>
              <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
            </svg>
            {successMessage}
          </div>
        )}

        {/* Error Messages */}
        {errors.general && (
          <div style={styles.errorMessage}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#dc2626" style={{ marginRight: '8px' }}>
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
            {errors.general}
          </div>
        )}

        {/* Special rendering for profile section - single card with grouped sections */}
        {activeSection === 'profile' ? (
          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}>
            {/* Personal Information Section */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0,
                  fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
                  borderBottom: '2px solid #3eb2b1',
                  paddingBottom: '8px'
                }}>
                  {t('contractorApp.profile.personal_info.title')}
                </h3>
                <button
                  style={{
                    ...styles.editButton,
                    fontSize: '14px',
                    padding: '6px 12px'
                  }}
                  onClick={() => setEditingSection(editingSection === 'profile_personal' ? null : 'profile_personal')}
                >
                  {editingSection === 'profile_personal' ? t('common.cancel') : t('common.edit')}
                </button>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
              }}>
                {fields.filter((f: any) => f.section === 'personal').map((fieldData: any) => {
                  const { field, label, value, readOnly, required } = fieldData;
                  const isPersonalEditing = editingSection === 'profile_personal';
                  const isFieldReadOnly = readOnly || field === 'email' || field === 'phone';
                  
                  return (
                    <div key={field} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <label style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif'
                      }}>
                        {label}
                        {required && <span style={{ color: '#ef4444' }}>*</span>}
                        {isFieldReadOnly && (
                          <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>
                            ({t('contractorApp.profile.readOnly')})
                          </span>
                        )}
                      </label>
                      
                      {!isPersonalEditing || isFieldReadOnly ? (
                        <div style={{
                          fontSize: '15px',
                          color: value && value !== t(`contractorApp.profile.placeholders.${field}`) && value !== t(`form.${field}`) && value !== t('form.business_email_placeholder') && value !== t('form.saudi_phone_hint') ? '#1f2937' : '#9ca3af',
                          fontStyle: value && value !== t(`contractorApp.profile.placeholders.${field}`) && value !== t(`form.${field}`) && value !== t('form.business_email_placeholder') && value !== t('form.saudi_phone_hint') ? 'normal' : 'italic',
                          fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
                          padding: '8px 0',
                          borderBottom: '1px solid #f3f4f6',
                          minHeight: '24px'
                        }}>
                          {value || t(`contractorApp.profile.placeholders.${field}`) || t('common.notSet')}
                        </div>
                      ) : (
                        <input
                          type="text"
                          style={{
                            ...styles.input,
                            ...(fieldValidation[field]?.isValid === true ? styles.inputValid : {}),
                            ...(fieldValidation[field]?.isValid === false ? styles.inputInvalid : {})
                          }}
                          value={formData.profile?.[field] || value || ''}
                          onChange={(e) => handleInputChange('profile', field, e.target.value)}
                          placeholder={t(`contractorApp.profile.placeholders.${field}`)}
                        />
                      )}
                      
                      {/* Validation feedback */}
                      {fieldValidation[field] && !fieldValidation[field].isValid && (
                        <div style={styles.validationMessage}>
                          <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          {fieldValidation[field].message}
                        </div>
                      )}
                      
                      {/* Success feedback */}
                      {fieldValidation[field] && fieldValidation[field].isValid && formData.profile?.[field] && (
                        <div style={{ ...styles.validationMessage, ...styles.validationSuccess }}>
                          <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                          </svg>
                          {t('validation.validInput') || 'Valid'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Save/Cancel buttons for Personal section */}
              {editingSection === 'profile_personal' && (
                <div style={styles.buttonGroup}>
                  <button 
                    style={styles.cancelButton} 
                    onClick={() => handleCancel('profile_personal')}
                    disabled={saving}
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    style={{
                      ...styles.saveButton,
                      opacity: saving ? 0.7 : 1,
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }} 
                    onClick={() => handleSave('profile_personal')}
                    disabled={saving}
                  >
                    {saving ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              )}
            </div>

            {/* Business Information Section */}
            <div style={{ marginBottom: '32px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0,
                  fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
                  borderBottom: '2px solid #3eb2b1',
                  paddingBottom: '8px'
                }}>
                  {t('contractorApp.profile.business_info.title')}
                </h3>
                <button
                  style={{
                    ...styles.editButton,
                    fontSize: '14px',
                    padding: '6px 12px'
                  }}
                  onClick={() => setEditingSection(editingSection === 'profile_business' ? null : 'profile_business')}
                >
                  {editingSection === 'profile_business' ? t('common.cancel') : t('common.edit')}
                </button>
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
              }}>
                {fields.filter((f: any) => f.section === 'business').map((fieldData: any) => {
                  const { field, label, value, required, type, options } = fieldData;
                  const isBusinessEditing = editingSection === 'profile_business';
                  
                  return (
                    <div key={field} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <label style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif'
                      }}>
                        {label}
                        {required && <span style={{ color: '#ef4444' }}>*</span>}
                      </label>
                      
                      {!isBusinessEditing ? (
                        <div style={{
                          fontSize: '15px',
                          color: value ? '#1f2937' : '#9ca3af',
                          fontStyle: value ? 'normal' : 'italic',
                          fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
                          padding: '8px 0',
                          borderBottom: '1px solid #f3f4f6',
                          minHeight: '24px'
                        }}>
                          {value || t(`contractorApp.profile.placeholders.${field}`) || t('common.notSet')}
                        </div>
                      ) : (
                        type === 'dropdown' ? (
                          <select
                            style={styles.input}
                            value={formData.profile?.[field] || value || ''}
                            onChange={(e) => handleInputChange('profile', field, e.target.value)}
                          >
                            <option value="">{t('common.selectOption')}</option>
                            {options?.map((option: any) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="text"
                            style={{
                              ...styles.input,
                              ...(fieldValidation[field]?.isValid === true ? styles.inputValid : {}),
                              ...(fieldValidation[field]?.isValid === false ? styles.inputInvalid : {})
                            }}
                            value={formData.profile?.[field] || value || ''}
                            onChange={(e) => handleInputChange('profile', field, e.target.value)}
                            placeholder={t(`contractorApp.profile.placeholders.${field}`)}
                          />
                        )
                      )}
                      
                      {/* Validation feedback */}
                      {fieldValidation[field] && !fieldValidation[field].isValid && (
                        <div style={styles.validationMessage}>
                          <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          {fieldValidation[field].message}
                        </div>
                      )}
                      
                      {/* Success feedback */}
                      {fieldValidation[field] && fieldValidation[field].isValid && formData.profile?.[field] && (
                        <div style={{ ...styles.validationMessage, ...styles.validationSuccess }}>
                          <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                          </svg>
                          {t('validation.validInput') || 'Valid'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Save/Cancel buttons for Business section */}
              {editingSection === 'profile_business' && (
                <div style={styles.buttonGroup}>
                  <button 
                    style={styles.cancelButton} 
                    onClick={() => handleCancel('profile_business')}
                    disabled={saving}
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    style={{
                      ...styles.saveButton,
                      opacity: saving ? 0.7 : 1,
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }} 
                    onClick={() => handleSave('profile_business')}
                    disabled={saving}
                  >
                    {saving ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              )}
            </div>

            {/* Account Information Section */}
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '16px',
                fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
                borderBottom: '2px solid #3eb2b1',
                paddingBottom: '8px'
              }}>
                {t('contractorApp.profile.authServiceInfo.title')}
                <span style={{ fontSize: '12px', color: '#9ca3af', fontWeight: 'normal', marginLeft: '8px' }}>
                  ({t('contractorApp.profile.readOnly')})
                </span>
              </h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
              }}>
                {fields.filter((f: any) => f.section === 'account').map((fieldData: any) => {
                  const { field, label, value } = fieldData;
                  return (
                    <div key={field} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <label style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif'
                      }}>
                        {label}
                      </label>
                      <div style={{
                        fontSize: '15px',
                        color: value && value !== t(`contractorApp.profile.placeholders.${field}`) && value !== t(`form.${field}`) && value !== t('form.business_email_placeholder') && value !== t('form.saudi_phone_hint') ? '#1f2937' : '#9ca3af',
                        fontStyle: value && value !== t(`contractorApp.profile.placeholders.${field}`) && value !== t(`form.${field}`) && value !== t('form.business_email_placeholder') && value !== t('form.saudi_phone_hint') ? 'normal' : 'italic',
                        fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
                        padding: '8px 0',
                        borderBottom: '1px solid #f3f4f6',
                        minHeight: '24px'
                      }}>
                        {value}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : activeSection === 'contact' ? (
          <div style={{
            background: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          }}>
            {/* Contact Details Section */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  margin: 0,
                  fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
                  borderBottom: '2px solid #3eb2b1',
                  paddingBottom: '8px'
                }}>
                  {t('contractorApp.profile.contactMethods.title')}
                </h3>
                <button
                  style={{
                    ...styles.editButton,
                    fontSize: '14px',
                    padding: '6px 12px'
                  }}
                  onClick={() => setEditingSection(editingSection === 'contact_additional' ? null : 'contact_additional')}
                >
                  {editingSection === 'contact_additional' ? t('common.cancel') : t('common.edit')}
                </button>
              </div>
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                marginBottom: '16px',
                fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
              }}>
                {t('contractorApp.profile.contactMethods.description')}
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '20px',
              }}>
                {fields.filter((f: any) => f.section === 'additional').map((fieldData: any) => {
                  const { field, label, value, placeholder, type } = fieldData;
                  const isAdditionalEditing = editingSection === 'contact_additional';
                  
                  return (
                    <div key={field} style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}>
                      <label style={{
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#374151',
                        fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif'
                      }}>
                        {label}
                        <span style={{ fontSize: '12px', color: '#9ca3af', marginLeft: '8px' }}>
                          ({t('common.optional')})
                        </span>
                      </label>
                      
                      {!isAdditionalEditing ? (
                        <div style={{
                          fontSize: '15px',
                          color: value ? '#1f2937' : '#9ca3af',
                          fontStyle: value ? 'normal' : 'italic',
                          fontFamily: isRTL ? 'Cairo, sans-serif' : 'Inter, sans-serif',
                          padding: '8px 0',
                          borderBottom: '1px solid #f3f4f6',
                          minHeight: '24px'
                        }}>
                          {value || placeholder || t('common.notSet')}
                        </div>
                      ) : (
                        <div style={{ width: '100%' }}>
                          <input
                            type={type || 'text'}
                            style={{
                              ...styles.input,
                              ...(fieldValidation[field]?.isValid === true ? styles.inputValid : {}),
                              ...(fieldValidation[field]?.isValid === false ? styles.inputInvalid : {})
                            }}
                            value={formData.contact?.[field] || value || ''}
                            onChange={(e) => handleInputChange('contact', field, e.target.value)}
                            placeholder={placeholder}
                          />
                          
                          {/* Validation feedback */}
                          {fieldValidation[field] && !fieldValidation[field].isValid && (
                            <div style={styles.validationMessage}>
                              <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                              </svg>
                              {fieldValidation[field].message}
                            </div>
                          )}
                          
                          {/* Success feedback */}
                          {fieldValidation[field] && fieldValidation[field].isValid && formData.contact?.[field] && (
                            <div style={{ ...styles.validationMessage, ...styles.validationSuccess }}>
                              <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                              </svg>
                              {t('validation.validInput') || 'Valid'}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              
              {/* Save/Cancel buttons for Additional Contact section */}
              {editingSection === 'contact_additional' && (
                <div style={styles.buttonGroup}>
                  <button 
                    style={styles.cancelButton} 
                    onClick={() => handleCancel('contact_additional')}
                    disabled={saving}
                  >
                    {t('common.cancel')}
                  </button>
                  <button 
                    style={{
                      ...styles.saveButton,
                      opacity: saving ? 0.7 : 1,
                      cursor: saving ? 'not-allowed' : 'pointer'
                    }} 
                    onClick={() => handleSave('contact_additional')}
                    disabled={saving}
                  >
                    {saving ? t('common.saving') : t('common.save')}
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div style={styles.fieldsGrid}>
            {fields.map((fieldData: any) => {
            const { field, label, value, type, options, readOnly, required } = fieldData;
            const isReadOnly = readOnly || activeSection === 'verification';
            
            // Get input type based on field
            const getInputType = (fieldName: string) => {
              if (fieldName.includes('email')) return 'email';
              if (fieldName.includes('phone') || fieldName.includes('whatsapp')) return 'tel';
              if (fieldName.includes('website')) return 'url';
              if (type === 'number') return 'number';
              return 'text';
            };
            
            const inputType = getInputType(field);
            
            // Check if this is a toggle field
            const isToggleField = type === 'toggle';
            
            // Get current value from formData for toggle fields
            const currentValue = (type === 'toggle' || type === 'language') 
              ? formData[activeSection as keyof typeof formData][field as keyof typeof formData[typeof activeSection]]
              : value;
            
            return (
              <div key={field} style={styles.fieldGroup}>
                <label style={styles.fieldLabel}>
                  {label}
                  {required && <span style={{ color: '#ef4444' }}>*</span>}
                  {isReadOnly && (
                    <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                      ({t('contractorApp.profile.readOnly')})
                    </span>
                  )}
                </label>
                
                {/* Toggle fields - always visible and interactive */}
                {isToggleField ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Custom Toggle Switch */}
                    <div 
                      onClick={() => isEditing && handleInputChange(activeSection, field, !currentValue)}
                      style={{
                        width: '48px',
                        height: '24px',
                        backgroundColor: currentValue ? '#3eb2b1' : '#d1d5db',
                        borderRadius: '12px',
                        position: 'relative',
                        cursor: isEditing ? 'pointer' : 'not-allowed',
                        transition: 'background-color 0.2s ease',
                        opacity: isEditing ? 1 : 0.7,
                        border: '2px solid transparent',
                        boxShadow: currentValue ? '0 2px 4px rgba(62, 178, 177, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
                      }}
                    >
                      <div
                        style={{
                          width: '18px',
                          height: '18px',
                          backgroundColor: '#ffffff',
                          borderRadius: '50%',
                          position: 'absolute',
                          top: '1px',
                          left: currentValue ? '27px' : '1px',
                          transition: 'left 0.2s ease',
                          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)'
                        }}
                      />
                      {/* Hidden checkbox for accessibility */}
                      <input
                        type="checkbox"
                        checked={currentValue as boolean}
                        onChange={() => {}} // Handled by div click
                        style={{ 
                          position: 'absolute',
                          opacity: 0,
                          width: '100%',
                          height: '100%',
                          margin: 0,
                          cursor: 'pointer'
                        }}
                        disabled={!isEditing}
                      />
                    </div>
                    <span style={{ 
                      color: currentValue ? '#059669' : '#6b7280', 
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      {currentValue ? t('common.enabled') || 'Enabled' : t('common.disabled') || 'Disabled'}
                    </span>
                  </div>
                ) : (!isEditing || isReadOnly) ? (
                  type === 'badge' && field === 'verification_level' ? (
                    <div style={styles.fieldValue}>
                      <VerificationBadge status={parseInt(value) > 0 ? 'verified' : 'not_verified'} />
                    </div>
                  ) : type === 'badge' && field === 'status' ? (
                    <div style={styles.fieldValue}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500',
                        backgroundColor: value === 'active' ? '#dcfce7' : value === 'verified' ? '#dbeafe' : '#fef3c7',
                        color: value === 'active' ? '#166534' : value === 'verified' ? '#1e40af' : '#92400e'
                      }}>
                        {t(`contractorApp.profile.statusTypes.${value}`) || value}
                      </span>
                    </div>
                  ) : type === 'rating' ? (
                    <div style={styles.fieldValue}>
                      {value} ⭐ ({contractorProfile?.total_reviews || 0} {t('contractorApp.profile.reviews')})
                    </div>
                  ) : type === 'multiselect' ? (
                    !isEditing || isReadOnly ? (
                      <div style={styles.fieldValue}>
                        {Array.isArray(value) && value.length > 0 ? 
                          value.map(val => {
                            // Find the option label for this value
                            const option = options?.find(opt => opt.value === val);
                            return option ? option.label : val;
                          }).join(', ') 
                          : (t('common.notSet') || 'None selected')
                        }
                      </div>
                    ) : (
                      <div style={{ width: '100%' }}>
                        <Multiselect
                          options={options || []}
                          value={(() => {
                            const currentValue = formData[activeSection as keyof typeof formData][field as keyof typeof formData[typeof activeSection]];
                            // Ensure we always return a clean array
                            return Array.isArray(currentValue) ? currentValue : parseArrayField(currentValue);
                          })()}
                          onChange={(values) => handleInputChange(activeSection, field, values)}
                          placeholder={t(`contractorApp.profile.placeholders.${field}`) || t('common.selectOptions') || 'Select options...'}
                          disabled={!isEditing || isReadOnly}
                        searchable={true}
                        clearable={true}
                        maxHeight={200}
                        error={!!fieldValidation[field] && !fieldValidation[field].isValid}
                      />
                      
                      {/* Validation feedback for multiselect */}
                      {fieldValidation[field] && !fieldValidation[field].isValid && (
                        <div style={styles.validationMessage}>
                          <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          {fieldValidation[field].message}
                        </div>
                      )}
                      
                      {/* Success feedback for multiselect */}
                      {fieldValidation[field] && fieldValidation[field].isValid && Array.isArray(formData[activeSection as keyof typeof formData][field as keyof typeof formData[typeof activeSection]]) && (formData[activeSection as keyof typeof formData][field as keyof typeof formData[typeof activeSection]] as string[]).length > 0 && (
                        <div style={{ ...styles.validationMessage, ...styles.validationSuccess }}>
                          <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                          </svg>
                          {t('validation.validInput') || 'Valid'}
                        </div>
                      )}
                      </div>
                    )
                  ) : (
                    <div style={styles.fieldValue}>
                      {activeSection === 'profile' ? (
                        <span style={{ 
                          color: value && value !== t(`contractorApp.profile.placeholders.${field}`) && value !== t(`form.${field}`) && value !== t('form.business_email_placeholder') && value !== t('form.saudi_phone_hint') ? '#1f2937' : '#9ca3af',
                          fontStyle: value && value !== t(`contractorApp.profile.placeholders.${field}`) && value !== t(`form.${field}`) && value !== t('form.business_email_placeholder') && value !== t('form.saudi_phone_hint') ? 'normal' : 'italic'
                        }}>
                          {value}
                        </span>
                      ) : (
                        value || t('common.notSet')
                      )}
                    </div>
                  )
                ) : isEditing && !isReadOnly ? (
                  type === 'multiselect' ? (
                    // Multiselect is handled above in the main section
                    null
                  ) : type === 'dropdown' ? (
                    <select
                      style={styles.input}
                      value={formData[activeSection as keyof typeof formData][field as keyof typeof formData[typeof activeSection]]}
                      onChange={(e) => handleInputChange(activeSection, field, e.target.value)}
                    >
                      <option value="">{t('common.selectOption')}</option>
                      {options?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  ) : type === 'textarea' ? (
                    <textarea
                      style={{...styles.input, minHeight: '80px', resize: 'vertical'}}
                      value={formData[activeSection as keyof typeof formData][field as keyof typeof formData[typeof activeSection]]}
                      onChange={(e) => handleInputChange(activeSection, field, e.target.value)}
                      placeholder={t(`contractorApp.profile.placeholders.${field}`)}
                    />
                  ) : type === 'language' ? (
                    <select
                      style={styles.input}
                      value={currentValue as string}
                      onChange={(e) => {
                        handleInputChange(activeSection, field, e.target.value);
                        i18n.changeLanguage(e.target.value);
                      }}
                    >
                      <option value="ar">{t('languages.ar')}</option>
                      <option value="en">{t('languages.en')}</option>
                    </select>
                  ) : (
                    <div style={{ width: '100%' }}>
                      <input
                        type={inputType}
                        style={{
                          ...styles.input,
                          ...(fieldValidation[field]?.isValid === true ? styles.inputValid : {}),
                          ...(fieldValidation[field]?.isValid === false ? styles.inputInvalid : {})
                        }}
                        value={formData[activeSection as keyof typeof formData][field as keyof typeof formData[typeof activeSection]]}
                        onChange={(e) => handleInputChange(activeSection, field, e.target.value)}
                        placeholder={t(`contractorApp.profile.placeholders.${field}`)}
                        min={inputType === 'number' && field.includes('year') ? '1900' : undefined}
                        max={inputType === 'number' && field.includes('year') ? new Date().getFullYear().toString() : undefined}
                        step={inputType === 'number' ? '1' : undefined}
                        maxLength={
                          ['business_name', 'business_name_ar'].includes(field) ? 100 :
                          ['city', 'region'].includes(field) ? 30 : 
                          ['address_line1', 'address_line2'].includes(field) ? 100 :
                          field === 'description' || field === 'description_ar' ? 500 : undefined
                        }
                      />
                      
                      {/* Character count for text fields */}
                      {['business_name', 'business_name_ar', 'description', 'description_ar', 'address_line1', 'address_line2'].includes(field) && (
                        <div style={styles.characterCount}>
                          {(formData[activeSection as keyof typeof formData][field as keyof typeof formData[typeof activeSection]] as string).length} / {
                            ['business_name', 'business_name_ar'].includes(field) ? 100 :
                            ['description', 'description_ar'].includes(field) ? 500 : 100
                          }
                        </div>
                      )}
                      
                      {/* Validation feedback */}
                      {fieldValidation[field] && !fieldValidation[field].isValid && (
                        <div style={styles.validationMessage}>
                          <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          {fieldValidation[field].message}
                        </div>
                      )}
                      
                      {/* Success feedback */}
                      {fieldValidation[field] && fieldValidation[field].isValid && formData[activeSection as keyof typeof formData][field as keyof typeof formData[typeof activeSection]] && (
                        <div style={{ ...styles.validationMessage, ...styles.validationSuccess }}>
                          <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                            <path d="M9 16.17L4.83 12L3.41 13.41L9 19L21 7L19.59 5.59L9 16.17Z"/>
                          </svg>
                          {t('validation.validInput') || 'Valid'}
                        </div>
                      )}
                      
                      {/* Error message for this field */}
                      {errors[field] && (
                        <div style={styles.validationMessage}>
                          <svg style={{ width: '14px', height: '14px', fill: 'currentColor' }} viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                          </svg>
                          {errors[field]}
                        </div>
                      )}
                      
                    </div>
                  )
                ) : null}
              </div>
            );
          })}
          </div>
        )}

        {/* GPS Location Section for Address */}
        {activeSection === 'address' && isEditing && (
          <div style={{ marginBottom: '20px' }}>
            <button
              onClick={handleGetLocation}
              disabled={geoLoading}
              style={{
                ...styles.locationButton,
                opacity: geoLoading ? 0.7 : 1,
                cursor: geoLoading ? 'not-allowed' : 'pointer'
              }}
            >
              {geoLoading ? t('contractorApp.profile.gettingLocation') : t('contractorApp.profile.getLocation')}
            </button>
            {geoError && (
              <div style={styles.validationMessage}>
                {geoError}
              </div>
            )}
          </div>
        )}

        {isEditing && activeSection !== 'verification' && activeSection !== 'profile' && (
          <div style={styles.buttonGroup}>
            <button 
              style={styles.cancelButton} 
              onClick={() => handleCancel(activeSection)}
              disabled={saving}
            >
              {t('common.cancel')}
            </button>
            <button 
              style={{
                ...styles.saveButton,
                opacity: saving ? 0.7 : 1,
                cursor: saving ? 'not-allowed' : 'pointer'
              }} 
              onClick={() => handleSave(activeSection)}
              disabled={saving}
            >
              {saving ? t('common.saving') : t('common.save')}
            </button>
          </div>
        )}
      </div>
    );
  };

  if (isLoadingProfile) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingState}>
          {t('contractorApp.profile.loading') || 'Loading contractor profile...'}
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>

      {/* Profile Header */}
      <div style={styles.profileHeader}>
        <div style={styles.profileInfo}>
          <div style={styles.avatar}>
            {(contractorProfile?.business_name || user.first_name || 'C').charAt(0).toUpperCase()}
          </div>
          <div style={styles.profileText}>
            <div style={styles.profileName}>
              {contractorProfile?.business_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || t('common.unknown')}
            </div>
            <div style={styles.profileRole}>
              {t('contractorApp.badge.contractor')}
            </div>
            <div style={styles.profileStatus}>
              <VerificationBadge status={verificationStatus} />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <div style={styles.mobileMenu}>
        {menuItems.map(item => (
          <button
            key={item.id}
            style={{
              ...styles.menuItem,
              ...(activeSection === item.id ? styles.activeMenuItem : {})
            }}
            onClick={() => setActiveSection(item.id)}
          >
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
          </button>
        ))}
      </div>

      {/* Main Content Layout */}
      <div style={styles.contentLayout}>
        {/* Left Sidebar Menu */}
        <div style={styles.leftSidebar}>
          {menuItems.map(item => (
            <button
              key={item.id}
              style={{
                ...styles.menuItem,
                ...(activeSection === item.id ? styles.activeMenuItem : {})
              }}
              onClick={() => setActiveSection(item.id)}
              onMouseEnter={(e) => {
                if (activeSection !== item.id) {
                  e.currentTarget.style.background = 'rgba(62, 178, 177, 0.08)';
                  e.currentTarget.style.color = '#3eb2b1';
                }
              }}
              onMouseLeave={(e) => {
                if (activeSection !== item.id) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        {/* Form Content */}
        {renderSelectedForm()}
      </div>
    </div>
  );
};

export default ContractorProfile;