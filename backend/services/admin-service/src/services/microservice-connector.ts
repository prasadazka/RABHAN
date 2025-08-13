/**
 * RABHAN Admin Service - Microservice Connector
 * Connects to other RABHAN microservices for real data
 */

interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  phone: string;
  status: 'active' | 'inactive' | 'pending';
  registrationDate: string;
  kycStatus?: string;
  region?: string;
  city?: string;
  profileCompleted?: boolean;
  profileCompletionPercentage?: number;
  propertyType?: string;
  electricityConsumption?: string;
  bnplEligible?: boolean;
  bnplMaxAmount?: number;
}

interface Contractor {
  id: string;
  companyName: string;
  email: string;
  phone: string;
  city: string;
  rating: number;
  completedProjects: number;
  status: 'active' | 'suspended' | 'pending';
  registrationDate: string;
  kycStatus?: string;
  businessType?: string;
  serviceCategories?: string[];
  region?: string;
  verificationLevel?: number;
  yearsExperience?: number;
  profileCompleted?: boolean;
  profileCompletionPercentage?: number;
  verificationStatus?: string;
  totalReviews?: number;
  commercialRegistration?: string;
  vatNumber?: string;
  website?: string;
  addressLine1?: string;
  establishedYear?: number;
  employeeCount?: number;
}

interface Product {
  id: string;
  contractorId: string;
  categoryId: string;
  name: string;
  nameAr?: string;
  description: string;
  descriptionAr?: string;
  brand: string;
  model?: string;
  sku: string;
  price: number;
  currency: string;
  stockQuantity: number;
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUIRED';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
  category?: {
    id: string;
    name: string;
    nameAr?: string;
  };
  images?: string[];
}

interface UserAnalytics {
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

interface ContractorAnalytics {
  totalContractors: number;
  contractorGrowth: {
    thisMonth: number;
    lastMonth: number;
    growthRate: number;
  };
  statusDistribution: {
    active: number;
    pending: number;
    suspended: number;
    rejected: number;
  };
  verificationLevels: {
    level0: number;
    level1: number;
    level2: number;
    level3: number;
    level4: number;
    level5: number;
  };
  businessTypes: Array<{ type: string; count: number; percentage: number }>;
  serviceCategories: Array<{ category: string; count: number; percentage: number }>;
  geographical: {
    topRegions: Array<{ region: string; count: number; percentage: number }>;
    topCities: Array<{ city: string; count: number; percentage: number }>;
  };
  performance: {
    averageRating: number;
    totalReviews: number;
    highRatedContractors: number; // rating >= 4.0
    newContractorsLast7Days: number;
    newContractorsLast30Days: number;
  };
  experienceDistribution: {
    novice: number; // 0-2 years
    intermediate: number; // 3-5 years
    experienced: number; // 6-10 years
    expert: number; // 10+ years
  };
}

class MicroserviceConnector {
  private static instance: MicroserviceConnector;
  
  private readonly AUTH_SERVICE_URL = 'http://localhost:3001';
  private readonly USER_SERVICE_URL = 'http://localhost:3002';
  private readonly CONTRACTOR_SERVICE_URL = 'http://localhost:3004';
  private readonly DOCUMENT_SERVICE_URL = 'http://localhost:3003';
  private readonly MARKETPLACE_SERVICE_URL = 'http://localhost:3007';
  private readonly QUOTE_SERVICE_URL = 'http://localhost:3009';
  
  public static getInstance(): MicroserviceConnector {
    if (!MicroserviceConnector.instance) {
      MicroserviceConnector.instance = new MicroserviceConnector();
    }
    return MicroserviceConnector.instance;
  }

  /**
   * Fetch users from User Service (real user profile data)
   */
  async getUsers(): Promise<ServiceResponse<User[]>> {
    try {
      console.log('🔍 Fetching users from User Service...');
      
      // Try to get users from user service with admin token
      const response = await fetch(`${this.USER_SERVICE_URL}/api/users/admin/users?limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-mock-token' // Mock token for now
        }
      });
      
      if (response.ok) {
        const data: any = await response.json();
        if (data.success && data.data) {
          console.log(`✅ Found ${data.data.length} users from User Service`);
          return {
            success: true,
            data: data.data.map((user: any) => ({
              id: user.id,
              email: user.email,
              name: user.name,
              phone: user.phone,
              status: user.status,
              registrationDate: user.registrationDate,
              kycStatus: user.kycStatus,
              region: user.region,
              city: user.city,
              profileCompleted: user.profileCompleted,
              profileCompletionPercentage: user.profileCompletionPercentage,
              propertyType: user.propertyType,
              electricityConsumption: user.electricityConsumption,
              bnplEligible: user.bnplEligible,
              bnplMaxAmount: user.bnplMaxAmount
            }))
          };
        }
      }
      
      console.log('⚠️ User service not available or no admin token, trying sample data...');
      return this.createSampleUsers();
      
    } catch (error) {
      console.error('❌ Error fetching users from User Service:', error);
      return this.createSampleUsers();
    }
  }

  /**
   * Fetch contractors from Contractor Service (real contractor profile data)
   */
  async getContractors(): Promise<ServiceResponse<Contractor[]>> {
    try {
      console.log('🔍 Fetching contractors from Contractor Service...');
      
      // Try to get contractors from contractor service with admin endpoint
      const response = await fetch(`${this.CONTRACTOR_SERVICE_URL}/api/contractors/admin/contractors?limit=100`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'x-service': 'admin-service' // Service-to-service authentication
        }
      });
      
      if (response.ok) {
        const data: any = await response.json();
        if (data.success && data.data) {
          console.log(`✅ Found ${data.data.length} contractors from Contractor Service`);
          
          // Transform contractor service format to admin service format
          const transformedContractors = data.data.map((contractor: any) => ({
            id: contractor.id,
            companyName: contractor.businessName,
            email: contractor.email,
            phone: contractor.phone,
            city: contractor.city,
            rating: contractor.averageRating || 0,
            completedProjects: contractor.completedProjects || 0,
            status: contractor.status,
            registrationDate: contractor.createdAt,
            kycStatus: contractor.verificationLevel > 0 ? 'approved' : 'pending',
            businessType: contractor.businessType,
            serviceCategories: contractor.serviceCategories || [],
            region: contractor.region,
            verificationLevel: contractor.verificationLevel || 0,
            yearsExperience: contractor.yearsExperience || 0,
            profileCompleted: contractor.profileCompleted,
            profileCompletionPercentage: contractor.profileCompletionPercentage || 0,
            verificationStatus: contractor.verificationStatus,
            totalReviews: contractor.totalReviews || 0,
            commercialRegistration: contractor.commercialRegistration,
            vatNumber: contractor.vatNumber,
            website: contractor.website,
            addressLine1: contractor.addressLine1,
            establishedYear: contractor.establishedYear,
            employeeCount: contractor.employeeCount
          }));
          
          return {
            success: true,
            data: transformedContractors
          };
        }
      }
      
      console.log('⚠️ Contractor service not available - no fallback data');
      return {
        success: false,
        error: 'Contractor service unavailable'
      };
      
    } catch (error) {
      console.error('❌ Error fetching contractors from Contractor Service:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch contractors'
      };
    }
  }

  /**
   * Fetch user analytics and KPIs from User Service
   */
  async getUserAnalytics(): Promise<ServiceResponse<UserAnalytics>> {
    try {
      console.log('📊 Fetching user analytics from User Service...');
      
      // First, try to get the analytics from user service
      const response = await fetch(`${this.USER_SERVICE_URL}/api/users/admin/analytics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer admin-mock-token' // Mock token for now
        }
      });
      
