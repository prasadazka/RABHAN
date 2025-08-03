import React from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

interface ContractorProjectsProps {
  user: {
    id: string;
    email: string;
    business_name?: string;
  };
}

const ContractorProjects: React.FC<ContractorProjectsProps> = ({ user }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(62, 178, 177, 0.2)',
    boxShadow: '0 8px 32px rgba(62, 178, 177, 0.1)',
    padding: '2rem',
    marginBottom: '1.5rem',
  };

  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      <h1 style={{
        fontSize: '2rem',
        fontWeight: '700',
        color: '#1a1a1a',
        marginBottom: '2rem',
        textAlign: isRTL ? 'right' : 'left'
      }}>
        {t('contractorApp.projects.title')}
      </h1>

      <div style={cardStyle}>
        <div style={{
          textAlign: 'center',
          padding: '4rem 2rem',
          color: '#6b7280'
        }}>
          <h2 style={{
            fontSize: '1.5rem',
            fontWeight: '600',
            color: '#1a1a1a',
            marginBottom: '1rem'
          }}>
            {t('contractorApp.projects.management')}
          </h2>
          <p>{t('contractorApp.projects.comingSoon')}</p>
        </div>
      </div>
    </div>
  );
};

export default ContractorProjects;