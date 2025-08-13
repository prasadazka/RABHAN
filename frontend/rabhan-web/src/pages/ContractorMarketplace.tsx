import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { contractorService } from '../services/contractor.service';
import { marketplaceService, Product, Category, ProductCreate, ProductCategory } from '../services/marketplace.service';
import { config } from '../config/environment';

// Performance-optimized loading spinner with hardware acceleration
const OptimizedSpinner: React.FC = () => (
  <div style={{
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '2rem',
    willChange: 'transform'
  }}>
    <div style={{
      width: '40px',
      height: '40px',
      border: '4px solid rgba(62, 178, 177, 0.1)',
      borderTop: '4px solid #3eb2b1',
      borderRadius: '50%',
      animation: 'optimizedSpin 0.8s cubic-bezier(0.4, 0, 0.2, 1) infinite',
      transform: 'translateZ(0)',
      backfaceVisibility: 'hidden'
    }}>
      <style>{`
        @keyframes optimizedSpin {
          0% { transform: translateZ(0) rotate(0deg); }
          100% { transform: translateZ(0) rotate(360deg); }
        }
      `}</style>
    </div>
  </div>
);

// Wave Animation Component  
const WaveButton: React.FC<{ children: React.ReactNode; onClick: () => void; style?: any; disabled?: boolean }> = ({ children, onClick, style, disabled }) => {
  const [isAnimating, setIsAnimating] = useState(false);

  const waveButtonStyle = {
    background: `linear-gradient(135deg, #2d8a89 0%, #1f6b6a 100%)`,
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 15px rgba(45, 138, 137, 0.3)',
    transform: 'translateZ(0)',
    willChange: 'transform',
    position: 'relative',
    overflow: 'hidden',
    opacity: disabled ? 0.7 : 1
  };

  const handleClick = () => {
    if (!disabled) {
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 600);
      onClick();
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      style={{
        ...waveButtonStyle,
        ...style
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 8px 25px rgba(45, 138, 137, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 15px rgba(45, 138, 137, 0.3)';
        }
      }}
    >
      {children}
      {isAnimating && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: '0',
            height: '0',
            background: 'rgba(255, 255, 255, 0.3)',
            borderRadius: '50%',
            transform: 'translate(-50%, -50%)',
            animation: 'wave-ripple 0.6s ease-out',
            pointerEvents: 'none'
          }}
        />
      )}
      <style>{`
        @keyframes wave-ripple {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          100% {
            width: 300px;
            height: 300px;
            opacity: 0;
          }
        }
      `}</style>
    </button>
  );
};

// Image compression utility
const compressImage = (file: File, maxWidth: number = 800, quality: number = 0.8): Promise<Blob> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const img = new Image();
    
    img.onload = () => {
      const { width, height } = img;
      const ratio = Math.min(maxWidth / width, maxWidth / height);
      canvas.width = width * ratio;
      canvas.height = height * ratio;
      
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      canvas.toBlob(resolve!, 'image/jpeg', quality);
    };
    
    img.src = URL.createObjectURL(file);
  });
};

// Debounced search hook
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  
  return debouncedValue;
};

// KPI interface
interface KPIMetrics {
  totalProducts: number;
  activeProducts: number;
  pendingApproval: number;
  totalViews: number;
  totalSales: number;
  revenue: number;
  avgRating: number;
  conversionRate: number;
}

// Remove duplicate interfaces since they're imported from marketplace service

interface ContractorMarketplaceProps {
  user: {
    id: string;
    email: string;
    business_name?: string;
    contractorId?: string;
  };
}

interface FilterState {
  search: string;
  category: string;
  brand: string;
  priceRange: [number, number];
  status: string;
  sortBy: 'name' | 'price' | 'created' | 'views';
  sortOrder: 'asc' | 'desc';
  showFilters: boolean;
}

