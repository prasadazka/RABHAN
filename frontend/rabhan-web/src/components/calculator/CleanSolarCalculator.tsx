import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Calculator, Home, Building2, Zap, DollarSign, Calendar, TrendingUp, Banknote, CheckCircle, AlertCircle, Sun, BarChart3, PieChart, Lightbulb, Battery, Coins, Target, Award, Timer } from 'lucide-react';
import { ClientType, CalculationMode, SolarCalculationInput, SolarCalculationResult } from '../../types/solar.types';
import { solarService } from '../../services/solar.service';
import { config } from '../../config/environment';
import { authService } from '../../services/auth.service';

interface CleanSolarCalculatorProps {
  variant?: 'full' | 'compact' | 'dashboard';
  showMarketing?: boolean;
  onCalculationComplete?: (result: SolarCalculationResult) => void;
  className?: string;
}

export const CleanSolarCalculator: React.FC<CleanSolarCalculatorProps> = ({
  variant = 'full',
  showMarketing = true,
  onCalculationComplete,
  className = ''
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  // State management for solar calculator
  const [clientType, setClientType] = useState<ClientType>(ClientType.RESIDENTIAL);
  const [mode, setMode] = useState<CalculationMode>(CalculationMode.MONTHLY_CONSUMPTION);
  const [monthlyConsumption, setMonthlyConsumption] = useState(config.solarCalculator.defaultConsumption.toString());
  const [monthlyBill, setMonthlyBill] = useState('');
  const [installments, setInstallments] = useState(config.solarCalculator.defaultInstallments);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<SolarCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{[key: string]: string}>({});

  // Auto-calculate on component mount with default values
  useEffect(() => {
    if (monthlyConsumption) {
      handleCalculate();
    }
  }, []);

  // Validation function
  const validateForm = (): boolean => {
    const errors: {[key: string]: string} = {};
    
    if (mode === CalculationMode.MONTHLY_CONSUMPTION) {
      const consumption = parseFloat(monthlyConsumption);
      if (!monthlyConsumption || monthlyConsumption.trim() === '') {
        errors.monthlyConsumption = t('solarCalculator.validation.consumptionRequired');
      } else if (isNaN(consumption)) {
        errors.monthlyConsumption = t('solarCalculator.validation.consumptionMustBeNumber');
      } else if (consumption < config.solarCalculator.minConsumption) {
        errors.monthlyConsumption = t('solarCalculator.validation.consumptionMinimum');
      } else if (consumption > config.solarCalculator.maxConsumption) {
        errors.monthlyConsumption = t('solarCalculator.validation.consumptionMaximum');
      }
    } else {
      const bill = parseFloat(monthlyBill);
      const minBill = clientType === ClientType.RESIDENTIAL 
        ? config.solarCalculator.minBillResidential 
        : config.solarCalculator.minBillCommercial;
      if (!monthlyBill || monthlyBill.trim() === '') {
        errors.monthlyBill = t('solarCalculator.validation.billRequired');
      } else if (isNaN(bill)) {
        errors.monthlyBill = t('solarCalculator.validation.billMustBeNumber');
      } else if (bill < minBill) {
        errors.monthlyBill = t('solarCalculator.validation.billMinimum', { min: minBill });
      } else if (bill > config.solarCalculator.maxBill) {
        errors.monthlyBill = t('solarCalculator.validation.billMaximum');
      }
    }

    if (!installments || installments < config.solarCalculator.minInstallments || installments > config.solarCalculator.maxInstallments) {
      errors.installments = t('solarCalculator.validation.installmentPeriod');
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCalculate = async () => {
    setError(null);
    
    // Validate form before submitting
    if (!validateForm()) {
      return;
    }

    setIsCalculating(true);

    try {
      const input: SolarCalculationInput = {
        mode,
        clientType,
        numberOfInstallments: installments,
        ...(mode === CalculationMode.MONTHLY_CONSUMPTION
          ? { monthlyConsumption: parseFloat(monthlyConsumption) }
          : { monthlyBill: parseFloat(monthlyBill) })
      };

      const response = await solarService.calculateSolar(input);
      setResult(response.data);
      setValidationErrors({}); // Clear validation errors on success
      
      // Call callback if provided
      if (onCalculationComplete) {
        onCalculationComplete(response.data);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Calculation failed');
    } finally {
      setIsCalculating(false);
    }
  };

  // Clear validation errors when switching modes
  const handleModeChange = (newMode: CalculationMode) => {
    setMode(newMode);
    setValidationErrors({});
  };

  // Clear validation error when user starts typing
  const handleConsumptionChange = (value: string) => {
    setMonthlyConsumption(value);
    if (validationErrors.monthlyConsumption) {
      setValidationErrors(prev => ({ ...prev, monthlyConsumption: '' }));
    }
  };

  const handleBillChange = (value: string) => {
    setMonthlyBill(value);
    if (validationErrors.monthlyBill) {
      setValidationErrors(prev => ({ ...prev, monthlyBill: '' }));
    }
  };

  // Check if form has validation errors or missing required fields
  const hasValidationErrors = (): boolean => {
    if (Object.values(validationErrors).some(error => error !== '')) {
      return true;
    }
    
    // Check for empty required fields
    if (mode === CalculationMode.MONTHLY_CONSUMPTION) {
      return !monthlyConsumption || monthlyConsumption.trim() === '';
    } else {
      return !monthlyBill || monthlyBill.trim() === '';
    }
  };

  const handleGetQuote = () => {
    if (!result) return;
    
    // Check if user is authenticated
    const authState = authService.getState();
    
    if (authState.isAuthenticated && authState.user) {
      // User is logged in, redirect to quote form with KWP pre-filled
      const quoteData = {
        system_size_kwp: result.solarPowerKWP
      };
      
      // Store the calculator result in localStorage for auto-fill
      localStorage.setItem('solar_calculator_result', JSON.stringify(quoteData));
      
      // Navigate to quotes page with form parameter
      navigate('/dashboard/quotes?form=true');
    } else {
      // User not logged in, store return URL and KWP data
      const returnData = {
        returnUrl: '/dashboard/quotes?form=true',
        system_size_kwp: result.solarPowerKWP,
        from: 'solar-calculator'
      };
      
      // Store return data in localStorage
      localStorage.setItem('quote_request_data', JSON.stringify(returnData));
      
      // Redirect to login (current page handles login popup)
      window.location.href = '/?login=true';
    }
  };

  const getContainerClass = () => {
    const baseClass = "solar-calculator-container";
    const variantClass = variant === 'compact' ? 'compact' : variant === 'dashboard' ? 'dashboard' : 'full';
    return `${baseClass} ${variantClass} ${className}`.trim();
  };

  const getCardClass = () => {
    const baseClass = "solar-main-card";
    const variantClass = variant === 'compact' ? 'compact' : variant === 'dashboard' ? 'dashboard' : 'full';
    return `${baseClass} ${variantClass}`;
  };

  return (
    <div className={getContainerClass()}>
      {/* Main Card Container */}
      <div className={getCardClass()}>
        {/* Left Side - Form */}
        <div className="solar-form-side">
        {/* Client Type */}
        <div className="form-section">
          <h3>1. {t('solarCalculator.selectClientType')}</h3>
          <div className="button-group">
            <button
              className={`form-button ${clientType === ClientType.RESIDENTIAL ? 'active' : ''}`}
              onClick={() => setClientType(ClientType.RESIDENTIAL)}
            >
              <Home className="w-4 h-4" />
              {t('solarCalculator.residential')}
            </button>
            <button
              className={`form-button ${clientType === ClientType.COMMERCIAL ? 'active' : ''}`}
              onClick={() => setClientType(ClientType.COMMERCIAL)}
            >
              <Building2 className="w-4 h-4" />
              {t('solarCalculator.commercial')}
            </button>
          </div>
        </div>

        {/* Input Method */}
        <div className="form-section">
          <h3>2. {t('solarCalculator.inputMethod')}</h3>
          <div className="button-group">
            <button
              className={`form-button ${mode === CalculationMode.MONTHLY_CONSUMPTION ? 'active' : ''}`}
              onClick={() => handleModeChange(CalculationMode.MONTHLY_CONSUMPTION)}
            >
              <Zap className="w-4 h-4" />
              {t('solarCalculator.monthlyUsage')}
            </button>
            <button
              className={`form-button ${mode === CalculationMode.MONTHLY_BILL ? 'active' : ''}`}
              onClick={() => handleModeChange(CalculationMode.MONTHLY_BILL)}
            >
              <DollarSign className="w-4 h-4" />
              {t('solarCalculator.monthlyBill')}
            </button>
          </div>
        </div>

        {/* Value Input */}
        <div className="form-section">
          <h3>3. {t('solarCalculator.enterValue')}</h3>
          <input
            className={`form-input ${validationErrors.monthlyConsumption || validationErrors.monthlyBill ? 'error' : ''}`}
            type="number"
            value={mode === CalculationMode.MONTHLY_CONSUMPTION ? monthlyConsumption : monthlyBill}
            onChange={(e) =>
              mode === CalculationMode.MONTHLY_CONSUMPTION
                ? handleConsumptionChange(e.target.value)
                : handleBillChange(e.target.value)
            }
            placeholder={mode === CalculationMode.MONTHLY_CONSUMPTION ? config.solarCalculator.consumptionPlaceholder.toLocaleString() : config.solarCalculator.billPlaceholder.toLocaleString()}
            min={mode === CalculationMode.MONTHLY_CONSUMPTION ? config.solarCalculator.minConsumption.toString() : (clientType === ClientType.RESIDENTIAL ? config.solarCalculator.minBillResidential.toString() : config.solarCalculator.minBillCommercial.toString())}
            max={mode === CalculationMode.MONTHLY_CONSUMPTION ? config.solarCalculator.maxConsumption.toString() : config.solarCalculator.maxBill.toString()}
          />
          {(validationErrors.monthlyConsumption || validationErrors.monthlyBill) && (
            <p className="form-error">
              <AlertCircle className="w-3 h-3" />
              {validationErrors.monthlyConsumption || validationErrors.monthlyBill}
            </p>
          )}
          <p className="form-hint">
            {mode === CalculationMode.MONTHLY_CONSUMPTION
              ? t('solarCalculator.consumptionHint')
              : t('solarCalculator.billHint', { min: (clientType === ClientType.RESIDENTIAL ? config.solarCalculator.minBillResidential : config.solarCalculator.minBillCommercial).toLocaleString() })}
          </p>
        </div>

        {/* Payment Period */}
        <div className="form-section">
          <h3>4. {t('solarCalculator.paymentPeriod')}</h3>
          <select
            className="form-select"
            value={installments}
            onChange={(e) => setInstallments(Number(e.target.value))}
          >
            {config.solarCalculator.installmentOptions.map((months) => (
              <option key={months} value={months}>
                {months} {t('solarCalculator.months')}
              </option>
            ))}
          </select>
        </div>

        {/* Calculate Button */}
        <button
          className={`calculate-btn ${isCalculating || hasValidationErrors() ? 'disabled' : ''}`}
          onClick={handleCalculate}
          disabled={isCalculating || hasValidationErrors()}
        >
          {isCalculating ? (
            <>
              <div className="spinner"></div>
              <span>{t('solarCalculator.calculating')}</span>
            </>
          ) : (
            <>
              <Calculator className="w-5 h-5" />
              <span>{t('solarCalculator.calculateSolarSavings')}</span>
            </>
          )}
        </button>
        </div>
        
        {/* Right Side - Results */}
        <div className="solar-results-side">
        {result ? (
          <div className="results-container">
            {/* Premium Marketing Banner - Conditional */}
            {showMarketing && config.solarCalculator.enableMarketingBanner && (
            <div className="solar-marketing-banner" style={{
              position: 'relative',
              marginBottom: '32px',
              background: 'linear-gradient(145deg, #3eb2b1 0%, #2d9d9c 30%, #0891b2 70%, #3eb2b1 100%)',
              borderRadius: '24px',
              padding: '2px',
              boxShadow: '0 25px 50px rgba(62, 178, 177, 0.25)',
              animation: 'slideInRight 0.8s ease-out'
            }}>
              <div style={{
                background: 'linear-gradient(145deg, #ffffff 0%, #f0fdfc 50%, #ccfdf9 100%)',
                borderRadius: '22px',
                padding: '32px',
                position: 'relative',
                overflow: 'hidden'
              }}>
                {/* Main Savings Message */}
                <div style={{
                  textAlign: 'center',
                  marginBottom: '20px',
                  position: 'relative',
                  zIndex: 3
                }}>
                  <div style={{
                    fontSize: '28px',
                    fontWeight: '900',
                    color: '#0f766e',
                    lineHeight: '1.2',
                    marginBottom: '16px'
                  }}>
                    🎉 {t('solarCalculator.results.marketing.saveMoreThan')} {result.savingsPercentage}%
                  </div>
                  <div style={{
                    fontSize: '18px',
                    color: '#164e63',
                    fontWeight: '600'
                  }}>
                    {t('solarCalculator.results.marketing.ofSystemValue')}
                  </div>
                </div>

                {/* Payment Terms */}
                <div style={{
                  textAlign: 'center',
                  fontSize: '18px',
                  color: '#164e63',
                  fontWeight: '700'
                }}>
                  {t('solarCalculator.results.marketing.byPayingJust')} {result.monthlyCostIncrease}% {t('solarCalculator.results.marketing.plusOnBill')} {t('solarCalculator.results.marketing.forOnly')} {result.numberOfInstallments} {t('solarCalculator.results.marketing.months')}
                </div>
              </div>
            </div>
            )}

            {/* 6-Card Grid Layout */}
            <div className="solar-results-grid" style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '16px',
              marginBottom: '24px',
              animation: 'slideInRight 0.8s ease-out'
            }}>
              
              {/* System Size Card */}
              <div style={{
                background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                borderRadius: '16px',
                padding: '20px 16px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#3b82f6',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 16px rgba(59, 130, 246, 0.3)'
                }}>
                  <Sun className="w-6 h-6 text-white" />
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#1e40af',
                  marginBottom: '4px'
                }}>
                  {result.solarPowerKWP} KWP
                </div>
                <div style={{
                  fontSize: '16px',
                  color: '#1e40af',
                  fontWeight: '600'
                }}>
                  {t('solarCalculator.systemSize')}
                </div>
              </div>

              {/* System Price Card */}
              <div style={{
                background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
                borderRadius: '16px',
                padding: '20px 16px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#22c55e',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 16px rgba(34, 197, 94, 0.3)'
                }}>
                  <DollarSign className="w-6 h-6 text-white" />
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#16a34a',
                  marginBottom: '4px'
                }}>
                  SAR {result.systemPrice.toLocaleString()}
                </div>
                <div style={{
                  fontSize: '16px',
                  color: '#16a34a',
                  fontWeight: '600'
                }}>
                  {t('solarCalculator.systemPrice')}
                </div>
              </div>

              {/* Monthly Payment Card */}
              <div style={{
                background: 'linear-gradient(135deg, #e9d5ff 0%, #ddd6fe 100%)',
                borderRadius: '16px',
                padding: '20px 16px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#8b5cf6',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 16px rgba(139, 92, 246, 0.3)'
                }}>
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#7c3aed',
                  marginBottom: '4px'
                }}>
                  SAR {result.totalMonthlyPayment.toLocaleString()}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#7c3aed',
                  fontWeight: '600'
                }}>
                  {t('solarCalculator.monthlyPayment')}
                </div>
              </div>

              {/* Lifetime Savings Card */}
              <div style={{
                background: 'linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%)',
                borderRadius: '16px',
                padding: '20px 16px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: 'linear-gradient(135deg, #ec4899, #be185d)',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 16px rgba(236, 72, 153, 0.3)'
                }}>
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#be185d',
                  marginBottom: '4px'
                }}>
                  {result.savingsPercentage}%
                </div>
                <div style={{
                  fontSize: '16px',
                  color: '#be185d',
                  fontWeight: '600'
                }}>
                  {t('solarCalculator.lifetimeSavings')}
                </div>
              </div>

              {/* Average Electricity Bill Card */}
              <div style={{
                background: 'linear-gradient(135deg, #fed7aa 0%, #fdba74 100%)',
                borderRadius: '16px',
                padding: '20px 16px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#f97316',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 16px rgba(249, 115, 22, 0.3)'
                }}>
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#ea580c',
                  marginBottom: '4px'
                }}>
                  SAR {result.currentMonthlyBill.toLocaleString()}
                </div>
                <div style={{
                  fontSize: '16px',
                  color: '#ea580c',
                  fontWeight: '600'
                }}>
                  {t('solarCalculator.averageElectricityBill')}
                </div>
              </div>

              {/* Monthly Power Production Card */}
              <div style={{
                background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
                borderRadius: '16px',
                padding: '20px 16px',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  background: '#eab308',
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 8px 16px rgba(234, 179, 8, 0.3)'
                }}>
                  <Battery className="w-6 h-6 text-white" />
                </div>
                <div style={{
                  fontSize: '24px',
                  fontWeight: 'bold',
                  color: '#a16207',
                  marginBottom: '4px'
                }}>
                  {result.monthlyProduction.toLocaleString()} KWH
                </div>
                <div style={{
                  fontSize: '16px',
                  color: '#a16207',
                  fontWeight: '600'
                }}>
                  {t('solarCalculator.averageMonthlyProduction')}
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              animation: 'fadeInUp 0.8s ease-out 0.8s both'
            }}>
              <button
                onClick={handleGetQuote}
                style={{
                  padding: '18px 48px',
                  background: 'linear-gradient(135deg, #3eb2b1 0%, #2d9d9c 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '16px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  fontWeight: '700',
                  boxShadow: '0 12px 28px rgba(62, 178, 177, 0.4)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}
              >
                <CheckCircle className="w-6 h-6" />
                {t('solarCalculator.getQuote')} →
              </button>
            </div>
          </div>
        ) : error ? (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#fef2f2',
            borderRadius: '12px',
            border: '2px solid #fecaca'
          }}>
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <p style={{ color: '#dc2626', fontSize: '16px', marginBottom: '8px', fontWeight: '600' }}>
              {error}
            </p>
            <p style={{ color: '#991b1b', fontSize: '14px' }}>
              {t('solarCalculator.validationError')}
            </p>
          </div>
        ) : (
          <div style={{
            padding: '40px',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            borderRadius: '12px',
            border: '2px dashed #d1d5db'
          }}>
            <Sun className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p style={{ color: '#6b7280', fontSize: '16px', marginBottom: '8px' }}>
              {t('solarCalculator.enterDetails')}
            </p>
            <p style={{ color: '#9ca3af', fontSize: '14px' }}>
              {t('solarCalculator.resultsWillAppear')}
            </p>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};