import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

interface DevCredentialsData {
  users: Array<{
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
    password: string;
    userType: string;
  }>;
  contractors: Array<{
    email: string;
    firstName: string;
    lastName: string;
    companyName: string;
    phone: string;
    crNumber: string;
    vatNumber: string;
    password: string;
  }>;
  admin: {
    email: string;
    password: string;
    role: string;
  };
}

interface DevCredentialHelperProps {
  onFillForm: (formData: any) => void;
  formType: 'user' | 'contractor' | 'login';
  isVisible?: boolean;
}

const DevCredentialHelper: React.FC<DevCredentialHelperProps> = ({
  onFillForm,
  formType,
  isVisible = true
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedCredential, setSelectedCredential] = useState<string>('');
  
  // Only show in development mode
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  if (!isDevelopment || !isVisible) return null;

  // Dummy credentials data from our script - using actual database users
  const devCredentials: DevCredentialsData = {
    users: [
      {
        email: 'hala.harbi2@example.com',
        firstName: 'Hala',
        lastName: 'Al-Harbi',
        phone: '512345678',
        password: 'password123',
        userType: 'HOMEOWNER',
      },
      {
        email: 'omar.dosari3@example.com',
        firstName: 'Omar',
        lastName: 'Al-Dosari',
        phone: '523456789',
        password: 'password123',
        userType: 'HOMEOWNER',
      },
      {
        email: 'fatima.mutairi6@example.com',
        firstName: 'Fatima',
        lastName: 'Al-Mutairi',
        phone: '534567890',
        password: 'password123',
        userType: 'HOMEOWNER',
      }
    ],
    contractors: [
      {
        email: 'contractor.nasser.rashid1@business.com',
        firstName: 'Nasser',
        lastName: 'Al-Rashid',
        companyName: 'Solar Solutions KSA 1',
        phone: '531948719',
        crNumber: '2099705257',
        vatNumber: '312345678901233',
        password: 'contractor123'
      },
      {
        email: 'contractor.khalid.dosari2@business.com',
        firstName: 'Khalid',
        lastName: 'Al-Dosari',
        companyName: 'Smart Solar Solutions 2',
        phone: '557828176',
        crNumber: '1054046324',
        vatNumber: '398765432109873',
        password: 'contractor123'
      },
      {
        email: 'contractor.mohammed.harbi3@business.com',
        firstName: 'Mohammed',
        lastName: 'Al-Harbi',
        companyName: 'Smart Solar Solutions 3',
        phone: '519771903',
        crNumber: '1060668009',
        vatNumber: '356789012345673',
        password: 'contractor123'
      },
      {
        email: 'contractor.salman.qahtani4@business.com',
        firstName: 'Salman',
        lastName: 'Al-Qahtani',
        companyName: 'Sun Power Technologies 4',
        phone: '560377999',
        crNumber: '1017256634',
        vatNumber: '323456789012343',
        password: 'contractor123'
      },
      {
        email: 'contractor.salman.shehri5@business.com',
        firstName: 'Salman',
        lastName: 'Al-Shehri',
        companyName: 'Smart Solar Solutions 5',
        phone: '518684168',
        crNumber: '2095406168',
        vatNumber: '387654321098763',
        password: 'contractor123'
      },
      {
        email: 'contractor.turki.malki6@business.com',
        firstName: 'Turki',
        lastName: 'Al-Malki',
        companyName: 'Clean Energy Partners 6',
        phone: '512215041',
        crNumber: '3058466442',
        vatNumber: '345678901234563',
        password: 'contractor123'
      },
      {
        email: 'contractor.omar.mutairi7@business.com',
        firstName: 'Omar',
        lastName: 'Al-Mutairi',
        companyName: 'Clean Energy Partners 7',
        phone: '542556844',
        crNumber: '4069496720',
        vatNumber: '312345678901233',
        password: 'contractor123'
      },
      {
        email: 'contractor.fahad.harbi8@business.com',
        firstName: 'Fahad',
        lastName: 'Al-Harbi',
        companyName: 'Clean Energy Partners 8',
        phone: '559536564',
        crNumber: '3016279973',
        vatNumber: '398765432109873',
        password: 'contractor123'
      }
    ],
    admin: {
      email: 'admin@rabhan.sa',
      password: 'admin123',
      role: 'ADMIN'
    }
  };

  const getAvailableCredentials = () => {
    switch (formType) {
      case 'user':
        return devCredentials.users.map((user, index) => ({
          id: `user-${index}`,
          label: `${user.firstName} ${user.lastName} (${user.userType})`,
          email: user.email,
          data: user
        }));
      case 'contractor':
        return devCredentials.contractors.map((contractor, index) => ({
          id: `contractor-${index}`,
          label: `${contractor.companyName}`,
          email: contractor.email,
          data: contractor
        }));
      case 'login':
        return [
          ...devCredentials.users.map((user, index) => ({
            id: `user-${index}`,
            label: `👤 ${user.firstName} ${user.lastName} (${user.userType})`,
            email: user.email,
            data: { email: user.email, password: user.password, role: 'USER' }
          })),
          ...devCredentials.contractors.map((contractor, index) => ({
            id: `contractor-${index}`,
            label: `🏢 ${contractor.companyName}`,
            email: contractor.email,
            data: { email: contractor.email, password: contractor.password, role: 'CONTRACTOR' }
          })),
          {
            id: 'admin',
            label: '👑 Admin User',
            email: devCredentials.admin.email,
            data: devCredentials.admin
          }
        ];
      default:
        return [];
    }
  };

  const handleCredentialSelect = (credentialId: string) => {
    const credentials = getAvailableCredentials();
    const selected = credentials.find(cred => cred.id === credentialId);
    
    if (selected && selected.data) {
      onFillForm(selected.data);
      setIsExpanded(false);
      setSelectedCredential(credentialId);
    }
  };

  const credentials = getAvailableCredentials();

  if (credentials.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: isRTL ? 'auto' : '20px',
        left: isRTL ? '20px' : 'auto',
        zIndex: 9999,
        background: 'rgba(59, 178, 177, 0.95)',
        backdropFilter: 'blur(10px)',
        border: `2px solid ${theme.colors.primary[400]}`,
        borderRadius: theme.radius.lg,
        boxShadow: theme.shadows.xl,
        maxWidth: '320px',
        transition: 'all 0.3s ease',
        transform: isExpanded ? 'scale(1)' : 'scale(0.95)',
        opacity: isExpanded ? 1 : 0.9
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          background: 'linear-gradient(135deg, #3eb2b1 0%, #22d3db 100%)',
          borderRadius: `${theme.radius.lg} ${theme.radius.lg} 0 0`,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: theme.colors.text.inverse,
          fontWeight: '600',
          fontSize: '0.875rem'
        }}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🔧</span>
          <span>DEV CREDENTIALS</span>
        </div>
        <span
          style={{
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          ▼
        </span>
      </div>

      {/* Content */}
      {isExpanded && (
        <div style={{ 
          padding: '16px',
          maxHeight: '400px',
          overflowY: 'auto'
        }}>
          <div style={{
            fontSize: '0.75rem',
            color: theme.colors.text.inverse,
            marginBottom: '12px',
            fontWeight: '500'
          }}>
            {formType === 'login' 
              ? 'Quick Login Credentials:'
              : `Fill ${formType} registration form:`
            }
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {credentials.map((credential) => (
              <button
                key={credential.id}
                onClick={() => handleCredentialSelect(credential.id)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: selectedCredential === credential.id 
                    ? 'rgba(255, 255, 255, 0.25)' 
                    : 'rgba(255, 255, 255, 0.1)',
                  border: selectedCredential === credential.id
                    ? '2px solid rgba(255, 255, 255, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: theme.radius.md,
                  color: theme.colors.text.inverse,
                  fontSize: '0.75rem',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  textAlign: 'left',
                  direction: isRTL ? 'rtl' : 'ltr'
                }}
                onMouseEnter={(e) => {
                  if (selectedCredential !== credential.id) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (selectedCredential !== credential.id) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                  }
                }}
              >
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                  {credential.label}
                </div>
                <div style={{ 
                  fontSize: '0.65rem', 
                  opacity: 0.8,
                  fontFamily: 'monospace'
                }}>
                  {credential.email}
                </div>
              </button>
            ))}
          </div>

          {formType === 'login' && (
            <div style={{
              marginTop: '12px',
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: theme.radius.sm,
              fontSize: '0.65rem',
              color: theme.colors.text.inverse,
              opacity: 0.8,
              lineHeight: '1.4'
            }}>
              <strong>Passwords:</strong><br />
              Users: password123<br />
              Contractors: contractor123<br />
              Admin: admin123
            </div>
          )}

          <div style={{
            marginTop: '12px',
            fontSize: '0.6rem',
            color: theme.colors.text.inverse,
            opacity: 0.7,
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Development Mode Only
          </div>
        </div>
      )}
    </div>
  );
};

export default DevCredentialHelper;