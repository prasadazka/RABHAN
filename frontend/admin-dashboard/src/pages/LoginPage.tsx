import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn, Shield, Sun, Building2, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { FloatingThemeToggle } from '@/components/ui/FloatingThemeToggle';

export function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const { t, i18n } = useTranslation('common');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginLoading, setLoginLoading] = useState(false);

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      await login(formData.username, formData.password);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    localStorage.setItem('rabhan_admin_language', newLang);
    sessionStorage.setItem('rabhan_admin_language', newLang);
  };

  if (isLoading) {
    return <LoadingSpinner fullscreen message={t('auth.checkingSession')} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5 p-4">
      <div className="w-full max-w-md">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-2 rtl:space-x-reverse p-2 rounded-lg bg-primary text-primary-foreground border-2 border-primary hover:bg-primary/90 hover:border-primary/70 transition-all duration-200 shadow-lg hover:shadow-xl shadow-primary/20 hover:shadow-primary/30"
            title={i18n.language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <Globe className="w-4 h-4" />
            <span className="text-sm font-medium">
              {i18n.language.startsWith('ar') ? 'English' : 'العربية'}
            </span>
          </button>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="glass-card border-2 border-primary/40 primary-glow hover:animate-glow transition-all duration-300"
        >
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="flex items-center justify-center mx-auto mb-6"
            >
              <img 
                src={i18n.language === 'ar' ? "/assets/logo_arabic.jpeg" : "/rabhan_logo.svg"}
                alt={i18n.language === 'ar' ? "RABHAN Arabic Logo" : "RABHAN Logo"}
                className="w-32 h-32 object-contain"
                onError={(e) => {
                  // Fallback to Sun icon if logo fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  target.nextElementSibling?.classList.remove('hidden');
                }}
              />
              <div className="hidden flex items-center justify-center w-16 h-16 bg-primary rounded-2xl shadow-lg">
                <Sun className="w-8 h-8 text-primary-foreground" />
              </div>
            </motion.div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                {t('auth.username')}
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                value={formData.username}
                onChange={handleInputChange}
                className="input w-full"
                placeholder={t('auth.enterUsername')}
                disabled={loginLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="input w-full pr-10 rtl:pr-4 rtl:pl-10"
                  placeholder={t('auth.enterPassword')}
                  disabled={loginLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 rtl:right-auto rtl:left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>


            <button
              type="submit"
              disabled={loginLoading}
              className="btn-primary w-full flex items-center justify-center"
            >
              {loginLoading ? (
                <LoadingSpinner size="sm" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
                  {t('auth.login')}
                </>
              )}
            </button>
          </form>

          {/* Security badges */}
          <div className="mt-8 pt-6 border-t border-border">
            <div className="flex items-center justify-center space-x-6 rtl:space-x-reverse">
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-muted-foreground">
                <Shield className="w-4 h-4 text-primary" />
                <span>{t('common.advancedSecurity')}</span>
              </div>
              <div className="flex items-center space-x-2 rtl:space-x-reverse text-xs text-muted-foreground">
                <Building2 className="w-4 h-4 text-saudi-green" />
                <span>{t('common.samaCompliant')}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Test Credentials Info Box */}

        {/* Footer */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center mt-8"
        >
          <p className="text-xs text-muted-foreground">
            {t('brand.copyright')}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {t('brand.samaCompliantPlatform')}
          </p>
        </motion.div>
      </div>

      {/* Floating Theme Toggle */}
      <FloatingThemeToggle />
    </div>
  );
}