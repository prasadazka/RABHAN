/**
 * RABHAN Marketplace Service - TypeScript Definitions
 * SAMA Compliant | Zero-Trust Security | MVP Scope
 */

import { z } from 'zod';

// =====================================================
// BASE TYPES AND INTERFACES
// =====================================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  updatedBy?: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginationResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
  meta?: {
    timestamp: string;
    requestId: string;
    version: string;
  };
}

// =====================================================
// CATEGORY TYPES (Simple MVP)
// =====================================================

export interface Category extends BaseEntity {
  name: string;
  nameAr?: string;
  slug: string;
  description?: string;
  descriptionAr?: string;
  icon?: string;
  imageUrl?: string;
  sortOrder: number;
  isActive: boolean;
  productsCount: number;
}

// Category validation schemas
export const CategoryCreateSchema = z.object({
  name: z.string().min(2).max(100),
  nameAr: z.string().max(100).optional(),
  slug: z.string().min(2).max(100).regex(/^[a-z0-9-]+$/),
  description: z.string().max(1000).optional(),
  descriptionAr: z.string().max(1000).optional(),
  icon: z.string().max(50).optional(),
  imageUrl: z.string().url().max(500).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isActive: z.boolean().default(true)
});

export const CategoryUpdateSchema = CategoryCreateSchema.partial();

export type CategoryCreate = z.infer<typeof CategoryCreateSchema>;
export type CategoryUpdate = z.infer<typeof CategoryUpdateSchema>;

// =====================================================
// PRODUCT TYPES (Category-Based Specification System)
// =====================================================

export type ProductStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE' | 'DISCONTINUED';
export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUIRED';
export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
export type ProductCategory = 'INVERTER' | 'BATTERY' | 'SOLAR_PANEL' | 'FULL_SYSTEM';

// Enhanced Product Specifications for all 4 categories
export interface ProductSpecifications {
  // === INVERTER SPECIFICATIONS (8 fields) ===
  model?: string;                    // Product model identifier
  powerRate?: string;                // Power rating (e.g., "3.6KW", "5.5KW")
  type?: string;                     // Inverter type (e.g., "Hybrid", "Grid-Tie", "Off-Grid")
  mppts?: string;                    // Number of MPPT inputs (e.g., "1", "2")
  mpptRange?: string;                // MPPT voltage range (e.g., "40-450V")
  maxInputCurrent?: string;          // Maximum input current (e.g., "18A", "25A")
  outputPhase?: string;              // Output phase type (e.g., "3-phase", "single-phase")
  inverterCommunication?: string;    // Communication protocols (e.g., "RS485/RS232/USB")
  inverterWeight?: string;           // Weight in kg (e.g., "6.3")

  // === BATTERY SPECIFICATIONS (8 fields) ===
  capacity?: string;                 // Battery capacity (e.g., "2.56 KWH", "5.12 KWH")
  voltage?: string;                  // Battery voltage (e.g., "12.8V", "24V", "48V")
  current?: string;                  // Current in Ah (e.g., "200Ah", "100Ah")
  cycleLife?: string;                // Cycle life count (e.g., "6000", "8000")
  batteryCommunication?: string;     // Communication type (e.g., "Bluetooth", "CAN", "RS485")
  batteryWeight?: string;            // Weight in kg (e.g., "29.5")
  batteryDimensions?: string;        // Dimensions in mm (e.g., "270*520*230")

  // === SOLAR PANEL SPECIFICATIONS (9 fields) ===
  maxPower?: string;                 // Maximum power output (e.g., "450W", "550W")
  bindingSpecifications?: string;    // Panel binding specs (e.g., "Every 36 pieces")
  efficiency?: string;               // Panel efficiency (e.g., "≥21.46%", "≥22.1%")
  panelVoltage?: string;             // Operating voltage (e.g., "49.3V/work41.5V")
  workingCurrent?: string;           // Working current (e.g., "A ≥10.86")
  workingTemperature?: string;       // Operating temperature range (e.g., "-40°C ~ +85°C")
  panelWeight?: string;              // Panel weight (e.g., "23KG", "25KG")
  panelDimensions?: string;          // Panel dimensions (e.g., "1909 x 1038 x 30 mm")

