import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme';
import { Product } from '../services/marketplace.service';

// Shopping cart item interface
interface CartItem {
  product: Product;
  quantity: number;
}

interface CheckoutProps {
  user: {
    id: string;
    email: string;
    role: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
    national_id?: string;
    region?: string;
  };
  cart: CartItem[];
  getTotalCartItems: () => number;
  getTotalCartValue: () => number;
  clearCart?: () => void;
}

const Checkout: React.FC<CheckoutProps> = ({ 
  user, 
  cart, 
  getTotalCartItems, 
  getTotalCartValue,
  clearCart 
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isRTL = i18n.language === 'ar';
  
  // State management
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [shippingAddress, setShippingAddress] = useState({
    fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
    phone: user.phone || '',
    address: '',
    city: '',
    region: user.region || '',
    postalCode: ''
  });
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'bnpl' | 'cash'>('bnpl');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardName: ''
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-US', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(price);
  };

  // Common form input styles
  const inputStyle = {
    width: '100%',
    padding: '14px 18px',
    borderRadius: '12px',
    border: `2px solid ${theme.colors.borders.light}`,
    fontSize: '1rem',
    color: theme.colors.text.primary,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    outline: 'none',
    transition: theme.transitions.normal,
    fontFamily: theme.typography.fonts.primary,
    boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
  };

  const labelStyle = {
    display: 'block' as const,
    marginBottom: '10px',
    fontWeight: '600' as const,
    color: theme.colors.text.primary,
    fontSize: '0.95rem'
  };

  // Custom radio button component
  const CustomRadio = ({ checked, value, onChange, children }: { 
    checked: boolean; 
    value: string; 
    onChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <label
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        padding: '20px',
        borderRadius: '16px',
        border: checked 
          ? `2px solid ${theme.colors.primary[500]}` 
          : `2px solid ${theme.colors.borders.light}`,
        background: checked 
          ? `linear-gradient(135deg, ${theme.colors.primary[500]}08 0%, ${theme.colors.primary[400]}12 100%)` 
          : 'rgba(255, 255, 255, 0.9)',
        cursor: 'pointer',
        transition: theme.transitions.normal,
        boxShadow: checked 
          ? `0 4px 15px ${theme.colors.primary[500]}15` 
          : '0 2px 8px rgba(0, 0, 0, 0.04)'
      }}
      onMouseEnter={(e) => {
        if (!checked) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 1)';
          e.currentTarget.style.borderColor = theme.colors.primary[300];
        }
      }}
      onMouseLeave={(e) => {
        if (!checked) {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)';
          e.currentTarget.style.borderColor = theme.colors.borders.light;
        }
      }}
      onClick={() => onChange(value)}
    >
      {/* Custom radio button circle */}
      <div
        style={{
          width: '20px',
          height: '20px',
          borderRadius: '50%',
          border: `2px solid ${checked ? theme.colors.primary[500] : theme.colors.borders.light}`,
          background: 'white',
          marginRight: isRTL ? '0' : '16px',
          marginLeft: isRTL ? '16px' : '0',
          marginTop: '2px',
          position: 'relative',
          flexShrink: 0,
          transition: theme.transitions.normal
        }}
      >
        {/* Inner dot when selected */}
        {checked && (
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          />
        )}
      </div>
      
      {/* Hidden native radio input for form handling */}
      <input
        type="radio"
        value={value}
        checked={checked}
        onChange={() => onChange(value)}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none'
        }}
      />
      
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </label>
  );

  const handleBackToMarketplace = () => {
    navigate('/dashboard/marketplace');
  };

  const handlePlaceOrder = async () => {
    // For card payments, show OTP modal first
    if (paymentMethod === 'card') {
      // Validate card details
      if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv || !cardDetails.cardName) {
        alert('Please fill in all card details');
        return;
      }
      setShowOtpModal(true);
      return;
    }
    
    // For non-card payments (BNPL, Cash), proceed directly
    setLoading(true);
    
    try {
      // Simulate API call to place order
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      console.log('📋 Order placed:', {
        user: user.id,
        items: cart,
        total: getTotalCartValue(),
        shipping: shippingAddress,
        payment: paymentMethod
      });
      
      setOrderPlaced(true);
      
      // Clear cart after successful order
      if (clearCart) {
        clearCart();
      }
      
    } catch (error) {
      console.error('❌ Error placing order:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async () => {
    if (!otp || otp.length !== 6) {
      alert('Please enter a valid 6-digit OTP');
      return;
    }
    
    setOtpLoading(true);
    
    try {
      // Simulate OTP verification
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simulate order placement after OTP verification
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      console.log('📋 Order placed with card payment:', {
        user: user.id,
        items: cart,
        total: getTotalCartValue(),
        shipping: shippingAddress,
        payment: paymentMethod,
        cardDetails: { ...cardDetails, cvv: '***' } // Hide CVV in logs
      });
      
      setShowOtpModal(false);
      setOrderPlaced(true);
      
      // Clear cart after successful order
      if (clearCart) {
        clearCart();
      }
      
    } catch (error) {
      console.error('❌ Error verifying OTP:', error);
    } finally {
      setOtpLoading(false);
    }
  };

  // Calculate totals
  const subtotal = getTotalCartValue();
  const vatAmount = subtotal * 0.15; // 15% VAT
  const shippingFee = subtotal > 500 ? 0 : 50; // Free shipping over 500 SAR
  const total = subtotal + vatAmount + shippingFee;

  if (orderPlaced) {
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
            minHeight: 'calc(100vh - 32px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: '500px' }}>
            {/* Success Icon */}
            <div
              style={{
                width: '80px',
                height: '80px',
                background: `linear-gradient(135deg, ${theme.colors.semantic.success.main} 0%, ${theme.colors.semantic.success.dark} 100%)`,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 24px',
                boxShadow: `0 8px 24px ${theme.colors.semantic.success.main}40`
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>

            <h1
              style={{
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: '700',
                color: theme.colors.text.primary,
                marginBottom: '16px'
              }}
            >
              {t('checkout.orderSuccess', 'Order Placed Successfully!')}
            </h1>

            <p
              style={{
                fontSize: '1rem',
                color: theme.colors.text.secondary,
                marginBottom: '32px',
                lineHeight: '1.6'
              }}
            >
              {t('checkout.orderSuccessDesc', 'Thank you for your order! We will process it shortly and send you updates via email and SMS.')}
            </p>

            <div
              style={{
                background: theme.colors.neutral[50],
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
                border: `1px solid ${theme.colors.borders.light}`
              }}
            >
              <h3 style={{ marginBottom: '12px', color: theme.colors.text.primary }}>
                {t('checkout.orderSummary', 'Order Summary')}
              </h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>{t('checkout.items', 'Items')}: {getTotalCartItems()}</span>
                <span style={{ fontWeight: '600' }}>{formatPrice(total)}</span>
              </div>
            </div>

            <button
              onClick={handleBackToMarketplace}
              style={{
                background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 32px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: theme.transitions.normal,
                boxShadow: `0 4px 15px ${theme.colors.primary[500]}40`,
                marginRight: '12px'
              }}
            >
              {t('checkout.continueShopping', 'Continue Shopping')}
            </button>
          </div>
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
        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
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
              fontWeight: '500'
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
            {t('checkout.backToMarketplace', 'Back to Marketplace')}
          </button>

          <h1
            style={{
              fontSize: 'clamp(1.5rem, 4vw, 2rem)',
              fontWeight: '700',
              color: theme.colors.text.primary,
              marginBottom: '8px'
            }}
          >
            {t('checkout.title', 'Checkout')}
          </h1>
          <p
            style={{
              color: theme.colors.text.secondary,
              margin: 0
            }}
          >
            {t('checkout.subtitle', 'Complete your solar equipment purchase')}
          </p>
        </div>

        {/* Checkout Content */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: window.innerWidth > 768 ? '1fr 400px' : '1fr',
            gap: '32px'
          }}
        >
          {/* Checkout Form */}
          <div>
            {/* Shipping Address */}
            <div
              style={{
                background: `linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)`,
                borderRadius: '20px',
                padding: '28px',
                marginBottom: '24px',
                border: `2px solid ${theme.colors.borders.light}`,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
              }}
            >
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: theme.colors.text.primary,
                  marginBottom: '20px'
                }}
              >
                {t('checkout.shippingAddress', 'Shipping Address')}
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                <div>
                  <label style={labelStyle}>
                    {t('checkout.fullName', 'Full Name')} *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.fullName}
                    onChange={(e) => setShippingAddress({...shippingAddress, fullName: e.target.value})}
                    placeholder="Enter your full name"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.colors.primary[500];
                      e.target.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px ${theme.colors.primary[500]}15`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.colors.borders.light;
                      e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.05)';
                    }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    {t('checkout.phone', 'Phone Number')} *
                  </label>
                  <input
                    type="tel"
                    value={shippingAddress.phone}
                    onChange={(e) => setShippingAddress({...shippingAddress, phone: e.target.value})}
                    placeholder="+966 5X XXX XXXX"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.colors.primary[500];
                      e.target.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px ${theme.colors.primary[500]}15`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.colors.borders.light;
                      e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.05)';
                    }}
                  />
                </div>

                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={labelStyle}>
                    {t('checkout.address', 'Street Address')} *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.address}
                    onChange={(e) => setShippingAddress({...shippingAddress, address: e.target.value})}
                    placeholder="Street address, building number, apartment"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.colors.primary[500];
                      e.target.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px ${theme.colors.primary[500]}15`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.colors.borders.light;
                      e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.05)';
                    }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    {t('checkout.city', 'City')} *
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.city}
                    onChange={(e) => setShippingAddress({...shippingAddress, city: e.target.value})}
                    placeholder="Enter city"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.colors.primary[500];
                      e.target.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px ${theme.colors.primary[500]}15`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.colors.borders.light;
                      e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.05)';
                    }}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    {t('checkout.region', 'Region')} *
                  </label>
                  <select
                    value={shippingAddress.region}
                    onChange={(e) => setShippingAddress({...shippingAddress, region: e.target.value})}
                    style={{
                      ...inputStyle,
                      cursor: 'pointer',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='${theme.colors.text.secondary.replace('#', '%23')}' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 12px center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '16px',
                      paddingRight: '40px',
                      appearance: 'none' as const
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.colors.primary[500];
                      e.target.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px ${theme.colors.primary[500]}15`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.colors.borders.light;
                      e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.05)';
                    }}
                  >
                    <option value="" disabled style={{ color: theme.colors.text.muted }}>
                      Select Region
                    </option>
                    <option value="riyadh">Riyadh</option>
                    <option value="jeddah">Jeddah</option>
                    <option value="dammam">Dammam</option>
                    <option value="mecca">Mecca</option>
                    <option value="medina">Medina</option>
                    <option value="eastern">Eastern Province</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label style={labelStyle}>
                    {t('checkout.postalCode', 'Postal Code')}
                  </label>
                  <input
                    type="text"
                    value={shippingAddress.postalCode}
                    onChange={(e) => setShippingAddress({...shippingAddress, postalCode: e.target.value})}
                    placeholder="12345 (optional)"
                    style={inputStyle}
                    onFocus={(e) => {
                      e.target.style.borderColor = theme.colors.primary[500];
                      e.target.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px ${theme.colors.primary[500]}15`;
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = theme.colors.borders.light;
                      e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.05)';
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Payment Method */}
            <div
              style={{
                background: `linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.9) 100%)`,
                borderRadius: '20px',
                padding: '28px',
                marginBottom: '24px',
                border: `2px solid ${theme.colors.borders.light}`,
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)'
              }}
            >
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: theme.colors.text.primary,
                  marginBottom: '20px'
                }}
              >
                {t('checkout.paymentMethod', 'Payment Method')}
              </h3>

              <div style={{ display: 'grid', gap: '16px' }}>
                {/* BNPL Option */}
                <CustomRadio
                  checked={paymentMethod === 'bnpl'}
                  value="bnpl"
                  onChange={setPaymentMethod}
                >
                  <div>
                    <div style={{ 
                      fontWeight: '700', 
                      color: theme.colors.text.primary,
                      fontSize: '1.05rem',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary[500]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                        <line x1="8" y1="21" x2="16" y2="21"/>
                        <line x1="12" y1="17" x2="12" y2="21"/>
                      </svg>
                      {t('checkout.bnpl', 'Buy Now, Pay Later (SAMA Compliant)')}
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: theme.colors.text.secondary,
                      lineHeight: '1.4'
                    }}>
                      {t('checkout.bnplDesc', 'Split your payment into installments with SAMA-approved financing')}
                    </div>
                  </div>
                </CustomRadio>

                {/* Card Option */}
                <CustomRadio
                  checked={paymentMethod === 'card'}
                  value="card"
                  onChange={setPaymentMethod}
                >
                  <div>
                    <div style={{ 
                      fontWeight: '700', 
                      color: theme.colors.text.primary,
                      fontSize: '1.05rem',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary[500]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                        <line x1="1" y1="10" x2="23" y2="10"/>
                      </svg>
                      {t('checkout.card', 'Credit/Debit Card')}
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: theme.colors.text.secondary,
                      lineHeight: '1.4'
                    }}>
                      {t('checkout.cardDesc', 'Pay securely with your Visa, Mastercard, or local bank cards')}
                    </div>
                  </div>
                </CustomRadio>

                {/* Cash Option */}
                <CustomRadio
                  checked={paymentMethod === 'cash'}
                  value="cash"
                  onChange={setPaymentMethod}
                >
                  <div>
                    <div style={{ 
                      fontWeight: '700', 
                      color: theme.colors.text.primary,
                      fontSize: '1.05rem',
                      marginBottom: '6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary[500]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="1" x2="12" y2="3"/>
                        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                        <line x1="12" y1="21" x2="12" y2="23"/>
                      </svg>
                      {t('checkout.cash', 'Cash on Delivery')}
                    </div>
                    <div style={{ 
                      fontSize: '0.9rem', 
                      color: theme.colors.text.secondary,
                      lineHeight: '1.4'
                    }}>
                      {t('checkout.cashDesc', 'Pay in cash when your solar equipment is delivered')}
                    </div>
                  </div>
                </CustomRadio>
              </div>

              {/* Card Details Form - Only show when card is selected */}
              {paymentMethod === 'card' && (
                <div
                  style={{
                    marginTop: '24px',
                    background: `linear-gradient(135deg, ${theme.colors.primary[500]}08 0%, ${theme.colors.primary[400]}12 100%)`,
                    borderRadius: '16px',
                    padding: '24px',
                    border: `2px solid ${theme.colors.primary[500]}20`
                  }}
                >
                  <h4
                    style={{
                      fontSize: '1.1rem',
                      fontWeight: '700',
                      color: theme.colors.text.primary,
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={theme.colors.primary[500]} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"/>
                      <line x1="1" y1="10" x2="23" y2="10"/>
                    </svg>
                    Card Details
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <label style={labelStyle}>
                        Card Number *
                      </label>
                      <input
                        type="text"
                        value={cardDetails.cardNumber}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 16);
                          const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 ');
                          setCardDetails({...cardDetails, cardNumber: formatted});
                        }}
                        placeholder="1234 5678 9012 3456"
                        style={inputStyle}
                        onFocus={(e) => {
                          e.target.style.borderColor = theme.colors.primary[500];
                          e.target.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px ${theme.colors.primary[500]}15`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = theme.colors.borders.light;
                          e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.05)';
                        }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>
                        Cardholder Name *
                      </label>
                      <input
                        type="text"
                        value={cardDetails.cardName}
                        onChange={(e) => setCardDetails({...cardDetails, cardName: e.target.value})}
                        placeholder="Name on card"
                        style={inputStyle}
                        onFocus={(e) => {
                          e.target.style.borderColor = theme.colors.primary[500];
                          e.target.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px ${theme.colors.primary[500]}15`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = theme.colors.borders.light;
                          e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.05)';
                        }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>
                        Expiry Date *
                      </label>
                      <input
                        type="text"
                        value={cardDetails.expiryDate}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          const formatted = value.replace(/(\d{2})(?=\d)/, '$1/');
                          setCardDetails({...cardDetails, expiryDate: formatted});
                        }}
                        placeholder="MM/YY"
                        style={inputStyle}
                        onFocus={(e) => {
                          e.target.style.borderColor = theme.colors.primary[500];
                          e.target.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px ${theme.colors.primary[500]}15`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = theme.colors.borders.light;
                          e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.05)';
                        }}
                      />
                    </div>

                    <div>
                      <label style={labelStyle}>
                        CVV *
                      </label>
                      <input
                        type="text"
                        value={cardDetails.cvv}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                          setCardDetails({...cardDetails, cvv: value});
                        }}
                        placeholder="123"
                        style={inputStyle}
                        onFocus={(e) => {
                          e.target.style.borderColor = theme.colors.primary[500];
                          e.target.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px ${theme.colors.primary[500]}15`;
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = theme.colors.borders.light;
                          e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.05)';
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Order Summary */}
          <div>
            <div
              style={{
                background: `linear-gradient(145deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.95) 100%)`,
                borderRadius: '20px',
                padding: '28px',
                border: `2px solid ${theme.colors.primary[500]}15`,
                position: 'sticky',
                top: '20px',
                boxShadow: `0 8px 30px rgba(0, 0, 0, 0.06), 0 0 0 1px ${theme.colors.primary[500]}08`
              }}
            >
              <h3
                style={{
                  fontSize: '1.25rem',
                  fontWeight: '600',
                  color: theme.colors.text.primary,
                  marginBottom: '20px'
                }}
              >
                {t('checkout.orderSummary', 'Order Summary')}
              </h3>

              {/* Cart Items */}
              <div style={{ marginBottom: '20px' }}>
                {cart.map((item, index) => (
                  <div
                    key={`${item.product.id}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      marginBottom: '16px',
                      paddingBottom: '16px',
                      borderBottom: index < cart.length - 1 ? `1px solid ${theme.colors.borders.light}` : 'none'
                    }}
                  >
                    <div
                      style={{
                        width: '60px',
                        height: '60px',
                        background: item.product.primaryImage 
                          ? `url(${item.product.primaryImage})` 
                          : `linear-gradient(135deg, ${theme.colors.neutral[100]} 0%, ${theme.colors.neutral[200]} 100%)`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        borderRadius: '8px',
                        border: `1px solid ${theme.colors.borders.light}`
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div
                        style={{
                          fontWeight: '500',
                          fontSize: '0.875rem',
                          color: theme.colors.text.primary,
                          marginBottom: '4px',
                          lineHeight: '1.3'
                        }}
                      >
                        {item.product.name}
                      </div>
                      <div
                        style={{
                          fontSize: '0.75rem',
                          color: theme.colors.text.secondary,
                          marginBottom: '4px'
                        }}
                      >
                        {item.product.brand}
                      </div>
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <span style={{ fontSize: '0.75rem', color: theme.colors.text.secondary }}>
                          Qty: {item.quantity}
                        </span>
                        <span style={{ fontWeight: '600', color: theme.colors.text.primary }}>
                          {formatPrice(parseFloat(item.product.price) * item.quantity)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: theme.colors.text.secondary }}>
                    {t('checkout.subtotal', 'Subtotal')}
                  </span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ color: theme.colors.text.secondary }}>
                    {t('checkout.vat', 'VAT (15%)')}
                  </span>
                  <span>{formatPrice(vatAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <span style={{ color: theme.colors.text.secondary }}>
                    {t('checkout.shipping', 'Shipping')}
                  </span>
                  <span>
                    {shippingFee === 0 
                      ? t('checkout.freeShipping', 'Free') 
                      : formatPrice(shippingFee)
                    }
                  </span>
                </div>
                <div 
                  style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    paddingTop: '16px',
                    borderTop: `1px solid ${theme.colors.borders.light}`,
                    fontSize: '1.125rem',
                    fontWeight: '700'
                  }}
                >
                  <span>{t('checkout.total', 'Total')}</span>
                  <span style={{ color: theme.colors.primary[500] }}>{formatPrice(total)}</span>
                </div>
              </div>

              {/* Place Order Button */}
              <button
                onClick={handlePlaceOrder}
                disabled={loading || !shippingAddress.fullName || !shippingAddress.phone || !shippingAddress.address}
                style={{
                  width: '100%',
                  background: loading 
                    ? theme.colors.neutral[400] 
                    : `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '16px 24px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: theme.transitions.normal,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: loading ? 'none' : `0 4px 15px ${theme.colors.primary[500]}40`
                }}
              >
                {loading ? (
                  <>
                    <div
                      style={{
                        width: '20px',
                        height: '20px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}
                    />
                    {t('checkout.processing', 'Processing...')}
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 0 1-8 0"/>
                    </svg>
                    {paymentMethod === 'card' ? 'Proceed to Payment' : t('checkout.placeOrder', 'Place Order')}
                  </>
                )}
              </button>

              {subtotal > 500 && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '12px 16px',
                    background: `linear-gradient(135deg, ${theme.colors.semantic.success.main}15 0%, ${theme.colors.semantic.success.light}20 100%)`,
                    color: theme.colors.semantic.success.dark,
                    borderRadius: '12px',
                    fontSize: '0.875rem',
                    textAlign: 'center',
                    border: `1px solid ${theme.colors.semantic.success.main}25`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontWeight: '600'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme.colors.semantic.success.main} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12l5 5L20 7"/>
                  </svg>
                  {t('checkout.freeShippingEligible', 'Free shipping applied!')}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            zIndex: 10000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(5px)'
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowOtpModal(false);
            }
          }}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '20px',
              padding: '32px',
              maxWidth: '400px',
              width: '90%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              border: `2px solid ${theme.colors.borders.light}`
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* OTP Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '60px',
                  height: '60px',
                  background: `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: `0 8px 20px ${theme.colors.primary[500]}40`
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <circle cx="12" cy="16" r="1"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <h2
                style={{
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  color: theme.colors.text.primary,
                  marginBottom: '8px'
                }}
              >
                Enter OTP
              </h2>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: theme.colors.text.secondary,
                  lineHeight: '1.5'
                }}
              >
                We've sent a 6-digit verification code to your registered mobile number ending in ****{user.phone?.slice(-4) || '1234'}
              </p>
            </div>

            {/* OTP Input */}
            <div style={{ marginBottom: '24px' }}>
              <input
                type="text"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                }}
                placeholder="Enter 6-digit OTP"
                style={{
                  ...inputStyle,
                  textAlign: 'center',
                  fontSize: '1.2rem',
                  letterSpacing: '0.1em',
                  fontWeight: '600'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = theme.colors.primary[500];
                  e.target.style.boxShadow = `inset 0 1px 3px rgba(0,0,0,0.05), 0 0 0 3px ${theme.colors.primary[500]}15`;
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = theme.colors.borders.light;
                  e.target.style.boxShadow = 'inset 0 1px 3px rgba(0,0,0,0.05)';
                }}
                autoFocus
              />
            </div>

            {/* OTP Action Buttons */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => {
                  setShowOtpModal(false);
                  setOtp('');
                }}
                disabled={otpLoading}
                style={{
                  flex: 1,
                  background: 'transparent',
                  color: theme.colors.text.secondary,
                  border: `2px solid ${theme.colors.borders.light}`,
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: otpLoading ? 'not-allowed' : 'pointer',
                  transition: theme.transitions.normal,
                  opacity: otpLoading ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (!otpLoading) {
                    e.currentTarget.style.background = theme.colors.neutral[50];
                  }
                }}
                onMouseLeave={(e) => {
                  if (!otpLoading) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleOtpSubmit}
                disabled={otpLoading || otp.length !== 6}
                style={{
                  flex: 2,
                  background: (otpLoading || otp.length !== 6)
                    ? theme.colors.neutral[300]
                    : `linear-gradient(135deg, ${theme.colors.primary[500]} 0%, ${theme.colors.primary[600]} 100%)`,
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  padding: '12px 20px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: (otpLoading || otp.length !== 6) ? 'not-allowed' : 'pointer',
                  transition: theme.transitions.normal,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: (otpLoading || otp.length !== 6) ? 'none' : `0 4px 15px ${theme.colors.primary[500]}40`
                }}
              >
                {otpLoading ? (
                  <>
                    <div
                      style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}
                    />
                    Verifying...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6L9 17l-5-5"/>
                    </svg>
                    Verify & Pay
                  </>
                )}
              </button>
            </div>

            {/* Resend OTP */}
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <button
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: theme.colors.primary[500],
                  fontSize: '0.875rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  padding: '4px 8px'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = theme.colors.primary[600];
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = theme.colors.primary[500];
                }}
              >
                Didn't receive OTP? Resend
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Checkout;