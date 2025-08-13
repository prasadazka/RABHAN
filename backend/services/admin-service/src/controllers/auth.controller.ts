/**
 * RABHAN Admin Authentication Controller
 * Saudi Arabia's Solar BNPL Platform - Zero-Trust Admin Authentication
 * 
 * Features:
 * - Secure admin login/logout
 * - Multi-factor authentication (MFA)
 * - Session management with zero-trust
 * - SAMA compliance audit logging
 * - Performance optimized for Saudi scale
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { v4 as uuidv4 } from 'uuid';
import { AdminUser, AdminSession, AdminRole } from '../types/admin.types';
import { AdminService } from '../services/admin.service';
import { SessionService } from '../services/session.service';
import { AuditService } from '../services/audit.service';
import { logger } from '../utils/logger';
import { config } from '../config/environment.config';

export class AuthController {
  private adminService: AdminService;
  private sessionService: SessionService;
  private auditService: AuditService;

  constructor() {
    this.adminService = new AdminService();
    this.sessionService = new SessionService();
    this.auditService = new AuditService();
  }

  /**
   * Admin login with optional MFA
   */
  public login = async (req: Request, res: Response): Promise<void> => {
    const startTime = Date.now();
    const loginId = uuidv4();
    
    try {
      const { email, password, mfa_code } = req.body;
      const clientIp = req.ip;
      const userAgent = req.get('User-Agent') || 'unknown';

      logger.info('Admin login attempt', {
        loginId,
        email,
        clientIp,
        userAgent,
        timestamp: new Date().toISOString()
      });

      // Find admin user
      const admin = await this.adminService.findByEmail(email);
      if (!admin) {
        await this.auditService.logSecurityEvent({
          event_type: 'LOGIN_FAILED',
          event_action: 'INVALID_USER',
          admin_id: null,
          ip_address: clientIp,
          user_agent: userAgent,
          risk_level: 'MEDIUM',
          event_data: { email, reason: 'user_not_found' }
        });

        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          error_code: 'INVALID_CREDENTIALS',
          loginId
        });
        return;
      }

      // Check if admin is active and not locked
      if (!admin.is_active) {
        await this.auditService.logSecurityEvent({
          event_type: 'LOGIN_FAILED',
          event_action: 'ACCOUNT_INACTIVE',
          admin_id: admin.id,
          ip_address: clientIp,
          user_agent: userAgent,
          risk_level: 'HIGH',
          event_data: { email, reason: 'account_inactive' }
        });

        res.status(401).json({
          success: false,
          error: 'Account is inactive',
          error_code: 'ACCOUNT_INACTIVE',
          loginId
        });
        return;
      }

      if (admin.is_locked && admin.locked_until && admin.locked_until > new Date()) {
        await this.auditService.logSecurityEvent({
          event_type: 'LOGIN_FAILED',
          event_action: 'ACCOUNT_LOCKED',
          admin_id: admin.id,
          ip_address: clientIp,
          user_agent: userAgent,
          risk_level: 'HIGH',
          event_data: { email, locked_until: admin.locked_until }
        });

        res.status(423).json({
          success: false,
          error: 'Account is temporarily locked',
          error_code: 'ACCOUNT_LOCKED',
          locked_until: admin.locked_until,
          loginId
        });
        return;
      }

      // Verify password
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
      if (!isPasswordValid) {
        // Increment failed login attempts
        await this.adminService.incrementFailedLogins(admin.id);
        
        await this.auditService.logSecurityEvent({
          event_type: 'LOGIN_FAILED',
          event_action: 'INVALID_PASSWORD',
          admin_id: admin.id,
          ip_address: clientIp,
          user_agent: userAgent,
          risk_level: 'MEDIUM',
          event_data: { email, failed_attempts: admin.failed_login_attempts + 1 }
        });

        res.status(401).json({
          success: false,
          error: 'Invalid credentials',
          error_code: 'INVALID_CREDENTIALS',
          loginId
        });
        return;
      }

      // Check MFA if enabled
      if (admin.mfa_enabled) {
        if (!mfa_code) {
          res.status(200).json({
            success: false,
            mfa_required: true,
            message: 'MFA code required',
            loginId
          });
          return;
        }

        // Verify MFA code
        const isMfaValid = speakeasy.totp.verify({
          secret: admin.mfa_secret!,
          encoding: 'base32',
          token: mfa_code,
          window: 2 // Allow 2 time windows for clock drift
        });

        if (!isMfaValid) {
          await this.auditService.logSecurityEvent({
            event_type: 'LOGIN_FAILED',
            event_action: 'INVALID_MFA',
            admin_id: admin.id,
            ip_address: clientIp,
            user_agent: userAgent,
            risk_level: 'HIGH',
            event_data: { email, reason: 'invalid_mfa_code' }
          });

          res.status(401).json({
            success: false,
            error: 'Invalid MFA code',
            error_code: 'INVALID_MFA_CODE',
            loginId
          });
          return;
        }
      }

      // Generate tokens
      const sessionId = uuidv4();
      const accessToken = jwt.sign(
        {
          adminId: admin.id,
          sessionId,
          email: admin.email,
          role: admin.role,
          type: 'access'
        },
        config.jwt.adminSecret,
        { 
          expiresIn: config.jwt.expiresIn,
          issuer: config.jwt.issuer,
          audience: config.jwt.audience
        }
      );

      const refreshToken = jwt.sign(
        {
          adminId: admin.id,
          sessionId,
          type: 'refresh'
        },
        config.jwt.refreshSecret,
        { 
          expiresIn: config.jwt.refreshExpiresIn,
          issuer: config.jwt.issuer,
          audience: config.jwt.audience
        }
      );

      // Create session
      await this.sessionService.createSession({
        id: sessionId,
        admin_id: admin.id,
        token_hash: await bcrypt.hash(accessToken, 10),
        refresh_token_hash: await bcrypt.hash(refreshToken, 10),
        ip_address: clientIp,
        user_agent: userAgent,
        expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        is_active: true
      });

      // Reset failed login attempts
      await this.adminService.resetFailedLogins(admin.id);
      
      // Update last login
      await this.adminService.updateLastLogin(admin.id, clientIp);

      // Log successful login
      await this.auditService.logSecurityEvent({
        event_type: 'LOGIN_SUCCESS',
        event_action: 'AUTHENTICATED',
        admin_id: admin.id,
        ip_address: clientIp,
        user_agent: userAgent,
        risk_level: 'LOW',
        event_data: { 
          email,
          sessionId,
          mfa_used: admin.mfa_enabled,
          processing_time_ms: Date.now() - startTime
        }
      });

      logger.info('Admin login successful', {
        loginId,
        adminId: admin.id,
        email: admin.email,
        role: admin.role,
        sessionId,
        processingTime: Date.now() - startTime
      });

      res.status(200).json({
        success: true,
        message: 'Login successful',
        data: {
          admin: {
            id: admin.id,
            email: admin.email,
            first_name: admin.first_name,
            last_name: admin.last_name,
            role: admin.role,
            mfa_enabled: admin.mfa_enabled,
            last_login_at: new Date(),
            permissions: this.getAdminPermissions(admin.role)
          },
          tokens: {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: '8h',
            token_type: 'Bearer'
          },
          session: {
            id: sessionId,
            expires_at: new Date(Date.now() + 8 * 60 * 60 * 1000)
          }
        },
        loginId,
        processing_time_ms: Date.now() - startTime
      });

    } catch (error) {
      logger.error('Admin login error', error as Error, {
        loginId,
        email: req.body.email,
        processingTime: Date.now() - startTime
      });

      res.status(500).json({
        success: false,
        error: 'Login failed due to server error',
        error_code: 'SERVER_ERROR',
        loginId
      });
    }
  };

  /**
   * Admin logout and session termination
   */
  public logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const sessionId = (req as any).sessionId;
      const adminId = (req as any).adminId;

      if (sessionId) {
        await this.sessionService.terminateSession(sessionId);
      }

      await this.auditService.logSecurityEvent({
        event_type: 'LOGOUT',
        event_action: 'SESSION_TERMINATED',
        admin_id: adminId,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        risk_level: 'LOW',
        event_data: { sessionId }
      });

      res.status(200).json({
        success: true,
        message: 'Logout successful'
      });

    } catch (error) {
      logger.error('Admin logout error', error as Error);
      res.status(500).json({
        success: false,
        error: 'Logout failed',
        error_code: 'SERVER_ERROR'
      });
    }
  };

  /**
   * Refresh access token
   */
  public refreshToken = async (req: Request, res: Response): Promise<void> => {
    // Implementation for token refresh
    res.status(501).json({
      success: false,
      error: 'Token refresh not implemented yet',
      error_code: 'NOT_IMPLEMENTED'
    });
  };

  /**
   * Get current admin profile
   */
  public getProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = (req as any).adminId;
      const admin = await this.adminService.findById(adminId);

      if (!admin) {
        res.status(404).json({
          success: false,
          error: 'Admin not found',
          error_code: 'ADMIN_NOT_FOUND'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: {
          id: admin.id,
          email: admin.email,
          first_name: admin.first_name,
          last_name: admin.last_name,
          role: admin.role,
          mfa_enabled: admin.mfa_enabled,
          last_login_at: admin.last_login_at,
          created_at: admin.created_at,
          permissions: this.getAdminPermissions(admin.role)
        }
      });

    } catch (error) {
      logger.error('Get profile error', error as Error);
      res.status(500).json({
        success: false,
        error: 'Failed to get profile',
        error_code: 'SERVER_ERROR'
      });
    }
  };

  /**
   * Setup MFA for admin
   */
  public setupMFA = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = (req as any).adminId;
      const { password } = req.body;

      const admin = await this.adminService.findById(adminId);
      if (!admin) {
        res.status(404).json({
          success: false,
          error: 'Admin not found',
          error_code: 'ADMIN_NOT_FOUND'
        });
        return;
      }

      // Verify current password
      const isPasswordValid = await bcrypt.compare(password, admin.password_hash);
      if (!isPasswordValid) {
        res.status(401).json({
          success: false,
          error: 'Invalid password',
          error_code: 'INVALID_PASSWORD'
        });
        return;
      }

      // Generate MFA secret
      const secret = speakeasy.generateSecret({
        name: `RABHAN Admin (${admin.email})`,
        issuer: 'RABHAN Solar BNPL Platform',
        length: 32
      });

      // Generate QR code
      const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

      res.status(200).json({
        success: true,
        data: {
          secret: secret.base32,
          qr_code: qrCodeUrl,
          manual_entry_key: secret.base32,
          instructions: 'Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.) or manually enter the key'
        }
      });

    } catch (error) {
      logger.error('MFA setup error', error as Error);
      res.status(500).json({
        success: false,
        error: 'MFA setup failed',
        error_code: 'SERVER_ERROR'
      });
    }
  };

  /**
   * Verify and enable MFA
   */
  public verifyMFA = async (req: Request, res: Response): Promise<void> => {
    try {
      const adminId = (req as any).adminId;
      const { token, secret } = req.body;

      // Verify the token
      const isValid = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (!isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid MFA token',
          error_code: 'INVALID_MFA_TOKEN'
        });
        return;
      }

      // Enable MFA for admin
      await this.adminService.enableMFA(adminId, secret);

      await this.auditService.logSecurityEvent({
        event_type: 'MFA_ENABLED',
        event_action: 'SECURITY_ENHANCED',
        admin_id: adminId,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        risk_level: 'LOW',
        event_data: { enabled_at: new Date().toISOString() }
      });

      res.status(200).json({
        success: true,
        message: 'MFA enabled successfully'
      });

    } catch (error) {
      logger.error('MFA verification error', error as Error);
      res.status(500).json({
        success: false,
        error: 'MFA verification failed',
        error_code: 'SERVER_ERROR'
      });
    }
  };

  /**
   * Disable MFA
   */
  public disableMFA = async (req: Request, res: Response): Promise<void> => {
    res.status(501).json({
      success: false,
      error: 'MFA disable not implemented yet',
      error_code: 'NOT_IMPLEMENTED'
    });
  };

  /**
   * Change admin password
   */
  public changePassword = async (req: Request, res: Response): Promise<void> => {
    res.status(501).json({
      success: false,
      error: 'Password change not implemented yet',
      error_code: 'NOT_IMPLEMENTED'
    });
  };

  /**
   * Get active sessions
   */
  public getSessions = async (req: Request, res: Response): Promise<void> => {
    res.status(501).json({
      success: false,
      error: 'Get sessions not implemented yet',
      error_code: 'NOT_IMPLEMENTED'
    });
  };

  /**
   * Terminate specific session
   */
  public terminateSession = async (req: Request, res: Response): Promise<void> => {
    res.status(501).json({
      success: false,
      error: 'Session termination not implemented yet',
      error_code: 'NOT_IMPLEMENTED'
    });
  };

  /**
   * Verify session validity
   */
  public verifySession = async (req: Request, res: Response): Promise<void> => {
    res.status(501).json({
      success: false,
      error: 'Session verification not implemented yet',
      error_code: 'NOT_IMPLEMENTED'
    });
  };

  /**
   * Get admin permissions based on role
   */
  private getAdminPermissions(role: AdminRole): string[] {
    const permissions: Record<AdminRole, string[]> = {
      'SUPER_ADMIN': [
        'admin.create', 'admin.read', 'admin.update', 'admin.delete',
        'user.read', 'user.update', 'user.suspend',
        'contractor.read', 'contractor.update', 'contractor.approve',
        'kyc.review', 'kyc.approve', 'kyc.reject',
        'system.settings', 'system.maintenance',
        'audit.read', 'reports.generate'
      ],
      'ADMIN': [
        'user.read', 'user.update',
        'contractor.read', 'contractor.update',
        'kyc.review', 'kyc.approve',
        'reports.generate'
      ],
      'KYC_REVIEWER': [
        'user.read', 'contractor.read',
        'kyc.review', 'kyc.approve', 'kyc.reject'
      ],
      'SAMA_AUDITOR': [
        'audit.read', 'reports.generate',
        'user.read', 'contractor.read'
      ]
    };

    return permissions[role] || [];
  }
}