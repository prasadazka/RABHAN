import { api } from './api.service';
import { config } from '../config/environment';
import axios, { AxiosInstance } from 'axios';

// Types
export type ProductCategory = 'INVERTER' | 'BATTERY' | 'SOLAR_PANEL' | 'FULL_SYSTEM';

export interface Product {
  id?: string;
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
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE';
  approvalStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CHANGES_REQUIRED';
  approvedBy?: string;
  approvedAt?: string;
  rejectionReason?: string;
  adminNotes?: string;
  imageUrl?: string;
  images?: ProductImage[];
  primaryImage?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  category?: Category;
}

export interface ProductImage {
  id: string;
  product_id: string;
  file_path: string;
  file_url: string;
  file_name: string;
  sort_order: number;
  is_primary: boolean;
  created_at: string;
}

// Enhanced Product Specifications for all 4 categories (25+ fields)
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
  cycle_life?: string;               // Legacy cycle life field
  communication?: string;            // Legacy communication field

  // Flexible additional fields
  [key: string]: any;
}

export interface Category {
  id: string;
  name: string;
  nameAr?: string;
  slug: string;
  description?: string;
  descriptionAr?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ProductCreate {
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
  status: 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'INACTIVE';
  images?: { url?: string; file_url?: string; file_name?: string }[];
}

export interface ProductUpdate extends Partial<ProductCreate> {
  id: string;
}

export interface ProductFilters {
  categoryId?: string;
  contractorId?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  status?: string;
  approvalStatus?: string;
  inStockOnly?: boolean;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
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

export interface ApprovalAction {
  action: 'approve' | 'reject' | 'request_changes';
  adminNotes?: string;
  rejectionReason?: string;
  changesRequired?: string;
}

class MarketplaceService {
  private client: AxiosInstance;
  private mockProducts: Product[] = []; // In-memory storage for mock products

