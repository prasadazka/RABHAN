import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import { ContractorProfile } from '../../services/contractor.service';
import { quoteService } from '../../services/quote.service';
import { ContractorSelectionCard } from './ContractorSelectionCard';
import { CalendarIcon, UsersIcon, AlertTriangleIcon, SearchIcon, FilterIcon } from 'lucide-react';

interface ContractorSelectionStepProps {
  serviceArea: string;
  onContractorsSelected: (contractors: ContractorProfile[], inspectionSchedules: { [key: string]: Date }) => void;
  onNext: () => void;
  onBack: () => void;
  className?: string;
}

interface InspectionSchedule {
  contractorId: string;
  selectedDate: Date;
  selectedTime: string;
  availableSlots: string[];
}

export const ContractorSelectionStep: React.FC<ContractorSelectionStepProps> = ({
  serviceArea,
  onContractorsSelected,
  onNext,
  onBack,
  className = ''
}) => {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';

  // State management
  const [contractors, setContractors] = useState<ContractorProfile[]>([]);
  const [selectedContractors, setSelectedContractors] = useState<ContractorProfile[]>([]);
  const [inspectionSchedules, setInspectionSchedules] = useState<{ [key: string]: Date }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filter states
  const [filters, setFilters] = useState({
    minRating: 0,
    maxDistance: 50,
    verificationLevel: 0
  });
  const [showFilters, setShowFilters] = useState(false);

  // Inspection scheduling modal
  const [schedulingContractor, setSchedulingContractor] = useState<ContractorProfile | null>(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');

  // Available time slots for inspection scheduling
  const availableTimeSlots = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
  ];

  // Load contractors on mount
  useEffect(() => {
    loadContractors();
  }, [serviceArea, filters]);

  const loadContractors = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Map service area values to proper region names
      const regionMap: { [key: string]: string } = {
        'riyadh': 'Riyadh',
        'jeddah': 'Makkah',
        'dammam': 'Eastern Province',
        'mecca': 'Makkah',
        'medina': 'Medina'
      };

      const region = regionMap[serviceArea.toLowerCase()] || serviceArea;

      // Build search parameters
      const searchParams: any = {
        region: region,
        limit: 20,
        sort_by: 'average_rating',
        sort_order: 'desc'
      };

      // Add filters only if they have meaningful values
      if (filters.minRating > 0) {
        searchParams.min_rating = filters.minRating;
      }
      if (filters.maxDistance < 200) {
        searchParams.max_distance_km = filters.maxDistance;
      }
      if (filters.verificationLevel > 0) {
        searchParams.verification_level = filters.verificationLevel;
      }

      const response = await quoteService.getAvailableContractors(searchParams);

      setContractors(response.data?.contractors || []);
    } catch (error: any) {
      console.error('Failed to load contractors:', error);
      setError(t('contractors.loadError'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleContractorSelect = (contractor: ContractorProfile) => {
    if (selectedContractors.find(c => c.id === contractor.id)) {
      // Deselect contractor
      setSelectedContractors(prev => prev.filter(c => c.id !== contractor.id));
      // Remove inspection schedule if exists
      setInspectionSchedules(prev => {
        const updated = { ...prev };
        delete updated[contractor.id];
        return updated;
      });
    } else if (selectedContractors.length < 3) {
      // Select contractor (max 3)
      setSelectedContractors(prev => [...prev, contractor]);
    }
  };

  const handleScheduleInspection = (contractor: ContractorProfile) => {
    console.log('Schedule inspection clicked for:', contractor.business_name);
    setSchedulingContractor(contractor);
    
    // If already scheduled, pre-populate with existing date/time
    const existingSchedule = inspectionSchedules[contractor.id];
    if (existingSchedule) {
      setSelectedDate(existingSchedule.toISOString().split('T')[0]);
      const timeString = existingSchedule.toTimeString().slice(0, 5);
      setSelectedTime(timeString);
    } else {
      // Set default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSelectedDate(tomorrow.toISOString().split('T')[0]);
      setSelectedTime('');
    }
  };

  const confirmInspectionSchedule = () => {
    console.log('Confirm inspection schedule:', { schedulingContractor: schedulingContractor?.business_name, selectedDate, selectedTime });
    if (schedulingContractor && selectedDate && selectedTime) {
      const inspectionDateTime = new Date(selectedDate + 'T' + selectedTime);
      console.log('Setting inspection schedule:', inspectionDateTime);
      setInspectionSchedules(prev => ({
        ...prev,
        [schedulingContractor.id]: inspectionDateTime
      }));
      setSchedulingContractor(null);
      setSelectedDate('');
      setSelectedTime('');
    }
  };

  const handleNext = () => {
    if (selectedContractors.length === 3) {
      onContractorsSelected(selectedContractors, inspectionSchedules);
      onNext();
    }
  };

  // Get minimum date (tomorrow)
  const getMinDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  if (isLoading) {
    return (
      <div className={`contractor-selection-step ${className}`} style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ color: theme.colors.text.secondary }}>
          {t('contractors.loading')}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`contractor-selection-step ${className}`} style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ color: theme.colors.semantic.error.main, marginBottom: '1rem' }}>
          {error}
        </div>
        <button
          onClick={loadContractors}
          style={{
            backgroundColor: theme.colors.primary[500],
            color: 'white',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  return (
    <div className={`contractor-selection-step ${className}`} style={{
      width: '100%',
      maxWidth: 'none'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '1rem 1.5rem',
        marginBottom: '1rem',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
      }}>

        {/* Progress Indicator */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem',
          backgroundColor: theme.colors.primary[50],
          borderRadius: '8px',
          border: `2px solid ${theme.colors.primary[100]}`
        }}>
          <UsersIcon size={20} color={theme.colors.primary[500]} />
          <div>
            <div style={{
              fontSize: '0.9rem',
              color: theme.colors.primary[700],
              fontWeight: '600'
            }}>
              {selectedContractors.length} / 3 {t('contractors.selection.selected')}
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: theme.colors.primary[600]
            }}>
              {t('contractors.selection.selectExactly')}
            </div>
          </div>
        </div>

        {/* Penalty Warning */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem',
          padding: '0.75rem',
          backgroundColor: '#fff3cd',
          border: '2px solid #ffeaa7',
          borderRadius: '8px',
          marginTop: '0.75rem'
        }}>
          <AlertTriangleIcon size={20} color="#d68910" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <div style={{
              fontSize: '0.9rem',
              color: '#856404',
              fontWeight: '600',
              marginBottom: '0.25rem'
            }}>
              {t('contractors.selection.penaltyWarning.title')}
            </div>
            <div style={{
              fontSize: '0.8rem',
              color: '#6c5500',
              lineHeight: '1.4'
            }}>
              {t('contractors.selection.penaltyWarning.message')}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{ marginTop: '0.75rem' }}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            style={{
              backgroundColor: 'transparent',
              border: `1px solid ${theme.colors.borders.light}`,
              padding: '8px 12px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              cursor: 'pointer',
              fontSize: '0.9rem',
              color: theme.colors.text.secondary
            }}
          >
            <FilterIcon size={16} />
            {t('contractors.filters')}
          </button>

          {showFilters && (
            <div style={{
              marginTop: '0.5rem',
              padding: '0.5rem',
              backgroundColor: theme.colors.backgrounds.secondary,
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              flexWrap: 'wrap'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  color: theme.colors.text.secondary,
                  whiteSpace: 'nowrap'
                }}>
                  {t('contractors.filterOptions.minRating')}:
                </label>
                <select
                  value={filters.minRating}
                  onChange={(e) => setFilters(prev => ({ ...prev, minRating: Number(e.target.value) }))}
                  style={{
                    padding: '3px 6px',
                    border: `1px solid ${theme.colors.borders.light}`,
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    backgroundColor: 'white',
                    color: theme.colors.text.primary,
                    minWidth: '110px'
                  }}
                >
                  <option value={0}>{t('contractors.filterOptions.anyRating')}</option>
                  <option value={3}>3+ {t('contractors.stars')}</option>
                  <option value={4}>4+ {t('contractors.stars')}</option>
                  <option value={4.5}>4.5+ {t('contractors.stars')}</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <label style={{
                  fontSize: '0.8rem',
                  fontWeight: '500',
                  color: theme.colors.text.secondary,
                  whiteSpace: 'nowrap'
                }}>
                  {t('contractors.filterOptions.maxDistance')}:
                </label>
                <select
                  value={filters.maxDistance}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxDistance: Number(e.target.value) }))}
                  style={{
                    padding: '3px 6px',
                    border: `1px solid ${theme.colors.borders.light}`,
                    borderRadius: '4px',
                    fontSize: '0.75rem',
                    backgroundColor: 'white',
                    color: theme.colors.text.primary,
                    minWidth: '90px'
                  }}
                >
                  <option value={25}>25 km</option>
                  <option value={50}>50 km</option>
                  <option value={100}>100 km</option>
                  <option value={200}>200+ km</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Contractors List */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        marginBottom: '0.75rem'
      }}>
        {contractors.map((contractor) => (
          <ContractorSelectionCard
            key={contractor.id}
            contractor={contractor}
            isSelected={selectedContractors.some(c => c.id === contractor.id)}
            onSelect={handleContractorSelect}
            onScheduleInspection={handleScheduleInspection}
            inspectionScheduled={!!inspectionSchedules[contractor.id]}
            inspectionDate={inspectionSchedules[contractor.id]}
          />
        ))}
      </div>

      {contractors.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '2rem 1rem',
          color: theme.colors.text.secondary
        }}>
          <SearchIcon size={48} style={{ marginBottom: '1rem', opacity: 0.3 }} />
          <div style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
            {t('contractors.selection.noContractors')}
          </div>
          <div style={{ fontSize: '0.9rem' }}>
            {t('contractors.selection.noContractorsHint')}
          </div>
        </div>
      )}

      {/* Navigation */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '1rem 1.5rem',
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
      }}>
        <button
          onClick={onBack}
          style={{
            backgroundColor: 'transparent',
            border: `2px solid ${theme.colors.borders.light}`,
            color: theme.colors.text.secondary,
            padding: '12px 24px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          {t('common.back')}
        </button>

        <button
          onClick={handleNext}
          disabled={selectedContractors.length !== 3 || Object.keys(inspectionSchedules).length !== 3}
          style={{
            backgroundColor: selectedContractors.length === 3 && Object.keys(inspectionSchedules).length === 3
              ? theme.colors.primary[500] 
              : theme.colors.borders.light,
            color: selectedContractors.length === 3 && Object.keys(inspectionSchedules).length === 3
              ? 'white' 
              : theme.colors.text.secondary,
            border: 'none',
            padding: '12px 32px',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: selectedContractors.length === 3 && Object.keys(inspectionSchedules).length === 3
              ? 'pointer' 
              : 'not-allowed',
            transition: theme.transitions.normal
          }}
        >
          {t('contractors.selection.proceedToQuote')}
        </button>
      </div>

      {/* Inspection Scheduling Modal */}
      {schedulingContractor && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <h3 style={{
              fontSize: '1.2rem',
              fontWeight: '700',
              color: theme.colors.text.primary,
              marginBottom: '1rem'
            }}>
              {inspectionSchedules[schedulingContractor.id] 
                ? t('contractors.scheduling.reschedule', 'Reschedule Inspection')
                : t('contractors.scheduling.title')
              } - {schedulingContractor.business_name}
            </h3>
            
            {inspectionSchedules[schedulingContractor.id] && (
              <div style={{
                backgroundColor: theme.colors.semantic.info.light + '20',
                border: `1px solid ${theme.colors.semantic.info.main}`,
                borderRadius: '8px',
                padding: '0.75rem',
                marginBottom: '1rem',
                fontSize: '0.9rem'
              }}>
                <strong>{t('contractors.scheduling.currentSchedule', 'Current Schedule')}:</strong>
                <br />
                {inspectionSchedules[schedulingContractor.id].toLocaleDateString()} at{' '}
                {inspectionSchedules[schedulingContractor.id].toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: theme.colors.text.secondary
              }}>
                {t('contractors.scheduling.selectDate')}
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                min={getMinDate()}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: `2px solid ${theme.colors.borders.light}`,
                  borderRadius: '8px',
                  fontSize: '16px',
                  backgroundColor: 'white',
                  color: theme.colors.text.primary
                }}
              />
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label style={{
                display: 'block',
                fontSize: '0.9rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: theme.colors.text.secondary
              }}>
                {t('contractors.scheduling.selectTime')}
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
                gap: '0.5rem'
              }}>
                {availableTimeSlots.map((time) => (
                  <button
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    style={{
                      padding: '8px',
                      border: `2px solid ${selectedTime === time ? theme.colors.primary[500] : theme.colors.borders.light}`,
                      backgroundColor: selectedTime === time ? theme.colors.primary[50] : 'white',
                      color: selectedTime === time ? theme.colors.primary[600] : theme.colors.text.secondary,
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      cursor: 'pointer',
                      transition: theme.transitions.normal
                    }}
                  >
                    {time}
                  </button>
                ))}
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setSchedulingContractor(null)}
                style={{
                  backgroundColor: 'transparent',
                  border: `2px solid ${theme.colors.borders.light}`,
                  color: theme.colors.text.secondary,
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                {t('common.cancel')}
              </button>

              <button
                onClick={confirmInspectionSchedule}
                disabled={!selectedDate || !selectedTime}
                style={{
                  backgroundColor: selectedDate && selectedTime 
                    ? theme.colors.primary[500] 
                    : theme.colors.borders.light,
                  color: selectedDate && selectedTime ? 'white' : theme.colors.text.secondary,
                  border: 'none',
                  padding: '10px 20px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: selectedDate && selectedTime ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <CalendarIcon size={16} />
                {t('contractors.scheduling.confirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};