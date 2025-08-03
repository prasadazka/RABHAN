// RABHAN Contractor Management Service Types
// SAMA Compliant with Enhanced Security and Audit Trails

export interface ContractorProfile {
  id: string;
  user_id: string;
  
  // Basic Information
  business_name: string;
  business_name_ar?: string;
  business_type: BusinessType;
  commercial_registration?: string;
  vat_number?: string;
  
  // Contact Information
  email: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  
  // Address Information
  address_line1: string;
  address_line2?: string;
  city: string;
  region: string;
  postal_code?: string;
  country: string;
  
  // GPS Coordinates (for location-based services)
  latitude?: number;
  longitude?: number;
  
  // Business Details
  established_year?: number;
  employee_count?: number;
  description?: string;
  description_ar?: string;
  
  // Service Information
  service_categories: ServiceCategory[];
  service_areas: string[];
  years_experience: number;
  
  // Contractor Type & Capabilities (Beta Features)
  contractor_type: ContractorType;
  can_install: boolean;
  can_supply_only: boolean;
  
  // Status and Verification
  status: ContractorStatus;
  verification_level: number;
  admin_verified_at?: Date;
  admin_verified_by?: string;
  
  // Performance Metrics
  total_projects: number;
  completed_projects: number;
  average_rating: number;
  total_reviews: number;
  response_time_hours?: number;
  
  // Financial Information (SAMA Compliance)
  bank_account_verified: boolean;
  tax_clearance_verified: boolean;
  financial_standing_verified: boolean;
  
  // Preferences
  preferred_language?: string;
  email_notifications?: boolean;
  sms_notifications?: boolean;
  marketing_consent?: boolean;
  
  // System Fields
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  
  // Audit Fields
  created_by?: string;
  updated_by?: string;
  ip_address?: string;
  user_agent?: string;
}

export interface ContractorRegistrationData {
  // Basic Information
  business_name: string;
  business_name_ar?: string;
  business_type: BusinessType;
  commercial_registration?: string;
  vat_number?: string;
  
  // Contact Information
  email: string;
  phone: string;
  whatsapp?: string;
  website?: string;
  
  // Address Information
  address_line1: string;
  address_line2?: string;
  city: string;
  region: string;
  postal_code?: string;
  
  // GPS Coordinates (optional during registration)
  latitude?: number;
  longitude?: number;
  
  // Business Details
  established_year?: number;
  employee_count?: number;
  description?: string;
  description_ar?: string;
  
  // Service Information
  service_categories: ServiceCategory[];
  service_areas: string[];
  years_experience: number;
  
  // Contractor Type & Capabilities (Beta Features)
  contractor_type: ContractorType;
  can_install: boolean;
  can_supply_only: boolean;
}

export interface ContractorCertification {
  id: string;
  contractor_id: string;
  
  // Certification Details
  certification_type: CertificationType;
  certification_name: string;
  certification_number?: string;
  issuing_authority: string;
  
  // Dates
  issue_date: Date;
  expiry_date?: Date;
  
  // Document Information
  document_id?: string;
  document_url?: string;
  file_name?: string;
  file_size?: number;
  
  // Verification
  verification_status: VerificationStatus;
  verified_at?: Date;
  verified_by?: string;
  verification_notes?: string;
  
  // System Fields
  created_at: Date;
  updated_at: Date;
  
  // Audit Fields
  created_by?: string;
  updated_by?: string;
  ip_address?: string;
}

export interface ContractorBusinessDocument {
  id: string;
  contractor_id: string;
  
  // Document Details
  document_type: string;
  document_name: string;
  document_number?: string;
  
  // Document Information
  document_id?: string;
  document_url?: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  
  // Verification
  verification_status: VerificationStatus;
  verified_at?: Date;
  verified_by?: string;
  verification_notes?: string;
  
  // Expiry
  expiry_date?: Date;
  renewal_reminder_sent: boolean;
  
  // System Fields
  created_at: Date;
  updated_at: Date;
  
  // Audit Fields
  created_by?: string;
  updated_by?: string;
  ip_address?: string;
}

export interface ContractorServiceArea {
  id: string;
  contractor_id: string;
  
  // Location Information
  region: string;
  city: string;
  districts: string[];
  
  // Service Details
  service_categories: ServiceCategory[];
  travel_cost: number;
  service_radius_km?: number;
  
  // Availability
  is_active: boolean;
  priority_level: number;
  
  // System Fields
  created_at: Date;
  updated_at: Date;
}

export interface ContractorReview {
  id: string;
  contractor_id: string;
  customer_id: string;
  project_id?: string;
  
  // Review Details
  rating: number;
  title?: string;
  review_text?: string;
  
  // Review Categories
  quality_rating?: number;
  communication_rating?: number;
  timeliness_rating?: number;
  professionalism_rating?: number;
  
  // Verification
  verified_customer: boolean;
  admin_approved: boolean;
  
  // Response
  contractor_response?: string;
  contractor_response_date?: Date;
  
