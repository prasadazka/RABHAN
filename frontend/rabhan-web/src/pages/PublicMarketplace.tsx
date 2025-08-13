import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme';
import { marketplaceService, Product, ProductFilters, PaginationParams } from '../services/marketplace.service';
import LoginPopup from '../components/LoginPopup';

interface PublicMarketplaceProps {
  onLogin: () => void;
  onRegister: () => void;
  isLoginPopupOpen: boolean;
  onCloseLoginPopup: () => void;
  onLoginSuccess: (user: any) => void;
  onShowCalculator: () => void;
  onHome: () => void;
}

const PublicMarketplace: React.FC<PublicMarketplaceProps> = ({
  onLogin,
  onRegister,
  isLoginPopupOpen,
  onCloseLoginPopup,
  onLoginSuccess,
  onShowCalculator,
  onHome
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

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

      console.log('🛒 Loading public marketplace products with filters:', filters);
      
      const result = await marketplaceService.searchProducts(filters, pagination);
      setProducts(result.data);
      setTotalPages(result.pagination.totalPages);
      
      console.log(`✅ Loaded ${result.data.length} products for public marketplace`);
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

  // Handle login prompt for cart actions
  const handleLoginPrompt = () => {
    setShowLoginPrompt(true);
  };

  // Product card component
  const ProductCard: React.FC<{ product: Product }> = ({ product }) => {
    const handleProductClick = () => {
      navigate(`/marketplace/product/${product.id}`);
    };

    const handleAddToCartClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleLoginPrompt();
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

          {/* Add to Cart Button */}
          <button
            onClick={handleAddToCartClick}
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
        </div>
      </div>
    );
  };

  // Login prompt modal
  const LoginPromptModal = () => {
    if (!showLoginPrompt) return null;

    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem',
          zIndex: theme.zIndex.modal
        }}
        onClick={() => setShowLoginPrompt(false)}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%',
            textAlign: 'center'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Icon */}
          <div
            style={{
              width: '64px',
              height: '64px',
              background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.secondary[500]} 100%)`,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: `0 8px 20px ${theme.colors.primary[500]}30`
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
          </div>

          <h3
            style={{
              fontSize: '1.25rem',
              fontWeight: '600',
              color: theme.colors.text.primary,
              marginBottom: '1rem'
            }}
          >
            Login Required
          </h3>
          
          <p
            style={{
              fontSize: '0.875rem',
              color: theme.colors.text.secondary,
              marginBottom: '1.5rem',
              lineHeight: '1.5'
            }}
          >
            Please login to add products to cart and make purchases
          </p>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => {
                setShowLoginPrompt(false);
                onLogin();
              }}
              style={{
                flex: 1,
                background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: theme.transitions.normal
              }}
            >
              {t('header.login')}
            </button>
            
            <button
              onClick={() => {
                setShowLoginPrompt(false);
                onRegister();
              }}
              style={{
                flex: 1,
                background: 'transparent',
                color: theme.colors.primary[500],
                border: `2px solid ${theme.colors.primary[500]}`,
                borderRadius: '12px',
                padding: '12px 20px',
                fontSize: '0.875rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: theme.transitions.normal
              }}
            >
              {t('header.register')}
            </button>
          </div>

          <button
            onClick={() => setShowLoginPrompt(false)}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              width: '32px',
              height: '32px',
              border: 'none',
              background: 'rgba(107, 114, 128, 0.1)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '1.25rem'
            }}
          >
            ×
          </button>
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
                {t('marketplace.publicTitle', 'Solar Products Marketplace')}
              </h1>
              <p
                style={{
                  fontSize: '1rem',
                  color: theme.colors.text.secondary,
                  margin: 0
                }}
              >
                {t('marketplace.publicSubtitle', 'Discover high-quality solar products from verified contractors')}
              </p>
            </div>

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
          `}
        </style>
        
      </div> {/* Close main content card */}

      {/* Login Popup */}
      <LoginPopup
        isOpen={isLoginPopupOpen}
        onClose={onCloseLoginPopup}
        onLoginSuccess={onLoginSuccess}
        onRegister={onRegister}
      />

      {/* Login Prompt Modal */}
      <LoginPromptModal />
    </div>
  );
};

export default PublicMarketplace;