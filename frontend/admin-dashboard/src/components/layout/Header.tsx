import React from 'react';
import { Menu, Bell, User, LogOut, Search, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';

interface HeaderProps {
  onMenuClick: () => void;
  user: any;
}

export function Header({ onMenuClick, user }: HeaderProps) {
  const { logout } = useAuth();
  const { t, i18n } = useTranslation('common');

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    localStorage.setItem('rabhan_admin_language', newLang);
    sessionStorage.setItem('rabhan_admin_language', newLang);
  };

  return (
    <header className="bg-card border-b border-border">
      <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
        {/* Left side - Mobile menu and search */}
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Search bar */}
          <div className="hidden sm:block relative">
            <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-muted-foreground" />
            </div>
            <input
              type="text"
              placeholder={t('common.search')}
              className="w-64 pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Right side - User actions */}
        <div className="flex items-center space-x-4 rtl:space-x-reverse">
          {/* Notifications */}
          <button 
            className="relative p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={t('common.notifications') || 'Notifications'}
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1 right-1 rtl:right-auto rtl:left-1 w-2 h-2 bg-destructive rounded-full"></span>
          </button>

          {/* Language toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center space-x-1 rtl:space-x-reverse p-2 rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            title={i18n.language === 'ar' ? 'Switch to English' : 'التبديل إلى العربية'}
          >
            <Globe className="w-4 h-4" />
            <span className="hidden sm:inline text-xs font-medium">
              {i18n.language === 'ar' ? 'EN' : 'ع'}
            </span>
          </button>


          {/* User menu */}
          <div className="relative flex items-center">
            <div className="flex items-center space-x-3 rtl:space-x-reverse">
              <div className="text-right rtl:text-left">
                <p className="text-sm font-medium text-foreground">
                  {user?.profile?.firstName} {user?.profile?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.role ? t(`roles.${user.role}`) : ''}
                </p>
              </div>
              
              <div className="flex items-center justify-center w-8 h-8 bg-primary rounded-full">
                <User className="w-4 h-4 text-primary-foreground" />
              </div>
            </div>

            {/* Logout button */}
            <button
              onClick={logout}
              className="ml-4 rtl:ml-0 rtl:mr-4 p-2 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              title={t('auth.logout')}
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile search */}
      <div className="sm:hidden px-4 pb-3">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 rtl:left-auto rtl:right-0 pl-3 rtl:pl-0 rtl:pr-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-muted-foreground" />
          </div>
          <input
            type="text"
            placeholder={t('common.search')}
            className="w-full pl-10 rtl:pl-4 rtl:pr-10 pr-4 py-2 border border-input rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>
      </div>
    </header>
  );
}