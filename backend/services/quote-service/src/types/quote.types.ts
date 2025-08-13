export interface QuoteRequest {
  id: string;
  user_id: string;
  property_details: PropertyDetails;
  electricity_consumption: ElectricityConsumption;
  system_size_kwp: number;
  location_lat?: number;
  location_lng?: number;
  location_address?: string;
  roof_size_sqm?: number;
  service_area?: string;
  status: QuoteRequestStatus;
  inspection_dates: InspectionDate[];
  selected_contractors: string[];
  max_contractors: number;
  inspection_penalty_acknowledged: boolean;
  penalty_amount: number;
  created_at: Date;
  updated_at: Date;
  cancelled_at?: Date;
  cancellation_reason?: string;
}

export interface PropertyDetails {
  property_type: 'residential' | 'commercial' | 'industrial';
  floors: number;
  roof_type: 'flat' | 'sloped' | 'mixed';
  roof_material: string;
  building_age: number;
  shading_issues: boolean;
  structural_concerns: boolean;
  access_difficulty: 'easy' | 'moderate' | 'difficult';
  electrical_panel_location: string;
  additional_notes?: string;
}

export interface ElectricityConsumption {
  monthly_consumption: MonthlyConsumption[];
  average_monthly_kwh: number;
  peak_usage_hours: string;
  current_provider: string;
  current_tariff: string;
  annual_cost_sar: number;
}

export interface MonthlyConsumption {
  month: string;
  year: number;
  kwh_consumed: number;
  cost_sar: number;
}

export interface InspectionDate {
  contractor_id: string;
  proposed_dates: Date[];
  selected_date?: Date;
  status: 'pending' | 'scheduled' | 'completed' | 'cancelled';
}

export type QuoteRequestStatus = 
  | 'pending' 
  | 'contractors_selected' 
  | 'quotes_received' 
  | 'quote_selected' 
  | 'completed' 
  | 'cancelled';

export interface ContractorQuote {
  id: string;
  request_id: string;
  contractor_id: string;
  base_price: number;
  price_per_kwp: number;
  overprice_amount: number; // Auto-calculated
  total_user_price: number; // Auto-calculated
  system_specs: SystemSpecifications;
  installation_timeline_days: number;
  warranty_terms: WarrantyTerms;
  maintenance_terms: MaintenanceTerms;
  panels_brand?: string;
  panels_model?: string;
  panels_quantity?: number;
  inverter_brand?: string;
  inverter_model?: string;
  inverter_quantity?: number;
  admin_status: QuoteAdminStatus;
  admin_notes?: string;
  reviewed_by?: string;
  reviewed_at?: Date;
  rejection_reason?: string;
  is_selected: boolean;
  selected_at?: Date;
  created_at: Date;
  updated_at: Date;
  expires_at: Date;
}

export interface SystemSpecifications {
  total_capacity_kwp: number;
  estimated_monthly_generation_kwh: number;
  estimated_annual_savings_sar: number;
  payback_period_years: number;
  system_efficiency_percent: number;
  monitoring_included: boolean;
  grid_connection_type: 'grid_tied' | 'hybrid' | 'off_grid';
  battery_storage_kwh?: number;
  components: ComponentSpecification[];
}

export interface ComponentSpecification {
  type: 'panel' | 'inverter' | 'battery' | 'monitoring' | 'mounting' | 'other';
  brand: string;
  model: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  warranty_years: number;
  specifications: Record<string, any>;
}

export interface WarrantyTerms {
  equipment_warranty_years: number;
  performance_warranty_years: number;
  installation_warranty_years: number;
  warranty_coverage: string[];
  warranty_conditions: string;
}

export interface MaintenanceTerms {
  maintenance_included: boolean;
  maintenance_period_years: number;
  maintenance_frequency: 'monthly' | 'quarterly' | 'biannual' | 'annual';
  maintenance_cost_annual: number;
  maintenance_scope: string[];
}

export type QuoteAdminStatus = 
  | 'pending_review' 
  | 'approved' 
  | 'rejected' 
  | 'revision_needed';

export interface Invoice {
  id: string;
  quote_id: string;
  invoice_number: string;
  invoice_date: Date;
  due_date?: Date;
  gross_amount: number;
  overprice_deduction: number;
  commission_deduction: number;
  penalty_deduction: number;
  net_amount: number;
  vat_amount: number;
  total_with_vat: number; // Auto-calculated
  invoice_file_url?: string;
  invoice_file_uploaded_at?: Date;
  status: InvoiceStatus;
  payment_date?: Date;
  payment_reference?: string;
  created_at: Date;
  updated_at: Date;
}

export type InvoiceStatus = 
  | 'pending' 
  | 'sent' 
  | 'paid' 
  | 'partial' 
  | 'overdue' 
  | 'cancelled';

export interface ContractorWallet {
  id: string;
  contractor_id: string;
  current_balance: number;
  pending_balance: number;
  withdrawable_balance: number;
  total_earned: number;
  total_commission_paid: number;
  total_penalties: number;
  total_withdrawn: number;
  bank_account_details: BankAccountDetails;
  payment_methods: PaymentMethod[];
  default_payment_method?: string;
  is_active: boolean;
  is_suspended: boolean;
  suspension_reason?: string;
  suspended_at?: Date;
  created_at: Date;
  updated_at: Date;
  last_transaction_at?: Date;
}

