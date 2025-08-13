import { apiService, ApiResponse, ApiError } from './api.service';

export interface User {
  id: string;
  email: string;
  phone?: string;
  national_id?: string;
  first_name?: string;
  last_name?: string;
  role: 'USER' | 'CONTRACTOR' | 'ADMIN';
  user_type?: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'BLOCKED';
  email_verified: boolean;
  phone_verified: boolean;
  sama_verified: boolean;
  created_at: string;
  updated_at: string;
  bnpl_eligible?: boolean;
  company_name?: string;
  cr_number?: string;
  vat_number?: string;
  business_type?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  error: string | null;
}

export interface RegisterData {
  email: string;
  password: string;
  confirmPassword?: string; // Frontend only, not sent to backend
  firstName?: string;
  lastName?: string;
  phone?: string;
  nationalId?: string;
  role?: 'USER' | 'CONTRACTOR';
  user_type?: string;
}

export interface LoginData {
  email: string;
  password: string;
  userType?: 'USER' | 'CONTRACTOR';
}

export interface PhoneVerificationData {
  phone: string;
  otp: string;
}

class AuthService {
  private listeners: Set<(state: AuthState) => void> = new Set();
  private currentState: AuthState = {
    isAuthenticated: false,
    user: null,
    isLoading: false,
    error: null,
  };

  constructor() {
    // Listen for session expiration events
    window.addEventListener('session-expired', this.handleSessionExpired.bind(this));
    
    // Only check authentication status once on initialization
    // Subsequent checks should be triggered by user actions or components
    if (!this.hasInitialized) {
      this.hasInitialized = true;
      this.checkAuthStatus();
    }
  }

  // Helper method to transform camelCase profile data to snake_case
  private transformProfileData(profileData: any) {
    return {
      // Note: first_name and last_name come from auth service, not profile service
      region: profileData.region,
      city: profileData.city,
      district: profileData.district,
      street_address: profileData.streetAddress,
      landmark: profileData.landmark,
      postal_code: profileData.postalCode,
      property_type: profileData.propertyType,
      property_ownership: profileData.propertyOwnership,
      roof_size: profileData.roofSize,
      gps_latitude: profileData.gpsLatitude,
      gps_longitude: profileData.gpsLongitude,
      electricity_consumption: profileData.electricityConsumption,
      electricity_meter_number: profileData.electricityMeterNumber,
      preferred_language: profileData.preferredLanguage,
      email_notifications: profileData.emailNotifications,
      sms_notifications: profileData.smsNotifications,
      marketing_consent: profileData.marketingConsent,
      profile_completed: profileData.profileCompleted,
      profile_completion_percentage: profileData.profileCompletionPercentage,
      bnpl_eligible: profileData.bnplEligible,
      bnpl_max_amount: profileData.bnplMaxAmount,
      bnpl_risk_score: profileData.bnplRiskScore,
      employment_status: profileData.employmentStatus,
      employer_name: profileData.employerName,
      job_title: profileData.jobTitle,
      monthly_income: profileData.monthlyIncome,
      years_employed: profileData.yearsEmployed,
    };
  }

  private hasInitialized = false;

