import React, { useState } from 'react';
import { Calculator, Zap, Home, Building2, TrendingUp } from 'lucide-react';
import { ClientType, CalculationMode, SolarCalculationInput, SolarCalculationResult } from '../../types/solar.types';
import { solarService } from '../../services/solar.service';

interface SimpleSolarCalculatorProps {
  className?: string;
}

export const SimpleSolarCalculator: React.FC<SimpleSolarCalculatorProps> = ({ className = '' }) => {
  const [clientType, setClientType] = useState<ClientType>(ClientType.RESIDENTIAL);
  const [mode, setMode] = useState<CalculationMode>(CalculationMode.MONTHLY_CONSUMPTION);
  const [monthlyConsumption, setMonthlyConsumption] = useState('');
  const [monthlyBill, setMonthlyBill] = useState('');
  const [installments, setInstallments] = useState(12);
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<SolarCalculationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    setError(null);
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
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Calculation failed');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleReset = () => {
    setResult(null);
    setError(null);
    setMonthlyConsumption('');
    setMonthlyBill('');
  };

  if (result) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="text-center mb-6">
          <div className="flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-green-500 mr-2" />
            <h2 className="text-2xl font-bold text-gray-900">Your Solar Savings</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">System Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>System Size:</span>
                <span className="font-medium">{result.systemSize} kW</span>
              </div>
              <div className="flex justify-between">
                <span>Annual Generation:</span>
                <span className="font-medium">{result.annualGeneration.toLocaleString()} kWh</span>
              </div>
              <div className="flex justify-between">
                <span>Total Cost:</span>
                <span className="font-medium">{result.totalCost.toLocaleString()} SAR</span>
              </div>
            </div>
          </div>

          <div className="bg-green-50 rounded-lg p-4">
            <h3 className="font-semibold text-green-900 mb-2">Monthly Savings</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Monthly Installment:</span>
                <span className="font-medium">{result.monthlyInstallment.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between">
                <span>Monthly Savings:</span>
                <span className="font-medium text-green-600">{result.monthlySavings.toLocaleString()} SAR</span>
              </div>
              <div className="flex justify-between">
                <span>Net Monthly Benefit:</span>
                <span className="font-medium text-green-600">{(result.monthlySavings - result.monthlyInstallment).toLocaleString()} SAR</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-yellow-50 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-yellow-900 mb-2">Long-term Benefits</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span>Total 25-year Savings:</span>
              <span className="font-medium">{result.totalSavings.toLocaleString()} SAR</span>
            </div>
            <div className="flex justify-between">
              <span>ROI:</span>
              <span className="font-medium">{result.roi}%</span>
            </div>
          </div>
        </div>

        {result.marketingLines && result.marketingLines.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Why Choose Solar?</h3>
            <ul className="space-y-1 text-sm text-gray-700">
              {result.marketingLines.map((line, index) => (
                <li key={index} className="flex items-start">
                  <Zap className="w-4 h-4 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={handleReset}
            className="flex-1 bg-gray-500 hover:bg-gray-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Calculate Again
          </button>
          <button
            className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            Get Quote
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Header */}
      <div 
        className="text-center mb-8 p-8 rounded-2xl text-white relative overflow-hidden"
        style={{
          background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
          boxShadow: '0 20px 40px rgba(62, 178, 177, 0.3)'
        }}
      >
        <div className="relative z-10">
          <Calculator className="w-12 h-12 mx-auto mb-4" />
          <h1 className="text-3xl font-bold mb-2">Solar Calculator</h1>
          <p className="text-xl opacity-90">Calculate your solar savings instantly</p>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-10 rounded-full -translate-y-8 translate-x-8"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full translate-y-8 -translate-x-8"></div>
      </div>

      {/* Main Form */}
      <div className="bg-white rounded-2xl shadow-xl p-8 space-y-8">
        {/* Client Type */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-6">1. Select Client Type</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.values(ClientType).map((type) => (
              <button
                key={type}
                onClick={() => setClientType(type)}
                className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                  clientType === type
                    ? 'border-[#3eb2b1] bg-gradient-to-br from-[#f0fdfc] to-[#ccfdf9] shadow-lg transform scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${
                    clientType === type 
                      ? 'bg-[#3eb2b1] text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {type === ClientType.RESIDENTIAL ? (
                      <Home className="w-6 h-6" />
                    ) : (
                      <Building2 className="w-6 h-6" />
                    )}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-lg text-gray-800">
                      {type === ClientType.RESIDENTIAL ? 'Residential' : 'Commercial'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {type === ClientType.RESIDENTIAL 
                        ? 'For homes and residential properties'
                        : 'For businesses and commercial buildings'
                      }
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Method */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-6">2. Choose Input Method</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Object.values(CalculationMode).map((calcMode) => (
              <button
                key={calcMode}
                onClick={() => setMode(calcMode)}
                className={`p-6 rounded-xl border-2 transition-all duration-300 ${
                  mode === calcMode
                    ? 'border-[#3eb2b1] bg-gradient-to-br from-[#f0fdfc] to-[#ccfdf9] shadow-lg transform scale-105'
                    : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-lg ${
                    mode === calcMode 
                      ? 'bg-[#3eb2b1] text-white' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    <Zap className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-lg text-gray-800">
                      {calcMode === CalculationMode.MONTHLY_CONSUMPTION
                        ? 'Monthly Usage (kWh)'
                        : 'Monthly Bill (SAR)'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {calcMode === CalculationMode.MONTHLY_CONSUMPTION
                        ? 'Enter your electricity consumption'
                        : 'Enter your current monthly bill'
                      }
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Input Value */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-6">3. Enter Your Details</h2>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
            <label className="block text-lg font-semibold text-gray-700 mb-4 text-center">
              {mode === CalculationMode.MONTHLY_CONSUMPTION
                ? 'Monthly Electricity Consumption (kWh)'
                : 'Monthly Electricity Bill (SAR)'}
            </label>
            <input
              type="number"
              value={mode === CalculationMode.MONTHLY_CONSUMPTION ? monthlyConsumption : monthlyBill}
              onChange={(e) =>
                mode === CalculationMode.MONTHLY_CONSUMPTION
                  ? setMonthlyConsumption(e.target.value)
                  : setMonthlyBill(e.target.value)
              }
              placeholder={mode === CalculationMode.MONTHLY_CONSUMPTION ? '8,000' : '2,100'}
              className="w-full p-6 text-3xl font-bold text-center border-2 border-gray-300 rounded-xl focus:border-[#3eb2b1] focus:outline-none bg-white shadow-inner"
            />
            <p className="text-center text-gray-600 mt-4 font-medium">
              {mode === CalculationMode.MONTHLY_CONSUMPTION
                ? 'Enter between 6,000 - 24,000 kWh'
                : `Minimum ${clientType === ClientType.RESIDENTIAL ? '1,080' : '1,200'} SAR`}
            </p>
          </div>
        </div>

        {/* Payment Period */}
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-6">4. Payment Period</h2>
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
            <label className="block text-lg font-semibold text-gray-700 mb-4 text-center">
              Number of Installments
            </label>
            <select
              value={installments}
              onChange={(e) => setInstallments(Number(e.target.value))}
              className="w-full p-4 text-xl font-semibold text-center border-2 border-gray-300 rounded-xl focus:border-[#3eb2b1] focus:outline-none bg-white"
            >
              {[12, 18, 24, 30].map((months) => (
                <option key={months} value={months}>
                  {months} months
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-6">
            <div className="flex items-center">
              <div className="w-6 h-6 bg-red-500 rounded-full flex items-center justify-center mr-3">
                <span className="text-white text-sm font-bold">!</span>
              </div>
              <p className="text-red-700 font-semibold text-lg">{error}</p>
            </div>
          </div>
        )}

        {/* Calculate Button */}
        <div className="pt-4">
          <button
            onClick={handleCalculate}
            disabled={isCalculating || (!monthlyConsumption && !monthlyBill)}
            className="w-full py-6 px-8 text-xl font-bold text-white rounded-xl transition-all duration-300 flex items-center justify-center"
            style={{
              background: isCalculating || (!monthlyConsumption && !monthlyBill)
                ? 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'
                : 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
              boxShadow: isCalculating || (!monthlyConsumption && !monthlyBill)
                ? 'none'
                : '0 10px 25px rgba(62, 178, 177, 0.4)',
              cursor: isCalculating || (!monthlyConsumption && !monthlyBill) ? 'not-allowed' : 'pointer'
            }}
          >
            {isCalculating ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Calculating Your Savings...
              </>
            ) : (
              <>
                <Calculator className="w-6 h-6 mr-3" />
                Calculate Solar Savings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};