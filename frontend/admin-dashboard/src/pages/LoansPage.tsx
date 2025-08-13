import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Search, Filter, Eye, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

export function LoansPage() {
  const loans = [
    {
      id: 'L001',
      customer: 'أحمد محمد العلي',
      amount: 85000,
      status: 'approved',
      installments: 36,
      remaining: 72000,
      nextPayment: '2024-02-15',
      riskLevel: 'low',
    },
    {
      id: 'L002',
      customer: 'فاطمة حسن الزهراني',
      amount: 125000,
      status: 'pending',
      installments: 48,
      remaining: 125000,
      nextPayment: null,
      riskLevel: 'medium',
    },
    {
      id: 'L003',
      customer: 'سعد عبدالله النعيمي',
      amount: 95000,
      status: 'active',
      installments: 42,
      remaining: 58000,
      nextPayment: '2024-02-20',
      riskLevel: 'low',
    },
    {
      id: 'L004',
      customer: 'نورا خالد الغامدي',
      amount: 78000,
      status: 'overdue',
      installments: 36,
      remaining: 45000,
      nextPayment: '2024-01-15',
      riskLevel: 'high',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <span className="status-success">معتمد</span>;
      case 'pending':
        return <span className="status-warning">قيد المراجعة</span>;
      case 'active':
        return <span className="status-info">نشط</span>;
      case 'overdue':
        return <span className="status-error">متأخر</span>;
      default:
        return <span className="status-indicator">{status}</span>;
    }
  };

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'low':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'medium':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
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
            <CreditCard className="w-8 h-8 mr-3 rtl:mr-0 rtl:ml-3 text-primary" />
            إدارة القروض
          </h1>
          <p className="text-muted-foreground mt-2">
            مراقبة القروض الشمسية والمدفوعات والامتثال
          </p>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { title: 'إجمالي القروض', value: '3,284', color: 'bg-blue-500' },
          { title: 'القروض النشطة', value: '2,156', color: 'bg-green-500' },
          { title: 'قيد المراجعة', value: '456', color: 'bg-yellow-500' },
          { title: 'متأخرة', value: '89', color: 'bg-red-500' },
        ].map((stat, index) => (
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
                  <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                </div>
                <div className={`w-3 h-16 rounded-full ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="card"
      >
        <div className="card-content">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="البحث عن القروض..."
                className="input w-full pl-10 rtl:pl-4 rtl:pr-10"
              />
            </div>
            <button className="btn-secondary flex items-center">
              <Filter className="w-4 h-4 mr-2 rtl:mr-0 rtl:ml-2" />
              تصفية
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">رقم القرض</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">العميل</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">المبلغ</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">المتبقي</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">الأقساط</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">الحالة</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">المخاطر</th>
                  <th className="text-right rtl:text-left py-3 px-4 font-medium text-muted-foreground">الإجراءات</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => (
                  <tr key={loan.id} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="py-3 px-4 font-mono text-sm">{loan.id}</td>
                    <td className="py-3 px-4 font-medium">{loan.customer}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatCurrency(loan.amount)}</td>
                    <td className="py-3 px-4 text-muted-foreground">{formatCurrency(loan.remaining)}</td>
                    <td className="py-3 px-4 text-muted-foreground">{loan.installments} شهر</td>
                    <td className="py-3 px-4">{getStatusBadge(loan.status)}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2 rtl:space-x-reverse">
                        {getRiskIcon(loan.riskLevel)}
                        <span className="text-sm capitalize">{loan.riskLevel}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <button className="p-1 rounded hover:bg-muted transition-colors" title="عرض التفاصيل">
                        <Eye className="w-4 h-4 text-muted-foreground" />
                      </button>
                    </td>
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