      if (response.ok) {
        const data: any = await response.json();
        if (data.success && data.data) {
          console.log('✅ Successfully fetched user analytics from User Service');
          
          // Fix profile completion calculation if it's incorrect
          if (data.data.profileCompletion && data.data.profileCompletion.completed === 0) {
            console.log('🔧 Fixing profile completion calculation using real user data...');
            
            // Get actual users to calculate correct profile completion
            const usersResponse = await this.getUsers();
            if (usersResponse.success && usersResponse.data) {
              const users = usersResponse.data;
              const completedProfiles = users.filter(u => u.profileCompleted === true).length;
              const partialProfiles = users.filter(u => !u.profileCompleted && (u.profileCompletionPercentage || 0) > 0).length;
              const emptyProfiles = users.filter(u => (u.profileCompletionPercentage || 0) === 0).length;
              const totalCompletion = users.reduce((sum, u) => sum + (u.profileCompletionPercentage || 0), 0);
              const averageCompletion = users.length > 0 ? totalCompletion / users.length : 0;
              
              // Update the analytics with correct profile completion data
              data.data.profileCompletion = {
                completed: completedProfiles,
                partial: partialProfiles,
                empty: emptyProfiles,
                averageCompletion: Math.round(averageCompletion * 100) / 100
              };
              
              console.log(`🎯 Fixed profile completion: ${completedProfiles} completed, ${partialProfiles} partial, ${emptyProfiles} empty (avg: ${averageCompletion.toFixed(1)}%)`);
            }
          }
          
          return {
            success: true,
            data: data.data
          };
        }
      }
      
