import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Search, 
  Filter, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Star,
  User,
  Calendar,
  DollarSign,
  AlertCircle,
  TrendingUp,
  Layers,
  ShoppingCart
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { toast } from 'react-hot-toast';

// API base URL - using admin service as intended
const ADMIN_API_URL = 'http://localhost:3006/api/dashboard';

interface Product {
  id: string;
  name: string;
  description: string;
  brand: string;
  model: string;
  category_name?: string;
  product_category?: 'INVERTER' | 'BATTERY' | 'SOLAR_PANEL' | 'FULL_SYSTEM';
  price: number;
  stock_quantity?: number;
  stock_status?: string;
  status: string;
  approval_status: string;
  sku?: string;
  specifications?: {
    // Inverter Specifications
    maxPowerOutput?: string;
    efficiency?: string;
    inputVoltage?: string;
    outputVoltage?: string;
    frequency?: string;
    warranty?: string;
    waveformType?: string;
    protectionFeatures?: string;
    
    // Battery Specifications
    batteryCapacity?: string;
    voltage?: string;
    batteryType?: string;
    cycleLife?: string;
    chargingTime?: string;
    operatingTemperature?: string;
    batteryWarranty?: string;
    communicationProtocol?: string;
    
    // Solar Panel Specifications
    maxPowerOutput_panel?: string;
    panelEfficiency?: string;
    cellType?: string;
    dimensions?: string;
    weight?: string;
    operatingVoltage?: string;
    shortCircuitCurrent?: string;
    temperatureCoefficient?: string;
    panelWarranty?: string;
    
    // Full System Specifications
    totalCapacity?: string;
    systemVoltage?: string;
    inverterOutput?: string;
    batteryCapacity_system?: string;
    solarPanelCapacity?: string;
    monitoringSystem?: string;
    installationRequirements?: string;
    maintenanceSchedule?: string;
    systemWarranty?: string;
    expectedLifespan?: string;
    certifications?: string;
    
    [key: string]: any;
  };
  contractor_id: string;
  contractor?: {
    id: string;
    company_name: string;
    contact_name: string;
    email: string;
    phone: string;
  };
  images?: {
    id: string;
    file_url: string;
    is_primary: boolean;
  }[];
  primaryImage?: string;
  created_at: string;
  updated_at: string;
  rejection_reason?: string;
  admin_notes?: string;
}

interface ProductStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  draft: number;
}

