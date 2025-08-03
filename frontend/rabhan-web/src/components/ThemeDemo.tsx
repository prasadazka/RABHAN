import React from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

const ThemeDemo: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 80px)',
      padding: '1rem',
      boxSizing: 'border-box'
    }}>
      <div className="glass-card glass-wave" style={{
        textAlign: 'center',
        padding: 'clamp(1rem, 5vw, 2rem)',
        borderRadius: theme.radius.components.modal,
        width: '100%',
        maxWidth: '700px',
        margin: '0 auto',
        boxSizing: 'border-box',
        transition: theme.transitions.normal,
        boxShadow: theme.shadows.components.modal.content,
        border: `1px solid ${theme.colors.borders.light}`,
        background: theme.colors.gradients.card
      }}>
        <h1 className="wave-text float-animation" style={{
          fontSize: 'clamp(1.5rem, 5vw, 3rem)',
          fontWeight: theme.typography.weights.bold,
          lineHeight: 1.2,
          letterSpacing: '-0.025em',
          marginBottom: 'clamp(1rem, 3vw, 2rem)',
          backgroundSize: '400% 400%'
        }}>
          {t('theme.title')}
        </h1>
        <p style={{
          fontSize: 'clamp(0.875rem, 3vw, 1.125rem)',
          color: theme.colors.text.secondary,
          lineHeight: 1.6,
          maxWidth: '600px',
          margin: '0 auto',
          marginBottom: 'clamp(1.5rem, 4vw, 2.5rem)'
        }}>
          {t('theme.subtitle')}
        </p>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
          gap: 'clamp(1rem, 3vw, 1.5rem)',
          marginBottom: 'clamp(1.5rem, 4vw, 2.5rem)'
        }}>
          <div className="wave-bg" style={{
            padding: 'clamp(1rem, 4vw, 1.5rem)',
            borderRadius: theme.radius.components.card,
            color: theme.colors.text.inverse,
            boxShadow: theme.shadows.components.card.default,
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            backgroundSize: '400% 400%',
            cursor: 'pointer',
            transition: theme.transitions.normal
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(62, 178, 177, 0.25)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = theme.shadows.components.card.default;
          }}>
            <h3 style={{
              fontSize: 'clamp(1rem, 3vw, 1.125rem)',
              fontWeight: theme.typography.weights.semibold,
              marginBottom: '0.5rem',
              margin: 0
            }}>Wave Animation</h3>
            <p style={{
              fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
              opacity: 0.9,
              margin: 0,
              marginTop: '0.5rem'
            }}>Animated gradient waves</p>
          </div>
          
          <div className="glass" style={{
            padding: 'clamp(1rem, 4vw, 1.5rem)',
            borderRadius: theme.radius.components.card,
            color: theme.colors.text.primary,
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: theme.transitions.normal
          }}
          onMouseOver={(e) => {
            e.currentTarget.className = 'glass-hover';
            e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.className = 'glass';
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
          }}>
            <h3 style={{
              fontSize: 'clamp(1rem, 3vw, 1.125rem)',
              fontWeight: theme.typography.weights.semibold,
              marginBottom: '0.5rem',
              margin: 0
            }}>Glassmorphism</h3>
            <p style={{
              fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
              color: theme.colors.text.secondary,
              margin: 0,
              marginTop: '0.5rem'
            }}>Modern glass effect</p>
          </div>
          
          <div className="glass-card shimmer" style={{
            padding: 'clamp(1rem, 4vw, 1.5rem)',
            borderRadius: theme.radius.components.card,
            color: theme.colors.text.primary,
            minHeight: '120px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: theme.transitions.normal,
            position: 'relative',
            overflow: 'hidden'
          }}>
            <h3 style={{
              fontSize: 'clamp(1rem, 3vw, 1.125rem)',
              fontWeight: theme.typography.weights.semibold,
              marginBottom: '0.5rem',
              margin: 0
            }}>Shimmer Effect</h3>
            <p style={{
              fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
              color: theme.colors.text.secondary,
              margin: 0,
              marginTop: '0.5rem'
            }}>Animated shimmer</p>
          </div>
        </div>
        
        <div className="glass-card" style={{
          padding: 'clamp(1rem, 4vw, 1.5rem)',
          borderRadius: theme.radius.components.card,
          marginBottom: 'clamp(1.5rem, 4vw, 2.5rem)',
          transition: theme.transitions.normal
        }}>
          <h3 style={{
            fontSize: 'clamp(1rem, 3vw, 1.125rem)',
            fontWeight: theme.typography.weights.semibold,
            color: theme.colors.text.primary,
            margin: 0,
            marginBottom: 'clamp(1rem, 3vw, 1.5rem)'
          }}>
            Enhanced Theme Features
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(200px, 100%), 1fr))',
            gap: 'clamp(0.75rem, 2vw, 1rem)',
            fontSize: 'clamp(0.75rem, 2.5vw, 0.875rem)',
            color: theme.colors.text.secondary
          }}>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <span style={{color: theme.colors.semantic.success.main, flexShrink: 0}}>✅</span>
              <span>{t('theme.features.waveAnimations')}</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <span style={{color: theme.colors.semantic.success.main, flexShrink: 0}}>✅</span>
              <span>{t('theme.features.glassmorphism')}</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <span style={{color: theme.colors.semantic.success.main, flexShrink: 0}}>✅</span>
              <span>{t('theme.features.improvedHover')}</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <span style={{color: theme.colors.semantic.success.main, flexShrink: 0}}>✅</span>
              <span>{t('theme.features.shimmer')}</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <span style={{color: theme.colors.semantic.success.main, flexShrink: 0}}>✅</span>
              <span>{t('theme.features.float')}</span>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <span style={{color: theme.colors.semantic.success.main, flexShrink: 0}}>✅</span>
              <span>{t('theme.features.responsive')}</span>
            </div>
          </div>
        </div>
        
        <button className="float-animation" style={{
          background: theme.colors.gradients.button,
          color: theme.colors.text.inverse,
          border: 'none',
          padding: 'clamp(0.75rem, 3vw, 1rem) clamp(1.5rem, 5vw, 2rem)',
          borderRadius: theme.radius.components.button,
          fontSize: 'clamp(0.875rem, 3vw, 1.125rem)',
          fontWeight: theme.typography.weights.semibold,
          fontFamily: theme.typography.fonts.primary,
          cursor: 'pointer',
          boxShadow: theme.shadows.components.button.default,
          transition: theme.transitions.normal,
          width: '100%',
          maxWidth: '300px',
          minHeight: '48px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          touchAction: 'manipulation',
          WebkitTapHighlightColor: 'transparent'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.background = theme.colors.gradients.buttonHover;
          e.currentTarget.style.boxShadow = '0 12px 40px 0 rgba(62, 178, 177, 0.3)';
          e.currentTarget.style.transform = 'translateY(-4px) scale(1.05)';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.background = theme.colors.gradients.button;
          e.currentTarget.style.boxShadow = theme.shadows.components.button.default;
          e.currentTarget.style.transform = 'translateY(0) scale(1)';
        }}
        onTouchStart={(e) => {
          e.currentTarget.style.transform = 'scale(0.98)';
        }}
        onTouchEnd={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}>
          {t('theme.ready')}
        </button>
      </div>
    </div>
  );
};

export default ThemeDemo;