import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import { config } from '../config/environment';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  code?: string;
  metadata?: {
    timestamp: string;
    requestId?: string;
  };
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
  status: number;
  details?: any;
}

class ApiService {
  private authClient: AxiosInstance;
  private userClient: AxiosInstance;
  private documentClient: AxiosInstance;
  private contractorClient: AxiosInstance;
  private accessToken: string | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('rabhan_access_token');
    
    this.authClient = axios.create({
      baseURL: config.environment === 'development' ? 'http://127.0.0.1:3001/api' : '/api/auth',
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.userClient = axios.create({
      baseURL: config.environment === 'development' ? 'http://127.0.0.1:3002' : '/api/users',
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Document Service client
    this.documentClient = axios.create({
      baseURL: config.environment === 'development' ? 'http://127.0.0.1:3003' : '/api/documents',
      timeout: 15000, // Longer timeout for file uploads
      withCredentials: true, // Include HttpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Contractor Service client
    this.contractorClient = axios.create({
      baseURL: config.environment === 'development' ? 'http://127.0.0.1:3004' : '/api/contractors',
      timeout: 10000,
      withCredentials: true, // Include HttpOnly cookies
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptors for all clients
    [this.authClient, this.userClient, this.documentClient, this.contractorClient].forEach(client => {
      client.interceptors.request.use(
        async (config) => {
          // Add request ID for tracking
          config.headers['X-Request-ID'] = this.generateRequestId();
          
          // Add timestamp
          config.headers['X-Request-Time'] = new Date().toISOString();
          
          // Temporarily disabled token refresh to prevent hanging
          // if (this.accessToken && this.isTokenExpired(this.accessToken)) {
          //   console.log('🔄 Token expired, attempting refresh...');
          //   try {
          //     await this.refreshTokenIfNeeded();
          //   } catch (error) {
          //     console.error('❌ Failed to refresh token:', error);
          //   }
          // }
          
          // Add Authorization header if we have an access token
          if (this.accessToken) {
            config.headers['Authorization'] = `Bearer ${this.accessToken}`;
          }
          
          // Reduced logging for less console spam
          // console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
          
          return config;
        },
        (error) => {
          console.error('❌ Request Error:', error);
          return Promise.reject(error);
        }
      );

      // Response interceptors for all clients
      client.interceptors.response.use(
        (response: AxiosResponse) => {
          // Reduced logging for less console spam
          // console.log(`✅ API Response: ${response.config.url}`, response.status);
          
          return response;
        },
        async (error: AxiosError) => {
          console.error(`❌ API Error: ${error.config?.url}`, {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message
          });

          // Handle 401 Unauthorized - session expired
          if (error.response?.status === 401) {
            console.warn('🔒 Session expired, redirecting to login...');
            console.warn('🔍 Request URL:', error.config?.url);
            console.warn('🔍 Request data:', error.config?.data);
            // Clear any client-side state
            this.handleSessionExpired();
          }

          // Handle 403 Forbidden
          if (error.response?.status === 403) {
            console.warn('🚫 Access denied');
          }

          // Handle network errors
          if (!error.response) {
            console.error('🌐 Network error - service unavailable');
          }

          return Promise.reject(this.formatError(error));
        }
      );
    });
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Token management methods
  public setAccessToken(token: string): void {
    this.accessToken = token;
    localStorage.setItem('rabhan_access_token', token);
    console.log('🔑 Access token set for API requests');
  }

  public clearAccessToken(): void {
    this.accessToken = null;
    localStorage.removeItem('rabhan_access_token');
    console.log('🔑 Access token cleared');
  }

  public getAccessToken(): string | null {
    return this.accessToken;
  }

  private handleSessionExpired(): void {
    // Clear any client-side authentication state
    // Redirect to login will be handled by the component
    window.dispatchEvent(new CustomEvent('session-expired'));
  }

  private isTokenExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      // Check if token expires in the next 30 seconds
      return payload.exp < (now + 30);
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true; // Assume expired if we can't parse it
    }
  }

  private async refreshTokenIfNeeded(): Promise<void> {
    try {
      const response = await this.authClient.post('/auth/refresh');
      if (response.data.success && response.data.data?.accessToken) {
        this.setAccessToken(response.data.data.accessToken);
        console.log('✅ Token refreshed successfully');
      }
    } catch (error) {
      console.error('❌ Token refresh failed:', error);
      throw error;
    }
  }

  private formatError(error: AxiosError): ApiError {
    const response = error.response;
    
    if (response) {
      // Server responded with error
      return {
        success: false,
        error: (response.data as any)?.error || response.statusText || 'API Error',
        code: (response.data as any)?.code || `HTTP_${response.status}`,
        status: response.status,
        details: response.data
      };
    } else if (error.request) {
      // Network error
      return {
        success: false,
        error: 'Network error - please check your connection',
        code: 'NETWORK_ERROR',
        status: 0,
        details: { message: error.message }
      };
    } else {
      // Request setup error
      return {
        success: false,
        error: error.message || 'Unknown error occurred',
        code: 'REQUEST_ERROR',
        status: 0,
        details: { message: error.message }
      };
    }
  }

  // General request method
  public async request(path: string, method: string, data?: any): Promise<ApiResponse> {
    try {
      let response;
      const config = data ? { data } : {};
      
      switch (method.toUpperCase()) {
        case 'GET':
          response = await this.authClient.get(path);
          break;
        case 'POST':
          response = await this.authClient.post(path, data);
          break;
        case 'PUT':
          response = await this.authClient.put(path, data);
          break;
        case 'DELETE':
          response = await this.authClient.delete(path);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }
      
      return response.data;
    } catch (error: any) {
      console.error(`API request error [${method} ${path}]:`, error);
      throw this.formatError(error);
    }
  }

  // Auth Service Methods
  public get auth() {
    return {
      register: async (userData: {
        email: string;
        password: string;
        phone?: string;
        nationalId?: string;
        role?: string;
        user_type?: string;
      }): Promise<ApiResponse> => {
        const response = await this.authClient.post('/auth/register', {
          ...userData,
          role: userData.role || 'USER'
        });
        return response.data;
      },

      login: async (credentials: {
        email: string;
        password: string;
        userType?: 'USER' | 'CONTRACTOR';
      }): Promise<ApiResponse> => {
        const response = await this.authClient.post('/auth/login', credentials);
        return response.data;
      },

      logout: async (): Promise<ApiResponse> => {
        const response = await this.authClient.post('/auth/logout');
        return response.data;
      },

      sendPhoneOTP: async (phone: string): Promise<ApiResponse> => {
        const response = await this.authClient.post('/auth/phone/send-otp', { phoneNumber: phone });
        return response.data;
      },

      verifyPhoneOTP: async (phone: string, otp: string): Promise<ApiResponse> => {
        const response = await this.authClient.post('/auth/phone/verify-otp', { phoneNumber: phone, otp });
        return response.data;
      },

      sendEmailVerification: async (): Promise<ApiResponse> => {
        const response = await this.authClient.post('/auth/email/send-verification');
        return response.data;
      },

      verifyEmail: async (token: string): Promise<ApiResponse> => {
        const response = await this.authClient.post('/auth/email/verify', { token });
        return response.data;
      },

      getCurrentUser: async (): Promise<ApiResponse> => {
        const response = await this.authClient.get('/auth/profile');
        return response.data;
      },

      updateCurrentUser: async (userData: {
        first_name?: string;
        last_name?: string;
        email?: string;
        phone?: string;
        company_name?: string;
        cr_number?: string;
        vat_number?: string;
        business_type?: string;
      }): Promise<ApiResponse> => {
        const response = await this.authClient.put('/auth/profile', userData);
        return response.data;
      },

      refreshSession: async (): Promise<ApiResponse> => {
        const response = await this.authClient.post('/auth/refresh');
        return response.data;
      },

      registerContractor: async (contractorData: {
        firstName: string;
        lastName: string;
        email: string;
        password: string;
        phone: string;
        companyName?: string;
        crNumber?: string;
        vatNumber?: string;
        userType?: string;
      }): Promise<ApiResponse> => {
        const response = await this.authClient.post('/auth/contractor/register', {
          ...contractorData,
          role: 'CONTRACTOR'
        });
        return response.data;
      }
    };
  }

  // User Service Methods
  public get user() {
    return {
      createProfile: async (profileData: {
        userId?: string; // Will be set by backend from session
        firstName: string;
        lastName: string;
        region: string;
        city: string;
        district?: string;
        streetAddress?: string;
        landmark?: string;
        postalCode: string;
        propertyType: string;
        propertyOwnership: string;
        roofSize: number;
        gpsLatitude: number;
        gpsLongitude: number;
        electricityConsumption: string;
        electricityMeterNumber: string;
        preferredLanguage?: string;
        emailNotifications?: boolean;
        smsNotifications?: boolean;
        marketingConsent?: boolean;
      }): Promise<ApiResponse> => {
        const response = await this.userClient.post('/api/users/profiles', profileData);
        return response.data;
      },

      createRegistrationProfile: async (profileData: {
        userId?: string;
        firstName: string;
        lastName: string;
        region: string;
        city: string;
        district?: string;
        streetAddress?: string;
        landmark?: string;
        postalCode: string;
        propertyType: string;
        propertyOwnership: string;
        roofSize: number;
        gpsLatitude: number;
        gpsLongitude: number;
        electricityConsumption: string;
        electricityMeterNumber: string;
        preferredLanguage?: string;
        emailNotifications?: boolean;
        smsNotifications?: boolean;
        marketingConsent?: boolean;
      }): Promise<ApiResponse> => {
        const response = await this.userClient.post('/api/users/profiles/register', profileData);
        return response.data;
      },

      getProfile: async (userId?: string): Promise<ApiResponse> => {
        const endpoint = userId ? `/api/users/profiles/${userId}` : '/api/users/profiles/me';
        const response = await this.userClient.get(endpoint);
        return response.data;
      },

      updateProfile: async (userId?: string, updates?: any): Promise<ApiResponse> => {
        const endpoint = userId ? `/api/users/profiles/${userId}` : '/api/users/profiles/me';
        const response = await this.userClient.put(endpoint, updates);
        return response.data;
      },

      checkBNPLEligibility: async (userId?: string): Promise<ApiResponse> => {
        const endpoint = userId 
          ? `/api/users/profiles/${userId}/bnpl-eligibility`
          : '/api/users/profiles/me/bnpl-eligibility';
        const response = await this.userClient.get(endpoint);
        return response.data;
      },

      getDocuments: async (userId?: string): Promise<ApiResponse> => {
        const endpoint = userId 
          ? `/api/users/profiles/${userId}/documents`
          : '/api/users/profiles/me/documents';
        const response = await this.userClient.get(endpoint);
        return response.data;
      },

      getUserDocuments: async (userId?: string): Promise<ApiResponse> => {
        const endpoint = userId 
          ? `/api/users/profiles/${userId}/documents`
          : '/api/users/profiles/me/documents';
        const response = await this.userClient.get(endpoint);
        return response.data;
      }
    };
  }

  // Document Service Methods
  public get documents() {
    return {
      uploadDocument: async (
        documentType: string, 
        file: File, 
        metadata?: any
      ): Promise<ApiResponse> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('documentType', documentType);
        if (metadata) {
          formData.append('metadata', JSON.stringify(metadata));
        }

        const response = await this.documentClient.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });
        return response.data;
      },

      getDocumentStatus: async (documentId: string): Promise<ApiResponse> => {
        const response = await this.documentClient.get(`/status/${documentId}`);
        return response.data;
      },

      downloadDocument: async (documentId: string): Promise<Blob> => {
        const response = await this.documentClient.get(`/download/${documentId}`, {
          responseType: 'blob'
        });
        return response.data;
      }
    };
  }

  // Health check methods
  public get health() {
    return {
      checkAuthService: async (): Promise<ApiResponse> => {
        const response = await this.authClient.get('/auth/health');
        return response.data;
      },

      checkUserService: async (): Promise<ApiResponse> => {
        const response = await this.userClient.get('/health');
        return response.data;
      },

      checkDocumentService: async (): Promise<ApiResponse> => {
        const response = await this.documentClient.get('/health');
        return response.data;
      },

      checkAllServices: async (): Promise<{
        auth: ApiResponse;
        user: ApiResponse;
        document: ApiResponse;
      }> => {
        const [auth, user, document] = await Promise.allSettled([
          this.health.checkAuthService(),
          this.health.checkUserService(),
          this.health.checkDocumentService()
        ]);

        return {
          auth: auth.status === 'fulfilled' ? auth.value : { success: false, error: 'Service unavailable' },
          user: user.status === 'fulfilled' ? user.value : { success: false, error: 'Service unavailable' },
          document: document.status === 'fulfilled' ? document.value : { success: false, error: 'Service unavailable' }
        };
      }
    };
  }

  // Public getters for service instances (for external services)
  public getAuthServiceInstance(): AxiosInstance {
    return this.authClient;
  }

  public getUserServiceInstance(): AxiosInstance {
    return this.userClient;
  }

  public getDocumentServiceInstance(): AxiosInstance {
    return this.documentClient;
  }

  public getContractorServiceInstance(): AxiosInstance {
    return this.contractorClient;
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export contractor client for contractor service
export const api = apiService.getContractorServiceInstance();

export default apiService;