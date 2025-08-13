import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { theme } from '../theme';
import { marketplaceService, Product } from '../services/marketplace.service';

// Shopping cart item interface
interface CartItem {
  product: Product;
  quantity: number;
}

interface ProductDetailProps {
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

const ProductDetail: React.FC<ProductDetailProps> = ({ 
  user, 
  cart, 
  addToCart, 
  removeFromCart, 
  updateCartQuantity, 
  getTotalCartItems, 
  getTotalCartValue 
}) => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  // State management
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);

  // Load product details
  useEffect(() => {
    if (productId) {
      loadProductDetails();
    }
  }, [productId]);

  const loadProductDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('📱 Loading product details for ID:', productId);
      const productData = await marketplaceService.getProductById(productId!);
      setProduct(productData);
      
      console.log('✅ Loaded product:', productData.name);
    } catch (err) {
      console.error('❌ Error loading product:', err);
      setError(err instanceof Error ? err.message : 'Failed to load product');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // Get category-specific specification fields
  const getCategorySpecifications = (product: Product) => {
    if (!product.specifications || typeof product.specifications !== 'object') {
      return [];
    }

    const specs = product.specifications;
    
    switch (product.productCategory) {
      case 'INVERTER':
        return [
          { label: t('specs.powerRate', 'Power Rating'), value: specs.powerRate },
          { label: t('specs.type', 'Type'), value: specs.type },
          { label: t('specs.mppts', 'MPPT Inputs'), value: specs.mppts },
          { label: t('specs.mpptRange', 'MPPT Range'), value: specs.mpptRange },
          { label: t('specs.maxInputCurrent', 'Max Input Current'), value: specs.maxInputCurrent },
          { label: t('specs.outputPhase', 'Output Phase'), value: specs.outputPhase },
          { label: t('specs.communication', 'Communication'), value: specs.inverterCommunication },
          { label: t('specs.weight', 'Weight'), value: specs.inverterWeight },
        ].filter(spec => spec.value);

      case 'BATTERY':
        return [
          { label: t('specs.capacity', 'Capacity'), value: specs.capacity },
          { label: t('specs.voltage', 'Voltage'), value: specs.voltage },
          { label: t('specs.current', 'Current'), value: specs.current },
          { label: t('specs.cycleLife', 'Cycle Life'), value: specs.cycleLife },
          { label: t('specs.communication', 'Communication'), value: specs.batteryCommunication },
          { label: t('specs.weight', 'Weight'), value: specs.batteryWeight },
          { label: t('specs.dimensions', 'Dimensions'), value: specs.batteryDimensions },
        ].filter(spec => spec.value);

      case 'SOLAR_PANEL':
        return [
          { label: t('specs.panelPower', 'Panel Power'), value: specs.panelPower },
          { label: t('specs.panelEfficiency', 'Efficiency'), value: specs.panelEfficiency },
          { label: t('specs.cellType', 'Cell Type'), value: specs.cellType },
          { label: t('specs.panelVoltage', 'Operating Voltage'), value: specs.panelVoltage },
          { label: t('specs.workingCurrent', 'Working Current'), value: specs.workingCurrent },
          { label: t('specs.workingTemperature', 'Operating Temperature'), value: specs.workingTemperature },
          { label: t('specs.dimensions', 'Dimensions'), value: specs.panelDimensions },
          { label: t('specs.weight', 'Weight'), value: specs.panelWeight },
          { label: t('specs.warranty', 'Warranty'), value: specs.warranty },
        ].filter(spec => spec.value);

      case 'FULL_SYSTEM':
        return [
          { label: t('specs.systemPower', 'System Power'), value: specs.systemPower },
          { label: t('specs.systemPeak', 'Peak Power'), value: specs.systemPeak },
          { label: t('specs.acOutput', 'AC Output'), value: specs.cOutput },
          { label: t('specs.batteryCapacity', 'Battery Capacity'), value: specs.batteryCapacity },
          { label: t('specs.chargingPower', 'Charging Power'), value: specs.chargingPower },
          { label: t('specs.solarConfiguration', 'Solar Configuration'), value: specs.solarConfiguration },
          { label: t('specs.generatingCapacity', 'Daily Generation'), value: specs.generatingCapacity },
          { label: t('specs.systemDimensions', 'System Dimensions'), value: specs.systemDimensions1 },
          { label: t('specs.totalWeight', 'Total Weight'), value: specs.totalWeight },
        ].filter(spec => spec.value);

      default:
        // Fallback: show legacy fields or all available specs
        return [
          { label: t('specs.wattage', 'Wattage'), value: specs.wattage },
          { label: t('specs.efficiency', 'Efficiency'), value: specs.efficiency || specs.panelEfficiency },
          { label: t('specs.warranty', 'Warranty'), value: specs.warranty },
          { label: t('specs.dimensions', 'Dimensions'), value: specs.dimensions || specs.panelDimensions },
          { label: t('specs.weight', 'Weight'), value: specs.weight || specs.panelWeight },
        ].filter(spec => spec.value);
    }
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

  const handleAddToCart = () => {
    if (product) {
      addToCart(product, quantity);
      console.log(`🛒 Added ${quantity} x ${product.name} to cart`);
    }
  };

  // Check if product is in cart
  const isInCart = product ? cart.some(item => item.product.id === product.id) : false;
  const cartItem = product ? cart.find(item => item.product.id === product.id) : null;

  const handleBackToMarketplace = () => {
    navigate('/dashboard/marketplace');
  };

  const openImageModal = (index: number = 0) => {
    setModalImageIndex(index);
    setIsImageModalOpen(true);
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
  };

  const closeImageModal = () => {
    setIsImageModalOpen(false);
    document.body.style.overflow = 'auto'; // Restore scrolling
  };

  const nextImage = () => {
    if (product && product.images) {
      setModalImageIndex((prev) => (prev + 1) % product.images.length);
    }
  };

  const prevImage = () => {
    if (product && product.images) {
      setModalImageIndex((prev) => (prev - 1 + product.images.length) % product.images.length);
    }
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (!isImageModalOpen) return;
    
    switch(e.key) {
      case 'Escape':
        closeImageModal();
        break;
      case 'ArrowLeft':
        prevImage();
        break;
      case 'ArrowRight':
        nextImage();
        break;
    }
  };

  // Add keyboard event listeners
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'auto'; // Cleanup on unmount
    };
  }, [isImageModalOpen, product]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: theme.colors.gradients.primaryLight,
          padding: 'clamp(8px, 2vw, 16px)',
          fontFamily: theme.typography.fonts.primary,
          direction: isRTL ? 'rtl' : 'ltr'
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            border: `1px solid ${theme.colors.borders.light}`,
            padding: 'clamp(16px, 4vw, 24px)',
            width: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '400px'
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
              {t('marketplace.loading', 'Loading product...')}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: theme.colors.gradients.primaryLight,
          padding: 'clamp(8px, 2vw, 16px)',
          fontFamily: theme.typography.fonts.primary,
          direction: isRTL ? 'rtl' : 'ltr'
        }}
      >
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '20px',
            border: `1px solid ${theme.colors.borders.light}`,
            padding: 'clamp(16px, 4vw, 24px)',
            width: '100%',
            textAlign: 'center'
          }}
        >
          <h2 style={{ color: theme.colors.semantic.error.main, marginBottom: '16px' }}>
            {t('marketplace.productNotFound', 'Product Not Found')}
          </h2>
          <p style={{ color: theme.colors.text.secondary, marginBottom: '24px' }}>
            {error || t('marketplace.productNotFoundDesc', 'The product you are looking for could not be found.')}
          </p>
          <button
            onClick={handleBackToMarketplace}
            style={{
              background: theme.colors.primary[500],
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '12px 24px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              transition: theme.transitions.normal
            }}
          >
            {t('marketplace.backToMarketplace', 'Back to Marketplace')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.colors.gradients.primaryLight,
        padding: 'clamp(8px, 2vw, 16px)',
        fontFamily: theme.typography.fonts.primary,
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.95)',
          borderRadius: '20px',
          border: `1px solid ${theme.colors.borders.light}`,
          padding: 'clamp(16px, 4vw, 24px)',
          width: '100%',
          minHeight: 'calc(100vh - 32px)'
        }}
      >
        {/* Back Button */}
        <button
          onClick={handleBackToMarketplace}
          style={{
            background: 'transparent',
            border: `1px solid ${theme.colors.borders.light}`,
            borderRadius: '12px',
            padding: '12px 20px',
            marginBottom: '24px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            color: theme.colors.text.secondary,
            transition: theme.transitions.normal,
            fontSize: '0.875rem',
            fontWeight: '500',
            whiteSpace: 'nowrap',
            minWidth: 'fit-content'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = theme.colors.neutral[50];
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15,18 9,12 15,6"/>
          </svg>
          {t('marketplace.backToMarketplace', 'Back to Marketplace')}
        </button>

        {/* Product Content */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth > 768 ? '1fr 1fr' : '1fr',
            gap: 'clamp(24px, 5vw, 48px)',
            alignItems: 'start'
          }}
        >
          {/* Product Images */}
          <div>
            {/* Main Image */}
            <div
              style={{
                width: '100%',
                height: '400px',
                background: (product.images && product.images.length > 0)
                  ? `url(${product.images[selectedImageIndex]?.file_url || product.primaryImage})` 
                  : `linear-gradient(135deg, ${theme.colors.neutral[100]} 0%, ${theme.colors.neutral[200]} 100%)`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                borderRadius: '16px',
                border: `1px solid ${theme.colors.borders.light}`,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '16px',
                cursor: product.images && product.images.length > 0 ? 'pointer' : 'default',
                transition: theme.transitions.normal
              }}
              onClick={() => {
                if (product.images && product.images.length > 0) {
                  openImageModal(selectedImageIndex);
                }
              }}
              onMouseEnter={(e) => {
                if (product.images && product.images.length > 0) {
                  e.currentTarget.style.transform = 'scale(1.02)';
                }
              }}
              onMouseLeave={(e) => {
                if (product.images && product.images.length > 0) {
                  e.currentTarget.style.transform = 'scale(1)';
                }
              }}
            >
              {!product.primaryImage && (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={theme.colors.neutral[400]} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                  <circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21,15 16,10 5,21"/>
                </svg>
              )}

              {/* Offer Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  left: isRTL ? 'auto' : '16px',
                  right: isRTL ? '16px' : 'auto',
                  background: `linear-gradient(135deg, ${theme.colors.semantic.warning.main} 0%, ${theme.colors.semantic.warning.dark} 100%)`,
                  color: 'white',
                  fontSize: '1rem',
                  padding: '8px 12px',
                  borderRadius: '12px',
                  fontWeight: '700',
                  boxShadow: `0 4px 8px ${theme.colors.semantic.warning.main}40`
                }}
              >
                -15%
              </div>

              {/* Stock Badge */}
              <div
                style={{
                  position: 'absolute',
                  top: '16px',
                  right: isRTL ? 'auto' : '16px',
                  left: isRTL ? '16px' : 'auto',
                  background: product.stock_status === 'IN_STOCK' 
                    ? theme.colors.primary[500]
                    : `${theme.colors.semantic.error.main}e6`,
                  color: 'white',
                  fontSize: '0.875rem',
                  padding: '6px 12px',
                  borderRadius: '12px',
                  fontWeight: '600'
                }}
              >
                {product.stock_status === 'IN_STOCK' ? t('marketplace.inStock') : t('marketplace.outOfStock')}
              </div>
              
              {/* Click to zoom indicator */}
              {product.images && product.images.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    fontSize: '0.75rem',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/>
                    <path d="M21 21l-4.35-4.35"/>
                    <path d="M11 8v6"/>
                    <path d="M8 11h6"/>
                  </svg>
                  Click to zoom
                </div>
              )}
            </div>

            {/* Thumbnail Images */}
            {product.images && product.images.length > 1 && (
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  overflowX: 'auto',
                  padding: '8px 0',
                  scrollbarWidth: 'thin'
                }}
              >
                {product.images.map((image, index) => (
                  <div
                    key={image.id || index}
                    style={{
                      minWidth: '80px',
                      width: '80px',
                      height: '80px',
                      background: `url(${image.file_url})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                      borderRadius: '8px',
                      border: selectedImageIndex === index 
                        ? `2px solid ${theme.colors.primary[500]}` 
                        : `1px solid ${theme.colors.borders.light}`,
                      cursor: 'pointer',
                      transition: theme.transitions.fast,
                      opacity: selectedImageIndex === index ? 1 : 0.7
                    }}
                    onClick={() => setSelectedImageIndex(index)}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '1';
                      e.currentTarget.style.transform = 'scale(1.05)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = selectedImageIndex === index ? '1' : '0.7';
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Product Information */}
          <div>
            {/* Product Title */}
            <h1
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: '700',
                color: theme.colors.text.primary,
                marginBottom: '12px',
                lineHeight: '1.3'
              }}
            >
              {product.name}
            </h1>

            {/* Brand */}
            <p
              style={{
                fontSize: '1rem',
                color: theme.colors.text.secondary,
                marginBottom: '16px',
                fontWeight: '500'
              }}
            >
              {t('marketplace.brand', 'Brand')}: {product.brand}
            </p>

            {/* Price */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span
                  style={{
                    fontSize: 'clamp(1.75rem, 5vw, 2.5rem)',
                    fontWeight: '700',
                    color: theme.colors.primary[500]
                  }}
                >
                  {formatPrice(parseFloat(product.price))}
                </span>
              </div>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: theme.colors.text.muted,
                  margin: 0
                }}
              >
                {product.vat_included ? t('marketplace.inclVAT') : t('marketplace.exclVAT')}
              </p>
            </div>

            {/* Dynamic Category-Based Specifications */}
            {product.specifications && (() => {
              const categorySpecs = getCategorySpecifications(product);
              const categoryInfo = getCategoryInfo(product.productCategory || '');
              
              return categorySpecs.length > 0 ? (
                <div style={{ marginBottom: '24px' }}>
                  <h3
                    style={{
                      fontSize: '1.125rem',
                      fontWeight: '600',
                      color: theme.colors.text.primary,
                      marginBottom: '4px'
                    }}
                  >
                    {t('marketplace.specifications', 'Specifications')}
                  </h3>
                  
                  {/* Category Badge */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      background: `${theme.colors.primary[500]}12`,
                      color: theme.colors.primary[600],
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      marginBottom: '12px',
                      border: `1px solid ${theme.colors.primary[500]}20`
                    }}
                  >
                    <span>{categoryInfo.icon}</span>
                    <span>{isRTL ? categoryInfo.nameAr : categoryInfo.name}</span>
                  </div>

                  <div
                    style={{
                      background: theme.colors.neutral[50],
                      borderRadius: '12px',
                      padding: '16px',
                      border: `1px solid ${theme.colors.borders.light}`
                    }}
                  >
                    {categorySpecs.map((spec, index) => (
                      <div 
                        key={spec.label}
                        style={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center',
                          marginBottom: index === categorySpecs.length - 1 ? '0' : '12px',
                          paddingBottom: index === categorySpecs.length - 1 ? '0' : '12px',
                          borderBottom: index === categorySpecs.length - 1 ? 'none' : `1px solid ${theme.colors.borders.light}`
                        }}
                      >
                        <span 
                          style={{ 
                            color: theme.colors.text.secondary,
                            fontSize: '0.9rem',
                            fontWeight: '500',
                            maxWidth: '50%'
                          }}
                        >
                          {spec.label}:
                        </span>
                        <span 
                          style={{ 
                            color: theme.colors.text.primary, 
                            fontWeight: '600',
                            fontSize: '0.9rem',
                            textAlign: 'right',
                            maxWidth: '50%'
                          }}
                        >
                          {spec.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}

            {/* Description */}
            {product.description && (
              <div style={{ marginBottom: '24px' }}>
                <h3
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: theme.colors.text.primary,
                    marginBottom: '12px'
                  }}
                >
                  {t('marketplace.description', 'Description')}
                </h3>
                <p
                  style={{
                    color: theme.colors.text.secondary,
                    lineHeight: '1.6',
                    margin: 0
                  }}
                >
                  {product.description}
                </p>
              </div>
            )}

            {/* Cart Actions */}
            <div
              style={{
                background: theme.colors.neutral[50],
                borderRadius: '16px',
                padding: '20px',
                border: `1px solid ${theme.colors.borders.light}`
              }}
            >
              {!isInCart ? (
                /* Add to Cart Section */
                <>
                  {/* Quantity Selector */}
                  <div style={{ marginBottom: '16px' }}>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.875rem',
                        fontWeight: '600',
                        color: theme.colors.text.primary,
                        marginBottom: '12px'
                      }}
                    >
                      {t('marketplace.selectQuantity', 'Select Quantity')}
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          border: `2px solid ${theme.colors.primary[500]}20`,
                          background: 'white',
                          color: theme.colors.primary[500],
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: theme.transitions.normal,
                          boxShadow: theme.shadows.sm
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `${theme.colors.primary[500]}10`;
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        −
                      </button>
                      <div
                        style={{
                          background: `linear-gradient(135deg, ${theme.colors.primary[500]}10 0%, ${theme.colors.primary[400]}10 100%)`,
                          border: `2px solid ${theme.colors.primary[500]}20`,
                          borderRadius: '12px',
                          padding: '12px 20px',
                          minWidth: '80px',
                          textAlign: 'center'
                        }}
                      >
                        <span
                          style={{
                            fontSize: '1.25rem',
                            fontWeight: '700',
                            color: theme.colors.primary[500]
                          }}
                        >
                          {quantity}
                        </span>
                      </div>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        style={{
                          width: '44px',
                          height: '44px',
                          borderRadius: '12px',
                          border: `2px solid ${theme.colors.primary[500]}20`,
                          background: 'white',
                          color: theme.colors.primary[500],
                          fontSize: '1.25rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: theme.transitions.normal,
                          boxShadow: theme.shadows.sm
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `${theme.colors.primary[500]}10`;
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'white';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        +
                      </button>
                    </div>
                    
                    {/* Total Preview */}
                    {quantity > 1 && (
                      <div
                        style={{
                          background: `${theme.colors.primary[500]}08`,
                          borderRadius: '10px',
                          padding: '12px 16px',
                          border: `1px solid ${theme.colors.primary[500]}15`,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontSize: '0.875rem', color: theme.colors.text.secondary }}>
                          {quantity} × {formatPrice(parseFloat(product.price))} =
                        </span>
                        <span
                          style={{
                            fontSize: '1.125rem',
                            fontWeight: '700',
                            color: theme.colors.primary[500]
                          }}
                        >
                          {formatPrice(parseFloat(product.price) * quantity)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Add to Cart Button */}
                  <button
                    onClick={handleAddToCart}
                    disabled={product.stock_status !== 'IN_STOCK'}
                    style={{
                      background: product.stock_status === 'IN_STOCK'
                        ? `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`
                        : theme.colors.neutral[300],
                      color: 'white',
                      border: 'none',
                      borderRadius: '14px',
                      padding: '18px 24px',
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      cursor: product.stock_status === 'IN_STOCK' ? 'pointer' : 'not-allowed',
                      transition: theme.transitions.normal,
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      boxShadow: product.stock_status === 'IN_STOCK' 
                        ? `0 6px 20px ${theme.colors.primary[500]}35`
                        : 'none'
                    }}
                    onMouseEnter={(e) => {
                      if (product.stock_status === 'IN_STOCK') {
                        e.currentTarget.style.transform = 'translateY(-3px)';
                        e.currentTarget.style.boxShadow = `0 8px 25px ${theme.colors.primary[500]}45`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (product.stock_status === 'IN_STOCK') {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = `0 6px 20px ${theme.colors.primary[500]}35`;
                      }
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                    {product.stock_status === 'IN_STOCK' 
                      ? t('marketplace.addToCart', 'Add to Cart')
                      : t('marketplace.outOfStock', 'Out of Stock')
                    }
                  </button>
                </>
              ) : (
                /* In Cart Management Section */
                <div
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.semantic.success.main}08 0%, ${theme.colors.semantic.success.light}12 100%)`,
                    borderRadius: '16px',
                    padding: '20px',
                    border: `2px solid ${theme.colors.semantic.success.main}20`,
                    boxShadow: `0 4px 15px ${theme.colors.semantic.success.main}15`
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.semantic.success.main} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5"/>
                      </svg>
                      <span
                        style={{
                          fontSize: '1rem',
                          fontWeight: '700',
                          color: theme.colors.semantic.success.dark
                        }}
                      >
                        {t('marketplace.inYourCart', 'In Your Cart')}
                      </span>
                    </div>
                    <button
                      onClick={() => removeFromCart(product.id)}
                      style={{
                        background: `${theme.colors.semantic.error.main}12`,
                        color: theme.colors.semantic.error.main,
                        border: `1.5px solid ${theme.colors.semantic.error.main}25`,
                        borderRadius: '10px',
                        padding: '8px 14px',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: theme.transitions.normal,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${theme.colors.semantic.error.main}20`;
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = `${theme.colors.semantic.error.main}12`;
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3,6 5,6 21,6"/>
                        <path d="M19,6v14a2,2 0 0,1-2,2H7a2,2 0 0,1-2-2V6m3,0V4a2,2 0 0,1 2-2h4a2,2 0 0,1 2,2v2"/>
                        <line x1="10" y1="11" x2="10" y2="17"/>
                        <line x1="14" y1="11" x2="14" y2="17"/>
                      </svg>
                      {t('marketplace.remove', 'Remove')}
                    </button>
                  </div>

                  {/* Quantity Controls */}
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.7)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: `1px solid ${theme.colors.semantic.success.main}15`
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span
                          style={{
                            fontSize: '0.9rem',
                            fontWeight: '600',
                            color: theme.colors.text.primary
                          }}
                        >
                          {t('marketplace.quantity', 'Quantity')}:
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            onClick={() => updateCartQuantity(product.id, Math.max(1, cartItem!.quantity - 1))}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              border: `2px solid ${theme.colors.semantic.success.main}25`,
                              background: 'white',
                              color: theme.colors.semantic.success.main,
                              fontSize: '1.1rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: theme.transitions.normal
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = `${theme.colors.semantic.success.main}10`;
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            −
                          </button>
                          <div
                            style={{
                              background: `linear-gradient(135deg, ${theme.colors.semantic.success.main}12 0%, ${theme.colors.semantic.success.light}15 100%)`,
                              border: `2px solid ${theme.colors.semantic.success.main}20`,
                              borderRadius: '10px',
                              padding: '8px 16px',
                              minWidth: '50px',
                              textAlign: 'center'
                            }}
                          >
                            <span
                              style={{
                                fontSize: '1.1rem',
                                fontWeight: '700',
                                color: theme.colors.semantic.success.dark
                              }}
                            >
                              {cartItem!.quantity}
                            </span>
                          </div>
                          <button
                            onClick={() => updateCartQuantity(product.id, cartItem!.quantity + 1)}
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '10px',
                              border: `2px solid ${theme.colors.semantic.success.main}25`,
                              background: 'white',
                              color: theme.colors.semantic.success.main,
                              fontSize: '1.1rem',
                              fontWeight: '700',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: theme.transitions.normal
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = `${theme.colors.semantic.success.main}10`;
                              e.currentTarget.style.transform = 'scale(1.1)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'white';
                              e.currentTarget.style.transform = 'scale(1)';
                            }}
                          >
                            +
                          </button>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.75rem', color: theme.colors.text.secondary, marginBottom: '2px' }}>
                          {t('marketplace.itemTotal', 'Item Total')}
                        </div>
                        <div
                          style={{
                            fontSize: '1.15rem',
                            fontWeight: '700',
                            color: theme.colors.semantic.success.dark
                          }}
                        >
                          {formatPrice(parseFloat(product.price) * cartItem!.quantity)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Checkout Button - Only show when current product is in cart OR when cart has other items */}
              {(isInCart || cart.length > 0) && (
                <div style={{ marginTop: '20px' }}>
                  <button
                    onClick={() => navigate('/dashboard/checkout')}
                    style={{
                      width: '100%',
                      background: `linear-gradient(135deg, ${theme.colors.semantic.success.main} 0%, ${theme.colors.semantic.success.dark} 100%)`,
                      color: 'white',
                      border: 'none',
                      borderRadius: '12px',
                      padding: '16px 24px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: theme.transitions.normal,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '12px',
                      boxShadow: `0 4px 15px ${theme.colors.semantic.success.main}40`
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = `0 6px 20px ${theme.colors.semantic.success.main}50`;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = `0 4px 15px ${theme.colors.semantic.success.main}40`;
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    {isInCart 
                      ? `${t('marketplace.proceedToCheckout', 'Proceed to Checkout')} (${getTotalCartItems()} ${getTotalCartItems() === 1 ? 'item' : 'items'})`
                      : cart.length > 0 
                        ? `${t('marketplace.viewCart', 'View Cart')} (${getTotalCartItems()} ${getTotalCartItems() === 1 ? 'item' : 'items'})`
                        : t('marketplace.proceedToCheckout', 'Proceed to Checkout')
                    }
                  </button>
                  
                  <div
                    style={{
                      marginTop: '12px',
                      padding: '12px',
                      background: `${theme.colors.semantic.success.main}10`,
                      borderRadius: '8px',
                      textAlign: 'center',
                      border: `1px solid ${theme.colors.semantic.success.main}20`
                    }}
                  >
                    <span style={{ fontSize: '0.875rem', color: theme.colors.text.secondary }}>
                      {t('marketplace.cartTotal', 'Cart Total')}: 
                    </span>
                    <span
                      style={{
                        fontSize: '1.125rem',
                        fontWeight: '700',
                        color: theme.colors.semantic.success.dark,
                        marginLeft: '8px'
                      }}
                    >
                      {formatPrice(getTotalCartValue())}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Fullscreen Image Modal */}
        {isImageModalOpen && product && product.images && product.images.length > 0 && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.95)',
              zIndex: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(5px)'
            }}
            onClick={closeImageModal}
          >
            {/* Modal Content */}
            <div
              style={{
                position: 'relative',
                maxWidth: '90vw',
                maxHeight: '90vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              onClick={(e) => e.stopPropagation()} // Prevent closing when clicking on image
            >
              {/* Close Button */}
              <button
                onClick={closeImageModal}
                style={{
                  position: 'absolute',
                  top: '20px',
                  right: '20px',
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '20px',
                  fontWeight: 'bold',
                  zIndex: 10001,
                  transition: theme.transitions.fast
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                }}
              >
                ×
              </button>

              {/* Previous Button */}
              {product.images.length > 1 && (
                <button
                  onClick={prevImage}
                  style={{
                    position: 'absolute',
                    left: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    zIndex: 10001,
                    transition: theme.transitions.fast
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                  }}
                >
                  ‹
                </button>
              )}

              {/* Next Button */}
              {product.images.length > 1 && (
                <button
                  onClick={nextImage}
                  style={{
                    position: 'absolute',
                    right: '20px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '50px',
                    height: '50px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 'bold',
                    zIndex: 10001,
                    transition: theme.transitions.fast
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.9)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(0, 0, 0, 0.7)';
                  }}
                >
                  ›
                </button>
              )}

              {/* Main Image */}
              <img
                src={product.images[modalImageIndex]?.file_url}
                alt={product.name}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 10px 40px rgba(0, 0, 0, 0.5)'
                }}
              />

              {/* Image Counter */}
              {product.images.length > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '20px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.7)',
                    color: 'white',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '14px',
                    fontWeight: '500'
                  }}
                >
                  {modalImageIndex + 1} / {product.images.length}
                </div>
              )}

              {/* Thumbnail Strip */}
              {product.images.length > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: '60px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    gap: '8px',
                    overflowX: 'auto',
                    maxWidth: '80vw',
                    padding: '8px',
                    scrollbarWidth: 'thin'
                  }}
                >
                  {product.images.map((image, index) => (
                    <div
                      key={`modal-thumb-${image.id || index}`}
                      style={{
                        minWidth: '60px',
                        width: '60px',
                        height: '60px',
                        background: `url(${image.file_url})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        backgroundRepeat: 'no-repeat',
                        borderRadius: '4px',
                        border: modalImageIndex === index 
                          ? `2px solid ${theme.colors.primary[500]}` 
                          : `1px solid rgba(255, 255, 255, 0.3)`,
                        cursor: 'pointer',
                        transition: theme.transitions.fast,
                        opacity: modalImageIndex === index ? 1 : 0.6
                      }}
                      onClick={() => setModalImageIndex(index)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.opacity = '1';
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.opacity = modalImageIndex === index ? '1' : '0.6';
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductDetail;