import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { theme } from '../theme';

interface ContractorSidebarProps {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
    business_name?: string;
    business_type?: string;
    verification_level?: number;
    status?: string;
  };
  onLogout: () => void;
  activeItem?: string;
  onItemClick?: (item: string) => void;
}

interface MenuItem {
  key: string;
  translationKey: string;
  icon: JSX.Element;
}

// Professional SVG Icons for Contractor Portal
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="9,22 9,12 15,12 15,22" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

const ProjectsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="14,2 14,8 20,8" stroke="currentColor" strokeWidth="2" fill="none"/>
    <line x1="16" y1="13" x2="8" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <line x1="16" y1="17" x2="8" y2="17" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const MarketplaceIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <line x1="3" y1="6" x2="21" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    <path d="M16 10a4 4 0 0 1-8 0" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const QuotesIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M9 11H7a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M17 11h-2a2 2 0 0 0-2 2v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5a2 2 0 0 0-2-2z" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M7 16c0-1.5-0.67-2.5-2-3s-2-1.5-2-3 0.67-2.5 2-3 2-1.5 2-3" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M17 16c0-1.5 0.67-2.5 2-3s2-1.5 2-3-0.67-2.5-2-3-2-1.5-2-3" stroke="currentColor" strokeWidth="2" fill="none"/>
  </svg>
);

const WalletIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5z" stroke="currentColor" strokeWidth="2" fill="none"/>
    <path d="M3 10h18" stroke="currentColor" strokeWidth="2"/>
    <circle cx="7" cy="15" r="1" fill="currentColor"/>
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

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2" fill="none"/>
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

const ContractorSidebar: React.FC<ContractorSidebarProps> = ({ 
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
        setIsMobileOpen(false);
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

  // Get contractor initials for avatar
  const getContractorInitials = () => {
    if (user.business_name) {
      const words = user.business_name.split(' ');
      if (words.length >= 2) {
        return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
      }
      return user.business_name.substring(0, 2).toUpperCase();
    } else if (user.first_name && user.last_name) {
      return `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`.toUpperCase();
    } else if (user.first_name) {
      return user.first_name.charAt(0).toUpperCase();
    } else {
      return user.email.charAt(0).toUpperCase();
    }
  };

  // Calculate business profile completion for contractors
  const calculateBusinessCompletion = () => {
    const fields = [
      user.business_name,
      user.business_type,
      user.email, // Always filled
      user.first_name,
      user.last_name,
      user.verification_level ? user.verification_level > 0 : false,
      user.status === 'active',
    ];
    
    const filledFields = fields.filter(field => 
      field && (typeof field === 'boolean' ? field : field.toString().trim() !== '')
    ).length;
    return Math.round((filledFields / fields.length) * 100);
  };

  const completionPercentage = calculateBusinessCompletion();
  const isProfileComplete = completionPercentage === 100;
  const progressColor = theme.colors.primary;
  const progressOpacity = isProfileComplete ? 1 : 0.5;
  
  // Calculate stroke dash array for circular progress
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (circumference * completionPercentage) / 100;

  // Get contractor display name
  const getDisplayName = () => {
    if (user.business_name) {
      return user.business_name;
    } else if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    } else if (user.first_name) {
      return user.first_name;
    } else {
      return user.email.split('@')[0];
    }
  };

  // Contractor-specific menu items
  const menuItems: MenuItem[] = [
    { key: 'dashboard', translationKey: 'contractorApp.sidebar.dashboard', icon: <DashboardIcon /> },
    { key: 'projects', translationKey: 'contractorApp.sidebar.projects', icon: <ProjectsIcon /> },
    { key: 'quotes', translationKey: 'contractorApp.sidebar.quotes', icon: <QuotesIcon /> },
    { key: 'marketplace', translationKey: 'contractorApp.sidebar.marketplace', icon: <MarketplaceIcon /> },
    { key: 'wallet', translationKey: 'contractorApp.sidebar.wallet', icon: <WalletIcon /> },
    { key: 'documents', translationKey: 'contractorApp.sidebar.documents', icon: <DocumentsIcon /> },
    { key: 'profile', translationKey: 'contractorApp.sidebar.profile', icon: <ProfileIcon /> },
  ];

  const navigate = useNavigate();

  const handleItemClick = (itemKey: string) => {
    if (itemKey === 'settings') {
      setIsUserMenuOpen(!isUserMenuOpen);
      return;
    }
    
    onItemClick?.(itemKey);
    setIsMobileOpen(false);
  };

  const handleProfileClick = () => {
    navigate('/contractor/profile');
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
      flexDirection: 'column' as const,
      gap: '0.5rem',
    },
    logoIcon: {
      width: '120px',
      height: '60px',
      backgroundImage: 'url(/rabhan_logo.svg)',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
    },
    contractorBadge: {
      padding: '0.25rem 0.75rem',
      background: 'linear-gradient(135deg, rgba(62, 178, 177, 0.2) 0%, rgba(34, 211, 219, 0.2) 100%)',
      color: theme.colors.primary,
      borderRadius: '20px',
      fontSize: '0.75rem',
      fontWeight: '600',
      textTransform: 'uppercase' as const,
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
    profileItem: {
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
      top: '1rem',
      [isRTL ? 'right' : 'left']: '1rem',
      width: '48px',
      height: '48px',
      background: 'rgba(255, 255, 255, 0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid rgba(62, 178, 177, 0.2)',
      borderRadius: '12px',
      display: isDesktop ? 'none' : 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: 'pointer',
      fontSize: '1.25rem',
      zIndex: 1001,
      boxShadow: '0 4px 12px rgba(62, 178, 177, 0.2)',
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

      {/* Contractor Sidebar */}
      <aside 
        style={{
          ...sidebarStyles.sidebar,
          direction: isRTL ? 'rtl' : 'ltr'
        }}
      >
        {/* Logo */}
        <div style={sidebarStyles.logo}>
          <div style={sidebarStyles.logoIcon} />
          <div style={sidebarStyles.contractorBadge}>
            {t('contractorApp.badge.contractor')}
          </div>
        </div>

        {/* Navigation */}
        <nav style={sidebarStyles.nav}>
          {menuItems.map((item) => (
            <button
              key={item.key}
              style={{
                ...sidebarStyles.menuItem,
                ...(activeItem === item.key ? sidebarStyles.menuItemActive : {}),
              }}
              onClick={() => handleItemClick(item.key)}
              onMouseEnter={(e) => {
                if (activeItem !== item.key) {
                  Object.assign(e.currentTarget.style, sidebarStyles.menuItemHover);
                }
              }}
              onMouseLeave={(e) => {
                if (activeItem !== item.key) {
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
                ...sidebarStyles.profileItem
              }}
              onClick={handleProfileClick}
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
                <ProfileIcon />
              </span>
              {t('contractorApp.sidebar.profile')}
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
              {t('contractorApp.sidebar.logout')}
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
                  <linearGradient id="contractorProgressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#3eb2b1" stopOpacity={progressOpacity} />
                    <stop offset="100%" stopColor="#22d3db" stopOpacity={progressOpacity} />
                  </linearGradient>
                </defs>
                <circle
                  cx="32"
                  cy="32"
                  r={radius}
                  stroke="url(#contractorProgressGradient)"
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
                {getContractorInitials()}
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

export default ContractorSidebar;