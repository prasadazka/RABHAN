import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../types';

// Saudi-specific validation patterns
const SAUDI_POSTAL_CODE = /^\d{5}$/;
const SAUDI_PHONE = /^(5|50|53|54|55|56|57|58|59)\d{7}$/;
const METER_NUMBER = /^[A-Z0-9]{6,15}$/;
const NAME_PATTERN = /^[a-zA-Z\u0600-\u06FF\s]+$/;

// Validation schemas
const createProfileSchema = Joi.object({
  userId: Joi.string().uuid().required(),
  firstName: Joi.string().min(2).max(50).pattern(NAME_PATTERN).required(),
  lastName: Joi.string().min(2).max(50).pattern(NAME_PATTERN).required(),
  
  // Address
  region: Joi.string().valid(
    'riyadh', 'makkah', 'eastern', 'asir', 'tabuk', 'qassim',
    'hail', 'northern', 'jazan', 'najran', 'bahah', 'jouf', 'madinah'
  ).required(),
  city: Joi.string().min(2).max(50).pattern(NAME_PATTERN).required(),
  district: Joi.string().min(2).max(50).required(),
  streetAddress: Joi.string().min(5).max(100).required(),
  landmark: Joi.string().max(100).optional(),
  postalCode: Joi.string().pattern(SAUDI_POSTAL_CODE).required(),
  
  // Property
  propertyType: Joi.string().valid(
    'VILLA', 'APARTMENT', 'DUPLEX', 'TOWNHOUSE', 'COMMERCIAL', 'INDUSTRIAL', 'OTHER'
  ).required(),
  propertyOwnership: Joi.string().valid('OWNED', 'RENTED', 'LEASED', 'FAMILY_OWNED').required(),
  roofSize: Joi.number().min(10).max(10000).required(),
  gpsLatitude: Joi.number().min(-90).max(90).required(),
  gpsLongitude: Joi.number().min(-180).max(180).required(),
  electricityConsumption: Joi.string().min(1).max(50).required(),
  electricityMeterNumber: Joi.string().pattern(METER_NUMBER).required(),
  
  // Preferences
  preferredLanguage: Joi.string().valid('en', 'ar').default('ar'),
  emailNotifications: Joi.boolean().default(true),
  smsNotifications: Joi.boolean().default(true),
  marketingConsent: Joi.boolean().default(false)
});

const updateProfileSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).pattern(NAME_PATTERN),
  lastName: Joi.string().min(2).max(50).pattern(NAME_PATTERN),
  
  // Address
  region: Joi.string().valid(
    'riyadh', 'makkah', 'eastern', 'asir', 'tabuk', 'qassim',
    'hail', 'northern', 'jazan', 'najran', 'bahah', 'jouf', 'madinah'
  ),
  city: Joi.string().min(2).max(50).pattern(NAME_PATTERN),
  district: Joi.string().min(2).max(50),
  streetAddress: Joi.string().min(5).max(100),
  landmark: Joi.string().max(100).allow(''),
  postalCode: Joi.string().pattern(SAUDI_POSTAL_CODE),
  
  // Property
  propertyType: Joi.string().valid(
    'VILLA', 'APARTMENT', 'DUPLEX', 'TOWNHOUSE', 'COMMERCIAL', 'INDUSTRIAL', 'OTHER'
  ),
  propertyOwnership: Joi.string().valid('OWNED', 'RENTED', 'LEASED', 'FAMILY_OWNED'),
  roofSize: Joi.number().min(10).max(10000),
  gpsLatitude: Joi.number().min(-90).max(90),
  gpsLongitude: Joi.number().min(-180).max(180),
  electricityConsumption: Joi.string().min(1).max(50),
  electricityMeterNumber: Joi.string().pattern(METER_NUMBER),
  
  // Preferences
  preferredLanguage: Joi.string().valid('en', 'ar'),
  emailNotifications: Joi.boolean(),
  smsNotifications: Joi.boolean(),
  marketingConsent: Joi.boolean(),
  
  // Employment Information (camelCase from frontend)
  employmentStatus: Joi.string().valid('government', 'private', 'selfEmployed', 'student', 'retired'),
  employerName: Joi.string().min(2).max(100),
  jobTitle: Joi.string().min(2).max(100),
  monthlyIncome: Joi.number().min(0).max(1000000), // Accept as number from frontend
  yearsEmployed: Joi.number().integer().min(0).max(50), // Accept as number from frontend
  
  // Solar System Preferences (camelCase from frontend)
  desiredSystemSize: Joi.number().min(0).max(100),
  budgetRange: Joi.string().valid('under_10k', '10k_25k', '25k_50k', '50k_100k', 'over_100k'),
  
  // Personal Information
  date_of_birth: Joi.date().max('now').min('1900-01-01'),
  marital_status: Joi.string().valid('single', 'married', 'divorced', 'widowed'),
  dependents: Joi.alternatives().try(
    Joi.number().integer().min(0).max(20),
    Joi.string().pattern(/^\d{1,2}$/).custom((value) => parseInt(value, 10))
  )
}).min(1); // At least one field must be provided

