// User Service Types and Interfaces

// Enums matching database
export enum PropertyType {
  VILLA = 'VILLA',
  APARTMENT = 'APARTMENT',
  DUPLEX = 'DUPLEX',
  TOWNHOUSE = 'TOWNHOUSE',
  COMMERCIAL = 'COMMERCIAL',
  INDUSTRIAL = 'INDUSTRIAL',
  OTHER = 'OTHER'
}

export enum PropertyOwnership {
  OWNED = 'OWNED',
  RENTED = 'RENTED',
  LEASED = 'LEASED',
  FAMILY_OWNED = 'FAMILY_OWNED'
}

export enum ElectricityConsumptionRange {
  RANGE_0_200 = '0_200',
  RANGE_200_400 = '200_400',
  RANGE_400_600 = '400_600',
  RANGE_600_800 = '600_800',
  RANGE_800_1000 = '800_1000',
  RANGE_1000_1200 = '1000_1200',
  RANGE_1200_1500 = '1200_1500',
  RANGE_1500_PLUS = '1500_PLUS'
}

export enum PreferredLanguage {
  ENGLISH = 'en',
  ARABIC = 'ar'
}

export enum EmploymentStatus {
  GOVERNMENT = 'government',
  PRIVATE = 'private',
  SELF_EMPLOYED = 'selfEmployed',
  STUDENT = 'student',
  RETIRED = 'retired'
}

export enum DocumentType {
  NATIONAL_ID_FRONT = 'national_id_front',
  NATIONAL_ID_BACK = 'national_id_back',
  PROOF_OF_ADDRESS = 'proof_of_address',
  SALARY_CERTIFICATE = 'salary_certificate'
}

export enum UploadStatus {
  PENDING = 'pending',
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  FAILED = 'failed'
}

export enum VerificationStatus {
  PENDING = 'pending',
  VERIFIED = 'verified',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

// User Profile Interface - MVP Phase 1
export interface UserProfile {
  id: string;
  userId: string;
  
  // Personal Information - MVP Core
  firstName: string;
  lastName: string;
  
  // Address Information - MVP Core
  region: string;
  city: string;
  district: string;
  streetAddress: string;
  landmark?: string;
  postalCode: string;
  
  // Property & Energy Information - MVP Core
  propertyType: PropertyType;
  propertyOwnership: PropertyOwnership;
  roofSize: number;
  gpsLatitude: number;
  gpsLongitude: number;
  electricityConsumption: ElectricityConsumptionRange;
  electricityMeterNumber: string;
  
  // Employment Information - MVP Phase 1 (Basic BNPL eligibility only)
  employmentStatus?: EmploymentStatus;
  employerName?: string;
  jobTitle?: string;
  
  // Solar System Preferences - MVP Phase 1
  desiredSystemSize?: number;
  budgetRange?: string;
  
  // Preferences - MVP Core
  preferredLanguage: PreferredLanguage;
  emailNotifications: boolean;
  smsNotifications: boolean;
  marketingConsent: boolean;
  
  // Profile Status - MVP Core
  profileCompleted: boolean;
  profileCompletionPercentage: number;
  
  // BNPL Eligibility - MVP Core
  bnplEligible: boolean;
  bnplMaxAmount: number;
  bnplRiskScore?: number;
  
  // Verification Status - MVP Core
  verificationStatus?: 'not_verified' | 'pending' | 'verified' | 'rejected';
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// Beta V2 Extended Profile Interface (Future Implementation)
export interface ExtendedUserProfile extends UserProfile {
  // Advanced Personal Information - Beta V2
  dateOfBirth?: string;
  maritalStatus?: string;
  dependents?: number;
  
  // Detailed Employment Information - Beta V2
  employerName?: string;
  jobTitle?: string;
  monthlyIncome?: number;
  yearsEmployed?: number;
  
