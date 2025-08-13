import axios from 'axios';

const API_BASE_URL = 'http://localhost:3006/api';

// Configure axios instance for admin service
const adminAPI = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
adminAPI.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rabhan_admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
adminAPI.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('rabhan_admin_token');
      localStorage.removeItem('rabhan_admin_user');
      localStorage.removeItem('rabhan_session_expiry');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Types
interface LoginRequest {
  username: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  message: string;
  data?: {
    user: {
      id: string;
      username: string;
      email: string;
      role: 'super_admin' | 'admin' | 'compliance_officer' | 'analyst';
      permissions: string[];
      profile: {
        firstName: string;
        lastName: string;
        avatar?: string;
        department?: string;
        lastLogin?: string;
      };
    };
    token: string;
    expiresIn: number;
  };
}

interface RefreshResponse {
  success: boolean;
  message: string;
  data?: {
    token: string;
    expiresIn: number;
  };
}

interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
}

// Auth API functions
export const authAPI = {
  // Login with username/password and optional MFA
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    try {
      const response = await adminAPI.post('/v1/auth/login', credentials);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error('Network error occurred');
    }
  },

  // Refresh authentication token
  async refresh(): Promise<RefreshResponse> {
    try {
      const response = await adminAPI.post('/v1/auth/refresh');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error('Network error occurred');
    }
  },

  // Logout
  async logout(): Promise<ApiResponse> {
    try {
      const response = await adminAPI.post('/v1/auth/logout');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error('Network error occurred');
    }
  },

  // Verify current session
  async verify(): Promise<ApiResponse> {
    try {
      const response = await adminAPI.post('/v1/auth/verify-session');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error('Network error occurred');
    }
  },

  // Get current user profile
  async getProfile(): Promise<ApiResponse> {
    try {
      const response = await adminAPI.get('/v1/auth/me');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error('Network error occurred');
    }
  },

  // Update user profile
  async updateProfile(data: any): Promise<ApiResponse> {
    try {
      const response = await adminAPI.put('/v1/auth/me', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error('Network error occurred');
    }
  },

  // Change password
  async changePassword(data: { currentPassword: string; newPassword: string }): Promise<ApiResponse> {
    try {
      const response = await adminAPI.put('/v1/auth/change-password', data);
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error('Network error occurred');
    }
  },

  // Setup MFA
  async setupMFA(): Promise<ApiResponse> {
    try {
      const response = await adminAPI.post('/v1/auth/setup-mfa');
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error('Network error occurred');
    }
  },

  // Verify MFA setup
  async verifyMFA(code: string): Promise<ApiResponse> {
    try {
      const response = await adminAPI.post('/v1/auth/verify-mfa', { token: code });
      return response.data;
    } catch (error: any) {
      if (error.response?.data) {
        return error.response.data;
      }
      throw new Error('Network error occurred');
    }
  },
};

// Generic API call function
export const apiCall = async (url: string, options?: any): Promise<any> => {
  try {
    const response = await adminAPI({
      url,
      method: options?.method || 'GET',
      data: options?.data,
      params: options?.params,
      ...options,
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      throw new Error(error.response.data.message || 'API call failed');
    }
    throw new Error('Network error occurred');
  }
};

export { adminAPI };