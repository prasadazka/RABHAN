import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import GlobalHeader from '../components/GlobalHeader';
import StepIndicator from '../components/StepIndicator';
import { authService } from '../services/auth.service';
import { userService } from '../services/user.service';
import { documentService } from '../services/document.service';
import { PhoneVerification } from '../components/PhoneVerification';

interface UserRegistrationProps {
  onBack: () => void;
  onLogin: () => void;
  onRegister: () => void;
  onComplete: (userData: any) => void;
}

interface FormData {
  // Basic Identity Information
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  nationalId: string;
  firstName: string;
  lastName: string;
  userType: string;
  
  // Address Information
  region: string;
  city: string;
  district: string;
  streetAddress: string;
  landmark: string;
  postalCode: string;
  additionalAddress: string;
  
  // Property & Energy Information
  propertyType: string;
  propertyOwnership: string;
  roofSize: string;
  gpsLatitude: string;
  gpsLongitude: string;
  electricityConsumption: string; // Average monthly consumption
  electricityMeterNumber: string;
  
  
  // Preferences
  preferredLanguage: string;
  emailNotifications: string;
  smsNotifications: string;
  marketingConsent: string;
}

interface FormErrors {
  general?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  phone?: string;
  nationalId?: string;
  firstName?: string;
  lastName?: string;
  userType?: string;
  region?: string;
  city?: string;
  district?: string;
  streetAddress?: string;
  landmark?: string;
  postalCode?: string;
  additionalAddress?: string;
  propertyType?: string;
  propertyOwnership?: string;
  roofSize?: string;
  electricityMeterNumber?: string;
  gpsLatitude?: string;
  gpsLongitude?: string;
  electricityConsumption?: string;
  preferredLanguage?: string;
  emailNotifications?: string;
  smsNotifications?: string;
  marketingConsent?: string;
}

