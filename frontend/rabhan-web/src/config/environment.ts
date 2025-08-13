// RABHAN Environment Configuration
// Configuration for different environments

export interface Config {
  apiUrl: string;
  documentServiceUrl: string;
  authServiceUrl: string;
  solarApiUrl: string;
  userApiUrl: string;
  contractorApiUrl: string;
  marketplaceApiUrl: string;
  quoteServiceUrl: string;
  environment: 'development' | 'production' | 'testing';
  enableLogging: boolean;
  maxFileSize: number;
  allowedFileTypes: string[];
  supportedLanguages: string[];
  defaultLanguage: string;
  theme: {
    primaryColor: string;
    accentColor: string;
    backgroundColor: string;
  };
  solarCalculator: {
    minConsumption: number;
    maxConsumption: number;
    minBillResidential: number;
    minBillCommercial: number;
    maxBill: number;
    minInstallments: number;
    maxInstallments: number;
    defaultConsumption: number;
    defaultInstallments: number;
    installmentOptions: number[];
    consumptionPlaceholder: number;
    billPlaceholder: number;
    enableMarketingBanner: boolean;
  };
}

const development: Config = {
  apiUrl: '/api',
  documentServiceUrl: import.meta.env.VITE_DOCUMENT_API_URL || '/api/documents',
  authServiceUrl: import.meta.env.VITE_AUTH_API_URL || '/api/auth',
  solarApiUrl: import.meta.env.VITE_SOLAR_API_URL || '/api/solar-calculator',
  userApiUrl: import.meta.env.VITE_USER_API_URL || '/api/users',
  contractorApiUrl: import.meta.env.VITE_CONTRACTOR_API_URL || '/api/contractors',
  marketplaceApiUrl: import.meta.env.VITE_MARKETPLACE_API_URL || '/api/marketplace',
  quoteServiceUrl: import.meta.env.VITE_QUOTE_API_URL || '/api/quotes',
  environment: 'development',
  enableLogging: import.meta.env.VITE_ENABLE_LOGGING === 'true',
  maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
  allowedFileTypes: import.meta.env.VITE_ALLOWED_FILE_TYPES?.split(',') || ['application/pdf', 'image/jpeg', 'image/png'],
  supportedLanguages: import.meta.env.VITE_SUPPORTED_LANGUAGES?.split(',') || ['en', 'ar'],
  defaultLanguage: import.meta.env.VITE_DEFAULT_LANGUAGE || 'en',
  theme: {
    primaryColor: import.meta.env.VITE_THEME_PRIMARY_COLOR || '#3eb2b1',
    accentColor: import.meta.env.VITE_THEME_ACCENT_COLOR || '#2c8a89',
    backgroundColor: import.meta.env.VITE_THEME_BACKGROUND_COLOR || '#ffffff',
  },
  solarCalculator: {
    minConsumption: parseInt(import.meta.env.VITE_SOLAR_MIN_CONSUMPTION) || 6000,
    maxConsumption: parseInt(import.meta.env.VITE_SOLAR_MAX_CONSUMPTION) || 24000,
    minBillResidential: parseInt(import.meta.env.VITE_SOLAR_MIN_BILL_RESIDENTIAL) || 1080,
    minBillCommercial: parseInt(import.meta.env.VITE_SOLAR_MIN_BILL_COMMERCIAL) || 1200,
    maxBill: parseInt(import.meta.env.VITE_SOLAR_MAX_BILL) || 10000,
    minInstallments: parseInt(import.meta.env.VITE_SOLAR_MIN_INSTALLMENTS) || 12,
    maxInstallments: parseInt(import.meta.env.VITE_SOLAR_MAX_INSTALLMENTS) || 30,
    defaultConsumption: parseInt(import.meta.env.VITE_SOLAR_DEFAULT_CONSUMPTION) || 8000,
    defaultInstallments: parseInt(import.meta.env.VITE_SOLAR_DEFAULT_INSTALLMENTS) || 12,
    installmentOptions: import.meta.env.VITE_SOLAR_INSTALLMENT_OPTIONS?.split(',').map(Number) || [12, 18, 24, 30],
    consumptionPlaceholder: parseInt(import.meta.env.VITE_SOLAR_CONSUMPTION_PLACEHOLDERS?.split(',')[0]) || 8000,
    billPlaceholder: parseInt(import.meta.env.VITE_SOLAR_CONSUMPTION_PLACEHOLDERS?.split(',')[1]) || 2100,
    enableMarketingBanner: import.meta.env.VITE_ENABLE_MARKETING_BANNER !== 'false',
  },
};