  // System Fields
  created_at: Date;
  updated_at: Date;
  
  // Audit Fields
  ip_address?: string;
  user_agent?: string;
}

export interface ContractorAvailability {
  id: string;
  contractor_id: string;
  
  // Schedule
  day_of_week: number; // 0=Sunday, 6=Saturday
  start_time: string;
  end_time: string;
  
  // Availability
  is_available: boolean;
  timezone: string;
  
  // Break times
  break_start_time?: string;
  break_end_time?: string;
  
  // System Fields
  created_at: Date;
  updated_at: Date;
}

export interface ContractorAuditLog {
  id: string;
  contractor_id?: string;
  
  // Event Information
  event_type: string;
  event_description: string;
  event_data?: Record<string, any>;
  
  // User Information
  performed_by?: string;
  performed_by_type: string;
  
  // Request Information
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  
  // SAMA Compliance Fields
  compliance_notes?: string;
  risk_assessment?: string;
  regulatory_impact: boolean;
  
  // System Fields
  created_at: Date;
}

// Enums
export enum ContractorStatus {
  PENDING = 'pending',
  DOCUMENTS_REQUIRED = 'documents_required',
  VERIFICATION = 'verification',
  VERIFIED = 'verified',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
  INACTIVE = 'inactive'
}

export enum BusinessType {
  INDIVIDUAL = 'individual',
  LLC = 'llc',
  CORPORATION = 'corporation',
  PARTNERSHIP = 'partnership',
  OTHER = 'other'
}

export enum ServiceCategory {
  RESIDENTIAL_SOLAR = 'residential_solar',
  COMMERCIAL_SOLAR = 'commercial_solar',
  INDUSTRIAL_SOLAR = 'industrial_solar',
  MAINTENANCE = 'maintenance',
  CONSULTATION = 'consultation',
  DESIGN = 'design',
  ELECTRICAL = 'electrical',
  ROOFING = 'roofing',
  ALL = 'all'
}

export enum CertificationType {
  ELECTRICAL_LICENSE = 'electrical_license',
  SOLAR_CERTIFICATION = 'solar_certification',
  BUSINESS_LICENSE = 'business_license',
  VAT_CERTIFICATE = 'vat_certificate',
  COMMERCIAL_REGISTRATION = 'commercial_registration',
  INSURANCE_CERTIFICATE = 'insurance_certificate',
  SAFETY_CERTIFICATION = 'safety_certification',
  OTHER = 'other'
}

export enum VerificationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired',
  REQUIRES_UPDATE = 'requires_update'
}

export enum ContractorType {
  FULL_SOLAR_CONTRACTOR = 'full_solar_contractor',
  SOLAR_VENDOR_ONLY = 'solar_vendor_only'
}

// Request/Response Types
export interface ContractorSearchQuery {
  region?: string;
  city?: string;
  service_categories?: ServiceCategory[];
  status?: ContractorStatus;
  min_rating?: number;
  max_distance_km?: number;
  verification_level?: number;
  page?: number;
  limit?: number;
  sort_by?: 'rating' | 'distance' | 'reviews' | 'created_at';
  sort_order?: 'asc' | 'desc';
}

export interface ContractorSearchResult {
  contractors: ContractorProfile[];
  total_count: number;
  page: number;
  limit: number;
  total_pages: number;
}

export interface ContractorStats {
  total_contractors: number;
  active_contractors: number;
  pending_verification: number;
  by_region: Record<string, number>;
  by_service_category: Record<string, number>;
  average_rating: number;
  total_reviews: number;
}

export interface VerificationRequest {
  contractor_id: string;
  verification_type: 'certification' | 'business_document' | 'profile';
  item_id: string;
  status: VerificationStatus;
  notes?: string;
  admin_id: string;
}

export interface ContractorDashboardStats {
  total_projects: number;
  completed_projects: number;
  pending_projects: number;
  average_rating: number;
  total_reviews: number;
  response_time_hours: number;
  monthly_earnings: number;
  profile_completion: number;
  verification_status: string;
}

// Error Types
export interface ContractorError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

// Document Integration Types
export interface ContractorDocument {
  id: string;
  contractor_id: string;
  category_id: string;
  category_name: string;
  document_id: string; // Links to document service
  upload_status: string;
  approval_status: 'pending' | 'approved' | 'rejected' | 'under_review';
  uploaded_at: Date;
  verified_at?: Date;
  rejection_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ContractorVerificationStatus {
  contractor_id: string;
  profile_completion: number;
  document_completion: number;
  verification_status: 'not_verified' | 'pending' | 'verified' | 'rejected';
  required_documents: ContractorDocumentRequirement[];
  completed_documents: ContractorDocument[];
  last_updated: Date;
}

export interface ContractorDocumentRequirement {
  category_id: string;
  category_name: string;
  required: boolean;
  uploaded: boolean;
  approved: boolean;
  document_id?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ContractorError;
  metadata?: {
    timestamp: Date;
    request_id: string;
    version: string;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}