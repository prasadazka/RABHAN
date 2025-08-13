/**
 * RABHAN Admin Service Type Definitions
 * Saudi Arabia's Solar BNPL Platform - Admin Management Service
 * 
 * Comprehensive Type Safety for:
 * - Zero-Trust Admin Authentication
 * - SAMA Compliant Operations
 * - KYC Workflow Management
 * - System Configuration
 * - Performance Monitoring
 */

import { Request } from 'express';

/**
 * Admin User Types and Interfaces
 */
export interface AdminUser {
  id: string;
  email: string;
  password_hash?: string; // Excluded from API responses
  role: AdminRole;
  first_name: string;
  last_name: string;
  first_name_ar?: string;
  last_name_ar?: string;
  is_active: boolean;
  is_locked: boolean;
  failed_login_attempts: number;
  locked_until?: Date;
  password_changed_at: Date;
  must_change_password: boolean;
  mfa_enabled: boolean;
  mfa_secret?: string; // Excluded from API responses
  mfa_backup_codes?: string[]; // Excluded from API responses
  last_login?: Date;
  last_activity?: Date;
  last_login_ip?: string;
  last_login_user_agent?: string;
  sama_clearance_level?: SAMAClearanceLevel;
  sama_authorized_functions: string[];
  sama_audit_trail: SAMAAuditEntry[];
  login_pattern_hash?: string;
  risk_score: number;
  security_flags: string[];
  saudi_id?: string; // Encrypted
  work_permit_number?: string;
  authorized_regions: string[];
  preferences: Record<string, any>;
  dashboard_cache_key?: string;
  created_at: Date;
  updated_at: Date;
  deleted_at?: Date;
  deleted_by?: string;
}

export type AdminRole = 'ADMIN' | 'SUPER_ADMIN' | 'SAMA_AUDITOR' | 'KYC_REVIEWER';

export type SAMAClearanceLevel = 'STANDARD' | 'ELEVATED' | 'CRITICAL';

export interface AdminUserCreateInput {
  email: string;
  password: string;
  role: AdminRole;
  first_name: string;
  last_name: string;
  first_name_ar?: string;
  last_name_ar?: string;
  sama_clearance_level?: SAMAClearanceLevel;
  sama_authorized_functions?: string[];
  authorized_regions?: string[];
  saudi_id?: string;
  work_permit_number?: string;
}

export interface AdminUserUpdateInput {
  first_name?: string;
  last_name?: string;
  first_name_ar?: string;
  last_name_ar?: string;
  role?: AdminRole;
  is_active?: boolean;
  sama_clearance_level?: SAMAClearanceLevel;
  sama_authorized_functions?: string[];
  authorized_regions?: string[];
  preferences?: Record<string, any>;
}

/**
 * Admin Session Management
 */
export interface AdminSession {
  id: string;
  admin_id: string;
  token_hash: string;
  refresh_token_hash?: string;
  ip_address: string;
  user_agent?: string;
  device_fingerprint?: string;
  location_data?: Record<string, any>;
  created_at: Date;
  expires_at: Date;
  last_accessed: Date;
  is_active: boolean;
  security_level: SecurityLevel;
  concurrent_session_count: number;
  revoked_at?: Date;
  revoked_reason?: string;
  sama_audit_events: SAMAAuditEntry[];
  session_data: Record<string, any>;
}

export type SecurityLevel = 'STANDARD' | 'ELEVATED' | 'MFA_REQUIRED';

export interface SessionCreateInput {
  admin_id: string;
  ip_address: string;
  user_agent?: string;
  device_fingerprint?: string;
  location_data?: Record<string, any>;
  security_level?: SecurityLevel;
  expires_in?: number; // seconds
}

/**
 * Authentication and Authorization
 */
export interface LoginCredentials {
  email: string;
  password: string;
  mfa_code?: string;
  remember_me?: boolean;
}

export interface LoginResponse {
  success: boolean;
  admin: Omit<AdminUser, 'password_hash' | 'mfa_secret' | 'mfa_backup_codes'>;
  tokens: {
    access_token: string;
    refresh_token: string;
    expires_in: number;
    token_type: 'Bearer';
  };
  session: {
    id: string;
    expires_at: Date;
    security_level: SecurityLevel;
  };
  mfa_required?: boolean;
  must_change_password?: boolean;
}