  // Enhanced Solar Information - Beta V2
  monthlyElectricityBill?: number;
  desiredSystemSize?: number;
  budgetRange?: string;
  installationTimeline?: string;
  financingPreference?: string;
}

// Create/Update DTOs - MVP Phase 1
export interface CreateUserProfileDTO {
  userId: string;
  firstName: string;
  lastName: string;
  region: string;
  city: string;
  district: string;
  streetAddress: string;
  landmark?: string;
  postalCode: string;
  propertyType: PropertyType;
  propertyOwnership: PropertyOwnership;
  roofSize: number;
  gpsLatitude: number;
  gpsLongitude: number;
  electricityConsumption: ElectricityConsumptionRange;
  electricityMeterNumber: string;
  preferredLanguage?: PreferredLanguage;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  marketingConsent?: boolean;
  // Employment Information - MVP Phase 1 (Basic BNPL eligibility)
  employmentStatus?: EmploymentStatus;
  employerName?: string;
  jobTitle?: string;
  
  // Solar System Preferences - MVP Phase 1
  desiredSystemSize?: number;
  budgetRange?: string;
}

export interface UpdateUserProfileDTO {
  firstName?: string;
  lastName?: string;
  region?: string;
  city?: string;
  district?: string;
  streetAddress?: string;
  landmark?: string;
  postalCode?: string;
  propertyType?: PropertyType;
  propertyOwnership?: PropertyOwnership;
  roofSize?: number;
  gpsLatitude?: number;
  gpsLongitude?: number;
  electricityConsumption?: ElectricityConsumptionRange;
  electricityMeterNumber?: string;
  preferredLanguage?: PreferredLanguage;
  emailNotifications?: boolean;
  smsNotifications?: boolean;
  marketingConsent?: boolean;
  // Employment Information - MVP Phase 1
  employmentStatus?: EmploymentStatus;
  employerName?: string;
  jobTitle?: string;
  monthlyIncome?: number;
  yearsEmployed?: number;
  
  // Solar System Preferences - MVP Phase 1
  desiredSystemSize?: number;
  budgetRange?: string;
}

// User Document Interface
export interface UserDocument {
  id: string;
  userId: string;
  documentType: DocumentType;
  uploadStatus: UploadStatus;
  verificationStatus: VerificationStatus;
  uploadedAt?: Date;
  verifiedAt?: Date;
  rejectionReason?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

// User Activity Interface
export interface UserActivity {
  id: string;
  userId: string;
  activityType: string;
  activityData?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// BNPL Eligibility Response
export interface BNPLEligibility {
  eligible: boolean;
  maxAmount: number;
  riskScore: number;
  reason: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  metadata?: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  metadata?: {
    timestamp: string;
    version: string;
    requestId: string;
  };
}

// Query Parameters
export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface UserSearchParams extends PaginationParams {
  region?: string;
  city?: string;
  propertyType?: PropertyType;
  bnplEligible?: boolean;
  profileCompleted?: boolean;
}

// Audit Log Interface
export interface AuditLog {
  id: string;
  userId?: string;
  eventType: string;
  eventData: Record<string, any>;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  performedBy?: string;
  timestamp: Date;
  complianceFramework?: string;
  complianceControl?: string;
  riskLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

// Error Types
export class UserServiceError extends Error {
  constructor(
    public message: string,
    public code: string,
    public statusCode: number = 500,
    public details?: any
  ) {
    super(message);
    this.name = 'UserServiceError';
  }
}

export class ValidationError extends UserServiceError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends UserServiceError {
  constructor(message: string, details?: any) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends UserServiceError {
  constructor(message: string, details?: any) {
    super(message, 'CONFLICT', 409, details);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends UserServiceError {
  constructor(message: string, details?: any) {
    super(message, 'UNAUTHORIZED', 401, details);
    this.name = 'UnauthorizedError';
  }
}

export class ComplianceError extends UserServiceError {
  constructor(message: string, details?: any) {
    super(message, 'COMPLIANCE_ERROR', 403, details);
    this.name = 'ComplianceError';
  }
}