  // === FULL SYSTEM SPECIFICATIONS (11 fields) ===
  systemPower?: string;              // System power rating (e.g., "6 KW", "12 KW")
  systemPeak?: string;               // Peak power (e.g., "12KW", "24KW")
  cOutput?: string;                  // AC output specifications (e.g., "50Hz/AC220V*2")
  batteryCapacity?: string;          // System battery capacity (e.g., "16KWH LiFepo4")
  chargingPower?: string;            // Charging power (e.g., "3.2 KW", "6.4 KW")
  solarConfiguration?: string;       // Solar panel configuration (e.g., "580W*8PS")
  generatingCapacity?: string;       // Daily generation capacity (e.g., "22KW 20 square")
  systemDimensions1?: string;        // Main unit dimensions (e.g., "500*280*1080MM")
  systemDimensions2?: string;        // Secondary unit dimensions (e.g., "550*430*1130MM")
  totalWeight?: string;              // Total system weight (e.g., "143KG+285KG")

  // === COMMON/LEGACY SPECIFICATIONS (for backward compatibility) ===
  wattage?: string;                  // Generic wattage (legacy)
  warranty?: string;                 // Warranty period
  dimensions?: string;               // Generic dimensions (legacy)
  weight?: string;                   // Generic weight (legacy)

  // Flexible additional fields
  [key: string]: any;
}

export interface Product extends BaseEntity {
  contractorId: string;
  categoryId: string;
  productCategory: ProductCategory;  // NEW: Category type for dynamic forms
  name: string;
  nameAr?: string;
  description?: string;
  descriptionAr?: string;
  slug: string;
  brand: string;
  model?: string;
  sku?: string;
  specifications: ProductSpecifications;
  price: number;
  currency: string;
  vatIncluded: boolean;
  stockQuantity: number;
  stockStatus: StockStatus;
  status: ProductStatus;
  
  // Approval Workflow
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: Date;
  rejectionReason?: string;
  adminNotes?: string;
  
  // Relations (populated when needed)
  category?: Category;
  images?: ProductImage[];
}

// Product validation schemas
export const ProductSpecificationsSchema = z.record(z.any()).default({});

export const ProductCreateSchema = z.object({
  contractorId: z.string().uuid(),
  categoryId: z.string().uuid(),
  productCategory: z.enum(['INVERTER', 'BATTERY', 'SOLAR_PANEL', 'FULL_SYSTEM']),
  name: z.string().min(2).max(255),
  nameAr: z.string().max(255).optional(),
  description: z.string().max(2000).optional(),
  descriptionAr: z.string().max(2000).optional(),
  slug: z.string().min(2).max(255).regex(/^[a-z0-9-]+$/),
  brand: z.string().min(1).max(100),
  model: z.string().max(100).optional(),
  sku: z.string().max(50).optional(),
  specifications: ProductSpecificationsSchema,
  price: z.number().positive(),
  currency: z.string().length(3).default('SAR'),
  vatIncluded: z.boolean().default(true),
  stockQuantity: z.number().int().min(0).default(0),
  status: z.enum(['ACTIVE', 'INACTIVE']).default('ACTIVE')
});

export const ProductUpdateSchema = ProductCreateSchema.partial().omit({
  contractorId: true // Prevent contractor change
});

export type ProductCreate = z.infer<typeof ProductCreateSchema>;
export type ProductUpdate = z.infer<typeof ProductUpdateSchema>;

// =====================================================
// PRODUCT IMAGE TYPES
// =====================================================

export interface ProductImage extends BaseEntity {
  productId: string;
  fileName: string;
  filePath: string;
  fileUrl?: string;
  sortOrder: number;
  isPrimary: boolean;
}

export const ProductImageCreateSchema = z.object({
  productId: z.string().uuid(),
  fileName: z.string().min(1).max(255),
  filePath: z.string().min(1).max(500),
  fileUrl: z.string().url().max(500).optional(),
  sortOrder: z.number().int().min(0).default(0),
  isPrimary: z.boolean().default(false)
});

