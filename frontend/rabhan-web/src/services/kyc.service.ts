import axios, { AxiosResponse } from 'axios';

// Get API base URL from environment config
const API_BASE_URL = 'http://localhost';

export interface KYCRequirement {
  categoryId: string;
  categoryName: string;
  required: boolean;
  uploaded: boolean;
  approved: boolean;
  documentId?: string;
}

export interface KYCStatus {
  userId: string;
  userRole: 'customer' | 'contractor';
  status: 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected' | 'requires_revision';
  completionPercentage: number;
  requirements: KYCRequirement[];
  lastUpdated: Date;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
}

export interface KYCSubmissionResponse {
  success: boolean;
  message: string;
}

export interface PendingReview {
  user_id: string;
  total_documents: number;
  pending_documents: number;
  last_upload: string;
  user_role: string;
}

class KYCService {
  private baseURL: string;
  private authToken: string | null = null;

  constructor() {
    this.baseURL = `${API_BASE_URL}:3003/api/kyc`;
  }

  // Set authentication token
  setAuthToken(token: string) {
    this.authToken = token;
  }

  // Get user ID from token or use default for development
  private getUserIdFromToken(): string | null {
    if (!this.authToken) {
      return '1f475729-c2e0-4b3d-a678-e4a4ea4d6cc0';
    }
    
    try {
      const base64Url = this.authToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const payload = JSON.parse(jsonPayload);
      return payload.userId || '1f475729-c2e0-4b3d-a678-e4a4ea4d6cc0';
    } catch (error) {
      console.error('Failed to decode token:', error);
      return '1f475729-c2e0-4b3d-a678-e4a4ea4d6cc0';
    }
  }

  // Get authorization headers
  private getAuthHeaders() {
    return {
      'Authorization': `Bearer ${this.authToken || 'test-token'}`,
      'Content-Type': 'application/json',
    };
  }

  // Get KYC status for user
  async getKYCStatus(userRole: 'customer' | 'contractor' = 'customer'): Promise<KYCStatus> {
    try {
      const userId = this.getUserIdFromToken();
      const params = new URLSearchParams();
      
      if (userId) {
        params.append('userId', userId);
      }
      params.append('userRole', userRole);

      const response: AxiosResponse<{ success: boolean; kyc_status: KYCStatus }> = await axios.get(
        `${this.baseURL}/status?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      );

      return response.data.kyc_status;
    } catch (error: any) {
      console.error('Failed to fetch KYC status:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch KYC status');
    }
  }

  // Get KYC requirements for role
  async getKYCRequirements(userRole: 'customer' | 'contractor' = 'customer'): Promise<KYCRequirement[]> {
    try {
      const params = new URLSearchParams();
      params.append('userRole', userRole);

      const response: AxiosResponse<{ success: boolean; requirements: KYCRequirement[] }> = await axios.get(
        `${this.baseURL}/requirements?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      );

      return response.data.requirements;
    } catch (error: any) {
      console.error('Failed to fetch KYC requirements:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch KYC requirements');
    }
  }

  // Submit KYC for review
  async submitKYCForReview(userRole: 'customer' | 'contractor' = 'customer'): Promise<KYCSubmissionResponse> {
    try {
      const userId = this.getUserIdFromToken();
      
      const response: AxiosResponse<KYCSubmissionResponse> = await axios.post(
        `${this.baseURL}/submit`,
        { userId, userRole },
        { headers: this.getAuthHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to submit KYC for review:', error);
      throw new Error(error.response?.data?.error || 'Failed to submit KYC for review');
    }
  }

  // Admin: Get pending KYC reviews
  async getPendingReviews(userRole?: 'customer' | 'contractor'): Promise<PendingReview[]> {
    try {
      const params = new URLSearchParams();
      if (userRole) {
        params.append('userRole', userRole);
      }

      const response: AxiosResponse<{ success: boolean; pending_reviews: PendingReview[]; total_count: number }> = await axios.get(
        `${this.baseURL}/admin/pending?${params.toString()}`,
        { headers: this.getAuthHeaders() }
      );

      return response.data.pending_reviews;
    } catch (error: any) {
      console.error('Failed to fetch pending reviews:', error);
      throw new Error(error.response?.data?.error || 'Failed to fetch pending reviews');
    }
  }

  // Admin: Approve KYC
  async approveKYC(userId: string, userRole: 'customer' | 'contractor', notes?: string): Promise<KYCSubmissionResponse> {
    try {
      const response: AxiosResponse<KYCSubmissionResponse> = await axios.post(
        `${this.baseURL}/admin/approve`,
        { userId, userRole, notes },
        { headers: this.getAuthHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to approve KYC:', error);
      throw new Error(error.response?.data?.error || 'Failed to approve KYC');
    }
  }

  // Admin: Reject KYC
  async rejectKYC(userId: string, userRole: 'customer' | 'contractor', reason: string): Promise<KYCSubmissionResponse> {
    try {
      const response: AxiosResponse<KYCSubmissionResponse> = await axios.post(
        `${this.baseURL}/admin/reject`,
        { userId, userRole, reason },
        { headers: this.getAuthHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to reject KYC:', error);
      throw new Error(error.response?.data?.error || 'Failed to reject KYC');
    }
  }

  // Get service health status
  async getHealthStatus(): Promise<any> {
    try {
      const response: AxiosResponse<any> = await axios.get(
        `${this.baseURL}/health`,
        { headers: this.getAuthHeaders() }
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to get KYC health status:', error);
      throw new Error(error.response?.data?.error || 'Failed to get health status');
    }
  }

  // Helper method to get status color
  static getStatusColor(status: string): string {
    const colors = {
      'not_started': '#6b7280',
      'in_progress': '#3b82f6',
      'pending_review': '#f59e0b',
      'approved': '#10b981',
      'rejected': '#ef4444',
      'requires_revision': '#8b5cf6'
    };
    
    return colors[status as keyof typeof colors] || '#6b7280';
  }

  // Helper method to get user-friendly status text
  static getStatusText(status: string, language: string = 'en'): string {
    const statusTexts = {
      en: {
        'not_started': 'Not Started',
        'in_progress': 'In Progress',
        'pending_review': 'Pending Review',
        'approved': 'Approved',
        'rejected': 'Rejected',
        'requires_revision': 'Requires Revision'
      },
      ar: {
        'not_started': 'لم يبدأ',
        'in_progress': 'قيد التقدم',
        'pending_review': 'قيد المراجعة',
        'approved': 'موافق عليه',
        'rejected': 'مرفوض',
        'requires_revision': 'يتطلب مراجعة'
      }
    };
    
    return statusTexts[language as keyof typeof statusTexts]?.[status as keyof typeof statusTexts.en] || status;
  }
}

// Export singleton instance and class
export const kycService = new KYCService();
export { KYCService };
export default KYCService;