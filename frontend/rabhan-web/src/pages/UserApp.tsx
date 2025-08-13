import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { theme } from '../theme';
import Sidebar from '../components/Sidebar';
import Profile from './Profile';
import Documents from './Documents';
import UserMarketplace from './UserMarketplace';
import ProductDetail from './ProductDetail';
import Checkout from './Checkout';
import Quotes from './Quotes';
import { CleanSolarCalculator } from '../components/calculator/CleanSolarCalculator';
import { Product } from '../services/marketplace.service';

// Shopping cart item interface
interface CartItem {
  product: Product;
  quantity: number;
}

interface UserAppProps {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
    phone?: string;
    national_id?: string;
    region?: string;
    city?: string;
    district?: string;
    street_address?: string;
    property_type?: string;
    property_ownership?: string;
    monthly_income?: string;
    employment_status?: string;
    employer_name?: string;
    roof_size?: string;
    electricity_meter_number?: string;
    monthly_electricity_bill?: string;
  };
  onLogout: () => void;
  initialActiveItem?: string;
}

const UserApp: React.FC<UserAppProps> = ({ user, onLogout, initialActiveItem = 'dashboard' }) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isRTL = i18n.language === 'ar';
  const [activeMenuItem, setActiveMenuItem] = useState(initialActiveItem);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [cart, setCart] = useState<CartItem[]>([]);

  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync activeMenuItem with URL changes
  useEffect(() => {
    const path = location.pathname;
    if (path === '/dashboard/profile') {
      setActiveMenuItem('profile');
    } else if (path === '/dashboard/settings') {
      setActiveMenuItem('settings');
    } else if (path === '/dashboard/documents') {
      setActiveMenuItem('documents');
    } else if (path === '/dashboard/quotes') {
      setActiveMenuItem('quotes');
    } else if (path === '/dashboard/marketplace') {
      setActiveMenuItem('marketplace');
    } else if (path.startsWith('/dashboard/marketplace/product/')) {
      setActiveMenuItem('marketplace');
    } else if (path === '/dashboard/checkout') {
      setActiveMenuItem('marketplace'); // Keep marketplace active for checkout
    } else if (path === '/dashboard') {
      setActiveMenuItem('dashboard');
    }
  }, [location.pathname]);

  // Cart functions
  const addToCart = (product: Product, quantity: number = 1) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.product.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      } else {
        return [...prevCart, { product, quantity }];
      }
    });
    
    console.log(`🛒 Added ${quantity} x ${product.name} to cart`);
  };

  const removeFromCart = (productId: string) => {
    setCart(prevCart => prevCart.filter(item => item.product.id !== productId));
  };

  const updateCartQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    
    setCart(prevCart =>
      prevCart.map(item =>
        item.product.id === productId
          ? { ...item, quantity }
          : item
      )
    );
  };

  const getTotalCartItems = () => {
    return cart.reduce((total, item) => total + item.quantity, 0);
  };

  const getTotalCartValue = () => {
    return cart.reduce((total, item) => total + ((parseFloat(item.product.price) || 0) * item.quantity), 0);
  };

  const clearCart = () => {
    setCart([]);
    console.log('🛒 Cart cleared');
  };

  // Get display name
  const getDisplayName = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else if (user.last_name) {
      return user.last_name;
    } else {
      return user.email.split('@')[0]; // Use email username as fallback
    }
  };

  const displayName = getDisplayName();
  const userType = user.role === 'CONTRACTOR' ? t('auth.userTypes.CONTRACTOR') : t('auth.userTypes.USER');

  const handleMenuItemClick = (item: string) => {
    setActiveMenuItem(item);
    // Navigate to appropriate URL
    switch (item) {
      case 'profile':
        navigate('/dashboard/profile');
        break;
      case 'settings':
        navigate('/dashboard/settings');
        break;
      case 'documents':
        navigate('/dashboard/documents');
        break;
      case 'quotes':
        navigate('/dashboard/quotes');
        break;
      case 'marketplace':
        navigate('/dashboard/marketplace');
        break;
      case 'dashboard':
        navigate('/dashboard');
        break;
      default:
        // For other menu items, don't navigate but update the active state
        break;
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: theme.colors.gradients.primaryLight,
        color: theme.colors.text.primary,
        fontFamily: theme.typography.fonts.primary,
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      <Sidebar 
        user={user}
        onLogout={onLogout}
        activeItem={activeMenuItem}
        onItemClick={handleMenuItemClick}
      />
      
      {/* Main Dashboard Content */}
      <main
        style={{
          minHeight: '100vh',
          marginLeft: isRTL ? '0' : (isDesktop ? '280px' : '0'),
          marginRight: isRTL ? (isDesktop ? '280px' : '0') : '0',
          padding: isDesktop 
            ? '1.5rem'
            : '4.5rem 1rem 1.5rem 1rem', // Top padding for mobile menu
          boxSizing: 'border-box',
          width: isDesktop ? 'calc(100% - 280px)' : '100%',
          transition: theme.transitions.normal,
        }}
      >
        {/* Dynamic content based on active menu item */}
        {activeMenuItem === 'profile' && (
          <Profile 
            user={user} 
            onUpdate={(section, updatedData) => {
              console.log('Profile section updated:', section, updatedData);
              // Here you would typically call an API to update the user data
            }}
          />
        )}
        
        {activeMenuItem === 'settings' && (
          <Profile 
            user={user} 
            onUpdate={(section, updatedData) => {
              console.log('Profile section updated:', section, updatedData);
              // Here you would typically call an API to update the user data
            }}
          />
        )}
        
        {activeMenuItem === 'dashboard' && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#6b7280'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: '1rem'
            }}>
              {t('userApp.sidebar.dashboard')}
            </h1>
            <p>{t('userApp.welcome.title', { name: displayName })}</p>
          </div>
        )}
        
        {activeMenuItem === 'calculator' && (
          <CleanSolarCalculator 
            variant="dashboard"
            showMarketing={false}
            onCalculationComplete={(result) => {
              console.log('Solar calculation completed:', result);
              // Here you could save user's calculation results or update dashboard stats
            }}
            className="dashboard-calculator"
          />
        )}
        
        {activeMenuItem === 'financing' && user.role === 'USER' && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#6b7280'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: '1rem'
            }}>
              {t('userApp.sidebar.financing')}
            </h1>
            <p>Financing options will be displayed here</p>
          </div>
        )}
        
        {activeMenuItem === 'projects' && user.role === 'CONTRACTOR' && (
          <div style={{
            textAlign: 'center',
            padding: '4rem 2rem',
            color: '#6b7280'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '700',
              color: '#1a1a1a',
              marginBottom: '1rem'
            }}>
              {t('userApp.sidebar.projects')}
            </h1>
            <p>Projects will be displayed here</p>
          </div>
        )}
        
        {activeMenuItem === 'marketplace' && (
          location.pathname === '/dashboard/checkout' ? (
            <Checkout 
              user={user} 
              cart={cart}
              getTotalCartItems={getTotalCartItems}
              getTotalCartValue={getTotalCartValue}
              clearCart={clearCart}
            />
          ) : location.pathname.startsWith('/dashboard/marketplace/product/') ? (
            <ProductDetail 
              user={user} 
              cart={cart}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              updateCartQuantity={updateCartQuantity}
              getTotalCartItems={getTotalCartItems}
              getTotalCartValue={getTotalCartValue}
            />
          ) : (
            <UserMarketplace 
              user={user}
              cart={cart}
              addToCart={addToCart}
              removeFromCart={removeFromCart}
              updateCartQuantity={updateCartQuantity}
              getTotalCartItems={getTotalCartItems}
              getTotalCartValue={getTotalCartValue}
            />
          )
        )}
        
        {activeMenuItem === 'quotes' && user.role === 'USER' && (
          <Quotes user={user} />
        )}

        {activeMenuItem === 'documents' && (
          <Documents userType={user.role as 'USER' | 'CONTRACTOR'} />
        )}
      </main>
    </div>
  );
};

export default UserApp;