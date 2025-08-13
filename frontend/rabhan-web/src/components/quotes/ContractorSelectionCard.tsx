import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { ContractorProfile } from '../../services/contractor.service';
import { MapPinIcon, StarIcon, PhoneIcon, MailIcon, CalendarIcon, CheckCircleIcon } from 'lucide-react';

interface ContractorSelectionCardProps {
  contractor: ContractorProfile;
  isSelected: boolean;
  onSelect: (contractor: ContractorProfile) => void;
  onScheduleInspection: (contractor: ContractorProfile) => void;
  inspectionScheduled: boolean;
  inspectionDate?: Date;
  className?: string;
}

export const ContractorSelectionCard: React.FC<ContractorSelectionCardProps> = ({
  contractor,
  isSelected,
  onSelect,
  onScheduleInspection,
  inspectionScheduled,
  inspectionDate,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [imageError, setImageError] = useState(false);

  const handleImageError = () => {
    setImageError(true);
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;
    
    for (let i = 0; i < fullStars; i++) {
      stars.push(
        <StarIcon 
          key={`full-${i}`} 
          size={16} 
          fill={theme.colors.semantic.warning.main} 
          color={theme.colors.semantic.warning.main} 
        />
      );
    }
    
    if (hasHalfStar) {
      stars.push(
        <StarIcon 
          key="half" 
          size={16} 
          fill={theme.colors.semantic.warning.light} 
          color={theme.colors.semantic.warning.main} 
        />
      );
    }
    
    const emptyStars = 5 - Math.ceil(rating);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(
        <StarIcon 
          key={`empty-${i}`} 
          size={16} 
          fill="none" 
          color={theme.colors.borders.light} 
        />
      );
    }
    
    return stars;
  };

  const getVerificationBadge = () => {
    if (contractor.verification_level >= 3) {
      return {
        text: t('contractors.verification.verified'),
        color: theme.colors.semantic.success.main,
        bgColor: theme.colors.semantic.success.light + '20'
      };
    } else if (contractor.verification_level >= 1) {
      return {
        text: t('contractors.verification.partial'),
        color: theme.colors.semantic.warning.main,
        bgColor: theme.colors.semantic.warning.light + '20'
      };
    }
    return {
      text: t('contractors.verification.unverified'),
      color: theme.colors.text.secondary,
      bgColor: theme.colors.backgrounds.secondary
    };
  };

  const badge = getVerificationBadge();

  return (
    <div 
      className={`contractor-selection-card ${className}`}
      style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        border: isSelected 
          ? `3px solid ${theme.colors.primary[500]}` 
          : `2px solid ${theme.colors.borders.light}`,
        boxShadow: isSelected 
          ? `0 8px 24px ${theme.colors.primary[500]}20`
          : '0 4px 12px rgba(0, 0, 0, 0.08)',
        padding: '0.75rem',
        transition: 'all 0.3s ease',
        cursor: 'pointer',
        position: 'relative',
        transform: isSelected ? 'translateY(-2px)' : 'none',
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem'
      }}
      onClick={() => onSelect(contractor)}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div style={{
          position: 'absolute',
          top: '-3px',
          right: isRTL ? 'auto' : '-3px',
          left: isRTL ? '-3px' : 'auto',
          backgroundColor: theme.colors.primary[500],
          color: 'white',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
          fontWeight: 'bold',
          zIndex: 10
        }}>
          <CheckCircleIcon size={16} />
        </div>
      )}

      {/* Business Logo/Avatar */}
      <div style={{
        width: '40px',
        height: '40px',
        borderRadius: '12px',
        backgroundColor: theme.colors.primary[100],
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        color: theme.colors.primary[600],
        flexShrink: 0,
        overflow: 'hidden'
      }}>
        {!imageError && contractor.business_name ? (
          <img 
            src={`https://ui-avatars.com/api/?name=${encodeURIComponent(contractor.business_name)}&size=40&background=${theme.colors.primary[500].replace('#', '')}&color=fff`}
            alt={contractor.business_name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            onError={handleImageError}
          />
        ) : (
          contractor.business_name?.charAt(0)?.toUpperCase() || '?'
        )}
      </div>

      {/* Business Info */}
      <div style={{ flex: 1, minWidth: '180px' }}>
        <h3 style={{
          fontSize: '0.95rem',
          fontWeight: '700',
          color: theme.colors.text.primary,
          margin: '0 0 0.2rem 0',
          lineHeight: '1.2'
        }}>
          {i18n.language === 'ar' && contractor.business_name_ar 
            ? contractor.business_name_ar 
            : contractor.business_name}
        </h3>
        
        {/* Location */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          color: theme.colors.text.secondary,
          fontSize: '0.8rem',
          marginBottom: '0.2rem'
        }}>
          <MapPinIcon size={12} style={{ 
            marginRight: isRTL ? '0' : '4px', 
            marginLeft: isRTL ? '4px' : '0' 
          }} />
          {contractor.city}, {contractor.region}
        </div>

        {/* Rating */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1px' }}>
            {renderStars(contractor.average_rating || 0)}
          </div>
          <span style={{
            fontSize: '0.75rem',
            color: theme.colors.text.secondary,
            fontWeight: '500'
          }}>
            {(contractor.average_rating || 0).toFixed(1)} ({contractor.total_reviews || 0})
          </span>
        </div>
      </div>

      {/* Experience & Service Areas - Always Show */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '85px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '0.7rem',
          color: theme.colors.text.secondary,
          marginBottom: '0.2rem'
        }}>
          {contractor.years_experience} {t('contractors.years')} {t('contractors.experience')}
        </div>
        <div style={{
          fontSize: '0.65rem',
          color: theme.colors.text.secondary,
          display: '-webkit-box',
          WebkitLineClamp: 1,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden'
        }}>
          {contractor.service_areas.join(', ')}
        </div>
      </div>

      {/* Scheduled Date & Time - Additional Section */}
      {inspectionScheduled && inspectionDate && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          minWidth: '75px',
          textAlign: 'center',
          backgroundColor: theme.colors.semantic.success.light + '15',
          borderRadius: '8px',
          padding: '0.4rem 0.2rem',
          border: `1px solid ${theme.colors.semantic.success.light}`
        }}>
          <div style={{
            fontSize: '0.65rem',
            color: theme.colors.semantic.success.main,
            fontWeight: '600',
            marginBottom: '0.2rem',
            textTransform: 'uppercase'
          }}>
            {t('contractors.scheduled')}
          </div>
          <div style={{
            fontSize: '0.7rem',
            color: theme.colors.text.primary,
            fontWeight: '500',
            marginBottom: '0.05rem'
          }}>
            {inspectionDate.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-US', {
              month: 'short',
              day: 'numeric'
            })}
          </div>
          <div style={{
            fontSize: '0.65rem',
            color: theme.colors.text.secondary,
            fontWeight: '500'
          }}>
            {inspectionDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </div>
        </div>
      )}

      {/* Verification Badge */}
      <div style={{
        backgroundColor: badge.bgColor,
        color: badge.color,
        padding: '3px 6px',
        borderRadius: '6px',
        fontSize: '0.65rem',
        fontWeight: '600',
        textAlign: 'center',
        minWidth: '55px',
        height: 'fit-content'
      }}>
        {badge.text}
      </div>

      {/* Projects Count */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        minWidth: '70px',
        textAlign: 'center'
      }}>
        <div style={{
          fontSize: '1.2rem',
          fontWeight: '700',
          color: theme.colors.primary[500]
        }}>
          {contractor.total_projects || 0}
        </div>
        <div style={{
          fontSize: '0.7rem',
          color: theme.colors.text.secondary
        }}>
          {t('contractors.projects')}
        </div>
      </div>

      {/* Action Button - Compact */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onScheduleInspection(contractor);
        }}
        style={{
          backgroundColor: inspectionScheduled 
            ? theme.colors.semantic.success.main 
            : (isSelected ? theme.colors.semantic.info.main : theme.colors.primary[500]),
          color: 'white',
          border: 'none',
          padding: '6px 10px',
          borderRadius: '6px',
          fontSize: '0.75rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: theme.transitions.normal,
          display: 'flex',
          alignItems: 'center',
          gap: '3px',
          minWidth: '90px',
          justifyContent: 'center',
          opacity: isSelected ? 1 : 0.8
        }}
      >
        <CalendarIcon size={14} />
        {inspectionScheduled ? t('contractors.scheduled') : t('contractors.schedule')}
      </button>
    </div>
  );
};