const UserRegistration: React.FC<UserRegistrationProps> = ({ 
  onBack, 
  onLogin, 
  onRegister, 
  onComplete 
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Add CSS animation keyframes for tooltip and responsive styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }

      /* Responsive form container */
      .form-container {
        display: flex;
        flex-direction: row;
        gap: clamp(1rem, 3vw, 3rem);
      }

      @media (max-width: 768px) {
        .form-container {
          flex-direction: column;
        }
      }

      /* Responsive sidebar */
      .sidebar {
        width: clamp(250px, 25vw, 300px);
        flex-shrink: 0;
      }

      @media (max-width: 768px) {
        .sidebar {
          width: 100%;
        }
      }

      /* Responsive phone input */
      .phone-input-container {
        display: flex;
        gap: 0.5rem;
        align-items: flex-start;
        width: 100%;
      }

      @media (max-width: 480px) {
        .phone-input-container {
          flex-direction: column;
        }
      }

      /* Responsive navigation buttons */
      .nav-buttons {
        display: flex;
        justify-content: space-between;
        margin-top: 2rem;
        gap: 1rem;
        flex-wrap: wrap;
      }

      @media (max-width: 480px) {
        .nav-buttons button {
          flex: 1;
          min-width: 120px;
        }
      }

      /* Responsive grid */
      .responsive-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1rem;
      }

      @media (max-width: 640px) {
        .responsive-grid {
          grid-template-columns: 1fr;
        }
      }

      /* GPS grid */
      .gps-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1rem;
      }

      @media (max-width: 640px) {
        .gps-grid {
          grid-template-columns: 1fr;
        }
      }

      /* Force single column on very small screens */
      @media (max-width: 480px) {
        .responsive-grid {
          grid-template-columns: 1fr !important;
        }
        .gps-grid {
          grid-template-columns: 1fr !important;
        }
      }

      /* Ensure form inputs are properly sized */
      .responsive-grid > div input,
      .responsive-grid > div select {
        width: 100%;
        box-sizing: border-box;
      }

      /* Country dropdown responsive - keep row layout on mobile */
      @media (max-width: 480px) {
        .phone-input-container {
          flex-direction: row; /* Keep row layout */
          gap: 0.5rem;
        }
        .country-dropdown-container {
          width: 100px !important; /* Slightly wider on mobile */
          min-width: 100px !important;
          max-width: 100px !important;
        }
      }

      /* Make country dropdown compact */
      .country-dropdown-container {
        cursor: pointer;
        position: relative;
        display: inline-block;
        flex: 0 0 auto; /* Don't grow */
        width: 90px; /* Fixed small width */
        min-width: 90px; /* Smaller minimum width */
        max-width: 90px; /* Maximum width */
      }

      .country-dropdown-container:hover {
        opacity: 0.9;
      }

      .country-dropdown-container select {
        width: 100%;
        cursor: pointer;
        padding-right: 1.5rem !important; /* Even less padding */
        padding-left: 0.25rem !important; /* Even less padding */
        font-size: 0.8rem !important; /* Smaller font */
      }

      /* Phone input takes more space */
      .phone-number-input {
        flex: 1; /* Take remaining space */
        min-width: 0; /* Allow shrinking */
      }

      /* Touch-friendly dropdown on mobile */
      @media (max-width: 768px) {
        .country-dropdown-container {
          min-height: 48px; /* Minimum touch target size */
          display: flex;
          align-items: center;
          position: relative;
          width: 90px; /* Consistent width */
          min-width: 90px;
          max-width: 90px;
        }
        
        .country-dropdown-container select {
          min-height: 48px;
          font-size: 16px; /* Prevents zoom on iOS */
          cursor: pointer;
          z-index: 2; /* Ensure it's above other elements */
          touch-action: manipulation;
          -webkit-appearance: none;
          appearance: none;
        }
        
        .phone-number-input {
          touch-action: manipulation;
        }
        
        .phone-number-input input {
          font-size: 16px; /* Prevents zoom on iOS */
          touch-action: manipulation;
        }
      }
    `;
    document.head.appendChild(style);
    return () => {
      document.head.removeChild(style);
    };
  }, []);

  // Handle mobile detection and resize events
  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  const [currentStep, setCurrentStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [otpTimer, setOtpTimer] = useState(0);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [showPasswordTooltip, setShowPasswordTooltip] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  // Country codes with their phone number formats
  const countryData = [
    { code: '+966', name: t('auth.register.countries.saudiArabia'), flag: '🇸🇦', digits: 9, placeholder: 'XXXXXXXXX' },
    { code: '+91', name: t('auth.register.countries.india'), flag: '🇮🇳', digits: 10, placeholder: 'XXXXXXXXXX' },
    // { code: '+1', name: 'United States', flag: '🇺🇸', digits: 10, placeholder: 'XXXXXXXXXX' },
    // { code: '+44', name: 'United Kingdom', flag: '🇬🇧', digits: 10, placeholder: 'XXXXXXXXXX' },
    // { code: '+971', name: 'UAE', flag: '🇦🇪', digits: 9, placeholder: 'XXXXXXXXX' },
    // { code: '+965', name: 'Kuwait', flag: '🇰🇼', digits: 8, placeholder: 'XXXXXXXX' },
    // { code: '+974', name: 'Qatar', flag: '🇶🇦', digits: 8, placeholder: 'XXXXXXXX' },
    // { code: '+973', name: 'Bahrain', flag: '🇧🇭', digits: 8, placeholder: 'XXXXXXXX' },
    // { code: '+968', name: 'Oman', flag: '🇴🇲', digits: 8, placeholder: 'XXXXXXXX' }
  ];

  const [selectedCountry, setSelectedCountry] = useState(countryData[0]); // Default to Saudi Arabia
  const [formData, setFormData] = useState<FormData>({
    // Basic Identity Information
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    nationalId: '',
    firstName: '',
    lastName: '',
    userType: 'HOMEOWNER',
    
    // Address Information
    region: '',
    city: '',
    district: '',
    streetAddress: '',
    landmark: '',
    postalCode: '',
    additionalAddress: '',
    
    // Property & Energy Information
    propertyType: '',
    propertyOwnership: '',
    roofSize: '',
    gpsLatitude: '',
    gpsLongitude: '',
    electricityConsumption: '', // Average monthly consumption
    electricityMeterNumber: '',
    
    
    // Preferences
    preferredLanguage: i18n.language,
    emailNotifications: 'true',
    smsNotifications: 'true',
    marketingConsent: 'false'
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionStep, setSubmissionStep] = useState('');
  
  // Document upload state
  const [uploadedDocuments, setUploadedDocuments] = useState<{[key: string]: File}>({});
  const [documentErrors, setDocumentErrors] = useState<{[key: string]: string}>({});
  const [uploadingDocuments, setUploadingDocuments] = useState<{[key: string]: boolean}>({});

  const steps = [
    t('auth.register.steps.personal'),
    t('auth.register.steps.address'),
    t('auth.register.steps.property'),
    t('auth.register.steps.documents'),
    t('auth.register.steps.verification')
  ];

  // Validation functions
  const validateEmail = (email: string): string | undefined => {
    if (!email) return t('auth.register.validation.emailRequired');
    if (email.length > 50) return t('auth.register.validation.emailMaxLength');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return t('auth.register.validation.emailInvalid');
    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) return t('auth.register.validation.passwordRequired');
    if (password.length < 8) return t('auth.register.validation.passwordMinLength');
    if (password.length > 25) return t('auth.register.validation.passwordMaxLength');
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
      return t('auth.register.validation.passwordWeak');
    }
    return undefined;
  };

  const validatePhone = (phone: string): string | undefined => {
    if (!phone) return undefined; // Phone is optional
    
    // Remove all non-numeric characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if the phone number matches the selected country's format
    if (cleanPhone.length !== selectedCountry.digits) {
      return t('auth.register.validation.phoneDigits', { digits: selectedCountry.digits, country: selectedCountry.name });
    }
    
    return undefined;
  };

  const validateNationalId = (nationalId: string): string | undefined => {
    if (!nationalId) return undefined; // Optional for registration
    
    // Saudi National ID validation (10 digits starting with 1 or 2)
    const cleanId = nationalId.replace(/\D/g, '');
    if (cleanId.length !== 10 || !['1', '2'].includes(cleanId[0])) {
      return t('auth.register.validation.nationalIdInvalid');
    }
    
    return undefined;
  };

  const validatePostalCode = (postalCode: string): string | undefined => {
    if (!postalCode) return undefined; // Optional for registration
    
    // Saudi postal code validation (5 digits only)
    const cleanCode = postalCode.replace(/\D/g, '');
    if (cleanCode.length !== 5) {
      return 'Postal code must be exactly 5 digits';
    }
    
    return undefined;
  };

  const validateName = (name: string, field: string): string | undefined => {
    if (!name) return t('auth.register.validation.nameRequired', { field });
    if (name.length > 25) return t('auth.register.validation.nameMaxLength', { field });
    if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(name)) {
      return t('auth.register.validation.nameInvalid', { field });
    }
    return undefined;
  };

  const validateCity = (city: string): string | undefined => {
    if (!city) return t('auth.register.validation.cityRequired');
    if (city.length > 30) return 'City name must be 30 characters or less';
    if (!/^[a-zA-Z\u0600-\u06FF\s]+$/.test(city)) {
      return 'City name can only contain letters and spaces';
    }
    return undefined;
  };

  const validateDistrict = (district: string): string | undefined => {
    if (!district) return t('auth.register.validation.districtRequired');
    if (district.length > 30) return 'District name must be 30 characters or less';
    if (!/^[a-zA-Z\u0600-\u06FF\s\-]+$/.test(district)) {
      return 'District name can only contain letters, spaces, and hyphens';
    }
    return undefined;
  };

  const validateStreetAddress = (address: string): string | undefined => {
    if (!address) return t('auth.register.validation.streetAddressRequired');
    if (address.length > 50) return 'Street address must be 50 characters or less';
    if (!/^[a-zA-Z\u0600-\u06FF0-9\s\-\,\.]+$/.test(address)) {
      return 'Street address can only contain letters, numbers, spaces, and basic punctuation';
    }
    return undefined;
  };

  const validateLandmark = (landmark: string): string | undefined => {
    if (!landmark) return undefined; // Optional field
    if (landmark.length > 50) return 'Landmark must be 50 characters or less';
    if (!/^[a-zA-Z\u0600-\u06FF0-9\s\-\,\.]+$/.test(landmark)) {
      return 'Landmark can only contain letters, numbers, spaces, and basic punctuation';
    }
    return undefined;
  };

  const validateRoofSize = (roofSize: string): string | undefined => {
    if (!roofSize) return t('auth.register.validation.roofSizeRequired');
    const size = parseInt(roofSize);
    if (isNaN(size) || size < 10 || size > 10000) {
      return 'Roof size must be between 10 and 10,000 square meters';
    }
    return undefined;
  };

  const validateElectricityMeterNumber = (meterNumber: string): string | undefined => {
    if (!meterNumber) return t('auth.register.validation.meterNumberRequired');
    if (meterNumber.length < 6 || meterNumber.length > 15) {
      return 'Meter number must be between 6 and 15 characters';
    }
    if (!/^[a-zA-Z0-9]+$/.test(meterNumber)) {
      return 'Meter number can only contain letters and numbers';
    }
    return undefined;
  };

  const validateGPSCoordinate = (coordinate: string, type: 'latitude' | 'longitude'): string | undefined => {
    if (!coordinate) return undefined; // Optional field
    const coord = parseFloat(coordinate);
    if (isNaN(coord)) return `${type} must be a valid number`;
    
    if (type === 'latitude') {
      if (coord < -90 || coord > 90) return 'Latitude must be between -90 and 90';
    } else {
      if (coord < -180 || coord > 180) return 'Longitude must be between -180 and 180';
    }
    return undefined;
  };

  const validateStep = (step: number): boolean => {
    const newErrors: FormErrors = {};
    
    switch (step) {
      case 0: // Personal & Contact Information
        newErrors.firstName = validateName(formData.firstName, t('auth.register.firstName'));
        newErrors.lastName = validateName(formData.lastName, t('auth.register.lastName'));
        if (!formData.userType) {
          newErrors.userType = t('auth.validation.userTypeRequired');
        }
        newErrors.email = validateEmail(formData.email);
        newErrors.phone = validatePhone(formData.phone);
        newErrors.nationalId = validateNationalId(formData.nationalId);
        newErrors.password = validatePassword(formData.password);
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = t('auth.register.validation.passwordMismatch');
        }
        
        // Check if phone is verified when phone is provided
        if (formData.phone && !phoneVerified) {
          newErrors.phone = t('auth.register.validation.phoneNotVerified');
        }
        break;
      case 1: // Address Information
        if (!formData.region) newErrors.region = t('auth.register.validation.regionRequired');
        newErrors.city = validateCity(formData.city);
        newErrors.district = validateDistrict(formData.district);
        newErrors.streetAddress = validateStreetAddress(formData.streetAddress);
        newErrors.landmark = validateLandmark(formData.landmark);
        if (!formData.postalCode) {
          newErrors.postalCode = t('auth.register.validation.postalCodeRequired');
        } else {
          newErrors.postalCode = validatePostalCode(formData.postalCode);
        }
        break;
      case 2: // Property & Energy
        if (!formData.propertyType) newErrors.propertyType = t('auth.register.validation.propertyTypeRequired');
        if (!formData.propertyOwnership) newErrors.propertyOwnership = t('auth.register.validation.propertyOwnershipRequired');
        newErrors.roofSize = validateRoofSize(formData.roofSize);
        newErrors.electricityMeterNumber = validateElectricityMeterNumber(formData.electricityMeterNumber);
        newErrors.gpsLatitude = validateGPSCoordinate(formData.gpsLatitude, 'latitude');
        newErrors.gpsLongitude = validateGPSCoordinate(formData.gpsLongitude, 'longitude');
        break;
      
      case 3: // Documents
        // Validate required documents
        const requiredDocuments = ['national_id', 'proof_of_address'];
        requiredDocuments.forEach(docType => {
          if (!uploadedDocuments[docType]) {
            setDocumentErrors(prev => ({
              ...prev,
              [docType]: 'This document is required for KYC verification.'
            }));
          }
        });
        
        // Return false if any required documents are missing
        const hasRequiredDocs = requiredDocuments.every(docType => uploadedDocuments[docType]);
        if (!hasRequiredDocs) return false;
        break;
        
    }
    
    // Remove undefined errors
    Object.keys(newErrors).forEach(key => {
      if (newErrors[key as keyof FormErrors] === undefined) {
        delete newErrors[key as keyof FormErrors];
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
    
    // Reset phone verification when phone number changes
    if (field === 'phone' && formData.phone !== value) {
      setPhoneVerified(false);
      setOtpSent(false);
      setOtpCode('');
      setOtpTimer(0);
      
      // Auto-detect country based on phone number
      if (value) {
        // Remove any spaces or formatting
        const cleanPhone = value.replace(/[\s\-\(\)]/g, '');
        
        if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
          // Indian number (91XXXXXXXXXX)
          const indiaCountry = countryData.find(c => c.code === '+91');
          if (indiaCountry) setSelectedCountry(indiaCountry);
        } else if (cleanPhone.startsWith('9') && cleanPhone.length === 10) {
          // Could be Indian number (XXXXXXXXXX starting with 9)
          const indiaCountry = countryData.find(c => c.code === '+91');
          if (indiaCountry) setSelectedCountry(indiaCountry);
        } else if (cleanPhone.startsWith('05') || (cleanPhone.startsWith('5') && cleanPhone.length === 9)) {
          // Saudi number
          const saudiCountry = countryData.find(c => c.code === '+966');
          if (saudiCountry) setSelectedCountry(saudiCountry);
        }
      }
    }
  };

  const sendOTP = async () => {
    if (!formData.phone || validatePhone(formData.phone)) return;
    
    try {
      setIsSendingOtp(true);
      
      // Call real auth service to send OTP
      const result = await authService.sendPhoneOTP(formData.phone);
      
      if (result.success) {
        setOtpSent(true);
        setOtpTimer(120); // 2 minutes
        
        // Start countdown timer
        const timer = setInterval(() => {
          setOtpTimer(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
        
        console.log('✅ OTP sent successfully to:', formData.phone);
      } else {
        console.error('❌ Failed to send OTP:', result.error);
        // Show error message to user if needed
      }
      
    } catch (error) {
      console.error('Failed to send OTP:', error);
    } finally {
      setIsSendingOtp(false);
    }
  };

  const verifyOTP = async () => {
    if (!otpCode || otpCode.length !== 6) return;
    
    try {
      setIsVerifyingOtp(true);
      
      // Call real auth service to verify OTP
      const result = await authService.verifyPhoneOTP({
        phone: formData.phone,
        otp: otpCode
      });
      
      if (result.success) {
        setPhoneVerified(true);
        setOtpSent(false);
        setOtpCode('');
        setOtpTimer(0);
        
        // Clear any phone errors
        setErrors(prev => ({ ...prev, phone: undefined }));
        
        console.log('✅ OTP verified successfully');
      } else {
        console.error('❌ Failed to verify OTP:', result.error);
        // Show error message to user if needed
      }
      
    } catch (error) {
      console.error('Failed to verify OTP:', error);
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Document upload functionality
  const handleDocumentUpload = (documentType: string, file: File) => {
    // Validate file type - only images allowed
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      setDocumentErrors(prev => ({
        ...prev,
        [documentType]: t('auth.register.validation.fileTypeInvalid')
      }));
      return;
    }

    // Validate file size (max 3MB)
    if (file.size > 3 * 1024 * 1024) {
      setDocumentErrors(prev => ({
        ...prev,
        [documentType]: t('auth.register.validation.fileSizeInvalid')
      }));
      return;
    }

    // Clear any previous errors
    setDocumentErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[documentType];
      return newErrors;
    });

    // Store the file
    setUploadedDocuments(prev => ({
      ...prev,
      [documentType]: file
    }));

    console.log(`Document uploaded: ${documentType}`, file);
  };

  const removeDocument = (documentType: string) => {
    setUploadedDocuments(prev => {
      const newDocs = { ...prev };
      delete newDocs[documentType];
      return newDocs;
    });
    setDocumentErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[documentType];
      return newErrors;
    });
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    
    setIsSubmitting(true);
    setErrors({}); // Clear previous errors
    
    try {
      console.log('🚀 Starting user registration process...');
      setSubmissionStep('Creating account...');
      
      // Step 1: Register user with Auth Service
      // Map GOVERNMENT to BUSINESS for backend compatibility
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

      console.log('✅ User authentication registration successful', authResult);
      setSubmissionStep('Setting up profile...');

      // Get user ID from auth result
      const userId = authResult.user?.id;
      if (!userId) {
        throw new Error('User ID not returned from authentication service');
      }

      // Step 2: Create user profile with User Service
      const profileResult = await userService.createProfile({
        userId: userId,
        firstName: formData.firstName,
        lastName: formData.lastName,
        region: formData.region,
        city: formData.city,
        district: formData.district,
        streetAddress: formData.streetAddress,
        landmark: formData.landmark,
        postalCode: formData.postalCode,
        propertyType: formData.propertyType,
        propertyOwnership: formData.propertyOwnership,
        roofSize: parseFloat(formData.roofSize) || 0,
        gpsLatitude: parseFloat(formData.gpsLatitude) || 0,
        gpsLongitude: parseFloat(formData.gpsLongitude) || 0,
        electricityConsumption: formData.electricityConsumption,
        electricityMeterNumber: formData.electricityMeterNumber,
        preferredLanguage: formData.preferredLanguage,
        emailNotifications: formData.emailNotifications === 'true',
        smsNotifications: formData.smsNotifications === 'true',
        marketingConsent: formData.marketingConsent === 'true'
      });

      if (!profileResult.success) {
        console.error('❌ Profile creation failed:', profileResult.error);
        // Auth was successful but profile failed - user still created
        setErrors({ general: `Account created but profile setup failed: ${profileResult.error}. Please complete your profile in your dashboard.` });
        setIsSubmitting(false);
        return;
      }

      console.log('✅ User profile creation successful');

      // Step 3: Upload documents to Document Service
      const uploadedDocumentIds: string[] = [];
      const documentUploadErrors: string[] = [];
      
      if (Object.keys(uploadedDocuments).length > 0) {
        console.log('📄 Starting document uploads...');
        setSubmissionStep('Uploading documents...');
        
        for (const [documentType, file] of Object.entries(uploadedDocuments)) {
          try {
            console.log(`📤 Uploading ${documentType}:`, file.name);
            
            const documentResult = await documentService.uploadDocument({
              file,
              userId: authResult.user?.id || profileResult.profile?.userId || '',
              categoryId: documentType,
              metadata: {
                originalFilename: file.name,
                fileSize: file.size,
                uploadedAt: new Date().toISOString(),
                documentType: documentType,
                userRegistration: true
              }
            });

            if (documentResult.success && documentResult.data) {
              uploadedDocumentIds.push(documentResult.data.documentId);
              console.log(`✅ Document ${documentType} uploaded successfully: ${documentResult.data.documentId}`);
            } else {
              const errorMsg = `Failed to upload ${documentType}: ${documentResult.error}`;
              documentUploadErrors.push(errorMsg);
              console.error(`❌ ${errorMsg}`);
            }
          } catch (uploadError: any) {
            const errorMsg = `Error uploading ${documentType}: ${uploadError.message || 'Unknown error'}`;
            documentUploadErrors.push(errorMsg);
            console.error(`❌ ${errorMsg}`, uploadError);
          }
        }

        // Log document upload summary
        if (uploadedDocumentIds.length > 0) {
          console.log(`✅ Successfully uploaded ${uploadedDocumentIds.length} documents`);
        }
        if (documentUploadErrors.length > 0) {
          console.warn(`⚠️ ${documentUploadErrors.length} document upload errors:`, documentUploadErrors);
        }
      }

      // Prepare complete user data for parent component
      const userData = {
        auth: authResult.user,
        profile: profileResult.profile,
        registration: {
          ...formData,
          role: 'USER',
          phone: formData.phone ? `${selectedCountry.code}${formData.phone}` : undefined
        },
        documents: {
          uploadedIds: uploadedDocumentIds,
          uploadErrors: documentUploadErrors,
          totalUploaded: uploadedDocumentIds.length,
          totalErrors: documentUploadErrors.length
        }
      };
      
      setSubmissionStep('Finalizing registration...');
      console.log('🎉 Registration completed successfully!');
      
      // Show document upload warnings if any
      if (documentUploadErrors.length > 0) {
        console.warn('⚠️ Registration completed but some documents failed to upload. User can upload them later from their dashboard.');
      }
      
      onComplete(userData);
      
    } catch (error: any) {
      console.error('❌ Registration failed:', error);
      
      // Set appropriate error message
      const errorMessage = error.message || error.error || 'Registration failed. Please try again.';
      setErrors({ general: errorMessage });
      
      // Log specific error details
      if (error.status) {
        console.error('API Error Details:', {
          status: error.status,
          message: errorMessage,
          details: error.details
        });
      }
      
    } finally {
      setIsSubmitting(false);
      setSubmissionStep('');
    }
  };

  const renderPasswordField = (
    field: keyof FormData,
    label: string,
    placeholder: string = '',
    showPassword: boolean,
    setShowPassword: (show: boolean) => void,
    required: boolean = false
  ) => (
    <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
      <label
        style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#374151',
          textAlign: isRTL ? 'right' : 'left'
        }}
      >
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={showPassword ? 'text' : 'password'}
          value={formData[field] as string}
          onChange={(e) => handleInputChange(field, e.target.value)}
          placeholder={placeholder}
          maxLength={25}
          style={{
            width: '100%',
            padding: '0.75rem',
            paddingRight: isRTL ? '0.75rem' : '2.5rem',
            paddingLeft: isRTL ? '2.5rem' : '0.75rem',
            border: `2px solid ${errors[field] ? '#ef4444' : 'rgba(229, 231, 235, 0.5)'}`,
            borderRadius: '8px',
            fontSize: '1rem',
            fontFamily: theme.typography.fonts.primary,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            textAlign: isRTL ? 'right' : 'left',
            direction: isRTL ? 'rtl' : 'ltr'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3eb2b1';
            e.target.style.boxShadow = '0 0 0 3px rgba(62, 178, 177, 0.1)';
            if (field === 'password') {
              setShowPasswordTooltip(true);
            }
          }}
          onBlur={(e) => {
            e.target.style.borderColor = errors[field] ? '#ef4444' : 'rgba(229, 231, 235, 0.5)';
            e.target.style.boxShadow = 'none';
            if (field === 'password') {
              setShowPasswordTooltip(false);
            }
          }}
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          style={{
            position: 'absolute',
            right: isRTL ? 'auto' : '0.75rem',
            left: isRTL ? '0.75rem' : 'auto',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '1.125rem',
            padding: '0.25rem',
            borderRadius: '4px',
            transition: 'color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = '#3eb2b1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = '#6b7280';
          }}
        >
          {showPassword ? '🙈' : '👁️'}
        </button>
      </div>
      
      {/* Password Tooltip */}
      {field === 'password' && showPasswordTooltip && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: isRTL ? 'auto' : '0',
          right: isRTL ? '0' : 'auto',
          zIndex: 1000,
          marginTop: '0.5rem',
          padding: '1rem',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '2px solid rgba(62, 178, 177, 0.2)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(62, 178, 177, 0.15)',
          minWidth: '300px',
          textAlign: isRTL ? 'right' : 'left',
          animation: 'fadeIn 0.2s ease-in-out'
        }}>
          <div style={{
            fontSize: '0.875rem',
            fontWeight: '600',
            color: '#1f2937',
            marginBottom: '0.5rem'
          }}>
            🔒 {t('auth.register.passwordHints.title')}
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#374151',
            lineHeight: '1.5'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem',
              color: formData.password.length >= 8 ? '#10b981' : '#6b7280'
            }}>
              <span>{formData.password.length >= 8 ? '✓' : '○'}</span>
              {t('auth.register.passwordHints.length')}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem',
              color: /[A-Z]/.test(formData.password) ? '#10b981' : '#6b7280'
            }}>
              <span>{/[A-Z]/.test(formData.password) ? '✓' : '○'}</span>
              {t('auth.register.passwordHints.uppercase')}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem',
              color: /[a-z]/.test(formData.password) ? '#10b981' : '#6b7280'
            }}>
              <span>{/[a-z]/.test(formData.password) ? '✓' : '○'}</span>
              {t('auth.register.passwordHints.lowercase')}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginBottom: '0.25rem',
              color: /[0-9]/.test(formData.password) ? '#10b981' : '#6b7280'
            }}>
              <span>{/[0-9]/.test(formData.password) ? '✓' : '○'}</span>
              {t('auth.register.passwordHints.number')}
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              color: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? '#10b981' : '#6b7280'
            }}>
              <span>{/[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? '✓' : '○'}</span>
              {t('auth.register.passwordHints.special')}
            </div>
          </div>
        </div>
      )}
      
      {errors[field] && (
        <span
          style={{
            display: 'block',
            marginTop: '0.25rem',
            fontSize: '0.75rem',
            color: '#ef4444',
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
          {errors[field]}
        </span>
      )}
    </div>
  );

  const renderSelectField = (
    field: keyof FormData,
    label: string,
    options: { value: string; label: string }[],
    placeholder: string = '',
    required: boolean = false
  ) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <label
        style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#374151',
          textAlign: isRTL ? 'right' : 'left'
        }}
      >
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
      </label>
      <div style={{ position: 'relative' }}>
        <select
          value={formData[field] as string}
          onChange={(e) => handleInputChange(field, e.target.value)}
          style={{
            width: '100%',
            padding: '0.75rem',
            paddingRight: isRTL ? '0.75rem' : '2.5rem',
            paddingLeft: isRTL ? '2.5rem' : '0.75rem',
            border: `2px solid ${errors[field] ? '#ef4444' : 'rgba(229, 231, 235, 0.5)'}`,
            borderRadius: '8px',
            fontSize: '1rem',
            fontFamily: theme.typography.fonts.primary,
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            textAlign: isRTL ? 'right' : 'left',
            direction: isRTL ? 'rtl' : 'ltr',
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            cursor: 'pointer'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = '#3eb2b1';
            e.target.style.boxShadow = '0 0 0 3px rgba(62, 178, 177, 0.1)';
          }}
          onBlur={(e) => {
            e.target.style.borderColor = errors[field] ? '#ef4444' : 'rgba(229, 231, 235, 0.5)';
            e.target.style.boxShadow = 'none';
          }}
        >
          <option value="" style={{ 
            color: '#9ca3af',
            fontStyle: 'italic'
          }}>
            {placeholder}
          </option>
          {options.map((option) => (
            <option key={option.value} value={option.value} style={{
              color: '#374151',
              fontWeight: '500',
              padding: '0.5rem',
              background: '#ffffff'
            }}>
              {option.label}
            </option>
          ))}
        </select>
        
        {/* Custom Dropdown Arrow */}
        <div
          style={{
            position: 'absolute',
            right: isRTL ? 'auto' : '0.75rem',
            left: isRTL ? '0.75rem' : 'auto',
            top: '50%',
            transform: 'translateY(-50%)',
            pointerEvents: 'none',
            color: '#6b7280',
            fontSize: '1rem'
          }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transition: 'transform 0.2s ease'
            }}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>
      {errors[field] && (
        <span
          style={{
            display: 'block',
            marginTop: '0.25rem',
            fontSize: '0.75rem',
            color: '#ef4444',
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
          {errors[field]}
        </span>
      )}
    </div>
  );

  const renderCheckboxField = (
    field: keyof FormData,
    label: string,
    description?: string
  ) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          cursor: 'pointer',
          flexDirection: isRTL ? 'row-reverse' : 'row'
        }}
      >
        <input
          type="checkbox"
          checked={formData[field] === 'true'}
          onChange={(e) => handleInputChange(field, e.target.checked.toString())}
          style={{
            width: '18px',
            height: '18px',
            marginTop: '2px',
            accentColor: '#3eb2b1',
            cursor: 'pointer'
          }}
        />
        <div style={{ flex: 1 }}>
          <span
            style={{
              fontSize: '0.875rem',
              fontWeight: '500',
              color: '#374151',
              textAlign: isRTL ? 'right' : 'left'
            }}
          >
            {label}
          </span>
          {description && (
            <p
              style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                margin: '0.25rem 0 0 0',
                textAlign: isRTL ? 'right' : 'left'
              }}
            >
              {description}
            </p>
          )}
        </div>
      </label>
    </div>
  );

  const renderDocumentUpload = (
    documentType: string,
    label: string,
    description: string,
    required: boolean = false
  ) => (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem',
        background: uploadedDocuments[documentType] ? 'rgba(240, 253, 244, 0.9)' : 'rgba(255, 255, 255, 0.9)',
        backdropFilter: 'blur(12px)',
        borderRadius: '12px',
        border: `2px solid ${documentErrors[documentType] ? '#ef4444' : uploadedDocuments[documentType] ? '#10b981' : '#e5e7eb'}`,
        transition: 'all 0.3s ease',
        boxShadow: uploadedDocuments[documentType] ? '0 4px 12px rgba(16, 185, 129, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.08)',
        cursor: uploadedDocuments[documentType] ? 'default' : 'pointer'
      }}
      onClick={() => {
        if (!uploadedDocuments[documentType]) {
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = '.jpg,.jpeg,.png';
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
              handleDocumentUpload(documentType, file);
            }
          };
          input.click();
        }
      }}
      onMouseEnter={(e) => {
        if (!uploadedDocuments[documentType]) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)';
        }
      }}
      onMouseLeave={(e) => {
        if (!uploadedDocuments[documentType]) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.08)';
        }
      }}
      >
        {/* Document Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{
              fontSize: '0.95rem',
              fontWeight: '600',
              color: '#1f2937'
            }}>
              {label}
            </span>
            {required && <span style={{ color: '#ef4444', fontSize: '0.8rem' }}>*</span>}
            {uploadedDocuments[documentType] && (
              <span style={{ 
                color: '#10b981', 
                fontSize: '0.9rem',
                background: 'rgba(16, 185, 129, 0.1)',
                padding: '0.15rem 0.4rem',
                borderRadius: '4px',
                fontWeight: '500'
              }}>✓ Uploaded</span>
            )}
          </div>
          <p style={{
            fontSize: '0.8rem',
            color: '#6b7280',
            margin: 0,
            lineHeight: '1.4'
          }}>
            {uploadedDocuments[documentType] ? 
              `${uploadedDocuments[documentType].name} (${(uploadedDocuments[documentType].size / 1024 / 1024).toFixed(1)}MB)` : 
              'JPG, PNG • Max 3MB'
            }
          </p>
        </div>

        {/* Upload Button/Status */}
        <div style={{ flexShrink: 0 }}>
          {uploadedDocuments[documentType] ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeDocument(documentType);
              }}
              style={{
                padding: '0.5rem',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                borderRadius: '6px',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              }}
            >
              ✕
            </button>
          ) : (
            <div style={{
              padding: '0.6rem 1.2rem',
              background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
              borderRadius: '8px',
              color: '#ffffff',
              fontSize: '0.85rem',
              fontWeight: '600',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span>📁</span>
              Upload
            </div>
          )}
        </div>
      </div>
      
      {documentErrors[documentType] && (
        <div style={{
          marginTop: '0.5rem',
          padding: '0.5rem 1rem',
          background: 'rgba(239, 68, 68, 0.05)',
          borderRadius: '6px',
          border: '1px solid rgba(239, 68, 68, 0.1)'
        }}>
          <span style={{
            fontSize: '0.75rem',
            color: '#ef4444',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ fontSize: '12px' }}>⚠️</span>
            {documentErrors[documentType]}
          </span>
        </div>
      )}
    </div>
  );

  const getInputRestriction = (field: keyof FormData) => {
    const nameFields = ['firstName', 'lastName'];
    const cityFields = ['city', 'district'];
    const numberFields = ['roofSize'];
    const alphanumericFields = ['electricityMeterNumber'];
    const postalFields = ['postalCode'];
    const phoneFields = ['phone'];
    const gpsFields = ['gpsLatitude', 'gpsLongitude'];
    const nationalIdFields = ['nationalId'];
    const emailFields = ['email'];

    if (nameFields.includes(field)) {
      return (value: string) => value.replace(/[^a-zA-Z\u0600-\u06FF\s]/g, '');
    }
    if (cityFields.includes(field)) {
      return (value: string) => value.replace(/[^a-zA-Z\u0600-\u06FF\s\-]/g, '');
    }
    if (numberFields.includes(field)) {
      return (value: string) => value.replace(/[^0-9]/g, '');
    }
    if (alphanumericFields.includes(field)) {
      return (value: string) => value.replace(/[^a-zA-Z0-9]/g, '');
    }
    if (postalFields.includes(field)) {
      return (value: string) => value.replace(/[^0-9]/g, '').slice(0, 5);
    }
    if (phoneFields.includes(field)) {
      return (value: string) => value.replace(/[^0-9]/g, '');
    }
    if (gpsFields.includes(field)) {
      return (value: string) => value.replace(/[^0-9.\-]/g, '');
    }
    if (nationalIdFields.includes(field)) {
      return (value: string) => value.replace(/[^0-9]/g, '').slice(0, 10);
    }
    if (emailFields.includes(field)) {
      return (value: string) => value.replace(/[^a-zA-Z0-9@._-]/g, '');
    }
    // For addresses and other fields, allow letters, numbers, spaces, and basic punctuation
    return (value: string) => value.replace(/[^a-zA-Z\u0600-\u06FF0-9\s\-\,\.]/g, '');
  };

  const renderFormField = (
    field: keyof FormData,
    label: string,
    type: string = 'text',
    placeholder?: string,
    maxLength?: number,
    required: boolean = false
  ) => (
    <div style={{ marginBottom: '1.5rem' }}>
      <label
        style={{
          display: 'block',
          marginBottom: '0.5rem',
          fontSize: '0.875rem',
          fontWeight: '500',
          color: '#374151',
          textAlign: isRTL ? 'right' : 'left'
        }}
      >
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>}
      </label>
      <input
        type={type}
        value={formData[field]}
        onChange={(e) => {
          const restrictValue = getInputRestriction(field);
          const cleanValue = restrictValue(e.target.value);
          handleInputChange(field, cleanValue);
        }}
        placeholder={placeholder}
        maxLength={maxLength || (field === 'nationalId' ? 10 : field === 'postalCode' ? 5 : 50)}
        style={{
          width: '100%',
          padding: '0.75rem',
          border: `2px solid ${errors[field] ? '#ef4444' : 'rgba(229, 231, 235, 0.5)'}`,
          borderRadius: '8px',
          fontSize: '1rem',
          fontFamily: theme.typography.fonts.primary,
          background: 'rgba(255, 255, 255, 0.7)',
          backdropFilter: 'blur(10px)',
          transition: 'all 0.2s ease',
          textAlign: isRTL ? 'right' : 'left',
          direction: isRTL ? 'rtl' : 'ltr'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#3eb2b1';
          e.target.style.boxShadow = '0 0 0 3px rgba(62, 178, 177, 0.1)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = errors[field] ? '#ef4444' : 'rgba(229, 231, 235, 0.5)';
          e.target.style.boxShadow = 'none';
        }}
      />
      {errors[field] && (
        <span
          style={{
            display: 'block',
            marginTop: '0.25rem',
            fontSize: '0.75rem',
            color: '#ef4444',
            textAlign: isRTL ? 'right' : 'left'
          }}
        >
          {errors[field]}
        </span>
      )}
    </div>
  );

  const renderStep = () => {
    switch (currentStep) {
      case 0: // Personal & Contact Information
        return (
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              {t('auth.register.steps.personalTitle')}
            </h2>
            
            {/* Personal Information Section */}
            <div style={{ marginBottom: '2rem' }}>
              <div 
                className="responsive-grid"
                style={{ marginBottom: '1.5rem' }}
              >
                {renderFormField('firstName', t('auth.register.firstName'), 'text', t('auth.register.firstNamePlaceholder'), 25, true)}
                {renderFormField('lastName', t('auth.register.lastName'), 'text', t('auth.register.lastNamePlaceholder'), 25, true)}
              </div>

              {/* User Type Selection */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontWeight: '500',
                    fontSize: '0.875rem',
                    color: '#1f2937',
                    textAlign: isRTL ? 'right' : 'left'
                  }}
                >
                  {t('auth.userType')} *
                </label>
                <select
                  value={formData.userType}
                  onChange={(e) => setFormData(prev => ({ ...prev, userType: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `1px solid ${errors.userType ? '#ef4444' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '1rem',
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    textAlign: isRTL ? 'right' : 'left',
                    direction: isRTL ? 'rtl' : 'ltr',
                    outline: 'none',
                    transition: 'border-color 0.2s ease',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#3eb2b1'}
                  onBlur={(e) => e.target.style.borderColor = errors.userType ? '#ef4444' : '#d1d5db'}
                >
                  <option value="HOMEOWNER">{t('auth.userTypes.HOMEOWNER')}</option>
                  <option value="BUSINESS">{t('auth.userTypes.BUSINESS')}</option>
                  <option value="INDUSTRIAL">{t('auth.userTypes.INDUSTRIAL')}</option>
                  <option value="GOVERNMENT">{t('auth.userTypes.GOVERNMENT')}</option>
                </select>
                {errors.userType && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#ef4444',
                    }}
                  >
                    {errors.userType}
                  </span>
                )}
              </div>
              
              {renderFormField('email', t('auth.register.email'), 'email', t('auth.register.emailPlaceholder'), 50, true)}
              
              {/* Phone Number with OTP Verification */}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    textAlign: isRTL ? 'right' : 'left'
                  }}
                >
                  {t('auth.register.phone')}
                  <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>
                  {phoneVerified && (
                    <span style={{ color: '#10b981', marginLeft: '0.5rem' }}>
                      ✓ {t('auth.register.verified')}
                    </span>
                  )}
                </label>
                
                <div className="phone-input-container">
                  {/* Country Code Dropdown */}
                  <div 
                    className="country-dropdown-container"
                    onClick={(e) => {
                      // Prevent event bubbling
                      e.stopPropagation();
                      // When clicking on the container, focus the select element
                      const select = e.currentTarget.querySelector('select');
                      if (select) {
                        select.focus();
                        // On mobile, just click the select directly
                        if (isMobile) {
                          select.click();
                        }
                      }
                    }}
                  >
                    <select
                      value={selectedCountry.code}
                      onChange={(e) => {
                        const country = countryData.find(c => c.code === e.target.value);
                        if (country) {
                          setSelectedCountry(country);
                          // Clear phone when country changes
                          handleInputChange('phone', '');
                        }
                      }}
                      onTouchStart={(e) => {
                        // Prevent parent click handlers on mobile
                        e.stopPropagation();
                      }}
                      style={{
                        width: '100%',
                        padding: '0.75rem 1.5rem 0.75rem 0.25rem',
                        border: `2px solid ${errors.phone ? '#ef4444' : phoneVerified ? '#10b981' : 'rgba(229, 231, 235, 0.5)'}`,
                        borderRadius: '8px',
                        fontSize: '0.8rem',
                        fontFamily: theme.typography.fonts.primary,
                        background: 'rgba(255, 255, 255, 0.7)',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.2s ease',
                        appearance: 'none',
                        WebkitAppearance: 'none',
                        MozAppearance: 'none',
                        cursor: 'pointer',
                        position: 'relative',
                        zIndex: 2
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = phoneVerified ? '#10b981' : '#3eb2b1';
                        e.target.style.boxShadow = phoneVerified 
                          ? '0 0 0 3px rgba(16, 185, 129, 0.1)' 
                          : '0 0 0 3px rgba(62, 178, 177, 0.1)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = errors.phone ? '#ef4444' : phoneVerified ? '#10b981' : 'rgba(229, 231, 235, 0.5)';
                        e.target.style.boxShadow = 'none';
                      }}
                    >
                      {countryData.map((country) => (
                        <option key={country.code} value={country.code}>
                          {country.flag} {country.code}
                        </option>
                      ))}
                    </select>
                    {/* Clickable Dropdown Arrow */}
                    <div
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: '#6b7280',
                        fontSize: '0.875rem',
                        pointerEvents: 'none',
                        zIndex: 1
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  
                  {/* Phone Number Input */}
                  <input
                    type="tel"
                    className="phone-number-input"
                    value={formData.phone}
                    onChange={(e) => {
                      // Only allow numbers and limit to country's digit count
                      const value = e.target.value.replace(/\D/g, '').slice(0, selectedCountry.digits);
                      handleInputChange('phone', value);
                    }}
                    placeholder={selectedCountry.placeholder}
                    maxLength={selectedCountry.digits}
                    onTouchStart={(e) => {
                      // Prevent interference with dropdown on mobile
                      e.stopPropagation();
                    }}
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      border: `2px solid ${errors.phone ? '#ef4444' : phoneVerified ? '#10b981' : 'rgba(229, 231, 235, 0.5)'}`,
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontFamily: theme.typography.fonts.primary,
                      background: 'rgba(255, 255, 255, 0.7)',
                      backdropFilter: 'blur(10px)',
                      transition: 'all 0.2s ease',
                      textAlign: isRTL ? 'right' : 'left',
                      direction: isRTL ? 'rtl' : 'ltr'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = phoneVerified ? '#10b981' : '#3eb2b1';
                      e.target.style.boxShadow = phoneVerified 
                        ? '0 0 0 3px rgba(16, 185, 129, 0.1)' 
                        : '0 0 0 3px rgba(62, 178, 177, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = errors.phone ? '#ef4444' : phoneVerified ? '#10b981' : 'rgba(229, 231, 235, 0.5)';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  
                  {formData.phone && formData.phone.length === selectedCountry.digits && !validatePhone(formData.phone) && !phoneVerified && (
                    <button
                      type="button"
                      onClick={sendOTP}
                      disabled={isSendingOtp || (otpSent && otpTimer > 0)}
                      style={{
                        padding: '0.75rem 1rem',
                        background: (isSendingOtp || (otpSent && otpTimer > 0))
                          ? 'rgba(156, 163, 175, 0.5)' 
                          : 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                        border: 'none',
                        borderRadius: '8px',
                        color: '#ffffff',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        cursor: (isSendingOtp || (otpSent && otpTimer > 0)) ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap',
                        minWidth: '100px'
                      }}
                    >
                      {isSendingOtp 
                        ? t('auth.register.sending') 
                        : (otpSent && otpTimer > 0)
                          ? `${t('auth.register.resend')} ${formatTimer(otpTimer)}`
                          : otpSent
                            ? t('auth.register.resend')
                            : t('auth.register.sendOTP')
                      }
                    </button>
                  )}
                </div>
                
                {/* OTP Input */}
                {otpSent && !phoneVerified && (
                  <div style={{ marginTop: '1rem' }}>
                    <label
                      style={{
                        display: 'block',
                        marginBottom: '0.5rem',
                        fontSize: '0.875rem',
                        fontWeight: '500',
                        color: '#374151',
                        textAlign: isRTL ? 'right' : 'left'
                      }}
                    >
                      {t('auth.register.enterOTP')}
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                      <input
                        type="text"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder={t('auth.register.otpPlaceholder')}
                        maxLength={6}
                        style={{
                          flex: 1,
                          padding: '0.75rem',
                          border: '2px solid rgba(229, 231, 235, 0.5)',
                          borderRadius: '8px',
                          fontSize: '1rem',
                          fontFamily: theme.typography.fonts.primary,
                          background: 'rgba(255, 255, 255, 0.7)',
                          backdropFilter: 'blur(10px)',
                          transition: 'all 0.2s ease',
                          textAlign: 'center',
                          letterSpacing: '0.25rem'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#3eb2b1';
                          e.target.style.boxShadow = '0 0 0 3px rgba(62, 178, 177, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = 'rgba(229, 231, 235, 0.5)';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                      <button
                        type="button"
                        onClick={verifyOTP}
                        disabled={isVerifyingOtp || otpCode.length !== 6}
                        style={{
                          padding: '0.75rem 1rem',
                          background: (isVerifyingOtp || otpCode.length !== 6)
                            ? 'rgba(156, 163, 175, 0.5)'
                            : 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                          border: 'none',
                          borderRadius: '8px',
                          color: '#ffffff',
                          fontSize: '0.875rem',
                          fontWeight: '600',
                          cursor: (isVerifyingOtp || otpCode.length !== 6) ? 'not-allowed' : 'pointer',
                          transition: 'all 0.2s ease',
                          whiteSpace: 'nowrap',
                          minWidth: '100px'
                        }}
                      >
                        {isVerifyingOtp ? t('auth.register.verifying') : t('auth.register.verify')}
                      </button>
                    </div>
                    <p style={{
                      fontSize: '0.75rem',
                      color: '#6b7280',
                      marginTop: '0.5rem',
                      textAlign: isRTL ? 'right' : 'left'
                    }}>
                      {t('auth.register.otpSentTo')} {selectedCountry.code}{formData.phone}
                    </p>
                  </div>
                )}
                
                {errors.phone && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      textAlign: isRTL ? 'right' : 'left'
                    }}
                  >
                    {errors.phone}
                  </span>
                )}
              </div>
              
              {renderFormField('nationalId', t('auth.register.nationalId'), 'text', t('auth.register.nationalIdPlaceholder'), 10)}
              
              {/* Password Fields */}
              <div style={{ marginTop: '2rem' }}>
                {renderPasswordField('password', t('auth.register.password'), t('auth.register.passwordPlaceholder'), showPassword, setShowPassword, true)}
                {renderPasswordField('confirmPassword', t('auth.register.confirmPassword'), t('auth.register.confirmPasswordPlaceholder'), showConfirmPassword, setShowConfirmPassword, true)}
              </div>
            </div>
          </div>
        );
      
      case 1: // Address Information
        return (
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              {t('auth.register.steps.addressTitle')}
            </h2>
            {/* Row 1 */}
            <div 
              className="responsive-grid"
              style={{ marginBottom: '1.5rem' }}
            >
              {renderSelectField('region', t('auth.register.region'), [
                { value: 'riyadh', label: t('auth.register.regions.riyadh') },
                { value: 'makkah', label: t('auth.register.regions.makkah') },
                { value: 'eastern', label: t('auth.register.regions.eastern') },
                { value: 'asir', label: t('auth.register.regions.asir') },
                { value: 'tabuk', label: t('auth.register.regions.tabuk') },
                { value: 'qassim', label: t('auth.register.regions.qassim') },
                { value: 'hail', label: t('auth.register.regions.hail') },
                { value: 'northern', label: t('auth.register.regions.northern') },
                { value: 'jazan', label: t('auth.register.regions.jazan') },
                { value: 'najran', label: t('auth.register.regions.najran') },
                { value: 'bahah', label: t('auth.register.regions.bahah') },
                { value: 'jouf', label: t('auth.register.regions.jouf') },
                { value: 'madinah', label: t('auth.register.regions.madinah') }
              ], t('auth.register.regionPlaceholder'), true)}
              {renderFormField('city', t('auth.register.city'), 'text', t('auth.register.cityPlaceholder'), 30, true)}
            </div>
            
            {/* Row 2 */}
            <div 
              className="responsive-grid"
              style={{ marginBottom: '1.5rem' }}
            >
              {renderFormField('district', t('auth.register.district'), 'text', t('auth.register.districtPlaceholder'), 30, true)}
              {renderFormField('streetAddress', t('auth.register.streetAddress'), 'text', t('auth.register.streetAddressPlaceholder'), 50, true)}
            </div>
            
            {/* Row 3 */}
            <div className="responsive-grid">
              {renderFormField('landmark', 'Landmark', 'text', 'Nearby landmark or building')}
              <div style={{ marginBottom: '1.5rem' }}>
                <label
                  style={{
                    display: 'block',
                    marginBottom: '0.5rem',
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: '#374151',
                    textAlign: isRTL ? 'right' : 'left'
                  }}
                >
                  {t('auth.register.postalCode')}
                  <span style={{ color: '#ef4444', marginLeft: '0.25rem' }}>*</span>
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => {
                    // Only allow numbers and limit to 5 digits
                    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
                    handleInputChange('postalCode', value);
                  }}
                  placeholder="12345"
                  maxLength={5}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: `2px solid ${errors.postalCode ? '#ef4444' : 'rgba(229, 231, 235, 0.5)'}`,
                    borderRadius: '8px',
                    fontSize: '1rem',
                    fontFamily: theme.typography.fonts.primary,
                    background: 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease',
                    textAlign: isRTL ? 'right' : 'left',
                    direction: isRTL ? 'rtl' : 'ltr'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#3eb2b1';
                    e.target.style.boxShadow = '0 0 0 3px rgba(62, 178, 177, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = errors.postalCode ? '#ef4444' : 'rgba(229, 231, 235, 0.5)';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                {errors.postalCode && (
                  <span
                    style={{
                      display: 'block',
                      marginTop: '0.25rem',
                      fontSize: '0.75rem',
                      color: '#ef4444',
                      textAlign: isRTL ? 'right' : 'left'
                    }}
                  >
                    {errors.postalCode}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      
      case 2: // Property & Energy Information
        return (
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              {t('auth.register.steps.propertyTitle')}
            </h2>
            
            {/* Property Information */}
            <div 
              className="responsive-grid"
              style={{ marginBottom: '1.5rem' }}
            >
              {renderSelectField('propertyType', t('auth.register.propertyType'), [
                { value: 'villa', label: t('auth.register.propertyTypes.villa') },
                { value: 'apartment', label: t('auth.register.propertyTypes.apartment') },
                { value: 'duplex', label: t('auth.register.propertyTypes.duplex') },
                { value: 'townhouse', label: t('auth.register.propertyTypes.townhouse') },
                { value: 'commercial', label: t('auth.register.propertyTypes.commercial') }
              ], t('auth.register.propertyTypePlaceholder'), true)}
              
              {renderSelectField('propertyOwnership', t('auth.register.propertyOwnership'), [
                { value: 'owned', label: t('auth.register.ownership.owned') },
                { value: 'rented', label: t('auth.register.ownership.rented') },
                { value: 'leased', label: t('auth.register.ownership.leased') }
              ], t('auth.register.propertyOwnershipPlaceholder'), true)}
            </div>
            
            {/* Roof Size and Meter */}
            <div 
              className="responsive-grid"
              style={{ marginBottom: '1.5rem' }}
            >
              {renderFormField('roofSize', t('auth.register.roofSize'), 'number', t('auth.register.roofSizePlaceholder'), 5, true)}
              {renderFormField('electricityMeterNumber', t('auth.register.meterNumber'), 'text', t('auth.register.meterNumberPlaceholder'), 15, true)}
            </div>
            
            {/* GPS Location */}
            <div style={{
              background: 'rgba(62, 178, 177, 0.05)',
              border: '1px solid rgba(62, 178, 177, 0.2)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '0.75rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📍 {t('auth.register.propertyLocation')}
              </h3>
              <div className="gps-grid">
                {renderFormField('gpsLatitude', t('auth.register.latitude'), 'text', '24.7136', 15)}
                {renderFormField('gpsLongitude', t('auth.register.longitude'), 'text', '46.6753', 15)}
              </div>
              <button
                type="button"
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (position) => {
                        handleInputChange('gpsLatitude', position.coords.latitude.toFixed(6));
                        handleInputChange('gpsLongitude', position.coords.longitude.toFixed(6));
                      },
                      (error) => {
                        console.error('Error getting location:', error);
                      }
                    );
                  }
                }}
                style={{
                  marginTop: '0.75rem',
                  padding: '0.5rem 1rem',
                  background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ffffff',
                  fontSize: '0.875rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(62, 178, 177, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                📍 {t('auth.register.getCurrentLocation')}
              </button>
            </div>
            
            {/* 12-Month Electricity Consumption */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '1.5rem',
              border: '1px solid rgba(229, 231, 235, 0.5)'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1rem'
              }}>
                ⚡ {t('auth.register.electricityConsumption')}
              </h3>
              <p style={{
                fontSize: '0.75rem',
                color: '#6b7280',
                marginBottom: '1rem'
              }}>
                {t('auth.register.electricityConsumptionHint')}
              </p>
              {renderSelectField('electricityConsumption', '', [
                { value: '0_200', label: t('auth.register.electricityConsumption.range1') },
                { value: '200_400', label: t('auth.register.electricityConsumption.range2') },
                { value: '400_600', label: t('auth.register.electricityConsumption.range3') },
                { value: '600_800', label: t('auth.register.electricityConsumption.range4') },
                { value: '800_1000', label: t('auth.register.electricityConsumption.range5') },
                { value: '1000_1200', label: t('auth.register.electricityConsumption.range6') },
                { value: '1200_1500', label: t('auth.register.electricityConsumption.range7') },
                { value: '1500_PLUS', label: t('auth.register.electricityConsumption.range8') }
              ], t('auth.register.electricityConsumption.selectAverage'), true)}
            </div>
          </div>
        );
      
      case 3: // Documents (KYC Upload)
        return (
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              {t('auth.register.steps.documentsTitle')}
            </h2>
            <p style={{
              fontSize: '0.875rem',
              color: '#6b7280',
              marginBottom: '2rem',
              textAlign: 'center',
              lineHeight: 1.6
            }}>
              Upload the required documents for KYC verification. All documents must be clear, readable, and in valid format.
            </p>
            
            {/* KYC Information Notice */}
            <div style={{
              background: 'rgba(62, 178, 177, 0.1)',
              border: '2px solid rgba(62, 178, 177, 0.2)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              textAlign: isRTL ? 'right' : 'left'
            }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '0.5rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                🔐 SAMA KYC Compliance
              </h3>
              <p style={{
                fontSize: '0.75rem',
                color: '#374151',
                margin: 0
              }}>
                As per SAMA regulations, all BNPL customers must complete KYC verification. Documents are encrypted and stored securely with 7-year retention for compliance.
              </p>
            </div>
            
            {/* Required Documents */}
            <div style={{ marginBottom: '2rem' }}>
              <h3 style={{
                fontSize: '1rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1rem'
              }}>
                Required Documents
              </h3>
              
              {renderDocumentUpload(
                'national_id',
                'Saudi National ID',
                'Front and back photo required',
                true
              )}
              
              {renderDocumentUpload(
                'proof_of_address',
                'Proof of Address',
                'Utility bill or bank statement',
                true
              )}
            </div>
            
          </div>
        );
      
      case 4: // Review & Verification
        return (
          <div>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              {t('auth.register.steps.review')}
            </h2>
            
            <div style={{
              background: 'rgba(62, 178, 177, 0.05)',
              border: '1px solid rgba(62, 178, 177, 0.2)',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                fontSize: '0.875rem',
                color: '#374151',
                lineHeight: 1.6,
                textAlign: isRTL ? 'right' : 'left'
              }}>
                {t('auth.register.reviewHint')}
              </p>
            </div>
            
            <div style={{
              display: 'grid',
              gap: '1.5rem'
            }}>
              {/* Personal Information */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(229, 231, 235, 0.5)',
                borderRadius: '12px',
                padding: '1.5rem'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>👤</span>
                  {t('auth.register.review.personalInfo')}
                </h3>
                <div style={{
                  display: 'grid',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.firstName')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.firstName || '-'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.lastName')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.lastName || '-'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.email')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.email || '-'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.phone')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.phone || '-'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.nationalId')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.nationalId || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(229, 231, 235, 0.5)',
                borderRadius: '12px',
                padding: '1.5rem'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>📍</span>
                  {t('auth.register.review.addressInfo')}
                </h3>
                <div style={{
                  display: 'grid',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.region')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.region || '-'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.city')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.city || '-'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.district')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.district || '-'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.streetAddress')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.streetAddress || '-'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.postalCode')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.postalCode || '-'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Property Information */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                border: '1px solid rgba(229, 231, 235, 0.5)',
                borderRadius: '12px',
                padding: '1.5rem'
              }}>
                <h3 style={{
                  fontSize: '1.125rem',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}>
                  <span style={{ fontSize: '1.25rem' }}>🏠</span>
                  {t('auth.register.review.propertyInfo')}
                </h3>
                <div style={{
                  display: 'grid',
                  gap: '0.75rem'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.propertyType')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.propertyType ? t(`auth.register.propertyTypes.${formData.propertyType}`) : '-'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.propertyOwnership')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.propertyOwnership ? t(`auth.register.propertyOwnershipTypes.${formData.propertyOwnership}`) : '-'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.roofSize')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.roofSize ? `${formData.roofSize} ${t('auth.register.sqm')}` : '-'}
                    </span>
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <span style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      {t('auth.register.electricityMeterNumber')}:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '500' }}>
                      {formData.electricityMeterNumber || '-'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 5: // Verification & NAFATH
        return (
          <div style={{ textAlign: 'center' }}>
            <h2 style={{
              fontSize: '1.5rem',
              fontWeight: '600',
              color: '#1f2937',
              marginBottom: '1.5rem'
            }}>
              {t('auth.register.steps.verificationTitle')}
            </h2>
            <p style={{
              fontSize: '1rem',
              color: '#6b7280',
              marginBottom: '2rem',
              lineHeight: 1.6
            }}>
              {t('auth.register.steps.verificationDescription')}
            </p>
            
            {/* NAFATH Integration Notice */}
            <div style={{
              background: 'rgba(62, 178, 177, 0.1)',
              border: '2px solid rgba(62, 178, 177, 0.2)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              textAlign: isRTL ? 'right' : 'left'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                justifyContent: isRTL ? 'flex-end' : 'flex-start'
              }}>
                🇸🇦 {t('auth.register.nafath.title')}
              </h3>
              <p style={{
                fontSize: '0.875rem',
                color: '#374151',
                marginBottom: '1rem'
              }}>
                {t('auth.register.nafath.description')}
              </p>
              <div style={{
                background: 'rgba(255, 255, 255, 0.7)',
                borderRadius: '8px',
                padding: '1rem',
                fontSize: '0.75rem',
                color: '#6b7280'
              }}>
                <strong>{t('auth.register.nafath.comingSoon')}</strong>
                <br />
                {t('auth.register.nafath.currentlyEmail')}
              </div>
            </div>
            
            {/* Summary */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.7)',
              backdropFilter: 'blur(10px)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '2rem',
              textAlign: isRTL ? 'right' : 'left'
            }}>
              <h3 style={{
                fontSize: '1.125rem',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '1rem'
              }}>
                {t('auth.register.summary.title')}
              </h3>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.8 }}>
                <p><strong>{t('auth.register.summary.name')}:</strong> {formData.firstName} {formData.lastName}</p>
                <p><strong>{t('auth.userType')}:</strong> {t(`auth.userTypes.${formData.userType}`)}</p>
                <p><strong>{t('auth.register.summary.email')}:</strong> {formData.email}</p>
                {formData.phone && <p><strong>{t('auth.register.summary.phone')}:</strong> {selectedCountry.code}{formData.phone}</p>}
                {formData.nationalId && <p><strong>{t('auth.register.summary.nationalId')}:</strong> {formData.nationalId}</p>}
                {formData.region && <p><strong>{t('auth.register.summary.region')}:</strong> {t(`auth.register.regions.${formData.region}`)}</p>}
                {formData.city && <p><strong>{t('auth.register.summary.city')}:</strong> {formData.city}</p>}
                {formData.propertyType && <p><strong>{t('auth.register.summary.propertyType')}:</strong> {t(`auth.register.propertyTypes.${formData.propertyType}`)}</p>}
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f0fdfc 0%, #e6fffd 100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <GlobalHeader onLogin={onLogin} onRegister={onRegister} />
      
      <div style={{
        flex: 1,
        padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 3vw, 2rem)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div 
          className="form-container"
          style={{
            width: '100%',
            maxWidth: '1200px',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '2px solid rgba(255, 255, 255, 0.5)',
            borderRadius: '24px',
            padding: 'clamp(1rem, 4vw, 3rem)',
            boxShadow: '0 8px 32px rgba(62, 178, 177, 0.15), 0 0 80px rgba(62, 178, 177, 0.1)'
          }}
        >
          {/* Steps Sidebar */}
          <div className="sidebar">
            <StepIndicator steps={steps} currentStep={currentStep} />
          </div>
          
          {/* Main Content */}
          <div style={{
            flex: 1,
            minHeight: '500px',
            overflow: 'hidden'
          }}>
            {/* General Error Display */}
            {errors.general && (
              <div style={{
                margin: '0 0 1.5rem 0',
                padding: '1rem',
                background: 'rgba(254, 242, 242, 0.95)',
                border: '2px solid #f87171',
                borderRadius: '12px',
                backdropFilter: 'blur(12px)',
                boxShadow: '0 4px 12px rgba(248, 113, 113, 0.15)'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  flexDirection: isRTL ? 'row-reverse' : 'row'
                }}>
                  <span style={{
                    fontSize: '1.2rem',
                    color: '#dc2626',
                    marginTop: '2px'
                  }}>
                    ⚠️
                  </span>
                  <div style={{ flex: 1 }}>
                    <h4 style={{
                      margin: '0 0 0.5rem 0',
                      fontSize: '0.875rem',
                      fontWeight: '600',
                      color: '#dc2626',
                      textAlign: isRTL ? 'right' : 'left'
                    }}>
                      {t('common.error')}
                    </h4>
                    <p style={{
                      margin: 0,
                      fontSize: '0.875rem',
                      color: '#7f1d1d',
                      lineHeight: '1.5',
                      textAlign: isRTL ? 'right' : 'left'
                    }}>
                      {errors.general}
                    </p>
                  </div>
                  <button
                    onClick={() => setErrors({ ...errors, general: undefined })}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#dc2626',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      padding: '0',
                      width: '24px',
                      height: '24px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      transition: 'background-color 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'rgba(220, 38, 38, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                    title={t('common.close')}
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            
            {renderStep()}
          
            {/* Navigation Buttons */}
            <div 
              className="nav-buttons"
              style={{
                flexDirection: isRTL ? 'row-reverse' : 'row'
              }}
            >
              <button
                onClick={currentStep === 0 ? onBack : handlePrevious}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: 'rgba(255, 255, 255, 0.3)',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  color: '#374151',
                  fontSize: '0.9rem',
                  fontWeight: '500',
                  fontFamily: theme.typography.fonts.primary,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {isRTL ? '→' : '←'} {currentStep === 0 ? t('common.back') : t('common.previous')}
              </button>
              
              <button
                onClick={currentStep === steps.length - 1 ? handleSubmit : handleNext}
                disabled={isSubmitting}
                style={{
                  padding: '0.75rem 1.5rem',
                  background: isSubmitting 
                    ? 'rgba(156, 163, 175, 0.5)' 
                    : 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                  border: 'none',
                  borderRadius: '12px',
                  color: '#ffffff',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  fontFamily: theme.typography.fonts.primary,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  overflow: 'hidden',
                  opacity: isSubmitting ? 0.7 : 1,
                  minWidth: '120px'
                }}
                onMouseEnter={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #22d3db 0%, #5cecea 100%)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSubmitting) {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }
                }}
              >
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ 
                      display: 'inline-block', 
                      width: '16px', 
                      height: '16px', 
                      border: '2px solid #ffffff',
                      borderTop: '2px solid transparent',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }} />
                    {submissionStep || t('common.loading')}
                  </span>
                ) : (
                  <>
                    {currentStep === steps.length - 1 ? t('auth.register.createAccount') : t('common.next')}
                    <span style={{ marginLeft: '0.5rem' }}>{isRTL ? '←' : '→'}</span>
                  </>
                )}
                
                {!isSubmitting && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
                      animation: 'wave 2s ease-in-out infinite'
                    }}
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserRegistration;