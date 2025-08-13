import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { authAPI } from '@/services/api/auth';
import { toast } from 'react-hot-toast';

// Types
interface User {
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
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  sessionExpiry: Date | null;
}

type AuthAction =
  | { type: 'AUTH_START' }
  | { type: 'AUTH_SUCCESS'; payload: { user: User; token: string; expiresIn: number } }
  | { type: 'AUTH_FAILURE' }
  | { type: 'LOGOUT' }
  | { type: 'REFRESH_TOKEN'; payload: { token: string; expiresIn: number } }
  | { type: 'UPDATE_USER'; payload: User };

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshAuth: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
}

// Initial state
const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('rabhan_admin_token'),
  isLoading: false,
  isAuthenticated: false,
  sessionExpiry: null,
};

// Auth reducer
function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'AUTH_START':
      return { ...state, isLoading: true };
    
    case 'AUTH_SUCCESS':
      const expiryDate = new Date(Date.now() + action.payload.expiresIn * 1000);
      localStorage.setItem('rabhan_admin_token', action.payload.token);
      localStorage.setItem('rabhan_admin_user', JSON.stringify(action.payload.user));
      localStorage.setItem('rabhan_session_expiry', expiryDate.toISOString());
      
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isLoading: false,
        isAuthenticated: true,
        sessionExpiry: expiryDate,
      };
    
    case 'AUTH_FAILURE':
      localStorage.removeItem('rabhan_admin_token');
      localStorage.removeItem('rabhan_admin_user');
      localStorage.removeItem('rabhan_session_expiry');
      
      return {
        ...state,
        user: null,
        token: null,
        isLoading: false,
        isAuthenticated: false,
        sessionExpiry: null,
      };
    
    case 'LOGOUT':
      localStorage.removeItem('rabhan_admin_token');
      localStorage.removeItem('rabhan_admin_user');
      localStorage.removeItem('rabhan_session_expiry');
      
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        sessionExpiry: null,
      };
    
    case 'REFRESH_TOKEN':
      const newExpiryDate = new Date(Date.now() + action.payload.expiresIn * 1000);
      localStorage.setItem('rabhan_admin_token', action.payload.token);
      localStorage.setItem('rabhan_session_expiry', newExpiryDate.toISOString());
      
      return {
        ...state,
        token: action.payload.token,
        sessionExpiry: newExpiryDate,
      };
    
    case 'UPDATE_USER':
      localStorage.setItem('rabhan_admin_user', JSON.stringify(action.payload));
      return { ...state, user: action.payload };
    
    default:
      return state;
  }
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Initialize auth state from localStorage
  useEffect(() => {
    const token = localStorage.getItem('rabhan_admin_token');
    const userData = localStorage.getItem('rabhan_admin_user');
    const sessionExpiry = localStorage.getItem('rabhan_session_expiry');

    if (token && userData && sessionExpiry) {
      const user = JSON.parse(userData);
      const expiry = new Date(sessionExpiry);
      
      // Check if session is still valid
      if (expiry > new Date()) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user,
            token,
            expiresIn: Math.floor((expiry.getTime() - Date.now()) / 1000),
          },
        });
      } else {
        // Session expired, clear storage
        dispatch({ type: 'AUTH_FAILURE' });
      }
    }
  }, []);

  // Auto-refresh token before expiry
  useEffect(() => {
    if (!state.sessionExpiry || !state.isAuthenticated) return;

    const timeToExpiry = state.sessionExpiry.getTime() - Date.now();
    const refreshTime = Math.max(timeToExpiry - 5 * 60 * 1000, 30 * 1000); // Refresh 5 minutes before expiry, minimum 30 seconds

    const refreshTimer = setTimeout(async () => {
      const success = await refreshAuth();
      if (!success) {
        toast.error('Session expired. Please login again.');
        logout();
      }
    }, refreshTime);

    return () => clearTimeout(refreshTimer);
  }, [state.sessionExpiry, state.isAuthenticated]);

  // Login function
  const login = async (username: string, password: string): Promise<boolean> => {
    dispatch({ type: 'AUTH_START' });

    try {
      const response = await authAPI.login({ username, password });
      
      if (response.success && response.data) {
        dispatch({
          type: 'AUTH_SUCCESS',
          payload: {
            user: response.data.user,
            token: response.data.token,
            expiresIn: response.data.expiresIn,
          },
        });
        
        toast.success(`Welcome ${response.data.user.profile.firstName}! Login successful`);
        return true;
      } else {
        dispatch({ type: 'AUTH_FAILURE' });
        toast.error(response.message || 'Login failed');
        return false;
      }
    } catch (error: any) {
      dispatch({ type: 'AUTH_FAILURE' });
      toast.error(error.message || 'Connection error');
      return false;
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (state.token) {
        await authAPI.logout();
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      dispatch({ type: 'LOGOUT' });
      toast.success('تم تسجيل الخروج بنجاح');
    }
  };

  // Refresh authentication
  const refreshAuth = async (): Promise<boolean> => {
    if (!state.token) return false;

    try {
      const response = await authAPI.refresh();
      
      if (response.success && response.data) {
        dispatch({
          type: 'REFRESH_TOKEN',
          payload: {
            token: response.data.token,
            expiresIn: response.data.expiresIn,
          },
        });
        return true;
      } else {
        dispatch({ type: 'AUTH_FAILURE' });
        return false;
      }
    } catch (error) {
      dispatch({ type: 'AUTH_FAILURE' });
      return false;
    }
  };

  // Check if user has specific permission
  const hasPermission = (permission: string): boolean => {
    if (!state.user) return false;
    
    // Super admin has all permissions
    if (state.user.role === 'super_admin') return true;
    
    return state.user.permissions.includes(permission);
  };

  const value: AuthContextType = {
    ...state,
    login,
    logout,
    refreshAuth,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}