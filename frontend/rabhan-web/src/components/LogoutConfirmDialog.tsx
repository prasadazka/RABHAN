import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

interface LogoutConfirmDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  userName?: string;
}

const LogoutConfirmDialog: React.FC<LogoutConfirmDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  userName
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && isOpen) {
        onCancel();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onCancel]);

  // Prevent body scroll when dialog is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  if (!isOpen) return null;

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
        padding: 'clamp(1rem, 3vw, 2rem)',
        zIndex: 9999,
        animation: 'fadeIn 200ms ease-out'
      }}
      onClick={handleBackdropClick}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '420px',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.5)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1), 0 0 80px rgba(62, 178, 177, 0.1)',
          padding: 'clamp(2rem, 5vw, 2.5rem)',
          position: 'relative',
          animation: 'slideUp 200ms ease-out',
          direction: isRTL ? 'rtl' : 'ltr',
          transform: 'translateY(0)',
          margin: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          style={{
            position: 'absolute',
            top: '1rem',
            right: isRTL ? 'auto' : '1rem',
            left: isRTL ? '1rem' : 'auto',
            width: '40px',
            height: '40px',
            border: 'none',
            background: 'rgba(107, 114, 128, 0.1)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: theme.transitions.fast,
            color: '#6b7280',
            fontSize: '1.25rem'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(107, 114, 128, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(107, 114, 128, 0.1)';
          }}
        >
          ×
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          
          <h2
            style={{
              fontSize: theme.responsive.fluid.xl,
              fontWeight: '600',
              color: '#1a1a1a',
              margin: 0,
              marginBottom: '0.5rem',
              letterSpacing: '-0.025em',
              fontFamily: theme.typography.fonts.primary
            }}
          >
            {t('logout.confirm.title')}
          </h2>
          
          <p
            style={{
              fontSize: '1rem',
              color: '#6b7280',
              margin: 0,
              lineHeight: 1.5,
              textAlign: 'center'
            }}
          >
            {userName 
              ? t('logout.confirm.messageWithName', { name: userName })
              : t('logout.confirm.message')
            }
          </p>
        </div>

        {/* Warning Info */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.2)',
            borderRadius: '12px',
            padding: '1rem',
            marginBottom: '2rem'
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: '0.875rem',
                color: '#dc2626',
                fontWeight: '500',
                marginBottom: '0.25rem'
              }}
            >
              {t('logout.confirm.warning.title')}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: '0.8125rem',
                color: '#7f1d1d',
                lineHeight: 1.4
              }}
            >
              {t('logout.confirm.warning.message')}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '0.75rem',
            flexDirection: isRTL ? 'row-reverse' : 'row'
          }}
        >
          {/* Cancel Button */}
          <button
            onClick={onCancel}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: 'rgba(107, 114, 128, 0.1)',
              border: '1px solid rgba(107, 114, 128, 0.2)',
              borderRadius: '12px',
              color: '#374151',
              fontSize: '1rem',
              fontWeight: '500',
              fontFamily: theme.typography.fonts.primary,
              cursor: 'pointer',
              transition: theme.transitions.fast,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(107, 114, 128, 0.15)';
              e.currentTarget.style.borderColor = 'rgba(107, 114, 128, 0.3)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(107, 114, 128, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(107, 114, 128, 0.2)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span>{t('logout.confirm.cancel')}</span>
          </button>

          {/* Logout Button */}
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '0.875rem',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              border: 'none',
              borderRadius: '12px',
              color: '#ffffff',
              fontSize: '1rem',
              fontWeight: '600',
              fontFamily: theme.typography.fonts.primary,
              cursor: 'pointer',
              transition: theme.transitions.fast,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 6px 16px rgba(239, 68, 68, 0.35)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(239, 68, 68, 0.25)';
            }}
          >
            <span>{t('logout.confirm.logout')}</span>
          </button>
        </div>
      </div>

      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          @keyframes slideUp {
            from { 
              opacity: 0; 
              transform: translateY(20px); 
            }
            to { 
              opacity: 1; 
              transform: translateY(0); 
            }
          }
        `}
      </style>
    </div>
  );
};

export default LogoutConfirmDialog;