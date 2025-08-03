export enum UserRole {
  USER = 'USER',
  CONTRACTOR = 'CONTRACTOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum AuthProvider {
  EMAIL = 'EMAIL',
  NAFATH = 'NAFATH'
}

export enum UserStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  LOCKED = 'LOCKED',
  DELETED = 'DELETED'
}

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  phone?: string;
  national_id?: string;
  role: UserRole;
  status: UserStatus;
  user_type?: string;
  provider: AuthProvider;
  bnpl_eligible: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  mfa_secret?: string;
}

export interface Contractor {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  password_hash: string;
  phone?: string;
  national_id?: string;
  status: UserStatus;
  business_type: string;
  provider: AuthProvider;
  company_name: string;
  cr_number?: string;
  vat_number?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  mfa_secret?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  refreshToken: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ContractorSession {
  id: string;
  contractorId: string;
  refreshToken: string;
  deviceId?: string;
  userAgent?: string;
  ipAddress?: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface ContractorJWTPayload {
  contractorId: string;
  email: string;
  role: UserRole;
  sessionId: string;
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: UserRole;
    phone?: string;
    national_id?: string;
    user_type?: string;
    status: UserStatus;
    bnpl_eligible: boolean;
  };
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  role?: UserRole;
  national_id?: string;
  user_type?: string;
}

export interface ContractorRegisterRequest {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone?: string;
  national_id?: string;
  user_type?: string;
  company_name?: string;
  cr_number?: string;
  vat_number?: string;
}

export interface LoginRequest {
  email?: string;
  phone?: string;
  password: string;
  deviceId?: string;
  userType?: 'USER' | 'CONTRACTOR';
}


export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface ResetPasswordRequest {
  email: string;
}

export interface ConfirmResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ChangePasswordRequest {
  oldPassword: string;
  newPassword: string;
}

export interface SAMAComplianceLog {
  id: string;
  userId?: string;
  contractorId?: string;
  eventType: string;
  eventData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}