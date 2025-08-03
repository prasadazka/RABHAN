import React from 'react';
import { useTranslation } from 'react-i18next';
import Documents from './Documents'; // Reuse the existing Documents component

interface ContractorDocumentsProps {
  userType: 'CONTRACTOR';
}

const ContractorDocuments: React.FC<ContractorDocumentsProps> = ({ userType }) => {
  const { t } = useTranslation();

  // Reuse the existing Documents component with CONTRACTOR userType
  return <Documents userType={userType} />;
};

export default ContractorDocuments;