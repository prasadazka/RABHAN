import React from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({ steps, currentStep }) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0',
        height: '100%'
      }}
    >
      {steps.map((step, index) => (
        <div
          key={index}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '1rem',
            flexDirection: isRTL ? 'row-reverse' : 'row',
            padding: '1rem 0.75rem',
            borderRadius: '12px',
            background: index === currentStep 
              ? 'rgba(62, 178, 177, 0.06)' 
              : 'transparent',
            border: index === currentStep 
              ? '1px solid rgba(62, 178, 177, 0.15)' 
              : '1px solid transparent',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            cursor: index < currentStep ? 'pointer' : 'default',
            position: 'relative',
            flex: 1,
            minHeight: '60px'
          }}
        >
          {/* Step Circle */}
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '600',
              fontSize: '1.125rem',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              flexShrink: 0,
              ...(index <= currentStep
                ? {
                    background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
                    color: '#ffffff',
                    boxShadow: '0 4px 16px rgba(62, 178, 177, 0.3)'
                  }
                : {
                    background: 'rgba(255, 255, 255, 0.7)',
                    border: '2px solid rgba(229, 231, 235, 0.5)',
                    color: '#9ca3af'
                  })
            }}
          >
            {index < currentStep ? '✓' : index + 1}
          </div>
          
          {/* Step Label */}
          <div style={{ flex: 1 }}>
            <span
              style={{
                fontSize: '1rem',
                color: index <= currentStep ? '#1f2937' : '#9ca3af',
                fontWeight: index === currentStep ? '600' : '500',
                textAlign: isRTL ? 'right' : 'left',
                display: 'block',
                lineHeight: 1.4
              }}
            >
              {step}
            </span>
          </div>

          {/* Connector Line */}
          {index < steps.length - 1 && (
            <div
              style={{
                position: 'absolute',
                left: isRTL ? 'auto' : '24px',
                right: isRTL ? '24px' : 'auto',
                bottom: '-2px',
                width: '2px',
                height: '4px',
                background: index < currentStep
                  ? 'linear-gradient(180deg, #3eb2b1 0%, #22d3db 100%)'
                  : 'rgba(229, 231, 235, 0.5)',
                transition: 'background 0.3s ease'
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

export default StepIndicator;