import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Briefcase,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Sun,
  Building2,
  Shield,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency, formatNumber } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// API base URL
const API_BASE_URL = 'http://localhost:3006/api';

export function DashboardPage() {
  const { t, i18n } = useTranslation('common');
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [complianceData, setComplianceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data from API
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch dashboard stats
        const statsResponse = await fetch(`${API_BASE_URL}/dashboard/stats`);
        const statsData = await statsResponse.json();

        // Fetch recent activity
        const activityResponse = await fetch(`${API_BASE_URL}/dashboard/activity`);
        const activityData = await activityResponse.json();

        // Fetch compliance data
        const complianceResponse = await fetch(`${API_BASE_URL}/dashboard/compliance`);
        const complianceDataResponse = await complianceResponse.json();

        if (statsData.success) {
          setDashboardData(statsData.data);
        }

        if (activityData.success) {
          setRecentActivity(activityData.data);
        }

        if (complianceDataResponse.success) {
          setComplianceData(complianceDataResponse.data);
        }

      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
        setError('Failed to load dashboard data');
        // Fallback to mock data
        setDashboardData({
          totalUsers: 15420,
          activeLoans: 3284,
          totalContractors: 892,
          monthlyRevenue: 12500000,
          pendingApprovals: 156,
          completedInstallations: 2890,
          energyGenerated: 45600,
          co2Saved: 22800,
        });
        setRecentActivity([]);
        setComplianceData({
          sama: 'compliant',
          kycApproval: 98.5,
          riskAssessment: 'low',
          auditScore: 95,
        });
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);
  
  const getActivityDescription = (activity: any) => {
    switch (activity.type) {
      case 'loan_approved':
        return t('dashboard.loanApprovedFor', { 
          amount: formatCurrency(activity.amount || 0), 
          user: activity.user 
        });
      case 'contractor_registered':
        return t('dashboard.contractorJoined', { user: activity.user });
      case 'installation_completed':
        return t('dashboard.installationCompleted', { 
          capacity: activity.capacity, 
          user: activity.user 
        });
      default:
        return '';
    }
  };
  
  // Create stats cards dynamically to react to language changes
  const statsCards = React.useMemo(() => {
    if (!dashboardData) return [];
    
    return [
      {
        title: t('dashboard.totalUsers'),
        value: formatNumber(dashboardData.totalUsers),
        icon: Users,
        change: '+12.5%',
        changeType: 'positive' as const,
        color: 'bg-blue-500',
      },
      {
        title: t('dashboard.activeLoans'),
        value: formatNumber(dashboardData.activeLoans),
        icon: CreditCard,
        change: '+8.2%',
        changeType: 'positive' as const,
        color: 'bg-primary',
      },
      {
        title: t('dashboard.totalContractors'),
        value: formatNumber(dashboardData.totalContractors),
        icon: Briefcase,
        change: '+15.1%',
        changeType: 'positive' as const,
        color: 'bg-green-500',
      },
      {
        title: t('dashboard.monthlyRevenue'),
        value: formatCurrency(dashboardData.monthlyRevenue),
        icon: DollarSign,
        change: '+18.9%',
        changeType: 'positive' as const,
        color: 'bg-yellow-500',
      },
    ];
  }, [t, i18n.language, dashboardData]);

  // Create sustainability cards dynamically to react to language changes
  const sustainabilityCards = React.useMemo(() => {
    if (!dashboardData) return [];
    
    return [
      {
        title: t('dashboard.energyGenerated'),
        value: `${formatNumber(dashboardData.energyGenerated)} ${t('units.kwh')}`,
        icon: Zap,
        color: 'bg-orange-500',
      },
      {
        title: t('dashboard.co2Saved'),
        value: `${formatNumber(dashboardData.co2Saved)} ${t('units.kg')}`,
        icon: Sun,
        color: 'bg-green-600',
      },
      {
        title: t('dashboard.completedInstallations'),
        value: formatNumber(dashboardData.completedInstallations),
        icon: CheckCircle,
        color: 'bg-teal-500',
      },
      {
        title: t('dashboard.pendingApprovals'),
        value: formatNumber(dashboardData.pendingApprovals),
        icon: Clock,
        color: 'bg-amber-500',
      },
    ];
  }, [t, i18n.language, dashboardData]);

  // Show loading spinner while fetching data
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" message={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t('dashboard.title')}</h1>
          <p className="text-muted-foreground mt-2">
            {t('dashboard.subtitle')}
          </p>
        </div>
        
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <div className="text-right rtl:text-left">
            <p className="text-sm text-muted-foreground">{t('dashboard.lastUpdate')}</p>
            <p className="text-sm font-medium">{new Date().toLocaleString()}</p>
          </div>
          <div className="compliance-badge">
            <Shield className="w-4 h-4 mr-1 rtl:mr-0 rtl:ml-1" />
            {t('dashboard.samaCompliant')}
          </div>
        </div>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((stat, index) => (
          <motion.div
            key={stat.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="card-content">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  <p className={`text-xs mt-1 ${
                    stat.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change} {t('dashboard.fromLastMonth')}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color}`}>
                  <stat.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Sustainability Impact */}
      <div className="card">
        <div className="card-header">
          <h2 className="text-xl font-semibold flex items-center">
            <Sun className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
            {t('dashboard.environmentalImpact')}
          </h2>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {sustainabilityCards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="p-4 rounded-lg border border-border hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center space-x-3 rtl:space-x-reverse">
                  <div className={`p-2 rounded-lg ${card.color}`}>
                    <card.icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{card.title}</p>
                    <p className="text-lg font-semibold text-foreground">{card.value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card">
          <div className="card-header">
            <h2 className="text-xl font-semibold flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
              {t('dashboard.recentActivity')}
            </h2>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + index * 0.1 }}
                  className="flex items-center space-x-4 rtl:space-x-reverse p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {activity.type === 'loan_approved' && (
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      </div>
                    )}
                    {activity.type === 'contractor_registered' && (
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Briefcase className="w-4 h-4 text-blue-600" />
                      </div>
                    )}
                    {activity.type === 'installation_completed' && (
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <Sun className="w-4 h-4 text-primary" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {getActivityDescription(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {activity.timestamp.toLocaleString()}
                    </p>
                  </div>
                </motion.div>
              )) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{t('dashboard.noRecentActivity')}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Compliance Status */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-xl font-semibold flex items-center">
              <Shield className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-saudi-green" />
              {t('dashboard.complianceStatus')}
            </h2>
          </div>
          <div className="card-content space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <Building2 className="w-4 h-4 text-saudi-green" />
                <span className="text-sm font-medium">{t('compliance.sama')}</span>
              </div>
              <span className="status-success">{t('compliance.compliant')}</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('compliance.kycCompliance')}</span>
                <span className="text-sm text-green-600">
                  {complianceData?.kycApproval || 0}%
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${complianceData?.kycApproval || 0}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <AlertTriangle className="w-4 h-4 text-green-600" />
                <span className="text-sm font-medium">{t('dashboard.riskAssessment')}</span>
              </div>
              <span className="status-success">{t('loans.low')}</span>
            </div>

            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">{t('compliance.complianceScore')}</span>
                <span className="text-sm text-green-600">
                  {complianceData?.auditScore || 0}/100
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${complianceData?.auditScore || 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}