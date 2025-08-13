import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import i18n from './i18n';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Format currency for Saudi Riyal
export function formatCurrency(amount: number, currency: string = 'SAR'): string {
  const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// Format numbers with current locale
export function formatNumber(value: number): string {
  const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
  return new Intl.NumberFormat(locale).format(value);
}

// Format dates with current locale
export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options,
  }).format(dateObj);
}

// Format date and time
export function formatDateTime(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const locale = i18n.language === 'ar' ? 'ar-SA' : 'en-US';
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(dateObj);
}

// Calculate time ago (needs i18n context, better to use in components)
export function timeAgo(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffInMs = now.getTime() - dateObj.getTime();
  const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
  const diffInHours = Math.floor(diffInMinutes / 60);
  const diffInDays = Math.floor(diffInHours / 24);

  // For now, return English format - should be updated to use translation context
  if (diffInMinutes < 1) return 'now';
  if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
  if (diffInHours < 24) return `${diffInHours} hours ago`;
  if (diffInDays < 30) return `${diffInDays} days ago`;
  
  return formatDate(dateObj);
}

// Validate Saudi phone number
export function validateSaudiPhone(phone: string): boolean {
  const saudiPhoneRegex = /^(\+966|966|0)?[5][0-9]{8}$/;
  return saudiPhoneRegex.test(phone.replace(/\s/g, ''));
}

// Validate Saudi ID (Iqama or National ID)
export function validateSaudiID(id: string): boolean {
  const saudiIDRegex = /^[12][0-9]{9}$/;
  if (!saudiIDRegex.test(id)) return false;

  // Luhn algorithm check
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    let digit = parseInt(id[i]);
    if (i % 2 === 0) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
  }
  
  return sum % 10 === 0;
}

// Validate Saudi IBAN
export function validateSaudiIBAN(iban: string): boolean {
  const saudiIBANRegex = /^SA[0-9]{2}[0-9]{2}[0-9A-Z]{18}$/;
  return saudiIBANRegex.test(iban.replace(/\s/g, ''));
}

// Generate random ID
export function generateId(): string {
  return Math.random().toString(36).substr(2, 9);
}

// Debounce function
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Throttle function
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Deep clone object
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime()) as unknown as T;
  if (obj instanceof Array) return obj.map(item => deepClone(item)) as unknown as T;
  if (typeof obj === 'object') {
    const clonedObj = {} as { [key: string]: any };
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj as T;
  }
  return obj;
}

// Sleep function
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Convert bytes to human readable format
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) {
    return i18n.language === 'ar' ? '0 بايت' : '0 Bytes';
  }

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizesAr = ['بايت', 'كيلوبايت', 'ميجابايت', 'جيجابايت', 'تيرابايت'];
  const sizesEn = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const sizes = i18n.language === 'ar' ? sizesAr : sizesEn;

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

// Check if value is empty
export function isEmpty(value: any): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}