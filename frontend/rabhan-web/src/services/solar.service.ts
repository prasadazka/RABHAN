import { 
  SolarCalculationInput, 
  SolarApiResponse, 
  InstallmentOptionsResponse 
} from '../types/solar.types';
import { config } from '../config/environment';

const SOLAR_API_BASE_URL = config.solarApiUrl;

class SolarService {
  private async makeRequest<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${SOLAR_API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      
      // Handle validation errors with details
      if (errorData?.details && Array.isArray(errorData.details)) {
        const validationMessages = errorData.details.map((detail: any) => 
          `${detail.field}: ${detail.message}`
        ).join(', ');
        throw new Error(validationMessages);
      }
      
      // Handle other error formats
      const errorMessage = errorData?.error?.message || 
                          errorData?.error || 
                          errorData?.message || 
                          `HTTP ${response.status}: ${response.statusText}`;
      
      throw new Error(errorMessage);
    }

    return response.json();
  }

  async calculateSolar(input: SolarCalculationInput): Promise<SolarApiResponse> {
    return this.makeRequest<SolarApiResponse>('/calculate', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  }

  async getInstallmentOptions(): Promise<InstallmentOptionsResponse> {
    return this.makeRequest<InstallmentOptionsResponse>('/installment-options');
  }
}

export const solarService = new SolarService();