export interface BankAccountDetails {
  bank_name: string;
  account_holder_name: string;
  iban: string;
  swift_code?: string;
  account_type: 'checking' | 'savings';
}

export interface PaymentMethod {
  id: string;
  type: 'bank_transfer' | 'stc_pay' | 'other';
  details: Record<string, any>;
  is_default: boolean;
  is_active: boolean;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  transaction_type: TransactionType;
  transaction_subtype?: string;
  amount: number;
  currency: string;
  reference_id?: string;
  reference_type?: string;
  reference_number?: string;
  status: TransactionStatus;
  description?: string;
  internal_notes?: string;
  balance_before: number;
  balance_after: number;
  created_at: Date;
  processed_at?: Date;
  failed_at?: Date;
  failure_reason?: string;
}

export type TransactionType = 
  | 'payment' 
  | 'commission' 
  | 'penalty' 
  | 'withdrawal' 
  | 'refund' 
  | 'adjustment';

export type TransactionStatus = 
  | 'pending' 
  | 'processing' 
  | 'completed' 
  | 'failed' 
  | 'reversed';

export interface Penalty {
  id: string;
  quote_id?: string;
  request_id?: string;
  penalty_type: PenaltyType;
  penalty_amount: number;
  contractor_share: number;
  platform_share: number;
  applied_to: 'user' | 'contractor' | 'both';
  applied_to_id?: string;
  reason: string;
  evidence_urls: string[];
  is_processed: boolean;
  processed_at?: Date;
  wallet_transaction_id?: string;
  reviewed_by?: string;
  review_notes?: string;
  created_at: Date;
  updated_at: Date;
}

export type PenaltyType = 
  | 'user_cancellation' 
  | 'contractor_cancellation' 
  | 'installation_delay' 
  | 'quality_issue' 
  | 'other';

export interface PaymentSchedule {
  id: string;
  quote_id: string;
  user_id: string;
  total_amount: number;
  down_payment_amount: number;
  down_payment_percentage?: number;
  financed_amount: number; // Auto-calculated
  installment_months?: number;
  monthly_amount?: number;
  total_installments?: number;
  payments_completed: number;
  amount_paid: number;
  amount_remaining?: number;
  first_payment_date?: Date;
  next_payment_date?: Date;
  last_payment_date?: Date;
  status: PaymentScheduleStatus;
  days_overdue: number;
  overdue_amount: number;
  late_fees: number;
  created_at: Date;
  updated_at: Date;
  activated_at?: Date;
  completed_at?: Date;
}

export type PaymentScheduleStatus = 
  | 'pending' 
  | 'active' 
  | 'completed' 
  | 'defaulted' 
  | 'cancelled';

export interface QuoteComparison {
  id: string;
  request_id: string;
  user_id: string;
  compared_quotes: string[];
  comparison_criteria: ComparisonCriteria;
  selected_quote_id?: string;
  selection_reason?: string;
  views_count: number;
  last_viewed_at?: Date;
  time_to_decision?: string; // PostgreSQL interval
  created_at: Date;
  updated_at: Date;
}

export interface ComparisonCriteria {
  sort_by: 'price' | 'timeline' | 'rating' | 'warranty';
  filters: {
    max_price?: number;
    max_timeline_days?: number;
    min_warranty_years?: number;
    preferred_brands?: string[];
  };
}

export interface BusinessConfig {
  id: string;
  config_key: string;
  config_value: Record<string, any>;
  description?: string;
  is_active: boolean;
  updated_by?: string;
  updated_at: Date;
  created_at: Date;
}

// Simple property details for frontend compatibility
export interface SimplePropertyDetails {
  property_type: string;
  roof_type: string;
  roof_orientation: string;
  shading_issues: boolean;
}

// API Request/Response Types
export interface CreateQuoteRequestDTO {
  system_size_kwp: number;
  location_address: string;
  service_area: string;
  preferred_installation_date: string;
  contact_phone: string;
  notes?: string;
  property_details?: SimplePropertyDetails;
  selected_contractors?: string[];
  inspection_schedules?: { [contractorId: string]: Date };
  electricity_consumption?: number;
  average_electricity_bill?: number;
  peak_usage_hours?: string;
}

export interface SubmitQuoteDTO {
  request_id: string;
  base_price: number;
  price_per_kwp: number;
  system_specs: SystemSpecifications;
  installation_timeline_days: number;
  warranty_terms: WarrantyTerms;
  maintenance_terms: MaintenanceTerms;
  panels_brand?: string;
  panels_model?: string;
  panels_quantity?: number;
  inverter_brand?: string;
  inverter_model?: string;
  inverter_quantity?: number;
}

export interface ApproveQuoteDTO {
  admin_notes?: string;
  pricing_override?: {
    new_base_price: number;
    justification: string;
  };
}

export interface RejectQuoteDTO {
  rejection_reason: string;
  admin_notes?: string;
}

export interface ApplyPenaltyDTO {
  quote_id?: string;
  request_id?: string;
  penalty_type: PenaltyType;
  penalty_amount: number;
  applied_to: 'user' | 'contractor' | 'both';
  reason: string;
  evidence_urls?: string[];
}