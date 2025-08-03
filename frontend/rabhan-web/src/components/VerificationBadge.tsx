import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  CheckCircle, 
  Clock, 
  AlertTriangle, 
  ExternalLink,
  Shield
} from 'lucide-react';

// Styled Components - Following fdev.md FAANG-level design principles
const BadgeContainer = styled(motion.div)<{ status: VerificationStatus }>`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: ${props => props.status === 'not_verified' ? 'pointer' : 'default'};
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  backdrop-filter: blur(8px);
  border: 2px solid;
  position: relative;
  overflow: hidden;
  
  /* SAMA-compliant security visual indicators */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.6s ease;
  }
  
  ${props => {
    const theme = '#3eb2b1'; // Primary theme color
    
    switch (props.status) {
      case 'verified':
        return `
          background: linear-gradient(135deg, rgba(34, 197, 94, 0.1), rgba(22, 163, 74, 0.15));
          color: #15803d;
          border-color: #22c55e;
          box-shadow: 0 4px 12px rgba(34, 197, 94, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          
          &:hover::before {
            left: 100%;
          }
        `;
      case 'pending':
        return `
          background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(217, 119, 6, 0.15));
          color: #d97706;
          border-color: #f59e0b;
          box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          
          &:hover::before {
            left: 100%;
          }
        `;
      case 'rejected':
        return `
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.1), rgba(220, 38, 38, 0.15));
          color: #dc2626;
          border-color: #ef4444;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          
          &:hover::before {
            left: 100%;
          }
        `;
      case 'not_verified':
      default:
        return `
          background: linear-gradient(135deg, rgba(62, 178, 177, 0.1), rgba(45, 154, 153, 0.15));
          color: ${theme};
          border-color: ${theme};
          box-shadow: 0 4px 12px rgba(62, 178, 177, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          
          &:hover {
            background: linear-gradient(135deg, rgba(62, 178, 177, 0.15), rgba(45, 154, 153, 0.2));
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(62, 178, 177, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }
          
          &:hover::before {
            left: 100%;
          }
          
          &:active {
            transform: translateY(0);
            box-shadow: 0 4px 12px rgba(62, 178, 177, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.1);
          }
        `;
    }
  }}
  
  /* Mobile-first responsive design */
  @media (max-width: 768px) {
    font-size: 12px;
    padding: 6px 12px;
    gap: 6px;
  }
  
  /* RTL support */
  [dir="rtl"] & {
    direction: rtl;
  }
  
  /* High contrast accessibility */
  @media (prefers-contrast: high) {
    border-width: 3px;
    font-weight: 800;
  }
  
  /* Reduced motion accessibility */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
    &::before {
      transition: none;
    }
  }
  
  /* Performance optimization */
  will-change: transform, box-shadow;
`;

const BadgeIcon = styled.div<{ status: VerificationStatus }>`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  
  /* Icon animation for pending status */
  ${props => props.status === 'pending' && `
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    
    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }
    
    /* Respect reduced motion */
    @media (prefers-reduced-motion: reduce) {
      animation: none;
    }
  `}
`;

const BadgeText = styled.span`
  font-weight: 600;
  letter-spacing: -0.01em;
  white-space: nowrap;
  
  /* Mobile responsive text */
  @media (max-width: 480px) {
    display: none;
  }
`;

const UploadPrompt = styled.span`
  font-weight: 500;
  opacity: 0.9;
  
  /* Mobile responsive text */
  @media (max-width: 480px) {
    display: none;
  }
`;

// Types
export type VerificationStatus = 'verified' | 'pending' | 'rejected' | 'not_verified';

export interface VerificationBadgeProps {
  status: VerificationStatus;
  className?: string;
  onClick?: () => void;
  showUploadPrompt?: boolean;
}

// Component
const VerificationBadge: React.FC<VerificationBadgeProps> = ({
  status,
  className,
  onClick,
  showUploadPrompt = true
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // DEBUG: Log what status the badge is receiving
  console.log('🔍 VerificationBadge received status:', {
    status,
    showUploadPrompt,
    willShowUploadLink: status === 'not_verified' && showUploadPrompt
  });

  // Handle click - navigate to documents page if not verified
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (status === 'not_verified') {
      navigate('/dashboard/documents');
    }
  };

  // Get icon based on status
  const getIcon = () => {
    switch (status) {
      case 'verified':
        return <CheckCircle size={16} />;
      case 'pending':
        return <Clock size={16} />;
      case 'rejected':
        return <AlertTriangle size={16} />;
      case 'not_verified':
      default:
        return showUploadPrompt ? <ExternalLink size={16} /> : <Shield size={16} />;
    }
  };

  // Get text based on status
  const getText = () => {
    switch (status) {
      case 'verified':
        return t('userApp.profile.verification.verified');
      case 'pending':
        return t('userApp.profile.verification.pending');
      case 'rejected':
        return t('userApp.profile.verification.rejected');
      case 'not_verified':
      default:
        return showUploadPrompt 
          ? t('userApp.profile.verification.upload_documents')
          : t('userApp.profile.verification.not_verified');
    }
  };

  // Get aria label for accessibility
  const getAriaLabel = () => {
    switch (status) {
      case 'verified':
        return t('userApp.profile.verification.aria.verified');
      case 'pending':
        return t('userApp.profile.verification.aria.pending');
      case 'rejected':
        return t('userApp.profile.verification.aria.rejected');
      case 'not_verified':
      default:
        return showUploadPrompt 
          ? t('userApp.profile.verification.aria.upload_documents')
          : t('userApp.profile.verification.aria.not_verified');
    }
  };

  return (
    <BadgeContainer
      status={status}
      className={className}
      onClick={handleClick}
      whileHover={status === 'not_verified' ? { scale: 1.02 } : undefined}
      whileTap={status === 'not_verified' ? { scale: 0.98 } : undefined}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ 
        duration: 0.3, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      role={status === 'not_verified' ? 'button' : 'status'}
      tabIndex={status === 'not_verified' ? 0 : -1}
      aria-label={getAriaLabel()}
      onKeyDown={(e) => {
        if (status === 'not_verified' && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <BadgeIcon status={status}>
        {getIcon()}
      </BadgeIcon>
      
      {status === 'not_verified' && showUploadPrompt ? (
        <UploadPrompt>{getText()}</UploadPrompt>
      ) : (
        <BadgeText>{getText()}</BadgeText>
      )}
    </BadgeContainer>
  );
};

export default VerificationBadge;