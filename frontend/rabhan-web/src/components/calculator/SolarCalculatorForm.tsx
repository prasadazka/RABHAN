import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Building2, Zap, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { ClientType, CalculationMode, SolarCalculationInput } from '../../types/solar.types';
import { useTranslation } from 'react-i18next';

interface SolarCalculatorFormProps {
  onCalculate: (input: SolarCalculationInput) => void;
  isCalculating: boolean;
  error: string | null;
  installmentOptions: number[];
}

export const SolarCalculatorForm: React.FC<SolarCalculatorFormProps> = ({
  onCalculate,
  isCalculating,
  error,
  installmentOptions
}) => {
  const { t, ready } = useTranslation();
  
  // Don't render if translations aren't ready
  if (!ready) {
    return (
      <div className="space-y-8 animate-pulse">
        <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-3xl"></div>
        <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-3xl"></div>
        <div className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-3xl"></div>
        <div className="h-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-3xl"></div>
      </div>
    );
  }

  const [formData, setFormData] = useState({
    clientType: ClientType.RESIDENTIAL,
    mode: CalculationMode.MONTHLY_CONSUMPTION,
    monthlyConsumption: '',
    monthlyBill: '',
    numberOfInstallments: installmentOptions[0] || 12
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.mode === CalculationMode.MONTHLY_CONSUMPTION) {
      const consumption = parseFloat(formData.monthlyConsumption);
      if (!formData.monthlyConsumption) {
        newErrors.monthlyConsumption = t('solarCalculator.validation.consumptionRequired');
      } else if (isNaN(consumption) || consumption < 6000) {
        newErrors.monthlyConsumption = t('solarCalculator.validation.consumptionMinimum');
      } else if (consumption > 24000) {
        newErrors.monthlyConsumption = t('solarCalculator.validation.consumptionMaximum');
      }
    } else {
      const bill = parseFloat(formData.monthlyBill);
      const minBill = formData.clientType === ClientType.RESIDENTIAL ? 1080 : 1200;
      
      if (!formData.monthlyBill) {
        newErrors.monthlyBill = t('solarCalculator.validation.billRequired');
      } else if (isNaN(bill) || bill < minBill) {
        newErrors.monthlyBill = t('solarCalculator.validation.billMinimum', { min: minBill });
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    const input: SolarCalculationInput = {
      mode: formData.mode,
      clientType: formData.clientType,
      numberOfInstallments: formData.numberOfInstallments,
      ...(formData.mode === CalculationMode.MONTHLY_CONSUMPTION
        ? { monthlyConsumption: parseFloat(formData.monthlyConsumption) }
        : { monthlyBill: parseFloat(formData.monthlyBill) })
    };

    onCalculate(input);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const cardVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
    },
    hover: { 
      y: -4,
      scale: 1.02,
      transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
    }
  };

  const StepHeader = ({ step, title }: { step: number; title: string }) => (
    <motion.div 
      variants={cardVariants}
      className="flex items-center mb-8"
    >
      <motion.div
        className="relative mr-4"
        whileHover={{ scale: 1.1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div 
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg"
          style={{
            background: 'var(--gradient-primary)',
            boxShadow: '0 8px 32px rgba(62, 178, 177, 0.3)'
          }}
        >
          {step}
        </div>
        <motion.div
          className="absolute inset-0 rounded-2xl"
          animate={{ 
            boxShadow: [
              "0 0 0 0 rgba(62, 178, 177, 0.4)",
              "0 0 0 10px rgba(62, 178, 177, 0)",
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
      <div>
        <h3 className="text-2xl font-bold text-gray-900">{title}</h3>
        <p className="text-gray-600 mt-1">Complete this step to continue</p>
      </div>
    </motion.div>
  );

  const GlassCard = ({ 
    children, 
    selected = false, 
    onClick, 
    className = "" 
  }: { 
    children: React.ReactNode; 
    selected?: boolean; 
    onClick?: () => void;
    className?: string;
  }) => (
    <motion.div
      variants={cardVariants}
      whileHover="hover"
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden cursor-pointer transition-all duration-300 ${className}`}
      style={{
        padding: '2rem',
        borderRadius: '1.5rem',
        background: selected 
          ? 'linear-gradient(135deg, rgba(62, 178, 177, 0.15) 0%, rgba(255, 255, 255, 0.95) 100%)'
          : 'linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(240, 253, 252, 0.9) 100%)',
        backdropFilter: 'blur(25px)',
        WebkitBackdropFilter: 'blur(25px)',
        border: selected 
          ? '2px solid rgba(62, 178, 177, 0.3)'
          : '1px solid rgba(255, 255, 255, 0.3)',
        boxShadow: selected
          ? '0 20px 40px rgba(62, 178, 177, 0.2), 0 8px 32px rgba(0, 0, 0, 0.1)'
          : '0 8px 32px rgba(0, 0, 0, 0.1), 0 4px 16px rgba(0, 0, 0, 0.05)',
        transform: selected ? 'translateY(-2px)' : 'translateY(0px)'
      }}
    >
      {/* Shimmer effect */}
      <div 
        className="absolute inset-0 opacity-20"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(62, 178, 177, 0.1), transparent)',
          animation: 'shimmer 3s infinite',
          borderRadius: '1.5rem'
        }}
      />
      
      {selected && (
        <motion.div
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center"
          style={{
            background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
            boxShadow: '0 4px 12px rgba(62, 178, 177, 0.4)'
          }}
        >
          <CheckCircle className="w-5 h-5 text-white" />
        </motion.div>
      )}
      {children}
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="px-8 py-6 space-y-12"
    >
      <form onSubmit={handleSubmit} className="space-y-12">
        {/* Step 1: Client Type Selection */}
        <div>
          <StepHeader step={1} title="Select Client Type" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {Object.values(ClientType).map((type) => (
              <GlassCard
                key={type}
                selected={formData.clientType === type}
                onClick={() => handleInputChange('clientType', type)}
              >
                <div className="flex items-start space-x-6">
                  <motion.div 
                    className="p-4 rounded-2xl flex-shrink-0"
                    style={{
                      background: formData.clientType === type 
                        ? 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)'
                        : 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(209, 213, 219, 0.2) 100%)',
                      color: formData.clientType === type ? 'white' : '#6b7280',
                      boxShadow: formData.clientType === type 
                        ? '0 8px 25px rgba(62, 178, 177, 0.3)' 
                        : '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                    whileHover={{ 
                      rotate: formData.clientType === type ? 8 : 5,
                      scale: 1.05
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    {type === ClientType.RESIDENTIAL ? 
                      <Home className="w-8 h-8" /> : 
                      <Building2 className="w-8 h-8" />
                    }
                  </motion.div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-3">
                      {type === ClientType.RESIDENTIAL ? 'Residential' : 'Commercial'}
                    </h4>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {type === ClientType.RESIDENTIAL 
                        ? 'Perfect for homes, villas, and residential properties'
                        : 'Ideal for businesses, offices, and commercial buildings'
                      }
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Step 2: Input Method */}
        <div>
          <StepHeader step={2} title="Choose Input Method" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {Object.values(CalculationMode).map((mode) => (
              <GlassCard
                key={mode}
                selected={formData.mode === mode}
                onClick={() => handleInputChange('mode', mode)}
              >
                <div className="flex items-start space-x-6">
                  <motion.div 
                    className="p-4 rounded-2xl flex-shrink-0"
                    style={{
                      background: formData.mode === mode 
                        ? 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)'
                        : 'linear-gradient(135deg, rgba(156, 163, 175, 0.1) 0%, rgba(209, 213, 219, 0.2) 100%)',
                      color: formData.mode === mode ? 'white' : '#6b7280',
                      boxShadow: formData.mode === mode 
                        ? '0 8px 25px rgba(62, 178, 177, 0.3)' 
                        : '0 4px 12px rgba(0, 0, 0, 0.1)'
                    }}
                    whileHover={{ 
                      rotate: formData.mode === mode ? 8 : 5,
                      scale: 1.05
                    }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Zap className="w-8 h-8" />
                  </motion.div>
                  <div className="flex-1">
                    <h4 className="text-xl font-bold text-gray-900 mb-3">
                      {mode === CalculationMode.MONTHLY_CONSUMPTION ? 
                        'Monthly Usage (KWH)' : 
                        'Monthly Bill (SAR)'
                      }
                    </h4>
                    <p className="text-gray-600 leading-relaxed text-sm">
                      {mode === CalculationMode.MONTHLY_CONSUMPTION 
                        ? 'Enter your electricity consumption in kilowatt-hours'
                        : 'Enter your current monthly electricity bill amount'
                      }
                    </p>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Step 3: Enter Value */}
        <div>
          <StepHeader step={3} title="Enter Your Details" />
          <AnimatePresence mode="wait">
            {formData.mode === CalculationMode.MONTHLY_CONSUMPTION ? (
              <motion.div
                key="consumption"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <GlassCard className="text-center">
                  <div className="max-w-lg mx-auto">
                    <div className="mb-8">
                      <label className="block text-xl font-bold text-gray-800 mb-6">
                        Monthly Electricity Consumption
                      </label>
                      <motion.div
                        whileFocus={{ scale: 1.02 }}
                        className="relative"
                      >
                        <input
                          type="number"
                          min="6000"
                          max="24000"
                          step="100"
                          value={formData.monthlyConsumption}
                          onChange={(e) => handleInputChange('monthlyConsumption', e.target.value)}
                          className="w-full text-3xl font-bold text-center border-0 rounded-2xl transition-all duration-300 focus:outline-none"
                          placeholder="8,000"
                          style={{ 
                            padding: '2rem',
                            background: errors.monthlyConsumption 
                              ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(254, 242, 242, 0.9) 100%)'
                              : 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(240, 253, 252, 0.8) 100%)',
                            backdropFilter: 'blur(15px)',
                            WebkitBackdropFilter: 'blur(15px)',
                            border: errors.monthlyConsumption 
                              ? '2px solid rgba(239, 68, 68, 0.3)'
                              : '2px solid rgba(62, 178, 177, 0.2)',
                            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.5)',
                            color: '#1f2937'
                          }}
                        />
                      </motion.div>
                      <p className="text-gray-600 mt-4 font-medium">
                        Enter between 6,000 - 24,000 KWH
                      </p>
                    </div>
                    {errors.monthlyConsumption && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        className="flex items-center justify-center text-red-700 p-4 rounded-xl"
                        style={{
                          background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(254, 242, 242, 0.9) 100%)',
                          border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}
                      >
                        <AlertCircle className="w-5 h-5 mr-3" />
                        <span className="font-medium">{errors.monthlyConsumption}</span>
                      </motion.div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            ) : (
              <motion.div
                key="bill"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.3 }}
              >
                <GlassCard className="text-center">
                  <div className="max-w-md mx-auto">
                    <div className="mb-6">
                      <label className="block text-lg font-semibold text-gray-700 mb-4">
                        Monthly Electricity Bill
                      </label>
                      <motion.div
                        whileFocus={{ scale: 1.02 }}
                        className="relative"
                      >
                        <input
                          type="number"
                          min={formData.clientType === ClientType.RESIDENTIAL ? 1080 : 1200}
                          step="10"
                          value={formData.monthlyBill}
                          onChange={(e) => handleInputChange('monthlyBill', e.target.value)}
                          className={`w-full p-6 text-2xl font-bold text-center border-2 rounded-2xl transition-all duration-300 ${
                            errors.monthlyBill 
                              ? 'border-red-300 bg-red-50' 
                              : 'border-gray-200 focus:border-[var(--color-primary-500)] focus:bg-white'
                          }`}
                          placeholder="2,100"
                          style={{ 
                            background: errors.monthlyBill ? undefined : 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(10px)'
                          }}
                        />
                      </motion.div>
                      <p className="text-sm text-gray-500 mt-2">
                        Minimum {formData.clientType === ClientType.RESIDENTIAL ? '1,080' : '1,200'} SAR
                      </p>
                    </div>
                    {errors.monthlyBill && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-center justify-center text-red-600 bg-red-50 p-3 rounded-xl"
                      >
                        <AlertCircle className="w-5 h-5 mr-2" />
                        {errors.monthlyBill}
                      </motion.div>
                    )}
                  </div>
                </GlassCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Step 4: Payment Period */}
        <div>
          <StepHeader step={4} title="Payment Period" />
          <GlassCard className="max-w-md mx-auto text-center">
            <div>
              <label className="block text-lg font-semibold text-gray-700 mb-6">
                Number of Installments
              </label>
              <motion.div
                whileFocus={{ scale: 1.02 }}
                className="relative"
              >
                <select
                  value={formData.numberOfInstallments}
                  onChange={(e) => handleInputChange('numberOfInstallments', parseInt(e.target.value))}
                  className="w-full p-6 text-xl font-bold text-center border-2 border-gray-200 rounded-2xl focus:border-[var(--color-primary-500)] focus:outline-none transition-all duration-300"
                  style={{ 
                    background: 'rgba(255, 255, 255, 0.8)',
                    backdropFilter: 'blur(10px)'
                  }}
                >
                  {installmentOptions.map(option => (
                    <option key={option} value={option}>
                      {option} months
                    </option>
                  ))}
                </select>
              </motion.div>
            </div>
          </GlassCard>
        </div>

        {/* Error Display */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto"
            >
              <div 
                className="border border-red-200 rounded-2xl p-6 flex items-center space-x-4"
                style={{
                  background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(255, 255, 255, 0.9) 100%)',
                  backdropFilter: 'blur(20px)'
                }}
              >
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <div className="text-center">
          <motion.button
            type="submit"
            disabled={isCalculating}
            className="relative overflow-hidden text-white font-bold text-xl transition-all duration-300"
            style={{
              padding: '1.5rem 3rem',
              borderRadius: '1.5rem',
              background: isCalculating 
                ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                : 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 50%, #5cecea 100%)',
              backgroundSize: '200% 100%',
              boxShadow: isCalculating 
                ? '0 8px 25px rgba(0, 0, 0, 0.1)'
                : '0 20px 40px rgba(62, 178, 177, 0.4), 0 8px 25px rgba(0, 0, 0, 0.1)',
              border: 'none',
              cursor: isCalculating ? 'not-allowed' : 'pointer'
            }}
            whileHover={!isCalculating ? { 
              y: -3,
              scale: 1.02,
              backgroundPosition: '100% 0',
              boxShadow: '0 25px 50px rgba(62, 178, 177, 0.5), 0 10px 30px rgba(0, 0, 0, 0.15)'
            } : {}}
            whileTap={!isCalculating ? { scale: 0.98 } : {}}
            animate={!isCalculating ? {
              backgroundPosition: ['0% 0', '100% 0', '0% 0']
            } : {}}
            transition={{
              backgroundPosition: { duration: 3, repeat: Infinity, ease: "linear" },
              default: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }
            }}
          >
            <AnimatePresence mode="wait">
              {isCalculating ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center space-x-3"
                >
                  <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Calculating...</span>
                </motion.div>
              ) : (
                <motion.div
                  key="calculate"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center justify-center space-x-3"
                >
                  <Calendar className="w-6 h-6" />
                  <span>Calculate Solar Savings</span>
                </motion.div>
              )}
            </AnimatePresence>
            
            {/* Animated background */}
            {!isCalculating && (
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              />
            )}
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};