  constructor() {
    this.client = axios.create({
      baseURL: config.marketplaceApiUrl,
      timeout: 10000,
      withCredentials: true,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include auth token
    this.client.interceptors.request.use((config) => {
      const token = localStorage.getItem('rabhan_access_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        console.log('🔑 Marketplace API - Sending token:', token.substring(0, 20) + '...');
      } else {
        console.log('❌ Marketplace API - No token found in localStorage');
      }
      return config;
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Marketplace API Error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );
  }

  /**
   * Generic API call wrapper with error handling
   */
  private async apiCall<T>(method: string, url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.request({
        method,
        url,
        data
      });

      if (response.data.success === false) {
        throw new Error(response.data.message || response.data.error || 'Request failed');
      }

      return response.data.data || response.data;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  private async apiCallWithPagination<T>(method: string, url: string, data?: any): Promise<T> {
    try {
      const response = await this.client.request({
        method,
        url,
        data
      });

      if (response.data.success === false) {
        throw new Error(response.data.message || response.data.error || 'Request failed');
      }

      // Transform API response to match expected frontend format
      const transformedResponse = {
        data: response.data.data || [],
        pagination: {
          page: response.data.meta?.currentPage || response.data.pagination?.page || 1,
          limit: response.data.meta?.limit || response.data.pagination?.limit || 20,
          total: response.data.meta?.total || response.data.pagination?.total || 0,
          totalPages: response.data.meta?.totalPages || response.data.pagination?.totalPages || 0,
          hasNext: response.data.meta?.hasNextPage || response.data.pagination?.hasNext || false,
          hasPrev: response.data.meta?.hasPrevPage || response.data.pagination?.hasPrev || false
        }
      };
      
      return transformedResponse as T;
    } catch (error: any) {
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  // =====================================================
  // PRODUCT MANAGEMENT
  // =====================================================

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    return this.apiCall<Category[]>('GET', '/categories');
  }

  /**
   * Create a new product
   */
  async createProduct(productData: ProductCreate & { images?: File[] }): Promise<Product> {
    const formData = new FormData();
    
    // Add all product fields to form data
    Object.entries(productData).forEach(([key, value]) => {
      if (key === 'images') return; // Handle images separately
      if (key === 'specifications' && typeof value === 'object') {
        formData.append(key, JSON.stringify(value));
      } else if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });
    
    // Add image files and find primary image index
    if (productData.images && productData.images.length > 0) {
      let primaryImageIndex = 0; // Default to first image
      
      productData.images.forEach((file, index) => {
        formData.append('images', file);
        // Check if this image was marked as primary
        if ((file as any).willBePrimary) {
          primaryImageIndex = index;
        }
      });
      
      // Add primary image index to form data
      formData.append('primaryImageIndex', primaryImageIndex.toString());
    }

    try {
      const token = localStorage.getItem('rabhan_access_token');
      const response = await fetch(`${this.client.defaults.baseURL}/products`, {
        method: 'POST',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
          // Don't set Content-Type - let browser set it with boundary for FormData
        },
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Failed to create product');
      }

      const data = await response.json();
      return data.data || data;
    } catch (error: any) {
      console.error('Product creation error:', error);
      throw error;
    }
  }

  /**
   * Update an existing product
   */
  async updateProduct(productId: string, productData: Partial<ProductUpdate>): Promise<Product> {
    // Transform camelCase to snake_case for backend compatibility
    const transformedData = {
      ...productData,
      contractor_id: productData.contractorId,
      category_id: productData.categoryId,
      name_ar: productData.nameAr,
      description_ar: productData.descriptionAr,
      stock_quantity: productData.stockQuantity,
      stock_status: productData.stockStatus,
      vat_included: productData.vatIncluded,
      approval_status: productData.approvalStatus,
      approved_by: productData.approvedBy,
      approved_at: productData.approvedAt,
      rejection_reason: productData.rejectionReason,
      admin_notes: productData.adminNotes,
      created_at: productData.createdAt,
      updated_at: productData.updatedAt,
      created_by: productData.createdBy,
      updated_by: productData.updatedBy
    };
    
    // Remove undefined camelCase fields and images (handled separately) to avoid conflicts
    const { 
      contractorId, categoryId, nameAr, descriptionAr, stockQuantity, 
      stockStatus, vatIncluded, approvalStatus, approvedBy, approvedAt,
      rejectionReason, adminNotes, createdAt, updatedAt, createdBy, updatedBy,
      images, // Remove images field as it's handled in separate table
      ...finalData 
    } = transformedData;
    
    const updatedProduct = await this.apiCall<Product>('PUT', `/products/${productId}`, finalData);
    
    // Map the response similar to how we handle getContractorProducts
    if (updatedProduct && updatedProduct.images) {
      let imageUrl = null;
      if (updatedProduct.primaryImage) {
        imageUrl = updatedProduct.primaryImage.startsWith('http') 
          ? updatedProduct.primaryImage 
          : `${this.client.defaults.baseURL.replace('/api/v1', '')}${updatedProduct.primaryImage}`;
      } else if (updatedProduct.images[0]?.file_url) {
        const firstImageUrl = updatedProduct.images[0].file_url;
        imageUrl = firstImageUrl.startsWith('http') 
          ? firstImageUrl 
          : `${this.client.defaults.baseURL.replace('/api/v1', '')}${firstImageUrl}`;
      }
      
      return {
        ...updatedProduct,
        contractorId: updatedProduct.contractor_id || updatedProduct.contractorId,
        categoryId: updatedProduct.category_id || updatedProduct.categoryId,
        nameAr: updatedProduct.name_ar || updatedProduct.nameAr,
        descriptionAr: updatedProduct.description_ar || updatedProduct.descriptionAr,
        stockQuantity: updatedProduct.stock_quantity || updatedProduct.stockQuantity,
        stockStatus: updatedProduct.stock_status || updatedProduct.stockStatus,
        vatIncluded: updatedProduct.vat_included || updatedProduct.vatIncluded,
        approvalStatus: updatedProduct.approval_status || updatedProduct.approvalStatus,
        approvedBy: updatedProduct.approved_by || updatedProduct.approvedBy,
        approvedAt: updatedProduct.approved_at || updatedProduct.approvedAt,
        rejectionReason: updatedProduct.rejection_reason || updatedProduct.rejectionReason,
        adminNotes: updatedProduct.admin_notes || updatedProduct.adminNotes,
        createdAt: updatedProduct.created_at || updatedProduct.createdAt,
        updatedAt: updatedProduct.updated_at || updatedProduct.updatedAt,
        createdBy: updatedProduct.created_by || updatedProduct.createdBy,
        updatedBy: updatedProduct.updated_by || updatedProduct.updatedBy,
        price: typeof updatedProduct.price === 'string' ? parseFloat(updatedProduct.price) : updatedProduct.price,
        imageUrl: imageUrl
      };
    }
    
    return updatedProduct;
  }

  /**
   * Update product images (delete existing, add new)
   */
  async updateProductImages(productId: string, imagesToDelete: string[] = [], newImages: File[] = []): Promise<void> {
    try {
      // Delete images if any
      if (imagesToDelete.length > 0) {
        await this.apiCall('DELETE', `/products/${productId}/images`, { imageIds: imagesToDelete });
      }
      
      // Add new images if any
      if (newImages.length > 0) {
        const formData = new FormData();
        newImages.forEach((file) => {
          formData.append('images', file);
        });
        
        const token = localStorage.getItem('rabhan_access_token');
        await fetch(`${this.client.defaults.baseURL}/products/${productId}/images`, {
          method: 'POST',
          headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
          body: formData
        });
      }
    } catch (error) {
      console.error('Error updating product images:', error);
      throw error;
    }
  }

  /**
   * Set primary/featured image for a product
   */
  async setPrimaryImage(productId: string, imageId: string, isPrimary: boolean = true): Promise<void> {
    try {
      await this.apiCall('PUT', `/products/${productId}/images/${imageId}/primary`, { 
        is_primary: isPrimary 
      });
    } catch (error) {
      console.error('Error setting primary image:', error);
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<Product> {
    return this.apiCall<Product>('GET', `/products/${productId}`);
  }

  /**
   * Get products by contractor
   */
  async getContractorProducts(
    contractorId: string,
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginationResult<Product>> {
    const params = new URLSearchParams({
      contractorId: contractorId,
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      ...(pagination.sortBy && { sortBy: pagination.sortBy }),
      ...(pagination.sortOrder && { sortOrder: pagination.sortOrder })
    });

    try {
      const response = await this.client.get(`/products?${params}`);
      
      if (response.data.success === false) {
        throw new Error(response.data.message || response.data.error || 'Request failed');
      }

      // Map API response fields to frontend interface format
      const mappedProducts = (response.data.data || []).map((product: any) => {
        // Handle image URLs - check if they're already complete URLs
        let imageUrl = null;
        if (product.primaryImage) {
          imageUrl = product.primaryImage.startsWith('http') 
            ? product.primaryImage 
            : `${this.client.defaults.baseURL.replace('/api/v1', '')}${product.primaryImage}`;
        } else if (product.images?.[0]?.file_url) {
          const firstImageUrl = product.images[0].file_url;
          imageUrl = firstImageUrl.startsWith('http') 
            ? firstImageUrl 
            : `${this.client.defaults.baseURL.replace('/api/v1', '')}${firstImageUrl}`;
        }
            
        if (imageUrl) {
          console.log('🖼️ Product image URL:', product.name, '→', imageUrl);
        }
        
        return {
          ...product,
          contractorId: product.contractor_id,
          categoryId: product.category_id,
          nameAr: product.name_ar,
          descriptionAr: product.description_ar,
          stockQuantity: product.stock_quantity,
          stockStatus: product.stock_status,
          vatIncluded: product.vat_included,
          approvalStatus: product.approval_status,
          approvedBy: product.approved_by,
          approvedAt: product.approved_at,
          rejectionReason: product.rejection_reason,
          adminNotes: product.admin_notes,
          createdAt: product.created_at,
          updatedAt: product.updated_at,
          createdBy: product.created_by,
          updatedBy: product.updated_by,
          price: parseFloat(product.price) || 0,
          imageUrl: imageUrl,
          images: product.images || [],
          primaryImage: product.primaryImage
        };
      });

      // Return the full response structure with data and pagination
      return {
        data: mappedProducts,
        pagination: response.data.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        }
      };
    } catch (error: any) {
      console.error('getContractorProducts error:', error);
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw error;
    }
  }

  /**
   * Search products with filters
   */
  async searchProducts(
    filters: ProductFilters = {},
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginationResult<Product>> {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      ...(pagination.sortBy && { sortBy: pagination.sortBy }),
      ...(pagination.sortOrder && { sortOrder: pagination.sortOrder }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.contractorId && { contractorId: filters.contractorId }),
      ...(filters.brand && { brand: filters.brand }),
      ...(filters.minPrice !== undefined && { minPrice: filters.minPrice.toString() }),
      ...(filters.maxPrice !== undefined && { maxPrice: filters.maxPrice.toString() }),
      ...(filters.search && { search: filters.search }),
      ...(filters.status && { status: filters.status }),
      ...(filters.approvalStatus && { approvalStatus: filters.approvalStatus }),
      ...(filters.inStockOnly && { inStockOnly: 'true' })
    });

    return this.apiCallWithPagination<PaginationResult<Product>>('GET', `/products?${params}`);
  }

  /**
   * Delete a product (soft delete)
   */
  async deleteProduct(productId: string): Promise<void> {
    await this.apiCall<void>('DELETE', `/products/${productId}`);
  }

  // =====================================================
  // APPROVAL WORKFLOW (Contractor side)
  // =====================================================

  /**
   * Submit product for approval
   */
  async submitProductForApproval(productId: string): Promise<Product> {
    return this.apiCall<Product>('POST', `/approvals/submit/${productId}`);
  }

  /**
   * Get approval history for a product
   */
  async getProductApprovalHistory(
    productId: string,
    pagination: PaginationParams = { page: 1, limit: 10 }
  ): Promise<PaginationResult<any>> {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString()
    });

    return this.apiCall<PaginationResult<any>>('GET', `/approvals/history/${productId}?${params}`);
  }

  // =====================================================
  // ADMIN APPROVAL WORKFLOW 
  // =====================================================

  /**
   * Get pending approvals (Admin only)
   */
  async getPendingApprovals(
    pagination: PaginationParams = { page: 1, limit: 20 }
  ): Promise<PaginationResult<Product>> {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString()
    });

    return this.apiCall<PaginationResult<Product>>('GET', `/approvals/pending?${params}`);
  }

  /**
   * Process product approval (Admin only)
   */
  async processApproval(productId: string, approvalData: ApprovalAction): Promise<Product> {
    return this.apiCall<Product>('POST', `/approvals/${productId}`, approvalData);
  }

  /**
   * Get approval statistics (Admin only)
   */
  async getApprovalStats(): Promise<any> {
    return this.apiCall<any>('GET', '/approvals/stats');
  }

  /**
   * Bulk approve products (Admin only)
   */
  async bulkApproveProducts(
    productIds: string[], 
    adminNotes?: string
  ): Promise<{ approved: Product[]; errors: any[] }> {
    return this.apiCall<{ approved: Product[]; errors: any[] }>('POST', '/approvals/bulk-approve', { productIds, adminNotes });
  }

  // =====================================================
  // ORDER MANAGEMENT
  // =====================================================

  /**
   * Create a new order
   */
  async createOrder(orderData: any): Promise<any> {
    return this.apiCall<any>('POST', '/orders', orderData);
  }

  /**
   * Get order by ID
   */
  async getOrderById(orderId: string): Promise<any> {
    return this.apiCall<any>('GET', `/orders/${orderId}`);
  }

  /**
   * Get user orders
   */
  async getUserOrders(
    userId: string,
    pagination: PaginationParams = { page: 1, limit: 20 },
    status?: string
  ): Promise<PaginationResult<any>> {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      ...(status && { status })
    });

    return this.apiCall<PaginationResult<any>>('GET', `/orders/user/${userId}?${params}`);
  }