  // State management methods
  private setState(updates: Partial<AuthState>): void {
    this.currentState = { ...this.currentState, ...updates };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.currentState));
  }

  public subscribe(listener: (state: AuthState) => void): () => void {
    this.listeners.add(listener);
    // Immediately call with current state
    listener(this.currentState);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): AuthState {
    return { ...this.currentState };
  }

  // Authentication methods
  public async register(data: RegisterData): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      this.setState({ isLoading: true, error: null });

      // Validate passwords match (frontend only)
      if (data.confirmPassword && data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      // Remove confirmPassword before sending to backend
      const { confirmPassword, ...registerPayload } = data;

      console.log('🔐 Attempting user registration...', { email: registerPayload.email });

      const response: ApiResponse = await apiService.auth.register(registerPayload);

      if (response.success && response.data) {
        console.log('✅ Registration successful');
        
        // Extract tokens from the response
        const { accessToken, refreshToken } = response.data;
        
        // Set the access token
        if (accessToken) {
          apiService.setAccessToken(accessToken);
          console.log('✅ Access token set after registration');
        }
        
        // After setting token, fetch user data
        const userResponse: ApiResponse<User> = await apiService.auth.getCurrentUser();
        
        if (userResponse.success && userResponse.data) {
          console.log('✅ User data fetched successfully after registration');
          
          // Update authentication state
          this.setState({
            isAuthenticated: true,
            user: userResponse.data,
            isLoading: false,
            error: null,
          });

          return { success: true, user: userResponse.data };
        } else {
          // If we can't get user data, still return success but without user
          console.warn('⚠️ Could not fetch user data after registration');
          return { success: true };
        }
      } else {
        const error = response.error || 'Registration failed';
        console.error('❌ Registration failed:', error);
        
        this.setState({
          isLoading: false,
          error,
        });

        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'Registration failed';
      console.error('❌ Registration error:', errorMessage);
      
      this.setState({
        isLoading: false,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  public async login(data: LoginData): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      this.setState({ isLoading: true, error: null });

      console.log('🔐 Attempting user login...', { email: data.email });

      const loginResponse: ApiResponse = await apiService.auth.login(data);

      if (loginResponse.success && loginResponse.data) {
        console.log('✅ Login successful, setting access token...');
        
        // Extract and set the access token
        const { accessToken } = loginResponse.data;
        if (accessToken) {
          apiService.setAccessToken(accessToken);
        }
        
        // After successful login, fetch user data
        const userResponse: ApiResponse<User> = await apiService.auth.getCurrentUser();
        
        if (userResponse.success && userResponse.data) {
          console.log('✅ User data fetched successfully');
          
          let mergedUser = userResponse.data;
          
          // Only fetch profile data from user service for regular users, not contractors
          if (userResponse.data.role === 'USER') {
            try {
              const profileResponse = await apiService.user.getProfile();
              
              if (profileResponse.success && profileResponse.data) {
                console.log('✅ Profile data fetched successfully');
                
                // Transform camelCase profile data to snake_case to match frontend expectations
                const transformedProfile = this.transformProfileData(profileResponse.data);
                
                // Merge profile data with auth user data, preserving critical auth fields
                mergedUser = {
                  ...transformedProfile, // Profile data first
                  ...userResponse.data, // Auth data overrides profile data
                  // Explicitly preserve critical auth fields that should never be overridden
                  id: userResponse.data.id,
                  email: userResponse.data.email,
                  role: userResponse.data.role,
                  status: userResponse.data.status,
                  email_verified: userResponse.data.email_verified,
                  phone_verified: userResponse.data.phone_verified,
                  sama_verified: userResponse.data.sama_verified,
                  created_at: userResponse.data.created_at,
                  updated_at: userResponse.data.updated_at
                };
              } else {
                console.log('ℹ️ No profile data found, using auth data only');
              }
            } catch (profileError) {
              console.warn('⚠️ Failed to fetch profile data, continuing with auth data only:', profileError);
              // Continue with just auth data - profile fetch is optional
            }
          } else {
            console.log('ℹ️ Contractor user - skipping profile fetch from user service');
          }
          
          this.setState({
            isAuthenticated: true,
            user: mergedUser,
            isLoading: false,
            error: null,
          });

          return { success: true, user: mergedUser };
        } else {
          const error = 'Failed to fetch user data after login';
          console.error('❌ Failed to fetch user data:', error);
          
          this.setState({
            isLoading: false,
            error,
          });

          return { success: false, error };
        }
      } else {
        const error = loginResponse.error || 'Login failed';
        console.error('❌ Login failed:', error);
        
        this.setState({
          isLoading: false,
          error,
        });

        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'Login failed';
      console.error('❌ Login error:', errorMessage);
      
      this.setState({
        isLoading: false,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  public async logout(): Promise<{ success: boolean; error?: string }> {
    try {
      this.setState({ isLoading: true, error: null });

      console.log('🚪 Logging out user...');

      await apiService.auth.logout();

      console.log('✅ Logout successful');
      
      // Clear access token
      apiService.clearAccessToken();
      
      this.setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });

      return { success: true };
    } catch (error: any) {
      // Even if logout fails on backend, clear local state and token
      console.warn('⚠️ Logout warning:', error.error || error.message);
      
      // Clear access token
      apiService.clearAccessToken();
      
      this.setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });

      return { success: true }; // Still return success since local state is cleared
    }
  }

  public async sendPhoneOTP(phone: string): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📱 Sending phone OTP...', { phone });

      const response: ApiResponse = await apiService.auth.sendPhoneOTP(phone);

      if (response.success) {
        console.log('✅ Phone OTP sent successfully');
        return { success: true };
      } else {
        const error = response.error || 'Failed to send OTP';
        console.error('❌ Failed to send phone OTP:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'Failed to send OTP';
      console.error('❌ Phone OTP error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  // Email-based login flow methods
  public async lookupEmailForLogin(email: string, userType?: 'USER' | 'CONTRACTOR'): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiService.request('/login/email/lookup', 'POST', { email, userType });
      return { success: response.success, data: response.data, error: response.error };
    } catch (error: any) {
      console.error('Email lookup error:', error);
      return { success: false, error: error.message || 'Email lookup failed' };
    }
  }

  public async sendLoginOTPToPhone(email: string, userType?: 'USER' | 'CONTRACTOR'): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
      const response = await apiService.request('/login/email/send-otp', 'POST', { email, userType });
      return { success: response.success, data: response.data, error: response.error };
    } catch (error: any) {
      console.error('Send login OTP error:', error);
      return { success: false, error: error.message || 'Failed to send OTP' };
    }
  }

  public async verifyLoginOTP(data: { email: string; otp: string; userType?: 'USER' | 'CONTRACTOR' }): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await apiService.request('/login/email/verify-otp', 'POST', data);
      return { success: response.success, error: response.error };
    } catch (error: any) {
      console.error('Verify login OTP error:', error);
      return { success: false, error: error.message || 'OTP verification failed' };
    }
  }

  public async verifyPhoneOTP(data: PhoneVerificationData): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      console.log('🔍 Verifying phone OTP...', { phone: data.phone });

      const response: ApiResponse<User> = await apiService.auth.verifyPhoneOTP(data.phone, data.otp);

      if (response.success) {
        console.log('✅ Phone OTP verified successfully');
        
        // Update user state if user data is returned
        if (response.data && this.currentState.user) {
          this.setState({
            user: { ...this.currentState.user, ...response.data },
          });
        }

        return { success: true, user: response.data };
      } else {
        const error = response.error || 'Invalid OTP';
        console.error('❌ Phone OTP verification failed:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'OTP verification failed';
      console.error('❌ Phone OTP verification error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  public async sendEmailVerification(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('📧 Sending email verification...');

      const response: ApiResponse = await apiService.auth.sendEmailVerification();

      if (response.success) {
        console.log('✅ Email verification sent successfully');
        return { success: true };
      } else {
        const error = response.error || 'Failed to send email verification';
        console.error('❌ Failed to send email verification:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'Failed to send email verification';
      console.error('❌ Email verification error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  public async verifyEmail(token: string): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      console.log('📧 Verifying email...');

      const response: ApiResponse<User> = await apiService.auth.verifyEmail(token);

      if (response.success) {
        console.log('✅ Email verified successfully');
        
        // Update user state if user data is returned
        if (response.data && this.currentState.user) {
          this.setState({
            user: { ...this.currentState.user, ...response.data },
          });
        }

        return { success: true, user: response.data };
      } else {
        const error = response.error || 'Email verification failed';
        console.error('❌ Email verification failed:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'Email verification failed';
      console.error('❌ Email verification error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  public async checkAuthStatus(): Promise<void> {
    try {
      this.setState({ isLoading: true });
      const response: ApiResponse<User> = await apiService.auth.getCurrentUser();

      if (response.success && response.data) {
        // User is authenticated
        
        let mergedUser = response.data;
        
        // Only fetch profile data from user service for regular users, not contractors
        if (response.data.role === 'USER') {
          try {
            const profileResponse = await apiService.user.getProfile();
            
            if (profileResponse.success && profileResponse.data) {
              console.log('✅ Profile data fetched successfully');
              // Transform and merge profile data with auth user data, preserving critical auth fields
              const transformedProfile = this.transformProfileData(profileResponse.data);
              mergedUser = {
                ...transformedProfile, // Profile data first
                ...response.data, // Auth data overrides profile data
                // Explicitly preserve critical auth fields that should never be overridden
                id: response.data.id,
                email: response.data.email,
                role: response.data.role,
                status: response.data.status,
                email_verified: response.data.email_verified,
                phone_verified: response.data.phone_verified,
                sama_verified: response.data.sama_verified,
                created_at: response.data.created_at,
                updated_at: response.data.updated_at
              };
            } else {
              console.log('ℹ️ No profile data found, using auth data only');
            }
          } catch (profileError) {
            console.warn('⚠️ Failed to fetch profile data, continuing with auth data only:', profileError);
            // Continue with just auth data - profile fetch is optional
          }
        } else {
          console.log('ℹ️ Contractor user - skipping profile fetch from user service');
        }
        
        this.setState({
          isAuthenticated: true,
          user: mergedUser,
          isLoading: false,
          error: null,
        });
      } else {
        console.log('ℹ️ User is not authenticated');
        
        this.setState({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
        });
      }
    } catch (error: any) {
      console.error('❌ Authentication check failed:', error);
      
      this.setState({
        isAuthenticated: false,
        user: null,
        isLoading: false,
        error: null,
      });
    }
  }

  public async refreshSession(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('🔄 Refreshing session...');

      const response: ApiResponse = await apiService.auth.refreshSession();

      if (response.success) {
        console.log('✅ Session refreshed successfully');
        
        // Re-check authentication status to get updated user data
        await this.checkAuthStatus();
        
        return { success: true };
      } else {
        const error = response.error || 'Failed to refresh session';
        console.error('❌ Session refresh failed:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'Session refresh failed';
      console.error('❌ Session refresh error:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  private handleSessionExpired(): void {
    console.warn('🔒 Session expired detected');
    
    this.setState({
      isAuthenticated: false,
      user: null,
      isLoading: false,
      error: 'Your session has expired. Please log in again.',
    });
  }

  // Utility methods
  public isAuthenticated(): boolean {
    return this.currentState.isAuthenticated;
  }

  public getCurrentUser(): User | null {
    return this.currentState.user;
  }

  public async updateCurrentUser(userData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    company_name?: string;
    cr_number?: string;
    vat_number?: string;
    business_type?: string;
  }): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      this.setState({ isLoading: true, error: null });

      console.log('🔄 Updating current user...', userData);

      const updateResponse: ApiResponse = await apiService.auth.updateCurrentUser(userData);

      if (updateResponse.success) {
        console.log('✅ User updated successfully');
        
        // Refresh user data to get updated information
        const refreshResult = await this.refreshUserData();
        
        this.setState({ isLoading: false });
        
        return { 
          success: true, 
          user: refreshResult.user 
        };
      } else {
        const error = updateResponse.error || 'Failed to update user';
        console.error('❌ User update failed:', error);
        
        this.setState({
          isLoading: false,
          error,
        });

        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'Update failed';
      console.error('❌ User update error:', errorMessage);
      
      this.setState({
        isLoading: false,
        error: errorMessage,
      });

      return { success: false, error: errorMessage };
    }
  }

  public async refreshUserData(): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      console.log('🔄 Refreshing user data...');
      
      // Fetch updated user data from auth API
      const userResponse: ApiResponse<User> = await apiService.auth.getCurrentUser();
      
      if (userResponse.success && userResponse.data) {
        console.log('✅ Auth user data fetched successfully');
        
        let mergedUser = userResponse.data;
        
        // Only fetch profile data from user service for regular users, not contractors
        if (userResponse.data.role === 'USER') {
          try {
            const profileResponse = await apiService.user.getProfile();
            
            if (profileResponse.success && profileResponse.data) {
              console.log('✅ Profile data fetched successfully');
              // Transform and merge profile data with auth user data, preserving critical auth fields
              const transformedProfile = this.transformProfileData(profileResponse.data);
              mergedUser = {
                ...transformedProfile, // Profile data first
                ...userResponse.data, // Auth data overrides profile data
                // Explicitly preserve critical auth fields that should never be overridden
                id: userResponse.data.id,
                email: userResponse.data.email,
                role: userResponse.data.role,
                status: userResponse.data.status,
                email_verified: userResponse.data.email_verified,
                phone_verified: userResponse.data.phone_verified,
                sama_verified: userResponse.data.sama_verified,
                created_at: userResponse.data.created_at,
                updated_at: userResponse.data.updated_at
              };
            } else {
              console.log('ℹ️ No profile data found, using auth data only');
            }
          } catch (profileError) {
            console.warn('⚠️ Failed to fetch profile data during refresh, continuing with auth data only:', profileError);
            // Continue with just auth data - profile fetch is optional
          }
        } else {
          console.log('ℹ️ Contractor user - skipping profile fetch from user service');
        }
        
        // Update the state with merged user data
        this.setState({
          ...this.currentState,
          user: mergedUser,
        });

        return { success: true, user: mergedUser };
      } else {
        const error = 'Failed to refresh user data';
        console.error('❌ Failed to refresh user data:', error);
        return { success: false, error };
      }
    } catch (error: any) {
      const errorMessage = error.error || error.message || 'Failed to refresh user data';
      console.error('❌ Error refreshing user data:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  public isEmailVerified(): boolean {
    return this.currentState.user?.emailVerified ?? false;
  }

  public isPhoneVerified(): boolean {
    return this.currentState.user?.phoneVerified ?? false;
  }

  public isSamaVerified(): boolean {
    return this.currentState.user?.samaVerified ?? false;
  }

  public getUserRole(): string | null {
    return this.currentState.user?.role ?? null;
  }

  public clearError(): void {
    this.setState({ error: null });
  }

  /**
   * Update user data in the current auth state
   * This is useful when profile data is updated from other components
   */
  public updateUserData(updatedUser: Partial<User>): void {
    if (this.currentState.user) {
      const mergedUser = { ...this.currentState.user, ...updatedUser };
      console.log('🔄 Updating auth service user data:', mergedUser);
      
      this.setState({
        user: mergedUser,
      });
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
export default authService;