import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { authService } from '../services/auth.service';

interface LoginPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: any) => void;
  onRegister?: () => void;
}

interface LoginFormData {
  email: string;
  otp: string;
  password: string;
  userType: 'USER' | 'CONTRACTOR';
  rememberMe: boolean;
}

interface LoginErrors {
  email?: string;
  otp?: string;
  password?: string;
  general?: string;
}

interface LoginStep {
  step: 'email' | 'otp' | 'password';
  isEmailVerified: boolean;
  isOtpVerified: boolean;
  otpSent: boolean;
  isSendingOtp: boolean;
  isVerifyingOtp: boolean;
  resendCountdown: number;
  maskedPhone?: string;
}

const LoginPopup: React.FC<LoginPopupProps> = ({ isOpen, onClose, onLoginSuccess, onRegister }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const [formData, setFormData] = useState<LoginFormData>({
    email: '',
    otp: '',
    password: '',
    userType: 'USER',
    rememberMe: false
  });

  const [loginStep, setLoginStep] = useState<LoginStep>({
    step: 'email',
    isEmailVerified: false,
    isOtpVerified: false,
    otpSent: false,
    isSendingOtp: false,
    isVerifyingOtp: false,
    resendCountdown: 0,
    maskedPhone: undefined
  });

  // Remove phone country selection (not needed for email-based login)

  const [errors, setErrors] = useState<LoginErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Check if current step is valid
  const isStepValid = () => {
    switch (loginStep.step) {
      case 'email': {
        return formData.email.trim() !== '';
      }
      case 'otp':
        return formData.otp.trim() !== '' && formData.otp.length === 6;
      case 'password':
        return formData.password.trim() !== '';
      default:
        return false;
    }
  };

  // Reset form when popup opens/closes
  useEffect(() => {
    if (isOpen) {
      setFormData({
        email: '',
        otp: '',
        password: '',
        userType: 'USER',
        rememberMe: false
      });
      setLoginStep({
        step: 'email',
        isEmailVerified: false,
        isOtpVerified: false,
        otpSent: false,
        isSendingOtp: false,
        isVerifyingOtp: false,
        resendCountdown: 0,
        maskedPhone: undefined
      });
      setErrors({});
      setIsLoading(false);
      setShowPassword(false);
    }
  }, [isOpen]);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);


  // Prevent body scroll when popup is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  // Look up email and send OTP to registered phone
  const sendOTPToPhone = async () => {
    console.log('sendOTPToPhone function called!');
    const trimmedEmail = formData.email.trim();
    console.log('Trimmed email:', trimmedEmail);
    
    if (!trimmedEmail) {
      console.log('Email is empty');
      setErrors({ email: t('auth.validation.emailRequired') });
      return;
    }

    console.log('Setting loading state...');
    setLoginStep(prev => ({ ...prev, isSendingOtp: true }));
    setErrors({});

    try {
      // First lookup email to get masked phone
      console.log('Looking up email:', formData.email);
      const lookupResult = await authService.lookupEmailForLogin(formData.email, formData.userType);
      console.log('Lookup result:', lookupResult);
      
      if (lookupResult.success && lookupResult.data?.userExists) {
        console.log('User exists, sending OTP...');
        // Send OTP to user's registered phone
        const otpResult = await authService.sendLoginOTPToPhone(formData.email, formData.userType);
        console.log('OTP result:', otpResult);
        
        if (otpResult.success) {
          setLoginStep(prev => ({ 
            ...prev, 
            otpSent: true, 
            isSendingOtp: false,
            step: 'otp',
            resendCountdown: 60,
            maskedPhone: otpResult.data?.maskedPhone,
            isEmailVerified: true
          }));
          
          // Start countdown timer
          const countdown = setInterval(() => {
            setLoginStep(prev => {
              if (prev.resendCountdown <= 1) {
                clearInterval(countdown);
                return { ...prev, resendCountdown: 0 };
              }
              return { ...prev, resendCountdown: prev.resendCountdown - 1 };
            });
          }, 1000);
        } else {
          throw new Error(otpResult.error || 'Failed to send OTP');
        }
      } else {
        // User not found or no phone - show generic message
        console.log('User not found or lookup failed');
        setErrors({ email: 'Email not found or no phone number registered' });
      }
    } catch (error: any) {
      setErrors({ email: error.message || t('errors.loginFailed') });
      setLoginStep(prev => ({ ...prev, isSendingOtp: false }));
    }
  };

  // Verify OTP
  const verifyOTP = async () => {
    if (!formData.otp.trim() || formData.otp.length !== 6) {
      setErrors({ otp: t('phone.otp.invalid') });
      return;
    }

    setLoginStep(prev => ({ ...prev, isVerifyingOtp: true }));
    setErrors({});

    try {
      const result = await authService.verifyLoginOTP({
        email: formData.email,
        otp: formData.otp,
        userType: formData.userType
      });
      
      if (result.success) {
        setLoginStep(prev => ({ 
          ...prev, 
          isOtpVerified: true, 
          isVerifyingOtp: false,
          step: 'password'
        }));
      } else {
        throw new Error(result.error || 'Invalid OTP');
      }
    } catch (error: any) {
      setErrors({ otp: error.message || t('phone.otp.invalid') });
      setLoginStep(prev => ({ ...prev, isVerifyingOtp: false }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: LoginErrors = {};

    // Only validate password in the final step
    if (loginStep.step === 'password') {
      if (!formData.password) {
        newErrors.password = t('auth.validation.passwordRequired');
      } else if (formData.password.length < 8) {
        newErrors.password = t('auth.validation.passwordMinLength');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    switch (loginStep.step) {
      case 'email':
        await sendOTPToPhone();
        break;
      case 'otp':
        await verifyOTP();
        break;
      case 'password':
        if (!validateForm()) {
          return;
        }
        
        setIsLoading(true);
        setErrors({});

        try {
          const result = await authService.login({
            email: formData.email,
            password: formData.password,
            userType: formData.userType
          });

          if (result.success && result.user) {
            console.log('✅ Login successful:', result.user);
            
            onLoginSuccess(result.user);
            onClose();
          } else {
            setErrors({ general: result.error || t('errors.loginFailed') });
          }
        } catch (error: any) {
          console.error('❌ Login error:', error);
          setErrors({ general: error.message || t('errors.loginFailed') });
        } finally {
          setIsLoading(false);
        }
        break;
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: theme.zIndex.modal,
          animation: 'fadeIn 200ms ease-out'
        }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '480px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 0 80px rgba(62, 178, 177, 0.1)',
          padding: 'clamp(2rem, 5vw, 2.5rem)',
          position: 'relative',
          animation: 'slideUp 200ms ease-out',
          direction: isRTL ? 'rtl' : 'ltr'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: isRTL ? 'auto' : '1rem',
            left: isRTL ? '1rem' : 'auto',
            width: '40px',
            height: '40px',
            border: 'none',
            background: 'rgba(107, 114, 128, 0.1)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: theme.transitions.fast,
            color: '#6b7280',
            fontSize: '1.25rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(107, 114, 128, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(107, 114, 128, 0.1)';
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
              borderRadius: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.75rem',
              margin: '0 auto',
              marginBottom: '1.5rem',
              boxShadow: '0 8px 16px rgba(62, 178, 177, 0.3)'
            }}
          >
            🔐
          </div>
          <h2
            style={{
              fontSize: theme.responsive.fluid.xl,
              fontWeight: '600',
              color: '#1a1a1a',
              margin: 0,
              marginBottom: '0.5rem',
              letterSpacing: '-0.025em',
              fontFamily: theme.typography.fonts.primary
            }}
          >
            {t('auth.loginTitle')}
          </h2>
          <p
            style={{
              fontSize: '1rem',
              color: '#6b7280',
              margin: 0,
              lineHeight: 1.5
            }}
          >
            {t('auth.loginSubtitle')}
          </p>
        </div>

        {/* User Type Selector */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div
            style={{
              display: 'flex',
              background: 'rgba(62, 178, 177, 0.1)',
              borderRadius: '12px',
              padding: '4px',
              position: 'relative'
            }}
          >
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, userType: 'USER' }))}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                borderRadius: '8px',
                background: formData.userType === 'USER' ? '#3eb2b1' : 'transparent',
                color: formData.userType === 'USER' ? '#ffffff' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '500',
                fontFamily: theme.typography.fonts.primary,
                cursor: 'pointer',
                transition: theme.transitions.fast
              }}
            >
              {t('auth.userTypes.USER') || 'Customer'}
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, userType: 'CONTRACTOR' }))}
              style={{
                flex: 1,
                padding: '0.75rem',
                border: 'none',
                borderRadius: '8px',
                background: formData.userType === 'CONTRACTOR' ? '#3eb2b1' : 'transparent',
                color: formData.userType === 'CONTRACTOR' ? '#ffffff' : '#6b7280',
                fontSize: '0.875rem',
                fontWeight: '500',
                fontFamily: theme.typography.fonts.primary,
                cursor: 'pointer',
                transition: theme.transitions.fast
              }}
            >
              {t('auth.userTypes.CONTRACTOR') || 'Contractor'}
            </button>
          </div>
        </div>


        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* General Error */}
          {errors.general && (
            <div
              style={{
                padding: '0.75rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '8px',
                color: '#dc2626',
                fontSize: '0.875rem',
                marginBottom: '1rem',
                textAlign: isRTL ? 'right' : 'left'
              }}
            >
              {errors.general}
            </div>
          )}

          {/* Step 1: Email Address */}
          {loginStep.step === 'email' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: '#374151',
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {t('auth.email')} <span style={{ color: '#374151' }}>*</span>
              </label>
              
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, email: e.target.value }));
                  // Reset login step if user changes email after failed attempt
                  if (loginStep.step !== 'email') {
                    setLoginStep({
                      step: 'email',
                      isEmailVerified: false,
                      isOtpVerified: false,
                      otpSent: false,
                      isSendingOtp: false,
                      isVerifyingOtp: false,
                      resendCountdown: 0,
                      maskedPhone: undefined
                    });
                    setErrors({}); // Clear any previous errors
                  }
                }}
                placeholder={t('auth.emailPlaceholder')}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.email ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '1rem',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  outline: 'none',
                  textAlign: isRTL ? 'right' : 'left',
                  direction: isRTL ? 'rtl' : 'ltr',
                  fontFamily: theme.typography.fonts.primary
                }}
                onFocus={(e) => e.target.style.borderColor = '#3eb2b1'}
                onBlur={(e) => e.target.style.borderColor = errors.email ? '#ef4444' : '#d1d5db'}
              />
              
              {errors.email && (
                <span style={{ 
                  display: 'block', 
                  marginTop: '0.25rem', 
                  fontSize: '0.75rem', 
                  color: '#ef4444' 
                }}>
                  {errors.email}
                </span>
              )}
            </div>
          )}

          {/* Step 2: OTP Verification */}
          {loginStep.step === 'otp' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '0.5rem', 
                fontSize: '0.875rem', 
                fontWeight: '500',
                color: '#374151',
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {t('phone.otp.title')} <span style={{ color: '#374151' }}>*</span>
              </label>
              
              <div style={{ 
                fontSize: '0.75rem', 
                color: '#6b7280', 
                marginBottom: '0.75rem',
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {t('auth.register.otpSentTo')} {loginStep.maskedPhone || formData.email}
              </div>
              
              <input
                type="text"
                value={formData.otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '');
                  if (value.length <= 6) {
                    setFormData(prev => ({ ...prev, otp: value }));
                  }
                }}
                placeholder="000000"
                maxLength={6}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: `1px solid ${errors.otp ? '#ef4444' : '#d1d5db'}`,
                  borderRadius: '8px',
                  fontSize: '1.125rem',
                  backgroundColor: '#ffffff',
                  color: '#1f2937',
                  outline: 'none',
                  textAlign: 'center',
                  letterSpacing: '0.25rem',
                  fontFamily: 'monospace'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3eb2b1'}
                onBlur={(e) => e.target.style.borderColor = errors.otp ? '#ef4444' : '#d1d5db'}
              />
              
              {errors.otp && (
                <span style={{ 
                  display: 'block', 
                  marginTop: '0.25rem', 
                  fontSize: '0.75rem', 
                  color: '#ef4444' 
                }}>
                  {errors.otp}
                </span>
              )}
              
              {loginStep.resendCountdown > 0 ? (
                <div style={{ 
                  marginTop: '0.75rem', 
                  fontSize: '0.75rem', 
                  color: '#6b7280',
                  textAlign: 'center'
                }}>
                  {t('phone.otp.resendIn', { seconds: loginStep.resendCountdown })}
                </div>
              ) : (
                <button
                  type="button"
                  onClick={sendOTPToPhone}
                  disabled={loginStep.isSendingOtp}
                  style={{
                    marginTop: '0.75rem',
                    width: '100%',
                    padding: '0.5rem',
                    background: 'none',
                    color: '#3eb2b1',
                    border: 'none',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textDecoration: 'underline'
                  }}
                >
                  {loginStep.isSendingOtp ? t('common.loading') : t('phone.otp.resend')}
                </button>
              )}
              
              {/* Back to Email Button */}
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep({
                      step: 'email',
                      isEmailVerified: false,
                      isOtpVerified: false,
                      otpSent: false,
                      isSendingOtp: false,
                      isVerifyingOtp: false,
                      resendCountdown: 0,
                      maskedPhone: undefined
                    });
                    setFormData(prev => ({ ...prev, otp: '' }));
                    setErrors({});
                  }}
                  style={{
                    background: 'none',
                    color: '#6b7280',
                    border: 'none',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    margin: '0 auto'
                  }}
                >
                  <span>{isRTL ? '→' : '←'}</span>
                  {t('auth.backToEmail', 'Back to Email')}
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Password */}
          {loginStep.step === 'password' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{
                display: 'block',
                marginBottom: '0.5rem',
                fontWeight: '500',
                fontSize: '0.875rem',
                color: '#374151',
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {t('auth.password')} <span style={{ color: '#374151' }}>*</span>
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  placeholder={t('auth.register.passwordPlaceholder') || 'Enter your password'}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    paddingRight: isRTL ? '0.75rem' : '3rem',
                    paddingLeft: isRTL ? '3rem' : '0.75rem',
                    border: `1px solid ${errors.password ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    outline: 'none',
                    textAlign: isRTL ? 'right' : 'left',
                    direction: isRTL ? 'rtl' : 'ltr',
                    fontFamily: theme.typography.fonts.primary,
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3eb2b1'}
                  onBlur={(e) => e.target.style.borderColor = errors.password ? '#ef4444' : '#d1d5db'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: isRTL ? 'auto' : '0.75rem',
                    left: isRTL ? '0.75rem' : 'auto',
                    transform: 'translateY(-50%)',
                    border: 'none',
                    background: 'none',
                    color: '#6b7280',
                    fontSize: '1rem',
                    cursor: 'pointer',
                    padding: '0.25rem'
                  }}
                >
                  {showPassword ? '👁️' : '👁️‍🗨️'}
                </button>
              </div>
              {errors.password && (
                <span style={{
                  display: 'block',
                  marginTop: '0.25rem',
                  fontSize: '0.75rem',
                  color: '#ef4444'
                }}>
                  {errors.password}
                </span>
              )}
              
              {/* Back to Email Button */}
              <div style={{ marginTop: '1rem', textAlign: 'center' }}>
                <button
                  type="button"
                  onClick={() => {
                    setLoginStep({
                      step: 'email',
                      isEmailVerified: false,
                      isOtpVerified: false,
                      otpSent: false,
                      isSendingOtp: false,
                      isVerifyingOtp: false,
                      resendCountdown: 0,
                      maskedPhone: undefined
                    });
                    setFormData(prev => ({ ...prev, otp: '', password: '' }));
                    setErrors({});
                  }}
                  style={{
                    background: 'none',
                    color: '#6b7280',
                    border: 'none',
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    textDecoration: 'underline',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    margin: '0 auto'
                  }}
                >
                  <span>{isRTL ? '→' : '←'}</span>
                  {t('auth.backToEmail', 'Back to Email')}
                </button>
              </div>
            </div>
          )}

          {/* Remember Me */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '1.5rem',
              flexDirection: isRTL ? 'row-reverse' : 'row'
            }}
          >
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                cursor: 'pointer',
                fontSize: '0.875rem',
                color: '#374151',
                flexDirection: isRTL ? 'row-reverse' : 'row',
                gap: '0.5rem'
              }}
            >
              <input
                type="checkbox"
                checked={formData.rememberMe}
                onChange={(e) => setFormData(prev => ({ ...prev, rememberMe: e.target.checked }))}
                style={{
                  width: '16px',
                  height: '16px',
                  accentColor: '#3eb2b1'
                }}
              />
              <span>{t('auth.rememberMe')}</span>
            </label>
            <button
              type="button"
              style={{
                border: 'none',
                background: 'none',
                color: '#3eb2b1',
                fontSize: '0.875rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {t('auth.forgotPassword')}
            </button>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || !isStepValid() || loginStep.isSendingOtp || loginStep.isVerifyingOtp}
            style={{
              width: '100%',
              padding: '0.875rem',
              background: (isLoading || !isStepValid() || loginStep.isSendingOtp || loginStep.isVerifyingOtp) ? '#9ca3af' : 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '600',
              fontFamily: theme.typography.fonts.primary,
              cursor: (isLoading || !isStepValid() || loginStep.isSendingOtp || loginStep.isVerifyingOtp) ? 'not-allowed' : 'pointer',
              transition: theme.transitions.fast,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              letterSpacing: '0.025em',
              marginBottom: '1rem'
            }}
            onMouseEnter={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #22d3db 0%, #5cecea 100%)';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isLoading) {
                e.currentTarget.style.background = 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)';
                e.currentTarget.style.transform = 'translateY(0)';
              }
            }}
          >
            {isLoading ? (
              <>
                <div
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderTopColor: '#ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}
                />
                <span>{t('common.loading')}</span>
              </>
            ) : (
              <>
                <span>
                  {loginStep.step === 'email' ? t('phone.otp.send') : 
                   loginStep.step === 'otp' ? t('phone.otp.verify') : 
                   t('auth.loginButton')}
                </span>
                <span style={{ fontSize: '1.1rem' }}>{isRTL ? '←' : '→'}</span>
              </>
            )}
          </button>

          {/* Register Link */}
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
              {t('auth.noAccount')}{' '}
            </span>
            <button
              type="button"
              onClick={() => {
                onClose();
                onRegister?.();
              }}
              style={{
                border: 'none',
                background: 'none',
                color: '#3eb2b1',
                fontSize: '0.875rem',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              {t('auth.signUpHere')}
            </button>
          </div>
        </form>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideUp {
            from { 
              opacity: 0; 
              transform: translateY(20px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
          
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default LoginPopup;