const production: Config = {
  apiUrl: '/api',
  documentServiceUrl: import.meta.env.VITE_DOCUMENT_API_URL || '/api/documents',
  authServiceUrl: import.meta.env.VITE_AUTH_API_URL || '/api/auth',
  solarApiUrl: import.meta.env.VITE_SOLAR_API_URL || '/api/solar-calculator',
  userApiUrl: import.meta.env.VITE_USER_API_URL || '/api/users',
  contractorApiUrl: import.meta.env.VITE_CONTRACTOR_API_URL || '/api/contractors',
  marketplaceApiUrl: import.meta.env.VITE_MARKETPLACE_API_URL || '/api/marketplace',
  quoteServiceUrl: import.meta.env.VITE_QUOTE_API_URL || '/api/quotes',
  environment: 'production',
  enableLogging: import.meta.env.VITE_ENABLE_LOGGING === 'true',
  maxFileSize: parseInt(import.meta.env.VITE_MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
  allowedFileTypes: import.meta.env.VITE_ALLOWED_FILE_TYPES?.split(',') || ['application/pdf', 'image/jpeg', 'image/png'],
  supportedLanguages: import.meta.env.VITE_SUPPORTED_LANGUAGES?.split(',') || ['en', 'ar'],
  defaultLanguage: import.meta.env.VITE_DEFAULT_LANGUAGE || 'en',
  theme: {
    primaryColor: import.meta.env.VITE_THEME_PRIMARY_COLOR || '#3eb2b1',
    accentColor: import.meta.env.VITE_THEME_ACCENT_COLOR || '#2c8a89',
    backgroundColor: import.meta.env.VITE_THEME_BACKGROUND_COLOR || '#ffffff',
  },
  solarCalculator: {
    minConsumption: parseInt(import.meta.env.VITE_SOLAR_MIN_CONSUMPTION) || 6000,
    maxConsumption: parseInt(import.meta.env.VITE_SOLAR_MAX_CONSUMPTION) || 24000,
    minBillResidential: parseInt(import.meta.env.VITE_SOLAR_MIN_BILL_RESIDENTIAL) || 1080,
    minBillCommercial: parseInt(import.meta.env.VITE_SOLAR_MIN_BILL_COMMERCIAL) || 1200,
    maxBill: parseInt(import.meta.env.VITE_SOLAR_MAX_BILL) || 10000,
    minInstallments: parseInt(import.meta.env.VITE_SOLAR_MIN_INSTALLMENTS) || 12,
    maxInstallments: parseInt(import.meta.env.VITE_SOLAR_MAX_INSTALLMENTS) || 30,
    defaultConsumption: parseInt(import.meta.env.VITE_SOLAR_DEFAULT_CONSUMPTION) || 8000,
    defaultInstallments: parseInt(import.meta.env.VITE_SOLAR_DEFAULT_INSTALLMENTS) || 12,
    installmentOptions: import.meta.env.VITE_SOLAR_INSTALLMENT_OPTIONS?.split(',').map(Number) || [12, 18, 24, 30],
    consumptionPlaceholder: parseInt(import.meta.env.VITE_SOLAR_CONSUMPTION_PLACEHOLDERS?.split(',')[0]) || 8000,
    billPlaceholder: parseInt(import.meta.env.VITE_SOLAR_CONSUMPTION_PLACEHOLDERS?.split(',')[1]) || 2100,
    enableMarketingBanner: import.meta.env.VITE_ENABLE_MARKETING_BANNER !== 'false',
  },
};

const testing: Config = {
  apiUrl: '/api',
  documentServiceUrl: import.meta.env.VITE_DOCUMENT_API_URL || '/api/documents',
  authServiceUrl: import.meta.env.VITE_AUTH_API_URL || '/api/auth',
  solarApiUrl: import.meta.env.VITE_SOLAR_API_URL || '/api/solar-calculator',
  userApiUrl: import.meta.env.VITE_USER_API_URL || '/api/users',
  contractorApiUrl: import.meta.env.VITE_CONTRACTOR_API_URL || '/api/contractors',
  marketplaceApiUrl: import.meta.env.VITE_MARKETPLACE_API_URL || '/api/marketplace',
  quoteServiceUrl: import.meta.env.VITE_QUOTE_API_URL || '/api/quotes',
  environment: 'testing',
  enableLogging: true,
  maxFileSize: 10 * 1024 * 1024, // 10MB for testing
  allowedFileTypes: import.meta.env.VITE_ALLOWED_FILE_TYPES?.split(',') || ['application/pdf', 'image/jpeg', 'image/png'],
  supportedLanguages: import.meta.env.VITE_SUPPORTED_LANGUAGES?.split(',') || ['en', 'ar'],
  defaultLanguage: import.meta.env.VITE_DEFAULT_LANGUAGE || 'en',
  theme: {
    primaryColor: import.meta.env.VITE_THEME_PRIMARY_COLOR || '#3eb2b1',
    accentColor: import.meta.env.VITE_THEME_ACCENT_COLOR || '#2c8a89',
    backgroundColor: import.meta.env.VITE_THEME_BACKGROUND_COLOR || '#ffffff',
  },
  solarCalculator: {
    minConsumption: parseInt(import.meta.env.VITE_SOLAR_MIN_CONSUMPTION) || 6000,
    maxConsumption: parseInt(import.meta.env.VITE_SOLAR_MAX_CONSUMPTION) || 24000,
    minBillResidential: parseInt(import.meta.env.VITE_SOLAR_MIN_BILL_RESIDENTIAL) || 1080,
    minBillCommercial: parseInt(import.meta.env.VITE_SOLAR_MIN_BILL_COMMERCIAL) || 1200,
    maxBill: parseInt(import.meta.env.VITE_SOLAR_MAX_BILL) || 10000,
    minInstallments: parseInt(import.meta.env.VITE_SOLAR_MIN_INSTALLMENTS) || 12,
    maxInstallments: parseInt(import.meta.env.VITE_SOLAR_MAX_INSTALLMENTS) || 30,
    defaultConsumption: parseInt(import.meta.env.VITE_SOLAR_DEFAULT_CONSUMPTION) || 8000,
    defaultInstallments: parseInt(import.meta.env.VITE_SOLAR_DEFAULT_INSTALLMENTS) || 12,
    installmentOptions: import.meta.env.VITE_SOLAR_INSTALLMENT_OPTIONS?.split(',').map(Number) || [12, 18, 24, 30],
    consumptionPlaceholder: parseInt(import.meta.env.VITE_SOLAR_CONSUMPTION_PLACEHOLDERS?.split(',')[0]) || 8000,
    billPlaceholder: parseInt(import.meta.env.VITE_SOLAR_CONSUMPTION_PLACEHOLDERS?.split(',')[1]) || 2100,
    enableMarketingBanner: import.meta.env.VITE_ENABLE_MARKETING_BANNER !== 'false',
  },
};

function getConfig(): Config {
  const env = import.meta.env.MODE || 'development';
  
  switch (env) {
    case 'production':
      return production;
    case 'testing':
      return testing;
    default:
      return development;
  }
}

export const config = getConfig();
export const environment = config; // Alias for backward compatibility
export default config;