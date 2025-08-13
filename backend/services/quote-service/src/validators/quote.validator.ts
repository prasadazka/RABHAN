import Joi from 'joi';

// Property details validation schema
const propertyDetailsSchema = Joi.object({
  property_type: Joi.string().valid('residential', 'commercial', 'industrial').required(),
  floors: Joi.number().integer().min(1).max(50).required(),
  roof_type: Joi.string().valid('flat', 'sloped', 'mixed').required(),
  roof_material: Joi.string().max(100).required(),
  building_age: Joi.number().integer().min(0).max(100).required(),
  shading_issues: Joi.boolean().required(),
  structural_concerns: Joi.boolean().required(),
  access_difficulty: Joi.string().valid('easy', 'moderate', 'difficult').required(),
  electrical_panel_location: Joi.string().max(200).required(),
  additional_notes: Joi.string().max(1000).optional()
});

// Monthly consumption schema
const monthlyConsumptionSchema = Joi.object({
  month: Joi.string().regex(/^(01|02|03|04|05|06|07|08|09|10|11|12)$/).required(),
  year: Joi.number().integer().min(2020).max(new Date().getFullYear()).required(),
  kwh_consumed: Joi.number().min(0).max(100000).required(),
  cost_sar: Joi.number().min(0).max(1000000).required()
});

// Electricity consumption validation schema
const electricityConsumptionSchema = Joi.object({
  monthly_consumption: Joi.array()
    .items(monthlyConsumptionSchema)
    .min(1)
    .max(24)
    .required(),
  average_monthly_kwh: Joi.number().min(0).max(100000).required(),
  peak_usage_hours: Joi.string().max(50).required(),
  current_provider: Joi.string().max(100).required(),
  current_tariff: Joi.string().max(100).required(),
  annual_cost_sar: Joi.number().min(0).max(12000000).required()
});

// Simple property details for frontend compatibility
const simplePropertyDetailsSchema = Joi.object({
  property_type: Joi.string().max(50).required(),
  roof_type: Joi.string().max(50).required(),
  roof_orientation: Joi.string().max(50).required(),
  shading_issues: Joi.boolean().required()
});

// Create quote request validation - simplified for frontend compatibility  
export const createQuoteRequestSchema = Joi.object({
  system_size_kwp: Joi.number().min(1).max(50).precision(2).required(),
  location_address: Joi.string().max(500).required(),
  service_area: Joi.string().max(100).required(),
  preferred_installation_date: Joi.string().isoDate().required(),
  contact_phone: Joi.string().max(20).required(),
  notes: Joi.string().max(1000).optional().allow(''),
  property_details: simplePropertyDetailsSchema.optional(),
  selected_contractors: Joi.array().items(Joi.string().uuid()).min(0).max(10).optional(),
  inspection_schedules: Joi.object().pattern(
    Joi.string().uuid(),
    Joi.date().iso()
  ).optional()
});

// Component specification schema
const componentSpecSchema = Joi.object({
  type: Joi.string().valid('panel', 'inverter', 'battery', 'monitoring', 'mounting', 'other').required(),
  brand: Joi.string().max(100).required(),
  model: Joi.string().max(100).required(),
  quantity: Joi.number().integer().min(1).max(10000).required(),
  unit_price: Joi.number().min(0).max(1000000).precision(2).required(),
  total_price: Joi.number().min(0).max(100000000).precision(2).required(),
  warranty_years: Joi.number().integer().min(0).max(50).required(),
  specifications: Joi.object().optional()
});

// System specifications schema
const systemSpecsSchema = Joi.object({
  total_capacity_kwp: Joi.number().min(1).max(1000).precision(2).required(),
  estimated_monthly_generation_kwh: Joi.number().min(0).max(1000000).precision(2).required(),
  estimated_annual_savings_sar: Joi.number().min(0).max(10000000).precision(2).required(),
  payback_period_years: Joi.number().min(0).max(50).precision(1).required(),
  system_efficiency_percent: Joi.number().min(10).max(100).precision(2).required(),
  monitoring_included: Joi.boolean().required(),
  grid_connection_type: Joi.string().valid('grid_tied', 'hybrid', 'off_grid').required(),
  battery_storage_kwh: Joi.number().min(0).max(10000).precision(2).optional(),
  components: Joi.array().items(componentSpecSchema).min(1).max(50).required()
});

// Warranty terms schema
const warrantyTermsSchema = Joi.object({
  equipment_warranty_years: Joi.number().integer().min(1).max(50).required(),
  performance_warranty_years: Joi.number().integer().min(1).max(50).required(),
  installation_warranty_years: Joi.number().integer().min(1).max(50).required(),
  warranty_coverage: Joi.array().items(Joi.string().max(200)).min(1).max(20).required(),
  warranty_conditions: Joi.string().max(2000).required()
});

