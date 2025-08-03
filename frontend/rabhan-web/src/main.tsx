import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './index.css';
import './i18n';
import { theme, generateCSSVariables } from './theme';
import GlobalHeader from './components/GlobalHeader';
import LoginPopup from './components/LoginPopup';
import RegisterSelection from './pages/RegisterSelection';
import UserRegistration from './pages/UserRegistration';
import ContractorRegistration from './pages/ContractorRegistration';
import UserApp from './pages/UserApp';
import ContractorApp from './pages/ContractorApp';
import { authService } from './services/auth.service';
import { CleanSolarCalculator } from './components/calculator/CleanSolarCalculator';

// Apply CSS variables to root
const cssVars = generateCSSVariables();
Object.entries(cssVars).forEach(([key, value]) => {
  document.documentElement.style.setProperty(key, value);
});

// Authentication guard component
const AuthGuard: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const navigate = useNavigate();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    // Get current auth state first (no async call)
    const authState = authService.getState();
    console.log('🔍 AuthGuard: Initial auth state:', { isAuthenticated: authState.isAuthenticated, hasUser: !!authState.user });
    
    setIsAuthenticated(authState.isAuthenticated);
    setUser(authState.user);
    
    if (!authState.isAuthenticated) {
      console.log('🔍 AuthGuard: Not authenticated, redirecting to home');
      navigate('/');
      return;
    }

    const unsubscribe = authService.subscribe((state) => {
      console.log('🔍 AuthGuard: Auth state updated:', { isAuthenticated: state.isAuthenticated, hasUser: !!state.user });
      setIsAuthenticated(state.isAuthenticated);
      setUser(state.user);
      if (!state.isAuthenticated) {
        navigate('/');
      }
    });

    return unsubscribe;
  }, [navigate]);

  if (isAuthenticated === null) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated || !user) {
    return null;
  }

  return <>{children}</>;
};



// User dashboard wrapper  
const DashboardPage = () => {
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const authState = authService.getState();
    setUser(authState.user);

    console.log('🔍 DashboardPage: Auth state check:', {
      hasUser: !!authState.user,
      userRole: authState.user?.role,
      currentPath: location.pathname,
      shouldRedirect: authState.user?.role === 'CONTRACTOR' && location.pathname.startsWith('/dashboard')
    });

    // Redirect contractors to contractor dashboard
    if (authState.user?.role === 'CONTRACTOR' && location.pathname.startsWith('/dashboard')) {
      console.log('🔄 DashboardPage: Redirecting contractor to contractor dashboard');
      navigate('/contractor/dashboard');
      return;
    }

    const unsubscribe = authService.subscribe((state) => {
      setUser(state.user);
      
      console.log('🔍 DashboardPage: Auth state updated:', {
        hasUser: !!state.user,
        userRole: state.user?.role,
        currentPath: location.pathname,
        shouldRedirect: state.user?.role === 'CONTRACTOR' && location.pathname.startsWith('/dashboard')
      });
      
      // Redirect contractors to contractor dashboard
      if (state.user?.role === 'CONTRACTOR' && location.pathname.startsWith('/dashboard')) {
        console.log('🔄 DashboardPage: Redirecting contractor from subscription update');
        navigate('/contractor/dashboard');
      }
    });

    return unsubscribe;
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    await authService.logout();
  };

  // Determine active menu item from URL
  const getActiveMenuFromURL = () => {
    const path = location.pathname;
    if (path === '/dashboard/profile') return 'profile';
    if (path === '/dashboard/settings') return 'settings';
    if (path === '/dashboard/documents') return 'documents';
    return 'dashboard';
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return <UserApp user={user} onLogout={handleLogout} initialActiveItem={getActiveMenuFromURL()} />;
};