const ContractorMarketplace: React.FC<ContractorMarketplaceProps> = ({ user }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Add CSS animation styles
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  
  // Core state management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'add-product' | 'analytics'>('dashboard');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState<{ id: string; name: string } | null>(null);
  
  // Toast notification state
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({ show: false, message: '', type: 'success' });
  
  // KPI metrics state
  const [kpiMetrics, setKpiMetrics] = useState<KPIMetrics>({
    totalProducts: 0,
    activeProducts: 0,
    pendingApproval: 0,
    totalViews: 0,
    totalSales: 0,
    revenue: 0,
    avgRating: 0,
    conversionRate: 0
  });

  // Calculate KPI metrics based on products
  useEffect(() => {
    if (products.length > 0) {
      console.log('📊 Calculating KPIs for products:', products.length);
      console.log('📊 Sample product status:', products[0]?.status, products[0]?.approvalStatus);
      
      const activeCount = products.filter(p => p.status === 'ACTIVE' && p.approvalStatus === 'APPROVED').length;
      const pendingCount = products.filter(p => p.status === 'PENDING_APPROVAL' || p.approvalStatus === 'PENDING').length;
      
      console.log('📊 Active count:', activeCount);
      console.log('📊 Pending count:', pendingCount);
      
      setKpiMetrics({
        totalProducts: products.length,
        activeProducts: activeCount,
        pendingApproval: pendingCount,
        totalViews: products.reduce((sum, p) => sum + (p.views || 0), 0),
        totalSales: products.reduce((sum, p) => sum + (p.totalSales || 0), 0),
        revenue: products.reduce((sum, p) => sum + ((p.totalSales || 0) * p.price), 0),
        avgRating: products.reduce((sum, p) => sum + (p.averageRating || 0), 0) / products.length || 0,
        conversionRate: products.length > 0 ? (products.reduce((sum, p) => sum + (p.views || 0), 0) > 0 ? (products.reduce((sum, p) => sum + (p.totalSales || 0), 0) / products.reduce((sum, p) => sum + (p.views || 0), 0)) * 100 : 0) : 0
      });
    }
  }, [products]);
  
  // Filter and search state
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    category: '',
    brand: '',
    priceRange: [0, 10000],
    status: '',
    sortBy: 'created',
    sortOrder: 'desc',
    showFilters: false
  });
  
  // Debounced search
  const debouncedSearch = useDebounce(filters.search, 300);
  
  // Form state
  const [existingImages, setExistingImages] = useState<{ id?: string; url?: string; file_url?: string; file_name?: string; sort_order?: number; is_primary?: boolean }[]>([]);
  const [imagesToDelete, setImagesToDelete] = useState<string[]>([]);
  const [formData, setFormData] = useState<Partial<Product> & { images?: File[] }>({
    contractorId: user.contractorId || user.id,
    categoryId: '',
    productCategory: 'SOLAR_PANEL' as ProductCategory,
    name: '',
    nameAr: '',
    description: '',
    descriptionAr: '',
    slug: '',
    brand: '',
    model: '',
    sku: '',
    specifications: {
      // Legacy fields for backward compatibility
      wattage: '',
      efficiency: '',
      warranty: '',
      dimensions: '',
      weight: ''
    },
    price: 0,
    currency: 'SAR',
    vatIncluded: true,
    stockQuantity: 0,
    status: 'DRAFT',
    images: []
  });
  const [formErrors, setFormErrors] = useState<any>({});

  // Optimized styles with hardware acceleration
  const cardStyle = useMemo(() => ({
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(62, 178, 177, 0.2)',
    boxShadow: '0 8px 32px rgba(62, 178, 177, 0.1)',
    padding: '2rem',
    marginBottom: '1.5rem',
    transform: 'translateZ(0)',
    willChange: 'transform',
  }), []);

  const buttonStyle = useMemo(() => ({
    background: `linear-gradient(135deg, #2d8a89 0%, #1f6b6a 100%)`,
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    padding: '12px 24px',
    fontSize: '16px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxShadow: '0 4px 15px rgba(45, 138, 137, 0.3)',
    transform: 'translateZ(0)',
    willChange: 'transform',
    position: 'relative',
    overflow: 'hidden'
  }), []);

  const inputStyle = useMemo(() => ({
    width: '100%',
    padding: '12px 16px',
    borderRadius: '10px',
    border: '2px solid #e5e7eb',
    fontSize: '16px',
    color: '#1a1a1a',
    fontWeight: '500',
    transition: 'all 0.15s ease',
    outline: 'none',
    backgroundColor: 'white',
    willChange: 'border-color, box-shadow',
  }), []);

  const selectStyle = useMemo(() => ({
    ...inputStyle,
    cursor: 'pointer',
    fontWeight: '500',
    color: '#1a1a1a'
  }), [inputStyle]);

  const iconButtonStyle = useMemo(() => ({
    background: 'rgba(62, 178, 177, 0.1)',
    border: '1px solid rgba(62, 178, 177, 0.2)',
    borderRadius: '8px',
    padding: '8px',
    cursor: 'pointer',
    transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transform: 'translateZ(0)',
  }), []);

  // Load initial data
  useEffect(() => {
    loadMarketplaceData();
  }, []);

  const loadMarketplaceData = async () => {
    try {
      setLoading(true);
      
      console.log('📦 Loading marketplace data for contractor:', user.contractorId || user.id);
      
      // Load categories and products using marketplace service
      const [categoriesResult, productsResult] = await Promise.allSettled([
        marketplaceService.getCategories(),
        marketplaceService.getContractorProducts(user.contractorId || user.id, { page: 1, limit: 100 })
      ]);

      // Handle categories
      if (categoriesResult.status === 'fulfilled') {
        setCategories(categoriesResult.value || []);
      } else {
        console.error('Failed to load categories:', categoriesResult.reason);
      }

      // Handle products
      if (productsResult.status === 'fulfilled') {
        console.log('📊 Products loaded:', productsResult.value);
        setProducts(productsResult.value.data || []);
        console.log('📊 Products count:', productsResult.value.data?.length || 0);
      } else {
        console.error('Failed to load products:', productsResult.reason);
      }

    } catch (error) {
      console.error('Error loading marketplace data:', error);
      setError('Failed to load marketplace data');
    } finally {
      setLoading(false);
    }
  };

  // Form handling
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Auto-generate slug from name
    if (field === 'name' && typeof value === 'string') {
      const slug = value.toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      setFormData(prev => ({
        ...prev,
        slug: slug
      }));
    }

    // Clear error for this field
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleSpecificationChange = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value
      }
    }));
  };

  const validateForm = () => {
    const errors: any = {};
    
    if (!formData.name) errors.name = 'Product name is required';
    if (!formData.categoryId) errors.categoryId = 'Category is required';
    if (!formData.brand) errors.brand = 'Brand is required';
    if (!formData.price || formData.price <= 0) errors.price = 'Valid price is required';
    if (!formData.stockQuantity || formData.stockQuantity < 0) errors.stockQuantity = 'Valid stock quantity is required';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Category-to-ProductCategory mapping based on slug
  const getCategoryType = (categoryId: string): ProductCategory => {
    const category = categories.find(c => c.id === categoryId);
    if (!category) return 'SOLAR_PANEL';
    
    const slug = category.slug.toLowerCase();
    if (slug.includes('inverter')) return 'INVERTER';
    if (slug.includes('batter')) return 'BATTERY';
    if (slug.includes('panel') || slug.includes('solar')) return 'SOLAR_PANEL';
    if (slug.includes('system') || slug.includes('full')) return 'FULL_SYSTEM';
    return 'SOLAR_PANEL'; // default
  };

  // Handle category change and update productCategory
  const handleCategoryChange = (categoryId: string) => {
    const productCategory = getCategoryType(categoryId);
    console.log('🔄 Category changed:', { categoryId, productCategory });
    setFormData(prev => ({
      ...prev,
      categoryId,
      productCategory,
      // Clear specifications when category changes
      specifications: {}
    }));
  };

  // Dynamic specification fields based on category
  const getSpecificationFields = (category: ProductCategory) => {
    switch (category) {
      case 'INVERTER':
        return [
          { key: 'model', label: 'Model', placeholder: 'e.g., DFY-3.6KW' },
          { key: 'powerRate', label: 'Power Rate', placeholder: 'e.g., 3.6KW' },
          { key: 'type', label: 'Type', placeholder: 'e.g., Hybrid, Grid-Tie, Off-Grid' },
          { key: 'mppts', label: 'MPPTs', placeholder: 'e.g., 1, 2' },
          { key: 'mpptRange', label: 'MPPT Range (V)', placeholder: 'e.g., 40-450V' },
          { key: 'maxInputCurrent', label: 'Max Input Current (A)', placeholder: 'e.g., 18A' },
          { key: 'outputPhase', label: 'Output Phase', placeholder: 'e.g., 3-phase, single-phase' },
          { key: 'inverterCommunication', label: 'Communication', placeholder: 'e.g., RS485/RS232/USB' },
          { key: 'inverterWeight', label: 'Weight (kg)', placeholder: 'e.g., 6.3' }
        ];
      
      case 'BATTERY':
        return [
          { key: 'model', label: 'Model', placeholder: 'e.g., D-200Ah 12.8V' },
          { key: 'capacity', label: 'Capacity', placeholder: 'e.g., 2.56 KWH' },
          { key: 'voltage', label: 'Voltage', placeholder: 'e.g., 12.8V, 24V, 48V' },
          { key: 'current', label: 'Current (Ah)', placeholder: 'e.g., 200Ah' },
          { key: 'cycleLife', label: 'Cycle Life', placeholder: 'e.g., 6000, 8000' },
          { key: 'batteryCommunication', label: 'Communication', placeholder: 'e.g., Bluetooth, CAN' },
          { key: 'batteryWeight', label: 'Weight (kg)', placeholder: 'e.g., 29.5' },
          { key: 'batteryDimensions', label: 'Dimensions (mm)', placeholder: 'e.g., 270*520*230' }
        ];
      
      case 'SOLAR_PANEL':
        return [
          { key: 'model', label: 'Model', placeholder: 'e.g., Sunny P-450' },
          { key: 'maxPower', label: 'Max Power', placeholder: 'e.g., 450W, 550W' },
          { key: 'bindingSpecifications', label: 'Binding Specs', placeholder: 'e.g., Every 36 pieces' },
          { key: 'efficiency', label: 'Efficiency', placeholder: 'e.g., ≥21.46%' },
          { key: 'panelVoltage', label: 'Operating Voltage', placeholder: 'e.g., 49.3V/work41.5V' },
          { key: 'workingCurrent', label: 'Working Current', placeholder: 'e.g., A ≥10.86' },
          { key: 'workingTemperature', label: 'Operating Temperature', placeholder: 'e.g., -40°C ~ +85°C' },
          { key: 'panelWeight', label: 'Weight', placeholder: 'e.g., 23KG' },
          { key: 'panelDimensions', label: 'Dimensions (mm)', placeholder: 'e.g., 1909 x 1038 x 30 mm' }
        ];
      
      case 'FULL_SYSTEM':
        return [
          { key: 'model', label: 'Model', placeholder: 'e.g., Sunny - 6KW / 16KW' },
          { key: 'systemPower', label: 'System Power', placeholder: 'e.g., 6 KW' },
          { key: 'systemPeak', label: 'Peak Power', placeholder: 'e.g., 12KW' },
          { key: 'cOutput', label: 'AC Output', placeholder: 'e.g., 50Hz/AC220V*2' },
          { key: 'batteryCapacity', label: 'Battery Capacity', placeholder: 'e.g., 16KWH LiFepo4' },
          { key: 'chargingPower', label: 'Charging Power', placeholder: 'e.g., 3.2 KW' },
          { key: 'solarConfiguration', label: 'Solar Configuration', placeholder: 'e.g., 580W*8PS' },
          { key: 'generatingCapacity', label: 'Generating Capacity', placeholder: 'e.g., 22KW 20 square' },
          { key: 'systemDimensions1', label: 'Main Unit Dimensions (mm)', placeholder: 'e.g., 500*280*1080MM' },
          { key: 'systemDimensions2', label: 'Secondary Unit Dimensions (mm)', placeholder: 'e.g., 550*430*1130MM' },
          { key: 'totalWeight', label: 'Total Weight', placeholder: 'e.g., 143KG+285KG' }
        ];
      
      default:
        return [];
    }
  };

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.currentTarget.style.borderColor = '#3eb2b1';
    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(62, 178, 177, 0.15)';
  };

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>, hasError?: boolean) => {
    e.currentTarget.style.borderColor = hasError ? '#ef4444' : '#e5e7eb';
    e.currentTarget.style.boxShadow = 'none';
  };

  const handleSaveProduct = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);
      
      const productData: ProductCreate & { images?: File[] } = {
        contractorId: formData.contractorId!,
        categoryId: formData.categoryId!,
        productCategory: formData.productCategory!,
        name: formData.name!,
        nameAr: formData.nameAr,
        description: formData.description,
        descriptionAr: formData.descriptionAr,
        slug: formData.slug!,
        brand: formData.brand!,
        model: formData.model,
        sku: formData.sku,
        specifications: formData.specifications!,
        price: formData.price!,
        currency: formData.currency!,
        vatIncluded: formData.vatIncluded!,
        stockQuantity: formData.stockQuantity!,
        status: editingProduct ? 'ACTIVE' : formData.status as any, // Set to ACTIVE when editing, keep original status when creating
        images: formData.images || []
      };

      let result;
      if (editingProduct) {
        // Update existing product
        console.log('🚀 Updating product with data:', productData);
        result = await marketplaceService.updateProduct(editingProduct.id!, productData);
        console.log('✅ Product updated successfully:', result);
        
        // Handle image changes if any
        if (imagesToDelete.length > 0 || (formData.images && formData.images.length > 0)) {
          console.log('🖼️ Updating images: deleting', imagesToDelete.length, 'adding', formData.images?.length || 0);
          await marketplaceService.updateProductImages(
            editingProduct.id!,
            imagesToDelete,
            formData.images || []
          );
          
          // Refetch the product to get updated image data
          result = await marketplaceService.getProductById(editingProduct.id!);
        }
        
        // Update products list with updated product
        setProducts(prev => {
          console.log('📝 Updating products list for edit, previous count:', prev.length);
          console.log('🖼️ Updated product result:', result);
          return prev.map(p => p.id === editingProduct.id ? result : p);
        });
        
        showToast('Product updated successfully!', 'success');
      } else {
        // Create new product
        console.log('🚀 Creating product with data:', productData);
        result = await marketplaceService.createProduct(productData);
        console.log('✅ Product created successfully:', result);
        
        // Validate response data
        if (!result || !result.id) {
          throw new Error('Invalid product data returned from server');
        }
        
        // Update products list with new product
        setProducts(prev => {
          console.log('📝 Updating products list for create, previous count:', prev.length);
          return [result, ...prev];
        });
        
        showToast('Product created successfully!', 'success');
      }
      
      // Clear any previous errors
      setError('');
      
      console.log('🔄 Resetting form...');
      
      // Reset editing state and form
      setEditingProduct(null);
      setExistingImages([]);
      setImagesToDelete([]);
      setFormData({
        contractorId: user.contractorId || user.id,
        categoryId: '',
        productCategory: 'SOLAR_PANEL' as ProductCategory,
        name: '',
        nameAr: '',
        description: '',
        descriptionAr: '',
        slug: '',
        brand: '',
        model: '',
        sku: '',
        specifications: {
          // Legacy fields for backward compatibility
          wattage: '',
          efficiency: '',
          warranty: '',
          dimensions: '',
          weight: ''
        },
        price: 0,
        currency: 'SAR',
        vatIncluded: true,
        stockQuantity: 0,
        status: 'DRAFT',
        images: []
      });
      setFormErrors({});
      
      // Switch to products tab to show the new product
      console.log('🔀 Switching to products tab...');
      setTimeout(() => {
        setActiveTab('products');
        console.log('✅ Switched to products tab');
      }, 100);
      
    } catch (error: any) {
      console.error(`Error ${editingProduct ? 'updating' : 'creating'} product:`, error);
      const errorMessage = error.message || `Failed to ${editingProduct ? 'update' : 'create'} product`;
      setError(errorMessage);
      showToast(errorMessage, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async (productId: string) => {
    try {
      const updatedProduct = await marketplaceService.submitProductForApproval(productId);
      
      // Update product status in state
      setProducts(prev => prev.map(p => 
        p.id === productId ? updatedProduct : p
      ));
      
      // Show success toast
      const productName = products.find(p => p.id === productId)?.name || 'Product';
      showToast(`"${productName}" has been submitted for approval`, 'success');
      
    } catch (error: any) {
      console.error('Error submitting for approval:', error);
      showToast(error.message || 'Failed to submit for approval', 'error');
    }
  };

  const getStatusColor = (status: string, approvalStatus: string) => {
    if (status === 'ACTIVE' && approvalStatus === 'APPROVED') return '#22c55e'; // Green
    if (status === 'PENDING_APPROVAL' || approvalStatus === 'PENDING') return '#f59e0b'; // Yellow
    if (approvalStatus === 'REJECTED') return '#ef4444'; // Red
    if (approvalStatus === 'CHANGES_REQUIRED') return '#f97316'; // Orange
    return '#6b7280'; // Gray
  };

  const getStatusText = (status: string, approvalStatus: string) => {
    if (status === 'ACTIVE' && approvalStatus === 'APPROVED') return 'Active & Approved';
    if (status === 'PENDING_APPROVAL' || approvalStatus === 'PENDING') return 'Pending Approval';
    if (approvalStatus === 'REJECTED') return 'Rejected';
    if (approvalStatus === 'CHANGES_REQUIRED') return 'Changes Required';
    if (status === 'DRAFT') return 'Draft';
    return 'Inactive';
  };

  // Product action handlers

  const handleEditProduct = (product: Product) => {
    console.log('📝 Editing product:', product.name);
    
    // Set editing mode
    setEditingProduct(product);
    
    // Set existing images for display
    console.log('🖼️ Product images for editing:', product.images);
    console.log('🔧 Config object:', config);
    setExistingImages(product.images || []);
    
    // Pre-fill form with product data
    setFormData({
      contractorId: product.contractorId,
      categoryId: product.categoryId,
      productCategory: product.productCategory || getCategoryType(product.categoryId),
      name: product.name,
      nameAr: product.nameAr || '',
      description: product.description || '',
      descriptionAr: product.descriptionAr || '',
      slug: product.slug,
      brand: product.brand,
      model: product.model || '',
      sku: product.sku || '',
      specifications: product.specifications || {
        wattage: '',
        efficiency: '',
        warranty: '',
        dimensions: '',
        weight: ''
      },
      price: product.price,
      currency: product.currency,
      vatIncluded: product.vatIncluded,
      stockQuantity: product.stockQuantity,
      status: product.status,
      images: []
    });
    
    // Switch to add-product tab for editing
    setActiveTab('add-product');
    showToast('Product loaded for editing', 'info');
  };

  const handleCancelEdit = () => {
    setEditingProduct(null);
    setExistingImages([]);
    setImagesToDelete([]);
    // Reset form to empty state
    setFormData({
      contractorId: user.contractorId || user.id,
      categoryId: '',
      productCategory: 'SOLAR_PANEL' as ProductCategory,
      name: '',
      nameAr: '',
      description: '',
      descriptionAr: '',
      slug: '',
      brand: '',
      model: '',
      sku: '',
      specifications: {
        // Legacy fields for backward compatibility
        wattage: '',
        efficiency: '',
        warranty: '',
        dimensions: '',
        weight: ''
      },
      price: 0,
      currency: 'SAR',
      vatIncluded: true,
      stockQuantity: 0,
      status: 'DRAFT',
      images: []
    });
    setFormErrors({});
    showToast('Edit cancelled', 'info');
  };

  const handleDeleteExistingImage = (imageId: string) => {
    // Add to delete list
    setImagesToDelete(prev => [...prev, imageId]);
    // Remove from existing images display
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
    showToast('Image marked for deletion', 'info');
  };

  const handleRestoreExistingImage = (imageId: string) => {
    // Remove from delete list
    setImagesToDelete(prev => prev.filter(id => id !== imageId));
    // Add back to display (we need to get it from original product data)
    if (editingProduct && editingProduct.images) {
      const originalImage = editingProduct.images.find(img => img.id === imageId);
      if (originalImage) {
        setExistingImages(prev => [...prev, originalImage]);
      }
    }
    showToast('Image deletion cancelled', 'info');
  };

  const handleSetPrimaryImage = async (imageId: string, isPrimary: boolean) => {
    if (!editingProduct) return;
    
    try {
      // Update primary status via API
      await marketplaceService.setPrimaryImage(editingProduct.id!, imageId, isPrimary);
      
      // Update existing images state
      setExistingImages(prev => prev.map(img => ({
        ...img,
        is_primary: img.id === imageId ? isPrimary : false // Only one primary image
      })));
      
      showToast(isPrimary ? 'Set as featured image' : 'Removed as featured image', 'success');
    } catch (error: any) {
      console.error('Error setting primary image:', error);
      showToast('Failed to set featured image', 'error');
    }
  };

  const handleDeleteProduct = (productId: string, productName: string) => {
    setProductToDelete({ id: productId, name: productName });
    setShowDeleteModal(true);
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    
    try {
      console.log('🗑️ Deleting product:', productToDelete.id);
      await marketplaceService.deleteProduct(productToDelete.id);
      
      // Remove product from local state
      setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
      
      console.log('✅ Product deleted successfully');
      
      // Show success toast
      showToast(`"${productToDelete.name}" has been deleted successfully`, 'success');
      
      // Close modal and reset state
      setShowDeleteModal(false);
      setProductToDelete(null);
    } catch (error: any) {
      console.error('❌ Error deleting product:', error);
      
      // Show error toast
      showToast(error.message || 'Failed to delete product', 'error');
      
      // Close modal on error too
      setShowDeleteModal(false);
      setProductToDelete(null);
    }
  };

  const cancelDeleteProduct = () => {
    setShowDeleteModal(false);
    setProductToDelete(null);
  };

  // Toast helper function
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ show: true, message, type });
    
    // Auto-hide toast after 4 seconds
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 4000);
  };

  if (loading) {
    return (
      <div style={{ 
        direction: isRTL ? 'rtl' : 'ltr', 
        padding: '2rem', 
        textAlign: 'center',
        minHeight: '60vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center'
      }}>
        <OptimizedSpinner />
        <p style={{ 
          marginTop: '1rem', 
          color: theme.colors.primary,
          fontSize: '16px',
          fontWeight: '500'
        }}>
          {t('contractorApp.marketplace.loading', 'Loading marketplace...')}
        </p>
      </div>
    );
  }

  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{
          fontSize: '2rem',
          fontWeight: '700',
          color: '#1a1a1a',
          marginBottom: '0.5rem',
          textAlign: isRTL ? 'right' : 'left'
        }}>
          {t('contractorApp.marketplace.title', 'Product Marketplace')}
        </h1>
        <p style={{ color: `${theme.colors.primary}99`, fontSize: '1.1rem', fontWeight: '500' }}>
          {t('contractorApp.marketplace.subtitle', 'Manage your solar products and track sales')}
        </p>
      </div>

      {error && (
        <div style={{
          background: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
          border: '1px solid #fecaca',
          borderRadius: '12px',
          padding: '1rem',
          marginBottom: '1.5rem',
          color: '#dc2626'
        }}>
          {error}
        </div>
      )}

      {/* Bold Navigation Menu */}
      <div style={{
        display: 'flex',
        gap: '12px',
        marginBottom: '2rem',
        flexWrap: 'wrap'
      }}>
        {[
          { 
            key: 'dashboard', 
            label: 'Dashboard',
            icon: 'M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z',
            color: '#2d5a87'
          },
          { 
            key: 'products', 
            label: 'My Products',
            icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10',
            color: '#5a7c7c'
          },
          { 
            key: 'add-product', 
            label: 'Add Product',
            icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
            color: '#6a9c89'
          },
          { 
            key: 'analytics', 
            label: 'Analytics',
            icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
            color: '#8b7355'
          }
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            style={{
              flex: '1 1 200px',
              minWidth: '180px',
              padding: '20px 16px',
              border: `2px solid ${tab.color}`,
              borderRadius: '16px',
              background: activeTab === tab.key ? tab.color : 'white',
              color: activeTab === tab.key ? 'white' : tab.color,
              fontWeight: '700',
              cursor: 'pointer',
              fontSize: '16px',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px',
              boxShadow: activeTab === tab.key 
                ? `0 4px 15px rgba(${tab.color === '#1e40af' ? '30, 64, 175' : tab.color === '#0891b2' ? '8, 145, 178' : tab.color === '#059669' ? '5, 150, 105' : '124, 58, 237'}, 0.2)`
                : `0 2px 8px rgba(${tab.color === '#1e40af' ? '30, 64, 175' : tab.color === '#0891b2' ? '8, 145, 178' : tab.color === '#059669' ? '5, 150, 105' : '124, 58, 237'}, 0.1)`,
              transform: activeTab === tab.key ? 'translateY(-2px) scale(1.02)' : 'translateY(0) scale(1)',
              minHeight: '120px',
              justifyContent: 'center'
            }}
            onMouseEnter={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.transform = 'translateY(-3px)';
                e.currentTarget.style.borderWidth = '3px';
                // Animate icon
                const svg = e.currentTarget.querySelector('svg');
                if (svg) {
                  svg.style.transform = 'scale(1.15) rotate(5deg)';
                  svg.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                }
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== tab.key) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.borderWidth = '2px';
                // Reset icon
                const svg = e.currentTarget.querySelector('svg');
                if (svg) {
                  svg.style.transform = 'scale(1) rotate(0deg)';
                  svg.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                }
              }
            }}
          >
            <svg 
              width="28" 
              height="28" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              <path d={tab.icon} />
            </svg>
            <div style={{
              fontSize: '16px',
              lineHeight: '1.3',
              fontWeight: '800'
            }}>
              {tab.label}
            </div>
          </button>
        ))}
      </div>

      {/* Dashboard Section */}
      {activeTab === 'dashboard' && (
        <div>
          {/* KPI Cards */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem'
          }}>
            {[
              {
                title: 'Total Products',
                value: kpiMetrics.totalProducts,
                icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10',
                color: '#1e40af',
                subtitle: 'All products',
                gradient: 'linear-gradient(135deg, #1e40af 0%, #1d4ed8 100%)'
              },
              {
                title: 'Active Products',
                value: kpiMetrics.activeProducts,
                icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
                color: '#22c55e',
                subtitle: 'Live on marketplace',
                gradient: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)'
              },
              {
                title: 'Pending Approval',
                value: kpiMetrics.pendingApproval,
                icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z',
                color: '#f59e0b',
                subtitle: 'Awaiting review',
                gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
              },
              {
                title: 'Revenue',
                value: `${kpiMetrics.revenue.toLocaleString()} SAR`,
                icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1',
                color: '#06b6d4',
                subtitle: 'Total earnings',
                gradient: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)'
              }
            ].map((kpi, index) => (
              <div
                key={index}
                style={{
                  ...cardStyle,
                  padding: '1.5rem',
                  background: 'rgba(255, 255, 255, 0.95)',
                  border: `1px solid ${kpi.color}20`,
                  position: 'relative',
                  overflow: 'hidden',
                  cursor: 'default',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.border = `2px solid ${kpi.color}`;
                  
                  // Animate icon
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) {
                    svg.style.transform = 'scale(1.2) rotate(10deg)';
                    svg.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                  }
                  
                  // Animate value
                  const valueElement = e.currentTarget.querySelector('[data-kpi-value]');
                  if (valueElement) {
                    valueElement.style.transform = 'scale(1.1)';
                    valueElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.border = `1px solid ${kpi.color}20`;
                  
                  // Reset icon
                  const svg = e.currentTarget.querySelector('svg');
                  if (svg) {
                    svg.style.transform = 'scale(1) rotate(0deg)';
                    svg.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                  }
                  
                  // Reset value
                  const valueElement = e.currentTarget.querySelector('[data-kpi-value]');
                  if (valueElement) {
                    valueElement.style.transform = 'scale(1)';
                    valueElement.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
                  }
                }}
              >
                <div style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '4px',
                  background: kpi.gradient
                }} />
                
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{
                    width: '56px',
                    height: '56px',
                    background: `linear-gradient(135deg, ${kpi.color}20 0%, ${kpi.color}10 100%)`,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: `2px solid ${kpi.color}30`,
                    boxShadow: `0 4px 12px ${kpi.color}20`
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={kpi.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d={kpi.icon} />
                    </svg>
                  </div>
                  
                  <div style={{ flex: 1 }}>
                    <p style={{
                      margin: 0,
                      color: `${kpi.color}CC`,
                      fontSize: '14px',
                      fontWeight: '600'
                    }}>
                      {kpi.title}
                    </p>
                    <p 
                      data-kpi-value
                      style={{
                        margin: '4px 0 0 0',
                        background: kpi.gradient,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        backgroundClip: 'text',
                        fontSize: '28px',
                        fontWeight: '800',
                        lineHeight: 1,
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                      }}>
                      {kpi.value}
                    </p>
                    <p style={{
                      margin: '4px 0 0 0',
                      color: `${kpi.color}99`,
                      fontSize: '13px',
                      fontWeight: '500'
                    }}>
                      {kpi.subtitle}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Quick Actions */}
          <div style={cardStyle}>
            <h2 style={{ 
              fontSize: '1.25rem', 
              fontWeight: '700', 
              color: '#1a1a1a',
              marginBottom: '1.5rem' 
            }}>
              Quick Actions
            </h2>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '1.5rem'
            }}>
              {[
                {
                  title: 'Add New Product',
                  subtitle: 'Create a new solar product',
                  icon: 'M12 6v6m0 0v6m0-6h6m-6 0H6',
                  color: '#1e40af',
                  action: () => setActiveTab('add-product')
                },
                {
                  title: 'View All Products',
                  subtitle: 'Manage your product catalog',
                  icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10',
                  color: '#22c55e',
                  action: () => setActiveTab('products')
                },
                {
                  title: 'Analytics Dashboard',
                  subtitle: 'View performance metrics',
                  icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                  color: '#8b5cf6',
                  action: () => setActiveTab('analytics')
                }
              ].map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  style={{
                    background: 'white',
                    border: `3px solid ${action.color}`,
                    borderRadius: '16px',
                    padding: '2rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-start',
                    gap: '12px',
                    minHeight: '180px',
                    boxShadow: `0 4px 12px ${action.color}20`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = `0 8px 25px ${action.color}40`;
                    e.currentTarget.style.background = action.color;
                    const title = e.currentTarget.querySelector('h3');
                    const subtitle = e.currentTarget.querySelector('p');
                    if (title) title.style.color = 'white';
                    if (subtitle) subtitle.style.color = 'white';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 4px 12px ${action.color}20`;
                    e.currentTarget.style.background = 'white';
                    const title = e.currentTarget.querySelector('h3');
                    const subtitle = e.currentTarget.querySelector('p');
                    if (title) title.style.color = action.color;
                    if (subtitle) subtitle.style.color = action.color;
                  }}
                >
                  <div style={{
                    width: '60px',
                    height: '60px',
                    background: action.color,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '16px',
                    boxShadow: `0 4px 12px ${action.color}30`
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d={action.icon} />
                    </svg>
                  </div>
                  
                  <h3 style={{
                    margin: 0,
                    fontSize: '18px',
                    fontWeight: '700',
                    color: action.color,
                    transition: 'color 0.2s ease',
                    marginBottom: '8px'
                  }}>
                    {action.title}
                  </h3>
                  
                  <p style={{
                    margin: 0,
                    fontSize: '14px',
                    color: action.color,
                    lineHeight: 1.5,
                    fontWeight: '500',
                    transition: 'color 0.2s ease'
                  }}>
                    {action.subtitle}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Products Section */}
      {activeTab === 'products' && (
        <div style={cardStyle}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '2rem'
          }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
              {t('contractorApp.marketplace.myProducts', 'My Products')} ({products.length})
            </h2>
            <WaveButton
              onClick={() => setActiveTab('add-product')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {t('contractorApp.marketplace.addNewProduct', 'Add New Product')}
            </WaveButton>
          </div>

          {products.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '4rem 2rem',
              color: '#6b7280'
            }}>
              <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem' }}>
                {t('contractorApp.marketplace.noProducts', 'No products yet')}
              </h3>
              <p style={{ marginBottom: '2rem' }}>
                {t('contractorApp.marketplace.getStarted', 'Start by adding your first solar product to the marketplace')}
              </p>
              <WaveButton
                onClick={() => setActiveTab('add-product')}
              >
                {t('contractorApp.marketplace.addFirstProduct', 'Add Your First Product')}
              </WaveButton>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '1.5rem'
            }}>
              {products.map(product => (
                <div
                  key={product.id}
                  style={{
                    background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
                    border: '1px solid #e5e7eb',
                    borderRadius: '16px',
                    padding: '0',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                >
                  {/* Product Image */}
                  <div style={{
                    width: '100%',
                    height: '200px',
                    background: product.imageUrl ? `url(${product.imageUrl})` : 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    {!product.imageUrl && (
                      <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                      </svg>
                    )}
                    
                    {/* Product Status Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: getStatusColor(product.status, product.approvalStatus),
                      color: 'white',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      fontSize: '12px',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}>
                      {getStatusText(product.status, product.approvalStatus)}
                    </div>
                  </div>

                  <div style={{ padding: '1.5rem' }}>
                    <h3 style={{
                      fontSize: '1.25rem',
                      fontWeight: '600',
                      color: '#1a1a1a',
                      marginBottom: '0.5rem'
                    }}>
                      {product.name}
                    </h3>
                    
                    <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '1rem' }}>
                      {product.brand} {product.model && `• ${product.model}`}
                    </p>

                    {product.description && (
                      <p style={{
                        color: '#4b5563',
                        fontSize: '14px',
                        marginBottom: '1rem',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {product.description}
                      </p>
                    )}

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '1rem'
                    }}>
                      <div>
                        <span style={{
                          fontSize: '1.5rem',
                          fontWeight: '700',
                          color: theme.colors.primary
                        }}>
                          {product.price.toLocaleString()} {product.currency}
                        </span>
                        {product.vatIncluded && (
                          <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '4px' }}>
                            (inc. VAT)
                          </span>
                        )}
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div style={{
                          fontSize: '14px',
                          color: product.stockQuantity > 10 ? '#22c55e' : 
                                product.stockQuantity > 0 ? '#f59e0b' : '#ef4444',
                          fontWeight: '600'
                        }}>
                          {product.stockStatus ? product.stockStatus.replace(/_/g, ' ') : 'Unknown'}
                        </div>
                        <div style={{ fontSize: '12px', color: '#6b7280' }}>
                          {product.stockQuantity} in stock
                        </div>
                      </div>
                    </div>

                    {/* Product Actions */}
                    <div style={{
                      display: 'flex',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}>
                      {product.status === 'DRAFT' && (
                        <button
                          onClick={() => handleSubmitForApproval(product.id!)}
                          style={{
                            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer'
                          }}
                        >
                          Submit for Approval
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleEditProduct(product)}
                        style={{
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          boxShadow: '0 2px 8px rgba(245, 158, 11, 0.3)',
                          transition: 'all 0.15s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'translateY(-1px)';
                          e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'translateY(0)';
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(245, 158, 11, 0.3)';
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#e5e7eb';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#f3f4f6';
                        }}
                      >
                        Edit
                      </button>
                      
                      <button
                        onClick={() => handleDeleteProduct(product.id!, product.name)}
                        style={{
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: '600',
                          cursor: 'pointer'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#dc2626';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#ef4444';
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Product Section */}
      {activeTab === 'add-product' && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1a1a1a', margin: 0 }}>
              {editingProduct 
                ? t('contractorApp.marketplace.editProduct', `Edit Product: ${editingProduct.name}`)
                : t('contractorApp.marketplace.addNewProduct', 'Add New Product')
              }
            </h2>
            {editingProduct && (
              <button
                onClick={handleCancelEdit}
                style={{
                  background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(107, 114, 128, 0.3)'
                }}
              >
                Cancel Edit
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setFormData({
                  contractorId: user.contractorId || user.id,
                  categoryId: '33333333-3333-3333-3333-333333333333', // Solar Panels UUID (from migration)
                  productCategory: 'SOLAR_PANEL' as ProductCategory,
                  name: 'Sunny P-450 High Efficiency Solar Panel',
                  nameAr: 'لوحة شمسية عالية الكفاءة صني P-450',
                  description: 'Premium monocrystalline solar panel with excellent efficiency and durability. Perfect for residential and commercial installations.',
                  descriptionAr: 'لوحة شمسية أحادية البلورة عالية الجودة مع كفاءة ممتازة ومتانة. مثالية للتركيبات السكنية والتجارية.',
                  slug: 'sunny-p-450-high-efficiency-solar-panel',
                  brand: 'Sunny',
                  model: 'P-450',
                  sku: 'SUNNY-P450-001',
                  specifications: {
                    model: 'Sunny P-450',
                    maxPower: '450W',
                    bindingSpecifications: 'Every 36 pieces',
                    efficiency: '≥21.46%',
                    panelVoltage: '49.3V/work41.5V',
                    workingCurrent: 'A ≥10.86',
                    workingTemperature: '-40°C ~ +85°C',
                    panelWeight: '23KG',
                    panelDimensions: '1909 x 1038 x 30 mm',
                    warranty: '25 years'
                  },
                  price: 850,
                  currency: 'SAR',
                  vatIncluded: true,
                  stockQuantity: 50,
                  status: 'DRAFT' as const
                });
              }}
              style={{
                background: '#3eb2b1',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '0.5rem 1rem',
                fontSize: '0.875rem',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = '#2d8a89'}
              onMouseLeave={(e) => e.currentTarget.style.background = '#3eb2b1'}
            >
              Fill Sample Data
            </button>
          </div>

          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {/* Basic Information */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem' }}>
                Basic Information
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    Product Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, !!formErrors.name)}
                    style={{
                      ...inputStyle,
                      borderColor: formErrors.name ? '#ef4444' : '#e5e7eb'
                    }}
                    placeholder="e.g., Premium Solar Panel 400W"
                  />
                  {formErrors.name && (
                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.name}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    Product Name (Arabic)
                  </label>
                  <input
                    type="text"
                    value={formData.nameAr || ''}
                    onChange={(e) => handleInputChange('nameAr', e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, false)}
                    style={inputStyle}
                    placeholder="اسم المنتج بالعربية"
                    dir="rtl"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    Category *
                  </label>
                  <select
                    value={formData.categoryId || ''}
                    onChange={(e) => handleCategoryChange(e.target.value)}
                    className="custom-select"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      borderRadius: '10px',
                      border: '2px solid #e5e7eb',
                      fontSize: '16px',
                      color: '#1a1a1a',
                      fontWeight: '500',
                      transition: 'all 0.15s ease',
                      outline: 'none',
                      backgroundColor: 'white',
                      cursor: 'pointer',
                      borderColor: formErrors.categoryId ? '#ef4444' : '#e5e7eb'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#3eb2b1';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(62, 178, 177, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = formErrors.categoryId ? '#ef4444' : '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onFocus={(e) => {
                      e.currentTarget.style.borderColor = '#3eb2b1';
                      e.currentTarget.style.boxShadow = '0 0 0 3px rgba(62, 178, 177, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.currentTarget.style.borderColor = formErrors.categoryId ? '#ef4444' : '#e5e7eb';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <option value="" style={{ color: '#6b7280' }}>Select Category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id} style={{ color: '#1a1a1a' }}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {formErrors.categoryId && (
                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.categoryId}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    Brand *
                  </label>
                  <input
                    type="text"
                    value={formData.brand || ''}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, !!formErrors.brand)}
                    style={{
                      ...inputStyle,
                      borderColor: formErrors.brand ? '#ef4444' : '#e5e7eb'
                    }}
                    placeholder="e.g., JinkoSolar, Canadian Solar"
                  />
                  {formErrors.brand && (
                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.brand}
                    </p>
                  )}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    Model
                  </label>
                  <input
                    type="text"
                    value={formData.model || ''}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, false)}
                    style={inputStyle}
                    placeholder="e.g., JKM400M-54HL4-V"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku || ''}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, false)}
                    style={inputStyle}
                    placeholder="Product SKU"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, false)}
                    style={inputStyle}
                    placeholder="product-url-slug"
                  />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  Description
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={(e) => handleInputBlur(e, false)}
                  style={{
                    ...inputStyle,
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                  placeholder="Detailed product description..."
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                  Description (Arabic)
                </label>
                <textarea
                  value={formData.descriptionAr || ''}
                  onChange={(e) => handleInputChange('descriptionAr', e.target.value)}
                  onFocus={handleInputFocus}
                  onBlur={(e) => handleInputBlur(e, false)}
                  style={{
                    ...inputStyle,
                    minHeight: '100px',
                    resize: 'vertical'
                  }}
                  placeholder="وصف مفصل للمنتج..."
                  dir="rtl"
                />
              </div>
            </div>

            {/* Dynamic Technical Specifications Based on Category */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem' }}>
                Technical Specifications
                {formData.productCategory && (
                  <span style={{ 
                    fontSize: '0.85rem', 
                    fontWeight: '400', 
                    color: '#6b7280', 
                    marginLeft: '0.5rem' 
                  }}>
                    ({formData.productCategory.replace('_', ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())})
                  </span>
                )}
              </h3>
              
              {!formData.categoryId ? (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  color: '#ef4444',
                  background: 'rgba(254, 242, 242, 0.8)',
                  borderRadius: '12px',
                  border: '3px dashed #ef4444',
                  fontSize: '1.1rem',
                  fontWeight: '600'
                }}>
                  <p style={{ margin: 0 }}>
                    ⚠️ DYNAMIC FORM ACTIVE ⚠️<br/>
                    Please select a product category to see relevant specification fields<br/>
                    <span style={{ fontSize: '0.9rem', color: '#6b7280', fontWeight: '400' }}>
                      (This will show different fields for Inverters, Batteries, Solar Panels, or Full Systems)
                    </span>
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
                  {getSpecificationFields(formData.productCategory || 'SOLAR_PANEL').map((field) => (
                    <div key={field.key}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                        {field.label}
                      </label>
                      <input
                        type="text"
                        value={formData.specifications?.[field.key] || ''}
                        onChange={(e) => handleSpecificationChange(field.key, e.target.value)}
                        onFocus={handleInputFocus}
                        onBlur={(e) => handleInputBlur(e, false)}
                        style={{
                          ...inputStyle,
                          transition: 'all 0.2s ease'
                        }}
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                  
                  {/* Common warranty field for all categories */}
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                      Warranty
                    </label>
                    <input
                      type="text"
                      value={formData.specifications?.warranty || ''}
                      onChange={(e) => handleSpecificationChange('warranty', e.target.value)}
                      onFocus={handleInputFocus}
                      onBlur={(e) => handleInputBlur(e, false)}
                      style={{
                        ...inputStyle,
                        transition: 'all 0.2s ease'
                      }}
                      placeholder="e.g., 25 years, 5 years, 10 years"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Product Images */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '0.5rem' }}>
                Product Images
              </h3>
              <p style={{ 
                fontSize: '0.875rem', 
                color: '#6b7280', 
                marginBottom: '1rem',
                lineHeight: '1.4'
              }}>
                Upload high-quality images (recommended: 800x600px minimum, max 5MB per image, JPEG/PNG format)
              </p>
              
              <div style={{ marginBottom: '1.5rem' }}>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    if (e.target.files) {
                      const newImages = Array.from(e.target.files);
                      setFormData(prev => ({
                        ...prev,
                        images: [...(prev.images || []), ...newImages]
                      }));
                    }
                  }}
                />
                
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    background: 'white',
                    border: '2px dashed #3eb2b1',
                    borderRadius: '12px',
                    padding: '2rem',
                    width: '100%',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${theme.colors.primary}05`;
                    e.currentTarget.style.borderColor = theme.colors.primary;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'white';
                    e.currentTarget.style.borderColor = '#3eb2b1';
                  }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21,15 16,10 5,21"/>
                  </svg>
                  <div style={{ textAlign: 'center' }}>
                    <p style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: theme.colors.primary }}>
                      Click to upload product images
                    </p>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                      PNG, JPG up to 5MB each
                    </p>
                  </div>
                </button>
                
                {/* Existing Images (Edit Mode) */}
                {editingProduct && existingImages && existingImages.length > 0 && config?.marketplaceApiUrl && (
                  <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                    <h4 style={{ 
                      fontSize: '1rem', 
                      fontWeight: '600', 
                      color: '#1a1a1a', 
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <polyline points="21,15 16,10 5,21"/>
                      </svg>
                      Current Images ({existingImages.length})
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                      gap: '12px'
                    }}>
                      {existingImages.map((image, index) => {
                        try {
                          // Check if file_url is already a complete URL
                          let imageUrl;
                          if (image.file_url && image.file_url.startsWith('http')) {
                            // Already a complete URL
                            imageUrl = image.file_url;
                          } else if (image.file_url) {
                            // Relative path, construct full URL
                            const baseUrl = config?.marketplaceApiUrl?.replace('/api/v1', '') || 'http://localhost:3007';
                            imageUrl = `${baseUrl}${image.file_url}`;
                          } else {
                            // Fallback to image.url
                            imageUrl = image.url;
                          }
                          
                          console.log('🖼️ Constructing image URL:', { image, imageUrl });
                        
                        return (
                          <div
                            key={`existing-${index}`}
                            style={{
                              position: 'relative',
                              aspectRatio: '1',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              border: '2px solid #10b981',
                              boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)'
                            }}
                          >
                            <img
                              src={imageUrl}
                              alt={`Existing image ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                              onError={(e) => {
                                console.log('🖼️ Image load error:', imageUrl);
                                e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3QgeD0iMyIgeT0iMyIgd2lkdGg9IjE4IiBoZWlnaHQ9IjE4IiByeD0iMiIgcnk9IjIiIHN0cm9rZT0iIzZiNzI4MCIgZmlsbD0iI2Y5ZmFmYiIvPgo8Y2lyY2xlIGN4PSI4LjUiIGN5PSI4LjUiIHI9IjEuNSIgZmlsbD0iIzZiNzI4MCIvPgo8cG9seWxpbmUgcG9pbnRzPSIyMSwxNSAxNiwxMCA1LDIxIiBzdHJva2U9IiM2YjcyODAiLz4KPHN2Zz4K';
                              }}
                            />
                            {/* Delete button for existing image */}
                            <button
                              type="button"
                              onClick={() => handleDeleteExistingImage(image.id!)}
                              style={{
                                position: 'absolute',
                                top: '4px',
                                right: '4px',
                                background: 'rgba(239, 68, 68, 0.9)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title="Delete this image"
                            >
                              ×
                            </button>
                            
                            {/* Featured image star badge */}
                            {image.is_primary && (
                              <div style={{
                                position: 'absolute',
                                top: '4px',
                                left: '4px',
                                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                                color: 'white',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: '600',
                                boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                              }}
                              title="Featured Image"
                            >
                              ⭐
                            </div>
                            )}
                            
                            {/* Set as featured button */}
                            <button
                              type="button"
                              onClick={() => handleSetPrimaryImage(image.id!, !image.is_primary)}
                              style={{
                                position: 'absolute',
                                bottom: '4px',
                                left: '4px',
                                right: '4px',
                                background: image.is_primary 
                                  ? 'rgba(239, 68, 68, 0.9)' 
                                  : 'rgba(245, 158, 11, 0.9)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 4px',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title={image.is_primary ? "Remove as featured" : "Set as featured"}
                            >
                              {image.is_primary ? '⭐ Featured' : 'Set Featured'}
                            </button>
                            
                            {/* Current image indicator - moved up to avoid button conflict */}
                            <div style={{
                              position: 'absolute',
                              bottom: '28px',
                              right: '4px',
                              background: 'rgba(16, 185, 129, 0.9)',
                              color: 'white',
                              borderRadius: '50%',
                              width: '16px',
                              height: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '10px',
                              fontWeight: '600'
                            }}>
                              ✓
                            </div>
                          </div>
                        );
                        } catch (error) {
                          console.error('❌ Error rendering existing image:', error, image);
                          return null;
                        }
                      })}
                    </div>
                  </div>
                )}
                
                {/* New Image Previews */}
                {formData.images && formData.images.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <h4 style={{ 
                      fontSize: '1rem', 
                      fontWeight: '600', 
                      color: '#1a1a1a', 
                      marginBottom: '12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                        <circle cx="12" cy="13" r="3"/>
                      </svg>
                      New Images ({formData.images.length})
                    </h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
                      gap: '12px'
                    }}>
                    {formData.images.map((image, index) => (
                      <div
                        key={index}
                        style={{
                          position: 'relative',
                          aspectRatio: '1',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '2px solid #e5e7eb'
                        }}
                      >
                        <img
                          src={URL.createObjectURL(image)}
                          alt={`Product ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        {/* Delete button for new image */}
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              images: prev.images?.filter((_, i) => i !== index)
                            }));
                          }}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(239, 68, 68, 0.9)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: '600'
                          }}
                          title="Remove this image"
                        >
                          ×
                        </button>
                        
                        {/* Set as featured for new images */}
                        {!editingProduct && (
                          <div
                            style={{
                              position: 'absolute',
                              bottom: '4px',
                              left: '4px',
                              right: '4px',
                              textAlign: 'center'
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => {
                                // For new products, mark this image as primary by adding a property to the file
                                const updatedImages = formData.images?.map((img, i) => {
                                  if (i === index) {
                                    (img as any).willBePrimary = !(img as any).willBePrimary;
                                  } else {
                                    (img as any).willBePrimary = false; // Only one primary
                                  }
                                  return img;
                                });
                                setFormData(prev => ({ ...prev, images: updatedImages }));
                                showToast((image as any).willBePrimary ? 'Removed as featured' : 'Will be featured image', 'info');
                              }}
                              style={{
                                background: (image as any).willBePrimary 
                                  ? 'rgba(239, 68, 68, 0.9)' 
                                  : 'rgba(245, 158, 11, 0.9)',
                                color: 'white',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '2px 4px',
                                fontSize: '10px',
                                fontWeight: '600',
                                cursor: 'pointer',
                                transition: 'all 0.15s ease'
                              }}
                              title={(image as any).willBePrimary ? "Remove as featured" : "Set as featured"}
                            >
                              {(image as any).willBePrimary ? '⭐ Featured' : 'Set Featured'}
                            </button>
                          </div>
                        )}
                        
                        {/* Featured indicator for new images */}
                        {(image as any).willBePrimary && (
                          <div style={{
                            position: 'absolute',
                            top: '4px',
                            left: '4px',
                            background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                            color: 'white',
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            fontWeight: '600',
                            boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
                          }}
                          title="Will be featured image"
                        >
                          ⭐
                        </div>
                        )}
                      </div>
                    ))}
                    </div>
                  </div>
                )}
                
                {/* Image Summary */}
                <div style={{
                  marginTop: '16px',
                  padding: '12px',
                  background: 'rgba(62, 178, 177, 0.1)',
                  borderRadius: '8px',
                  border: '1px solid rgba(62, 178, 177, 0.2)'
                }}>
                  <div style={{ fontSize: '0.875rem', color: '#3eb2b1', fontWeight: '600' }}>
                    📸 Image Summary:
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#1a1a1a', marginTop: '4px' }}>
                    {editingProduct && (
                      <div>
                        <span>Current: {existingImages.length} image{existingImages.length !== 1 ? 's' : ''}</span>
                        {imagesToDelete.length > 0 && (
                          <span style={{ color: '#ef4444', marginLeft: '8px' }}>(−{imagesToDelete.length} to delete)</span>
                        )}
                      </div>
                    )}
                    {editingProduct && formData.images && formData.images.length > 0 && (
                      <div style={{ marginTop: '2px' }}>
                        <span>New: {formData.images.length} image{formData.images.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                    {!editingProduct && (
                      <div>
                        {formData.images && formData.images.length > 0 ? (
                          <span>Selected: {formData.images.length} image{formData.images.length !== 1 ? 's' : ''}</span>
                        ) : (
                          <span style={{ color: '#6b7280' }}>No images selected</span>
                        )}
                      </div>
                    )}
                    {editingProduct && (
                      <div style={{ marginTop: '4px', fontSize: '0.75rem', color: '#6b7280' }}>
                        Final count: {existingImages.length + (formData.images?.length || 0)} image{(existingImages.length + (formData.images?.length || 0)) !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Pricing & Inventory */}
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem' }}>
                Pricing & Inventory
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    Price (SAR) *
                  </label>
                  <input
                    type="number"
                    value={formData.price || ''}
                    onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, !!formErrors.price)}
                    style={{
                      ...inputStyle,
                      fontWeight: '600',
                      color: '#1a1a1a',
                      borderColor: formErrors.price ? '#ef4444' : '#e5e7eb'
                    }}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                  {formErrors.price && (
                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.price}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600', color: '#374151' }}>
                    Stock Quantity *
                  </label>
                  <input
                    type="number"
                    value={formData.stockQuantity || ''}
                    onChange={(e) => handleInputChange('stockQuantity', parseInt(e.target.value) || 0)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, !!formErrors.stockQuantity)}
                    style={{
                      ...inputStyle,
                      fontWeight: '600',
                      color: '#1a1a1a',
                      borderColor: formErrors.stockQuantity ? '#ef4444' : '#e5e7eb'
                    }}
                    placeholder="0"
                    min="0"
                  />
                  {formErrors.stockQuantity && (
                    <p style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                      {formErrors.stockQuantity}
                    </p>
                  )}
                </div>

                <div>
                  <label style={{ display: 'flex', alignItems: 'center', marginTop: '2rem', gap: '8px' }}>
                    <input
                      type="checkbox"
                      checked={formData.vatIncluded || false}
                      onChange={(e) => handleInputChange('vatIncluded', e.target.checked)}
                      style={{ width: 'auto' }}
                    />
                    <span style={{ fontWeight: '600', color: '#374151' }}>
                      Price includes VAT
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end',
              marginTop: '2rem',
              paddingTop: '2rem',
              borderTop: '1px solid #e5e7eb'
            }}>
              <button
                onClick={() => setActiveTab('products')}
                style={{
                  background: '#f3f4f6',
                  color: '#4b5563',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              
              <WaveButton
                onClick={handleSaveProduct}
                disabled={saving}
                style={{
                  background: editingProduct 
                    ? 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)'
                    : 'linear-gradient(135deg, #2d8a89 0%, #1f6b6a 100%)'
                }}
              >
                {saving 
                  ? (editingProduct ? 'Updating...' : 'Saving...')
                  : (editingProduct ? 'Update Product' : 'Save Product')
                }
              </WaveButton>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Section */}
      {activeTab === 'analytics' && (
        <div style={cardStyle}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '2rem' }}>
            {t('contractorApp.marketplace.analytics', 'Marketplace Analytics')}
          </h2>
          
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#6b7280'
          }}>
            <div style={{ marginBottom: '1rem', display: 'flex', justifyContent: 'center' }}>
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 style={{ fontSize: '1.5rem', fontWeight: '600', color: '#1a1a1a', marginBottom: '1rem' }}>
              {t('contractorApp.marketplace.analyticsComingSoon', 'Detailed Analytics Coming Soon')}
            </h3>
            <p style={{ marginBottom: '2rem' }}>
              {t('contractorApp.marketplace.analyticsDescription', 'Advanced analytics with product performance, sales trends, customer insights, and revenue forecasting will be available here.')}
            </p>
            <div style={{
              display: 'inline-flex',
              gap: '1rem',
              marginTop: '1rem'
            }}>
              <WaveButton
                onClick={() => setActiveTab('products')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                  <path d="M9 9l3 3 3-3" />
                </svg>
                View Products
              </WaveButton>
              <button
                onClick={() => setActiveTab('products')}
                style={{
                  background: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10" />
                </svg>
                Manage Products
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {showDeleteModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f9fafb 100%)',
            borderRadius: '16px',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            margin: '1rem',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
            border: '1px solid #e5e7eb',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '64px',
                height: '64px',
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem auto'
              }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14zM10 11v6M14 11v6"/>
                </svg>
              </div>
              
              <h3 style={{
                fontSize: '1.5rem',
                fontWeight: '600',
                color: '#1a1a1a',
                margin: '0 0 0.5rem 0'
              }}>
                {t('contractorApp.marketplace.deleteProduct', 'Delete Product')}
              </h3>
              
              <p style={{
                fontSize: '14px',
                color: '#6b7280',
                margin: 0,
                lineHeight: '1.4'
              }}>
                {t('contractorApp.marketplace.deleteWarning', 'This action cannot be undone')}
              </p>
            </div>

            {/* Product Info */}
            <div style={{
              background: '#f9fafb',
              borderRadius: '12px',
              padding: '1rem',
              marginBottom: '1.5rem',
              border: '1px solid #e5e7eb'
            }}>
              <p style={{
                fontSize: '14px',
                color: '#4b5563',
                margin: '0 0 0.5rem 0',
                fontWeight: '500'
              }}>
                {t('contractorApp.marketplace.productToDelete', 'Product to delete:')}
              </p>
              <p style={{
                fontSize: '16px',
                color: '#1a1a1a',
                margin: 0,
                fontWeight: '600'
              }}>
                {productToDelete?.name}
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={cancelDeleteProduct}
                style={{
                  background: '#f3f4f6',
                  color: '#4b5563',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e5e7eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f3f4f6';
                }}
              >
                {t('contractorApp.common.cancel', 'Cancel')}
              </button>
              
              <button
                onClick={confirmDeleteProduct}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 8px 25px rgba(239, 68, 68, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {t('contractorApp.marketplace.confirmDelete', 'Yes, Delete Product')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: toast.type === 'success' 
            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
            : toast.type === 'error' 
            ? 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)'
            : 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
          color: 'white',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 10px 40px rgba(0, 0, 0, 0.15)',
          zIndex: 2000,
          minWidth: '300px',
          maxWidth: '500px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideInRight 0.3s ease-out',
          backdropFilter: 'blur(10px)'
        }}>
          {/* Icon */}
          <div style={{
            width: '24px',
            height: '24px',
            flexShrink: 0
          }}>
            {toast.type === 'success' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 12l2 2 4-4"/>
                <circle cx="12" cy="12" r="10"/>
              </svg>
            ) : toast.type === 'error' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M15 9l-6 6M9 9l6 6"/>
              </svg>
            ) : (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <path d="M12 16v-4M12 8h.01"/>
              </svg>
            )}
          </div>
          
          {/* Message */}
          <div style={{
            fontSize: '14px',
            fontWeight: '500',
            lineHeight: '1.4',
            flex: 1
          }}>
            {toast.message}
          </div>
          
          {/* Close Button */}
          <button
            onClick={() => setToast(prev => ({ ...prev, show: false }))}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '6px',
              width: '24px',
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

export default ContractorMarketplace;