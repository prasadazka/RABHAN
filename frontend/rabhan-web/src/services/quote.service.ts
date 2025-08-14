import axios, { AxiosInstance } from 'axios';
import { config } from '../config/environment';
import { apiService, ApiResponse } from './api.service';

export interface QuoteRequest {
  user_id?: string; // Will be set by backend from session
  system_size_kwp: number;
  location_address: string;
  service_area: string;
  preferred_installation_date?: string; // Made optional for backward compatibility
  contact_phone: string;
  notes?: string;
  property_details?: {
    property_type: string;
    roof_type: string;
    roof_orientation: string;
    shading_issues: boolean;
  };
  selected_contractors?: string[]; // Array of contractor IDs
  inspection_schedules?: { [contractorId: string]: Date }; // Inspection schedules by contractor ID
}

export interface ContractorQuote {
  id?: string;
  request_id: string;
  contractor_id?: string; // Will be set by backend from session
  base_price: number;
  price_per_kwp: number;
  system_specs: {
    panels: string;
    inverter: string;
    mounting: string;
    monitoring?: string;
    additional_equipment?: string[];
  };
  installation_timeline_days: number;
  warranty_terms: string;
  compliance_certifications: string[];
  additional_services?: string[];
  notes?: string;
}

export interface QuoteComparison {
  request_id: string;
  quotes: ContractorQuoteWithDetails[];
  financial_summary: {
    best_price: number;
    average_price: number;
    price_range: {
      min: number;
      max: number;
    };
  };
}

export interface ContractorQuoteWithDetails extends ContractorQuote {
  id: string;
  contractor_info: {
    company_name: string;
    rating: number;
    completed_projects: number;
    certifications: string[];
  };
  financial_details: {
    user_display_price: number;
    user_monthly_payment?: number;
    total_project_cost: number;
    savings_estimate: number;
  };
  status: string;
  created_at: string;
  admin_status: 'pending' | 'approved' | 'rejected';
}

export interface QuoteFinancialCalculation {
  base_calculation: {
    base_price: number;
    price_per_kwp: number;
    system_size_kwp: number;
    subtotal: number;
  };
  rabhan_pricing: {
    platform_markup_percentage: number;
    platform_markup_amount: number;
    user_display_price: number;
    contractor_net_amount: number;
    rabhan_commission_amount: number;
  };
  bnpl_options?: {
    monthly_payment: number;
    total_installments: number;
    interest_rate: number;
    total_amount: number;
  };
}

class QuoteService {
  private quoteClient: AxiosInstance;

  constructor() {
    // Use the properly managed quote client from apiService
    this.quoteClient = apiService.getQuoteServiceInstance();
  }


  // Quote Request Methods
  public async submitQuoteRequest(requestData: QuoteRequest): Promise<ApiResponse> {
    const response = await this.quoteClient.post('/request', requestData);
    return response.data;
  }

  public async getQuoteRequests(params?: {
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    const response = await this.quoteClient.get('/my-requests', { params });
    return response.data;
  }

  public async getQuotesForRequest(requestId: string): Promise<ApiResponse> {
    const response = await this.quoteClient.get(`/request/${requestId}/quotes`);
    return response.data;
  }

  public async getQuoteRequest(requestId: string): Promise<ApiResponse> {
    const response = await this.quoteClient.get(`/api/quotes/requests/${requestId}`);
    return response.data;
  }

  public async updateQuoteRequest(requestId: string, updates: Partial<QuoteRequest>): Promise<ApiResponse> {
    const response = await this.quoteClient.put(`/api/quotes/requests/${requestId}`, updates);
    return response.data;
  }

  // Contractor Quote Methods
  public async submitContractorQuote(quoteData: ContractorQuote): Promise<ApiResponse> {
    const response = await this.quoteClient.post('/api/quotes/contractor-quotes', quoteData);
    return response.data;
  }

  public async getContractorQuotes(params?: {
    request_id?: string;
    contractor_id?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse> {
    const response = await this.quoteClient.get('/api/quotes/contractor-quotes', { params });
    return response.data;
  }

  public async getContractorQuote(quoteId: string): Promise<ApiResponse> {
    const response = await this.quoteClient.get(`/api/quotes/contractor-quotes/${quoteId}`);
    return response.data;
  }

  public async updateContractorQuote(quoteId: string, updates: Partial<ContractorQuote>): Promise<ApiResponse> {
    const response = await this.quoteClient.put(`/api/quotes/contractor-quotes/${quoteId}`, updates);
    return response.data;
  }

  // Quote Comparison Methods
  public async getQuoteComparison(requestId: string): Promise<ApiResponse<QuoteComparison>> {
    const response = await this.quoteClient.get(`/api/quotes/requests/${requestId}/comparison`);
    return response.data;
  }

  public async selectQuote(requestId: string, quoteId: string): Promise<ApiResponse> {
    const response = await this.quoteClient.post(`/api/quotes/requests/${requestId}/select`, {
      quote_id: quoteId
    });
    return response.data;
  }

  // Financial Calculation Methods
  public async calculateQuoteFinancials(params: {
    base_price: number;
    price_per_kwp: number;
    system_size_kwp: number;
  }): Promise<ApiResponse<QuoteFinancialCalculation>> {
    const response = await this.quoteClient.post('/api/quotes/calculate-financials', params);
    return response.data;
  }

  // Quote Service Area Methods
  public async getServiceAreas(): Promise<ApiResponse> {
    const response = await this.quoteClient.get('/api/quotes/service-areas');
    return response.data;
  }

  public async checkServiceAvailability(location: {
    latitude: number;
    longitude: number;
  }): Promise<ApiResponse> {
    const response = await this.quoteClient.post('/api/quotes/check-service-area', location);
    return response.data;
  }

  // Contractor selection for quote requests
  public async getAvailableContractors(params?: {
    region?: string;
    city?: string;
    min_rating?: number;
    verification_level?: number;
    limit?: number;
    sort_by?: string;
    sort_order?: string;
  }): Promise<ApiResponse> {
    const response = await this.quoteClient.get('/available-contractors', { params });
    return response.data;
  }

  // Health check
  public async checkHealth(): Promise<ApiResponse> {
    const response = await this.quoteClient.get('/health');
    return response.data;
  }
}

export const quoteService = new QuoteService();
export default quoteService;