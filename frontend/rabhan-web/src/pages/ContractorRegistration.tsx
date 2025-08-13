import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { apiService } from '../services/api.service';
import { authService } from '../services/auth.service';

// Custom checkbox styles
const checkboxStyles = `
.custom-checkbox {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  position: relative;
  transition: all 0.2s ease;
  flex-shrink: 0;
  margin-top: 0.25rem;
}

.custom-checkbox:hover {
  border-color: #3eb2b1;
}

.custom-checkbox:checked {
  background: #3eb2b1;
  border-color: #3eb2b1;
}

.custom-checkbox:checked::after {
  content: '';
  position: absolute;
  left: 5px;
  top: 2px;
  width: 4px;
  height: 8px;
  border: solid white;
  border-width: 0 2px 2px 0;
  transform: rotate(45deg);
}

.custom-checkbox:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
`;

// Inject styles
if (!document.querySelector('#contractor-registration-checkbox-styles')) {
  const style = document.createElement('style');
  style.id = 'contractor-registration-checkbox-styles';
  style.textContent = checkboxStyles;
  document.head.appendChild(style);
}

interface ContractorFormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  companyName: string;
  crNumber: string;
  vatNumber: string;
  userType: string;
  agreeToTerms: boolean;
}

interface PhoneVerificationState {
  isVerified: boolean;
  otpSent: boolean;
  otp: string;
  isVerifying: boolean;
  isSendingOTP: boolean;
  resendCountdown: number;
}

interface ContractorRegistrationProps {
  onBack?: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onComplete?: (userData: any) => void;
}

