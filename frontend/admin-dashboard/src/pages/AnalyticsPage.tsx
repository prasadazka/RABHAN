import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, TrendingUp, DollarSign, Users, Calendar, Shield, MapPin, Home, Zap, UserCheck, AlertCircle } from 'lucide-react';
import { analyticsService, UserAnalytics } from '../services/api/analytics';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

export function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const data = await analyticsService.getUserAnalytics();
        setAnalytics(data);
        setError(null);
      } catch (err) {
        console.error('Error fetching analytics:', err);
        setError(err instanceof Error ? err.message : 'فشل في جلب البيانات');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">خطأ في تحميل البيانات</h3>
          <p className="text-muted-foreground">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="btn-primary mt-4"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return null;
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
            <BarChart3 className="w-8 h-8 mr-3 rtl:mr-0 rtl:ml-3 text-primary" />
            التحليلات والتقارير
          </h1>
          <p className="text-muted-foreground mt-2">
            رؤى شاملة حول الأداء والنمو والاتجاهات
          </p>
        </div>
        
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <select className="input w-40">
            <option value="30">آخر 30 يوم</option>
            <option value="90">آخر 3 أشهر</option>
            <option value="365">آخر سنة</option>
          </select>
          <button className="btn-primary flex items-center">
            <Calendar className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
            تصدير التقرير
          </button>
        </div>
      </motion.div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          {
            title: 'إجمالي المستخدمين',
            value: analytics.totalUsers.toLocaleString('ar-SA'),
            change: `${analytics.userGrowth.growthRate > 0 ? '+' : ''}${analytics.userGrowth.growthRate.toFixed(1)}%`,
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100 dark:bg-blue-900/20',
          },
          {
            title: 'المؤهلون للتمويل',
            value: analytics.bnplEligibility.eligible.toLocaleString('ar-SA'),
            change: `${((analytics.bnplEligibility.eligible / analytics.totalUsers) * 100).toFixed(1)}%`,
            icon: DollarSign,
            color: 'text-green-600',
            bgColor: 'bg-green-100 dark:bg-green-900/20',
          },
          {
            title: 'متوسط اكتمال الملف',
            value: `${analytics.profileCompletion.averageCompletion.toFixed(1)}%`,
            change: `${analytics.profileCompletion.completed} مكتمل`,
            icon: UserCheck,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100 dark:bg-purple-900/20',
          },
          {
            title: 'متوسط مبلغ التمويل',
            value: `${(analytics.bnplEligibility.averageAmount / 1000).toFixed(0)}K ريال`,
            change: `${(analytics.bnplEligibility.totalAmount / 1000000).toFixed(1)}M إجمالي`,
            icon: BarChart3,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100 dark:bg-orange-900/20',
          },
        ].map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="card"
          >
            <div className="card-content">
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-lg ${metric.bgColor}`}>
                  <metric.icon className={`w-6 h-6 ${metric.color}`} />
                </div>
                <span className="text-sm text-green-600 font-medium">{metric.change}</span>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">{metric.title}</p>
                <p className="text-2xl font-bold text-foreground">{metric.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Verification Status */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
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
              <p className="text-sm text-muted-foreground mb-1">التحقق المكتمل</p>
              <p className="text-2xl font-bold text-foreground">{analytics.verification.verified.toLocaleString('ar-SA')}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="card"
        >
          <div className="card-content">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                <AlertCircle className="w-6 h-6 text-yellow-600" />
              </div>
              <span className="text-sm text-yellow-600 font-medium">
                {((analytics.verification.pending / analytics.totalUsers) * 100).toFixed(1)}%
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">قيد المراجعة</p>
              <p className="text-2xl font-bold text-foreground">{analytics.verification.pending.toLocaleString('ar-SA')}</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="card"
        >
          <div className="card-content">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/20">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
              <span className="text-sm text-blue-600 font-medium">
                {analytics.authVerification.samaVerified.toLocaleString('ar-SA')}
              </span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">التحقق من ساما</p>
              <p className="text-2xl font-bold text-foreground">
                {((analytics.authVerification.samaVerified / analytics.totalUsers) * 100).toFixed(1)}%
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="card"
        >
          <div className="card-content">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
              <span className="text-sm text-purple-600 font-medium">آخر 7 أيام</span>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">مستخدمون جدد</p>
              <p className="text-2xl font-bold text-foreground">{analytics.userActivity.newUsersLast7Days.toLocaleString('ar-SA')}</p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Geographic and Property Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-semibold flex items-center">
              <MapPin className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
              التوزيع الجغرافي - أهم المناطق
            </h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {analytics.geographical.topRegions.map((region, index) => (
                <div key={region.region} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                      <span className="text-sm font-medium text-primary">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{region.region}</p>
                      <p className="text-sm text-muted-foreground">{region.count} مستخدم</p>
                    </div>
                  </div>
                  <div className="text-right rtl:text-left">
                    <p className="font-medium text-foreground">{region.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.55 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-semibold flex items-center">
              <Home className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
              أنواع العقارات
            </h3>
          </div>
          <div className="card-content">
            <div className="space-y-4">
              {analytics.propertyTypes.map((property, index) => (
                <div key={property.type} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 rtl:space-x-reverse">
                    <div className="w-8 h-8 rounded-full bg-orange-100 dark:bg-orange-900/20 flex items-center justify-center">
                      <Home className="w-4 h-4 text-orange-600" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">{property.type}</p>
                      <p className="text-sm text-muted-foreground">{property.count} عقار</p>
                    </div>
                  </div>
                  <div className="text-right rtl:text-left">
                    <p className="font-medium text-foreground">{property.percentage.toFixed(1)}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Electricity Consumption */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="card"
      >
        <div className="card-header">
          <h3 className="text-lg font-semibold flex items-center">
            <Zap className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
            استهلاك الكهرباء الشهري
          </h3>
        </div>
        <div className="card-content">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {analytics.electricityConsumption.map((consumption, index) => (
              <div key={consumption.range} className="bg-muted/20 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  <span className="text-sm font-medium text-foreground">
                    {consumption.percentage.toFixed(1)}%
                  </span>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    {consumption.range.replace('RANGE_', '').replace('_', '-')} كيلوواط
                  </p>
                  <p className="text-lg font-bold text-foreground">
                    {consumption.count.toLocaleString('ar-SA')} مستخدم
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Performance Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="card"
      >
        <div className="card-header">
          <h3 className="text-lg font-semibold">أداء المقاولين الأفضل</h3>
        </div>
        <div className="card-content">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">المقاول</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">المشاريع</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">الإيرادات</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">التقييم</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">وقت التنفيذ</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'شركة الطاقة المتجددة', projects: 145, revenue: '12.5M', rating: 4.8, executionTime: '18 يوم' },
                  { name: 'مؤسسة الشمس الذهبية', projects: 98, revenue: '8.2M', rating: 4.6, executionTime: '22 يوم' },
                  { name: 'شركة البيئة الخضراء', projects: 112, revenue: '9.8M', rating: 4.7, executionTime: '20 يوم' },
                ].map((contractor, index) => (
                  <tr key={index} className="border-b border-border">
                    <td className="py-3 px-4 font-medium">{contractor.name}</td>
                    <td className="py-3 px-4 text-muted-foreground">{contractor.projects}</td>
                    <td className="py-3 px-4 text-muted-foreground">{contractor.revenue}</td>
                    <td className="py-3 px-4 text-muted-foreground">{contractor.rating}</td>
                    <td className="py-3 px-4 text-muted-foreground">{contractor.executionTime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </motion.div>
    </div>
  );
}