// Contractor dashboard wrapper
const ContractorDashboardPage = () => {
  const [user, setUser] = useState<any>(null);
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const authState = authService.getState();
    setUser(authState.user);

    console.log('🔍 ContractorDashboardPage: Auth state check:', {
      hasUser: !!authState.user,
      userRole: authState.user?.role,
      currentPath: location.pathname
    });

    const unsubscribe = authService.subscribe((state) => {
      setUser(state.user);
      
      console.log('🔍 ContractorDashboardPage: Auth state updated:', {
        hasUser: !!state.user,
        userRole: state.user?.role,
        currentPath: location.pathname
      });
    });

    return unsubscribe;
  }, [navigate, location.pathname]);

  const handleLogout = async () => {
    await authService.logout();
  };

  // Determine active menu item from URL
  const getActiveMenuFromURL = () => {
    const path = location.pathname;
    if (path === '/contractor/profile') return 'profile';
    if (path === '/contractor/projects') return 'projects';
    if (path === '/contractor/marketplace') return 'marketplace';
    if (path === '/contractor/quotes') return 'quotes';
    if (path === '/contractor/wallet') return 'wallet';
    if (path === '/contractor/documents') return 'documents';
    return 'dashboard';
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <ContractorApp 
      user={user} 
      onLogout={handleLogout} 
      onUserUpdate={(updatedUser) => {
        console.log('🔄 Updating user state in ContractorDashboardPage:', updatedUser);
        setUser(updatedUser);
        
        // Also update the auth service state
        authService.updateUserData(updatedUser);
      }}
      initialActiveItem={getActiveMenuFromURL()} 
    />
  );
};

