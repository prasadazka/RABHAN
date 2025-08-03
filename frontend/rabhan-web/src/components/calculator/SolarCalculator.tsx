import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calculator, Zap, Home, Building2, ArrowRight, Lightbulb, TrendingUp, Banknote } from 'lucide-react';
import { ClientType, CalculationMode, SolarCalculationInput, SolarCalculationResult } from '../../types/solar.types';
import { solarService } from '../../services/solar.service';
import { SolarCalculatorForm } from './SolarCalculatorForm';
import { SolarResults } from './SolarResults';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useTranslation } from 'react-i18next';

interface SolarCalculatorProps {
  className?: string;
  onClose?: () => void;
}

export const SolarCalculator: React.FC<SolarCalculatorProps> = ({ className = '', onClose }) => {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<'form' | 'results'>('form');
  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<SolarCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [installmentOptions, setInstallmentOptions] = useState<number[]>([12, 18, 24, 30]);

  // Note: Using updated values [12, 18, 24, 30] as per specification requirements
  // Backend API call removed to ensure correct payment periods are shown
  useEffect(() => {
    // No API call needed - using hardcoded installmentOptions: [12, 18, 24, 30]
  }, []);

  const handleCalculate = async (input: SolarCalculationInput) => {
    setIsCalculating(true);
    setError(null);

    try {
      const response = await solarService.calculateSolar(input);
      setCalculationResult(response.data);
      setCurrentStep('results');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Calculation failed');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleRecalculate = () => {
    setCurrentStep('form');
    setCalculationResult(null);
    setError(null);
  };

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 }
  };

  const iconVariants = {
    initial: { scale: 0.8, rotate: -10 },
    animate: { scale: 1, rotate: 0 },
    hover: { scale: 1.1, rotate: 5 }
  };

  return (
    <motion.div 
      className={`relative overflow-hidden ${className}`}
      style={{
        background: 'var(--gradient-glass)',
        backdropFilter: 'blur(20px)',
        borderRadius: '2rem',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        boxShadow: 'var(--shadow-glass)'
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Premium Header */}
      <motion.div 
        className="relative p-8 text-center overflow-hidden"
        style={{
          background: 'var(--gradient-primary)',
          borderTopLeftRadius: '2rem',
          borderTopRightRadius: '2rem'
        }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {/* Animated Background Elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute -top-10 -right-10 w-32 h-32 rounded-full"
            style={{ background: 'rgba(255, 255, 255, 0.1)' }}
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 180, 360]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full"
            style={{ background: 'rgba(255, 255, 255, 0.08)' }}
            animate={{ 
              scale: [1, 0.8, 1],
              y: [0, -20, 0]
            }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <div className="relative z-10">
          <motion.div
            variants={iconVariants}
            initial="initial"
            animate="animate"
            whileHover="hover"
            className="inline-flex p-4 mb-4 rounded-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <Calculator className="w-10 h-10 text-white" />
          </motion.div>
          
          <motion.h1 
            className="text-4xl font-bold text-white mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            Solar Calculator
          </motion.h1>
          
          <motion.p 
            className="text-white/90 text-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            Calculate your solar savings instantly
          </motion.p>

          {onClose && (
            <motion.button
              onClick={onClose}
              className="absolute top-6 right-6 p-2 rounded-full text-white hover:bg-white/20 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              aria-label="Close calculator"
            >
              <div className="w-6 h-6 relative">
                <div className="absolute inset-0 w-full h-0.5 bg-white rotate-45 top-1/2" />
                <div className="absolute inset-0 w-full h-0.5 bg-white -rotate-45 top-1/2" />
              </div>
            </motion.button>
          )}
        </div>

        {/* Floating Animation Elements */}
        <div className="absolute top-8 right-24 opacity-30">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <Zap className="w-6 h-6 text-white" />
          </motion.div>
        </div>
        <div className="absolute bottom-8 right-32 opacity-20">
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            <Lightbulb className="w-8 h-8 text-white" />
          </motion.div>
        </div>
      </motion.div>

      {/* Content Container */}
      <div className="relative p-0">
        <AnimatePresence mode="wait">
          {currentStep === 'form' && (
            <motion.div
              key="form"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <SolarCalculatorForm
                onCalculate={handleCalculate}
                isCalculating={isCalculating}
                error={error}
                installmentOptions={installmentOptions}
              />
            </motion.div>
          )}

          {currentStep === 'results' && calculationResult && (
            <motion.div
              key="results"
              variants={containerVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            >
              <SolarResults
                result={calculationResult}
                onRecalculate={handleRecalculate}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading Overlay */}
        {isCalculating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center z-50"
            style={{
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div className="text-center p-8">
              <LoadingSpinner size="lg" className="mb-6" />
              <motion.h3 
                className="text-xl font-bold text-gray-800 mb-2"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Calculating Your Solar Savings...
              </motion.h3>
              <p className="text-gray-600">This will just take a moment</p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Premium Benefits Footer */}
      <motion.div 
        className="relative p-6 border-t"
        style={{
          background: 'linear-gradient(135deg, rgba(240, 253, 252, 0.8) 0%, rgba(255, 255, 255, 0.6) 100%)',
          borderTop: '1px solid rgba(62, 178, 177, 0.1)',
          borderBottomLeftRadius: '2rem',
          borderBottomRightRadius: '2rem'
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: TrendingUp, text: "Reduce Your Bills", color: "#10b981" },
            { icon: Zap, text: "Clean Energy", color: "#3eb2b1" },
            { icon: Banknote, text: "BNPL Financing", color: "#3b82f6" }
          ].map((benefit, index) => (
            <motion.div
              key={index}
              className="flex items-center justify-center space-x-3 p-3 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.5)',
                backdropFilter: 'blur(10px)'
              }}
              whileHover={{ 
                scale: 1.05,
                background: 'rgba(255, 255, 255, 0.8)'
              }}
              transition={{ duration: 0.2 }}
            >
              <benefit.icon 
                className="w-5 h-5" 
                style={{ color: benefit.color }}
              />
              <span className="text-sm font-semibold text-gray-700">
                {benefit.text}
              </span>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};