export interface MFASetupResponse {
  secret: string;
  qr_code: string;
  backup_codes: string[];
  setup_token: string;
}

export interface PasswordChangeInput {
  current_password: string;
  new_password: string;
  confirm_password: string;
}

/**
 * System Settings Management
 */
export interface SystemSetting {
  id: string;
  category: SettingCategory;
  setting_key: string;
  setting_value: string;
  setting_value_encrypted: boolean;
  description?: string;
  data_type: SettingDataType;
  validation_rules?: Record<string, any>;
  allowed_values?: string[];
  min_value?: number;
  max_value?: number;
  is_active: boolean;
  is_system_critical: boolean;
  requires_restart: boolean;
  updated_by: string;
  updated_at: Date;
  previous_value?: string;
  change_reason?: string;
  sama_regulated: boolean;
  sama_approval_required: boolean;
  sama_audit_trail: SAMAAuditEntry[];
  cache_ttl_seconds: number;
  last_cached?: Date;
  cache_dependencies: string[];
  environment: Environment;
  region: string;
  created_at: Date;
}

export type SettingCategory = 
  | 'BNPL_LIMITS' 
  | 'PRICING' 
  | 'SECURITY' 
  | 'SAMA_COMPLIANCE' 
  | 'SYSTEM' 
  | 'REGIONAL'
  | 'NOTIFICATIONS'
  | 'PERFORMANCE';

export type SettingDataType = 'STRING' | 'NUMBER' | 'BOOLEAN' | 'JSON' | 'ENCRYPTED';

export type Environment = 'development' | 'staging' | 'production';

export interface SystemSettingUpdateInput {
  setting_value: string;
  change_reason?: string;
  sama_approval_required?: boolean;
}

export interface BulkSettingsUpdateInput {
  settings: Array<{
    category: SettingCategory;
    setting_key: string;
    setting_value: string;
    change_reason?: string;
  }>;
  change_reason: string;
}

/**
 * KYC Approval Workflows
 */
export interface KYCApproval {
  id: string;
  subject_id: string;
  subject_type: SubjectType;
  admin_id: string;
  admin_name: string;
  action: KYCAction;
  decision_reason?: string;
  rejection_category?: RejectionCategory;
  previous_status?: string;
  new_status: string;
  documents_verified: string[];
  document_issues: DocumentIssue[];
  identity_verification_score?: number;
  review_notes?: string;
  admin_confidence_level: ConfidenceLevel;
  escalation_reason?: string;
  review_started_at?: Date;
  review_completed_at: Date;
  processing_time_seconds?: number;
  sama_risk_category?: RiskCategory;
  sama_approval_criteria: Record<string, any>;
  sama_audit_trail: SAMAAuditEntry[];
  regulatory_flags: string[];
  requires_followup: boolean;
  followup_due_date?: Date;
  followup_admin_id?: string;
  qa_reviewed: boolean;
  qa_admin_id?: string;
  qa_notes?: string;
  region?: string;
  city?: string;
  processing_center?: string;
  created_at: Date;
  cached_subject_data?: Record<string, any>;
}

export type SubjectType = 'USER' | 'CONTRACTOR';

export type KYCAction = 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'REQUESTED_REVIEW' 
  | 'REQUESTED_DOCUMENTS' 
  | 'ESCALATED';

export type RejectionCategory = 
  | 'DOCUMENT_QUALITY'
  | 'IDENTITY_MISMATCH'
  | 'SANCTIONS_CHECK'
  | 'INCOMPLETE_INFORMATION'
  | 'FRAUD_SUSPICION'
  | 'REGULATORY_VIOLATION'
  | 'OTHER';