// Solar Calculator page component
const SolarCalculatorPage = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    // Get current auth state without triggering additional API calls
    const authState = authService.getState();
    setIsAuthenticated(authState.isAuthenticated);
    setUser(authState.user);

    const unsubscribe = authService.subscribe((state) => {
      setIsAuthenticated(state.isAuthenticated);
      setUser(state.user);
    });

    return unsubscribe;
  }, []);

  const handleLogin = () => {
    setIsLoginPopupOpen(true);
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const handleLoginSuccess = (user: any) => {
    console.log('Login successful:', user);
    setIsLoginPopupOpen(false);
    
    // Immediate navigation based on user role
    if (user && user.role === 'CONTRACTOR') {
      console.log('🔄 Redirecting contractor to contractor dashboard');
      navigate('/contractor/dashboard');
    } else if (user && user.role === 'USER') {
      console.log('🔄 Redirecting user to user dashboard');
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  const handleShowCalculator = () => {
    // Already on calculator page, do nothing
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.gradients.primaryLight,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fonts.primary,
      direction: i18n.language === 'ar' ? 'rtl' : 'ltr'
    }}>
      <GlobalHeader 
        onLogin={handleLogin} 
        onRegister={handleRegister}
        onShowCalculator={handleShowCalculator}
        onHome={() => navigate('/')}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
      />
      
      {/* Solar Calculator Content */}
      <main style={{
        minHeight: 'calc(100vh - 80px)',
        padding: 'clamp(1rem, 3vw, 2rem)',
        boxSizing: 'border-box',
        width: '100%',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        paddingTop: '2rem'
      }}>
        <CleanSolarCalculator />
      </main>

      <LoginPopup
        isOpen={isLoginPopupOpen}
        onClose={() => setIsLoginPopupOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onRegister={handleRegister}
      />
    </div>
  );
};

// Home page component
const HomePage = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  // Check authentication status on component mount
  React.useEffect(() => {
    // Get current auth state without triggering additional API calls
    const authState = authService.getState();
    setIsAuthenticated(authState.isAuthenticated);
    setUser(authState.user);
    
    // Redirect authenticated users to appropriate dashboard
    if (authState.isAuthenticated && authState.user) {
      if (authState.user.role === 'CONTRACTOR') {
        navigate('/contractor/dashboard');
      } else {
        navigate('/dashboard');
      }
      return;
    }

    // Subscribe to auth state changes
    const unsubscribe = authService.subscribe((state) => {
      setIsAuthenticated(state.isAuthenticated);
      setUser(state.user);
      
      // Redirect authenticated users to appropriate dashboard
      if (state.isAuthenticated && state.user) {
        if (state.user.role === 'CONTRACTOR') {
          navigate('/contractor/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    });

    return unsubscribe;
  }, [navigate]);

  const handleLogin = () => {
    setIsLoginPopupOpen(true);
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const handleLoginSuccess = (user: any) => {
    console.log('Login successful:', user);
    setIsLoginPopupOpen(false);
    
    // Immediate navigation based on user role
    if (user && user.role === 'CONTRACTOR') {
      console.log('🔄 Redirecting contractor to contractor dashboard');
      navigate('/contractor/dashboard');
    } else if (user && user.role === 'USER') {
      console.log('🔄 Redirecting user to user dashboard');
      navigate('/dashboard');
    }
    // Auth state will be updated automatically by the subscription
  };

  const handleLogout = async () => {
    await authService.logout();
    // Auth state will be updated automatically by the subscription
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.gradients.primaryLight,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fonts.primary,
      direction: i18n.language === 'ar' ? 'rtl' : 'ltr'
    }}>
      <GlobalHeader 
        onLogin={handleLogin} 
        onRegister={handleRegister}
        onShowCalculator={() => navigate('/solar-calculator')}
        onHome={() => navigate('/')}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
      />
      
      {/* Main content area - clean slate */}
      <main style={{
        minHeight: 'calc(100vh - 80px)',
        padding: 'clamp(1rem, 3vw, 2rem)',
        boxSizing: 'border-box',
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingTop: '2rem'
      }}>
        <CleanSolarCalculator />
      </main>


      <LoginPopup
        isOpen={isLoginPopupOpen}
        onClose={() => setIsLoginPopupOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onRegister={handleRegister}
      />
    </div>
  );
};

// Register selection page wrapper
const RegisterSelectionPage = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    // Get current auth state without triggering additional API calls
    const authState = authService.getState();
    setIsAuthenticated(authState.isAuthenticated);
    setUser(authState.user);

    const unsubscribe = authService.subscribe((state) => {
      setIsAuthenticated(state.isAuthenticated);
      setUser(state.user);
    });

    return unsubscribe;
  }, []);

  const handleLogin = () => {
    setIsLoginPopupOpen(true);
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const handleLoginSuccess = (user: any) => {
    console.log('Login successful:', user);
    setIsLoginPopupOpen(false);
    
    // Immediate navigation based on user role
    if (user && user.role === 'CONTRACTOR') {
      console.log('🔄 Redirecting contractor to contractor dashboard');
      navigate('/contractor/dashboard');
    } else if (user && user.role === 'USER') {
      console.log('🔄 Redirecting user to user dashboard');
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  const handleUserTypeSelect = (userType: 'USER' | 'CONTRACTOR') => {
    if (userType === 'USER') {
      navigate('/register/user');
    } else {
      navigate('/register/contractor');
    }
  };

  const handleBack = () => {
    navigate('/');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.gradients.primaryLight,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fonts.primary,
      direction: i18n.language === 'ar' ? 'rtl' : 'ltr'
    }}>
      <GlobalHeader 
        onLogin={handleLogin} 
        onRegister={handleRegister}
        onShowCalculator={() => navigate('/solar-calculator')}
        onHome={() => navigate('/')}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
      />
      <RegisterSelection
        onUserTypeSelect={handleUserTypeSelect}
        onBack={handleBack}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
      <LoginPopup
        isOpen={isLoginPopupOpen}
        onClose={() => setIsLoginPopupOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onRegister={handleRegister}
      />
    </div>
  );
};

// User registration page wrapper
const UserRegistrationPage = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    // Get current auth state without triggering additional API calls
    const authState = authService.getState();
    setIsAuthenticated(authState.isAuthenticated);
    setUser(authState.user);

    const unsubscribe = authService.subscribe((state) => {
      setIsAuthenticated(state.isAuthenticated);
      setUser(state.user);
    });

    return unsubscribe;
  }, []);

  const handleLogin = () => {
    setIsLoginPopupOpen(true);
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const handleLoginSuccess = (user: any) => {
    console.log('Login successful:', user);
    setIsLoginPopupOpen(false);
    
    // Immediate navigation based on user role
    if (user && user.role === 'CONTRACTOR') {
      console.log('🔄 Redirecting contractor to contractor dashboard');
      navigate('/contractor/dashboard');
    } else if (user && user.role === 'USER') {
      console.log('🔄 Redirecting user to user dashboard');
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  const handleBack = () => {
    navigate('/register');
  };

  const handleRegistrationComplete = async (userData: any) => {
    console.log('Registration completed:', userData);
    // The auth state is already updated by the registration process
    // Navigate to dashboard for authenticated users
    navigate('/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.gradients.primaryLight,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fonts.primary,
      direction: i18n.language === 'ar' ? 'rtl' : 'ltr'
    }}>
      <GlobalHeader 
        onLogin={handleLogin} 
        onRegister={handleRegister}
        onShowCalculator={() => navigate('/solar-calculator')}
        onHome={() => navigate('/')}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
      />
      <UserRegistration
        onBack={handleBack}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onComplete={handleRegistrationComplete}
      />
      <LoginPopup
        isOpen={isLoginPopupOpen}
        onClose={() => setIsLoginPopupOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onRegister={handleRegister}
      />
    </div>
  );
};

// Contractor registration page wrapper
const ContractorRegistrationPage = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const [isLoginPopupOpen, setIsLoginPopupOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);

  React.useEffect(() => {
    // Get current auth state without triggering additional API calls
    const authState = authService.getState();
    setIsAuthenticated(authState.isAuthenticated);
    setUser(authState.user);

    const unsubscribe = authService.subscribe((state) => {
      setIsAuthenticated(state.isAuthenticated);
      setUser(state.user);
    });

    return unsubscribe;
  }, []);

  const handleLogin = () => {
    setIsLoginPopupOpen(true);
  };

  const handleRegister = () => {
    navigate('/register');
  };

  const handleLoginSuccess = (user: any) => {
    console.log('Login successful:', user);
    setIsLoginPopupOpen(false);
    
    // Immediate navigation based on user role
    if (user && user.role === 'CONTRACTOR') {
      console.log('🔄 Redirecting contractor to contractor dashboard');
      navigate('/contractor/dashboard');
    } else if (user && user.role === 'USER') {
      console.log('🔄 Redirecting user to user dashboard');
      navigate('/dashboard');
    }
  };

  const handleLogout = async () => {
    await authService.logout();
  };

  const handleBack = () => {
    navigate('/register');
  };

  const handleRegistrationComplete = async (userData: any) => {
    console.log('Contractor registration completed:', userData);
    // Navigate to contractor dashboard for contractors
    navigate('/contractor/dashboard');
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: theme.colors.gradients.primaryLight,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fonts.primary,
      direction: i18n.language === 'ar' ? 'rtl' : 'ltr'
    }}>
      <GlobalHeader 
        onLogin={handleLogin} 
        onRegister={handleRegister}
        onShowCalculator={() => navigate('/solar-calculator')}
        onHome={() => navigate('/')}
        isAuthenticated={isAuthenticated}
        user={user}
        onLogout={handleLogout}
      />
      <ContractorRegistration
        onBack={handleBack}
        onLogin={handleLogin}
        onRegister={handleRegister}
        onComplete={handleRegistrationComplete}
      />
      <LoginPopup
        isOpen={isLoginPopupOpen}
        onClose={() => setIsLoginPopupOpen(false)}
        onLoginSuccess={handleLoginSuccess}
        onRegister={handleRegister}
      />
    </div>
  );
};

// Main App component with routing
const App = () => {
  const { i18n } = useTranslation();
  
  // Set document direction based on language
  React.useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/solar-calculator" element={<SolarCalculatorPage />} />
        <Route path="/register" element={<RegisterSelectionPage />} />
        <Route path="/register/user" element={<UserRegistrationPage />} />
        <Route path="/register/contractor" element={<ContractorRegistrationPage />} />
        {/* Authenticated routes - User Dashboard */}
        <Route path="/dashboard" element={<AuthGuard><DashboardPage /></AuthGuard>} />
        <Route path="/dashboard/profile" element={<AuthGuard><DashboardPage /></AuthGuard>} />
        <Route path="/dashboard/settings" element={<AuthGuard><DashboardPage /></AuthGuard>} />
        <Route path="/dashboard/documents" element={<AuthGuard><DashboardPage /></AuthGuard>} />
        {/* Authenticated routes - Contractor Dashboard */}
        <Route path="/contractor/dashboard" element={<AuthGuard><ContractorDashboardPage /></AuthGuard>} />
        <Route path="/contractor/profile" element={<AuthGuard><ContractorDashboardPage /></AuthGuard>} />
        <Route path="/contractor/projects" element={<AuthGuard><ContractorDashboardPage /></AuthGuard>} />
        <Route path="/contractor/marketplace" element={<AuthGuard><ContractorDashboardPage /></AuthGuard>} />
        <Route path="/contractor/quotes" element={<AuthGuard><ContractorDashboardPage /></AuthGuard>} />
        <Route path="/contractor/wallet" element={<AuthGuard><ContractorDashboardPage /></AuthGuard>} />
        <Route path="/contractor/documents" element={<AuthGuard><ContractorDashboardPage /></AuthGuard>} />
      </Routes>
    </BrowserRouter>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);