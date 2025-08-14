import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Package,
  CreditCard,
  BarChart3,
  Shield,
  Settings,
  Sun,
  Building2,
  X,
  Zap,
  LogOut,
  FileText,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  onClose?: () => void;
}

const navigation = [
  {
    name: 'navigation.dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
    permission: 'dashboard.view',
  },
  {
    name: 'navigation.users',
    href: '/users',
    icon: Users,
    permission: 'users.view',
  },
  {
    name: 'navigation.contractors',
    href: '/contractors',
    icon: Briefcase,
    permission: 'contractors.view',
  },
  {
    name: 'navigation.quotes',
    href: '/quotes',
    icon: FileText,
    permission: 'quotes.view',
  },
  {
    name: 'navigation.products',
    href: '/products',
    icon: Package,
    permission: 'products.view',
  },
  {
    name: 'navigation.loans',
    href: '/loans',
    icon: CreditCard,
    permission: 'loans.view',
  },
  {
    name: 'navigation.analytics',
    href: '/analytics',
    icon: BarChart3,
    permission: 'analytics.view',
  },
  {
    name: 'navigation.compliance',
    href: '/compliance',
    icon: Shield,
    permission: 'compliance.view',
  },
  {
    name: 'navigation.settings',
    href: '/settings',
    icon: Settings,
    permission: 'settings.view',
  },
];

export function Sidebar({ onClose }: SidebarProps) {
  const location = useLocation();
  const { hasPermission, logout } = useAuth();
  const { t, i18n } = useTranslation('common');

  // Filter navigation items based on user permissions
  const filteredNavigation = navigation.filter(item => 
    hasPermission(item.permission)
  );

  return (
    <div className="flex flex-col h-full bg-card border-r border-border">
      {/* Header */}
      <div className="flex items-center justify-between h-20 px-6 border-b border-border">
        <div className="flex items-center justify-center w-full">
          <div className="flex items-center justify-center">
            <img 
              src={i18n.language === 'ar' ? "/assets/logo_arabic.jpeg" : "/rabhan_logo.svg"}
              alt={i18n.language === 'ar' ? "RABHAN Arabic Logo" : "RABHAN Logo"}
              className="w-16 h-16 object-contain"
              onError={(e) => {
                // Fallback to Sun icon if logo fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="hidden items-center justify-center w-12 h-12 bg-primary rounded-lg">
              <Sun className="w-8 h-8 text-primary-foreground" />
            </div>
          </div>
        </div>
        
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-md hover:bg-accent transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const Icon = item.icon;

          return (
            <NavLink
              key={item.href}
              to={item.href}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group relative flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform',
                  isActive
                    ? 'bg-gradient-to-r from-[#3eb2b1] to-[#3eb2b1]/90 text-white shadow-lg shadow-[#3eb2b1]/25 scale-105'
                    : 'text-[#3eb2b1]/70 hover:text-[#3eb2b1] hover:bg-[#3eb2b1]/10 hover:shadow-md hover:shadow-[#3eb2b1]/20 hover:scale-[1.02] hover:translate-x-1 rtl:hover:-translate-x-1'
                )
              }
            >
              {({ isActive: navIsActive }) => (
                <>
                  <Icon
                    className={cn(
                      'ml-3 rtl:ml-0 rtl:mr-3 h-5 w-5 transition-all duration-300',
                      navIsActive 
                        ? 'text-white drop-shadow-sm' 
                        : 'text-[#3eb2b1]/70 group-hover:text-[#3eb2b1] group-hover:scale-110 group-hover:drop-shadow-sm'
                    )}
                  />
                  <span className={cn(
                    "truncate transition-all duration-300",
                    navIsActive 
                      ? "font-semibold text-white drop-shadow-sm" 
                      : "group-hover:font-medium group-hover:text-[#3eb2b1]"
                  )}>
                    {t(item.name)}
                  </span>
                  
                  {navIsActive && (
                    <motion.div
                      layoutId="sidebar-indicator"
                      className="absolute left-0 rtl:left-auto rtl:right-0 w-2 h-8 bg-white/50 rounded-r-full rtl:rounded-r-none rtl:rounded-l-full"
                      initial={false}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    />
                  )}
                  
                  {/* Hover effect indicator */}
                  <div className={cn(
                    "absolute inset-0 rounded-xl border-2 transition-all duration-300 pointer-events-none",
                    navIsActive 
                      ? "border-white/30" 
                      : "border-transparent group-hover:border-[#3eb2b1]/30"
                  )} />
                  
                  {/* Background glow effect */}
                  <div className={cn(
                    "absolute inset-0 rounded-xl transition-all duration-500 pointer-events-none",
                    navIsActive 
                      ? "bg-gradient-to-r from-white/10 to-transparent opacity-50" 
                      : "bg-[#3eb2b1]/0 group-hover:bg-[#3eb2b1]/5 opacity-0 group-hover:opacity-100"
                  )} />
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            onClose && onClose();
          }}
          className="w-full mb-4 flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 transform text-destructive hover:text-destructive hover:bg-destructive/10 hover:shadow-md hover:shadow-destructive/20 hover:scale-[1.02] group"
        >
          <LogOut className="ml-3 rtl:ml-0 rtl:mr-3 h-5 w-5 transition-all duration-300 group-hover:scale-110" />
          <span className="truncate transition-all duration-300 group-hover:font-medium">
            {t('auth.logout')}
          </span>
        </button>

        <div className="flex items-center space-x-3 rtl:space-x-reverse p-3 rounded-lg bg-saudi-green/5 border border-saudi-green/20">
          <div className="flex items-center justify-center w-8 h-8 bg-saudi-green/10 rounded-full">
            <Building2 className="w-4 h-4 text-saudi-green" />
          </div>
          <div>
            <p className="text-xs font-medium text-saudi-green">{t('common.samaApproved')}</p>
            <p className="text-xs text-muted-foreground">{t('common.samaCompliant')}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center space-x-3 rtl:space-x-reverse p-3 rounded-lg bg-primary/5 border border-primary/20">
          <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
            <Zap className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-medium text-primary">{t('common.solarEnergy')}</p>
            <p className="text-xs text-muted-foreground">{t('common.renewableEnergy')}</p>
          </div>
        </div>
      </div>
    </div>
  );
}