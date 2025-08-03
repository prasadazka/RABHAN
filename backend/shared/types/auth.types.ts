export enum UserRole {
  USER = 'USER',
  CONTRACTOR = 'CONTRACTOR',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

export enum AuthProvider {
  EMAIL = 'EMAIL',
  FIREBASE = 'FIREBASE',
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
  email: string;
  phone?: string;
  role: UserRole;
  status: UserStatus;
  provider: AuthProvider;
  firebaseUid?: string;
  nationalId?: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  loginAttempts: number;
  lockedUntil?: Date;
  emailVerified: boolean;
  phoneVerified: boolean;
  mfaEnabled: boolean;
  mfaSecret?: string;
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

export interface JWTPayload {
  userId: string;
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
}

export interface RegisterRequest {
  email: string;
  password: string;
  phone?: string;
  role: UserRole;
  nationalId?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  deviceId?: string;
}

export interface FirebaseAuthRequest {
  idToken: string;
  role: UserRole;
  deviceId?: string;
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
  eventType: string;
  eventData: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}