export function ProductsPage() {
  const { t } = useTranslation('common');
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<ProductStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    draft: 0
  });
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showRejectModal, setShowRejectModal] = useState<Product | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Fetch products from marketplace service
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        
        // Get products for admin review
        const response = await fetch(`${ADMIN_API_URL}/products`, {
          headers: {
            'Content-Type': 'application/json',
            // In production, would include auth token from context
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('📦 Products API response:', data);

        if (data.success && data.data) {
          setProducts(data.data);
          
          // Calculate stats
          const newStats = data.data.reduce(
            (acc: ProductStats, product: Product) => {
              acc.total++;
              const approval_status = product.approval_status?.toLowerCase();
              const status = product.status?.toLowerCase();
              
              switch (approval_status) {
                case 'pending':
                  acc.pending++;
                  break;
                case 'approved':
                  acc.approved++;
                  break;
                case 'rejected':
                  acc.rejected++;
                  break;
                default:
                  if (status === 'draft') {
                    acc.draft++;
                  } else {
                    acc.pending++; // Default to pending for unknown statuses
                  }
              }
              return acc;
            },
            { total: 0, pending: 0, approved: 0, rejected: 0, draft: 0 }
          );
          
          setStats(newStats);
          console.log('📊 Product stats:', newStats);
        } else {
          console.warn('No products data in response:', data);
          setProducts([]);
        }
      } catch (error) {
        console.error('❌ Failed to fetch products:', error);
        toast.error('Failed to load products');
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Handle reject modal
  const handleRejectClick = (product: Product) => {
    setShowRejectModal(product);
    setRejectionReason('');
  };

  const handleRejectConfirm = async () => {
    if (!showRejectModal || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    await handleProductAction(showRejectModal.id, 'reject', rejectionReason.trim());
    setShowRejectModal(null);
    setRejectionReason('');
  };

  const handleRejectCancel = () => {
    setShowRejectModal(null);
    setRejectionReason('');
  };

  // Handle product approval/rejection
  const handleProductAction = async (productId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      setActionLoading(productId);
      
      const endpoint = action === 'approve' 
        ? `${ADMIN_API_URL}/products/${productId}/approve`
        : `${ADMIN_API_URL}/products/${productId}/reject`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          action === 'reject' && reason 
            ? { rejectionReason: reason, adminNotes: `Product rejected: ${reason}` }
            : action === 'approve' 
              ? { adminNotes: 'Product approved by admin' }
              : {}
        ),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        // Update product status in local state
        setProducts(prev => 
          prev.map(product => 
            product.id === productId 
              ? { 
                  ...product, 
                  status: action === 'approve' ? 'ACTIVE' : 'INACTIVE',
                  approval_status: action === 'approve' ? 'APPROVED' : 'REJECTED',
                  admin_notes: data.data?.admin_notes || (action === 'approve' ? 'Product approved by admin' : 'Product rejected by admin'),
                  rejection_reason: data.data?.rejection_reason || (action === 'reject' ? reason : undefined)
                }
              : product
          )
        );

        // Update stats
        setStats(prev => ({
          ...prev,
          pending: Math.max(0, prev.pending - 1),
          [action === 'approve' ? 'approved' : 'rejected']: prev[action === 'approve' ? 'approved' : 'rejected'] + 1
        }));

        toast.success(`Product ${action === 'approve' ? 'approved' : 'rejected'} successfully!`);
        setSelectedProduct(null);
      } else {
        throw new Error(data.message || `Failed to ${action} product`);
      }
    } catch (error) {
      console.error(`❌ Failed to ${action} product:`, error);
      toast.error(`Failed to ${action} product`);
    } finally {
      setActionLoading(null);
    }
  };

  // Filter products based on search and status
  const filteredProducts = products.filter(product => {
    const specificationText = product.specifications ? 
      Object.values(product.specifications).filter(val => val && typeof val === 'string').join(' ').toLowerCase() : '';
    
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.model || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.sku || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (product.category_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.contractor?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.contractor?.contact_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         specificationText.includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
                         product.approval_status?.toLowerCase() === statusFilter.toLowerCase() ||
                         (statusFilter === 'draft' && product.status?.toLowerCase() === 'draft');
    
    return matchesSearch && matchesStatus;
  });

  // Get status badge color based on approval_status
  const getStatusBadge = (product: Product) => {
    const approval_status = product.approval_status?.toLowerCase();
    const status = product.status?.toLowerCase();
    
    switch (approval_status) {
      case 'pending':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300"><Clock className="w-3 h-3 mr-1" />Pending Review</span>;
      case 'approved':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300"><CheckCircle className="w-3 h-3 mr-1" />Approved</span>;
      case 'rejected':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300"><XCircle className="w-3 h-3 mr-1" />Rejected</span>;
      default:
        if (status === 'draft') {
          return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300"><AlertCircle className="w-3 h-3 mr-1" />Draft</span>;
        }
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300">{approval_status || status || 'Unknown'}</span>;
    }
  };

  // Format price in SAR
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ar-SA', {
      style: 'currency',
      currency: 'SAR',
    }).format(price);
  };

  // Get product category display info
  const getCategoryInfo = (productCategory: string) => {
    switch (productCategory) {
      case 'INVERTER':
        return { name: 'Inverter', nameAr: 'العاكسات الشمسية', icon: '⚡' };
      case 'BATTERY':
        return { name: 'Battery', nameAr: 'البطاريات وأنظمة التخزين', icon: '🔋' };
      case 'SOLAR_PANEL':
        return { name: 'Solar Panel', nameAr: 'الألواح الشمسية', icon: '☀️' };
      case 'FULL_SYSTEM':
        return { name: 'Full System', nameAr: 'الأنظمة الكاملة', icon: '⚙️' };
      default:
        return { name: 'Unknown', nameAr: 'غير معروف', icon: '📦' };
    }
  };

  // Get category-specific specification fields
  const getCategorySpecifications = (product: Product) => {
    if (!product.specifications || Object.keys(product.specifications).length === 0) {
      return null;
    }

    const specs = product.specifications;
    
    switch (product.product_category) {
      case 'INVERTER':
        return [
          { label: 'Max Power Output', value: specs.maxPowerOutput },
          { label: 'Efficiency', value: specs.efficiency },
          { label: 'Input Voltage', value: specs.inputVoltage },
          { label: 'Output Voltage', value: specs.outputVoltage },
          { label: 'Frequency', value: specs.frequency },
          { label: 'Warranty', value: specs.warranty },
          { label: 'Waveform Type', value: specs.waveformType },
          { label: 'Protection Features', value: specs.protectionFeatures },
        ].filter(spec => spec.value);

      case 'BATTERY':
        return [
          { label: 'Battery Capacity', value: specs.batteryCapacity },
          { label: 'Voltage', value: specs.voltage },
          { label: 'Battery Type', value: specs.batteryType },
          { label: 'Cycle Life', value: specs.cycleLife },
          { label: 'Charging Time', value: specs.chargingTime },
          { label: 'Operating Temperature', value: specs.operatingTemperature },
          { label: 'Warranty', value: specs.batteryWarranty },
          { label: 'Communication Protocol', value: specs.communicationProtocol },
        ].filter(spec => spec.value);

      case 'SOLAR_PANEL':
        return [
          { label: 'Max Power Output', value: specs.maxPowerOutput_panel },
          { label: 'Panel Efficiency', value: specs.panelEfficiency },
          { label: 'Cell Type', value: specs.cellType },
          { label: 'Dimensions', value: specs.dimensions },
          { label: 'Weight', value: specs.weight },
          { label: 'Operating Voltage', value: specs.operatingVoltage },
          { label: 'Short Circuit Current', value: specs.shortCircuitCurrent },
          { label: 'Temperature Coefficient', value: specs.temperatureCoefficient },
          { label: 'Warranty', value: specs.panelWarranty },
        ].filter(spec => spec.value);

      case 'FULL_SYSTEM':
        return [
          { label: 'Total Capacity', value: specs.totalCapacity },
          { label: 'System Voltage', value: specs.systemVoltage },
          { label: 'Inverter Output', value: specs.inverterOutput },
          { label: 'Battery Capacity', value: specs.batteryCapacity_system },
          { label: 'Solar Panel Capacity', value: specs.solarPanelCapacity },
          { label: 'Monitoring System', value: specs.monitoringSystem },
          { label: 'Installation Requirements', value: specs.installationRequirements },
          { label: 'Maintenance Schedule', value: specs.maintenanceSchedule },
          { label: 'System Warranty', value: specs.systemWarranty },
          { label: 'Expected Lifespan', value: specs.expectedLifespan },
          { label: 'Certifications', value: specs.certifications },
        ].filter(spec => spec.value);

      default:
        // Fallback: show all specifications dynamically
        return Object.entries(specs)
          .filter(([key, value]) => value && key !== '')
          .map(([key, value]) => ({
            label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
            value: String(value)
          }));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#3eb2b1] flex items-center gap-3">
            <Package className="w-8 h-8" />
            Product Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and manage contractor product submissions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card border-2 border-[#3eb2b1]/20 bg-gradient-to-br from-[#3eb2b1]/5 to-[#3eb2b1]/10">
          <div className="card-content">
            <div className="flex items-center space-x-2">
              <Layers className="w-5 h-5 text-[#3eb2b1]" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total</span>
            </div>
            <div className="text-2xl font-bold text-[#2d7d7c] mt-2">{stats.total}</div>
          </div>
        </div>

        <div className="card border-2 border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-100/50">
          <div className="card-content">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</span>
            </div>
            <div className="text-2xl font-bold text-yellow-700 mt-2">{stats.pending}</div>
          </div>
        </div>

        <div className="card border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100/50">
          <div className="card-content">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</span>
            </div>
            <div className="text-2xl font-bold text-green-700 mt-2">{stats.approved}</div>
          </div>
        </div>

        <div className="card border-2 border-red-200 bg-gradient-to-br from-red-50 to-red-100/50">
          <div className="card-content">
            <div className="flex items-center space-x-2">
              <XCircle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</span>
            </div>
            <div className="text-2xl font-bold text-red-700 mt-2">{stats.rejected}</div>
          </div>
        </div>

        <div className="card border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-gray-100/50">
          <div className="card-content">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Draft</span>
            </div>
            <div className="text-2xl font-bold text-gray-700 mt-2">{stats.draft}</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="card-content">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search products, brands, or contractors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input w-full pl-10 rtl:pl-4 rtl:pr-10"
                />
              </div>
            </div>
            <div className="w-full sm:w-[200px]">
              <div className="relative">
                <Filter className="absolute left-3 top-3 h-4 w-4 text-gray-400 rtl:left-auto rtl:right-3" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input w-full pl-10 rtl:pl-4 rtl:pr-10"
                >
                  <option value="all">All Status</option>
                  <option value="pending">Pending Review</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        <AnimatePresence>
          {filteredProducts.map((product) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.2 }}
            >
              <div className="card hover:shadow-lg transition-shadow duration-200">
                <div className="card-content">
                  {/* Product Image */}
                  <div className="aspect-video bg-gray-100 rounded-lg mb-4 flex items-center justify-center overflow-hidden">
                    {product.primaryImage || product.images?.[0]?.file_url ? (
                      <img 
                        src={product.primaryImage || product.images?.[0]?.file_url} 
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <Package className="w-12 h-12 text-gray-400" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <h3 className="font-semibold text-lg line-clamp-2">{product.name}</h3>
                      {getStatusBadge(product)}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                      
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{product.brand}</span>
                        <span className="text-[#3eb2b1] font-bold">{formatPrice(product.price)}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <User className="w-4 h-4" />
                        <span>{product.contractor?.company_name || product.contractor?.contact_name || 'Unknown Contractor'}</span>
                      </div>

                      {product.product_category && (
                        <div className="flex items-center gap-2 text-sm">
                          <span className="text-lg">{getCategoryInfo(product.product_category).icon}</span>
                          <span className="font-medium text-[#3eb2b1]">{getCategoryInfo(product.product_category).name}</span>
                          <span className="text-xs text-muted-foreground">({getCategoryInfo(product.product_category).nameAr})</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <span>SKU: {product.sku || 'N/A'}</span>
                        <span>Stock: {product.stock_quantity || 0}</span>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>Created: {new Date(product.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => setSelectedProduct(product)}
                        className="flex-1 inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#3eb2b1] focus:ring-offset-2 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </button>

                      {product.approval_status?.toLowerCase() === 'pending' && (
                        <>
                          <button
                            onClick={() => handleProductAction(product.id, 'approve')}
                            disabled={actionLoading === product.id}
                            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {actionLoading === product.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRejectClick(product)}
                            disabled={actionLoading === product.id}
                            className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {actionLoading === product.id ? (
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <XCircle className="w-4 h-4" />
                            )}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredProducts.length === 0 && !loading && (
        <div className="card">
          <div className="card-content text-center p-12">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No products found</h3>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters' 
                : 'No products have been submitted yet'}
            </p>
          </div>
        </div>
      )}

      {/* Product Detail Modal */}
      {selectedProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{selectedProduct.name}</h3>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#3eb2b1] rounded-md"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>
            <div className="card-content">
              <div className="space-y-6">
                {/* Product Images */}
                {selectedProduct.images && selectedProduct.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {selectedProduct.images.map((image) => (
                      <div key={image.id} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                        <img 
                          src={image.file_url} 
                          alt="Product" 
                          className="w-full h-full object-cover"
                        />
                        {image.is_primary && (
                          <div className="absolute top-2 right-2">
                            <Star className="w-5 h-5 text-yellow-500 fill-current" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Product Details</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Brand:</strong> {selectedProduct.brand}</div>
                      <div><strong>Model:</strong> {selectedProduct.model}</div>
                      <div><strong>Category:</strong> {selectedProduct.category_name || 'N/A'}</div>
                      {selectedProduct.product_category && (
                        <div className="flex items-center gap-2">
                          <strong>Product Type:</strong> 
                          <span className="text-lg">{getCategoryInfo(selectedProduct.product_category).icon}</span>
                          <span className="font-medium text-[#3eb2b1]">{getCategoryInfo(selectedProduct.product_category).name}</span>
                          <span className="text-xs text-muted-foreground">({getCategoryInfo(selectedProduct.product_category).nameAr})</span>
                        </div>
                      )}
                      <div><strong>SKU:</strong> {selectedProduct.sku || 'N/A'}</div>
                      <div><strong>Price:</strong> {formatPrice(selectedProduct.price)}</div>
                      <div><strong>Stock:</strong> {selectedProduct.stock_quantity || 0}</div>
                      <div><strong>Status:</strong> {getStatusBadge(selectedProduct)}</div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold mb-2">Contractor Details</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Company:</strong> {selectedProduct.contractor?.company_name || 'N/A'}</div>
                      <div><strong>Contact:</strong> {selectedProduct.contractor?.contact_name || 'N/A'}</div>
                      <div><strong>Email:</strong> {selectedProduct.contractor?.email || 'N/A'}</div>
                      <div><strong>Phone:</strong> {selectedProduct.contractor?.phone || 'N/A'}</div>
                      <div><strong>Created:</strong> {new Date(selectedProduct.created_at).toLocaleString()}</div>
                    </div>
                  </div>
                </div>

                {/* Dynamic Category-Based Technical Specifications */}
                {(() => {
                  const categorySpecs = getCategorySpecifications(selectedProduct);
                  if (!categorySpecs || categorySpecs.length === 0) return null;

                  const midpoint = Math.ceil(categorySpecs.length / 2);
                  const leftSpecs = categorySpecs.slice(0, midpoint);
                  const rightSpecs = categorySpecs.slice(midpoint);

                  return (
                    <div>
                      <h4 className="font-semibold mb-2">
                        Technical Specifications
                        {selectedProduct.product_category && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            ({getCategoryInfo(selectedProduct.product_category).name})
                          </span>
                        )}
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 text-sm">
                          {leftSpecs.map((spec, index) => (
                            <div key={`left-${index}`}>
                              <strong>{spec.label}:</strong> {spec.value}
                            </div>
                          ))}
                        </div>
                        <div className="space-y-2 text-sm">
                          {rightSpecs.map((spec, index) => (
                            <div key={`right-${index}`}>
                              <strong>{spec.label}:</strong> {spec.value}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                <div>
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{selectedProduct.description || 'No description provided'}</p>
                </div>

                {selectedProduct.rejection_reason && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-red-800">Rejection Reason</h4>
                    <p className="text-sm text-red-700">{selectedProduct.rejection_reason}</p>
                  </div>
                )}

                {selectedProduct.admin_notes && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold mb-2 text-blue-800">Admin Notes</h4>
                    <p className="text-sm text-blue-700">{selectedProduct.admin_notes}</p>
                  </div>
                )}

                {selectedProduct.approval_status?.toLowerCase() === 'pending' && (
                  <div className="flex gap-4 pt-4 border-t">
                    <button
                      className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md flex items-center justify-center transition-colors"
                      onClick={() => handleProductAction(selectedProduct.id, 'approve')}
                      disabled={actionLoading === selectedProduct.id}
                    >
                      {actionLoading === selectedProduct.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <CheckCircle className="w-4 h-4 mr-2" />
                      )}
                      {actionLoading === selectedProduct.id ? 'Approving...' : 'Approve Product'}
                    </button>
                    <button
                      className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md flex items-center justify-center transition-colors"
                      onClick={() => {
                        setSelectedProduct(null);
                        handleRejectClick(selectedProduct);
                      }}
                      disabled={actionLoading === selectedProduct.id}
                    >
                      {actionLoading === selectedProduct.id ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                      ) : (
                        <XCircle className="w-4 h-4 mr-2" />
                      )}
                      {actionLoading === selectedProduct.id ? 'Rejecting...' : 'Reject Product'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Product Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card max-w-md w-full">
            <div className="card-header">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
                  <XCircle className="w-5 h-5" />
                  Reject Product
                </h3>
                <button
                  onClick={handleRejectCancel}
                  className="inline-flex items-center justify-center p-2 text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-[#3eb2b1] rounded-md"
                >
                  <span className="text-2xl">×</span>
                </button>
              </div>
            </div>
            <div className="card-content">
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-red-800 mb-1">
                        Are you sure you want to reject this product?
                      </h4>
                      <p className="text-sm text-red-700">
                        <strong>{showRejectModal.name}</strong> by {showRejectModal.contractor?.company_name || 'Unknown Contractor'}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
                    Rejection Reason *
                  </label>
                  <textarea
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Please provide a detailed reason for rejecting this product..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-[#3eb2b1] focus:border-[#3eb2b1] resize-none"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    This reason will be sent to the contractor to help them understand why their product was rejected.
                  </p>
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    onClick={handleRejectCancel}
                    className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#3eb2b1] focus:ring-offset-2 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRejectConfirm}
                    disabled={!rejectionReason.trim() || actionLoading === showRejectModal.id}
                    className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {actionLoading === showRejectModal.id ? (
                      <div className="flex items-center justify-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Rejecting...
                      </div>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Reject Product
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}