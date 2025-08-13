import React from 'react';
import { motion } from 'framer-motion';
import { Settings, User, Shield, Bell, Palette, Globe, Database, Key } from 'lucide-react';

export function SettingsPage() {
  const settingsSections = [
    {
      id: 'profile',
      title: 'الملف الشخصي',
      icon: User,
      description: 'إدارة معلومات الحساب الشخصي',
    },
    {
      id: 'security',
      title: 'الأمان',
      icon: Shield,
      description: 'إعدادات الأمان والمصادقة الثنائية',
    },
    {
      id: 'notifications',
      title: 'الإشعارات',
      icon: Bell,
      description: 'تخصيص إعدادات الإشعارات',
    },
    {
      id: 'appearance',
      title: 'المظهر',
      icon: Palette,
      description: 'تخصيص مظهر وألوان لوحة التحكم',
    },
    {
      id: 'language',
      title: 'اللغة والمنطقة',
      icon: Globe,
      description: 'إعدادات اللغة والمنطقة الزمنية',
    },
    {
      id: 'system',
      title: 'إعدادات النظام',
      icon: Database,
      description: 'إعدادات قاعدة البيانات والنظام',
    },
    {
      id: 'api',
      title: 'مفاتيح API',
      icon: Key,
      description: 'إدارة مفاتيح API والوصول',
    },
  ];

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center"
      >
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center">
            <Settings className="w-8 h-8 mr-3 rtl:mr-0 rtl:ml-3 text-primary" />
            الإعدادات
          </h1>
          <p className="text-muted-foreground mt-2">
            إدارة إعدادات النظام والحساب الشخصي
          </p>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="card"
        >
          <div className="card-header">
            <h3 className="text-lg font-semibold">أقسام الإعدادات</h3>
          </div>
          <div className="card-content">
            <nav className="space-y-2">
              {settingsSections.map((section, index) => (
                <motion.button
                  key={section.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.05 }}
                  className="w-full flex items-center space-x-3 rtl:space-x-reverse p-3 text-right rtl:text-left rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <section.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                      {section.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </motion.button>
              ))}
            </nav>
          </div>
        </motion.div>

        {/* Main Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <User className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
                الملف الشخصي
              </h3>
            </div>
            <div className="card-content space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    الاسم الأول
                  </label>
                  <input
                    type="text"
                    defaultValue="محمد"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">
                    الاسم الأخير
                  </label>
                  <input
                    type="text"
                    defaultValue="أحمد العلي"
                    className="input w-full"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  البريد الإلكتروني
                </label>
                <input
                  type="email"
                  defaultValue="admin@rabhan.sa"
                  className="input w-full"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  رقم الهاتف
                </label>
                <input
                  type="tel"
                  defaultValue="+966501234567"
                  className="input w-full"
                />
              </div>
              
              <button className="btn-primary">
                حفظ التغييرات
              </button>
            </div>
          </motion.div>

          {/* Security Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <Shield className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
                الأمان والحماية
              </h3>
            </div>
            <div className="card-content space-y-4">
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">المصادقة الثنائية</p>
                  <p className="text-sm text-muted-foreground">حماية إضافية لحسابك</p>
                </div>
                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  <span className="status-success">مفعل</span>
                  <button className="btn-secondary text-sm">إعداد</button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-border rounded-lg">
                <div>
                  <p className="font-medium text-foreground">جلسات النشطة</p>
                  <p className="text-sm text-muted-foreground">إدارة الأجهزة المتصلة</p>
                </div>
                <button className="btn-secondary text-sm">عرض الجلسات</button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  تغيير كلمة المرور
                </label>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="كلمة المرور الحالية"
                    className="input w-full"
                  />
                  <input
                    type="password"
                    placeholder="كلمة المرور الجديدة"
                    className="input w-full"
                  />
                  <input
                    type="password"
                    placeholder="تأكيد كلمة المرور الجديدة"
                    className="input w-full"
                  />
                  <button className="btn-primary">تغيير كلمة المرور</button>
                </div>
              </div>
            </div>
          </motion.div>

          {/* System Settings */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="card"
          >
            <div className="card-header">
              <h3 className="text-lg font-semibold flex items-center">
                <Database className="w-5 h-5 mr-2 rtl:mr-0 rtl:ml-2 text-primary" />
                إعدادات النظام
              </h3>
            </div>
            <div className="card-content space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border border-border rounded-lg">
                  <p className="font-medium text-foreground mb-2">حالة قاعدة البيانات</p>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">متصلة</span>
                  </div>
                </div>
                
                <div className="p-4 border border-border rounded-lg">
                  <p className="font-medium text-foreground mb-2">حالة API</p>
                  <div className="flex items-center space-x-2 rtl:space-x-reverse">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-sm text-green-600">عاملة</span>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-muted/30 rounded-lg">
                <p className="font-medium text-foreground mb-2">معلومات النظام</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">الإصدار:</span>
                    <span className="mr-2 rtl:mr-0 rtl:ml-2 font-medium">v1.0.0</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">آخر تحديث:</span>
                    <span className="mr-2 rtl:mr-0 rtl:ml-2 font-medium">2024-01-15</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}