import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { theme } from '../theme';
import { marketplaceService, Product } from '../services/marketplace.service';

interface PublicProductDetailProps {
  onLogin: () => void;
  onRegister: () => void;
  onBack: () => void;
  onShowCalculator: () => void;
  onHome: () => void;
}

const PublicProductDetail: React.FC<PublicProductDetailProps> = ({ 
  onLogin,
  onRegister,
  onBack,
  onShowCalculator,
  onHome
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
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

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
      
      console.log('📱 Loading public product details for ID:', productId);
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

  const handleBackToMarketplace = () => {
    onBack();
  };

  const handleLoginPrompt = () => {
    setShowLoginPrompt(true);
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

            {/* Purchase Actions - Login Required */}
            <div
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary[500]}08 0%, ${theme.colors.secondary[500]}08 100%)`,
                borderRadius: '16px',
                padding: '24px',
                border: `1px solid ${theme.colors.primary[500]}20`,
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  marginBottom: '16px'
                }}
              >
                <svg 
                  width="48" 
                  height="48" 
                  viewBox="0 0 24 24" 
                  fill="none" 
                  stroke={theme.colors.primary[500]} 
                  strokeWidth="2" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                  style={{ margin: '0 auto 12px', display: 'block' }}
                >
                  <path d="M9 12l2 2 4-4"/>
                  <path d="M21 12c0 1.66-1.34 3-3 3h-5l-3-3h3l4 4 4-4z"/>
                  <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
                </svg>
                
                <h4
                  style={{
                    fontSize: '1.125rem',
                    fontWeight: '600',
                    color: theme.colors.text.primary,
                    marginBottom: '8px'
                  }}
                >
                  Login to Purchase
                </h4>
                
                <p
                  style={{
                    fontSize: '0.875rem',
                    color: theme.colors.text.secondary,
                    margin: 0
                  }}
                >
                  Create an account or login to add this product to your cart and complete your purchase
                </p>
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={onLogin}
                  style={{
                    background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    padding: '14px 28px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: theme.transitions.normal,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minWidth: '120px',
                    boxShadow: `0 4px 15px ${theme.colors.primary[500]}40`
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = `0 6px 20px ${theme.colors.primary[500]}50`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = `0 4px 15px ${theme.colors.primary[500]}40`;
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                    <polyline points="10,17 15,12 10,7"/>
                    <line x1="15" y1="12" x2="3" y2="12"/>
                  </svg>
                  {t('header.login')}
                </button>
                
                <button
                  onClick={onRegister}
                  style={{
                    background: 'transparent',
                    color: theme.colors.primary[500],
                    border: `2px solid ${theme.colors.primary[500]}`,
                    borderRadius: '12px',
                    padding: '14px 28px',
                    fontSize: '1rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: theme.transitions.normal,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    minWidth: '120px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = `${theme.colors.primary[500]}10`;
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                  {t('header.register')}
                </button>
              </div>
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
            </div>
          </div>
        )}
      </div>


      {/* Login Prompt Modal */}
      <LoginPromptModal />

      {/* Add CSS for animations */}
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default PublicProductDetail;