/**
 * RABHAN Shared Type Definitions
 * Saudi Arabia's Solar BNPL Platform - Shared Types Across Services
 * 
 * Common Types for:
 * - Cross-Service Communication
 * - SAMA Compliance Standards
 * - Saudi Market Specifics
 * - Performance Monitoring
 * - Security Standards
 */

/**
 * Common Response Types
 */
export interface BaseResponse {
  success: boolean;
  timestamp: Date;
  request_id?: string;
  processing_time?: number;
}

export interface SuccessResponse<T = any> extends BaseResponse {
  success: true;
  data: T;
  message?: string;
  metadata?: ResponseMetadata;
}

export interface ErrorResponse extends BaseResponse {
  success: false;
  error: string;
  error_code: string;
  details?: Record<string, any>;
  sama_incident?: boolean;
  risk_level?: RiskLevel;
}

export interface ResponseMetadata {
  version: string;
  environment: string;
  region: string;
  cache_status?: 'HIT' | 'MISS' | 'BYPASS';
  rate_limit?: RateLimitInfo;
  sama_compliant: boolean;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset_time: Date;
  retry_after?: number;
}

/**
 * Pagination Types
 */
export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  pagination: PaginationInfo;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
  has_next: boolean;
  has_prev: boolean;
  links?: {
    first: string;
    last: string;
    next?: string;
    prev?: string;
  };
}

export interface PaginationQuery {
  page?: number;
  limit?: number;
  offset?: number;
}

/**
 * Common Enums and Types
 */
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type Status = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'SUSPENDED' | 'DELETED';

export type KYCStatus = 
  | 'PENDING' 
  | 'UNDER_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'REQUIRES_ADDITIONAL_INFO'
  | 'EXPIRED';

export type VerificationStatus = 
  | 'NOT_STARTED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'FAILED'
  | 'EXPIRED';

export type DocumentType = 
  | 'NATIONAL_ID'
  | 'PASSPORT'
  | 'DRIVING_LICENSE'
  | 'UTILITY_BILL'
  | 'BANK_STATEMENT'
  | 'SALARY_CERTIFICATE'
  | 'COMMERCIAL_REGISTRATION'
  | 'VAT_CERTIFICATE'
  | 'SASO_CERTIFICATE'
  | 'SEC_LICENSE'
  | 'OTHER';

/**
 * Saudi-Specific Types
 */
export interface SaudiAddress {
  street: string;
  street_ar?: string;
  district: string;
  district_ar?: string;
  city: SaudiCity;
  region: SaudiRegion;
  postal_code: string;
  building_number?: string;
  additional_number?: string;
  unit_number?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export type SaudiRegion = 
  | 'riyadh'
  | 'mecca'
  | 'medina'
  | 'qassim'
  | 'eastern'
  | 'asir'
  | 'tabuk'
  | 'hail'
  | 'northern_borders'
  | 'jazan'
  | 'najran'
  | 'al_bahah'
  | 'al_jawf';

export type SaudiCity = 
  | 'riyadh'
  | 'jeddah'
  | 'mecca'
  | 'medina'
  | 'dammam'
  | 'khobar'
  | 'dhahran'
  | 'taif'
  | 'buraidah'
  | 'khamis_mushait'
  | 'hail'
  | 'hafr_al_batin'
  | 'jubail'
  | 'tabuk'
  | 'qatif'
  | 'abha'
  | 'najran'
  | 'yanbu'
  | 'al_kharj';

export interface SaudiNationalId {
  id_number: string; // 10 digits
  is_saudi: boolean;
  birth_date: Date;
  expiry_date: Date;
  place_of_birth: string;
  place_of_birth_ar?: string;
}

/**
 * SAMA Compliance Types
 */
export interface SAMACompliantEntity {
  sama_compliant: boolean;
  sama_registration_number?: string;
  sama_license_type?: SAMALicenseType;
  sama_last_audit?: Date;
  sama_next_audit?: Date;
  sama_violations?: SAMAViolation[];
}

export type SAMALicenseType = 
  | 'PAYMENT_SERVICES'
  | 'BNPL_PROVIDER'
  | 'FINANCIAL_INSTITUTION'
  | 'FINTECH_COMPANY';

export interface SAMAViolation {
  id: string;
  violation_type: string;
  severity: RiskLevel;
  description: string;
  regulation_reference: string;
  detected_at: Date;
  resolved_at?: Date;
  resolution_notes?: string;
  penalty_amount?: number;
  status: 'OPEN' | 'UNDER_INVESTIGATION' | 'RESOLVED' | 'CLOSED';
}

export interface SAMAReportingRequirements {
  report_type: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY';
  next_due_date: Date;
  last_submitted?: Date;
  auto_generated: boolean;
  compliance_officer: string;
}

/**
 * Financial Types (BNPL Specific)
 */
export interface BNPLLimits {
  min_amount: number; // SAR
  max_amount: number; // SAR (5000 SAR SAMA limit)
  max_installments: number; // Maximum 24 months
  min_down_payment_percentage: number;
  interest_rate: number; // Should be 0 for Sharia compliance
  late_fee_percentage: number;
  currency: 'SAR';
}

export interface PaymentSchedule {
  total_amount: number;
  down_payment: number;
  installment_amount: number;
  installment_count: number;
  installments: Installment[];
  total_fees: number;
  currency: 'SAR';
}

export interface Installment {
  sequence_number: number;
  amount: number;
  due_date: Date;
  status: InstallmentStatus;
  paid_amount?: number;
  paid_date?: Date;
  late_fee?: number;
  reminder_sent?: Date;
}

export type InstallmentStatus = 
  | 'PENDING'
  | 'DUE'
  | 'OVERDUE'
  | 'PAID'
  | 'PARTIALLY_PAID'
  | 'CANCELLED'
  | 'REFUNDED';

/**
 * Solar Energy Specific Types
 */
export interface SolarSystemSpecs {
  capacity_kw: number;
  panel_count: number;
  panel_type: PanelType;
  inverter_type: InverterType;
  estimated_generation_kwh_monthly: number;
  estimated_savings_sar_monthly: number;
  payback_period_years: number;
  warranty_years: number;
  installation_area_sqm: number;
  roof_type: RoofType;
  orientation: SolarOrientation;
  tilt_angle: number;
}

export type PanelType = 
  | 'MONOCRYSTALLINE'
  | 'POLYCRYSTALLINE'
  | 'THIN_FILM'
  | 'BIFACIAL';

export type InverterType = 
  | 'STRING'
  | 'POWER_OPTIMIZER'
  | 'MICROINVERTER'
  | 'CENTRAL';

export type RoofType = 
  | 'FLAT'
  | 'PITCHED'
  | 'TILE'
  | 'METAL'
  | 'CONCRETE';

export type SolarOrientation = 
  | 'SOUTH'
  | 'SOUTH_EAST'
  | 'SOUTH_WEST'
  | 'EAST'
  | 'WEST';

/**
 * User and Profile Types
 */
export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  first_name: string;
  last_name: string;
  first_name_ar?: string;
  last_name_ar?: string;
  date_of_birth: Date;
  nationality: string;
  national_id: string;
  address: SaudiAddress;
  employment_type: EmploymentType;
  monthly_income: number;
  kyc_status: KYCStatus;
  bnpl_eligible: boolean;
  credit_limit: number;
  profile_completion_percentage: number;
  preferences: UserPreferences;
  created_at: Date;
  updated_at: Date;
  last_activity: Date;
}

export type EmploymentType = 
  | 'GOVERNMENT'
  | 'PRIVATE_SECTOR'
  | 'SELF_EMPLOYED'
  | 'RETIRED'
  | 'STUDENT'
  | 'UNEMPLOYED';

export interface UserPreferences {
  language: 'ar' | 'en';
  currency: 'SAR';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
  solar_preferences?: {
    max_budget: number;
    preferred_panel_type?: PanelType;
    installation_urgency: 'IMMEDIATE' | 'WITHIN_3_MONTHS' | 'WITHIN_6_MONTHS' | 'FLEXIBLE';
  };
}

/**
 * Contractor Types
 */
export interface ContractorProfile {
  id: string;
  email: string;
  phone: string;
  company_name: string;
  company_name_ar?: string;
  commercial_registration: string;
  vat_number?: string;
  business_type: BusinessType;
  license_number: string;
  license_expiry: Date;
  address: SaudiAddress;
  service_areas: SaudiRegion[];
  specializations: SolarSpecialization[];
  certifications: Certification[];
  insurance_coverage: number;
  years_of_experience: number;
  completed_projects: number;
  rating: number;
  verification_status: VerificationStatus;
  sama_registered: boolean;
  created_at: Date;
  updated_at: Date;
}

export type BusinessType = 
  | 'SOLE_PROPRIETORSHIP'
  | 'LIMITED_LIABILITY'
  | 'JOINT_STOCK'
  | 'PARTNERSHIP'
  | 'BRANCH_OF_FOREIGN_COMPANY';

export type SolarSpecialization = 
  | 'RESIDENTIAL_SOLAR'
  | 'COMMERCIAL_SOLAR'
  | 'INDUSTRIAL_SOLAR'
  | 'MAINTENANCE'
  | 'CONSULTATION'
  | 'DESIGN'
  | 'INSTALLATION';

export interface Certification {
  id: string;
  name: string;
  name_ar?: string;
  issuing_authority: string;
  certificate_number: string;
  issue_date: Date;
  expiry_date?: Date;
  verification_status: VerificationStatus;
  document_url?: string;
}

