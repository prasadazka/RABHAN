import Joi from 'joi';

export class ValidationUtils {
  public static readonly SAUDI_PHONE_REGEX = /^(\+966|0)?5[0-9]{8}$/;
  public static readonly INDIAN_PHONE_REGEX = /^\+91[6-9][0-9]{9}$/;
  public static readonly MULTI_COUNTRY_PHONE_REGEX = /^(\+966[5][0-9]{8}|\+91[6-9][0-9]{9}|\+1[2-9][0-9]{9})$/;
  public static readonly SAUDI_NATIONAL_ID_REGEX = /^[12][0-9]{9}$/;
  public static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  public static validateEmail(email: string): boolean {
    return this.EMAIL_REGEX.test(email);
  }

  public static validateSaudiPhone(phone: string): boolean {
    return this.SAUDI_PHONE_REGEX.test(phone);
  }

  public static validateMultiCountryPhone(phone: string): boolean {
    return this.MULTI_COUNTRY_PHONE_REGEX.test(phone);
  }

  public static validateSaudiNationalId(nationalId: string): boolean {
    if (!this.SAUDI_NATIONAL_ID_REGEX.test(nationalId)) {
      return false;
    }

    const firstDigit = nationalId.charAt(0);
    return firstDigit === '1' || firstDigit === '2';
  }

  public static normalizeSaudiPhone(phone: string): string {
    let normalized = phone.replace(/[\s\-\(\)]/g, '');
    
    if (normalized.startsWith('00966')) {
      normalized = '+966' + normalized.substring(5);
    } else if (normalized.startsWith('966')) {
      normalized = '+966' + normalized.substring(3);
    } else if (normalized.startsWith('0')) {
      normalized = '+966' + normalized.substring(1);
    } else if (!normalized.startsWith('+')) {
      normalized = '+966' + normalized;
    }
    
    return normalized;
  }

  public static sanitizeInput(input: string): string {
    return input
      .trim()
      .replace(/[<>]/g, '')
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"');
  }

  public static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }
}

// Transform camelCase frontend data to snake_case backend format
export const transformFrontendData = (data: any) => {
  const transformed = { ...data };
  
  // Transform field names - prioritize camelCase, fallback to snake_case
  if (data.firstName && !data.first_name) {
    transformed.first_name = data.firstName;
  }
  if (data.lastName && !data.last_name) {
    transformed.last_name = data.lastName;
  }
  if (data.nationalId && !data.national_id) {
    transformed.national_id = data.nationalId;
  }
  
  // Contractor-specific transformations
  if (data.companyName && !data.company_name) {
    transformed.company_name = data.companyName;
  }
  if (data.crNumber && !data.cr_number) {
    transformed.cr_number = data.crNumber;
  }
  if (data.vatNumber && !data.vat_number) {
    transformed.vat_number = data.vatNumber;
  }
  
  // Ensure we have the snake_case fields for backend processing
  if (!transformed.first_name && transformed.firstName) {
    transformed.first_name = transformed.firstName;
  }
  if (!transformed.last_name && transformed.lastName) {
    transformed.last_name = transformed.lastName;
  }
  if (!transformed.national_id && transformed.nationalId) {
    transformed.national_id = transformed.nationalId;
  }
  if (!transformed.company_name && transformed.companyName) {
    transformed.company_name = transformed.companyName;
  }
  if (!transformed.cr_number && transformed.crNumber) {
    transformed.cr_number = transformed.crNumber;
  }
  if (!transformed.vat_number && transformed.vatNumber) {
    transformed.vat_number = transformed.vatNumber;
  }
  
  return transformed;
};