// Maintenance terms schema
const maintenanceTermsSchema = Joi.object({
  maintenance_included: Joi.boolean().required(),
  maintenance_period_years: Joi.number().integer().min(0).max(50).required(),
  maintenance_frequency: Joi.string().valid('monthly', 'quarterly', 'biannual', 'annual').required(),
  maintenance_cost_annual: Joi.number().min(0).max(1000000).precision(2).required(),
  maintenance_scope: Joi.array().items(Joi.string().max(200)).min(1).max(20).required()
});

// Submit quote validation
export const submitQuoteSchema = Joi.object({
  request_id: Joi.string().uuid().required(),
  base_price: Joi.number().min(1).max(100000000).precision(2).required(),
  price_per_kwp: Joi.number().min(1).max(50000).precision(2).required(),
  system_specs: systemSpecsSchema.required(),
  installation_timeline_days: Joi.number().integer().min(1).max(365).required(),
  warranty_terms: warrantyTermsSchema.required(),
  maintenance_terms: maintenanceTermsSchema.required(),
  panels_brand: Joi.string().max(100).optional(),
  panels_model: Joi.string().max(100).optional(),
  panels_quantity: Joi.number().integer().min(1).max(10000).optional(),
  inverter_brand: Joi.string().max(100).optional(),
  inverter_model: Joi.string().max(100).optional(),
  inverter_quantity: Joi.number().integer().min(1).max(100).optional()
});

// Update quote request status
export const updateQuoteRequestSchema = Joi.object({
  status: Joi.string().valid(
    'pending',
    'contractors_selected', 
    'quotes_received', 
    'quote_selected', 
    'completed', 
    'cancelled'
  ).required(),
  selected_contractors: Joi.array().items(Joi.string().uuid()).max(10).optional(),
  inspection_dates: Joi.array().items(Joi.object({
    contractor_id: Joi.string().uuid().required(),
    proposed_dates: Joi.array().items(Joi.date().iso()).min(1).max(10).required(),
    selected_date: Joi.date().iso().optional(),
    status: Joi.string().valid('pending', 'scheduled', 'completed', 'cancelled').required()
  })).max(10).optional(),
  cancellation_reason: Joi.string().max(500).when('status', {
    is: 'cancelled',
    then: Joi.required(),
    otherwise: Joi.optional()
  })
});

// Select quote validation
export const selectQuoteSchema = Joi.object({
  quote_id: Joi.string().uuid().required(),
  selection_reason: Joi.string().max(500).optional(),
  financing_option: Joi.object({
    payment_type: Joi.string().valid('upfront', 'bnpl').required(),
    installment_months: Joi.number().valid(6, 12, 18, 24).when('payment_type', {
      is: 'bnpl',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    down_payment_percentage: Joi.number().min(20).max(100).precision(2).when('payment_type', {
      is: 'bnpl',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  }).required()
});

// Query parameters validation
export const getQuoteRequestsSchema = Joi.object({
  status: Joi.string().valid(
    'pending',
    'contractors_selected', 
    'quotes_received', 
    'quote_selected', 
    'completed', 
    'cancelled'
  ).optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort_by: Joi.string().valid('created_at', 'updated_at', 'system_size_kwp').default('created_at'),
  sort_order: Joi.string().valid('asc', 'desc').default('desc')
});

// Get quotes for request validation
export const getQuotesForRequestSchema = Joi.object({
  status: Joi.string().valid('pending_review', 'approved', 'rejected', 'revision_needed').optional(),
  sort_by: Joi.string().valid('created_at', 'base_price', 'installation_timeline_days').default('base_price'),
  sort_order: Joi.string().valid('asc', 'desc').default('asc')
});

// Contractor area search validation
export const contractorSearchSchema = Joi.object({
  lat: Joi.number().min(16).max(33).precision(8).required(),
  lng: Joi.number().min(34).max(56).precision(8).required(),
  radius_km: Joi.number().min(1).max(500).default(50),
  service_types: Joi.array().items(Joi.string().max(100)).optional(),
  min_rating: Joi.number().min(1).max(5).precision(1).optional(),
  max_results: Joi.number().integer().min(1).max(50).default(10)
});

// Quote comparison validation
export const compareQuotesSchema = Joi.object({
  request_id: Joi.string().uuid().required(),
  quote_ids: Joi.array().items(Joi.string().uuid()).min(2).max(10).required(),
  comparison_criteria: Joi.object({
    sort_by: Joi.string().valid('price', 'timeline', 'rating', 'warranty').default('price'),
    filters: Joi.object({
      max_price: Joi.number().min(0).max(100000000).optional(),
      max_timeline_days: Joi.number().integer().min(1).max(365).optional(),
      min_warranty_years: Joi.number().integer().min(1).max(50).optional(),
      preferred_brands: Joi.array().items(Joi.string().max(100)).optional()
    }).optional()
  }).optional()
});

export default {
  createQuoteRequestSchema,
  submitQuoteSchema,
  updateQuoteRequestSchema,
  selectQuoteSchema,
  getQuoteRequestsSchema,
  getQuotesForRequestSchema,
  contractorSearchSchema,
  compareQuotesSchema
};