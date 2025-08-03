interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

interface PhoneValidationResult extends ValidationResult {
  formatted?: string;
  country?: string;
  type?: 'mobile' | 'landline';
}

interface EmailValidationResult extends ValidationResult {
  normalized?: string;
  domain?: string;
}

export class ValidationUtils {
  
  // Saudi National ID validation
  static validateSaudiNationalId(nationalId: string): ValidationResult {
    const errors: string[] = [];
    
    if (!nationalId) {
      errors.push('National ID is required');
      return { valid: false, errors };
    }
    
    // Remove any spaces or dashes
    const cleaned = nationalId.replace(/[\s-]/g, '');
    
    // Check format: must be 10 digits starting with 1 or 2
    if (!/^[12][0-9]{9}$/.test(cleaned)) {
      errors.push('National ID must be 10 digits starting with 1 or 2');
    }
    
    // Basic checksum validation for Saudi National ID
    if (cleaned.length === 10) {
      const checksum = this.calculateSaudiIdChecksum(cleaned);
      if (!checksum.valid) {
        errors.push('Invalid National ID checksum');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Saudi phone number validation and normalization
  static validateSaudiPhone(phone: string): PhoneValidationResult {
    const errors: string[] = [];
    
    if (!phone) {
      errors.push('Phone number is required');
      return { valid: false, errors };
    }
    
    // Remove spaces, dashes, parentheses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');
    
    // Handle different formats
    if (cleaned.startsWith('00966')) {
      cleaned = cleaned.substring(5);
    } else if (cleaned.startsWith('+966')) {
      cleaned = cleaned.substring(4);
    } else if (cleaned.startsWith('966')) {
      cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }
    
    // Saudi mobile numbers: 5XXXXXXXX (9 digits starting with 5)
    // Saudi landline: 1XXXXXXX (8 digits starting with 1,2,3,4,6,7)
    const mobilePattern = /^5[0-9]{8}$/;
    const landlinePattern = /^[1234678][0-9]{7}$/;
    
    let type: 'mobile' | 'landline' | undefined;
    let formatted: string;
    
    if (mobilePattern.test(cleaned)) {
      type = 'mobile';
      formatted = `+966${cleaned}`;
    } else if (landlinePattern.test(cleaned)) {
      type = 'landline';
      formatted = `+966${cleaned}`;
    } else {
      errors.push('Invalid Saudi phone number format');
      return { valid: false, errors };
    }
    
    return {
      valid: true,
      errors: [],
      formatted,
      country: 'SA',
      type
    };
  }
  
  // Email validation and normalization
  static validateEmail(email: string): EmailValidationResult {
    const errors: string[] = [];
    
    if (!email) {
      errors.push('Email is required');
      return { valid: false, errors };
    }
    
    const normalized = email.toLowerCase().trim();
    
    // Basic email regex (more comprehensive than simple ones)
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
    
    if (!emailRegex.test(normalized)) {
      errors.push('Invalid email format');
      return { valid: false, errors };
    }
    
    const domain = normalized.split('@')[1];
    
    // Check for common typos in Saudi domains
    const warnings: string[] = [];
    if (domain.includes('gmial') || domain.includes('gmai.com')) {
      warnings.push('Did you mean gmail.com?');
    }
    
    return {
      valid: true,
      errors: [],
      warnings,
      normalized,
      domain
    };
  }
  
  // Password strength validation
  static validatePassword(password: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
      return { valid: false, errors };
    }
    
    // SAMA security requirements
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters long');
    }
    
    if (password.length > 128) {
      errors.push('Password must not exceed 128 characters');
    }
    
    // Character requirements
    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password);
    
    if (!hasLower) errors.push('Password must contain at least one lowercase letter');
    if (!hasUpper) errors.push('Password must contain at least one uppercase letter');
    if (!hasDigit) errors.push('Password must contain at least one number');
    if (!hasSpecial) errors.push('Password must contain at least one special character');
    
    // Common password checks
    const commonPasswords = [
      'password', '123456', 'qwerty', 'admin', 'root',
      'password123', '123456789', 'welcome', 'login'
    ];
    
    if (commonPasswords.includes(password.toLowerCase())) {
      errors.push('Password is too common, please choose a more secure password');
    }
    
    // Sequential characters
    if (/123456|abcdef|qwerty/i.test(password)) {
      warnings.push('Avoid sequential characters for better security');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  // IBAN validation for Saudi banks
  static validateSaudiIBAN(iban: string): ValidationResult {
    const errors: string[] = [];
    
    if (!iban) {
      errors.push('IBAN is required');
      return { valid: false, errors };
    }
    
    const cleaned = iban.replace(/\s/g, '').toUpperCase();
    
    // Saudi IBAN format: SA followed by 22 digits
    if (!cleaned.startsWith('SA')) {
      errors.push('IBAN must be for a Saudi bank (start with SA)');
    }
    
    if (cleaned.length !== 24) {
      errors.push('Saudi IBAN must be exactly 24 characters');
    }
    
    if (!/^SA[0-9]{22}$/.test(cleaned)) {
      errors.push('Invalid Saudi IBAN format');
    }
    
    // IBAN checksum validation
    if (cleaned.length === 24) {
      const isValid = this.validateIBANChecksum(cleaned);
      if (!isValid) {
        errors.push('Invalid IBAN checksum');
      }
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // Business registration validation
  static validateCRNumber(crNumber: string): ValidationResult {
    const errors: string[] = [];
    
    if (!crNumber) {
      errors.push('Commercial Registration number is required');
      return { valid: false, errors };
    }
    
    const cleaned = crNumber.replace(/\s/g, '');
    
    // Saudi CR format: 10 digits
    if (!/^[0-9]{10}$/.test(cleaned)) {
      errors.push('Commercial Registration must be 10 digits');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // VAT number validation
  static validateVATNumber(vatNumber: string): ValidationResult {
    const errors: string[] = [];
    
    if (!vatNumber) {
      errors.push('VAT number is required');
      return { valid: false, errors };
    }
    
    const cleaned = vatNumber.replace(/\s/g, '');
    
    // Saudi VAT format: 15 digits
    if (!/^[0-9]{15}$/.test(cleaned)) {
      errors.push('VAT number must be 15 digits');
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
  
  // BNPL amount validation
  static validateBNPLAmount(amount: number): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    if (amount <= 0) {
      errors.push('Amount must be greater than 0');
    }
    
    if (amount > 5000) {
      errors.push('Amount exceeds SAMA BNPL limit of SAR 5,000');
    }
    
    if (amount > 4000) {
      warnings.push('Amount is close to SAMA BNPL limit');
    }
    
    // Minimum practical amount
    if (amount < 100) {
      warnings.push('Amount is below recommended minimum of SAR 100');
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }
  
  // Utility functions
  private static calculateSaudiIdChecksum(nationalId: string): { valid: boolean; checksum?: number } {
    // Simplified checksum calculation - in production, use official algorithm
    const digits = nationalId.split('').map(Number);
    let sum = 0;
    
    for (let i = 0; i < 9; i++) {
      sum += digits[i] * (10 - i);
    }
    
    const checksum = (11 - (sum % 11)) % 11;
    return {
      valid: checksum === digits[9],
      checksum
    };
  }
  
  private static validateIBANChecksum(iban: string): boolean {
    // Move first 4 characters to end
    const rearranged = iban.substring(4) + iban.substring(0, 4);
    
    // Replace letters with numbers (A=10, B=11, etc.)
    let numeric = '';
    for (const char of rearranged) {
      if (char >= 'A' && char <= 'Z') {
        numeric += (char.charCodeAt(0) - 55).toString();
      } else {
        numeric += char;
      }
    }
    
    // Calculate mod 97
    let remainder = 0;
    for (const digit of numeric) {
      remainder = (remainder * 10 + parseInt(digit)) % 97;
    }
    
    return remainder === 1;
  }
  
  // Normalize phone for database storage
  static normalizeSaudiPhone(phone: string): string {
    const validation = this.validateSaudiPhone(phone);
    return validation.formatted || phone;
  }
  
  // Normalize email for database storage
  static normalizeEmail(email: string): string {
    const validation = this.validateEmail(email);
    return validation.normalized || email.toLowerCase().trim();
  }
}