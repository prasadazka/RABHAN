import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { theme } from '../theme';
import ContractorSidebar from '../components/ContractorSidebar';
import ContractorProfile from './ContractorProfile';
import ContractorDocuments from './ContractorDocuments';
import ContractorDashboard from './ContractorDashboard';
import ContractorProjects from './ContractorProjects';
import ContractorMarketplace from './ContractorMarketplace';
import ContractorQuotes from './ContractorQuotes';
import ContractorWallet from './ContractorWallet';
import { contractorService } from '../services/contractor.service';

interface ContractorAppProps {
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
    business_name?: string;
    business_type?: string;
    service_categories?: string[];
    service_areas?: string[];
    years_experience?: number;
    verification_level?: number;
    status?: string;
    // Additional contractor fields
    whatsapp?: string;
    website?: string;
    address_line1?: string;
    address_line2?: string;
    postal_code?: string;
    country?: string;
    commercial_registration?: string;
    vat_number?: string;
    description?: string;
    description_ar?: string;
  };
  onLogout: () => void;
  onUserUpdate?: (updatedUser: any) => void; // Callback to update user in parent
  initialActiveItem?: string;
}

const ContractorApp: React.FC<ContractorAppProps> = ({ 
  user, 
  onLogout, 
  onUserUpdate,
  initialActiveItem = 'dashboard' 
}) => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const isRTL = i18n.language === 'ar';
  const [activeMenuItem, setActiveMenuItem] = useState(initialActiveItem);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 1024);
  const [currentUser, setCurrentUser] = useState(user);
  const [contractorProfile, setContractorProfile] = useState<any>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  // Update local user state when prop changes
  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  // Fetch contractor profile data and merge with user data
  useEffect(() => {
    const fetchContractorProfile = async () => {
      try {
        setIsLoadingProfile(true);
        console.log('🔄 Fetching contractor profile data for user:', user.id);
        
        const profileData = await contractorService.getProfile();
        console.log('✅ RAW contractor profile fetched:', profileData);
        console.log('🔍 Profile data keys:', Object.keys(profileData || {}));
        
        if (profileData && typeof profileData === 'object') {
          // Merge user data with contractor profile data
          const mergedUserData = {
            ...user,
            ...profileData,
            // Keep user.id and user.email from auth service
            id: user.id,
            email: user.email,
            phone: profileData.phone || user.phone,
          };
          
          console.log('🔄 MERGED user data:', mergedUserData);
          console.log('🔍 Merged data keys:', Object.keys(mergedUserData));
          console.log('🔍 Merged business_name:', mergedUserData.business_name);
          console.log('🔍 Merged description:', mergedUserData.description);
          
          setContractorProfile(profileData);
          setCurrentUser(mergedUserData);
        } else {
          console.warn('⚠️ No valid contractor profile data, using basic user data');
          console.log('🔍 Basic user data:', user);
          setCurrentUser(user);
        }
      } catch (error) {
        console.error('❌ Failed to fetch contractor profile:', error);
        console.error('❌ Error details:', error.message);
        console.log('🔄 Falling back to basic user data:', user);
        setCurrentUser(user);
      } finally {
        setIsLoadingProfile(false);
      }
    };

    if (user?.role === 'CONTRACTOR') {
      fetchContractorProfile();
    } else {
      setCurrentUser(user);
      setIsLoadingProfile(false);
    }
  }, [user]);

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
    if (path === '/contractor/dashboard') {
      setActiveMenuItem('dashboard');
    } else if (path === '/contractor/profile') {
      setActiveMenuItem('profile');
    } else if (path === '/contractor/projects') {
      setActiveMenuItem('projects');
    } else if (path === '/contractor/marketplace') {
      setActiveMenuItem('marketplace');
    } else if (path === '/contractor/quotes') {
      setActiveMenuItem('quotes');
    } else if (path === '/contractor/wallet') {
      setActiveMenuItem('wallet');
    } else if (path === '/contractor/documents') {
      setActiveMenuItem('documents');
    }
  }, [location.pathname]);

  // Get display name for contractor
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

  const handleMenuItemClick = (item: string) => {
    setActiveMenuItem(item);
    // Navigate to appropriate contractor URL
    switch (item) {
      case 'dashboard':
        navigate('/contractor/dashboard');
        break;
      case 'profile':
        navigate('/contractor/profile');
        break;
      case 'projects':
        navigate('/contractor/projects');
        break;
      case 'marketplace':
        navigate('/contractor/marketplace');
        break;
      case 'quotes':
        navigate('/contractor/quotes');
        break;
      case 'wallet':
        navigate('/contractor/wallet');
        break;
      case 'documents':
        navigate('/contractor/documents');
        break;
      default:
        navigate('/contractor/dashboard');
        break;
    }
  };

  const renderActiveContent = () => {
    // Show loading while fetching contractor profile
    if (isLoadingProfile) {
      return (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '400px',
          color: theme.colors.text.secondary
        }}>
          <div>
            <div style={{ marginBottom: '1rem', textAlign: 'center' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ animation: 'spin 1s linear infinite' }}>
                <path d="M12 2V6M12 18V22M4.93 4.93L7.76 7.76M16.24 16.24L19.07 19.07M2 12H6M18 12H22M4.93 19.07L7.76 16.24M16.24 7.76L19.07 4.93" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {t('common.loading') || 'Loading contractor profile...'}
          </div>
        </div>
      );
    }

    switch (activeMenuItem) {
      case 'dashboard':
        return <ContractorDashboard user={currentUser} />;
      case 'profile':
        return (
          <ContractorProfile 
            user={currentUser} 
            onUpdate={(section, updatedData) => {
              console.log('Contractor profile section updated:', section, updatedData);
              
              // Update local user state with the new data (this merges contractor fields into user object)
              const updatedUser = { ...currentUser, ...updatedData };
              setCurrentUser(updatedUser);
              
              // Also update the contractor profile state
              if (contractorProfile) {
                const updatedContractorProfile = { ...contractorProfile, ...updatedData };
                setContractorProfile(updatedContractorProfile);
              }
              
              // DON'T update auth service with contractor fields - they belong in separate database
              // onUserUpdate?.(updatedUser);
              
              console.log('✅ User state updated locally:', updatedUser);
              console.log('✅ Contractor profile updated locally:', contractorProfile);
            }}
          />
        );
      case 'projects':
        return <ContractorProjects user={currentUser} />;
      case 'marketplace':
        return <ContractorMarketplace user={currentUser} />;
      case 'quotes':
        return <ContractorQuotes user={currentUser} />;
      case 'wallet':
        return <ContractorWallet user={currentUser} />;
      case 'documents':
        return <ContractorDocuments userType="CONTRACTOR" />;
      default:
        return <ContractorDashboard user={currentUser} />;
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
      <ContractorSidebar 
        user={currentUser}
        onLogout={onLogout}
        activeItem={activeMenuItem}
        onItemClick={handleMenuItemClick}
      />
      
      {/* Main Contractor Content */}
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
        {renderActiveContent()}
      </main>
    </div>
  );
};

export default ContractorApp;