const ContractorRegistration: React.FC<ContractorRegistrationProps> = ({
  onBack,
  onLogin,
  onRegister,
  onComplete
}) => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [formData, setFormData] = useState<ContractorFormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    companyName: '',
    crNumber: '',
    vatNumber: '',
    userType: 'BUSINESS',
    agreeToTerms: false
  });

  const [errors, setErrors] = useState<Partial<ContractorFormData & { general?: string; otp?: string }>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Phone verification state
  const [phoneVerification, setPhoneVerification] = useState<PhoneVerificationState>({
    isVerified: false,
    otpSent: false,
    otp: '',
    isVerifying: false,
    isSendingOTP: false,
    resendCountdown: 0
  });

  // Phone country selection
  const [selectedCountry, setSelectedCountry] = useState({ code: '+966', flag: '🇸🇦', name: t('countries.saudi_arabia'), digits: 9 });
  
  const countries = [
    { code: '+966', flag: '🇸🇦', name: t('countries.saudi_arabia'), digits: 9, format: '5XX XXX XXXX' },
    { code: '+91', flag: '🇮🇳', name: t('countries.india'), digits: 10, format: 'XXXXX XXXXX' }
  ];

  // Responsive breakpoint state
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);


  const validateField = (field: keyof ContractorFormData, value: any): string | null => {
    switch (field) {
      case 'firstName':
        if (!value.trim()) return t('validation.firstName_required');
        if (value.length < 2) return t('validation.firstName_minLength');
        if (value.length > 50) return t('validation.firstName_maxLength');
        if (!/^[a-zA-Z\u0600-\u06FF\s'-]+$/.test(value.trim())) return t('validation.firstName_invalid');
        if (/^\s|\s$/.test(value)) return t('validation.firstName_spaces');
        if (/\s{2,}/.test(value)) return t('validation.firstName_consecutive');
        return null;

      case 'lastName':
        if (!value.trim()) return t('validation.lastName_required');
        if (value.length < 2) return t('validation.lastName_minLength');
        if (value.length > 50) return t('validation.lastName_maxLength');
        if (!/^[a-zA-Z\u0600-\u06FF\s'-]+$/.test(value.trim())) return t('validation.lastName_invalid');
        if (/^\s|\s$/.test(value)) return t('validation.lastName_spaces');
        if (/\s{2,}/.test(value)) return t('validation.lastName_consecutive');
        return null;

      case 'email':
        if (!value.trim()) return t('validation.email_required');
        const emailTrimmed = value.trim().toLowerCase();
        if (emailTrimmed.length > 100) return t('validation.email_maxLength');
        // Comprehensive email validation
        const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
        if (!emailRegex.test(emailTrimmed)) return t('validation.email_invalid');
        // Business email domain validation
        const commonPersonalDomains = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com', 'live.com'];
        const domain = emailTrimmed.split('@')[1];
        if (commonPersonalDomains.includes(domain)) return t('validation.email_business');
        if (emailTrimmed.includes('..')) return t('validation.email_consecutive');
        if (emailTrimmed.startsWith('.') || emailTrimmed.endsWith('.')) return t('validation.email_dots');
        return null;

      case 'password':
        if (!value) return t('validation.password_required');
        if (value.length < 8) return t('validation.password_min_length');
        if (value.length > 128) return t('validation.password_maxLength');
        if (!/(?=.*[a-z])/.test(value)) return t('validation.password_lowercase');
        if (!/(?=.*[A-Z])/.test(value)) return t('validation.password_uppercase');
        if (!/(?=.*\d)/.test(value)) return t('validation.password_number');
        if (!/(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?])/.test(value)) return t('validation.password_special');
        if (/\s/.test(value)) return t('validation.password_spaces');
        // Check for common weak patterns
        if (/(.)\1{2,}/.test(value)) return t('validation.password_consecutive');
        const commonPasswords = ['password', 'Password', 'PASSWORD', '12345678', 'qwerty', 'abc123', 'password123', 'admin123'];
        if (commonPasswords.some(common => value.toLowerCase().includes(common.toLowerCase()))) {
          return t('validation.password_common');
        }
        return null;

      case 'confirmPassword':
        if (!value) return t('validation.confirm_password_required');
        if (value !== formData.password) return t('validation.confirm_password_mismatch');
        return null;

      case 'phone':
        if (!value.trim()) return t('validation.phone_business_required');
        const phoneDigits = value.replace(/\D/g, '');
        
        // Country-specific validation
        if (selectedCountry.code === '+966') {
          if (phoneDigits.length !== 9) return t('validation.phone_saudi_invalid');
          if (!phoneDigits.startsWith('5')) return t('validation.phone_saudi_invalid');
          if (!/^5[0-9]{8}$/.test(phoneDigits)) return t('validation.phone_saudi_invalid');
        } else if (selectedCountry.code === '+91') {
          if (phoneDigits.length !== 10) return t('validation.phone_indian_invalid');
          if (!['6', '7', '8', '9'].includes(phoneDigits[0])) return t('validation.phone_indian_invalid');
        }
        
        // If phone is provided, it must be verified
        if (value.trim() && !phoneVerification.isVerified) {
          return t('validation.phone_must_verify');
        }
        return null;

      case 'companyName':
        if (!value.trim()) return t('validation.company_name_required');
        if (value.length < 2) return t('validation.company_name_minLength');
        if (value.length > 100) return t('validation.company_name_maxLength');
        if (!/^[a-zA-Z0-9\u0600-\u06FF\s\-&.,()]+$/.test(value.trim())) return t('validation.company_name_invalid');
        if (/^\s|\s$/.test(value)) return t('validation.company_name_spaces');
        if (/\s{2,}/.test(value)) return t('validation.company_name_consecutive');
        return null;

      case 'crNumber':
        // CR Number is required
        if (!value || !value.trim()) return t('validation.cr_number_required');
        const crTrimmed = value.trim();
        if (!/^[0-9]+$/.test(crTrimmed)) return t('validation.cr_number_digits');
        if (crTrimmed.length !== 10) return t('validation.cr_number_length');
        if (!crTrimmed.startsWith('10') && !crTrimmed.startsWith('20') && !crTrimmed.startsWith('30') && !crTrimmed.startsWith('40')) {
          return t('validation.cr_number_start');
        }
        return null;

      case 'vatNumber':
        // VAT Number is required
        if (!value || !value.trim()) return t('validation.vat_number_required');
        const vatTrimmed = value.trim();
        if (!/^[0-9]+$/.test(vatTrimmed)) return t('validation.vat_number_digits');
        if (vatTrimmed.length !== 15) return t('validation.vat_number_length');
        if (!vatTrimmed.startsWith('3') || !vatTrimmed.endsWith('3')) {
          return t('validation.vat_number_format');
        }
        return null;

      case 'agreeToTerms':
        if (!value) return t('validation.terms_required');
        return null;

      default:
        return null;
    }
  };

  const sanitizeInput = (field: keyof ContractorFormData, value: any): any => {
    if (typeof value !== 'string') return value;
    
    switch (field) {
      case 'firstName':
      case 'lastName':
        // Remove leading/trailing whitespace, limit to 50 chars, allow only letters, spaces, hyphens, apostrophes
        return value.slice(0, 50).replace(/[^a-zA-Z\u0600-\u06FF\s'-]/g, '');
        
      case 'email':
        // Convert to lowercase, remove spaces, limit to 100 chars
        return value.trim().toLowerCase().slice(0, 100);
        
      case 'companyName':
        // Limit to 100 chars, allow letters, numbers, spaces, and business symbols
        return value.slice(0, 100).replace(/[^a-zA-Z0-9\u0600-\u06FF\s\-&.,()]/g, '');
        
      case 'phone':
        // Remove all non-digits, limit based on selected country
        const digits = value.replace(/\D/g, '');
        return digits.slice(0, selectedCountry.digits);
        
      case 'crNumber':
        // Remove all non-digits, limit to 10 chars
        return value.replace(/\D/g, '').slice(0, 10);
        
      case 'vatNumber':
        // Remove all non-digits, limit to 15 chars
        return value.replace(/\D/g, '').slice(0, 15);
        
      case 'password':
      case 'confirmPassword':
        // Remove spaces, limit to 128 chars
        return value.replace(/\s/g, '').slice(0, 128);
        
      default:
        return value;
    }
  };

  const handleInputChange = (field: keyof ContractorFormData, value: any) => {
    // Sanitize input first
    const sanitizedValue = sanitizeInput(field, value);
    
    setFormData(prev => ({ ...prev, [field]: sanitizedValue }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Real-time validation for critical fields with debounced validation
    if (['email', 'password', 'confirmPassword', 'companyName', 'firstName', 'lastName'].includes(field) && sanitizedValue) {
      // Debounce validation to avoid excessive validation during typing
      setTimeout(() => {
        const error = validateField(field, sanitizedValue);
        if (error) {
          setErrors(prev => ({ ...prev, [field]: error }));
        }
      }, 500);
    }

    // Immediate validation for certain fields
    if (field === 'confirmPassword' && sanitizedValue) {
      const error = validateField(field, sanitizedValue);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
      }
    }

    // Reset phone verification when phone changes
    if (field === 'phone') {
      setPhoneVerification({
        isVerified: false,
        otpSent: false,
        otp: '',
        isVerifying: false,
        isSendingOTP: false,
        resendCountdown: 0
      });
    }
  };

  // Additional security validations
  const validateFormSecurity = (): { isValid: boolean; errors: Partial<ContractorFormData & { general?: string }> } => {
    const securityErrors: Partial<ContractorFormData & { general?: string }> = {};
    
    // Check for suspicious patterns
    const suspiciousPatterns = [
      /script/i, /javascript/i, /alert/i, /onclick/i, /onerror/i,
      /<[^>]*>/g, // HTML tags
      /[<>'"]/g, // Potential XSS characters
    ];
    
    Object.entries(formData).forEach(([key, value]) => {
      if (typeof value === 'string') {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(value)) {
            (securityErrors as any)[key] = t('validation.invalid_characters');
            break;
          }
        }
      }
    });
    
    // Additional business logic validations
    if (formData.firstName && formData.lastName && formData.firstName.toLowerCase() === formData.lastName.toLowerCase()) {
      securityErrors.lastName = t('validation.names_identical');
    }
    
    // Email domain additional checks
    if (formData.email) {
      const domain = formData.email.split('@')[1];
      if (domain) {
        // Check for suspicious domains
        const suspiciousDomains = ['10minutemail.com', 'tempmail.org', 'guerrillamail.com', 'mailinator.com'];
        if (suspiciousDomains.some(d => domain.includes(d))) {
          securityErrors.email = t('validation.temp_email');
        }
        
        // Check domain length
        if (domain.length < 4 || domain.length > 63) {
          securityErrors.email = t('validation.email_domain_invalid');
        }
      }
    }
    
    // Company name business validation
    if (formData.companyName) {
      const commonInvalidCompanyNames = ['test', 'company', 'business', 'corp', 'inc', 'ltd', 'llc'];
      if (commonInvalidCompanyNames.includes(formData.companyName.toLowerCase().trim())) {
        securityErrors.companyName = t('validation.company_name_generic');
      }
    }
    
    return {
      isValid: Object.keys(securityErrors).length === 0,
      errors: securityErrors
    };
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<ContractorFormData & { general?: string }> = {};
    
    // First run standard validations
    Object.keys(formData).forEach(key => {
      const field = key as keyof ContractorFormData;
      
      const error = validateField(field, formData[field]);
      if (error) {
        (newErrors as any)[field] = error;
      }
    });
    
    // Then run security validations
    const securityCheck = validateFormSecurity();
    if (!securityCheck.isValid) {
      Object.assign(newErrors, securityCheck.errors);
    }
    
    // Additional cross-field validations
    if (formData.email && formData.companyName) {
      const emailDomain = formData.email.split('@')[1];
      // This is just a warning, not blocking validation
      if (emailDomain && !emailDomain.toLowerCase().includes(formData.companyName.toLowerCase().split(' ')[0])) {
        console.warn('Email domain does not match company name');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Phone verification functions
  const sendOTP = async () => {
    if (!formData.phone.trim()) return;
    
    setPhoneVerification(prev => ({ ...prev, isSendingOTP: true }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.phone;
      return newErrors;
    });

    try {
      const fullPhone = `${selectedCountry.code}${formData.phone}`;
      const result = await authService.sendPhoneOTP(fullPhone);
      
      if (result.success) {
        setPhoneVerification(prev => ({
          ...prev,
          otpSent: true,
          isSendingOTP: false,
          resendCountdown: 60
        }));
        
        // Start countdown
        const countdownInterval = setInterval(() => {
          setPhoneVerification(prev => {
            if (prev.resendCountdown <= 1) {
              clearInterval(countdownInterval);
              return { ...prev, resendCountdown: 0 };
            }
            return { ...prev, resendCountdown: prev.resendCountdown - 1 };
          });
        }, 1000);
        
      } else {
        setErrors(prev => ({ ...prev, phone: result.error || t('phone.otp.send.failed') }));
        setPhoneVerification(prev => ({ ...prev, isSendingOTP: false }));
      }
    } catch (error: any) {
      setErrors(prev => ({ ...prev, phone: error.message || t('phone.otp.send.failed') }));
      setPhoneVerification(prev => ({ ...prev, isSendingOTP: false }));
    }
  };

  const verifyOTP = async () => {
    if (!phoneVerification.otp.trim() || phoneVerification.otp.length !== 6) {
      setErrors(prev => ({ ...prev, otp: t('phone.otp.validation.length') }));
      return;
    }

    setPhoneVerification(prev => ({ ...prev, isVerifying: true }));
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.otp;
      return newErrors;
    });

    try {
      const fullPhone = `${selectedCountry.code}${formData.phone}`;
      const result = await authService.verifyPhoneOTP({
        phone: fullPhone,
        otp: phoneVerification.otp
      });
      
      if (result.success) {
        setPhoneVerification(prev => ({
          ...prev,
          isVerified: true,
          isVerifying: false
        }));
      } else {
        setErrors(prev => ({ ...prev, otp: result.error || t('phone.verification.failed') }));
        setPhoneVerification(prev => ({ ...prev, isVerifying: false }));
      }
    } catch (error: any) {
      setErrors(prev => ({ ...prev, otp: error.message || t('phone.verification.failed') }));
      setPhoneVerification(prev => ({ ...prev, isVerifying: false }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Check if phone verification is required but not completed
      if (formData.phone.trim() && !phoneVerification.isVerified) {
        setErrors({ phone: t('auth.register.validation.phoneNotVerified') });
        setIsLoading(false);
        return;
      }

      const response = await apiService.auth.registerContractor({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone ? `${selectedCountry.code}${formData.phone}` : undefined,
        companyName: formData.companyName,
        crNumber: formData.crNumber,
        vatNumber: formData.vatNumber,
        userType: formData.userType
      });

      if (response.success) {
        // Set access token
        if (response.data?.accessToken) {
          apiService.setAccessToken(response.data.accessToken);
          console.log('✅ Access token set after contractor registration');
        }

        // After setting token, fetch user data to update auth state
        const userResponse = await apiService.auth.getCurrentUser();
        
        if (userResponse.success && userResponse.data) {
          console.log('✅ User data fetched successfully after contractor registration');
          
          // Update auth service state manually since we're not using authService.register
          await authService.checkAuthStatus();
          
          console.log('✅ Contractor registration successful');
          
          // Call onComplete callback if provided, otherwise navigate directly
          if (onComplete) {
            onComplete(userResponse?.data || response.data?.user);
          } else {
            // Navigate to contractor dashboard - user is now logged in
            navigate('/contractor/dashboard');
          }
        } else {
          console.warn('⚠️ Could not fetch user data after contractor registration');
          // Call onComplete callback if provided, otherwise navigate directly
          if (onComplete) {
            onComplete(response.data?.user);
          } else {
            // Still navigate to contractor dashboard as the registration was successful
            navigate('/contractor/dashboard');
          }
        }
      }
    } catch (error: any) {
      console.error('Contractor registration failed:', error);
      
      if (error.error === 'Business email already registered') {
        setErrors({ email: t('validation.email_already_registered') });
      } else if (error.error === 'Business phone already registered') {
        setErrors({ phone: t('validation.phone_already_registered') });
      } else {
        setErrors({ 
          email: error.error || t('registration.registration_failed') 
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Password visibility toggle
  const PasswordToggle = ({ show, onToggle }: { show: boolean; onToggle: () => void }) => (
    <button
      type="button"
      onClick={onToggle}
      style={{
        position: 'absolute',
        right: isRTL ? 'auto' : '0.75rem',
        left: isRTL ? '0.75rem' : 'auto',
        top: '50%',
        transform: 'translateY(-50%)',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        color: '#6b7280',
        padding: '0.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      {show ? '👁️' : '👁️‍🗨️'}
    </button>
  );

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.gradients.primaryLight,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fonts.primary,
      direction: isRTL ? 'rtl' : 'ltr'
    }}>
      <main style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 80px)',
        padding: isMobile ? '1rem' : '2rem',
        marginTop: '80px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '600px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '1rem',
          padding: isMobile ? '1.5rem' : '2rem',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              marginBottom: '0.5rem',
              background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              {t('registration.contractor.title')}
            </h1>
            <p style={{ color: '#6b7280' }}>
              {t('registration.contractor.subtitle')}
            </p>
          </div>

          {/* Error message */}
          {errors.general && (
            <div style={{
              background: '#fee2e2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              padding: '1rem',
              marginBottom: '1rem',
              color: '#dc2626',
              fontSize: '0.875rem'
            }}>
              {errors.general}
            </div>
          )}

          {/* Registration Form */}
          <form onSubmit={handleSubmit}>
            {/* Name fields */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: '1rem', 
              marginBottom: '1rem' 
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t('form.first_name')} *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder={t('registration.contractor.firstName_placeholder')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.firstName ? '1px solid #ef4444' : '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease'
                  }}
                />
                {errors.firstName && (
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                    {errors.firstName}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t('form.last_name')} *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder={t('registration.contractor.lastName_placeholder')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.lastName ? '1px solid #ef4444' : '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease'
                  }}
                />
                {errors.lastName && (
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                    {errors.lastName}
                  </span>
                )}
              </div>
            </div>

            {/* Company Name */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {t('form.company_name')} *
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange('companyName', e.target.value)}
                placeholder={t('registration.contractor.companyName_placeholder')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.companyName ? '1px solid #ef4444' : '1px solid rgba(229, 231, 235, 0.5)',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease'
                }}
              />
              {errors.companyName && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                  {errors.companyName}
                </span>
              )}
            </div>

            {/* Business Registration Numbers */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
              gap: '1rem', 
              marginBottom: '1rem' 
            }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t('form.cr_number')} *
                </label>
                <input
                  type="text"
                  value={formData.crNumber}
                  onChange={(e) => handleInputChange('crNumber', e.target.value)}
                  placeholder={t('registration.contractor.crNumber_placeholder')}
                  title={t('registration.contractor.crNumber_tooltip')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.crNumber ? '1px solid #ef4444' : '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease'
                  }}
                />
                {errors.crNumber && (
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                    {errors.crNumber}
                  </span>
                )}
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                  {t('form.vat_number')} *
                </label>
                <input
                  type="text"
                  value={formData.vatNumber}
                  onChange={(e) => handleInputChange('vatNumber', e.target.value)}
                  placeholder={t('registration.contractor.vatNumber_placeholder')}
                  title={t('registration.contractor.vatNumber_tooltip')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: errors.vatNumber ? '1px solid #ef4444' : '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease'
                  }}
                />
                {errors.vatNumber && (
                  <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                    {errors.vatNumber}
                  </span>
                )}
              </div>
            </div>

            {/* Business Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {t('form.business_email')} *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder={t('registration.contractor.businessEmail_placeholder')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.email ? '1px solid #ef4444' : '1px solid rgba(229, 231, 235, 0.5)',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease'
                }}
              />
              {errors.email && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                  {errors.email}
                </span>
              )}
            </div>

            {/* Business Phone with Verification */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: theme.colors.text.primary
              }}>
                {t('form.business_phone')} * {phoneVerification.isVerified && (
                  <span style={{ 
                    color: theme.colors.semantic.success.main, 
                    fontSize: '0.75rem', 
                    marginLeft: isRTL ? '0' : '0.5rem',
                    marginRight: isRTL ? '0.5rem' : '0'
                  }}>
                    ✓ {t('auth.register.verified')}
                  </span>
                )}
              </label>
              
              {/* Phone Input Row */}
              <div style={{ 
                display: 'flex', 
                gap: '0.5rem',
                flexDirection: isMobile ? 'column' : 'row',
                alignItems: 'stretch'
              }}>
                <select
                  value={selectedCountry.code}
                  onChange={(e) => {
                    const country = countries.find(c => c.code === e.target.value);
                    if (country) {
                      setSelectedCountry(country);
                      handleInputChange('phone', ''); // Reset phone when country changes
                    }
                  }}
                  style={{
                    minWidth: isMobile ? '100%' : '90px',
                    width: isMobile ? '100%' : 'auto',
                    padding: '0.75rem',
                    border: `1px solid ${theme.colors.borders.light}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    cursor: 'pointer',
                    color: theme.colors.text.primary
                  }}
                >
                  {countries.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.code}
                    </option>
                  ))}
                </select>
                
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '');
                    if (value.length <= selectedCountry.digits) {
                      handleInputChange('phone', value);
                    }
                  }}
                  placeholder={t('auth.register.phonePlaceholder')}
                  disabled={phoneVerification.isVerified}
                  style={{
                    flex: isMobile ? 'none' : 1,
                    width: isMobile ? '100%' : 'auto',
                    padding: '0.75rem',
                    border: `1px solid ${errors.phone ? '#ef4444' : 'rgba(229, 231, 235, 0.5)'}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    background: phoneVerification.isVerified 
                      ? theme.colors.semantic.success.light 
                      : 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease',
                    cursor: phoneVerification.isVerified ? 'not-allowed' : 'text',
                    color: theme.colors.text.primary
                  }}
                />
              </div>
              
              {/* Send OTP Button Row */}
              {formData.phone.trim() && formData.phone.length === selectedCountry.digits && !phoneVerification.isVerified && (
                <div style={{ marginTop: '0.75rem' }}>
                  <button
                    type="button"
                    onClick={sendOTP}
                    disabled={phoneVerification.isSendingOTP || phoneVerification.resendCountdown > 0}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      background: phoneVerification.isSendingOTP || phoneVerification.resendCountdown > 0
                        ? '#94a3b8'
                        : phoneVerification.otpSent
                          ? '#6b7280'
                          : 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem',
                      fontWeight: '500',
                      cursor: phoneVerification.isSendingOTP || phoneVerification.resendCountdown > 0 ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    {phoneVerification.isSendingOTP 
                      ? t('auth.register.sending')
                      : phoneVerification.resendCountdown > 0
                        ? `${t('auth.register.resend')} (${phoneVerification.resendCountdown}s)`
                        : phoneVerification.otpSent
                          ? t('auth.register.resend')
                          : t('auth.register.sendOTP')
                    }
                  </button>
                </div>
              )}
              
              {/* OTP Verification Section */}
              {phoneVerification.otpSent && !phoneVerification.isVerified && (
                <div style={{ 
                  marginTop: '0.75rem',
                  padding: '1rem',
                  background: theme.colors.semantic.info.light,
                  borderRadius: '0.5rem',
                  border: `1px solid ${theme.colors.semantic.info.main}20`
                }}>
                  <div style={{ 
                    fontSize: '0.75rem', 
                    color: theme.colors.text.secondary, 
                    marginBottom: '0.75rem',
                    textAlign: 'center'
                  }}>
                    {t('phone.otp.description', { phone: `${selectedCountry.code}${formData.phone}` })}
                  </div>
                  
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.5rem',
                    flexDirection: isMobile ? 'column' : 'row'
                  }}>
                    <input
                      type="text"
                      value={phoneVerification.otp}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        if (value.length <= 6) {
                          setPhoneVerification(prev => ({ ...prev, otp: value }));
                          if (errors.otp) {
                            setErrors(prev => {
                              const newErrors = { ...prev };
                              delete newErrors.otp;
                              return newErrors;
                            });
                          }
                        }
                      }}
                      placeholder={t('auth.register.otpPlaceholder')}
                      maxLength={6}
                      style={{
                        flex: 1,
                        padding: '0.75rem',
                        border: `1px solid ${errors.otp ? '#ef4444' : 'rgba(229, 231, 235, 0.5)'}`,
                        borderRadius: '0.5rem',
                        fontSize: '1.125rem',
                        background: 'rgba(255, 255, 255, 0.8)',
                        transition: 'all 0.2s ease',
                        textAlign: 'center',
                        letterSpacing: '0.2em',
                        fontWeight: '500',
                        color: theme.colors.text.primary
                      }}
                    />
                    <button
                      type="button"
                      onClick={verifyOTP}
                      disabled={phoneVerification.isVerifying || phoneVerification.otp.length !== 6}
                      style={{
                        minWidth: isMobile ? '100%' : '120px',
                        padding: '0.75rem 1rem',
                        background: (phoneVerification.isVerifying || phoneVerification.otp.length !== 6) 
                          ? '#94a3b8' 
                          : theme.colors.semantic.success.main,
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: (phoneVerification.isVerifying || phoneVerification.otp.length !== 6) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {phoneVerification.isVerifying ? t('auth.register.verifying') : t('auth.register.verify')}
                    </button>
                  </div>
                  
                  {errors.otp && (
                    <div style={{ 
                      fontSize: '0.75rem', 
                      color: '#ef4444', 
                      marginTop: '0.5rem',
                      textAlign: 'center',
                      fontWeight: '500'
                    }}>
                      {errors.otp}
                    </div>
                  )}
                </div>
              )}
              
              {errors.phone && (
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: '#ef4444', 
                  marginTop: '0.5rem',
                  fontWeight: '500'
                }}>
                  {errors.phone}
                </div>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {t('form.password')} *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  placeholder={t('registration.contractor.password_placeholder')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingRight: '3rem',
                    border: errors.password ? '1px solid #ef4444' : '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease'
                  }}
                />
                <PasswordToggle show={showPassword} onToggle={() => setShowPassword(!showPassword)} />
              </div>
              {errors.password && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                  {errors.password}
                </span>
              )}
            </div>

            {/* Confirm Password */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {t('form.confirm_password')} *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                  placeholder={t('registration.contractor.confirmPassword_placeholder')}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingRight: '3rem',
                    border: errors.confirmPassword ? '1px solid #ef4444' : '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease'
                  }}
                />
                <PasswordToggle show={showConfirmPassword} onToggle={() => setShowConfirmPassword(!showConfirmPassword)} />
              </div>
              {errors.confirmPassword && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                  {errors.confirmPassword}
                </span>
              )}
            </div>

            {/* Terms and conditions */}
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
                cursor: 'pointer',
                flexDirection: isRTL ? 'row-reverse' : 'row'
              }}>
                <input
                  type="checkbox"
                  className="custom-checkbox"
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                />
                <span style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: '1.5' }}>
                  {t('form.agree_to_terms')} {' '}
                  <Link to="/terms" style={{ color: '#3eb2b1', textDecoration: 'underline' }}>
                    {t('form.terms_and_conditions')}
                  </Link>
                  {' '} {t('form.and')} {' '}
                  <Link to="/privacy" style={{ color: '#3eb2b1', textDecoration: 'underline' }}>
                    {t('form.privacy_policy')}
                  </Link>
                </span>
              </label>
              {errors.agreeToTerms && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                  {errors.agreeToTerms}
                </span>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: isLoading ? '#94a3b8' : 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isLoading ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isLoading ? (
                <>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    border: '2px solid transparent',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginRight: '0.5rem'
                  }}></div>
                  {t('form.registering')}
                </>
              ) : (
                t('form.register_contractor')
              )}
            </button>

            {/* Login link */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {t('registration.already_have_account')} {' '}
              </span>
              <button
                type="button"
                onClick={onLogin}
                style={{
                  color: '#3eb2b1',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  textDecoration: 'underline'
                }}
              >
                {t('registration.login_here')}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default ContractorRegistration;