export type ConfidenceLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export type RiskCategory = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface DocumentIssue {
  document_type: string;
  issue_type: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface KYCApprovalInput {
  action: KYCAction;
  decision_reason?: string;
  rejection_category?: RejectionCategory;
  new_status: string;
  documents_verified?: string[];
  document_issues?: DocumentIssue[];
  review_notes?: string;
  admin_confidence_level?: ConfidenceLevel;
  escalation_reason?: string;
  sama_risk_category?: RiskCategory;
  regulatory_flags?: string[];
  requires_followup?: boolean;
  followup_due_date?: Date;
}

/**
 * Dashboard and Analytics
 */
export interface DashboardStats {
  users: {
    total: number;
    pending_kyc: number;
    active: number;
    blocked: number;
    new_today: number;
    growth_rate: number;
  };
  contractors: {
    total: number;
    pending: number;
    active: number;
    rejected: number;
    new_today: number;
    approval_rate: number;
  };
  system: {
    total_quotes: number;
    pending_approvals: number;
    active_projects: number;
    system_health: 'healthy' | 'warning' | 'critical';
    api_response_time: number;
    uptime_percentage: number;
  };
  recent_activity: ActivitySummary[];
  performance_metrics: {
    avg_response_time: number;
    error_rate: number;
    cache_hit_rate: number;
    database_performance: number;
  };
  sama_compliance: {
    audit_logs_today: number;
    compliance_violations: number;
    incident_reports: number;
    last_sama_report: Date;
  };
}

export interface ActivitySummary {
  id: string;
  action: string;
  admin_id: string;
  admin_name: string;
  target_id: string;
  target_type: string;
  timestamp: Date;
  status: 'success' | 'failed' | 'pending';
  risk_level: RiskCategory;
}

export interface AdminMetrics {
  admin_id: string;
  metric_date: Date;
  metric_hour: number;
  login_count: number;
  failed_login_count: number;
  kyc_approvals_count: number;
  kyc_rejections_count: number;
  document_reviews_count: number;
  settings_changes_count: number;
  avg_response_time_ms: number;
  max_response_time_ms: number;
  total_requests: number;
  error_count: number;
  kyc_accuracy_score?: number;
  customer_satisfaction_score?: number;
  compliance_violations: number;
  security_alerts_count: number;
  risk_score_avg: number;
  suspicious_activity_flags: number;
  sama_reports_generated: number;
  sama_violations_detected: number;
  regulatory_actions_taken: number;
  region: string;
  productivity_score?: number;
  efficiency_rating?: EfficiencyRating;
  created_at: Date;
  updated_at: Date;
}

export type EfficiencyRating = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR';

/**
 * SAMA Audit and Compliance
 */
export interface SAMAAuditLog {
  id: string;
  event_id: string;
  correlation_id?: string;
  admin_id?: string;
  admin_email?: string;
  admin_role?: AdminRole;
  event_type: string;
  event_category: EventCategory;
  event_action: string;
  subject_type?: SubjectType | 'SYSTEM_SETTING' | 'ADMIN';
  subject_id?: string;
  target_resource?: string;
  http_method?: string;
  endpoint?: string;
  ip_address?: string;
  user_agent?: string;
  request_id?: string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  field_changes: string[];
  risk_level: RiskCategory;
  security_flags: string[];
  fraud_indicators: Record<string, any>[];
  sama_regulation_reference?: string;
  sama_control_framework?: string;
  sama_reporting_required: boolean;
  sama_notification_sent: boolean;
  sama_incident_id?: string;
  region: string;
  processing_center?: string;
  business_date: Date;
  processing_time_ms?: number;
  response_status?: number;
  error_details?: Record<string, any>;
  retention_period_years: number;
  encryption_status: EncryptionStatus;
  data_classification: DataClassification;
  created_at: Date;
  integrity_hash: string;
  archived: boolean;
  archive_date?: Date;
  archive_location?: string;
}

export type EventCategory = 
  | 'AUTHENTICATION' 
  | 'AUTHORIZATION' 
  | 'DATA_MODIFICATION' 
  | 'COMPLIANCE'
  | 'SECURITY'
  | 'PERFORMANCE';

export type EncryptionStatus = 'ENCRYPTED' | 'PLAIN' | 'REDACTED';

export type DataClassification = 'PUBLIC' | 'INTERNAL' | 'CONFIDENTIAL' | 'RESTRICTED';

export interface SAMAAuditEntry {
  event: string;
  timestamp: Date;
  admin_id?: string;
  details?: Record<string, any>;
  compliance_framework: string;
}

/**
 * API Request/Response Types
 */
export interface APIResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: ValidationError[];
  metadata?: {
    timestamp: Date;
    request_id: string;
    processing_time: number;
    rate_limit?: {
      limit: number;
      remaining: number;
      reset: Date;
    };
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface FilterParams {
  search?: string;
  status?: string;
  role?: AdminRole;
  region?: string;
  date_from?: Date;
  date_to?: Date;
  risk_level?: RiskCategory;
}

/**
 * Extended Express Request with Admin Context
 */
export interface AdminRequest extends Request {
  admin?: AdminUser;
  session?: AdminSession;
  requestId?: string;
  correlationId?: string;
  startTime?: number;
  performance?: {
    database_time?: number;
    cache_time?: number;
    external_api_time?: number;
  };
}

/**
 * Service Integration Types
 */
export interface UserServiceResponse {
  id: string;
  email: string;
  phone: string;
  profile_completion_percentage: number;
  kyc_status: string;
  bnpl_eligible: boolean;
  created_at: Date;
  last_activity: Date;
}

export interface ContractorServiceResponse {
  id: string;
  email: string;
  company_name: string;
  company_name_ar?: string;
  verification_status: string;
  business_type: string;
  service_areas: string[];
  certifications: string[];
  rating: number;
  completed_projects: number;
  created_at: Date;
}

export interface DocumentServiceResponse {
  id: string;
  user_id: string;
  document_type: string;
  filename: string;
  file_size: number;
  mime_type: string;
  verification_status: string;
  verification_score?: number;
  uploaded_at: Date;
  verified_at?: Date;
}

/**
 * Performance and Monitoring Types
 */
export interface PerformanceMetrics {
  response_time: number;
  database_time: number;
  cache_time: number;
  external_api_time: number;
  memory_usage: number;
  cpu_usage: number;
  error_count: number;
  cache_hit_rate: number;
}

export interface HealthCheckResponse {
  healthy: boolean;
  service: string;
  version: string;
  timestamp: Date;
  uptime: number;
  dependencies: {
    database: {
      healthy: boolean;
      response_time: number;
      connections: number;
    };
    redis: {
      healthy: boolean;
      response_time: number;
      memory_usage: number;
    };
    external_services: Array<{
      name: string;
      healthy: boolean;
      response_time: number;
    }>;
  };
  performance: PerformanceMetrics;
  sama_compliance: {
    audit_enabled: boolean;
    retention_compliant: boolean;
    encryption_enabled: boolean;
  };
}

/**
 * Error Types
 */
export class AdminServiceError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly context?: Record<string, any>;
  public readonly sama_incident?: boolean;
  public readonly risk_level?: RiskCategory;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    context?: Record<string, any>,
    sama_incident?: boolean,
    risk_level?: RiskCategory
  ) {
    super(message);
    this.name = 'AdminServiceError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
    this.sama_incident = sama_incident;
    this.risk_level = risk_level;
  }
}