export const validationSchemas = {
  register: Joi.object({
    // Accept frontend camelCase or backend snake_case
    firstName: Joi.string().min(2).max(50).optional(),
    first_name: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    last_name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required'
    }),
    phone: Joi.string().pattern(ValidationUtils.MULTI_COUNTRY_PHONE_REGEX).optional().messages({
      'string.pattern.base': 'Please provide a valid phone number (Saudi +966, India +91, or US +1)'
    }),
    nationalId: Joi.string().allow('').optional(),
    national_id: Joi.string().allow('').optional(),
    role: Joi.string().valid('USER', 'CONTRACTOR').optional().default('USER').messages({
      'any.only': 'Role must be either USER or CONTRACTOR'
    }),
    user_type: Joi.string().valid('HOMEOWNER', 'BUSINESS', 'INDUSTRIAL').optional().default('HOMEOWNER').messages({
      'any.only': 'User type must be HOMEOWNER, BUSINESS, or INDUSTRIAL'
    })
  })
  .or('firstName', 'first_name')  // Require at least one first name field
  .or('lastName', 'last_name'),   // Require at least one last name field

  contractorRegister: Joi.object({
    // Accept frontend camelCase or backend snake_case
    firstName: Joi.string().min(2).max(50).optional(),
    first_name: Joi.string().min(2).max(50).optional(),
    lastName: Joi.string().min(2).max(50).optional(),
    last_name: Joi.string().min(2).max(50).optional(),
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid business email address',
      'any.required': 'Business email is required'
    }),
    password: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'Password is required'
    }),
    phone: Joi.string().pattern(ValidationUtils.MULTI_COUNTRY_PHONE_REGEX).required().messages({
      'string.pattern.base': 'Please provide a valid business phone number (Saudi +966, India +91, or US +1)',
      'any.required': 'Business phone number is required'
    }),
    // Company info - stored in contractors table
    companyName: Joi.string().min(2).max(255).required().messages({
      'string.min': 'Company name must be at least 2 characters',
      'string.max': 'Company name must not exceed 255 characters',
      'any.required': 'Company name is required'
    }),
    company_name: Joi.string().min(2).max(255).optional(),
    crNumber: Joi.string().max(50).required().messages({
      'string.max': 'CR number must not exceed 50 characters',
      'any.required': 'CR number is required',
      'string.empty': 'CR number cannot be empty'
    }),
    cr_number: Joi.string().max(50).optional(),
    vatNumber: Joi.string().max(20).required().messages({
      'string.max': 'VAT number must not exceed 20 characters',
      'any.required': 'VAT number is required', 
      'string.empty': 'VAT number cannot be empty'
    }),
    vat_number: Joi.string().max(20).optional(),
    // Role automatically set to CONTRACTOR
    role: Joi.string().valid('CONTRACTOR').default('CONTRACTOR'),
    user_type: Joi.string().valid('HOMEOWNER', 'BUSINESS', 'INDUSTRIAL').optional().default('BUSINESS').messages({
      'any.only': 'User type must be HOMEOWNER, BUSINESS, or INDUSTRIAL'
    })
  })
  .or('firstName', 'first_name')  // Require at least one first name field
  .or('lastName', 'last_name')    // Require at least one last name field
  .or('companyName', 'company_name')  // Require at least one company name field
  .or('crNumber', 'cr_number')        // Require at least one CR number field
  .or('vatNumber', 'vat_number'),     // Require at least one VAT number field

  login: Joi.object({
    email: Joi.string().email().messages({
      'string.email': 'Please provide a valid email address'
    }),
    phone: Joi.string().pattern(ValidationUtils.MULTI_COUNTRY_PHONE_REGEX).messages({
      'string.pattern.base': 'Please provide a valid phone number (Saudi +966, India +91, or US +1)'
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required'
    }),
    userType: Joi.string().valid('USER', 'CONTRACTOR').required().messages({
      'any.only': 'User type must be either USER or CONTRACTOR',
      'any.required': 'User type must be specified (USER or CONTRACTOR)'
    }),
    deviceId: Joi.string().optional()
  }).or('email', 'phone').messages({
    'object.missing': 'Either email or phone number is required'
  }),


  refreshToken: Joi.object({
    refreshToken: Joi.string().required().messages({
      'any.required': 'Refresh token is required'
    })
  }),

  resetPassword: Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required'
    })
  }),

  confirmResetPassword: Joi.object({
    token: Joi.string().required().messages({
      'any.required': 'Reset token is required'
    }),
    newPassword: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'New password is required'
    })
  }),

  changePassword: Joi.object({
    oldPassword: Joi.string().required().messages({
      'any.required': 'Old password is required'
    }),
    newPassword: Joi.string().min(8).required().messages({
      'string.min': 'Password must be at least 8 characters long',
      'any.required': 'New password is required'
    })
  })
};