export type ProductImageCreate = z.infer<typeof ProductImageCreateSchema>;

// =====================================================
// SEARCH AND FILTERING TYPES (MVP - Basic)
// =====================================================

export interface ProductFilters {
  categoryId?: string;
  contractorId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  inStockOnly?: boolean;
  status?: ProductStatus;
  search?: string; // Free text search
}

export const ProductFiltersSchema = z.object({
  categoryId: z.string().uuid().optional(),
  contractorId: z.string().uuid().optional(),
  brand: z.string().max(100).optional(),
  minPrice: z.number().min(0).optional(),
  maxPrice: z.number().min(0).optional(),
  inStockOnly: z.boolean().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE']).optional(),
  search: z.string().max(255).optional()
}).refine((data) => {
  // Ensure minPrice <= maxPrice
  if (data.minPrice !== undefined && data.maxPrice !== undefined) {
    return data.minPrice <= data.maxPrice;
  }
  return true;
}, {
  message: 'minPrice must be less than or equal to maxPrice'
});

export type ProductFiltersInput = z.infer<typeof ProductFiltersSchema>;

// =====================================================
// ORDER MANAGEMENT TYPES
// =====================================================

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIALLY_PAID' | 'FAILED' | 'REFUNDED';
export type InstallationStatus = 'NOT_REQUIRED' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface ShippingAddress {
  line1: string;
  line2?: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
  coordinates?: { lat: number; lng: number };
}

export interface Order extends BaseEntity {
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  
  // Addresses
  shippingAddress: ShippingAddress;
  billingAddress?: ShippingAddress;
  billingSameAsShipping: boolean;
  
  // Totals
  subtotal: number;
  taxAmount: number;
  shippingCost: number;
  discountAmount: number;
  totalAmount: number;
  currency: string;
  
  // Status
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  
  // Special Requirements
  specialInstructions?: string;
  deliveryNotes?: string;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  
  // Payment
  paymentMethod?: string;
  paymentReference?: string;
  paymentDate?: Date;
  
  // Installation (for solar products)
  assignedContractorId?: string;
  installationRequired: boolean;
  installationDate?: Date;
  installationStatus?: InstallationStatus;
  
  // Compliance
  samaReferenceNumber?: string;
  complianceVerified: boolean;
  
  // Relations
  items?: OrderItem[];
  statusHistory?: OrderStatusHistory[];
}

export interface OrderItem extends BaseEntity {
  orderId: string;
  productId: string;
  contractorId: string;
  
  // Product snapshot
  productName: string;
  productNameAr?: string;
  productSku?: string;
  productBrand: string;
  productModel?: string;
  
  // Pricing
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  
  // Details
  specifications: Record<string, any>;
  installationRequired: boolean;
  installationNotes?: string;
  warrantyPeriodMonths: number;
  
  status: string;
}

export interface OrderStatusHistory extends BaseEntity {
  orderId: string;
  previousStatus?: string;
  newStatus: string;
  statusType: 'ORDER' | 'PAYMENT' | 'SHIPPING' | 'INSTALLATION';
  reason?: string;
  notes?: string;
  changedBy: string;
  changedByRole: string;
}

// Order validation schemas
export const ShippingAddressSchema = z.object({
  line1: z.string().min(5).max(255),
  line2: z.string().max(255).optional(),
  city: z.string().min(2).max(100),
  region: z.string().min(2).max(100),
  postalCode: z.string().max(20).optional(),
  country: z.string().length(3).default('SAU'),
  coordinates: z.object({
    lat: z.number().min(-90).max(90),
    lng: z.number().min(-180).max(180)
  }).optional()
});

export const OrderCreateSchema = z.object({
  userId: z.string().uuid(),
  customerName: z.string().min(2).max(255),
  customerEmail: z.string().email().max(255),
  customerPhone: z.string().min(8).max(20),
  shippingAddress: ShippingAddressSchema,
  billingAddress: ShippingAddressSchema.optional(),
  billingSameAsShipping: z.boolean().default(true),
  specialInstructions: z.string().max(1000).optional(),
  paymentMethod: z.string().max(50).optional(),
  installationRequired: z.boolean().default(false),
  items: z.array(z.object({
    productId: z.string().uuid(),
    quantity: z.number().int().min(1).max(1000),
    installationNotes: z.string().max(500).optional()
  })).min(1)
});

