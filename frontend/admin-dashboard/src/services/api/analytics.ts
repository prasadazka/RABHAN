import { apiCall } from './auth';

export interface UserAnalytics {
  totalUsers: number;
  userGrowth: {
    thisMonth: number;
    lastMonth: number;
    growthRate: number;
  };
  profileCompletion: {
    completed: number;
    partial: number;
    empty: number;
    averageCompletion: number;
  };
  verification: {
    verified: number;
    pending: number;
    rejected: number;
    notStarted: number;
  };
  bnplEligibility: {
    eligible: number;
    notEligible: number;
    totalAmount: number;
    averageAmount: number;
  };
  geographical: {
    topRegions: Array<{ region: string; count: number; percentage: number }>;
    topCities: Array<{ city: string; count: number; percentage: number }>;
  };
  propertyTypes: Array<{ type: string; count: number; percentage: number }>;
  electricityConsumption: Array<{ range: string; count: number; percentage: number }>;
  userActivity: {
    activeUsers: number;
    newUsersLast7Days: number;
    newUsersLast30Days: number;
  };
  authVerification: {
    emailVerified: number;
    phoneVerified: number;
    samaVerified: number;  
    unverified: number;
  };
}

export interface DashboardOverview {
  users: {
    total: number;
    active: number;
    pending: number;
    recent: number;
  };
  contractors: {
    total: number;
    active: number;
    pending: number;
    recent: number;
  };
  summary: {
    totalPlatformUsers: number;
    activeEntities: number;
    pendingApprovals: number;
    recentRegistrations: number;
  };
}

class AnalyticsService {
  private baseUrl = 'http://localhost:3006/api/dashboard';

  async getUserAnalytics(): Promise<UserAnalytics> {
    const response = await apiCall(`${this.baseUrl}/user-analytics`);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في جلب تحليلات المستخدمين');
  }

  async getDashboardOverview(): Promise<DashboardOverview> {
    const response = await apiCall(`${this.baseUrl}/overview`);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في جلب نظرة عامة على لوحة التحكم');
  }

  async getServiceHealth(): Promise<any> {
    const response = await apiCall(`${this.baseUrl}/service-health`);
    if (response.success) {
      return response.data;
    }
    throw new Error(response.message || 'فشل في فحص حالة الخدمات');
  }
}

export const analyticsService = new AnalyticsService();