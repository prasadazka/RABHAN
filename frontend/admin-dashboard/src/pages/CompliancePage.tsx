import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Building2, CheckCircle, AlertTriangle, Clock, FileText, Download } from 'lucide-react';

export function CompliancePage() {
  const complianceMetrics = [
    {
      title: 'ساما - SAMA',
      status: 'compliant',
      score: 98,
      lastAudit: '2024-01-15',
      nextAudit: '2024-07-15',
      description: 'مؤسسة النقد العربي السعودي',
    },
    {
      title: 'KYC Compliance',
      status: 'compliant',
      score: 96,
      lastAudit: '2024-01-20',
      nextAudit: '2024-04-20',
      description: 'التحقق من هوية العملاء',
    },
    {
      title: 'AML - مكافحة غسل الأموال',
      status: 'warning',
      score: 88,
      lastAudit: '2024-01-10',
      nextAudit: '2024-04-10',
      description: 'Anti-Money Laundering',
    },
    {
      title: 'Data Protection',
      status: 'compliant',
      score: 94,
      lastAudit: '2024-01-25',
      nextAudit: '2024-07-25',
      description: 'حماية البيانات الشخصية',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'compliant':
        return (
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="status-success">متوافق</span>
          </div>
        );
      case 'warning':
        return (
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="status-warning">تحذير</span>
          </div>
        );
      case 'non_compliant':
        return (
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="status-error">غير متوافق</span>
          </div>
        );
      default:
        return null;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 95) return 'text-green-600';
    if (score >= 85) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Shield className="w-8 h-8 mr-3 rtl:mr-0 rtl:ml-3 text-saudi-green" />
            الامتثال والمطابقة
          </h1>
          <p className="text-muted-foreground mt-2">
            مراقبة الامتثال للوائح ساما والمعايير الدولية
          </p>
        </div>
        
        <button className="btn-primary flex items-center">
          <Download className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
          تصدير تقرير الامتثال
        </button>
      </motion.div>

      {/* Overall Compliance Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="card saudi-card"
      >
        <div className="card-content">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className="p-4 bg-saudi-green/10 rounded-full">
                <Building2 className="w-8 h-8 text-saudi-green" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-foreground">حالة الامتثال العامة</h2>
                <p className="text-muted-foreground">معتمد من مؤسسة النقد العربي السعودي</p>
              </div>
            </div>
            <div className="text-right rtl:text-left">
              <div className="text-3xl font-bold text-saudi-green">94%</div>
              <div className="text-sm text-muted-foreground">معدل الامتثال</div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800 dark:text-green-200">متوافق</span>
              </div>
              <div className="text-2xl font-bold text-green-600">3</div>
              <div className="text-sm text-green-600">من أصل 4 معايير</div>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
                <span className="font-medium text-yellow-800 dark:text-yellow-200">يتطلب انتباه</span>
              </div>
              <div className="text-2xl font-bold text-yellow-600">1</div>
              <div className="text-sm text-yellow-600">معيار واحد</div>
            </div>
            
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <div className="flex items-center space-x-2 rtl:space-x-reverse mb-2">
                <FileText className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-800 dark:text-blue-200">التقارير</span>
              </div>
              <div className="text-2xl font-bold text-blue-600">12</div>
              <div className="text-sm text-blue-600">تقرير هذا الشهر</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Detailed Compliance Metrics */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="card-header">
          <h3 className="text-xl font-semibold">تفاصيل معايير الامتثال</h3>
        </div>
        <div className="card-content">
          <div className="space-y-6">
            {complianceMetrics.map((metric, index) => (
              <motion.div
                key={metric.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="p-6 border border-border rounded-lg hover:border-primary/20 transition-colors"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-foreground">{metric.title}</h4>
                    <p className="text-sm text-muted-foreground">{metric.description}</p>
                  </div>
                  {getStatusBadge(metric.status)}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">درجة الامتثال</p>
                    <div className="flex items-center space-x-2 rtl:space-x-reverse">
                      <div className="flex-1 bg-muted rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all duration-300 ${
                            metric.score >= 95 ? 'bg-green-500' :
                            metric.score >= 85 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${metric.score}%` }}
                        />
                      </div>
                      <span className={`text-sm font-medium ${getScoreColor(metric.score)}`}>
                        {metric.score}%
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">آخر تدقيق</p>
                    <p className="text-sm font-medium">{metric.lastAudit}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">التدقيق التالي</p>
                    <p className="text-sm font-medium">{metric.nextAudit}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Recent Compliance Activities */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="card"
      >
        <div className="card-header">
          <h3 className="text-xl font-semibold">الأنشطة الأخيرة</h3>
        </div>
        <div className="card-content">
          <div className="space-y-4">
            {[
              {
                type: 'audit',
                title: 'تم إجراء تدقيق دوري لنظام KYC',
                timestamp: '2024-01-20 14:30',
                status: 'success',
              },
              {
                type: 'report',
                title: 'تم تقديم التقرير الشهري لساما',
                timestamp: '2024-01-15 10:00',
                status: 'success',
              },
              {
                type: 'warning',
                title: 'تحذير: يتطلب تحديث إجراءات AML',
                timestamp: '2024-01-10 16:45',
                status: 'warning',
              },
              {
                type: 'update',
                title: 'تم تحديث سياسات حماية البيانات',
                timestamp: '2024-01-05 09:15',
                status: 'info',
              },
            ].map((activity, index) => (
              <div key={index} className="flex items-start space-x-4 rtl:space-x-reverse p-3 rounded-lg hover:bg-muted/20 transition-colors">
                <div className={`p-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-100 dark:bg-green-900/20' :
                  activity.status === 'warning' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
                  'bg-blue-100 dark:bg-blue-900/20'
                }`}>
                  {activity.type === 'audit' && <Shield className="w-4 h-4 text-green-600" />}
                  {activity.type === 'report' && <FileText className="w-4 h-4 text-green-600" />}
                  {activity.type === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-600" />}
                  {activity.type === 'update' && <CheckCircle className="w-4 h-4 text-blue-600" />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{activity.title}</p>
                  <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}