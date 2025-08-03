import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

interface ContractorDashboardProps {
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
    business_name?: string;
    business_type?: string;
    verification_level?: number;
    status?: string;
  };
}

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalRevenue: number;
  pendingPayments: number;
  averageRating: number;
  totalReviews: number;
  monthlyProjects: number;
}

const ContractorDashboard: React.FC<ContractorDashboardProps> = ({ user }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [stats, setStats] = useState<DashboardStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    totalRevenue: 0,
    pendingPayments: 0,
    averageRating: 0,
    totalReviews: 0,
    monthlyProjects: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API call to fetch contractor dashboard data
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        // TODO: Replace with actual API call to contractor service
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Mock data for demonstration
        setStats({
          totalProjects: 25,
          activeProjects: 3,
          completedProjects: 22,
          totalRevenue: 185000,
          pendingPayments: 15000,
          averageRating: 4.7,
          totalReviews: 18,
          monthlyProjects: 5,
        });
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, [user.id]);

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

  const getVerificationStatus = () => {
    const level = user.verification_level || 0;
    if (level >= 4) return { text: t('contractorApp.verification.verified'), color: '#10b981' };
    if (level >= 2) return { text: t('contractorApp.verification.partial'), color: '#f59e0b' };
    return { text: t('contractorApp.verification.pending'), color: '#ef4444' };
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat(isRTL ? 'ar-SA' : 'en-SA', {
      style: 'currency',
      currency: 'SAR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const verificationStatus = getVerificationStatus();

  const cardStyle = {
    background: 'rgba(255, 255, 255, 0.95)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(62, 178, 177, 0.2)',
    boxShadow: '0 8px 32px rgba(62, 178, 177, 0.1)',
    padding: '1.5rem',
    transition: theme.transitions.normal,
  };

  const statCardStyle = {
    ...cardStyle,
    textAlign: 'center' as const,
    cursor: 'pointer',
  };

  const titleStyle = {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: '0.5rem',
    textAlign: isRTL ? 'right' : 'left' as 'left' | 'right',
  };

  const subtitleStyle = {
    fontSize: '1rem',
    color: '#6b7280',
    marginBottom: '2rem',
    textAlign: isRTL ? 'right' : 'left' as 'left' | 'right',
  };

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        flexDirection: 'column',
        gap: '1rem'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '4px solid rgba(62, 178, 177, 0.2)',
          borderTop: '4px solid #3eb2b1',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#6b7280' }}>{t('contractorApp.dashboard.loading')}</p>
      </div>
    );
  }

  return (
    <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={titleStyle}>
          {t('contractorApp.dashboard.welcome', { name: getDisplayName() })}
        </h1>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          flexWrap: 'wrap'
        }}>
          <p style={subtitleStyle}>
            {t('contractorApp.dashboard.subtitle')}
          </p>
          <div style={{
            padding: '0.25rem 0.75rem',
            backgroundColor: verificationStatus.color + '20',
            color: verificationStatus.color,
            borderRadius: '20px',
            fontSize: '0.875rem',
            fontWeight: '600',
          }}>
            {verificationStatus.text}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(min(280px, 100%), 1fr))',
        gap: '1.5rem',
        marginBottom: '2rem'
      }}>
        {/* Total Projects */}
        <div
          style={statCardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(62, 178, 177, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(62, 178, 177, 0.1)';
          }}
        >
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            boxShadow: '0 8px 24px rgba(62, 178, 177, 0.3)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" stroke="white" strokeWidth="2" fill="none"/>
              <polyline points="14,2 14,8 20,8" stroke="white" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1a1a1a', margin: '0 0 0.5rem 0' }}>
            {stats.totalProjects}
          </h3>
          <p style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '600' }}>
            {t('contractorApp.dashboard.stats.totalProjects')}
          </p>
        </div>

        {/* Active Projects */}
        <div
          style={statCardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(62, 178, 177, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(62, 178, 177, 0.1)';
          }}
        >
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.3)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" stroke="white" strokeWidth="2" fill="none"/>
              <path d="M12 6v6l4 2" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1a1a1a', margin: '0 0 0.5rem 0' }}>
            {stats.activeProjects}
          </h3>
          <p style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '600' }}>
            {t('contractorApp.dashboard.stats.activeProjects')}
          </p>
        </div>

        {/* Total Revenue */}
        <div
          style={statCardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(62, 178, 177, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(62, 178, 177, 0.1)';
          }}
        >
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.3)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <line x1="12" y1="1" x2="12" y2="23" stroke="white" strokeWidth="2"/>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" stroke="white" strokeWidth="2" fill="none"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1a1a1a', margin: '0 0 0.5rem 0' }}>
            {formatCurrency(stats.totalRevenue)}
          </h3>
          <p style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '600' }}>
            {t('contractorApp.dashboard.stats.totalRevenue')}
          </p>
        </div>

        {/* Average Rating */}
        <div
          style={statCardStyle}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 12px 40px rgba(62, 178, 177, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 8px 32px rgba(62, 178, 177, 0.1)';
          }}
        >
          <div style={{
            width: '64px',
            height: '64px',
            background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1rem auto',
            boxShadow: '0 8px 24px rgba(245, 158, 11, 0.3)',
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="white"/>
            </svg>
          </div>
          <h3 style={{ fontSize: '2.5rem', fontWeight: '700', color: '#1a1a1a', margin: '0 0 0.5rem 0' }}>
            {stats.averageRating.toFixed(1)}
          </h3>
          <p style={{ fontSize: '1rem', color: '#6b7280', fontWeight: '600' }}>
            {t('contractorApp.dashboard.stats.averageRating')} ({stats.totalReviews} {t('contractorApp.dashboard.stats.reviews')})
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div style={cardStyle}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#1a1a1a',
          marginBottom: '1.5rem',
          textAlign: isRTL ? 'right' : 'left'
        }}>
          {t('contractorApp.dashboard.quickActions.title')}
        </h2>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem'
        }}>
          <button
            style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(62, 178, 177, 0.1) 0%, rgba(34, 211, 219, 0.1) 100%)',
              border: '1px solid rgba(62, 178, 177, 0.3)',
              borderRadius: '12px',
              color: '#3eb2b1',
              fontWeight: '600',
              cursor: 'pointer',
              transition: theme.transitions.fast,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(62, 178, 177, 0.2) 0%, rgba(34, 211, 219, 0.2) 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(62, 178, 177, 0.1) 0%, rgba(34, 211, 219, 0.1) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {t('contractorApp.dashboard.quickActions.newProject')}
          </button>
          <button
            style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: '12px',
              color: '#10b981',
              fontWeight: '600',
              cursor: 'pointer',
              transition: theme.transitions.fast,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(52, 211, 153, 0.2) 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(52, 211, 153, 0.1) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {t('contractorApp.dashboard.quickActions.manageProducts')}
          </button>
          <button
            style={{
              padding: '1rem',
              background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)',
              border: '1px solid rgba(139, 92, 246, 0.3)',
              borderRadius: '12px',
              color: '#8b5cf6',
              fontWeight: '600',
              cursor: 'pointer',
              transition: theme.transitions.fast,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(167, 139, 250, 0.2) 100%)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            {t('contractorApp.dashboard.quickActions.viewWallet')}
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div style={{ ...cardStyle, marginTop: '1.5rem' }}>
        <h2 style={{
          fontSize: '1.5rem',
          fontWeight: '700',
          color: '#1a1a1a',
          marginBottom: '1.5rem',
          textAlign: isRTL ? 'right' : 'left'
        }}>
          {t('contractorApp.dashboard.recentActivity.title')}
        </h2>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem',
          color: '#6b7280',
          fontSize: '1rem'
        }}>
          {t('contractorApp.dashboard.recentActivity.noActivity')}
        </div>
      </div>
    </div>
  );
};

export default ContractorDashboard;