const createRegistrationProfileSchema = Joi.object({
  userId: Joi.string().uuid().optional(), // Optional during registration
  firstName: Joi.string().min(2).max(50).pattern(NAME_PATTERN).required(),
  lastName: Joi.string().min(2).max(50).pattern(NAME_PATTERN).required(),
  
  // Address
  region: Joi.string().valid(
    'riyadh', 'makkah', 'eastern', 'asir', 'tabuk', 'qassim',
    'hail', 'northern', 'jazan', 'najran', 'bahah', 'jouf', 'madinah'
  ).required(),
  city: Joi.string().min(2).max(50).pattern(NAME_PATTERN).required(),
  district: Joi.string().min(2).max(50).optional(),
  streetAddress: Joi.string().min(5).max(100).optional(),
  landmark: Joi.string().max(100).optional(),
  postalCode: Joi.string().pattern(SAUDI_POSTAL_CODE).optional(),
  
  // Property
  propertyType: Joi.string().valid(
    'VILLA', 'APARTMENT', 'DUPLEX', 'TOWNHOUSE', 'COMMERCIAL', 'INDUSTRIAL', 'OTHER'
  ).required(),
  propertyOwnership: Joi.string().valid('OWNED', 'RENTED', 'LEASED', 'FAMILY_OWNED').required(),
  roofSize: Joi.number().min(10).max(10000).required(),
  gpsLatitude: Joi.number().min(-90).max(90).required(),
  gpsLongitude: Joi.number().min(-180).max(180).required(),
  electricityConsumption: Joi.string().min(1).max(50).required(),
  electricityMeterNumber: Joi.string().pattern(METER_NUMBER).required(),
  
  // Preferences
  preferredLanguage: Joi.string().valid('en', 'ar').default('ar'),
  emailNotifications: Joi.boolean().default(true),
  smsNotifications: Joi.boolean().default(true),
  marketingConsent: Joi.boolean().default(false)
});

const updateDocumentStatusSchema = Joi.object({
  status: Joi.string().valid('verified', 'rejected').required(),
  rejectionReason: Joi.when('status', {
    is: 'rejected',
    then: Joi.string().min(10).max(500).required(),
    otherwise: Joi.forbidden()
  })
});

// Validation middleware
export const validateCreateProfile = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = createProfileSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    throw new ValidationError('Validation failed', details);
  }

  // GPS coordinates are already validated by Joi schema for valid lat/lng ranges
  // No additional location restrictions

  req.body = value;
  next();
};

export const validateCreateRegistrationProfile = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = createRegistrationProfileSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    throw new ValidationError('Validation failed', details);
  }

  // GPS coordinates are already validated by Joi schema for valid lat/lng ranges
  // No additional location restrictions

  req.body = value;
  next();
};

export const validateUpdateProfile = (req: Request, res: Response, next: NextFunction) => {
  console.log('🔍 Validating profile update with body:', req.body);
  
  const { error, value } = updateProfileSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    console.log('❌ Validation failed:', error.details);
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    console.log('📋 Validation error details:', details);
    throw new ValidationError('Validation failed', details);
  }

  console.log('✅ Validation passed, cleaned body:', value);
  // GPS coordinates are already validated by Joi schema for valid lat/lng ranges
  // No additional location restrictions

  req.body = value;
  next();
};

export const validateUpdateDocumentStatus = (req: Request, res: Response, next: NextFunction) => {
  const { error, value } = updateDocumentStatusSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    const details = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    throw new ValidationError('Validation failed', details);
  }

  req.body = value;
  next();
};

// Query parameter validation
export const validatePaginationParams = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    sortBy: Joi.string().valid(
      'createdAt', 'updatedAt', 'firstName', 'lastName', 
      'city', 'profileCompletionPercentage'
    ).default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  });

  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ValidationError('Invalid query parameters');
  }

  req.query = value;
  next();
};

export const validateSearchParams = (req: Request, res: Response, next: NextFunction) => {
  const schema = Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    region: Joi.string().valid(
      'riyadh', 'makkah', 'eastern', 'asir', 'tabuk', 'qassim',
      'hail', 'northern', 'jazan', 'najran', 'bahah', 'jouf', 'madinah'
    ),
    city: Joi.string().min(2).max(50),
    propertyType: Joi.string().valid(
      'VILLA', 'APARTMENT', 'DUPLEX', 'TOWNHOUSE', 'COMMERCIAL', 'INDUSTRIAL', 'OTHER'
    ),
    bnplEligible: Joi.boolean(),
    profileCompleted: Joi.boolean()
  });

  const { error, value } = schema.validate(req.query, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ValidationError('Invalid search parameters');
  }

  req.query = value;
  next();
};