  /**
   * Update order status (Admin only)
   */
  async updateOrderStatus(
    orderId: string,
    status: string,
    reason?: string,
    notes?: string
  ): Promise<any> {
    return this.apiCall<any>('PUT', `/orders/${orderId}/status`, { status, reason, notes });
  }

  /**
   * Get all orders (Admin only)
   */
  async getAllOrders(
    pagination: PaginationParams = { page: 1, limit: 20 },
    status?: string
  ): Promise<PaginationResult<any>> {
    const params = new URLSearchParams({
      page: pagination.page.toString(),
      limit: pagination.limit.toString(),
      ...(status && { status })
    });

    return this.apiCall<PaginationResult<any>>('GET', `/orders/all?${params}`);
  }

  /**
   * Get order statistics (Admin only)
   */
  async getOrderStats(): Promise<any> {
    return this.apiCall<any>('GET', '/orders/stats');
  }

  // =====================================================
  // UTILITY METHODS
  // =====================================================

  /**
   * Health check for marketplace service
   */
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.apiCall<{ status: string; timestamp: string }>('GET', '/health');
  }

  /**
   * Get API info and available endpoints
   */
  async getApiInfo(): Promise<any> {
    return this.apiCall<any>('GET', '/');
  }

  /**
   * Upload product image (if supported)
   */
  async uploadProductImage(productId: string, imageFile: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', imageFile);

    const token = localStorage.getItem('rabhan_access_token');
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseURL}/products/${productId}/image`, {
      method: 'POST',
      headers,
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to upload image');
    }

    const data = await response.json();
    return data.data || data;
  }

  // =====================================================
  // ANALYTICS & REPORTING
  // =====================================================

  /**
   * Get contractor marketplace analytics
   */
  async getContractorAnalytics(contractorId: string, period: string = '30d'): Promise<any> {
    return this.apiCall<any>('GET', `/analytics/contractor/${contractorId}?period=${period}`);
  }

  /**
   * Get product performance metrics
   */
  async getProductMetrics(productId: string, period: string = '30d'): Promise<any> {
    return this.apiCall<any>('GET', `/analytics/product/${productId}?period=${period}`);
  }

  /**
   * Get marketplace overview (Admin only)
   */
  async getMarketplaceOverview(period: string = '30d'): Promise<any> {
    return this.apiCall<any>('GET', `/analytics/overview?period=${period}`);
  }
}

export const marketplaceService = new MarketplaceService();
export default marketplaceService;