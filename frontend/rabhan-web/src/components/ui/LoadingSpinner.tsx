import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '' 
}) => {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  };

  const dotVariants = {
    initial: { y: '0%' },
    animate: { y: '100%' },
  };

  const containerVariants = {
    initial: {},
    animate: {
      transition: {
        staggerChildren: 0.1,
        repeat: Infinity,
        repeatType: 'reverse' as const,
        duration: 0.6,
      }
    }
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className={`flex space-x-1 ${sizeClasses[size]}`}
      >
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            variants={dotVariants}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
            className="w-2 h-2 bg-primary-500 rounded-full"
          />
        ))}
      </motion.div>
    </div>
  );
};