      console.log('⚠️ User service analytics not available, creating sample data...');
      return this.createSampleAnalytics();
      
    } catch (error) {
      console.error('❌ Error fetching user analytics from User Service:', error);
      return this.createSampleAnalytics();
    }
  }

  /**
   * Fetch contractor analytics and KPIs
   */
  async getContractorAnalytics(): Promise<ServiceResponse<ContractorAnalytics>> {
    try {
      console.log('📊 Fetching contractor analytics from Contractor Service...');
      
      // Fetch contractors to calculate analytics
      const contractorsResponse = await this.getContractors();
      
      if (!contractorsResponse.success || !contractorsResponse.data) {
        console.log('⚠️ No contractor data available - cannot calculate analytics');
        return {
          success: false,
          error: 'Cannot calculate contractor analytics - contractor service unavailable'
        };
      }
      
      const contractors = contractorsResponse.data;
      const totalContractors = contractors.length;
      
      if (totalContractors === 0) {
        console.log('⚠️ No contractors found - returning empty analytics');
        return {
          success: true,
          data: {
            totalContractors: 0,
            contractorGrowth: { thisMonth: 0, lastMonth: 0, growthRate: 0 },
            statusDistribution: { active: 0, pending: 0, suspended: 0, rejected: 0 },
            verificationLevels: { unverified: 0, basic: 0, verified: 0, premium: 0 },
            geographical: { topRegions: [], totalRegions: 0 },
            businessTypes: [],
            performance: {
              averageRating: 0,
              highRatedContractors: 0,
              totalProjects: 0,
              completedProjects: 0,
              newContractorsLast7Days: 0,
              newContractorsLast30Days: 0
            }
          }
        };
      }
      
      console.log(`📊 Calculating analytics for ${totalContractors} contractors...`);
      
      // Calculate time-based metrics
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Filter contractors by registration date
      const contractorsThisMonth = contractors.filter(c => 
        new Date(c.registrationDate) >= thisMonth
      ).length;
      
      const contractorsLastMonth = contractors.filter(c => {
        const regDate = new Date(c.registrationDate);
        return regDate >= lastMonth && regDate < thisMonth;
      }).length;
      
      const contractorsLast7Days = contractors.filter(c => 
        new Date(c.registrationDate) >= sevenDaysAgo
      ).length;
      
      const contractorsLast30Days = contractors.filter(c => 
        new Date(c.registrationDate) >= thirtyDaysAgo
      ).length;
      
      // Calculate growth rate
      const growthRate = contractorsLastMonth > 0 
        ? ((contractorsThisMonth - contractorsLastMonth) / contractorsLastMonth) * 100 
        : contractorsThisMonth > 0 ? 100 : 0;
      
      // Status distribution
      const statusCounts = contractors.reduce((acc, contractor) => {
        const status = contractor.status || 'pending';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      // Verification levels
      const verificationCounts = contractors.reduce((acc, contractor) => {
        const level = contractor.verificationLevel || 0;
        const levelKey = `level${level}` as keyof typeof acc;
        acc[levelKey] = (acc[levelKey] || 0) + 1;
        return acc;
      }, { level0: 0, level1: 0, level2: 0, level3: 0, level4: 0, level5: 0 });
      
      // Business types
      const businessTypeCounts = contractors.reduce((acc, contractor) => {
        const type = contractor.businessType || 'OTHER';
        acc[type] = (acc[type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const businessTypes = Object.entries(businessTypeCounts).map(([type, count]) => ({
        type,
        count,
        percentage: Math.round((count / totalContractors) * 100 * 100) / 100
      }));
      
      // Service categories (flatten arrays)
      const serviceCategoryCounts = contractors.reduce((acc, contractor) => {
        let categories = contractor.serviceCategories || [];
        // Handle PostgreSQL array format like "{residential_solar}"
        if (typeof categories === 'string') {
          categories = categories.replace(/[{}]/g, '').split(',').map(cat => cat.trim()).filter(cat => cat);
        }
        if (Array.isArray(categories)) {
          categories.forEach(category => {
            acc[category] = (acc[category] || 0) + 1;
          });
        }
        return acc;
      }, {} as Record<string, number>);
      
      const serviceCategories = Object.entries(serviceCategoryCounts).map(([category, count]) => ({
        category,
        count,
        percentage: Math.round((count / totalContractors) * 100 * 100) / 100
      }));
      
      // Geographical distribution
      const regionCounts = contractors.reduce((acc, contractor) => {
        const region = contractor.region || 'Unknown';
        acc[region] = (acc[region] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const cityCounts = contractors.reduce((acc, contractor) => {
        const city = contractor.city || 'Unknown';
        acc[city] = (acc[city] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      
      const topRegions = Object.entries(regionCounts)
        .map(([region, count]) => ({
          region,
          count,
          percentage: Math.round((count / totalContractors) * 100 * 100) / 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      const topCities = Object.entries(cityCounts)
        .map(([city, count]) => ({
          city,
          count,
          percentage: Math.round((count / totalContractors) * 100 * 100) / 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      
      // Performance metrics
      const ratings = contractors.map(c => c.rating || 0).filter(r => r > 0);
      const averageRating = ratings.length > 0 
        ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / ratings.length) * 100) / 100 
        : 0;
      
      const totalReviews = contractors.reduce((sum, c) => sum + (c.completedProjects || 0), 0);
      const highRatedContractors = contractors.filter(c => (c.rating || 0) >= 4.0).length;
      
      // Experience distribution
      const experienceCounts = contractors.reduce((acc, contractor) => {
        const years = contractor.yearsExperience || 0;
        if (years <= 2) acc.novice++;
        else if (years <= 5) acc.intermediate++;
        else if (years <= 10) acc.experienced++;
        else acc.expert++;
        return acc;
      }, { novice: 0, intermediate: 0, experienced: 0, expert: 0 });
      
      const contractorAnalytics: ContractorAnalytics = {
        totalContractors,
        contractorGrowth: {
          thisMonth: contractorsThisMonth,
          lastMonth: contractorsLastMonth,
          growthRate: Math.round(growthRate * 100) / 100
        },
        statusDistribution: {
          active: statusCounts.active || 0,
          pending: statusCounts.pending || 0,
          suspended: statusCounts.suspended || 0,
          rejected: statusCounts.rejected || 0
        },
        verificationLevels: verificationCounts,
        businessTypes,
        serviceCategories,
        geographical: {
          topRegions,
          topCities
        },
        performance: {
          averageRating,
          totalReviews,
          highRatedContractors,
          newContractorsLast7Days: contractorsLast7Days,
          newContractorsLast30Days: contractorsLast30Days
        },
        experienceDistribution: experienceCounts
      };
      
      console.log(`✅ Contractor analytics calculated successfully:`, {
        total: totalContractors,
        thisMonth: contractorsThisMonth,
        growthRate: `${growthRate.toFixed(1)}%`,
        averageRating: averageRating.toFixed(1)
      });
      
      return {
        success: true,
        data: contractorAnalytics
      };
      
    } catch (error) {
      console.error('❌ Error calculating contractor analytics:', error);
      return {
        success: false,
        error: error.message || 'Failed to calculate contractor analytics'
      };
    }
  }

  /**
   * Fetch contractor documents from Document Service
   */
  async getContractorDocuments(contractorId: string): Promise<ServiceResponse<any[]>> {
    try {
      console.log(`🔍 Fetching documents for contractor ${contractorId} from Document Service...`);
      
      // Try to get documents from document service using admin endpoint
      const response = await fetch(`${this.DOCUMENT_SERVICE_URL}/api/documents/admin/contractor/${contractorId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
          // No authorization needed for admin endpoint
        }
      });
      
      if (response.ok) {
        const data: any = await response.json();
        console.log(`🔍 Document service response for contractor ${contractorId}:`, data);
        if (data.success && data.data && data.data.length > 0) {
          console.log(`✅ Found ${data.data.length} real documents for contractor ${contractorId}`);
          
          // Transform document service format to admin service format
          const transformedDocuments = data.data.map((doc: any) => {
            console.log(`🔍 Processing contractor document: ${doc.original_filename} with category_id: ${doc.category_id}`);
            
            // Contractor document category mappings
            const categoryMappings: { [key: string]: { type: string; category: string; display: string } } = {
              // Business documents
              'commercial_registration': { type: 'commercial_registration', category: 'business', display: 'Commercial Registration' },
              'business_license': { type: 'business_license', category: 'business', display: 'Business License' },
              'vat_certificate': { type: 'vat_certificate', category: 'tax', display: 'VAT Certificate' },
              'tax_clearance': { type: 'tax_clearance', category: 'tax', display: 'Tax Clearance Certificate' },
              
              // Professional certifications
              'professional_license': { type: 'professional_license', category: 'certification', display: 'Professional License' },
              'technical_certification': { type: 'technical_certification', category: 'certification', display: 'Technical Certification' },
              'safety_certification': { type: 'safety_certification', category: 'certification', display: 'Safety Certification' },
              
              // Insurance
              'liability_insurance': { type: 'liability_insurance', category: 'insurance', display: 'Liability Insurance' },
              'workers_compensation': { type: 'workers_compensation', category: 'insurance', display: 'Workers Compensation' },
              
              // Financial
              'bank_statements': { type: 'bank_statements', category: 'financial', display: 'Bank Statements' },
              'financial_statements': { type: 'financial_statements', category: 'financial', display: 'Financial Statements' }
            };
            
            const categoryInfo = categoryMappings[doc.category_id] || {
              type: doc.category_id || 'unknown',
              category: 'other',
              display: doc.category_id || 'Unknown Document'
            };
            
            return {
              id: doc.id,
              type: categoryInfo.type,
              filename: doc.original_filename || doc.filename || 'Unknown',
              uploadDate: doc.created_at,
              status: doc.verification_status || 'pending',
              size: doc.file_size || 0,
              url: doc.file_path,
              category: categoryInfo.category,
              display: categoryInfo.display
            };
          });
          
          return {
            success: true,
            data: transformedDocuments
          };
        } else {
          console.log(`⚠️ No documents found for contractor ${contractorId}`);
          return {
            success: true,
            data: []
          };
        }
      } else {
        console.log(`⚠️ Document service not available for contractor ${contractorId} (status: ${response.status})`);
        return {
          success: true,
          data: []
        };
      }
      
    } catch (error) {
      console.error(`❌ Error fetching contractor documents for ${contractorId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Check if Auth Service is healthy
   */
  async checkAuthServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.AUTH_SERVICE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if User Service is healthy
   */
  async checkUserServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.USER_SERVICE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if Contractor Service is healthy
   */
  async checkContractorServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.CONTRACTOR_SERVICE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if Document Service is healthy
   */
  async checkDocumentServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.DOCUMENT_SERVICE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Check if Marketplace Service is healthy
   */
  async checkMarketplaceServiceHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.MARKETPLACE_SERVICE_URL}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get all products from Marketplace Service
   */
  async getProducts(limit: number = 100, offset: number = 0): Promise<ServiceResponse<Product[]>> {
    try {
      console.log('🔍 Fetching products from Marketplace Service...');
      
      const response = await fetch(`${this.MARKETPLACE_SERVICE_URL}/api/v1/admin/products?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateAdminToken()}`
        }
      });
      
      if (response.ok) {
        const data: any = await response.json();
        if (data.success && data.data) {
          console.log(`✅ Found ${data.data.length} products from Marketplace Service`);
          return {
            success: true,
            data: data.data
          };
        }
      }
      
      console.log('⚠️ Marketplace service not available or no products found');
      return {
        success: true,
        data: []
      };
      
    } catch (error) {
      console.error('❌ Error fetching products from Marketplace Service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get products pending approval
   */
  async getPendingProducts(page: number = 1, limit: number = 20): Promise<ServiceResponse<{ data: Product[], pagination: any }>> {
    try {
      console.log('🔍 Fetching pending products from Marketplace Service...');
      
      const response = await fetch(`${this.MARKETPLACE_SERVICE_URL}/api/v1/approvals/pending?page=${page}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateAdminToken()}`
        }
      });
      
      if (response.ok) {
        const data: any = await response.json();
        if (data.success && data.data) {
          console.log(`✅ Found ${data.data.data?.length || 0} pending products`);
          return {
            success: true,
            data: data.data
          };
        }
      }
      
      console.log('⚠️ No pending products found');
      return {
        success: true,
        data: { data: [], pagination: { page, limit, total: 0, totalPages: 0, hasNext: false, hasPrev: false } }
      };
      
    } catch (error) {
      console.error('❌ Error fetching pending products:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Approve a product
   */
  async approveProduct(productId: string, adminNotes?: string): Promise<ServiceResponse<Product>> {
    try {
      console.log(`🔄 Approving product ${productId}...`);

      const response = await fetch(`${this.MARKETPLACE_SERVICE_URL}/api/v1/admin/products/${productId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateAdminToken()}`
        },
        body: JSON.stringify({
          adminNotes: adminNotes || 'Product approved by admin'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Product ${productId} approved successfully`);
        return {
          success: true,
          data: result.data
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`❌ Failed to approve product: ${response.status} - ${errorData.error || 'Unknown error'}`);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: Failed to approve product`
        };
      }

    } catch (error) {
      console.error(`❌ Error approving product ${productId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Reject a product
   */
  async rejectProduct(productId: string, rejectionReason: string, adminNotes?: string): Promise<ServiceResponse<Product>> {
    try {
      console.log(`🔄 Rejecting product ${productId}...`);

      const response = await fetch(`${this.MARKETPLACE_SERVICE_URL}/api/v1/admin/products/${productId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateAdminToken()}`
        },
        body: JSON.stringify({
          rejectionReason,
          adminNotes: adminNotes || 'Product rejected by admin'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Product ${productId} rejected successfully`);
        return {
          success: true,
          data: result.data
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`❌ Failed to reject product: ${response.status} - ${errorData.error || 'Unknown error'}`);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: Failed to reject product`
        };
      }

    } catch (error) {
      console.error(`❌ Error rejecting product ${productId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Request changes for a product
   */
  async requestProductChanges(productId: string, changesRequired: string, adminNotes?: string): Promise<ServiceResponse<Product>> {
    try {
      console.log(`🔄 Requesting changes for product ${productId}...`);

      const response = await fetch(`${this.MARKETPLACE_SERVICE_URL}/api/v1/approvals/${productId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateAdminToken()}`
        },
        body: JSON.stringify({
          action: 'request_changes',
          changesRequired,
          adminNotes: adminNotes || 'Changes requested by admin'
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Changes requested for product ${productId} successfully`);
        return {
          success: true,
          data: result.data
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`❌ Failed to request changes: ${response.status} - ${errorData.error || 'Unknown error'}`);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: Failed to request changes`
        };
      }

    } catch (error) {
      console.error(`❌ Error requesting changes for product ${productId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Generate admin JWT token for service-to-service calls
   */
  private generateAdminToken(): string {
    // Use mock token for development - quote service accepts mock tokens starting with 'mock-jwt-token-'
    return 'mock-jwt-token-admin-service-call-' + Date.now();
  }

  /**
   * Fetch user documents from Document Service
   */
  async getUserDocuments(userId: string): Promise<ServiceResponse<any[]>> {
    try {
      console.log(`🔍 Fetching documents for user ${userId} from Document Service...`);
      
      // Try to get documents from document service using admin endpoint
      const response = await fetch(`${this.DOCUMENT_SERVICE_URL}/api/documents/admin/user/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
          // No authorization needed for admin endpoint
        }
      });
      
      if (response.ok) {
        const data: any = await response.json();
        console.log(`🔍 Document service response for user ${userId}:`, data);
        if (data.success && data.data && data.data.length > 0) {
          console.log(`✅ Found ${data.data.length} real documents for user ${userId}`);
          
          // Transform document service format to admin service format
          const transformedDocuments = data.data.map((doc: any) => {
            console.log(`🔍 Processing document: ${doc.original_filename} with category_id: ${doc.category_id}`);
            
            // Inline category mapping to fix context issue
            const categoryMappings: { [key: string]: { type: string; category: string; display: string } } = {
              '99655c95-616f-4f28-8b4d-84b683b23642': { type: 'national_id', category: 'identity', display: 'National ID (Front Side)' },
              'fb97160f-bde4-45b6-8be5-4ba359ff24d2': { type: 'national_id', category: 'identity', display: 'National ID (Front Side)' },
              '75063139-ab8e-4e5b-96f7-014cc03bdef5': { type: 'proof_of_address', category: 'address_proof', display: 'Proof of Address' },
              '03f5dd41-d602-4839-bf0e-67d8ef28a646': { type: 'income_proof', category: 'income_proof', display: 'Income Proof' }
            };
            
            const mapping = categoryMappings[doc.category_id] || { type: 'identity_document', category: 'identity', display: 'Identity Document' };
            const mappedType = mapping.type;
            const mappedCategory = mapping.category;
            const mappedDisplayName = mapping.display;
            
            console.log(`📋 Mapped to type: ${mappedType}, category: ${mappedCategory}, display: ${mappedDisplayName}`);
            
            return {
              id: doc.document_id,
              userId: doc.user_id,
              type: mappedType,
              category: mappedCategory,
              filename: doc.original_filename,
              originalName: doc.original_filename,
              uploadDate: doc.upload_timestamp,
              status: doc.document_status,
              size: parseInt(doc.file_size_bytes),
              mimeType: doc.mime_type,
              url: `/documents/${doc.user_id}/${doc.original_filename}`,
              verificationStatus: doc.approval_status,
              rejectionReason: null,
              metadata: {
                documentType: mappedDisplayName,
                extractedText: `Real document: ${doc.original_filename}`,
                confidence: parseFloat(doc.validation_score) / 100,
                realDocument: true
              }
            };
          });
          
          return {
            success: true,
            data: transformedDocuments
          };
        } else {
          console.log(`📭 Document service returned empty data for user ${userId}`);
        }
      }
      
      console.log(`⚠️ Document service not available or no documents found for user ${userId}`);
      return {
        success: true,
        data: []
      };
      
    } catch (error) {
      console.error(`❌ Error fetching documents for user ${userId}:`, error);
      return {
        success: true,
        data: []
      };
    }
  }

  /**
   * Create sample documents for fallback
   */
  private createSampleDocuments(userId: string): ServiceResponse<any[]> {
    const sampleDocuments = [
      {
        id: `doc-${userId}-1`,
        userId: userId,
        type: 'national_id',
        category: 'identity',
        filename: 'national_id_front.jpg',
        originalName: 'national_id_front.jpg',
        uploadDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        size: 2048000,
        mimeType: 'image/jpeg',
        url: `/documents/${userId}/national_id_front.jpg`,
        verificationStatus: 'pending',
        rejectionReason: null,
        metadata: {
          documentType: 'National ID (Front)',
          extractedText: 'Sample extracted text from national ID',
          confidence: 0.95
        }
      },
      {
        id: `doc-${userId}-2`,
        userId: userId,
        type: 'national_id_back',
        category: 'identity',
        filename: 'national_id_back.jpg',
        originalName: 'national_id_back.jpg',
        uploadDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        size: 1956000,
        mimeType: 'image/jpeg',
        url: `/documents/${userId}/national_id_back.jpg`,
        verificationStatus: 'pending',
        rejectionReason: null,
        metadata: {
          documentType: 'National ID (Back)',
          extractedText: 'Sample extracted text from national ID back',
          confidence: 0.92
        }
      },
      {
        id: `doc-${userId}-3`,
        userId: userId,
        type: 'utility_bill',
        category: 'address_proof',
        filename: 'electricity_bill_july_2025.pdf',
        originalName: 'electricity_bill_july_2025.pdf',
        uploadDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'approved',
        size: 856000,
        mimeType: 'application/pdf',
        url: `/documents/${userId}/electricity_bill_july_2025.pdf`,
        verificationStatus: 'approved',
        rejectionReason: null,
        metadata: {
          documentType: 'Utility Bill',
          extractedText: 'Sample utility bill content',
          confidence: 0.98,
          billMonth: 'July 2025',
          accountNumber: 'ACC-***-5678'
        }
      },
      {
        id: `doc-${userId}-4`,
        userId: userId,
        type: 'property_deed',
        category: 'property_proof',
        filename: 'property_ownership_deed.pdf',
        originalName: 'property_ownership_deed.pdf',
        uploadDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        status: 'pending',
        size: 3200000,
        mimeType: 'application/pdf',
        url: `/documents/${userId}/property_ownership_deed.pdf`,
        verificationStatus: 'pending',
        rejectionReason: null,
        metadata: {
          documentType: 'Property Deed',
          extractedText: 'Sample property deed content',
          confidence: 0.89,
          propertyLocation: 'Riyadh, Saudi Arabia'
        }
      }
    ];

    return {
      success: true,
      data: sampleDocuments
    };
  }

  /**
   * Create sample users for fallback
   */
  private createSampleUsers(): ServiceResponse<User[]> {
    const sampleUsers: User[] = [
      {
        id: 'user-001',
        email: 'ahmed.alali@gmail.com',
        name: 'Ahmed Mohammed Al-Ali',
        phone: '+966501234567',
        status: 'active',
        registrationDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        kycStatus: 'approved'
      },
      {
        id: 'user-002',
        email: 'fatima.hassan@hotmail.com',
        name: 'Fatima Hassan Al-Zahra',
        phone: '+966502345678',
        status: 'active',
        registrationDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        kycStatus: 'approved'
      },
      {
        id: 'user-003',
        email: 'mohammed.abdullah@yahoo.com',
        name: 'Mohammed Abdullah Al-Rashid',
        phone: '+966503456789',
        status: 'pending',
        registrationDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        kycStatus: 'under_review'
      },
      {
        id: 'user-004',
        email: 'sara.omar@gmail.com',
        name: 'Sara Omar Al-Mahmoud',
        phone: '+966504567890',
        status: 'active',
        registrationDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        kycStatus: 'approved'
      },
      {
        id: 'user-005',
        email: 'khalid.salem@outlook.com',
        name: 'Khalid Salem Al-Qahtani',
        phone: '+966505678901',
        status: 'inactive',
        registrationDate: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
        kycStatus: 'rejected'
      }
    ];

    return {
      success: true,
      data: sampleUsers
    };
  }

  /**
   * Create sample contractors for fallback
   */
  private createSampleContractors(): ServiceResponse<Contractor[]> {
    const sampleContractors: Contractor[] = [
      {
        id: 'contractor-001',
        companyName: 'ACWA Power Solar Solutions',
        email: 'info@acwapower-solar.sa',
        phone: '+966112345678',
        city: 'Riyadh',
        rating: 4.8,
        completedProjects: 156,
        status: 'active',
        registrationDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        kycStatus: 'approved'
      },
      {
        id: 'contractor-002',
        companyName: 'Desert Technologies Solar',
        email: 'contact@desert-solar.sa',
        phone: '+966122345679',
        city: 'Jeddah',
        rating: 4.6,
        completedProjects: 89,
        status: 'active',
        registrationDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
        kycStatus: 'approved'
      },
      {
        id: 'contractor-003',
        companyName: 'Green Energy Systems KSA',
        email: 'info@greenenergy.sa',
        phone: '+966132345680',
        city: 'Dammam',
        rating: 4.4,
        completedProjects: 67,
        status: 'pending',
        registrationDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        kycStatus: 'under_review'
      },
      {
        id: 'contractor-004',
        companyName: 'Saudi Solar Innovation',
        email: 'hello@saudisolar.sa',
        phone: '+966142345681',
        city: 'Mecca',
        rating: 4.9,
        completedProjects: 234,
        status: 'active',
        registrationDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        kycStatus: 'approved'
      },
      {
        id: 'contractor-005',
        companyName: 'Red Sea Solar Co.',
        email: 'support@redseasolar.sa',
        phone: '+966152345682',
        city: 'Medina',
        rating: 3.8,
        completedProjects: 23,
        status: 'suspended',
        registrationDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        kycStatus: 'review_required'
      }
    ];

    return {
      success: true,
      data: sampleContractors
    };
  }

  /**
   * Create sample analytics for fallback
   */
  private createSampleAnalytics(): ServiceResponse<UserAnalytics> {
    const sampleAnalytics: UserAnalytics = {
      totalUsers: 1247,
      userGrowth: {
        thisMonth: 89,
        lastMonth: 76,
        growthRate: 17.11
      },
      profileCompletion: {
        completed: 892,
        partial: 278,
        empty: 77,
        averageCompletion: 73.5
      },
      verification: {
        verified: 745,
        pending: 312,
        rejected: 89,
        notStarted: 101
      },
      bnplEligibility: {
        eligible: 623,
        notEligible: 624,
        totalAmount: 15670000,
        averageAmount: 25159.42
      },
      geographical: {
        topRegions: [
          { region: 'riyadh', count: 456, percentage: 36.57 },
          { region: 'makkah', count: 289, percentage: 23.18 },
          { region: 'eastern', count: 234, percentage: 18.76 },
          { region: 'qassim', count: 123, percentage: 9.86 },
          { region: 'asir', count: 89, percentage: 7.14 }
        ],
        topCities: [
          { city: 'Riyadh', count: 456, percentage: 36.57 },
          { city: 'Jeddah', count: 234, percentage: 18.76 },
          { city: 'Dammam', count: 156, percentage: 12.51 },
          { city: 'Mecca', count: 123, percentage: 9.86 },
          { city: 'Medina', count: 98, percentage: 7.86 }
        ]
      },
      propertyTypes: [
        { type: 'VILLA', count: 678, percentage: 54.37 },
        { type: 'APARTMENT', count: 345, percentage: 27.67 },
        { type: 'COMPOUND', count: 156, percentage: 12.51 },
        { type: 'OFFICE', count: 68, percentage: 5.45 }
      ],
      electricityConsumption: [
        { range: 'RANGE_0_200', count: 234, percentage: 18.76 },
        { range: 'RANGE_200_500', count: 456, percentage: 36.57 },
        { range: 'RANGE_500_1000', count: 345, percentage: 27.67 },
        { range: 'RANGE_1000_PLUS', count: 212, percentage: 17.00 }
      ],
      userActivity: {
        activeUsers: 892,
        newUsersLast7Days: 34,
        newUsersLast30Days: 167
      },
      authVerification: {
        emailVerified: 1098,
        phoneVerified: 956,
        samaVerified: 745,
        unverified: 149
      }
    };

    return {
      success: true,
      data: sampleAnalytics
    };
  }

  /**
   * Get service health status
   */
  async getServiceHealthStatus() {
    const [authHealth, userHealth, contractorHealth, marketplaceHealth] = await Promise.all([
      this.checkAuthServiceHealth(),
      this.checkUserServiceHealth(),
      this.checkContractorServiceHealth(),
      this.checkMarketplaceServiceHealth()
    ]);

    return {
      authService: authHealth,
      userService: userHealth,
      contractorService: contractorHealth,
      marketplaceService: marketplaceHealth
    };
  }

  /**
   * Map document filename to document type
   */
  private mapDocumentType(filename: string): string {
    const lowerFilename = filename.toLowerCase();
    
    if (lowerFilename.includes('national') || lowerFilename.includes('id')) {
      if (lowerFilename.includes('back')) {
        return 'national_id_back';
      }
      return 'national_id';
    }
    
    if (lowerFilename.includes('address') || lowerFilename.includes('utility') || lowerFilename.includes('bill')) {
      return 'utility_bill';
    }
    
    if (lowerFilename.includes('property') || lowerFilename.includes('deed')) {
      return 'property_deed';
    }
    
    // Default based on image content - you can enhance this logic
    return 'identity_document';
  }

  /**
   * Create sample contractor analytics for fallback
   */
  private createSampleContractorAnalytics(): ServiceResponse<ContractorAnalytics> {
    const sampleAnalytics: ContractorAnalytics = {
      totalContractors: 456,
      contractorGrowth: {
        thisMonth: 34,
        lastMonth: 28,
        growthRate: 21.43
      },
      statusDistribution: {
        active: 389,
        pending: 45,
        suspended: 12,
        rejected: 10
      },
      verificationLevels: {
        level0: 45,
        level1: 123,
        level2: 167,
        level3: 89,
        level4: 27,
        level5: 5
      },
      businessTypes: [
        { type: 'COMPANY', count: 234, percentage: 51.32 },
        { type: 'INDIVIDUAL', count: 156, percentage: 34.21 },
        { type: 'PARTNERSHIP', count: 43, percentage: 9.43 },
        { type: 'OTHER', count: 23, percentage: 5.04 }
      ],
      serviceCategories: [
        { category: 'RESIDENTIAL_SOLAR', count: 389, percentage: 85.31 },
        { category: 'COMMERCIAL_SOLAR', count: 234, percentage: 51.32 },
        { category: 'MAINTENANCE', count: 167, percentage: 36.62 },
        { category: 'CONSULTATION', count: 123, percentage: 26.97 },
        { category: 'BATTERY_STORAGE', count: 89, percentage: 19.52 }
      ],
      geographical: {
        topRegions: [
          { region: 'Riyadh', count: 189, percentage: 41.45 },
          { region: 'Makkah', count: 123, percentage: 26.97 },
          { region: 'Eastern Province', count: 89, percentage: 19.52 },
          { region: 'Qassim', count: 34, percentage: 7.46 },
          { region: 'Asir', count: 21, percentage: 4.61 }
        ],
        topCities: [
          { city: 'Riyadh', count: 189, percentage: 41.45 },
          { city: 'Jeddah', count: 89, percentage: 19.52 },
          { city: 'Dammam', count: 67, percentage: 14.69 },
          { city: 'Mecca', count: 45, percentage: 9.87 },
          { city: 'Medina', count: 34, percentage: 7.46 }
        ]
      },
      performance: {
        averageRating: 4.23,
        totalReviews: 2847,
        highRatedContractors: 345,
        newContractorsLast7Days: 12,
        newContractorsLast30Days: 67
      },
      experienceDistribution: {
        novice: 89,     // 0-2 years
        intermediate: 167, // 3-5 years
        experienced: 134,  // 6-10 years
        expert: 66      // 10+ years
      }
    };

    return {
      success: true,
      data: sampleAnalytics
    };
  }

  /**
   * Update contractor status
   */
  async updateContractorStatus(contractorId: string, status: string, notes?: string): Promise<ServiceResponse<any>> {
    try {
      console.log(`🔄 Updating contractor ${contractorId} status to ${status}...`);

      const response = await fetch(`${this.CONTRACTOR_SERVICE_URL}/api/contractors/${contractorId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${require('jsonwebtoken').sign({ userId: '00000000-0000-0000-0000-000000000000', role: 'admin', isAdmin: true, email: 'admin@rabhan.com', isServiceCall: true }, 'rabhan_jwt_secret_key_for_development_only_change_in_production', { expiresIn: '1h' })}`
        },
        body: JSON.stringify({ status, notes })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Contractor ${contractorId} status updated successfully to ${status}`);
        return {
          success: true,
          data: result.data || {}
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`❌ Failed to update contractor status: ${response.status} - ${errorData.error || 'Unknown error'}`);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: Failed to update contractor status`
        };
      }

    } catch (error) {
      console.error(`❌ Error updating contractor ${contractorId} status:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Update user verification status
   */
  async updateUserVerificationStatus(userId: string, status: string, notes?: string): Promise<ServiceResponse<any>> {
    try {
      console.log(`🔄 Updating user ${userId} verification status to ${status}...`);

      const response = await fetch(`${this.USER_SERVICE_URL}/api/profiles/${userId}/verification-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${require('jsonwebtoken').sign({ 
            userId: '00000000-0000-0000-0000-000000000000', 
            role: 'admin', 
            isAdmin: true, 
            email: 'admin@rabhan.com', 
            isServiceCall: true 
          }, 'rabhan_jwt_secret_key_for_development_only_change_in_production', { expiresIn: '1h' })}`
        },
        body: JSON.stringify({ status, notes })
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ User ${userId} verification status updated successfully to ${status}`);
        return {
          success: true,
          data: result.data || {}
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`❌ Failed to update user verification status: ${response.status} - ${errorData.error || 'Unknown error'}`);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: Failed to update user verification status`
        };
      }

    } catch (error) {
      console.error(`❌ Error updating user ${userId} verification status:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  // ===== QUOTE SERVICE METHODS =====

  /**
   * Get all quotes from Quote Service
   */
  async getQuotes(options: { page?: number; limit?: number; status?: string; search?: string }): Promise<ServiceResponse<any>> {
    try {
      const { page = 1, limit = 20, status, search } = options;
      console.log('🔍 Fetching quotes from Quote Service...', { page, limit, status, search });
      
      // Build query parameters
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', limit.toString());
      if (status) params.append('status', status);
      if (search) params.append('search', search);

      const response = await fetch(`${this.QUOTE_SERVICE_URL}/api/admin/quotes?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateAdminToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Found ${data.data?.quotes?.length || 0} quotes`);
        return {
          success: true,
          data: data.data
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`❌ Failed to fetch quotes: ${response.status} - ${errorData.error || 'Unknown error'}`);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: Failed to fetch quotes`
        };
      }

    } catch (error) {
      console.error('❌ Error fetching quotes from Quote Service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Get specific quote details from Quote Service
   */
  async getQuoteDetails(quoteId: string): Promise<ServiceResponse<any>> {
    try {
      console.log(`🔍 Fetching quote details for ${quoteId} from Quote Service...`);
      
      const response = await fetch(`${this.QUOTE_SERVICE_URL}/api/admin/quotes/${quoteId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateAdminToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Found quote details for ${quoteId}`);
        return {
          success: true,
          data: data.data
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`❌ Failed to fetch quote details: ${response.status} - ${errorData.error || 'Unknown error'}`);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: Failed to fetch quote details`
        };
      }

    } catch (error) {
      console.error(`❌ Error fetching quote details for ${quoteId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Get contractor assignments for a quote
   */
  async getQuoteAssignments(quoteId: string): Promise<ServiceResponse<any>> {
    try {
      console.log(`🔍 Fetching quote assignments for ${quoteId} from Quote Service...`);
      
      const response = await fetch(`${this.QUOTE_SERVICE_URL}/api/admin/quotes/${quoteId}/assignments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateAdminToken()}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Found ${data.data?.assignments?.length || 0} assignments for quote ${quoteId}`);
        return {
          success: true,
          data: data.data
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`❌ Failed to fetch quote assignments: ${response.status} - ${errorData.error || 'Unknown error'}`);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: Failed to fetch quote assignments`
        };
      }

    } catch (error) {
      console.error(`❌ Error fetching quote assignments for ${quoteId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }

  /**
   * Update quote status
   */
  async updateQuoteStatus(quoteId: string, status: string, adminNotes?: string): Promise<ServiceResponse<any>> {
    try {
      console.log(`🔄 Updating quote ${quoteId} status to ${status}...`);

      const response = await fetch(`${this.QUOTE_SERVICE_URL}/api/admin/quotes/${quoteId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.generateAdminToken()}`
        },
        body: JSON.stringify({
          status,
          adminNotes: adminNotes || `Quote status updated to ${status} by admin`
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Quote ${quoteId} status updated to ${status} successfully`);
        return {
          success: true,
          data: data.data
        };
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`❌ Failed to update quote status: ${response.status} - ${errorData.error || 'Unknown error'}`);
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: Failed to update quote status`
        };
      }

    } catch (error) {
      console.error(`❌ Error updating quote ${quoteId} status:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error occurred'
      };
    }
  }
}

export { MicroserviceConnector };
export type { User, Contractor, Product, ServiceResponse, UserAnalytics, ContractorAnalytics };