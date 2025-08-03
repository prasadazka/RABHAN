import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import rabhanLogo from '../assets/rabhan_logo.svg';
import LogoutConfirmDialog from './LogoutConfirmDialog';

interface GlobalHeaderProps {
  onLogin?: () => void;
  onRegister?: () => void;
  onShowCalculator?: () => void;
  onHome?: () => void;
  onDashboard?: () => void;
  isAuthenticated?: boolean;
  user?: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    role: string;
  };
  onLogout?: () => void;
}

const GlobalHeader: React.FC<GlobalHeaderProps> = ({ 
  onLogin, 
  onRegister,
  onShowCalculator,
  onHome,
  onDashboard,
  isAuthenticated = false, 
  user, 
  onLogout 
}) => {
  const { t, i18n } = useTranslation();
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false);

  const currentLanguage = i18n.language;
  const isRTL = currentLanguage === 'ar';

  const toggleLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setIsLanguageMenuOpen(false);
    // Update document direction
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  };

  const languages = [
    { code: 'en', name: 'English', flag: '🌐' },
    { code: 'ar', name: 'العربية', flag: '🌐' }
  ];

  return (
    <header
      style={{
        background: '#ffffff',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${theme.colors.borders.light}`,
        position: 'sticky',
        top: 0,
        zIndex: theme.zIndex.sticky,
        width: '100%',
        boxShadow: theme.shadows.md,
        direction: isRTL ? 'rtl' : 'ltr'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '0 clamp(1rem, 3vw, 2rem)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: 'clamp(64px, 8vw, 80px)',
          boxSizing: 'border-box'
        }}
      >
        {/* Logo Section - Left Aligned */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            cursor: 'pointer',
            padding: '0.5rem',
            borderRadius: theme.radius.lg
          }}
          onClick={onHome}
        >
          <img
            src={rabhanLogo}
            alt={t('header.logoAlt')}
            style={{
              width: 'clamp(72px, 12vw, 120px)',
              height: 'clamp(72px, 12vw, 120px)',
              borderRadius: theme.radius.lg,
              objectFit: 'contain',
              filter: 'drop-shadow(0 6px 20px rgba(0,0,0,0.15))',
              transition: theme.transitions.normal
            }}
          />
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            display: 'none',
            background: 'rgba(62, 178, 177, 0.08)',
            border: `1px solid rgba(62, 178, 177, 0.2)`,
            cursor: 'pointer',
            padding: '0.75rem',
            borderRadius: theme.radius.lg,
            color: theme.colors.text.primary,
            fontSize: '1.25rem',
            minHeight: theme.accessibility.minTouchTarget,
            minWidth: theme.accessibility.minTouchTarget,
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          className="mobile-menu-button"
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(62, 178, 177, 0.12)';
            e.currentTarget.style.transform = 'translateY(-1px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(62, 178, 177, 0.08)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          ☰
        </button>

        {/* Navigation Section - Right Aligned */}
        <nav
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(0.75rem, 2vw, 1.25rem)'
          }}
          className="desktop-nav"
        >
          {/* Language Switcher */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setIsLanguageMenuOpen(!isLanguageMenuOpen)}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: 'clamp(0.5rem, 2vw, 0.75rem)',
                borderRadius: theme.radius.sm,
                fontSize: 'clamp(0.875rem, 2.5vw, 1rem)',
                color: theme.colors.text.secondary,
                transition: theme.transitions.normal,
                minHeight: theme.accessibility.minTouchTarget
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = theme.colors.gradients.cardHover;
                e.currentTarget.style.color = theme.colors.text.primary;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = theme.colors.text.secondary;
              }}
            >
              <span style={{ fontSize: '1.25rem' }}>
                {languages.find(lang => lang.code === currentLanguage)?.flag || '🌐'}
              </span>
              <span>{languages.find(lang => lang.code === currentLanguage)?.name || 'English'}</span>
              <span style={{ fontSize: '0.75rem' }}>▼</span>
            </button>

            {/* Language Dropdown */}
            {isLanguageMenuOpen && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: isRTL ? 'auto' : '0',
                  left: isRTL ? '0' : 'auto',
                  marginTop: '0.5rem',
                  background: '#ffffff',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  borderRadius: theme.radius.components.card,
                  boxShadow: theme.shadows.components.dropdown,
                  border: `1px solid ${theme.colors.borders.light}`,
                  minWidth: '150px',
                  zIndex: theme.zIndex.dropdown,
                  overflow: 'hidden'
                }}
              >
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => toggleLanguage(lang.code)}
                    style={{
                      width: '100%',
                      padding: '0.75rem 1rem',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      fontSize: '0.875rem',
                      color: currentLanguage === lang.code ? theme.colors.text.primary : theme.colors.text.secondary,
                      transition: theme.transitions.normal,
                      fontWeight: currentLanguage === lang.code ? theme.typography.weights.semibold : theme.typography.weights.normal
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = theme.colors.gradients.cardHover;
                      e.currentTarget.style.color = theme.colors.text.primary;
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.color = currentLanguage === lang.code ? theme.colors.text.primary : theme.colors.text.secondary;
                    }}
                  >
                    <span style={{ fontSize: '1.125rem' }}>{lang.flag}</span>
                    <span>{lang.name}</span>
                    {currentLanguage === lang.code && (
                      <span style={{ marginLeft: 'auto', color: theme.colors.semantic.success.main }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Solar Calculator Button */}
          {onShowCalculator && (
            <button
              onClick={onShowCalculator}
              style={{
                background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                border: 'none',
                color: '#ffffff',
                padding: 'clamp(0.625rem, 2vw, 0.75rem) clamp(1rem, 2.5vw, 1.25rem)',
                borderRadius: theme.radius.lg,
                fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)',
                fontWeight: theme.typography.weights.semibold,
                fontFamily: theme.typography.fonts.primary,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                minHeight: theme.accessibility.minTouchTarget,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: '0 4px 12px rgba(62, 178, 177, 0.25)',
                position: 'relative',
                overflow: 'hidden',
                letterSpacing: '0.025em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #22d3db 0%, #5cecea 100%)';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(62, 178, 177, 0.35)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(62, 178, 177, 0.25)';
              }}
            >
              <span>🔆</span>
              <span>{t('navigation.calculator')}</span>
            </button>
          )}

          {/* Dashboard Button - Only visible when authenticated */}
          {isAuthenticated && onDashboard && (
            <button
              onClick={onDashboard}
              style={{
                background: 'rgba(62, 178, 177, 0.08)',
                border: `1px solid rgba(62, 178, 177, 0.2)`,
                color: theme.colors.text.primary,
                padding: 'clamp(0.625rem, 2vw, 0.75rem) clamp(1rem, 2.5vw, 1.25rem)',
                borderRadius: theme.radius.lg,
                fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)',
                fontWeight: theme.typography.weights.semibold,
                fontFamily: theme.typography.fonts.primary,
                cursor: 'pointer',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                minHeight: theme.accessibility.minTouchTarget,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                position: 'relative',
                overflow: 'hidden',
                letterSpacing: '0.025em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(62, 178, 177, 0.12)';
                e.currentTarget.style.borderColor = 'rgba(62, 178, 177, 0.3)';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(62, 178, 177, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(62, 178, 177, 0.08)';
                e.currentTarget.style.borderColor = 'rgba(62, 178, 177, 0.2)';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <span>📊</span>
              <span>{t('header.dashboard')}</span>
            </button>
          )}

          {/* Auth Section */}
          {isAuthenticated && user ? (
            /* Authenticated User Section */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(0.75rem, 2vw, 1rem)'
              }}
            >
              {/* Welcome Message */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 0.75rem',
                  background: 'rgba(62, 178, 177, 0.08)',
                  borderRadius: theme.radius.lg,
                  border: '1px solid rgba(62, 178, 177, 0.2)'
                }}
              >
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem',
                    color: '#ffffff'
                  }}
                >
                  {user.role === 'CONTRACTOR' ? '🔧' : '👤'}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
                  <span
                    style={{
                      fontSize: 'clamp(0.75rem, 2vw, 0.875rem)',
                      fontWeight: theme.typography.weights.semibold,
                      color: theme.colors.text.primary,
                      lineHeight: 1,
                      textAlign: isRTL ? 'right' : 'left'
                    }}
                  >
                    {(() => {
                      if (user.first_name && user.last_name) {
                        return `${user.first_name} ${user.last_name}`;
                      } else if (user.first_name) {
                        return user.first_name;
                      } else if (user.last_name) {
                        return user.last_name;
                      } else {
                        return user.email.split('@')[0];
                      }
                    })()}
                  </span>
                  <span
                    style={{
                      fontSize: 'clamp(0.625rem, 1.5vw, 0.75rem)',
                      color: theme.colors.text.secondary,
                      lineHeight: 1,
                      textAlign: isRTL ? 'right' : 'left'
                    }}
                  >
                    {user.role === 'CONTRACTOR' ? t('auth.userTypes.CONTRACTOR') : t('auth.userTypes.USER')}
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={() => setIsLogoutDialogOpen(true)}
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: '#dc2626',
                  padding: 'clamp(0.625rem, 2vw, 0.75rem) clamp(1rem, 2.5vw, 1.25rem)',
                  borderRadius: theme.radius.lg,
                  fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)',
                  fontWeight: theme.typography.weights.semibold,
                  fontFamily: theme.typography.fonts.primary,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  minHeight: theme.accessibility.minTouchTarget,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  letterSpacing: '0.025em'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span>🚪</span>
                <span>{t('header.logout')}</span>
              </button>
            </div>
          ) : (
            /* Unauthenticated Auth Buttons */
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'clamp(0.5rem, 1.5vw, 0.75rem)'
              }}
            >
              <button
                onClick={onLogin}
                style={{
                  background: 'rgba(62, 178, 177, 0.08)',
                  border: `1px solid rgba(62, 178, 177, 0.2)`,
                  color: theme.colors.text.primary,
                  padding: 'clamp(0.625rem, 2vw, 0.75rem) clamp(1.25rem, 3vw, 1.5rem)',
                  borderRadius: theme.radius.lg,
                  fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)',
                  fontWeight: theme.typography.weights.semibold,
                  fontFamily: theme.typography.fonts.primary,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  minHeight: theme.accessibility.minTouchTarget,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  letterSpacing: '0.025em'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(62, 178, 177, 0.12)';
                  e.currentTarget.style.borderColor = 'rgba(62, 178, 177, 0.3)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(62, 178, 177, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(62, 178, 177, 0.08)';
                  e.currentTarget.style.borderColor = 'rgba(62, 178, 177, 0.2)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {t('header.login')}
              </button>

              <button
                onClick={onRegister}
                style={{
                  background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: 'clamp(0.625rem, 2vw, 0.75rem) clamp(1.25rem, 3vw, 1.5rem)',
                  borderRadius: theme.radius.lg,
                  fontSize: 'clamp(0.875rem, 2.5vw, 0.9375rem)',
                  fontWeight: theme.typography.weights.semibold,
                  fontFamily: theme.typography.fonts.primary,
                  cursor: 'pointer',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  minHeight: theme.accessibility.minTouchTarget,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(62, 178, 177, 0.25)',
                  position: 'relative',
                  overflow: 'hidden',
                  letterSpacing: '0.025em'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #22d3db 0%, #5cecea 100%)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(62, 178, 177, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(62, 178, 177, 0.25)';
                }}
              >
                {t('header.register')}
              </button>
            </div>
          )}
        </nav>

      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div
          style={{
            background: '#ffffff',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: `1px solid ${theme.colors.borders.light}`,
            padding: '1rem',
            display: 'none'
          }}
          className="mobile-menu"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* Mobile Language Switcher */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1rem', fontWeight: theme.typography.weights.medium }}>
                {t('header.language')}
              </span>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {languages.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => toggleLanguage(lang.code)}
                    style={{
                      background: currentLanguage === lang.code ? theme.colors.gradients.primary : 'transparent',
                      color: currentLanguage === lang.code ? theme.colors.text.inverse : theme.colors.text.secondary,
                      border: `1px solid ${currentLanguage === lang.code ? 'transparent' : theme.colors.borders.light}`,
                      padding: '0.5rem',
                      borderRadius: theme.radius.sm,
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      fontWeight: theme.typography.weights.medium,
                      transition: theme.transitions.normal,
                      minHeight: theme.accessibility.minTouchTarget
                    }}
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Solar Calculator Button */}
            {onShowCalculator && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onShowCalculator();
                }}
                style={{
                  background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                  border: 'none',
                  color: '#ffffff',
                  padding: '0.75rem 1rem',
                  borderRadius: theme.radius.lg,
                  fontSize: '1rem',
                  fontWeight: theme.typography.weights.semibold,
                  cursor: 'pointer',
                  transition: theme.transitions.normal,
                  minHeight: theme.accessibility.minTouchTarget,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: '0 4px 12px rgba(62, 178, 177, 0.25)'
                }}
              >
                <span>🔆</span>
                <span>{t('navigation.calculator')}</span>
              </button>
            )}

            {/* Mobile Dashboard Button - Only visible when authenticated */}
            {isAuthenticated && onDashboard && (
              <button
                onClick={() => {
                  setIsMobileMenuOpen(false);
                  onDashboard();
                }}
                style={{
                  background: 'rgba(62, 178, 177, 0.08)',
                  border: `1px solid rgba(62, 178, 177, 0.2)`,
                  color: theme.colors.text.primary,
                  padding: '0.75rem 1rem',
                  borderRadius: theme.radius.lg,
                  fontSize: '1rem',
                  fontWeight: theme.typography.weights.semibold,
                  cursor: 'pointer',
                  transition: theme.transitions.normal,
                  minHeight: theme.accessibility.minTouchTarget,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem'
                }}
              >
                <span>📊</span>
                <span>{t('header.dashboard')}</span>
              </button>
            )}

            {/* Mobile Auth Section */}
            {isAuthenticated && user ? (
              /* Authenticated Mobile Menu */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {/* Mobile User Info */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.75rem',
                    background: 'rgba(62, 178, 177, 0.08)',
                    borderRadius: theme.radius.lg,
                    border: '1px solid rgba(62, 178, 177, 0.2)'
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.25rem',
                      color: '#ffffff'
                    }}
                  >
                    {user.role === 'CONTRACTOR' ? '🔧' : '👤'}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: '1rem',
                        fontWeight: theme.typography.weights.semibold,
                        color: theme.colors.text.primary,
                        marginBottom: '0.25rem'
                      }}
                    >
                      {(() => {
                        if (user.first_name && user.last_name) {
                          return `${user.first_name} ${user.last_name}`;
                        } else if (user.first_name) {
                          return user.first_name;
                        } else if (user.last_name) {
                          return user.last_name;
                        } else {
                          return user.email.split('@')[0];
                        }
                      })()}
                    </div>
                    <div
                      style={{
                        fontSize: '0.875rem',
                        color: theme.colors.text.secondary
                      }}
                    >
                      {user.role === 'CONTRACTOR' ? t('auth.userTypes.CONTRACTOR') : t('auth.userTypes.USER')}
                    </div>
                  </div>
                </div>

                {/* Mobile Logout Button */}
                <button
                  onClick={() => setIsLogoutDialogOpen(true)}
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.2)',
                    color: '#dc2626',
                    padding: '0.75rem 1rem',
                    borderRadius: theme.radius.lg,
                    fontSize: '1rem',
                    fontWeight: theme.typography.weights.semibold,
                    cursor: 'pointer',
                    transition: theme.transitions.normal,
                    minHeight: theme.accessibility.minTouchTarget,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem'
                  }}
                >
                  {t('header.logout')}
                </button>
              </div>
            ) : (
              /* Unauthenticated Mobile Auth Buttons */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <button
                  onClick={onLogin}
                  style={{
                    background: 'transparent',
                    border: `1px solid ${theme.colors.borders.medium}`,
                    color: theme.colors.text.primary,
                    padding: '0.75rem 1rem',
                    borderRadius: theme.radius.components.button,
                    fontSize: '1rem',
                    fontWeight: theme.typography.weights.medium,
                    cursor: 'pointer',
                    transition: theme.transitions.normal,
                    minHeight: theme.accessibility.minTouchTarget
                  }}
                >
                  {t('header.login')}
                </button>

                <button
                  onClick={onRegister}
                  style={{
                    background: theme.colors.gradients.button,
                    border: 'none',
                    color: theme.colors.text.inverse,
                    padding: '0.75rem 1rem',
                    borderRadius: theme.radius.components.button,
                    fontSize: '1rem',
                    fontWeight: theme.typography.weights.medium,
                    cursor: 'pointer',
                    transition: theme.transitions.normal,
                    minHeight: theme.accessibility.minTouchTarget,
                    boxShadow: theme.shadows.primary.sm
                  }}
                >
                  {t('header.register')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logout Confirmation Dialog */}
      <LogoutConfirmDialog
        isOpen={isLogoutDialogOpen}
        onConfirm={() => {
          setIsLogoutDialogOpen(false);
          onLogout?.();
        }}
        onCancel={() => setIsLogoutDialogOpen(false)}
        userName={(() => {
          if (!user) return undefined;
          if (user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
          } else if (user.first_name) {
            return user.first_name;
          } else if (user.last_name) {
            return user.last_name;
          } else {
            return user.email.split('@')[0];
          }
        })()}
      />

      {/* Mobile-specific styles */}
      <style>
        {`
          @media (max-width: 768px) {
            .desktop-nav {
              display: none !important;
            }
            .mobile-menu-button {
              display: flex !important;
            }
            .mobile-menu {
              display: block !important;
            }
          }
        `}
      </style>
    </header>
  );
};

export default GlobalHeader;