import bcrypt from 'bcrypt';
import { config } from '../config/environment.config';

export class PasswordUtils {
  private static readonly MIN_PASSWORD_LENGTH = 8;
  private static readonly PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;

  public static async hash(password: string): Promise<string> {
    return bcrypt.hash(password, config.security.bcryptRounds);
  }

  public static async compare(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  public static validate(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < this.MIN_PASSWORD_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_PASSWORD_LENGTH} characters long`);
    }

    if (!this.PASSWORD_REGEX.test(password)) {
      errors.push('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character');
    }

    if (password.includes(' ')) {
      errors.push('Password cannot contain spaces');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  public static generateSecureToken(length: number = 32): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    const randomValues = new Uint8Array(length);
    
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(randomValues);
    } else {
      for (let i = 0; i < length; i++) {
        randomValues[i] = Math.floor(Math.random() * 256);
      }
    }
    
    for (let i = 0; i < length; i++) {
      token += chars[(randomValues[i] || 0) % chars.length];
    }
    
    return token;
  }

  public static checkPasswordStrength(password: string): {
    score: number;
    strength: 'weak' | 'fair' | 'good' | 'strong' | 'very-strong';
    suggestions: string[];
  } {
    let score = 0;
    const suggestions: string[] = [];

    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    else suggestions.push('Use at least 16 characters for better security');

    if (/[a-z]/.test(password)) score++;
    else suggestions.push('Add lowercase letters');

    if (/[A-Z]/.test(password)) score++;
    else suggestions.push('Add uppercase letters');

    if (/\d/.test(password)) score++;
    else suggestions.push('Add numbers');

    if (/[@$!%*?&]/.test(password)) score++;
    else suggestions.push('Add special characters');

    if (!/(.)\1{2,}/.test(password)) score++;
    else suggestions.push('Avoid repeated characters');

    const strengthMap: Record<number, 'weak' | 'fair' | 'good' | 'strong' | 'very-strong'> = {
      0: 'weak',
      1: 'weak',
      2: 'weak',
      3: 'fair',
      4: 'fair',
      5: 'good',
      6: 'good',
      7: 'strong',
      8: 'very-strong'
    };

    return {
      score,
      strength: strengthMap[score] || 'weak',
      suggestions
    };
  }
}