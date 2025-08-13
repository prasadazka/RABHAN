import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Filter, Eye, Edit, Trash2, TrendingUp, Shield, DollarSign, UserCheck, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { analyticsService } from '../services/api/analytics';

// API base URL
const API_BASE_URL = 'http://localhost:3006/api';

export function UsersPage() {
  const { t } = useTranslation('common');
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch users data from API
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        setError(null);

        let response;
        let isFromUserService = false;

        try {
          // Try admin service first
          console.log('Trying admin service at:', `${API_BASE_URL}/users`);
          response = await fetch(`${API_BASE_URL}/users`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            }
          });
          
          if (!response.ok) {
            throw new Error(`Admin service returned ${response.status}: ${response.statusText}`);
          }
        } catch (adminError) {
          console.log('Admin service failed:', adminError.message, '- trying user service directly...');
          
          // Try user service directly
          response = await fetch('http://localhost:3002/api/users/admin/users', {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer admin-mock-token'
            }
          });
          
          if (!response.ok) {
            throw new Error(`User service returned ${response.status}: ${response.statusText}`);
          }
          
          isFromUserService = true;
        }
        
        const data = await response.json();
        console.log('API Response:', { success: data.success, dataLength: data.data?.length, isFromUserService });

        if (data.success && data.data) {
          // Transform user service data to match expected format
          const users = data.data.map((user: any) => ({
            ...user,
            firstName: user.name ? user.name.split(' ')[0] : 'User',
            lastName: user.name ? user.name.split(' ').slice(1).join(' ') : '',
            kycStatus: user.kycStatus || 'not_verified',
            profileCompletionPercentage: user.profileCompletionPercentage || 0
          }));
          
          setUsers(users);
          console.log(`✅ Loaded ${users.length} users from ${isFromUserService ? 'user service' : 'admin service'}`);
        } else {
          throw new Error(data.message || 'API returned success: false');
        }
      } catch (err: any) {
        console.error('Failed to fetch users:', err);
        setError(`Failed to load users data: ${err.message || err.toString()}`);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Fetch analytics data
  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setAnalyticsLoading(true);
        const data = await analyticsService.getUserAnalytics();
        setAnalytics(data);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
        // Continue without analytics
      } finally {
        setAnalyticsLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  // Handle view user profile
  const handleViewUser = (user: any) => {
    console.log('👁️ Viewing user profile:', user.id);
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // Handle update user status
  const handleUpdateStatus = (user: any) => {
    console.log('✏️ Updating user status:', user.id);
    // TODO: Implement status update modal
    alert(`Update status for ${user.name} - Coming soon!`);
  };

  // Filter users based on search term
  const filteredUsers = users.filter(user => 
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.phone?.includes(searchTerm) ||
    user.region?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentUsers = filteredUsers.slice(startIndex, endIndex);

  // Handle pagination changes
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1); // Reset to first page
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when searching
  };

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
            <Users className="w-8 h-8 mr-3 rtl:mr-0 rtl:ml-3 text-primary" />
            {t('users.title')}
          </h1>
          <p className="text-muted-foreground mt-2">
            {t('users.subtitle')}
          </p>
        </div>
      </motion.div>

      {/* User KPI Summary Cards */}
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
                  <Users className="w-6 h-6 text-blue-600" />
                </div>
                <span className="text-sm text-blue-600 font-medium">
                  {analytics.userGrowth.growthRate > 0 ? '+' : ''}{analytics.userGrowth.growthRate.toFixed(1)}%
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('users.totalUsers')}</p>
                <p className="text-2xl font-bold text-foreground">{analytics.totalUsers.toLocaleString()}</p>
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
                  <Shield className="w-6 h-6 text-green-600" />
                </div>
                <span className="text-sm text-green-600 font-medium">
                  {((analytics.verification.verified / analytics.totalUsers) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('users.verifiedUsers')}</p>
                <p className="text-2xl font-bold text-foreground">{analytics.verification.verified.toLocaleString()}</p>
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
                  <DollarSign className="w-6 h-6 text-orange-600" />
                </div>
                <span className="text-sm text-orange-600 font-medium">
                  {((analytics.bnplEligibility.eligible / analytics.totalUsers) * 100).toFixed(1)}%
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('users.bnplEligible')}</p>
                <p className="text-2xl font-bold text-foreground">{analytics.bnplEligibility.eligible.toLocaleString()}</p>
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
                  <UserCheck className="w-6 h-6 text-purple-600" />
                </div>
                <span className="text-sm text-purple-600 font-medium">
                  {analytics.profileCompletion.averageCompletion.toFixed(1)}%
                </span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('users.profileCompletion')}</p>
                <p className="text-2xl font-bold text-foreground">{analytics.profileCompletion.completed.toLocaleString()}</p>
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
                placeholder={t('users.searchUsers')}
                className="input w-full pl-10 rtl:pl-4 rtl:pr-10"
                value={searchTerm}
                onChange={handleSearchChange}
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
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('users.name')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('users.region')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('users.phone')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('users.profileCompletion')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('users.kycStatus')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('users.bnplEligible')}</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">{t('users.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.length > 0 ? currentUsers.map((user, index) => (
                  <tr key={user.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3 rtl:space-x-reverse">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium text-primary-foreground">
                            {user.name?.charAt(0) || (index + 1)}
                          </span>
                        </div>
                        <div>
                          <button
                            onClick={() => navigate(`/users/${user.id}`)}
                            className="group text-left"
                            title="View full profile"
                          >
                            <div className="font-semibold text-primary hover:text-primary/80 transition-colors cursor-pointer text-base group-hover:underline decoration-2 underline-offset-2">
                              {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.name || 'Unknown User'}
                            </div>
                          </button>
                          <span className="text-xs text-muted-foreground block mt-1">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-medium">{user.region || 'Not specified'}</span>
                        {user.city && <span className="block text-xs text-muted-foreground">{user.city}</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-muted-foreground">{user.phone}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="h-2 rounded-full transition-all duration-300"
                            style={{ 
                              width: `${user.profileCompletionPercentage || 0}%`,
                              backgroundColor: '#3eb2b1'
                            }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {user.profileCompletionPercentage || 0}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`${
                        user.kycStatus === 'verified' || user.kycStatus === 'approved' ? 'status-success' : 
                        user.kycStatus === 'rejected' ? 'status-danger' : 
                        (user.profileCompletionPercentage === 100 ? 'status-warning' : 'status-warning')
                      }`}>
                        {user.profileCompletionPercentage === 100 && user.kycStatus === 'not_verified' ? 
                          t('users.pending') : 
                          t(`users.${user.kycStatus || 'not_verified'}`)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        {user.bnplEligible ? (
                          <>
                            <span className="status-success">✓ Eligible</span>
                            {user.bnplMaxAmount && (
                              <span className="text-xs text-muted-foreground">
                                (SAR {user.bnplMaxAmount.toLocaleString()})
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="status-danger">Not Eligible</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        <button 
                          className="p-1 rounded hover:bg-muted transition-colors" 
                          title={t('users.viewProfile')}
                          onClick={() => handleViewUser(user)}
                        >
                          <Eye className="w-4 h-4 text-muted-foreground" />
                        </button>
                        <button 
                          className="p-1 rounded hover:bg-muted transition-colors" 
                          title={t('users.updateStatus')}
                          onClick={() => handleUpdateStatus(user)}
                        >
                          <Edit className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>{searchTerm ? t('users.noUsersMatchSearch') : t('users.noUsersFound')}</p>
                      {error && (
                        <p className="text-destructive text-sm mt-2">
                          Error: {error}
                        </p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {filteredUsers.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-border">
              {/* Items per page selector */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{t('common.itemsPerPage')}</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => handleItemsPerPageChange(Number(e.target.value))}
                  className="input w-20 h-8 text-sm"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>

              {/* Page info */}
              <div className="text-sm text-muted-foreground">
                {t('common.showingResults', {
                  start: startIndex + 1,
                  end: Math.min(endIndex, filteredUsers.length),
                  total: filteredUsers.length
                })}
              </div>

              {/* Pagination buttons */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('common.previous')}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNumber;
                    if (totalPages <= 5) {
                      pageNumber = i + 1;
                    } else if (currentPage <= 3) {
                      pageNumber = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNumber = totalPages - 4 + i;
                    } else {
                      pageNumber = currentPage - 2 + i;
                    }
                    
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => handlePageChange(pageNumber)}
                        className={`w-8 h-8 text-sm rounded ${
                          currentPage === pageNumber
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="btn-secondary p-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('common.next')}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}