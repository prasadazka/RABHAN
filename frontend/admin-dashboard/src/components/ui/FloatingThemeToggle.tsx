import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

export function FloatingThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { t } = useTranslation('common');

  const handleToggle = () => {
    console.log('Floating theme toggle clicked, current theme:', theme);
    toggleTheme();
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.5, duration: 0.3 }}
      className="fixed top-4 right-4 z-50"
    >
      <motion.button
        onClick={handleToggle}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center justify-center w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-xl hover:shadow-2xl transition-all duration-200 backdrop-blur-sm border-2 border-primary hover:border-primary/80 ring-2 ring-primary/20 hover:ring-4 hover:ring-primary/30 shadow-primary/30 hover:shadow-primary/40"
        title={
          theme === 'light' 
            ? (t('common.darkMode') || 'Switch to Dark Mode')
            : (t('common.lightMode') || 'Switch to Light Mode')
        }
        aria-label={
          theme === 'light' 
            ? 'Switch to dark mode'
            : 'Switch to light mode'
        }
      >
        <motion.div
          key={theme}
          initial={{ rotate: -180, opacity: 0 }}
          animate={{ rotate: 0, opacity: 1 }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
        >
          {theme === 'light' ? (
            <Moon className="w-5 h-5" />
          ) : (
            <Sun className="w-5 h-5" />
          )}
        </motion.div>
      </motion.button>
    </motion.div>
  );
}