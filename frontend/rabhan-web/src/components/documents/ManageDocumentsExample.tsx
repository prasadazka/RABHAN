import React from 'react';
import KYCProgressTracker from './KYCProgressTracker';

// Example component showing how to use the new tabular manage view
const ManageDocumentsExample: React.FC = () => {
  const handleUploadRequest = (categoryId: string) => {
    console.log('Upload requested for category:', categoryId);
    // Handle document upload logic here
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Document Management Dashboard</h1>
      
      {/* Progress Overview with Tabular Manage View */}
      <KYCProgressTracker
        userType="USER"
        showDocuments={true}
        showManageTab={true}
        defaultView="table"
        onUploadRequest={handleUploadRequest}
        className="manage-documents"
      />
      
      {/* Example with Cards View */}
      <div style={{ marginTop: '40px' }}>
        <h2>Alternative Cards View</h2>
        <KYCProgressTracker
          userType="USER"
          showDocuments={true}
          showManageTab={true}
          defaultView="cards"
          onUploadRequest={handleUploadRequest}
        />
      </div>
    </div>
  );
};

export default ManageDocumentsExample;