export class ValidationError extends AdminServiceError {
  constructor(message: string, field?: string, value?: any) {
    super(message, 'VALIDATION_ERROR', 400, { field, value });
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AdminServiceError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401, undefined, true, 'MEDIUM');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AdminServiceError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 'AUTHORIZATION_ERROR', 403, undefined, true, 'MEDIUM');
    this.name = 'AuthorizationError';
  }
}

export class SAMAComplianceError extends AdminServiceError {
  constructor(message: string, regulation: string) {
    super(message, 'SAMA_COMPLIANCE_ERROR', 400, { regulation }, true, 'HIGH');
    this.name = 'SAMAComplianceError';
  }
}

export class SecurityIncidentError extends AdminServiceError {
  constructor(message: string, incident_type: string) {
    super(message, 'SECURITY_INCIDENT', 403, { incident_type }, true, 'HIGH');
    this.name = 'SecurityIncidentError';
  }
}

/**
 * Utility Types
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

export type RequireField<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalField<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Re-export commonly used types
export * from './shared.types';

/**
 * Type Guards
 */
export const isAdminUser = (obj: any): obj is AdminUser => {
  return obj && typeof obj.id === 'string' && typeof obj.email === 'string' && typeof obj.role === 'string';
};

export const isKYCApproval = (obj: any): obj is KYCApproval => {
  return obj && typeof obj.id === 'string' && typeof obj.subject_id === 'string' && typeof obj.action === 'string';
};

export const isSystemSetting = (obj: any): obj is SystemSetting => {
  return obj && typeof obj.id === 'string' && typeof obj.category === 'string' && typeof obj.setting_key === 'string';
};

export const isSAMAAuditLog = (obj: any): obj is SAMAAuditLog => {
  return obj && typeof obj.id === 'string' && typeof obj.event_id === 'string' && typeof obj.event_type === 'string';
};