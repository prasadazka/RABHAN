import React from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

interface RegisterSelectionProps {
  onUserTypeSelect: (userType: 'USER' | 'CONTRACTOR') => void;
  onBack: () => void;
  onLogin: () => void;
  onRegister: () => void;
}

const RegisterSelection: React.FC<RegisterSelectionProps> = ({ onUserTypeSelect, onBack, onLogin, onRegister }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const userBenefits = [
    t('registration.user.benefits.solarAnalysis.title'),
    t('registration.user.benefits.bnplFinancing.title'),
    t('registration.user.benefits.preverified.title'),
    t('registration.user.benefits.monitoring.title')
  ];

  const contractorBenefits = [
    t('registration.contractor.benefits.marketplace.title'),
    t('registration.contractor.benefits.matching.title'),
    t('registration.contractor.benefits.analytics.title'),
    t('registration.contractor.benefits.certification.title')
  ];

  const UserCard = () => (
    <div
      style={{
        padding: 'clamp(2.5rem, 5vw, 3.5rem)',
        borderRadius: '24px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '2px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 8px 32px rgba(62, 178, 177, 0.15), 0 0 80px rgba(62, 178, 177, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(62, 178, 177, 0.25), 0 0 120px rgba(62, 178, 177, 0.2)';
        e.currentTarget.style.borderColor = 'rgba(62, 178, 177, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(62, 178, 177, 0.15), 0 0 80px rgba(62, 178, 177, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            margin: '0 auto',
            marginBottom: '1.5rem',
            boxShadow: '0 8px 16px rgba(62, 178, 177, 0.3)'
          }}
        >
          🏠
        </div>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: 0,
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em'
          }}
        >
          {t('registration.user.title')}
        </h2>
        <p
          style={{
            fontSize: '1rem',
            color: '#6b7280',
            margin: 0,
            lineHeight: 1.5
          }}
        >
          {t('registration.user.subtitle')}
        </p>
      </div>

      {/* Benefits */}
      <div style={{ marginBottom: '2rem' }}>
        {userBenefits.map((benefit, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              color: '#374151',
              flexDirection: isRTL ? 'row-reverse' : 'row'
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                background: '#3eb2b1',
                borderRadius: '50%',
                flexShrink: 0
              }}
            />
            <span style={{ textAlign: isRTL ? 'right' : 'left' }}>{benefit}</span>
          </div>
        ))}
      </div>

      {/* Join Button */}
      <button
        onClick={() => onUserTypeSelect('USER')}
        style={{
          width: '100%',
          padding: '1rem',
          background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
          border: 'none',
          borderRadius: '12px',
          color: '#ffffff',
          fontSize: '1rem',
          fontWeight: '600',
          fontFamily: theme.typography.fonts.primary,
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          letterSpacing: '0.025em',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #22d3db 0%, #5cecea 100%)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
            animation: 'wave 2s ease-in-out infinite'
          }}
        />
        <span>{t('registration.user.joinButton')}</span>
        <span style={{ fontSize: '1.1rem' }}>{isRTL ? '←' : '→'}</span>
      </button>
    </div>
  );

  const ContractorCard = () => (
    <div
      style={{
        padding: 'clamp(2.5rem, 5vw, 3.5rem)',
        borderRadius: '24px',
        background: 'rgba(255, 255, 255, 0.7)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '2px solid rgba(255, 255, 255, 0.5)',
        boxShadow: '0 8px 32px rgba(62, 178, 177, 0.15), 0 0 80px rgba(62, 178, 177, 0.1)',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px)';
        e.currentTarget.style.boxShadow = '0 20px 40px rgba(62, 178, 177, 0.25), 0 0 120px rgba(62, 178, 177, 0.2)';
        e.currentTarget.style.borderColor = 'rgba(62, 178, 177, 0.5)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 8px 32px rgba(62, 178, 177, 0.15), 0 0 80px rgba(62, 178, 177, 0.1)';
        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <div
          style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.75rem',
            margin: '0 auto',
            marginBottom: '1.5rem',
            boxShadow: '0 8px 16px rgba(62, 178, 177, 0.3)'
          }}
        >
          🔧
        </div>
        <h2
          style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1a1a1a',
            margin: 0,
            marginBottom: '0.5rem',
            letterSpacing: '-0.025em'
          }}
        >
          {t('registration.contractor.title')}
        </h2>
        <p
          style={{
            fontSize: '1rem',
            color: '#6b7280',
            margin: 0,
            lineHeight: 1.5
          }}
        >
          {t('registration.contractor.subtitle')}
        </p>
      </div>

      {/* Benefits */}
      <div style={{ marginBottom: '2rem' }}>
        {contractorBenefits.map((benefit, index) => (
          <div
            key={index}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              marginBottom: '1rem',
              fontSize: '0.9rem',
              color: '#374151',
              flexDirection: isRTL ? 'row-reverse' : 'row'
            }}
          >
            <div
              style={{
                width: '6px',
                height: '6px',
                background: '#3eb2b1',
                borderRadius: '50%',
                flexShrink: 0
              }}
            />
            <span style={{ textAlign: isRTL ? 'right' : 'left' }}>{benefit}</span>
          </div>
        ))}
      </div>

      {/* Join Button */}
      <button
        onClick={() => onUserTypeSelect('CONTRACTOR')}
        style={{
          width: '100%',
          padding: '1rem',
          background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
          border: 'none',
          borderRadius: '12px',
          color: '#ffffff',
          fontSize: '1rem',
          fontWeight: '600',
          fontFamily: theme.typography.fonts.primary,
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          letterSpacing: '0.025em',
          position: 'relative',
          overflow: 'hidden'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #22d3db 0%, #5cecea 100%)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '-100%',
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255, 255, 255, 0.4) 50%, transparent 100%)',
            animation: 'wave 2s ease-in-out infinite'
          }}
        />
        <span>{t('registration.contractor.joinButton')}</span>
        <span style={{ fontSize: '1.1rem' }}>{isRTL ? '←' : '→'}</span>
      </button>
    </div>
  );

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #f0fdfc 0%, #e6fffd 100%)',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <div
        style={{
          flex: 1,
          padding: 'clamp(2rem, 5vw, 4rem) clamp(1rem, 3vw, 2rem)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
        <h1
          style={{
            fontSize: 'clamp(2.5rem, 5vw, 3.5rem)',
            fontWeight: '700',
            color: '#1a1a1a',
            margin: 0,
            marginBottom: '1rem',
            letterSpacing: '-0.025em',
            lineHeight: 1.2
          }}
        >
          {t('registration.title')}
        </h1>
        <p
          style={{
            fontSize: '1.125rem',
            color: '#6b7280',
            lineHeight: 1.6,
            maxWidth: '600px',
            margin: '0 auto'
          }}
        >
          {t('registration.subtitle')}
        </p>
      </div>

      {/* Cards Container */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(350px, 100%), 1fr))',
          gap: 'clamp(2rem, 4vw, 3rem)',
          width: '100%',
          maxWidth: '900px',
          margin: '0 auto'
        }}
      >
        <UserCard />
        <ContractorCard />
      </div>

      {/* Back Button */}
      <button
        onClick={onBack}
        style={{
          marginTop: '3rem',
          padding: '0.75rem 1.5rem',
          background: 'rgba(255, 255, 255, 0.2)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '12px',
          color: '#374151',
          fontSize: '0.9rem',
          fontWeight: '500',
          fontFamily: theme.typography.fonts.primary,
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
          e.currentTarget.style.transform = 'translateY(0)';
        }}
      >
        <span style={{ fontSize: '1.1rem' }}>{isRTL ? '→' : '←'}</span>
        <span>{t('common.back')}</span>
      </button>
      </div>
    </div>
  );
};

export default RegisterSelection;