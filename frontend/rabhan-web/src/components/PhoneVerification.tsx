import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CheckCircle, Phone, MessageSquare, Clock, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authService } from '../services/auth.service';

interface Country {
  code: string;
  name: string;
  flag: string;
  phonePrefix: string;
  format: string;
}

interface PhoneVerificationProps {
  onVerificationComplete?: (phoneNumber: string) => void;
  onVerificationSkip?: () => void;
  allowSkip?: boolean;
  theme?: string;
}

export const PhoneVerification: React.FC<PhoneVerificationProps> = ({
  onVerificationComplete,
  onVerificationSkip,
  allowSkip = false,
  theme = 'default'
}) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [countries, setCountries] = useState<Country[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [fullPhoneNumber, setFullPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [resendCount, setResendCount] = useState(0);
  const [countdown, setCountdown] = useState(0);
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);
  const [dummyOTP, setDummyOTP] = useState('');

  // Pre-defined countries with Twilio trial support
  const supportedCountries: Country[] = [
    {
      code: 'SA',
      name: 'Saudi Arabia',
      flag: '🇸🇦',
      phonePrefix: '+966',
      format: '5XX XXX XXXX'
    },
    {
      code: 'US',
      name: 'United States',
      flag: '🇺🇸', 
      phonePrefix: '+1',
      format: 'XXX XXX XXXX'
    },
    {
      code: 'IN',
      name: 'India',
      flag: '🇮🇳',
      phonePrefix: '+91',
      format: 'XXXXX XXXXX'
    }
  ];

  useEffect(() => {
    setCountries(supportedCountries);
    // Default to Saudi Arabia for RABHAN
    setSelectedCountry(supportedCountries[0]);
    
    // Check if in development mode with dummy OTP
    checkDevelopmentMode();
  }, []);

  // 🧪 Check if using dummy OTP mode
  const checkDevelopmentMode = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/auth/dev/dummy-otp-info');
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.developmentMode) {
          setIsDevelopmentMode(true);
          setDummyOTP(data.data.dummyOTP);
          console.log('🧪 Development Mode: Dummy OTP enabled -', data.data.dummyOTP);
        }
      }
    } catch (error) {
      // Not in development mode or server not running
      setIsDevelopmentMode(false);
    }
  };

  useEffect(() => {
    if (selectedCountry && phoneNumber) {
      setFullPhoneNumber(`${selectedCountry.phonePrefix}${phoneNumber}`);
    }
  }, [selectedCountry, phoneNumber]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(countdown - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  const validatePhoneNumber = (phone: string, country: Country): boolean => {
    const cleanPhone = phone.replace(/[\s-]/g, '');
    
    switch (country.code) {
      case 'SA':
        return /^5[0-9]{8}$/.test(cleanPhone);
      case 'US':
        return /^[2-9][0-9]{2}[2-9][0-9]{2}[0-9]{4}$/.test(cleanPhone);
      case 'IN':
        return /^[6-9][0-9]{9}$/.test(cleanPhone);
      default:
        return cleanPhone.length >= 8;
    }
  };

  const formatPhoneNumber = (value: string, country: Country): string => {
    const clean = value.replace(/\D/g, '');
    
    switch (country.code) {
      case 'SA':
        if (clean.length <= 9) {
          return clean.replace(/(\d{3})(\d{3})(\d{0,4})/, '$1 $2 $3').trim();
        }
        break;
      case 'US':
        if (clean.length <= 10) {
          return clean.replace(/(\d{3})(\d{3})(\d{0,4})/, '$1 $2 $3').trim();
        }
        break;
      case 'IN':
        if (clean.length <= 10) {
          return clean.replace(/(\d{5})(\d{0,5})/, '$1 $2').trim();
        }
        break;
    }
    return clean;
  };

  const handlePhoneChange = (value: string) => {
    if (!selectedCountry) return;
    
    const formatted = formatPhoneNumber(value, selectedCountry);
    setPhoneNumber(formatted);
    setError('');
  };

  const handleSendOTP = async () => {
    if (!selectedCountry || !phoneNumber) {
      setError(t('phone.validation.required'));
      return;
    }

    if (!validatePhoneNumber(phoneNumber.replace(/\s/g, ''), selectedCountry)) {
      setError(t('phone.validation.invalid'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authService.sendPhoneOTP(fullPhoneNumber);
      
      if (response.success) {
        setSuccess(t('phone.otp.sent'));
        setStep('otp');
        setCountdown(60); // 60 second cooldown
        setResendCount(resendCount + 1);
      } else {
        setError(response.error || t('phone.otp.send.failed'));
      }
    } catch (error: any) {
      setError(error.message || t('phone.otp.send.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError(t('phone.otp.validation.length'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authService.verifyPhoneOTP(fullPhoneNumber, otpCode);
      
      if (response.success) {
        setSuccess(t('phone.verification.success'));
        setTimeout(() => {
          onVerificationComplete?.(fullPhoneNumber);
        }, 1000);
      } else {
        setError(response.error || t('phone.verification.failed'));
      }
    } catch (error: any) {
      setError(error.message || t('phone.verification.failed'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = () => {
    if (countdown > 0) return;
    handleSendOTP();
  };

  const handleBack = () => {
    setStep('phone');
    setOtpCode('');
    setError('');
    setSuccess('');
  };

  return (
    <Card className="w-full max-w-md mx-auto" style={{ borderColor: '#3eb2b1' }}>
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2" style={{ color: '#3eb2b1' }}>
          <Phone className="h-5 w-5" />
          {t('phone.verification.title')}
        </CardTitle>
        <CardDescription>
          {step === 'phone' 
            ? t('phone.verification.description') 
            : t('phone.otp.description', { phone: fullPhoneNumber })
          }
        </CardDescription>
        
        {/* 🧪 Development Mode Notice */}
        {isDevelopmentMode && (
          <div className="mx-4 mb-2 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex items-center gap-2 text-blue-700">
              <span className="text-sm font-medium">🧪 Development Mode</span>
            </div>
            <p className="text-xs text-blue-600 mt-1">
              SMS is bypassed. Use OTP: <code className="bg-blue-100 px-1 rounded font-mono">{dummyOTP}</code> for testing
            </p>
          </div>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-700">{success}</span>
          </div>
        )}

        {step === 'phone' ? (
          <div className="space-y-4">
            {/* Country Selection */}
            <div className="space-y-2">
              <Label htmlFor="country">{t('phone.country.label')}</Label>
              <Select
                value={selectedCountry?.code}
                onValueChange={(code) => {
                  const country = countries.find(c => c.code === code);
                  setSelectedCountry(country || null);
                  setPhoneNumber('');
                }}
              >
                <SelectTrigger id="country">
                  <SelectValue placeholder={t('phone.country.placeholder')} />
                </SelectTrigger>
                <SelectContent>
                  {countries.map((country) => (
                    <SelectItem key={country.code} value={country.code}>
                      <div className="flex items-center gap-2">
                        <span>{country.flag}</span>
                        <span>{country.name}</span>
                        <Badge variant="outline">{country.phonePrefix}</Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Phone Number Input */}
            <div className="space-y-2">
              <Label htmlFor="phone">{t('phone.number.label')}</Label>
              <div className="flex">
                <div className="flex items-center px-3 border border-r-0 border-gray-300 bg-gray-50 rounded-l-md">
                  <span className="text-sm font-medium text-gray-600">
                    {selectedCountry?.phonePrefix}
                  </span>
                </div>
                <Input
                  id="phone"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder={selectedCountry?.format || ''}
                  className="rounded-l-none"
                  maxLength={selectedCountry?.code === 'SA' ? 11 : 12}
                />
              </div>
              {selectedCountry && (
                <p className="text-xs text-gray-500">
                  {t('phone.format.example')}: {selectedCountry.phonePrefix} {selectedCountry.format}
                </p>
              )}
            </div>

            {/* Send OTP Button */}
            <Button
              onClick={handleSendOTP}
              disabled={isLoading || !phoneNumber || !selectedCountry}
              className="w-full"
              style={{ backgroundColor: '#3eb2b1', borderColor: '#3eb2b1' }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('phone.otp.sending')}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  {t('phone.otp.send')}
                </div>
              )}
            </Button>

            {allowSkip && (
              <Button
                variant="outline"
                onClick={onVerificationSkip}
                className="w-full"
              >
                {t('phone.verification.skip')}
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* OTP Input */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="otp">{t('phone.otp.label')}</Label>
                {isDevelopmentMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setOtpCode(dummyOTP);
                      setError('');
                    }}
                    className="text-xs h-6 px-2"
                    style={{ borderColor: '#3eb2b1', color: '#3eb2b1' }}
                  >
                    🧪 Fill Test OTP
                  </Button>
                )}
              </div>
              <Input
                id="otp"
                type="text"
                value={otpCode}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtpCode(value);
                  setError('');
                }}
                placeholder="000000"
                className="text-center text-lg tracking-widest"
                maxLength={6}
              />
              <p className="text-xs text-gray-500 text-center">
                {isDevelopmentMode 
                  ? `🧪 Dev Mode: Use ${dummyOTP} or enter any 6-digit code`
                  : t('phone.otp.hint')
                }
              </p>
            </div>

            {/* Verify Button */}
            <Button
              onClick={handleVerifyOTP}
              disabled={isLoading || otpCode.length !== 6}
              className="w-full"
              style={{ backgroundColor: '#3eb2b1', borderColor: '#3eb2b1' }}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  {t('phone.otp.verifying')}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  {t('phone.otp.verify')}
                </div>
              )}
            </Button>

            {/* Resend OTP */}
            <div className="text-center">
              {countdown > 0 ? (
                <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Clock className="h-4 w-4" />
                  {t('phone.otp.resend.countdown', { seconds: countdown })}
                </div>
              ) : (
                <Button
                  variant="link"
                  onClick={handleResendOTP}
                  disabled={isLoading}
                  className="text-sm"
                  style={{ color: '#3eb2b1' }}
                >
                  {t('phone.otp.resend')} {resendCount > 0 && `(${resendCount})`}
                </Button>
              )}
            </div>

            {/* Back Button */}
            <Button
              variant="outline"
              onClick={handleBack}
              className="w-full"
            >
              {t('phone.verification.back')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};