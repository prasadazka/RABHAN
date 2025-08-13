import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme';
import { marketplaceService, Product, ProductFilters, PaginationParams } from '../services/marketplace.service';
import { config } from '../config/environment';

// Shopping cart item interface
interface CartItem {
  product: Product;
  quantity: number;
}

interface UserMarketplaceProps {
  user: {
    id: string;
    email: string;
    role: string;
  };
  cart: CartItem[];
  addToCart: (product: Product, quantity?: number) => void;
  removeFromCart: (productId: string) => void;
  updateCartQuantity: (productId: string, quantity: number) => void;
  getTotalCartItems: () => number;
  getTotalCartValue: () => number;
}

const UserMarketplace: React.FC<UserMarketplaceProps> = ({ 
  user, 
  cart, 
  addToCart, 
  removeFromCart, 
  updateCartQuantity, 
  getTotalCartItems, 
  getTotalCartValue 
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // State management
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load products on component mount
  useEffect(() => {
    loadProducts();
  }, [currentPage, searchTerm, selectedCategory]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);

      const filters: ProductFilters = {
        search: searchTerm,
        categoryId: selectedCategory || undefined,
        minPrice: priceRange[0],
        maxPrice: priceRange[1],
        status: 'ACTIVE', // Only show active products
        approvalStatus: 'APPROVED', // Only show approved products
        inStockOnly: true
      };

      const pagination: PaginationParams = {
        page: currentPage,
        limit: 12,
        sortBy: 'created_at',
        sortOrder: 'desc'
      };

      console.log('🛒 Loading marketplace products with filters:', filters);
      
      const result = await marketplaceService.searchProducts(filters, pagination);
      setProducts(result.data);
      setTotalPages(result.pagination.totalPages);
      
      console.log(`✅ Loaded ${result.data.length} products`);
    } catch (err) {
      console.error('❌ Error loading products:', err);
      setError(err instanceof Error ? err.message : 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  // Format price with currency
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // Get product category display info
  const getCategoryInfo = (productCategory: string) => {
    switch (productCategory) {
      case 'INVERTER':
        return { name: t('categories.inverter', 'Inverter'), nameAr: 'العاكسات الشمسية', icon: '⚡' };
      case 'BATTERY':
        return { name: t('categories.battery', 'Battery'), nameAr: 'البطاريات وأنظمة التخزين', icon: '🔋' };
      case 'SOLAR_PANEL':
        return { name: t('categories.solarPanel', 'Solar Panel'), nameAr: 'الألواح الشمسية', icon: '☀️' };
      case 'FULL_SYSTEM':
        return { name: t('categories.fullSystem', 'Full System'), nameAr: 'الأنظمة الكاملة', icon: '⚙️' };
      default:
        return { name: t('categories.unknown', 'Product'), nameAr: 'منتج', icon: '📦' };
    }
  };

  // Get quick preview specs for product card
  const getProductPreviewSpecs = (product: Product) => {
    if (!product.specifications || typeof product.specifications !== 'object') {
      return null;
    }

    const specs = product.specifications;
    
    switch (product.productCategory) {
      case 'INVERTER':
        return specs.powerRate || specs.type || specs.mppts ? 
          `${specs.powerRate ? specs.powerRate + ' ' : ''}${specs.type ? specs.type : ''}${specs.mppts ? ' • ' + specs.mppts + ' MPPT' : ''}` : null;
      case 'BATTERY':
        return specs.capacity || specs.voltage ? 
          `${specs.capacity ? specs.capacity + ' ' : ''}${specs.voltage ? specs.voltage : ''}` : null;
      case 'SOLAR_PANEL':
        return specs.maxPower || specs.efficiency ? 
          `${specs.maxPower ? specs.maxPower + ' ' : ''}${specs.efficiency ? '• ' + specs.efficiency : ''}` : null;
      case 'FULL_SYSTEM':
        return specs.systemPower || specs.batteryCapacity ? 
          `${specs.systemPower ? specs.systemPower + ' ' : ''}${specs.batteryCapacity ? '• ' + specs.batteryCapacity : ''}` : null;
      default:
        // Legacy fallback
        return specs.wattage || specs.efficiency ? 
          `${specs.wattage ? specs.wattage + 'W' : ''}${specs.efficiency ? ' • ' + specs.efficiency : ''}` : null;
    }
  };

  // Product card component
  const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const isInCart = cart.some(item => item.product.id === product.id);
    const cartItem = cart.find(item => item.product.id === product.id);

    const handleProductClick = () => {
      navigate(`/dashboard/marketplace/product/${product.id}`);
    };

    return (
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '16px',
          border: `1px solid ${theme.colors.borders.light}`,
          overflow: 'hidden',
          transition: theme.transitions.normal,
          cursor: 'pointer',
          boxShadow: theme.shadows.sm,
          display: 'flex',
          flexDirection: 'column',
          height: '100%'
        }}
        onClick={handleProductClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = theme.shadows.lg;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = theme.shadows.sm;
        }}
      >
        {/* Product Image */}
        <div
          style={{
            width: '100%',
            height: '200px',
            background: product.primaryImage 
              ? `url(${product.primaryImage})` 
              : `linear-gradient(135deg, ${theme.colors.neutral[100]} 0%, ${theme.colors.neutral[200]} 100%)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {!product.primaryImage && (
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke={theme.colors.neutral[400]} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
          )}
          
          {/* Offer percentage badge */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              left: isRTL ? 'auto' : '8px',
              right: isRTL ? '8px' : 'auto',
              background: `linear-gradient(135deg, ${theme.colors.semantic.warning.main} 0%, ${theme.colors.semantic.warning.dark} 100%)`,
              color: 'white',
              fontSize: '0.75rem',
              padding: '4px 8px',
              borderRadius: '12px',
              fontWeight: '600',
              boxShadow: `0 2px 4px ${theme.colors.semantic.warning.main}40`
            }}
          >
            -15% {/* Dummy offer percentage */}
          </div>

          {/* Stock status badge */}
          <div
            style={{
              position: 'absolute',
              top: '8px',
              right: isRTL ? 'auto' : '8px',
              left: isRTL ? '8px' : 'auto',
              background: product.stock_status === 'IN_STOCK' 
                ? theme.colors.primary[500]
                : `${theme.colors.semantic.error.main}e6`,
              color: 'white',
              fontSize: '0.75rem',
              padding: '4px 8px',
              borderRadius: '12px',
              fontWeight: '500',
            }}
          >
            {product.stock_status === 'IN_STOCK' ? t('marketplace.inStock') : t('marketplace.outOfStock')}
          </div>
        </div>

        {/* Product Info */}
        <div
          style={{
            padding: '16px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Product Name */}
          <h3
            style={{
              fontSize: '1rem',
              fontWeight: '600',
              color: theme.colors.text.primary,
              marginBottom: '8px',
              lineHeight: '1.4',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
          >
            {product.name}
          </h3>

          {/* Brand */}
          <p
            style={{
              fontSize: '0.875rem',
              color: theme.colors.text.secondary,
              marginBottom: '8px'
            }}
          >
            {product.brand}
          </p>

          {/* Category Badge & Dynamic Specifications */}
          <div style={{ marginBottom: '12px' }}>
            {/* Category Badge */}
            {product.productCategory && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: `${theme.colors.primary[500]}10`,
                  color: theme.colors.primary[600],
                  padding: '2px 6px',
                  borderRadius: '6px',
                  fontSize: '0.65rem',
                  fontWeight: '600',
                  marginBottom: '4px',
                  border: `1px solid ${theme.colors.primary[500]}15`
                }}
              >
                <span style={{ fontSize: '0.6rem' }}>{getCategoryInfo(product.productCategory).icon}</span>
                <span>{isRTL ? getCategoryInfo(product.productCategory).nameAr : getCategoryInfo(product.productCategory).name}</span>
              </div>
            )}
            
            {/* Dynamic Preview Specs */}
            {(() => {
              const previewSpecs = getProductPreviewSpecs(product);
              return previewSpecs ? (
                <p
                  style={{
                    fontSize: '0.75rem',
                    color: theme.colors.text.muted,
                    margin: 0,
                    lineHeight: '1.3'
                  }}
                >
                  {previewSpecs}
                </p>
              ) : null;
            })()}
          </div>

          {/* Price */}
          <div
            style={{
              marginTop: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '12px'
            }}
          >
            <span
              style={{
                fontSize: '1.25rem',
                fontWeight: '700',
                color: theme.colors.primary[500]
              }}
            >
              {formatPrice(parseFloat(product.price) || 0)}
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                color: theme.colors.text.muted
              }}
            >
              {product.vat_included ? t('marketplace.inclVAT') : t('marketplace.exclVAT')}
            </span>
          </div>

          {/* Cart Management Section */}
          {!isInCart ? (
            /* Add to Cart Button */
            <button
              onClick={(e) => {
                e.stopPropagation();
                addToCart(product);
              }}
              disabled={product.stock_status !== 'IN_STOCK'}
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: product.stock_status === 'IN_STOCK' ? 'pointer' : 'not-allowed',
                transition: theme.transitions.normal,
                opacity: product.stock_status === 'IN_STOCK' ? 1 : 0.5,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: `0 4px 15px ${theme.colors.primary[500]}40, 0 0 0 1px ${theme.colors.primary[500]}20`,
                position: 'relative',
                overflow: 'hidden'
              }}
              onMouseEnter={(e) => {
                if (product.stock_status === 'IN_STOCK') {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = `0 6px 20px ${theme.colors.primary[500]}50, 0 0 0 1px ${theme.colors.primary[500]}30`;
                }
              }}
              onMouseLeave={(e) => {
                if (product.stock_status === 'IN_STOCK') {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 4px 15px ${theme.colors.primary[500]}40, 0 0 0 1px ${theme.colors.primary[500]}20`;
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              {t('marketplace.addToCart')}
            </button>
          ) : (
            /* In Cart Management */
            <div
              style={{
                background: `linear-gradient(135deg, ${theme.colors.semantic.success.main}15 0%, ${theme.colors.semantic.success.light}20 100%)`,
                border: `2px solid ${theme.colors.semantic.success.main}30`,
                borderRadius: '12px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              {/* In Cart Status */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: theme.colors.semantic.success.dark,
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.semantic.success.main} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {t('marketplace.inCart')} ({cartItem?.quantity})
              </div>

              {/* Quantity Controls */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px'
                }}
              >
                {/* Decrease Quantity */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (cartItem && cartItem.quantity > 1) {
                      updateCartQuantity(product.id, cartItem.quantity - 1);
                    }
                  }}
                  disabled={!cartItem || cartItem.quantity <= 1}
                  style={{
                    background: cartItem && cartItem.quantity > 1 
                      ? theme.colors.neutral[100] 
                      : theme.colors.neutral[50],
                    border: `1px solid ${theme.colors.borders.light}`,
                    borderRadius: '8px',
                    padding: '6px',
                    cursor: cartItem && cartItem.quantity > 1 ? 'pointer' : 'not-allowed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: theme.transitions.fast,
                    opacity: cartItem && cartItem.quantity > 1 ? 1 : 0.5
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text.secondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>

                {/* Quantity Display */}
                <span
                  style={{
                    fontSize: '0.875rem',
                    fontWeight: '600',
                    color: theme.colors.text.primary,
                    minWidth: '20px',
                    textAlign: 'center'
                  }}
                >
                  {cartItem?.quantity || 0}
                </span>

                {/* Increase Quantity */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (cartItem) {
                      updateCartQuantity(product.id, cartItem.quantity + 1);
                    }
                  }}
                  style={{
                    background: theme.colors.neutral[100],
                    border: `1px solid ${theme.colors.borders.light}`,
                    borderRadius: '8px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: theme.transitions.fast
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = theme.colors.primary[50];
                    e.currentTarget.style.borderColor = theme.colors.primary[200];
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = theme.colors.neutral[100];
                    e.currentTarget.style.borderColor = theme.colors.borders.light;
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.colors.text.secondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"/>
                    <line x1="5" y1="12" x2="19" y2="12"/>
                  </svg>
                </button>

                {/* Remove from Cart */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFromCart(product.id);
                  }}
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.semantic.error.main}15 0%, ${theme.colors.semantic.error.light}20 100%)`,
                    border: `1px solid ${theme.colors.semantic.error.main}40`,
                    borderRadius: '8px',
                    padding: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: theme.transitions.fast,
                    marginLeft: '4px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${theme.colors.semantic.error.main}25 0%, ${theme.colors.semantic.error.light}30 100%)`;
                    e.currentTarget.style.borderColor = `${theme.colors.semantic.error.main}60`;
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = `linear-gradient(135deg, ${theme.colors.semantic.error.main}15 0%, ${theme.colors.semantic.error.light}20 100%)`;
                    e.currentTarget.style.borderColor = `${theme.colors.semantic.error.main}40`;
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                  title={t('marketplace.removeFromCart')}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.colors.semantic.error.main} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3,6 5,6 21,6"/>
                    <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1,2-2h4a2,2 0 0,1,2,2v2"/>
                    <line x1="10" y1="11" x2="10" y2="17"/>
                    <line x1="14" y1="11" x2="14" y2="17"/>
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.colors.gradients.primaryLight,
        color: theme.colors.text.primary,
        fontFamily: theme.typography.fonts.primary,
        direction: isRTL ? 'rtl' : 'ltr',
        padding: 'clamp(8px, 2vw, 16px)'
      }}
    >
      {/* Main Content Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          border: `1px solid ${theme.colors.borders.light}`,
          padding: 'clamp(16px, 4vw, 24px)',
          boxShadow: theme.shadows.lg,
          backdropFilter: 'blur(10px)',
          width: '100%',
          minHeight: 'calc(100vh - 32px)'
        }}
      >
      {/* Header */}
      <div
        style={{
          background: 'rgba(248, 250, 252, 0.6)',
          borderRadius: '16px',
          border: `1px solid ${theme.colors.borders.light}`,
          padding: '24px',
          marginBottom: '24px',
          boxShadow: theme.shadows.sm,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Subtle accent gradient */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            background: `linear-gradient(90deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[400]} 100%)`,
            borderRadius: '16px 16px 0 0'
          }}
        />
        
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <div>
            <h1
              style={{
                fontSize: '2rem',
                fontWeight: '700',
                color: theme.colors.text.primary,
                marginBottom: '8px'
              }}
            >
              {t('marketplace.title', 'Solar Products Marketplace')}
            </h1>
            <p
              style={{
                fontSize: '1rem',
                color: theme.colors.text.secondary,
                margin: 0
              }}
            >
              {t('marketplace.subtitle', 'Browse and purchase high-quality solar products from verified contractors')}
            </p>
          </div>

          {/* Cart Summary */}
          {cart.length > 0 && (
            <div
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary[500]}15 0%, ${theme.colors.secondary[500]}15 100%)`,
                padding: '16px',
                borderRadius: '12px',
                border: `1px solid ${theme.colors.primary[500]}30`,
                minWidth: '200px'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '8px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary[500]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                    <line x1="3" y1="6" x2="21" y2="6"/>
                    <path d="M16 10a4 4 0 0 1-8 0"/>
                  </svg>
                  <span style={{ fontWeight: '600' }}>
                    {getTotalCartItems()} {t('marketplace.items')}
                  </span>
                </div>
              </div>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '700',
                  color: theme.colors.primary[500],
                  marginBottom: '12px'
                }}
              >
                {formatPrice(getTotalCartValue())}
              </div>
              <button
                onClick={() => navigate('/dashboard/checkout')}
                style={{
                  background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px 16px',
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: theme.transitions.normal,
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: `0 2px 8px ${theme.colors.primary[500]}40`
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = `0 4px 12px ${theme.colors.primary[500]}50`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = `0 2px 8px ${theme.colors.primary[500]}40`;
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6L9 17l-5-5"/>
                </svg>
                {t('marketplace.checkout', 'Checkout')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Search and Filters */}
      <div
        style={{
          background: 'rgba(248, 250, 252, 0.6)',
          borderRadius: '16px',
          border: `2px solid ${theme.colors.borders.light}`,
          padding: '20px',
          marginBottom: '24px',
          boxShadow: theme.shadows.md,
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Search section accent */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '3px',
            background: `linear-gradient(90deg, ${theme.colors.primary[400]} 0%, ${theme.colors.primary[300]} 100%)`,
            borderRadius: '16px 16px 0 0'
          }}
        />
        
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth > 640 ? '1fr auto' : '1fr',
            gap: '16px',
            alignItems: 'center'
          }}
        >
          {/* Search Input */}
          <input
            type="text"
            placeholder={t('marketplace.searchPlaceholder', 'Search solar products...')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              border: `2px solid ${theme.colors.borders.light}`,
              borderRadius: '12px',
              padding: '14px 20px',
              fontSize: '1rem',
              color: theme.colors.text.primary,
              outline: 'none',
              transition: theme.transitions.normal,
              fontFamily: theme.typography.fonts.primary,
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.1)',
              width: '100%'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = theme.colors.primary[500];
              e.target.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.1), 0 0 0 3px ${theme.colors.primary[500]}20`;
            }}
            onBlur={(e) => {
              e.target.style.borderColor = theme.colors.borders.light;
              e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.1)';
            }}
          />

          {/* Filter Button */}
          <button
            style={{
              background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.secondary[500]} 100%)`,
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 20px',
              fontSize: '0.875rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: theme.transitions.normal,
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="22,3 2,3 10,12.46 10,19 14,21 14,12.46"/>
            </svg>
            {t('marketplace.filter', 'Filter')}
          </button>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '60px',
            background: 'transparent',
            borderRadius: '16px',
            border: `1px solid ${theme.colors.borders.light}`
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                border: `3px solid ${theme.colors.borders.light}`,
                borderTop: `3px solid ${theme.colors.primary[500]}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                margin: '0 auto 16px'
              }}
            />
            <p style={{ color: theme.colors.text.secondary }}>
              {t('marketplace.loading', 'Loading products...')}
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div
          style={{
            background: 'transparent',
            borderRadius: '16px',
            border: `1px solid ${theme.colors.borders.light}`,
            padding: '40px',
            textAlign: 'center',
            color: theme.colors.semantic.error.main
          }}
        >
          <h3 style={{ marginBottom: '8px' }}>{t('marketplace.errorTitle', 'Error Loading Products')}</h3>
          <p style={{ marginBottom: '16px' }}>{error}</p>
          <button
            onClick={loadProducts}
            style={{
              background: theme.colors.primary[500],
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: 'pointer'
            }}
          >
            {t('marketplace.retry', 'Try Again')}
          </button>
        </div>
      )}

      {/* Products Grid */}
      {!loading && !error && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(min(300px, 100%), 1fr))',
            gap: 'clamp(16px, 3vw, 24px)',
            marginBottom: '40px'
          }}
        >
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && products.length === 0 && (
        <div
          style={{
            background: 'transparent',
            borderRadius: '16px',
            border: `1px solid ${theme.colors.borders.light}`,
            padding: '60px',
            textAlign: 'center'
          }}
        >
          <svg
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke={theme.colors.text.muted}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ margin: '0 auto 16px' }}
          >
            <circle cx="11" cy="11" r="8"/>
            <path d="M21 21l-4.35-4.35"/>
          </svg>
          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: theme.colors.text.secondary,
              marginBottom: '8px'
            }}
          >
            {t('marketplace.noProducts', 'No products found')}
          </h3>
          <p style={{ color: theme.colors.text.muted }}>
            {t('marketplace.noProductsDesc', 'Try adjusting your search criteria')}
          </p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: '8px',
            marginTop: '32px'
          }}
        >
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            style={{
              background: currentPage === 1 ? theme.colors.neutral[200] : theme.colors.primary[500],
              color: currentPage === 1 ? theme.colors.text.secondary : 'white',
              border: `1px solid ${currentPage === 1 ? theme.colors.neutral[300] : theme.colors.primary[500]}`,
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 1 ? 0.7 : 1,
              transition: theme.transitions.normal
            }}
          >
            {t('marketplace.previous', 'Previous')}
          </button>

          <span
            style={{
              padding: '8px 16px',
              color: theme.colors.text.secondary
            }}
          >
            {currentPage} / {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            style={{
              background: currentPage === totalPages ? theme.colors.neutral[200] : theme.colors.primary[500],
              color: currentPage === totalPages ? theme.colors.text.secondary : 'white',
              border: `1px solid ${currentPage === totalPages ? theme.colors.neutral[300] : theme.colors.primary[500]}`,
              borderRadius: '8px',
              padding: '8px 16px',
              cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
              opacity: currentPage === totalPages ? 0.7 : 1,
              transition: theme.transitions.normal
            }}
          >
            {t('marketplace.next', 'Next')}
          </button>
        </div>
      )}

      {/* Add CSS for animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          @keyframes stockWave {
            0% {
              left: -100%;
              opacity: 0;
            }
            50% {
              left: 0%;
              opacity: 1;
            }
            100% {
              left: 100%;
              opacity: 0;
            }
          }
          
          @keyframes stockGlow {
            0%, 100% {
              box-shadow: 0 2px 8px ${theme.colors.primary[500]}40, 0 0 0 1px ${theme.colors.primary[500]}20;
            }
            50% {
              box-shadow: 0 4px 12px ${theme.colors.primary[500]}60, 0 0 0 2px ${theme.colors.primary[500]}30;
            }
          }
        `}
      </style>
      
      </div> {/* Close main content card */}
    </div>
  );
};

export default UserMarketplace;
