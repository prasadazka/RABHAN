import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { theme } from '../theme';

interface SidebarProps {
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
  };
  onLogout: () => void;
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

interface MenuItem {
  key: string;
  translationKey: string;
  icon: JSX.Element;
  userTypes?: string[];
}

// Professional SVG Icons based on theme colors
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

const SolarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="2" fill="currentColor" fillOpacity="0.2"/>
    <line x1="12" y1="1" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="12" y1="21" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="1" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="21" y1="12" x2="23" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const FinancingIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const QuotesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 11H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="9,11 12,14 15,11" stroke="currentColor" strokeWidth="2" fill="none"/>
    <line x1="12" y1="14" x2="12" y2="3" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <circle cx="5" cy="16" r="1" fill="currentColor"/>
    <circle cx="19" cy="16" r="1" fill="currentColor"/>
  </svg>
);

const ProjectsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <polyline points="10,9 9,9 8,9" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

const MarketplaceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const DocumentsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="13,2 13,9 20,9" stroke="currentColor" strokeWidth="2" fill="none"/>
    <line x1="8" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="8" y1="17" x2="16" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

const LogoutIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="16,17 21,12 16,7" stroke="currentColor" strokeWidth="2" fill="none"/>
    <line x1="21" y1="12" x2="9" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

const Sidebar: React.FC<SidebarProps> = ({ 
  user, 
  onLogout, 
  activeItem = 'dashboard',
  onItemClick 
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= 1024;
      setIsDesktop(desktop);
      if (desktop) {
        setIsMobileOpen(false); // Close mobile menu when switching to desktop
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Get user initials for avatar
  const getUserInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.first_name) {
      return user.first_name.charAt(0).toUpperCase();
    } else if (user.last_name) {
      return user.last_name.charAt(0).toUpperCase();
    } else {
      return user.email.charAt(0).toUpperCase();
    }
  };

  // Calculate profile completion
  const calculateCompletion = () => {
    const fields = [
      user.first_name,
      user.last_name,
      user.email, // Always filled
      user.phone,
      user.national_id,
      user.region,
      user.city,
      user.district,
      user.street_address,
      user.property_type,
      user.property_ownership,
      user.monthly_income,
      user.employment_status,
    ];
    
    const filledFields = fields.filter(field => field && field.toString().trim() !== '').length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const completionPercentage = calculateCompletion();
  const isProfileComplete = completionPercentage === 100;
  const progressColor = theme.colors.primary; // Always use theme primary
  const progressOpacity = isProfileComplete ? 1 : 0.5; // Lower opacity for incomplete
  
  // Calculate stroke dash array for circular progress
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (circumference * completionPercentage) / 100;

  // Get display name
  const getDisplayName = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else if (user.last_name) {
      return user.last_name;
    } else {
      return user.email.split('@')[0];
    }
  };

  // Menu items configuration with professional icons
  const menuItems: MenuItem[] = [
    { key: 'dashboard', translationKey: 'userApp.sidebar.dashboard', icon: <DashboardIcon /> },
    { key: 'calculator', translationKey: 'userApp.sidebar.calculator', icon: <SolarIcon /> },
    { key: 'quotes', translationKey: 'userApp.sidebar.quotes', icon: <QuotesIcon />, userTypes: ['USER'] },
    { key: 'financing', translationKey: 'userApp.sidebar.financing', icon: <FinancingIcon />, userTypes: ['USER'] },
    { key: 'projects', translationKey: 'userApp.sidebar.projects', icon: <ProjectsIcon />, userTypes: ['CONTRACTOR'] },
    { key: 'marketplace', translationKey: 'userApp.sidebar.marketplace', icon: <MarketplaceIcon /> },
    { key: 'documents', translationKey: 'userApp.sidebar.documents', icon: <DocumentsIcon /> },
    { key: 'profile', translationKey: 'userApp.sidebar.profile', icon: <SettingsIcon /> },
  ];

  // Filter menu items based on user type
  const filteredMenuItems = menuItems.filter(item => 
    !item.userTypes || item.userTypes.includes(user.role)
  );

  const navigate = useNavigate();
  const location = useLocation();

  // Use activeItem prop for current active state
  const currentActiveItem = activeItem;

  const handleItemClick = (itemKey: string) => {
    if (itemKey === 'settings') {
      setIsUserMenuOpen(!isUserMenuOpen);
      return;
    }
    
    // Navigate to the appropriate route
    switch (itemKey) {
      case 'dashboard':
        navigate('/dashboard');
        break;
      case 'profile':
        navigate('/profile');
        break;
      case 'calculator':
      case 'financing':
      case 'projects':
      case 'marketplace':
      case 'documents':
        // For now, stay on dashboard for these features
        navigate('/dashboard');
        break;
      default:
        navigate('/dashboard');
    }
    
    onItemClick?.(itemKey);
    setIsMobileOpen(false); // Close mobile menu on item click
  };

  const handleSettingsClick = () => {
    navigate('/dashboard/profile');
    setIsUserMenuOpen(false);
  };

  const handleLogoutClick = () => {
    setIsUserMenuOpen(false);
    onLogout();
  };

  const sidebarStyles = {
    sidebar: {
      position: 'fixed' as const,
      top: 0,
      [isRTL ? 'right' : 'left']: 0,
      height: '100vh',
      width: '280px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRight: isRTL ? 'none' : '1px solid rgba(62, 178, 177, 0.2)',
      borderLeft: isRTL ? '1px solid rgba(62, 178, 177, 0.2)' : 'none',
      boxShadow: isRTL 
        ? '-8px 0 32px rgba(62, 178, 177, 0.15)' 
        : '8px 0 32px rgba(62, 178, 177, 0.15)',
      display: 'flex',
      flexDirection: 'column' as const,
      zIndex: 1000,
      transform: (isDesktop || isMobileOpen) ? 'translateX(0)' : 'translateX(-100%)',
      transition: theme.transitions.normal,
    },
    logo: {
      padding: '1.5rem',
      borderBottom: '1px solid rgba(62, 178, 177, 0.2)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    logoIcon: {
      width: '120px',
      height: '80px',
      backgroundImage: 'url(/rabhan_logo.svg)',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    },
    logoText: {
      fontSize: '1.25rem',
      fontWeight: '700',
      color: '#1a1a1a',
      fontFamily: theme.typography.fonts.primary,
    },
    nav: {
      flex: 1,
      padding: '1rem 0',
      overflowY: 'auto' as const,
    },
    menuItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.875rem 1.5rem',
      margin: '0.25rem 1rem',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: theme.transitions.fast,
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#6b7280',
      textDecoration: 'none',
      border: 'none',
      background: 'transparent',
      width: 'calc(100% - 2rem)',
      textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right',
    },
    menuItemActive: {
      background: 'linear-gradient(135deg, rgba(62, 178, 177, 0.15) 0%, rgba(34, 211, 219, 0.15) 100%)',
      color: '#3eb2b1',
      fontWeight: '600',
      boxShadow: '0 2px 8px rgba(62, 178, 177, 0.2)',
    },
    menuItemHover: {
      background: 'rgba(62, 178, 177, 0.1)',
      color: '#3eb2b1',
    },
    menuIcon: {
      width: '20px',
      height: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    userSection: {
      padding: '1rem 1.5rem 1.5rem 1.5rem',
      borderTop: '1px solid rgba(62, 178, 177, 0.2)',
      position: 'relative' as const,
    },
    userButton: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '1rem',
      background: 'rgba(62, 178, 177, 0.1)',
      borderRadius: '16px',
      width: '100%',
      border: 'none',
      cursor: 'pointer',
      transition: theme.transitions.fast,
      textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right',
    },
    userAvatarWrapper: {
      position: 'relative' as const,
      width: '64px',
      height: '64px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressRing: {
      position: 'absolute' as const,
      top: 0,
      left: 0,
      transform: 'rotate(-90deg)',
    },
    userAvatar: {
      width: '48px',
      height: '48px',
      background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '1.25rem',
      fontWeight: '600',
      color: '#ffffff',
      boxShadow: '0 4px 12px rgba(62, 178, 177, 0.3)',
      position: 'relative' as const,
      zIndex: 1,
    },
    userInfo: {
      flex: 1,
      minWidth: 0,
      textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right',
    },
    userName: {
      fontSize: '0.875rem',
      fontWeight: '600',
      color: '#1a1a1a',
      marginBottom: '0.25rem',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    userEmail: {
      fontSize: '0.75rem',
      color: '#6b7280',
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    },
    chevron: {
      color: '#6b7280',
      transition: theme.transitions.fast,
      transform: isUserMenuOpen ? 'rotate(180deg)' : 'rotate(0deg)',
    },
    dropdown: {
      position: 'absolute' as const,
      bottom: '100%',
      left: '1.5rem',
      right: '1.5rem',
      background: 'rgba(255, 255, 255, 0.98)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderRadius: '16px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.15)',
      border: '1px solid rgba(62, 178, 177, 0.2)',
      padding: '0.5rem',
      opacity: isUserMenuOpen ? 1 : 0,
      visibility: isUserMenuOpen ? 'visible' as const : 'hidden' as const,
      transform: isUserMenuOpen ? 'translateY(-8px)' : 'translateY(8px)',
      transition: theme.transitions.normal,
      zIndex: 1001,
    },
    dropdownItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      padding: '0.75rem 1rem',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: theme.transitions.fast,
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#6b7280',
      width: '100%',
      border: 'none',
      background: 'transparent',
      textAlign: (isRTL ? 'right' : 'left') as 'left' | 'right',
    },
    settingsItem: {
      color: '#3eb2b1',
    },
    logoutItem: {
      color: '#ef4444',
    },
    dropdownItemHover: {
      background: 'rgba(62, 178, 177, 0.1)',
    },
    overlay: {
      position: 'fixed' as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      zIndex: 999,
      display: isMobileOpen ? 'block' : 'none',
    },
    mobileToggle: {
      position: 'fixed' as const,
      top: '5rem',
      [isRTL ? 'right' : 'left']: '1rem',
      width: '48px',
      height: '48px',
      background: '#3eb2b1',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '2px solid #3eb2b1',
      borderRadius: '12px',
      display: isDesktop ? 'none' : 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: '1.25rem',
      color: '#ffffff',
      fontWeight: '600',
      zIndex: 1001,
      boxShadow: '0 4px 12px rgba(62, 178, 177, 0.4)',
      transition: theme.transitions.fast,
    }
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        style={sidebarStyles.mobileToggle}
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        aria-label="Toggle menu"
      >
        {isMobileOpen ? '✕' : '☰'}
      </button>

      {/* Mobile Overlay */}
      <div 
        style={sidebarStyles.overlay}
        onClick={() => setIsMobileOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        style={{
          ...sidebarStyles.sidebar,
          direction: isRTL ? 'rtl' : 'ltr'
        }}
      >
        {/* Logo */}
        <div style={sidebarStyles.logo}>
          <div style={sidebarStyles.logoIcon} />
        </div>

        {/* Navigation */}
        <nav style={sidebarStyles.nav}>
          {filteredMenuItems.map((item) => (
            <button
              key={item.key}
              style={{
                ...sidebarStyles.menuItem,
                ...(currentActiveItem === item.key ? sidebarStyles.menuItemActive : {}),
              }}
              onClick={() => handleItemClick(item.key)}
              onMouseEnter={(e) => {
                if (currentActiveItem !== item.key) {
                  Object.assign(e.currentTarget.style, sidebarStyles.menuItemHover);
                }
              }}
              onMouseLeave={(e) => {
                if (currentActiveItem !== item.key) {
                  Object.assign(e.currentTarget.style, {
                    background: 'transparent',
                    color: '#6b7280'
                  });
                }
              }}
            >
              <span style={sidebarStyles.menuIcon}>{item.icon}</span>
              {t(item.translationKey)}
            </button>
          ))}
        </nav>

        {/* User Section */}
        <div style={sidebarStyles.userSection} ref={userMenuRef}>
          {/* Dropdown Menu */}
          {isUserMenuOpen && (
            <div style={sidebarStyles.dropdown}>
            <button
              style={{
                ...sidebarStyles.dropdownItem,
                ...sidebarStyles.settingsItem
              }}
              onClick={handleSettingsClick}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, sidebarStyles.dropdownItemHover);
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, {
                  background: 'transparent'
                });
              }}
            >
              <span style={sidebarStyles.menuIcon}>
                <SettingsIcon />
              </span>
              {t('userApp.sidebar.profile')}
            </button>
            
            <button
              style={{
                ...sidebarStyles.dropdownItem,
                ...sidebarStyles.logoutItem
              }}
              onClick={handleLogoutClick}
              onMouseEnter={(e) => {
                Object.assign(e.currentTarget.style, {
                  ...sidebarStyles.dropdownItemHover,
                  background: 'rgba(239, 68, 68, 0.1)',
                });
              }}
              onMouseLeave={(e) => {
                Object.assign(e.currentTarget.style, {
                  background: 'transparent'
                });
              }}
            >
              <span style={sidebarStyles.menuIcon}>
                <LogoutIcon />
              </span>
              {t('userApp.sidebar.logout')}
            </button>
            </div>
          )}

          {/* User Button */}
          <button
            style={sidebarStyles.userButton}
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            onMouseEnter={(e) => {
              Object.assign(e.currentTarget.style, {
                background: 'rgba(62, 178, 177, 0.15)',
                transform: 'translateY(-2px)',
                boxShadow: '0 4px 12px rgba(62, 178, 177, 0.2)',
              });
            }}
            onMouseLeave={(e) => {
              Object.assign(e.currentTarget.style, {
                background: 'rgba(62, 178, 177, 0.1)',
                transform: 'translateY(0)',
                boxShadow: 'none'
              });
            }}
          >
            <div style={sidebarStyles.userAvatarWrapper}>
              <svg style={sidebarStyles.progressRing} width="64" height="64">
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="rgba(0, 0, 0, 0.1)"
                  strokeWidth="3"
                  fill="none"
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3eb2b1" stopOpacity={progressOpacity} />
                    <stop offset="100%" stopColor="#22d3db" stopOpacity={progressOpacity} />
                  </linearGradient>
                </defs>
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="url(#progressGradient)"
                  strokeWidth="3"
                  fill="none"
                  strokeDasharray={`${strokeDasharray}`}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  style={{
                    transition: 'stroke-dashoffset 0.5s ease-out, opacity 0.3s ease-out',
                    ...(isProfileComplete ? {} : { strokeDasharray: '5 3' })
                  }}
                />
              </svg>
              <div style={sidebarStyles.userAvatar}>
                {getUserInitials()}
              </div>
            </div>
            <div style={sidebarStyles.userInfo}>
              <div style={sidebarStyles.userName}>
                {getDisplayName()}
              </div>
              <div style={sidebarStyles.userEmail}>
                {user.email}
              </div>
            </div>
            <div style={sidebarStyles.chevron}>
              <ChevronDownIcon />
            </div>
          </button>

        </div>
      </aside>
    </>
  );
};

export default Sidebar;