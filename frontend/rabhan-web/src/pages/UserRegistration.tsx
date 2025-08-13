import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/auth.service';
import { theme } from '../theme';

interface UserRegistrationProps {
  onBack: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onComplete: (userData: any) => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  userType: string;
  agreeTerms: boolean;
}

interface PhoneVerificationState {
  isVerified: boolean;
  otpSent: boolean;
  otp: string;
  isVerifying: boolean;
  isSendingOTP: boolean;
  resendCountdown: number;
}

interface FormErrors {
  [key: string]: string;
}

const UserRegistration: React.FC<UserRegistrationProps> = ({
  onBack,
  onLogin,
  onRegister,
  onComplete
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';

  // Form state
  const [formData, setFormData] = useState<FormData>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    userType: 'HOMEOWNER',
    agreeTerms: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Check if all required fields are filled and valid
  const isFormValid = () => {
    return (
      formData.firstName.trim() !== '' &&
      formData.lastName.trim() !== '' &&
      formData.email.trim() !== '' &&
      formData.password.trim() !== '' &&
      formData.confirmPassword.trim() !== '' &&
      formData.phone.trim() !== '' &&
      phoneVerification.isVerified &&
      formData.agreeTerms
    );
  };

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
  const [selectedCountry, setSelectedCountry] = useState({ code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', digits: 9 });
  
  const countries = [
    { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', digits: 9, format: '5XX XXX XXXX' },
    { code: '+91', flag: '🇮🇳', name: 'India', digits: 10, format: 'XXXXX XXXXX' }
  ];

  // Responsive breakpoint state
  const [isMobile, setIsMobile] = useState(false);
  
  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 640); // sm breakpoint
    };
    
    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);


  // Validation functions
  const validateField = (field: keyof FormData, value: any): string | null => {
    switch (field) {
      case 'firstName':
      case 'lastName':
        if (!value.trim()) return t('auth.register.validation.nameRequired', { field: t(`auth.register.${field}`) });
        if (value.length > 25) return t('auth.register.validation.nameMaxLength', { field: t(`auth.register.${field}`) });
        if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(value)) return t('auth.register.validation.nameInvalid', { field: t(`auth.register.${field}`) });
        return null;

      case 'email':
        if (!value.trim()) return t('auth.register.validation.emailRequired');
        if (value.length > 50) return t('auth.register.validation.emailMaxLength');
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return t('auth.register.validation.emailInvalid');
        return null;

      case 'password':
        if (!value) return t('auth.register.validation.passwordRequired');
        if (value.length < 8) return t('auth.register.validation.passwordMinLength');
        if (value.length > 25) return t('auth.register.validation.passwordMaxLength');
        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) return t('auth.register.validation.passwordWeak');
        return null;

      case 'confirmPassword':
        if (value !== formData.password) return t('auth.register.validation.passwordMismatch');
        return null;

      case 'phone':
        if (!value.trim()) return null; // Phone is optional
        const phoneDigits = value.replace(/\D/g, '');
        
        // Check starting digit based on country
        if (phoneDigits.length > 0) {
          if (selectedCountry.code === '+966' && phoneDigits[0] !== '5') {
            return t('auth.register.validation.phoneSaudiStart');
          }
          if (selectedCountry.code === '+91' && !['6', '7', '8', '9'].includes(phoneDigits[0])) {
            return t('auth.register.validation.phoneIndianStart');
          }
        }
        
        if (phoneDigits.length !== selectedCountry.digits) {
          return t('auth.register.validation.phoneDigits', { 
            digits: selectedCountry.digits, 
            country: selectedCountry.name 
          });
        }
        // If phone is provided, it must be verified
        if (value.trim() && !phoneVerification.isVerified) {
          return t('auth.register.validation.phoneNotVerified');
        }
        return null;


      case 'agreeTerms':
        if (!value) return t('auth.register.validation.agreeTermsRequired');
        return null;

      default:
        return null;
    }
  };

  const handleFieldChange = (field: keyof FormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    // Real-time validation for critical fields
    if (['email', 'password', 'confirmPassword'].includes(field) && value) {
      const error = validateField(field, value);
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

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    
    // Validate all fields
    Object.keys(formData).forEach(key => {
      const field = key as keyof FormData;
      const error = validateField(field, formData[field]);
      if (error) {
        newErrors[field] = error;
      }
    });

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

    setIsSubmitting(true);
    setErrors({});

    try {
      // Check if phone is required
      if (!formData.phone.trim()) {
        setErrors({ phone: t('auth.register.validation.phoneRequired') });
        return;
      }
      
      // Check if phone verification is required but not completed
      if (formData.phone.trim() && !phoneVerification.isVerified) {
        setErrors({ phone: t('auth.register.validation.phoneNotVerified') });
        return;
      }

      // Register user with auth service
      const backendUserType = formData.userType === 'GOVERNMENT' ? 'BUSINESS' : formData.userType;
      
      const authResult = await authService.register({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone ? `${selectedCountry.code}${formData.phone}` : undefined,
        role: 'USER',
        user_type: backendUserType
      });

      if (!authResult.success) {
        throw new Error(authResult.error || 'Registration failed');
      }

      console.log('✅ Registration successful, user is now logged in');
      
      // Navigate to dashboard - the user is already logged in by authService
      navigate('/');
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      
      const errorMessage = error.message || error.error || 'Registration failed. Please try again.';
      setErrors({ general: errorMessage });
      
    } finally {
      setIsSubmitting(false);
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
          maxWidth: '500px',
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
              {t('auth.register.title')}
            </h1>
            <p style={{ color: '#6b7280' }}>
              {t('auth.register.subtitle')}
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
                  {t('auth.register.firstName')} *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleFieldChange('firstName', e.target.value)}
                  placeholder={t('auth.register.firstNamePlaceholder')}
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
                  {t('auth.register.lastName')} *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleFieldChange('lastName', e.target.value)}
                  placeholder={t('auth.register.lastNamePlaceholder')}
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

            {/* User Type */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {t('auth.userType')} *
              </label>
              <select
                value={formData.userType}
                onChange={(e) => handleFieldChange('userType', e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.userType ? '1px solid #ef4444' : '1px solid rgba(229, 231, 235, 0.5)',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease',
                  cursor: 'pointer'
                }}
              >
                <option value="HOMEOWNER">{t('auth.userTypes.HOMEOWNER')}</option>
                <option value="BUSINESS">{t('auth.userTypes.BUSINESS')}</option>
                <option value="INDUSTRIAL">{t('auth.userTypes.INDUSTRIAL')}</option>
                <option value="GOVERNMENT">{t('auth.userTypes.GOVERNMENT')}</option>
              </select>
            </div>

            {/* Email */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {t('auth.register.email')} *
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                placeholder={t('auth.register.emailPlaceholder')}
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

            {/* Phone (required) */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: theme.colors.text.primary
              }}>
                {t('auth.register.phone')} <span style={{ color: theme.colors.text.primary }}>*</span> {phoneVerification.isVerified && (
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
                      handleFieldChange('phone', ''); // Reset phone when country changes
                    }
                  }}
                  style={{
                    minWidth: isMobile ? '100%' : '90px',
                    width: isMobile ? '100%' : 'auto',
                    padding: '0.75rem',
                    border: `1px solid ${theme.colors.borders.light}`,
                    borderRadius: theme.radius.md,
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
                    
                    // Validate starting digit based on country
                    if (value.length === 1) {
                      if (selectedCountry.code === '+966' && value[0] !== '5') {
                        return; // Don't allow non-5 starting digits for Saudi
                      }
                      if (selectedCountry.code === '+91' && !['6', '7', '8', '9'].includes(value[0])) {
                        return; // Don't allow invalid starting digits for India
                      }
                    }
                    
                    if (value.length <= selectedCountry.digits) {
                      handleFieldChange('phone', value);
                    }
                  }}
                  placeholder={selectedCountry.code === '+966' ? '5XXXXXXXX' : '9XXXXXXXXX'}
                  disabled={phoneVerification.isVerified}
                  style={{
                    flex: isMobile ? 'none' : 1,
                    width: isMobile ? '100%' : 'auto',
                    padding: '0.75rem',
                    border: `1px solid ${errors.phone ? theme.colors.borders.error : theme.colors.borders.light}`,
                    borderRadius: theme.radius.md,
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
                        ? theme.colors.secondary[400]
                        : phoneVerification.otpSent
                          ? theme.colors.secondary[600]
                          : theme.colors.gradients.button,
                      color: theme.colors.text.inverse,
                      border: 'none',
                      borderRadius: theme.radius.md,
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
                  borderRadius: theme.radius.md,
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
                        border: `1px solid ${errors.otp ? theme.colors.borders.error : theme.colors.borders.medium}`,
                        borderRadius: theme.radius.md,
                        fontSize: '1.125rem',
                        background: theme.colors.backgrounds.primary,
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
                          ? theme.colors.secondary[400] 
                          : theme.colors.semantic.success.main,
                        color: theme.colors.text.inverse,
                        border: 'none',
                        borderRadius: theme.radius.md,
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
                      color: theme.colors.semantic.error.main, 
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
                  color: theme.colors.semantic.error.main, 
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
                {t('auth.register.password')} *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => handleFieldChange('password', e.target.value)}
                  placeholder={t('auth.register.passwordPlaceholder')}
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
                {t('auth.register.confirmPassword')} *
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => handleFieldChange('confirmPassword', e.target.value)}
                  placeholder={t('auth.register.confirmPasswordPlaceholder')}
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
                  checked={formData.agreeTerms}
                  onChange={(e) => handleFieldChange('agreeTerms', e.target.checked)}
                  style={{
                    marginTop: '0.25rem',
                    cursor: 'pointer'
                  }}
                />
                <span style={{ fontSize: '0.875rem', color: '#4b5563', lineHeight: '1.5' }}>
                  {t('auth.register.agreeTerms')}
                </span>
              </label>
              {errors.agreeTerms && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                  {errors.agreeTerms}
                </span>
              )}
            </div>

            {/* Submit button */}
            <button
              type="submit"
              disabled={isSubmitting || !isFormValid()}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: (isSubmitting || !isFormValid()) ? '#94a3b8' : 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: (isSubmitting || !isFormValid()) ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: (isSubmitting || !isFormValid()) ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
            >
              {isSubmitting ? t('common.loading') : t('auth.register.createAccount')}
            </button>

            {/* Login link */}
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                {t('auth.register.hasAccount')}{' '}
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
                {t('auth.register.signIn')}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default UserRegistration;