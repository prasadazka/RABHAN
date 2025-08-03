import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import GlobalHeader from '../components/GlobalHeader';
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
  nationalId: string;
  userType: string;
  agreeTerms: boolean;
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
    nationalId: '',
    userType: 'HOMEOWNER',
    agreeTerms: false
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Phone country selection
  const [selectedCountry, setSelectedCountry] = useState({ code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', digits: 9 });
  
  const countries = [
    { code: '+966', flag: '🇸🇦', name: 'Saudi Arabia', digits: 9, format: '5XX XXX XXXX' },
    { code: '+91', flag: '🇮🇳', name: 'India', digits: 10, format: 'XXXXX XXXXX' }
  ];

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
        if (phoneDigits.length !== selectedCountry.digits) {
          return t('auth.register.validation.phoneDigits', { 
            digits: selectedCountry.digits, 
            country: selectedCountry.name 
          });
        }
        return null;

      case 'nationalId':
        if (!value.trim()) return t('auth.register.validation.nationalIdRequired');
        if (!/^[12][0-9]{9}$/.test(value)) return t('auth.register.validation.nationalIdInvalid');
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
    if (['email', 'password', 'confirmPassword', 'nationalId'].includes(field) && value) {
      const error = validateField(field, value);
      if (error) {
        setErrors(prev => ({ ...prev, [field]: error }));
      }
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      // Register user with auth service
      const backendUserType = formData.userType === 'GOVERNMENT' ? 'BUSINESS' : formData.userType;
      
      const authResult = await authService.register({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone ? `${selectedCountry.code}${formData.phone}` : undefined,
        nationalId: formData.nationalId,
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
      <GlobalHeader 
        onLogin={onLogin} 
        onRegister={onRegister}
        isAuthenticated={false}
        user={null}
        onLogout={() => {}}
      />
      
      <main style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: 'calc(100vh - 80px)',
        padding: '2rem',
        marginTop: '80px'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '500px',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(10px)',
          borderRadius: '1rem',
          padding: '2rem',
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
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

            {/* Phone (optional) */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {t('auth.register.phone')}
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
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
                    padding: '0.75rem',
                    border: '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    cursor: 'pointer'
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
                      handleFieldChange('phone', value);
                    }
                  }}
                  placeholder={t('auth.register.phonePlaceholder')}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: errors.phone ? '1px solid #ef4444' : '1px solid rgba(229, 231, 235, 0.5)',
                    borderRadius: '0.5rem',
                    fontSize: '1rem',
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease'
                  }}
                />
              </div>
              {errors.phone && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                  {errors.phone}
                </span>
              )}
            </div>

            {/* National ID */}
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '500' }}>
                {t('auth.register.nationalId')} *
              </label>
              <input
                type="text"
                value={formData.nationalId}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 10) {
                    handleFieldChange('nationalId', value);
                  }
                }}
                placeholder={t('auth.register.nationalIdPlaceholder')}
                maxLength={10}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: errors.nationalId ? '1px solid #ef4444' : '1px solid rgba(229, 231, 235, 0.5)',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  background: 'rgba(255, 255, 255, 0.8)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.2s ease'
                }}
              />
              {errors.nationalId && (
                <span style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '0.25rem', display: 'block' }}>
                  {errors.nationalId}
                </span>
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
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: isSubmitting ? '#94a3b8' : 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: isSubmitting ? 'none' : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
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