export type OrderCreate = z.infer<typeof OrderCreateSchema>;

// =====================================================
// PRODUCT APPROVAL TYPES
// =====================================================

export interface ProductApprovalHistory extends BaseEntity {
  productId: string;
  previousStatus?: string;
  newStatus: string;
  actionType: 'SUBMIT' | 'APPROVE' | 'REJECT' | 'REQUEST_CHANGES';
  adminId: string;
  adminNotes?: string;
  rejectionReason?: string;
  changesRequired?: string;
}

export const ProductApprovalSchema = z.object({
  action: z.enum(['approve', 'reject', 'request_changes']),
  adminNotes: z.string().max(1000).optional(),
  rejectionReason: z.string().max(500).optional(),
  changesRequired: z.string().max(1000).optional()
});

export type ProductApproval = z.infer<typeof ProductApprovalSchema>;

// =====================================================
// SAMA AUDIT LOG TYPES
// =====================================================

export interface AuditLog extends BaseEntity {
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  changedBy?: string;
  changedAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

// =====================================================
// SERVICE RESPONSE TYPES
// =====================================================

export interface ServiceHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  database: {
    connected: boolean;
    latency?: number;
  };
  redis?: {
    connected: boolean;
    latency?: number;
  };
  dependencies: {
    [serviceName: string]: {
      status: 'available' | 'unavailable';
      latency?: number;
    };
  };
}

// =====================================================
// ERROR TYPES
// =====================================================

export interface ServiceError extends Error {
  code: string;
  statusCode: number;
  details?: any;
  timestamp: string;
  requestId?: string;
}

export class ValidationError extends Error implements ServiceError {
  code = 'VALIDATION_ERROR';
  statusCode = 400;
  timestamp: string;
  
  constructor(message: string, public details?: any, public requestId?: string) {
    super(message);
    this.timestamp = new Date().toISOString();
  }
}

export class NotFoundError extends Error implements ServiceError {
  code = 'NOT_FOUND';
  statusCode = 404;
  timestamp: string;
  
  constructor(message: string, public details?: any, public requestId?: string) {
    super(message);
    this.timestamp = new Date().toISOString();
  }
}

export class UnauthorizedError extends Error implements ServiceError {
  code = 'UNAUTHORIZED';
  statusCode = 401;
  timestamp: string;
  
  constructor(message: string = 'Unauthorized', public details?: any, public requestId?: string) {
    super(message);
    this.timestamp = new Date().toISOString();
  }
}

export class ForbiddenError extends Error implements ServiceError {
  code = 'FORBIDDEN';
  statusCode = 403;
  timestamp: string;
  
  constructor(message: string = 'Forbidden', public details?: any, public requestId?: string) {
    super(message);
    this.timestamp = new Date().toISOString();
  }
}

export class ConflictError extends Error implements ServiceError {
  code = 'CONFLICT';
  statusCode = 409;
  timestamp: string;
  
  constructor(message: string, public details?: any, public requestId?: string) {
    super(message);
    this.timestamp = new Date().toISOString();
  }
}

export class InternalServerError extends Error implements ServiceError {
  code = 'INTERNAL_SERVER_ERROR';
  statusCode = 500;
  timestamp: string;
  
  constructor(message: string = 'Internal Server Error', public details?: any, public requestId?: string) {
    super(message);
    this.timestamp = new Date().toISOString();
  }
}

// =====================================================
// REQUEST CONTEXT TYPES (for middleware)
// =====================================================

export interface RequestContext {
  requestId: string;
  userId?: string;
  contractorId?: string;
  userRole?: string;
  sessionId?: string;
  ipAddress?: string | undefined;
  userAgent?: string | undefined;
  startTime: number;
  traceId?: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      context: RequestContext;
      user?: {
        id: string;
        role: string;
        contractorId?: string;
      };
    }
  }
}

// All types are already exported above via interface/class declarations