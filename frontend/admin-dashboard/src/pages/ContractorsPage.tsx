import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Briefcase, Search, Filter, UserPlus, Eye, Edit, Star, TrendingUp, Shield, Users, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

// API base URL
const API_BASE_URL = 'http://localhost:3006/api';

export function ContractorsPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [contractors, setContractors] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch contractors data from API
  useEffect(() => {
    const fetchContractors = async () => {
      try {
        setLoading(true);
        setError(null);

        let response;
        let isFromContractorService = false;

        try {
          // Try admin service first
          console.log('Trying admin service for contractors...');
          response = await fetch(`${API_BASE_URL}/contractors`);
          
          if (!response.ok) {
            throw new Error(`Admin service returned ${response.status}: ${response.statusText}`);
          }
        } catch (adminError) {
          console.log('Admin service failed:', adminError.message, '- trying contractor service directly...');
          
          // Try contractor service directly
          response = await fetch('http://localhost:3004/api/contractors/admin/contractors', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'x-service': 'admin-service'
            }
          });
          
          if (!response.ok) {
            throw new Error(`Contractor service returned ${response.status}: ${response.statusText}`);
          }
          
          isFromContractorService = true;
        }

        const data = await response.json();
        console.log('Contractors API Response:', { success: data.success, dataLength: data.data?.length, isFromContractorService });

        if (data.success && data.data) {
          setContractors(data.data);
          console.log(`✅ Loaded ${data.data.length} contractors from ${isFromContractorService ? 'contractor service' : 'admin service'}`);
        } else {
          throw new Error(data.message || 'API returned success: false');
        }
      } catch (err: any) {
        console.error('Failed to fetch contractors:', err);
        setError(`Failed to load contractors data: ${err.message || err.toString()}`);
        setContractors([]);
      } finally {
        setLoading(false);
      }
    };

    fetchContractors();
  }, []);

  // Fetch contractor analytics
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        
        try {
          console.log('Trying admin service for contractor analytics...');
          const response = await fetch(`${API_BASE_URL}/dashboard/contractor-analytics`);
          
          if (response.ok) {
            const data = await response.json();
            if (data.success) {
              setAnalytics(data.data);
              console.log('✅ Loaded contractor analytics:', data.data);
              return;
            }
          }
          throw new Error('Admin service analytics unavailable');
        } catch (err) {
          console.log('Admin service analytics failed, continuing without analytics');
          setAnalytics(null);
        }
      } catch (err) {
        console.error('Failed to fetch contractor analytics:', err);
        setAnalytics(null);
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" message={t('common.loading')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Briefcase className="w-8 h-8 mr-3 rtl:mr-0 rtl:ml-3 text-primary" />
            {t('contractors.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('contractors.subtitle')}
          </p>
        </div>
        
        <button className="btn-primary flex items-center">
          <UserPlus className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
          {t('contractors.addContractor')}
        </button>
      </motion.div>

      {/* Contractor KPI Summary Cards */}
      {analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="card"
          >
            <div className="card-content">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                  <Briefcase className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm text-blue-600 font-medium">
                  {analytics.contractorGrowth.growthRate > 0 ? '+' : ''}{analytics.contractorGrowth.growthRate.toFixed(1)}%
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('contractors.totalContractors')}</p>
                <p className="text-2xl font-bold text-foreground">{analytics.totalContractors.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="card"
          >
            <div className="card-content">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/20">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm text-green-600 font-medium">
                  {((analytics.statusDistribution.active / analytics.totalContractors) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('contractors.activeContractors')}</p>
                <p className="text-2xl font-bold text-foreground">{analytics.statusDistribution.active.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="card-content">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                  <Star className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-sm text-orange-600 font-medium">
                  {analytics.performance.averageRating.toFixed(1)}/5.0
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('contractors.highRatedContractors')}</p>
                <p className="text-2xl font-bold text-foreground">{analytics.performance.highRatedContractors.toLocaleString()}</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="card"
          >
            <div className="card-content">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <Shield className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-sm text-purple-600 font-medium">
                  {analytics.verificationLevels.level3 + analytics.verificationLevels.level4 + analytics.verificationLevels.level5} verified
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('contractors.verifiedContractors')}</p>
                <p className="text-2xl font-bold text-foreground">{(analytics.verificationLevels.level3 + analytics.verificationLevels.level4 + analytics.verificationLevels.level5).toLocaleString()}</p>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="card"
      >
        <div className="card-content">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder={t('contractors.searchContractors')}
                className="input w-full pl-10 rtl:pl-4 rtl:pr-10"
              />
            </div>
            <button className="btn-secondary flex items-center">
              <Filter className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              {t('common.filter')}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('contractors.companyName')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('contractors.businessType')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('contractors.city')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('contractors.rating')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('contractors.verificationLevel')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('contractors.profileCompletion')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('contractors.status')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('contractors.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {contractors.length > 0 ? contractors.map((contractor) => (
                  <tr key={contractor.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-primary-foreground" />
                        </div>
                        <div>
                          <button
                            onClick={() => navigate(`/contractors/${contractor.id}`)}
                            className="group text-left"
                          >
                            <div className="font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer text-base group-hover:underline decoration-2 underline-offset-2">
                              {contractor.companyName}
                            </div>
                          </button>
                          <span className="text-xs text-muted-foreground block mt-1">{contractor.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium">{contractor.businessType || 'Not specified'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-medium">{contractor.city}</span>
                        {contractor.region && <span className="block text-xs text-muted-foreground">{contractor.region}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-1 rtl:space-x-reverse">
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                        <span className="text-sm font-medium">{contractor.rating?.toFixed(1) || '0.0'}</span>
                        <span className="text-xs text-muted-foreground">({contractor.totalReviews || 0})</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className="flex items-center space-x-1 rtl:space-x-reverse">
                          <Shield className="w-4 h-4 text-blue-500" />
                          <span className="text-sm font-medium">L{contractor.verificationLevel || 0}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${contractor.profileCompletionPercentage || 0}%`,
                              backgroundColor: '#3eb2b1'
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {contractor.profileCompletionPercentage || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`${
                        contractor.status === 'active' ? 'status-success' : 
                        contractor.status === 'suspended' ? 'status-danger' : 
                        'status-warning'
                      }`}>
                        {t(`contractors.${contractor.status}`)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <button className="p-1 rounded hover:bg-muted transition-colors" title={t('common.view')}>
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button className="p-1 rounded hover:bg-muted transition-colors" title={t('common.edit')}>
                          <Edit className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-muted-foreground">
                      <Briefcase className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{t('contractors.noContractorsFound')}</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}