/**
 * Quote and Project Types
 */
export interface QuoteRequest {
  id: string;
  user_id: string;
  property_type: PropertyType;
  monthly_consumption_kwh: number;
  roof_area_sqm: number;
  budget_range: BudgetRange;
  installation_timeline: InstallationTimeline;
  address: SaudiAddress;
  additional_requirements?: string;
  status: QuoteStatus;
  created_at: Date;
  updated_at: Date;
}

export type PropertyType = 
  | 'VILLA'
  | 'APARTMENT'
  | 'TOWNHOUSE'
  | 'COMMERCIAL_BUILDING'
  | 'WAREHOUSE'
  | 'FACTORY';

export type BudgetRange = 
  | 'UNDER_50K'
  | '50K_100K'
  | '100K_200K'
  | '200K_500K'
  | 'ABOVE_500K';

export type InstallationTimeline = 
  | 'IMMEDIATE'
  | 'WITHIN_1_MONTH'
  | 'WITHIN_3_MONTHS'
  | 'WITHIN_6_MONTHS'
  | 'FLEXIBLE';

export type QuoteStatus = 
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'QUOTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'CANCELLED';

/**
 * Performance and Monitoring Types
 */
export interface ServiceHealth {
  service_name: string;
  version: string;
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  uptime_seconds: number;
  last_health_check: Date;
  dependencies: DependencyHealth[];
  metrics: ServiceMetrics;
}

export interface DependencyHealth {
  name: string;
  type: 'DATABASE' | 'CACHE' | 'EXTERNAL_API' | 'STORAGE';
  status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  response_time_ms: number;
  last_check: Date;
  error_message?: string;
}

export interface ServiceMetrics {
  requests_per_second: number;
  average_response_time_ms: number;
  p95_response_time_ms: number;
  p99_response_time_ms: number;
  error_rate_percentage: number;
  memory_usage_mb: number;
  cpu_usage_percentage: number;
  cache_hit_rate_percentage: number;
  database_connection_count: number;
}

/**
 * Security and Authentication Types
 */
export interface SecurityContext {
  user_id: string;
  session_id: string;
  ip_address: string;
  user_agent: string;
  device_fingerprint?: string;
  risk_score: number;
  security_flags: SecurityFlag[];
  last_activity: Date;
  mfa_verified: boolean;
  permissions: Permission[];
}

export interface SecurityFlag {
  type: SecurityFlagType;
  severity: RiskLevel;
  description: string;
  detected_at: Date;
  resolved: boolean;
}

export type SecurityFlagType = 
  | 'SUSPICIOUS_LOGIN'
  | 'MULTIPLE_FAILED_ATTEMPTS'
  | 'UNUSUAL_LOCATION'
  | 'DEVICE_CHANGE'
  | 'PRIVILEGE_ESCALATION'
  | 'DATA_BREACH_ATTEMPT'
  | 'AUTOMATED_BEHAVIOR';

export interface Permission {
  resource: string;
  actions: string[];
  conditions?: Record<string, any>;
}

/**
 * Audit and Logging Types
 */
export interface AuditLog {
  id: string;
  event_type: string;
  actor_id: string;
  actor_type: 'USER' | 'ADMIN' | 'SYSTEM' | 'CONTRACTOR';
  resource_type: string;
  resource_id: string;
  action: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  ip_address: string;
  user_agent: string;
  risk_level: RiskLevel;
  sama_regulated: boolean;
  created_at: Date;
  retention_until: Date;
}

/**
 * Utility Types
 */
export type Timestamp = Date | string;

export type Currency = 'SAR';

export type Language = 'ar' | 'en';

export type UUID = string;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type Required<T, K extends keyof T> = T & RequiredKeys<Pick<T, K>>;

type RequiredKeys<T> = {
  [K in keyof T]-?: T[K];
};

/**
 * Environment Configuration Types
 */
export interface EnvironmentConfig {
  NODE_ENV: 'development' | 'staging' | 'production';
  SERVICE_NAME: string;
  VERSION: string;
  PORT: number;
  REGION: SaudiRegion;
  TIMEZONE: 'Asia/Riyadh';
}

/**
 * Feature Flag Types
 */
export interface FeatureFlags {
  kyc_auto_approval: boolean;
  bulk_operations: boolean;
  advanced_analytics: boolean;
  real_time_dashboard: boolean;
  sama_reporting_automation: boolean;
  ai_fraud_detection: boolean;
  multi_language_support: boolean;
}

/**
 * API Versioning Types
 */
export type APIVersion = 'v1' | 'v2';

export interface VersionedEndpoint {
  version: APIVersion;
  path: string;
  deprecated?: boolean;
  sunset_date?: Date;
}

/**
 * Export all types for easy importing
 */
export * from './admin.types';